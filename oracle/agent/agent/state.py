"""
Canonical state schema for ORACLE.
Pydantic models for validation + CopilotKitState for LangGraph integration.
This file is the single source of truth — both Phase 1 and Phase 2 depend on it.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Literal, Optional

from copilotkit import CopilotKitState
from pydantic import BaseModel, Field


# ── Sub-models ──────────────────────────────────────────────────────

DIMENSIONS = Literal[
    "resources", "timeline", "riskTolerance", "market", "founderContext"
]
CONSTRAINT_TYPES = Literal["eliminator", "shaper", "anchor"]
PHASES = Literal["entry", "interrogation", "ignition", "exploration", "map_generation"]
CATEGORIES = Literal["financial", "strategic", "operational", "tactical"]


class Constraint(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    dimension: DIMENSIONS
    type: CONSTRAINT_TYPES
    value: str
    answeredAt: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    timelineIndex: int = 0


class DimensionCoverage(BaseModel):
    resources: bool = False
    timeline: bool = False
    riskTolerance: bool = False
    market: bool = False
    founderContext: bool = False

    def all_covered(self) -> bool:
        return all(
            [
                self.resources,
                self.timeline,
                self.riskTolerance,
                self.market,
                self.founderContext,
            ]
        )

    def uncovered(self) -> list[str]:
        dims = []
        if not self.resources:
            dims.append("resources")
        if not self.timeline:
            dims.append("timeline")
        if not self.riskTolerance:
            dims.append("riskTolerance")
        if not self.market:
            dims.append("market")
        if not self.founderContext:
            dims.append("founderContext")
        return dims


class MapNode(BaseModel):
    id: str
    label: str
    depth: int
    parentId: Optional[str] = None
    conflictFlag: bool = False
    conflictReason: str = ""
    x: float = 50.0  # 0–100
    y: float = 50.0  # 0–100
    dimension: Optional[str] = None
    category: Optional[CATEGORIES] = None


class MapEdge(BaseModel):
    sourceId: str
    targetId: str


class MapState(BaseModel):
    nodes: list[MapNode] = Field(default_factory=list)
    edges: list[MapEdge] = Field(default_factory=list)
    activeNodeId: Optional[str] = None


class ExplorationEntry(BaseModel):
    index: int
    timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    type: Literal["answer", "nodeClick"]
    nodeId: Optional[str] = None
    answer: Optional[str] = None
    mapSnapshot: MapState = Field(default_factory=MapState)


class Branch(BaseModel):
    branchId: str = Field(default_factory=lambda: str(uuid.uuid4()))
    forkIndex: int
    label: str = ""
    explorationHistory: list[ExplorationEntry] = Field(default_factory=list)
    mapSnapshot: MapState = Field(default_factory=MapState)


# ── Main Agent State ────────────────────────────────────────────────
# Extends CopilotKitState so CopilotKit can sync this with the frontend.

class OracleState(CopilotKitState):
    """Full ORACLE application state — the single source of truth."""

    sessionId: str = Field(default_factory=lambda: str(uuid.uuid4()))
    phase: PHASES = "entry"
    problem: str = ""

    # Interrogation
    constraints: list[Constraint] = Field(default_factory=list)
    dimensionCoverage: DimensionCoverage = Field(default_factory=DimensionCoverage)
    currentQuestion: str = ""
    currentTargetDimension: str = ""
    isLastQuestion: bool = False

    # Map
    mapState: MapState = Field(default_factory=MapState)

    # Exploration history + branching
    explorationHistory: list[ExplorationEntry] = Field(default_factory=list)
    branches: list[Branch] = Field(default_factory=list)
    activeBranchId: str = "main"

    # Fork context (set before calling fork_regenerator)
    forkIndex: int = -1
    forkNewAnswer: str = ""
    forkOriginalAnswer: str = ""
    forkDimension: str = ""

    # Expansion context (set before calling expander)
    expandNodeId: str = ""
