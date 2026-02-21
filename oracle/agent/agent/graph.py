"""
LangGraph graph definition for ORACLE.
Defines the agent graph, conditional routing, and the compiled app.
"""

from __future__ import annotations

import logging

from langchain_core.messages import HumanMessage
from langgraph.graph import END, StateGraph
from langgraph.checkpoint.memory import MemorySaver
from langgraph.checkpoint.redis.aio import AsyncRedisSaver

from config import REDIS_URL
from agent.state import OracleState
from agent.nodes.interrogator import interrogator
from agent.nodes.map_generator import map_generator
from agent.nodes.expander import expander
from agent.nodes.fork_regenerator import fork_regenerator

logger = logging.getLogger(__name__)


# ── Routing functions ────────────────────────────────────────────────


def route_after_interrogator(state: dict) -> str:
    """After the interrogator, decide whether to generate the map or wait."""
    # Only route to map_generator when the interrogator has collected the final
    # answer and explicitly set phase to "map_generation".
    if state.get("phase") in ("ignition", "map_generation"):
        return "map_generator"
    return END  # Pause — wait for user's next answer


def route_entry(state: dict) -> str:
    """
    Route from the entry point based on what action triggered the graph.
    Uses 'phase' field, falling back to interrogator for new conversations.
    """
    phase = state.get("phase", "entry")

    if phase in ("entry", "interrogation"):
        return "interrogator"
    elif phase in ("ignition", "map_generation"):
        return "map_generator"
    elif phase == "exploration":
        if state.get("forkIndex", -1) >= 0 and state.get("forkNewAnswer"):
            return "fork_regenerator"
        if state.get("expandNodeId") or state.get("mapState", {}).get("activeNodeId"):
            return "expander"
        return END
    elif phase == "fork":
        return "fork_regenerator"
    return "interrogator"


# ── Build the graph ──────────────────────────────────────────────────


def build_graph():
    """Construct and compile the ORACLE LangGraph agent."""

    graph = StateGraph(OracleState)

    # Register nodes
    graph.add_node("interrogator", interrogator)
    graph.add_node("map_generator", map_generator)
    graph.add_node("expander", expander)
    graph.add_node("fork_regenerator", fork_regenerator)

    # Entry: route to the appropriate node based on current phase
    graph.set_conditional_entry_point(route_entry)

    # After interrogator: either generate map or wait for next answer
    graph.add_conditional_edges(
        "interrogator",
        route_after_interrogator,
        {
            "map_generator": "map_generator",
            END: END,
        },
    )

    # After map_generator: stop (exploration phase begins, wait for clicks)
    graph.add_edge("map_generator", END)

    # After expander: stop (wait for next click)
    graph.add_edge("expander", END)

    # After fork_regenerator: stop (show new branch)
    graph.add_edge("fork_regenerator", END)

    # Compile with in-memory checkpointer initially.
    # The async Redis checkpointer is swapped in at server startup via `init_async_checkpointer()`
    # because AsyncRedisSaver requires a running event loop to construct.
    checkpointer = MemorySaver()

    compiled = graph.compile(checkpointer=checkpointer)

    logger.info("ORACLE graph compiled successfully (MemorySaver pending async swap)")
    return compiled


# Singleton compiled graph
oracle_graph = build_graph()


async def init_async_checkpointer():
    """Swap in AsyncRedisSaver once an event loop is running. Call from server startup."""
    try:
        async_checkpointer = AsyncRedisSaver(redis_url=REDIS_URL)
        await async_checkpointer.asetup()
        oracle_graph.checkpointer = async_checkpointer
        logger.info("Swapped to AsyncRedisSaver at %s", REDIS_URL)
    except Exception as e:
        logger.warning("AsyncRedisSaver unavailable (%s) — keeping MemorySaver", e)
