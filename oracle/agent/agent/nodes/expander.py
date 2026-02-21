"""
Node 3: Expander — generates child nodes when a user clicks on a node.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path

from langchain_core.runnables import RunnableConfig

from agent.state import OracleState
from agent.validation import validate_expander_response
from agent.nodes.llm_caller import call_claude_json

logger = logging.getLogger(__name__)

PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "expander.md"
_system_prompt: str | None = None


def _get_system_prompt() -> str:
    global _system_prompt
    if _system_prompt is None:
        _system_prompt = PROMPT_PATH.read_text()
    return _system_prompt


def _get_parent_chain(nodes: list[dict], node_id: str) -> list[str]:
    """Walk up the parent chain and return labels from root to node."""
    by_id = {n["id"]: n for n in nodes}
    chain: list[str] = []
    current = by_id.get(node_id)
    while current:
        chain.append(current["label"])
        parent_id = current.get("parentId")
        current = by_id.get(parent_id) if parent_id else None
    chain.reverse()
    return chain


async def expander(state: OracleState, config: RunnableConfig) -> dict:
    """
    Generate 3-5 child nodes for the clicked node.
    Returns dict update with merged mapState.
    """
    map_state = state.get("mapState", {})
    nodes = map_state.get("nodes", [])
    edges = map_state.get("edges", [])
    active_id = map_state.get("activeNodeId")

    if not active_id:
        logger.warning("expander called with no activeNodeId")
        return {}

    # Find the clicked node
    clicked = None
    for n in nodes:
        if n["id"] == active_id:
            clicked = n
            break
    if not clicked:
        logger.warning("expander: node '%s' not found", active_id)
        return {}

    parent_chain = _get_parent_chain(nodes, active_id)
    constraints = state.get("constraints", [])

    # Visited node labels for dedup
    visited = [n["label"] for n in nodes]

    constraint_text = "\n".join(
        f"- [{c['dimension']}] ({c['type']}): {c['value']}"
        for c in constraints
    )

    user_message = (
        f"## Clicked Node\nLabel: {clicked['label']} | id: {clicked['id']} | "
        f"position: ({clicked['x']}, {clicked['y']}) | depth: {clicked['depth']}\n\n"
        f"## Path from Root\n{' → '.join(parent_chain)}\n\n"
        f"## Constraints\n{constraint_text}\n\n"
        f"## Already Visited Nodes (do NOT duplicate)\n{json.dumps(visited)}\n\n"
        f"Generate 3-5 child nodes."
    )

    try:
        data = call_claude_json(
            system_prompt=_get_system_prompt(),
            user_message=user_message,
            validator_fn=validate_expander_response,
        )
    except Exception:
        logger.exception("expander failed — returning empty children")
        return {}

    child_nodes = data.get("childNodes", [])
    child_edges = data.get("childEdges", [])

    # Prefix child IDs to prevent collisions
    existing_ids = {n["id"] for n in nodes}
    for child in child_nodes:
        if child["id"] in existing_ids:
            child["id"] = f"{active_id}_{child['id']}"
        # Ensure parentId is set
        child["parentId"] = active_id

    # Fix edges to match potentially renamed IDs
    child_id_set = {c["id"] for c in child_nodes}
    final_edges = []
    for child in child_nodes:
        final_edges.append({"sourceId": active_id, "targetId": child["id"]})

    merged_nodes = nodes + child_nodes
    merged_edges = edges + final_edges

    return {
        "mapState": {
            "nodes": merged_nodes,
            "edges": merged_edges,
            "activeNodeId": active_id,
        }
    }
