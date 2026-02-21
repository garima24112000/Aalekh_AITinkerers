"""
Node 4: Fork Regenerator — regenerates entire map when user forks at a past answer.
"""

from __future__ import annotations

import copy
import logging
from pathlib import Path

from langchain_core.runnables import RunnableConfig

from agent.state import OracleState
from agent.validation import validate_fork_response
from agent.nodes.llm_caller import call_claude_json
from agent.nodes.map_generator import _fallback_map

logger = logging.getLogger(__name__)

PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "fork_regenerator.md"
_system_prompt: str | None = None


def _get_system_prompt() -> str:
    global _system_prompt
    if _system_prompt is None:
        _system_prompt = PROMPT_PATH.read_text()
    return _system_prompt


async def fork_regenerator(state: OracleState, config: RunnableConfig) -> dict:
    """
    Regenerate the map after the user forks at a past answer.
    Uses state fields: forkIndex, forkNewAnswer, forkOriginalAnswer, forkDimension.
    """
    problem = state.get("problem", "")
    constraints = state.get("constraints", [])
    fork_index = state.get("forkIndex", -1)
    new_answer = state.get("forkNewAnswer", "")
    original_answer = state.get("forkOriginalAnswer", "")
    dimension = state.get("forkDimension", "")

    # Build modified constraint set
    modified = copy.deepcopy(constraints)
    if 0 <= fork_index < len(modified):
        modified[fork_index] = {
            **modified[fork_index],
            "value": new_answer,
        }

    constraint_text = "\n".join(
        f"- [{c['dimension']}] ({c['type']}): {c['value']}"
        for c in modified
    )

    user_message = (
        f"## Problem\n{problem}\n\n"
        f"## What Changed\n"
        f"The user originally answered for '{dimension}': \"{original_answer}\"\n"
        f"They are now exploring: \"{new_answer}\"\n\n"
        f"## Full (Modified) Constraints\n{constraint_text}\n\n"
        f"Generate a meaningfully different solution space map."
    )

    try:
        data = call_claude_json(
            system_prompt=_get_system_prompt(),
            user_message=user_message,
            validator_fn=validate_fork_response,
        )
    except Exception:
        logger.exception("fork_regenerator failed — using fallback map")
        data = _fallback_map(problem)

    if not data.get("nodes"):
        data = _fallback_map(problem)

    new_map = {
        "nodes": data["nodes"],
        "edges": data.get("edges", []),
        "activeNodeId": None,
    }

    # Update the branch's mapSnapshot
    branches = copy.deepcopy(state.get("branches", []))
    active_branch_id = state.get("activeBranchId", "main")
    for branch in branches:
        if branch["branchId"] == active_branch_id:
            branch["mapSnapshot"] = new_map
            break

    return {
        "mapState": new_map,
        "branches": branches,
    }
