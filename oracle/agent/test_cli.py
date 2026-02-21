#!/usr/bin/env python3
"""
CLI test harness for ORACLE agent.
Runs the Priya scenario (or a custom scenario) interactively in the terminal.

Usage:
    python test_cli.py                     # interactive mode
    python test_cli.py --auto              # auto-run Priya scenario
"""

from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path
from uuid import uuid4

# Ensure agent package is importable
sys.path.insert(0, str(Path(__file__).parent))

from agent.graph import oracle_graph
from agent.state import OracleState
from agent.transitions import update_constraints, create_branch

# ── Priya scenario (auto-play answers) ────────────────────────────────

PRIYA_ANSWERS = [
    "I'm starting a sustainable fashion brand targeting Gen Z consumers.",
    "I want to sell directly to consumers through an online store and social media.",
    "My startup budget is about $50,000 and I'm the only founder for now.",
    "I want to differentiate through transparent supply chains and eco-friendly materials.",
    "I'm hoping to launch within the next 3 months and reach $10K monthly revenue within a year.",
]


def _print_header(text: str):
    print(f"\n{'='*60}")
    print(f"  {text}")
    print(f"{'='*60}\n")


def _print_map_summary(state: dict):
    """Print a concise summary of the generated map."""
    map_state = state.get("mapState")
    if not map_state:
        print("  [No map generated yet]")
        return

    nodes = map_state.get("nodes", [])
    edges = map_state.get("edges", [])
    print(f"  Nodes: {len(nodes)}  |  Edges: {len(edges)}")
    for node in nodes:
        prefix = "  📌" if node.get("isRoot") else "    •"
        print(f"{prefix} [{node['id']}] {node['label']}")


async def run_interrogation(auto: bool = False):
    """Run the full ORACLE flow: interrogation → map generation."""

    thread_id = str(uuid4())
    config = {"configurable": {"thread_id": thread_id}}

    _print_header("ORACLE — Strategic Advisor (CLI Test)")
    print(f"  Thread: {thread_id}")
    print(f"  Mode:   {'Auto (Priya scenario)' if auto else 'Interactive'}\n")

    # ── Phase: interrogation ─────────────────────────────────────────

    state: dict = {"phase": "interrogation", "constraints": []}
    answer_idx = 0

    while True:
        _print_header("Interrogator")
        result = await aalekh_graph.ainvoke(state, config)

        question = result.get("currentQuestion", "")
        dimension = result.get("currentTargetDimension", "")
        is_last = result.get("isLastQuestion", False)

        if not question:
            print("  [No question returned — moving to map generation]")
            break

        print(f"  Dimension: {dimension}")
        print(f"  Question:  {question}")
        if is_last:
            print("  (This is the last question)")

        # Get answer
        if auto and answer_idx < len(PRIYA_ANSWERS):
            answer = PRIYA_ANSWERS[answer_idx]
            answer_idx += 1
            print(f"\n  → Auto-answer: {answer}")
        else:
            answer = input("\n  Your answer: ").strip()
            if not answer:
                answer = "(skipped)"

        # Record constraint using proper transition function
        partial = update_constraints(
            state=result,
            answer=answer,
            dimension=dimension,
            constraint_type="shaper",
        )

        # Prepare next state
        state = {
            **result,
            **partial,
            "phase": "interrogation",
        }

        # Check if that was the last question
        if is_last:
            print("\n  ✓ All dimensions covered — proceeding to map generation.\n")
            state["phase"] = "map_generation"
            break

    # ── Phase: map_generation ────────────────────────────────────────

    _print_header("Map Generator")
    state["phase"] = "map_generation"
    result = await aalekh_graph.ainvoke(state, config)
    _print_map_summary(result)

    # ── Phase: exploration (expand a node) ───────────────────────────

    map_state = result.get("mapState")
    if map_state and map_state.get("nodes"):
        _print_header("Exploration — Expand a Node")
        nodes = map_state["nodes"]

        # Pick first non-root node for demo
        expandable = [n for n in nodes if not n.get("isRoot")]
        if expandable:
            target = expandable[0]
            print(f"  Expanding node: [{target['id']}] {target['label']}")

            expand_state = {
                **result,
                "phase": "exploration",
                "expandNodeId": target["id"],
            }
            expand_result = await aalekh_graph.ainvoke(expand_state, config)
            _print_map_summary(expand_result)
        else:
            print("  [No expandable nodes found]")

    # ── Phase: fork ──────────────────────────────────────────────────

    constraints = result.get("constraints", [])
    if constraints:
        _print_header("Fork — Alternate Branch")
        new_answer = "I want to target millennials instead of Gen Z." if auto else input("  New answer for fork: ").strip()

        # Use create_branch transition to set up fork context
        branch_partial = create_branch(result, fork_index=0, new_answer=new_answer)

        fork_state = {
            **result,
            **branch_partial,
            "phase": "fork",
        }
        fork_result = await aalekh_graph.ainvoke(fork_state, config)
        branches = fork_result.get("branches", [])
        print(f"  Branches created: {len(branches)}")
        if branches:
            latest = branches[-1]
            print(f"  Latest branch label: {latest.get('label', 'N/A')}")

    _print_header("Done")
    print("  Test complete. Review output above.\n")


def main():
    auto = "--auto" in sys.argv
    asyncio.run(run_interrogation(auto=auto))


if __name__ == "__main__":
    main()
