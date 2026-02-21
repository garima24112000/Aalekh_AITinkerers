"""
Node 1: Interrogator — generates the next question based on uncovered dimensions.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path

from langchain_core.messages import AIMessage, HumanMessage
from langchain_core.runnables import RunnableConfig

from agent.state import OracleState
from agent.transitions import update_constraints
from agent.validation import validate_interrogator_response
from agent.nodes.llm_caller import call_claude_json

logger = logging.getLogger(__name__)

PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "interrogator.md"
_system_prompt: str | None = None


def _get_system_prompt() -> str:
    global _system_prompt
    if _system_prompt is None:
        _system_prompt = PROMPT_PATH.read_text()
    return _system_prompt


def _get_last_user_text(state: dict) -> str:
    """Get text of the most recent human message."""
    messages = state.get("messages", [])
    for msg in reversed(messages):
        if isinstance(msg, HumanMessage):
            return msg.content
        if isinstance(msg, dict) and msg.get("role") == "user":
            return msg.get("content", "")
    return ""


async def interrogator(state: OracleState, config: RunnableConfig) -> dict:
    """
    Given the problem and constraints so far, generate the next question.
    Also processes the user's latest message as an answer to the previous question.
    Returns dict update for the graph state (including messages for the chat UI).
    """
    constraints = list(state.get("constraints", []))
    coverage = dict(state.get("dimensionCoverage", {}))
    last_user_text = _get_last_user_text(state)
    problem = state.get("problem", "")
    prev_dimension = state.get("currentTargetDimension", "")

    # If this is the first message, treat it as the problem statement
    if not problem and last_user_text:
        problem = last_user_text

    # If we already asked a question and the user replied, record the answer as a constraint
    if prev_dimension and last_user_text and state.get("currentQuestion"):
        partial = update_constraints(
            state=state,
            answer=last_user_text,
            dimension=prev_dimension,
            constraint_type="shaper",
        )
        constraints = partial["constraints"]
        coverage = partial["dimensionCoverage"]

    # If the LAST question was already asked (previous turn) and the user just answered,
    # record the answer and transition to map generation — don't ask another question.
    if state.get("isLastQuestion") and last_user_text and prev_dimension:
        logger.info("Final answer received — transitioning to map generation.")
        return {
            "messages": [AIMessage(content="Thank you! Let me generate your solution map now...")],
            "problem": problem,
            "constraints": constraints,
            "dimensionCoverage": coverage,
            "currentQuestion": "",
            "currentTargetDimension": "",
            "isLastQuestion": False,
            "phase": "map_generation",
        }

    # Build uncovered list
    all_dims = ["resources", "timeline", "riskTolerance", "market", "founderContext"]
    if isinstance(coverage, dict):
        uncovered = [d for d in all_dims if not coverage.get(d, False)]
    else:
        uncovered = [d for d in all_dims if not getattr(coverage, d, False)]

    # Build constraint summary
    constraint_text = "(none yet)"
    if constraints:
        lines = []
        for c in constraints:
            dim = c["dimension"] if isinstance(c, dict) else c.dimension
            typ = c["type"] if isinstance(c, dict) else c.type
            val = c["value"] if isinstance(c, dict) else c.value
            lines.append(f"- [{dim}] ({typ}): {val}")
        constraint_text = "\n".join(lines)

    user_message = (
        f"## Problem\n{problem}\n\n"
        f"## Constraints Collected So Far\n{constraint_text}\n\n"
        f"## Uncovered Dimensions\n{json.dumps(uncovered)}\n\n"
        f"Generate the next question."
    )

    if not uncovered:
        user_message += (
            "\n\nAll 5 dimensions are now covered. "
            "Set isLastQuestion to true and ask a brief final confirmation question."
        )

    data = call_claude_json(
        system_prompt=_get_system_prompt(),
        user_message=user_message,
        validator_fn=validate_interrogator_response,
    )

    question = data.get("question", "What else should I know?")
    target_dim = data.get("targetDimension", uncovered[0] if uncovered else "")
    is_last = data.get("isLastQuestion", False)

    # Build the assistant message for the chat UI
    assistant_text = question
    if is_last:
        assistant_text += "\n\n_(This is my final question before I generate your solution map.)_"

    return {
        "messages": [AIMessage(content=assistant_text)],
        "problem": problem,
        "constraints": constraints,
        "dimensionCoverage": coverage,
        "currentQuestion": question,
        "currentTargetDimension": target_dim,
        "isLastQuestion": is_last,
        "phase": "interrogation",
    }
