"""
State transition functions — pure logic for updating OracleState.
These are called by graph nodes and the server action handlers.
"""

from __future__ import annotations

import copy
import uuid
from datetime import datetime, timezone


def make_constraint(
    answer: str,
    dimension: str,
    constraint_type: str,
    timeline_index: int,
) -> dict:
    """Create a new constraint dict."""
    return {
        "id": str(uuid.uuid4()),
        "dimension": dimension,
        "type": constraint_type,
        "value": answer,
        "answeredAt": datetime.now(timezone.utc).isoformat(),
        "timelineIndex": timeline_index,
    }


def update_constraints(
    state: dict,
    answer: str,
    dimension: str,
    constraint_type: str = "shaper",
) -> dict:
    """Add a constraint and update dimension coverage. Returns partial state update."""
    constraints = list(state.get("constraints", []))
    constraint = make_constraint(
        answer=answer,
        dimension=dimension,
        constraint_type=constraint_type,
        timeline_index=len(constraints),
    )
    constraints.append(constraint)

    coverage = dict(state.get("dimensionCoverage", {}))
    coverage[dimension] = True

    return {
        "constraints": constraints,
        "dimensionCoverage": coverage,
    }


def snapshot_map(
    state: dict,
    event_type: str,
    node_id: str | None = None,
    answer: str | None = None,
) -> dict:
    """Create a snapshot of the current mapState and append to explorationHistory."""
    history = list(state.get("explorationHistory", []))
    entry = {
        "index": len(history),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "type": event_type,
        "nodeId": node_id,
        "answer": answer,
        "mapSnapshot": copy.deepcopy(state.get("mapState", {})),
    }
    history.append(entry)
    return {"explorationHistory": history}


def create_branch(state: dict, fork_index: int, new_answer: str) -> dict:
    """
    Create a new branch entry and set fork context fields.
    The actual map regeneration happens in the fork_regenerator node.
    """
    constraints = state.get("constraints", [])
    original_constraint = constraints[fork_index] if fork_index < len(constraints) else {}

    branch_id = str(uuid.uuid4())
    branches = list(state.get("branches", []))
    branches.append({
        "branchId": branch_id,
        "forkIndex": fork_index,
        "label": f"Fork at Q{fork_index + 1}",
        "explorationHistory": [],
        "mapSnapshot": {},
    })

    return {
        "branches": branches,
        "activeBranchId": branch_id,
        "forkIndex": fork_index,
        "forkNewAnswer": new_answer,
        "forkOriginalAnswer": original_constraint.get("value", ""),
        "forkDimension": original_constraint.get("dimension", ""),
    }
