"""
JSON schema validators for every Claude output format.
Each returns (is_valid, errors) so callers can retry with the error list.
"""

from __future__ import annotations

VALID_DIMENSIONS = {
    "resources",
    "timeline",
    "riskTolerance",
    "market",
    "founderContext",
}

VALID_CATEGORIES = {"financial", "strategic", "operational", "tactical"}


def validate_interrogator_response(data: dict) -> tuple[bool, list[str]]:
    errors: list[str] = []
    if "question" not in data or not isinstance(data.get("question"), str):
        errors.append("Missing or invalid 'question' field (must be a string)")
    if "targetDimension" not in data:
        errors.append("Missing 'targetDimension' field")
    elif data["targetDimension"] not in VALID_DIMENSIONS:
        errors.append(
            f"Invalid targetDimension '{data['targetDimension']}'. "
            f"Must be one of: {sorted(VALID_DIMENSIONS)}"
        )
    if "isLastQuestion" not in data or not isinstance(data.get("isLastQuestion"), bool):
        errors.append("Missing or invalid 'isLastQuestion' field (must be boolean)")
    return (len(errors) == 0, errors)


def validate_map_response(data: dict) -> tuple[bool, list[str]]:
    errors: list[str] = []
    nodes = data.get("nodes", [])
    edges = data.get("edges", [])

    if not isinstance(nodes, list):
        errors.append("'nodes' must be a list")
        return (False, errors)

    if len(nodes) < 5:
        errors.append(f"Expected at least 12 nodes, got {len(nodes)}")

    node_ids: set[str] = set()
    has_root = False

    for i, node in enumerate(nodes):
        for field in ("id", "label", "depth", "x", "y"):
            if field not in node:
                errors.append(f"Node {i} missing required field '{field}'")
        nid = node.get("id", f"__missing_{i}")
        if node.get("depth") == 0:
            has_root = True
        if nid in node_ids:
            errors.append(f"Duplicate node id: {nid}")
        node_ids.add(nid)

        x = node.get("x", -1)
        y = node.get("y", -1)
        if not (0 <= x <= 100):
            errors.append(f"Node '{nid}' x={x} out of range 0-100")
        if not (0 <= y <= 100):
            errors.append(f"Node '{nid}' y={y} out of range 0-100")

    if not has_root:
        errors.append("No depth-0 root node found")

    if not isinstance(edges, list):
        errors.append("'edges' must be a list")
    else:
        for edge in edges:
            src = edge.get("sourceId")
            tgt = edge.get("targetId")
            if src not in node_ids:
                errors.append(f"Edge sourceId '{src}' not found in nodes")
            if tgt not in node_ids:
                errors.append(f"Edge targetId '{tgt}' not found in nodes")

    return (len(errors) == 0, errors)


def validate_expander_response(data: dict) -> tuple[bool, list[str]]:
    errors: list[str] = []
    children = data.get("childNodes", [])

    if not isinstance(children, list):
        errors.append("'childNodes' must be a list")
        return (False, errors)

    if not (1 <= len(children) <= 7):
        errors.append(
            f"Expected 3-5 child nodes, got {len(children)}"
        )

    for i, child in enumerate(children):
        for field in ("id", "label", "depth", "parentId", "x", "y"):
            if field not in child:
                errors.append(f"Child {i} missing required field '{field}'")

    return (len(errors) == 0, errors)


# Fork response uses the same schema as map response
validate_fork_response = validate_map_response
