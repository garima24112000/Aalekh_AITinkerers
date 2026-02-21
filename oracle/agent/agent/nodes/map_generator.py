"""
Node 2: Map Generator — generates the full solution space node tree after ignition.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path

from langchain_core.runnables import RunnableConfig

from agent.state import OracleState
from agent.validation import validate_map_response
from agent.nodes.llm_caller import call_claude_json

logger = logging.getLogger(__name__)

PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "map_generator.md"
_system_prompt: str | None = None


def _get_system_prompt() -> str:
    global _system_prompt
    if _system_prompt is None:
        _system_prompt = PROMPT_PATH.read_text()
    return _system_prompt


# Minimal fallback if Claude fails twice
def _fallback_map(problem: str) -> dict:
    label = problem[:50] if problem else "Solution Space"
    return {
        "nodes": [
            {"id": "root", "label": label, "depth": 0, "parentId": None,
             "conflictFlag": False, "conflictReason": "", "x": 50, "y": 50,
             "dimension": None, "category": "strategic"},
            {"id": "n1", "label": "Strategy A", "depth": 1, "parentId": "root",
             "conflictFlag": False, "conflictReason": "", "x": 25, "y": 25,
             "dimension": "market", "category": "strategic"},
            {"id": "n2", "label": "Strategy B", "depth": 1, "parentId": "root",
             "conflictFlag": False, "conflictReason": "", "x": 75, "y": 25,
             "dimension": "resources", "category": "financial"},
            {"id": "n3", "label": "Strategy C", "depth": 1, "parentId": "root",
             "conflictFlag": False, "conflictReason": "", "x": 25, "y": 75,
             "dimension": "timeline", "category": "operational"},
            {"id": "n4", "label": "Strategy D", "depth": 1, "parentId": "root",
             "conflictFlag": False, "conflictReason": "", "x": 75, "y": 75,
             "dimension": "founderContext", "category": "tactical"},
        ],
        "edges": [
            {"sourceId": "root", "targetId": "n1"},
            {"sourceId": "root", "targetId": "n2"},
            {"sourceId": "root", "targetId": "n3"},
            {"sourceId": "root", "targetId": "n4"},
        ],
    }


async def map_generator(state: OracleState, config: RunnableConfig) -> dict:
    """
    Given the full constraint set, generate the complete node tree.
    Returns dict update with mapState and phase change.
    """
    problem = state.get("problem", "")
    constraints = state.get("constraints", [])

    constraint_text = "\n".join(
        f"- [{c['dimension']}] ({c['type']}): {c['value']}"
        for c in constraints
    )

    user_message = (
        f"## Problem\n{problem}\n\n"
        f"## Full Constraints\n{constraint_text}\n\n"
        f"Generate the complete solution space map with 12-15 nodes."
    )

    try:
        data = call_claude_json(
            system_prompt=_get_system_prompt(),
            user_message=user_message,
            validator_fn=validate_map_response,
        )
    except Exception:
        logger.exception("map_generator failed — using fallback map")
        data = _fallback_map(problem)

    # Extra safety: if nodes are missing, use fallback
    if not data.get("nodes"):
        data = _fallback_map(problem)

    return {
        "mapState": {
            "nodes": data["nodes"],
            "edges": data.get("edges", []),
            "activeNodeId": None,
        },
        "phase": "exploration",
    }
