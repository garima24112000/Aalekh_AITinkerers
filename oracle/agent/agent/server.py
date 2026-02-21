"""
FastAPI server entrypoint for ORACLE agent.
Exposes the LangGraph agent via AG-UI protocol for CopilotKit.
"""

from __future__ import annotations

import logging
import sys
from pathlib import Path

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Ensure the agent package is importable
sys.path.insert(0, str(Path(__file__).parent.parent))

from ag_ui_langgraph import add_langgraph_fastapi_endpoint
from copilotkit import LangGraphAGUIAgent

from config import AGENT_HOST, AGENT_PORT
from agent.graph import oracle_graph, init_async_checkpointer

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)

# ── FastAPI app ──────────────────────────────────────────────────────

app = FastAPI(
    title="ORACLE Agent",
    description="Phase 1 backend — LangGraph agent for ORACLE",
    version="0.1.0",
)

# Allow CORS for local dev (frontend on :3000, agent on :8000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register the agent via AG-UI protocol ────────────────────────────

add_langgraph_fastapi_endpoint(
    app=app,
    agent=LangGraphAGUIAgent(
        name="oracle_agent",
        description="ORACLE strategic advisor — interrogates, maps, expands, and forks solution spaces.",
        graph=oracle_graph,
    ),
    path="/",
)


# ── Health check ─────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "agent": "oracle_agent"}


# ── Startup: swap in async Redis checkpointer ───────────────────────

@app.on_event("startup")
async def on_startup():
    await init_async_checkpointer()


# ── Run ──────────────────────────────────────────────────────────────

def main():
    logger.info("Starting ORACLE agent on %s:%s", AGENT_HOST, AGENT_PORT)
    uvicorn.run(
        "agent.server:app",
        host=AGENT_HOST,
        port=AGENT_PORT,
        reload=False,
    )


if __name__ == "__main__":
    main()
