# ORACLE — Phase 1 Implementation Plan
## Backend: LangGraph Agent + State + CopilotKit Runtime

---

## 0. Project Structure

```
oracle/
├── agent/                          # Python LangGraph service (port 8000)
│   ├── pyproject.toml              # Dependencies: langgraph, langchain-anthropic, redis, pydantic
│   ├── agent/
│   │   ├── __init__.py
│   │   ├── state.py                # OracleState Pydantic model + TypedDict for LangGraph
│   │   ├── graph.py                # LangGraph graph definition + conditional routing
│   │   ├── nodes/
│   │   │   ├── __init__.py
│   │   │   ├── interrogator.py     # Node 1: question generation
│   │   │   ├── map_generator.py    # Node 2: full node tree generation
│   │   │   ├── expander.py         # Node 3: child node generation
│   │   │   └── fork_regenerator.py # Node 4: map regeneration on fork
│   │   ├── prompts/
│   │   │   ├── interrogator.md     # System prompt for interrogator
│   │   │   ├── map_generator.md    # System prompt for map_generator
│   │   │   ├── expander.md         # System prompt for expander
│   │   │   └── fork_regenerator.md # System prompt for fork_regenerator
│   │   ├── redis_store.py          # Redis read/write helpers
│   │   ├── transitions.py          # State transition functions
│   │   ├── validation.py           # JSON schema validators for Claude output
│   │   └── server.py               # FastAPI/LangServe entrypoint
│   └── tests/
│       ├── test_interrogator.py
│       ├── test_map_generator.py
│       ├── test_expander.py
│       └── test_e2e.py
├── frontend/                       # Next.js app (port 3000) — Phase 2 owns components
│   ├── package.json
│   ├── src/
│   │   └── app/
│   │       └── api/
│   │           └── copilotkit/
│   │               └── route.ts    # CopilotKit runtime API route → proxies to LangGraph
│   └── ...
├── docker-compose.yml              # Redis + agent + frontend
└── README.md
```

---

## 1. Environment & Dependency Setup

### 1.1 Python Agent Service

**Dependencies (pyproject.toml or requirements.txt):**
- `langgraph >= 0.2` — agent graph orchestration
- `langchain-anthropic` — Claude API via LangChain
- `anthropic` — direct Anthropic SDK (fallback)
- `redis` — async Redis client (`redis[hiredis]` for performance)
- `pydantic >= 2.0` — state schema validation
- `fastapi` + `uvicorn` — HTTP server for LangServe
- `langserve` — expose LangGraph as REST API
- `python-dotenv` — env vars

**Environment variables (.env):**
- `ANTHROPIC_API_KEY`
- `REDIS_URL=redis://localhost:6379`
- `MODEL_NAME=claude-sonnet-4-20250514` (or latest Sonnet)

### 1.2 Next.js CopilotKit Runtime

**Dependencies (package.json):**
- `@copilotkit/runtime` — CopilotKit server runtime
- `@copilotkit/react-core` — frontend hooks (Phase 2 uses these)
- `@copilotkit/react-ui` — optional UI components

### 1.3 Redis

- Run via Docker: `docker run -d -p 6379:6379 redis:7-alpine`
- Or via `docker-compose.yml` (recommended — bundles all services)

---

## 2. Canonical State Schema (FREEZE FIRST)

This is the first thing to implement. Both Phase 1 and Phase 2 depend on it.

### 2.1 Pydantic Models (`agent/state.py`)

Define the following Pydantic models exactly matching the spec:

```python
from pydantic import BaseModel
from typing import Literal, Optional
from datetime import datetime

class Constraint(BaseModel):
    id: str
    dimension: Literal["resources", "timeline", "riskTolerance", "market", "founderContext"]
    type: Literal["eliminator", "shaper", "anchor"]
    value: str
    answeredAt: str  # ISO timestamp
    timelineIndex: int

class DimensionCoverage(BaseModel):
    resources: bool = False
    timeline: bool = False
    riskTolerance: bool = False
    market: bool = False
    founderContext: bool = False

class MapNode(BaseModel):
    id: str
    label: str
    depth: int
    parentId: Optional[str] = None
    conflictFlag: bool = False
    conflictReason: str = ""
    x: float  # 0–100
    y: float  # 0–100
    dimension: Optional[str] = None  # for fog mapping
    category: Optional[Literal["financial", "strategic", "operational", "tactical"]] = None

class MapEdge(BaseModel):
    sourceId: str
    targetId: str

class MapState(BaseModel):
    nodes: list[MapNode] = []
    edges: list[MapEdge] = []
    activeNodeId: Optional[str] = None

class ExplorationEntry(BaseModel):
    index: int
    timestamp: str  # ISO timestamp
    type: Literal["answer", "nodeClick"]
    nodeId: Optional[str] = None
    answer: Optional[str] = None
    mapSnapshot: MapState

class Branch(BaseModel):
    branchId: str
    forkIndex: int
    label: str
    explorationHistory: list[ExplorationEntry] = []
    mapSnapshot: MapState

class OracleState(BaseModel):
    sessionId: str
    phase: Literal["entry", "interrogation", "ignition", "exploration"]
    problem: str
    constraints: list[Constraint] = []
    dimensionCoverage: DimensionCoverage = DimensionCoverage()
    mapState: MapState = MapState()
    explorationHistory: list[ExplorationEntry] = []
    branches: list[Branch] = []
    activeBranchId: str = "main"
    currentQuestion: str = ""
    isLastQuestion: bool = False
```

### 2.2 LangGraph TypedDict

LangGraph uses TypedDict for state, not Pydantic. Create a `OracleGraphState(TypedDict)` that mirrors the Pydantic model. Use the Pydantic models for validation/serialization and the TypedDict for LangGraph internal routing.

```python
from typing import TypedDict, Optional

class OracleGraphState(TypedDict):
    sessionId: str
    phase: str
    problem: str
    constraints: list[dict]
    dimensionCoverage: dict
    mapState: dict
    explorationHistory: list[dict]
    branches: list[dict]
    activeBranchId: str
    currentQuestion: str
    isLastQuestion: bool
```

Add conversion utilities: `pydantic_to_dict(state: OracleState) -> dict` and `dict_to_pydantic(d: dict) -> OracleState`.

---

## 3. Redis Integration (`agent/redis_store.py`)

### 3.1 Core Functions

```python
import redis.asyncio as redis
import json

pool: redis.ConnectionPool = None

async def get_redis() -> redis.Redis:
    global pool
    if pool is None:
        pool = redis.ConnectionPool.from_url(os.getenv("REDIS_URL", "redis://localhost:6379"))
    return redis.Redis(connection_pool=pool)

async def save_session(session_id: str, state: OracleState) -> None:
    r = await get_redis()
    await r.set(f"session:{session_id}", state.model_dump_json())

async def load_session(session_id: str) -> OracleState:
    r = await get_redis()
    data = await r.get(f"session:{session_id}")
    return OracleState.model_validate_json(data)

async def save_snapshot(session_id: str, index: int, map_state: MapState) -> None:
    r = await get_redis()
    await r.set(f"snapshot:{session_id}:{index}", map_state.model_dump_json())

async def load_snapshot(session_id: str, index: int) -> MapState:
    r = await get_redis()
    data = await r.get(f"snapshot:{session_id}:{index}")
    return MapState.model_validate_json(data)

async def delete_session(session_id: str) -> None:
    r = await get_redis()
    keys = await r.keys(f"session:{session_id}")
    keys += await r.keys(f"snapshot:{session_id}:*")
    if keys:
        await r.delete(*keys)
```

### 3.2 Fallback

Wrap all Redis calls in try/except. On `ConnectionError`, fall back to an in-memory `dict` keyed by session_id. Log a warning. Phase 2 never sees this.

```python
_fallback_store: dict[str, str] = {}

async def save_session(session_id: str, state: OracleState) -> None:
    try:
        r = await get_redis()
        await r.set(f"session:{session_id}", state.model_dump_json())
    except (redis.ConnectionError, redis.TimeoutError):
        logger.warning("Redis unavailable, using in-memory fallback")
        _fallback_store[f"session:{session_id}"] = state.model_dump_json()
```

---

## 4. LangGraph Agent Nodes

### 4.1 Node 1: `interrogator` (`agent/nodes/interrogator.py`)

**Function signature:** `def interrogator(state: OracleGraphState) -> dict`

**Logic:**
1. Read `state["problem"]`, `state["constraints"]`, `state["dimensionCoverage"]`
2. Build the system prompt from `prompts/interrogator.md` — inject the uncovered dimensions dynamically
3. Call Claude Sonnet with the system prompt + user context
4. Parse JSON response: `{ "question": str, "targetDimension": str, "isLastQuestion": bool }`
5. Validate: `targetDimension` must be one of the 5 dimensions and must NOT already be covered
6. On parse failure: retry once with error context appended
7. Return `{ "currentQuestion": question, "isLastQuestion": isLastQuestion }`

**System prompt key instructions:**
- "You are an expert advisor extracting decision constraints. You are not a conversationalist."
- List all 5 dimensions with definitions:
  - `resources` — financial runway, budget, funding, team size
  - `timeline` — deadlines, milestones, time-to-market expectations
  - `riskTolerance` — appetite for experimentation vs stability
  - `market` — target customers, competitive landscape, domain expertise
  - `founderContext` — personal skills, network, experience, lifestyle constraints
- "Examine which dimensions are NOT yet covered: [inject uncovered list]. Ask about the most critical uncovered dimension."
- "Return JSON only: `{ "question": "...", "targetDimension": "...", "isLastQuestion": false }`"
- "Set isLastQuestion to true ONLY when all 5 dimensions have at least one constraint"
- "Ask one question only. Never ask compound questions."
- "Write questions that are direct and purposeful — not friendly chatbot filler."

### 4.2 Node 2: `map_generator` (`agent/nodes/map_generator.py`)

**Function signature:** `def map_generator(state: OracleGraphState) -> dict`

**Logic:**
1. Read `state["problem"]` and `state["constraints"]`
2. Build system prompt from `prompts/map_generator.md`
3. Call Claude Sonnet with the full constraint set
4. Parse JSON response: `{ "nodes": [...], "edges": [...] }`
5. Validate: 12–15 nodes, each has all required fields, depth-0 node exists at ~50/50, edges reference valid node IDs, x/y are 0–100
6. On validation failure: retry once with specific error messages
7. On second failure: return a minimal 5-node fallback map (center + 4 depth-1 nodes)
8. Return `{ "mapState": { "nodes": nodes, "edges": edges, "activeNodeId": null } }`

**System prompt key instructions:**
- Provide problem + all constraints as structured JSON input
- "Generate 12–15 nodes representing the solution space for this problem given these constraints."
- "Node schema: `{ id, label, depth, parentId, conflictFlag, conflictReason, x, y, dimension, category }`"
- "Depth 0: the problem itself, position at x:50, y:50. There is exactly ONE depth-0 node."
- "Depth 1: 5–7 major strategic areas in a ring around center (radius ~25–35 from center)"
- "Depth 2: 5–8 sub-branches on the most important depth-1 nodes"
- "For each node, evaluate conflicts against stated constraints. Only flag genuine conflicts. Write a plain-English conflictReason."
- "dimension: tag each node with one of: resources, timeline, riskTolerance, market, founderContext"
- "category: tag each node with one of: financial, strategic, operational, tactical"
- "Canvas is 0–100 in both dimensions."
- "Return valid JSON only. No markdown. No explanation. No preamble."
- "Also return edges: `[{ sourceId, targetId }]` — one edge from each node to its parentId."

**This is the highest-risk prompt.** Budget extra time for iteration. Test with Priya's example constraints repeatedly.

**Fallback map (if Claude fails twice):**
```python
FALLBACK_MAP = {
    "nodes": [
        {"id": "root", "label": state["problem"][:40], "depth": 0, "parentId": None,
         "conflictFlag": False, "conflictReason": "", "x": 50, "y": 50,
         "dimension": None, "category": "strategic"},
        {"id": "n1", "label": "Strategy A", "depth": 1, "parentId": "root",
         "conflictFlag": False, "conflictReason": "", "x": 25, "y": 25, ...},
        # ... 3 more depth-1 nodes at cardinal positions
    ],
    "edges": [{"sourceId": "root", "targetId": "n1"}, ...]
}
```

### 4.3 Node 3: `expander` (`agent/nodes/expander.py`)

**Function signature:** `def expander(state: OracleGraphState) -> dict`

**Logic:**
1. Read clicked `nodeId` from `state["mapState"]["activeNodeId"]`
2. Find the node in `state["mapState"]["nodes"]`
3. Gather parent chain (path from root to this node) for context
4. Read `state["constraints"]` and `state["explorationHistory"]`
5. Call Claude Sonnet with concise prompt
6. Parse JSON: `{ "childNodes": [...], "childEdges": [...] }`
7. Validate: 3–5 children, positions offset from parent, IDs are unique vs existing nodes
8. Merge children into existing `mapState.nodes` and `mapState.edges`
9. Return updated `mapState`

**System prompt key instructions:**
- "Generate 3–5 child nodes for the node: '[label]' (id: [id])"
- "Parent path from root: [root label] → [depth-1 label] → ... → [this node label]"
- "All constraints: [list constraints as key-value pairs]"
- "Previously explored nodes: [list of visited node labels] — do NOT duplicate these"
- "Position children within 10–15 units of parent at (x, y). Spread them in a fan."
- "Children should be more specific and actionable than the parent"
- "Check each child against all constraints. Flag conflicts with clear reasons."
- "Return JSON: `{ "childNodes": [...], "childEdges": [...] }`"
- "Each childNode has: id, label, depth (parent.depth + 1), parentId, conflictFlag, conflictReason, x, y, dimension, category"

**Performance:** Keep prompt SHORT. This runs on every click. Target <3s response time on Sonnet.

### 4.4 Node 4: `fork_regenerator` (`agent/nodes/fork_regenerator.py`)

**Function signature:** `def fork_regenerator(state: OracleGraphState) -> dict`

**Logic:**
1. Read the fork context: constraints up to fork point + new answer replacing the forked constraint
2. Build prompt identical to map_generator but with explicit fork framing
3. Call Claude Sonnet
4. Parse and validate identically to map_generator
5. Return the new `mapState` for the branch

**System prompt addition over map_generator:**
- "The user originally answered '[original answer]' for the [dimension] dimension."
- "They are now exploring what would happen if they had answered '[new answer]' instead."
- "Generate a solution space map that meaningfully reflects this different path."
- "The map should be noticeably different from a map generated with the original constraints — don't just rearrange nodes."

---

## 5. State Transition Functions (`agent/transitions.py`)

### 5.1 `init_session(problem: str) -> OracleState`

```python
import uuid
from datetime import datetime

def init_session(problem: str) -> OracleState:
    session_id = str(uuid.uuid4())
    state = OracleState(
        sessionId=session_id,
        phase="interrogation",
        problem=problem,
        constraints=[],
        dimensionCoverage=DimensionCoverage(),
        mapState=MapState(),
        explorationHistory=[],
        branches=[],
        activeBranchId="main",
        currentQuestion="",
        isLastQuestion=False,
    )
    # Save to Redis (async — call from async context)
    # await save_session(session_id, state)
    return state
```

### 5.2 `update_constraints(state, answer, dimension, constraint_type) -> OracleState`

```python
def update_constraints(state: dict, answer: str, dimension: str, constraint_type: str) -> dict:
    constraint = {
        "id": str(uuid.uuid4()),
        "dimension": dimension,
        "type": constraint_type,
        "value": answer,
        "answeredAt": datetime.utcnow().isoformat(),
        "timelineIndex": len(state["constraints"]),
    }
    state["constraints"].append(constraint)
    state["dimensionCoverage"][dimension] = True
    # snapshot_map is called after this
    return state
```

### 5.3 `snapshot_map(state) -> dict`

```python
def snapshot_map(state: dict, event_type: str, node_id: str = None, answer: str = None) -> dict:
    import copy
    entry = {
        "index": len(state["explorationHistory"]),
        "timestamp": datetime.utcnow().isoformat(),
        "type": event_type,
        "nodeId": node_id,
        "answer": answer,
        "mapSnapshot": copy.deepcopy(state["mapState"]),
    }
    state["explorationHistory"].append(entry)
    # Also save to Redis: snapshot:{sessionId}:{index}
    return state
```

### 5.4 `trigger_ignition(state) -> dict`

```python
def trigger_ignition(state: dict) -> dict:
    state["phase"] = "ignition"
    # CopilotKit renderAndWait for ConfirmConstraints pauses here
    # On user confirmation → call map_generator node
    # After map_generator returns:
    #   state["mapState"] = map_generator_result
    #   state["phase"] = "exploration"
    #   snapshot_map(state, "answer")
    return state
```

### 5.5 `expand_node(state, node_id) -> dict`

```python
def expand_node(state: dict, node_id: str) -> dict:
    state["mapState"]["activeNodeId"] = node_id
    # Call expander node → returns updated mapState with children merged
    # snapshot_map(state, "nodeClick", node_id=node_id)
    return state
```

### 5.6 `create_branch(state, fork_index, new_answer) -> dict`

```python
def create_branch(state: dict, fork_index: int, new_answer: str) -> dict:
    import copy

    # Get the constraint being replaced
    original_constraint = state["constraints"][fork_index]

    # Build new constraint set: everything up to fork_index, then new answer
    new_constraints = copy.deepcopy(state["constraints"][:fork_index])
    new_constraints.append({
        "id": str(uuid.uuid4()),
        "dimension": original_constraint["dimension"],
        "type": original_constraint["type"],
        "value": new_answer,
        "answeredAt": datetime.utcnow().isoformat(),
        "timelineIndex": fork_index,
    })
    # Add remaining constraints after fork point unchanged
    new_constraints.extend(copy.deepcopy(state["constraints"][fork_index + 1:]))

    branch_id = str(uuid.uuid4())
    branch = {
        "branchId": branch_id,
        "forkIndex": fork_index,
        "label": f"Fork at Q{fork_index + 1}",
        "explorationHistory": [],
        "mapSnapshot": {},  # filled by fork_regenerator
    }

    state["branches"].append(branch)
    state["activeBranchId"] = branch_id
    # Call fork_regenerator with new_constraints → returns new mapState
    # branch["mapSnapshot"] = fork_regenerator_result
    # state["mapState"] = fork_regenerator_result  (switch view to fork)
    return state
```

---

## 6. LangGraph Graph Definition (`agent/graph.py`)

### 6.1 Graph Structure

```
                    ┌──────────────┐
        ┌──────────►│ interrogator │──────┐
        │           └──────────────┘      │
        │                                 ▼
   [entry point]                   {is_last_question?}
        │                          /            \
        │                     NO /              \ YES
        │                       ▼                ▼
        │              [wait for user]    [trigger_ignition]
        │                    │                   │
        │                    │                   ▼
        │                    │          ┌────────────────┐
        │                    └─────────►│ map_generator  │
        │                               └────────────────┘
        │                                        │
        │                                        ▼
        │                               [wait for user]
        │                                   /        \
        │                      clickNode  /          \ forkAt
        │                               ▼              ▼
        │                       ┌──────────┐   ┌──────────────────┐
        │                       │ expander │   │ fork_regenerator │
        │                       └──────────┘   └──────────────────┘
        │                              │                │
        │                              ▼                ▼
        │                       [wait for user]  [wait for user]
        │                              │                │
        └──────────────────────────────┴────────────────┘
```

### 6.2 Implementation

```python
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver

def build_graph():
    graph = StateGraph(OracleGraphState)

    # Add nodes
    graph.add_node("interrogator", interrogator)
    graph.add_node("map_generator", map_generator)
    graph.add_node("expander", expander)
    graph.add_node("fork_regenerator", fork_regenerator)

    # Entry point
    graph.set_entry_point("interrogator")

    # Conditional routing after interrogator
    graph.add_conditional_edges(
        "interrogator",
        lambda state: "map_generator" if state["isLastQuestion"] else END,
        {
            "map_generator": "map_generator",
            END: END,  # Pause — wait for user's next answer via submitAnswer
        }
    )

    # After map_generator, pause for exploration
    graph.add_edge("map_generator", END)

    # After expander, pause for next click
    graph.add_edge("expander", END)

    # After fork_regenerator, pause for exploration on new branch
    graph.add_edge("fork_regenerator", END)

    checkpointer = MemorySaver()
    return graph.compile(checkpointer=checkpointer)
```

### 6.3 Invocation Pattern

The graph terminates at END after each node. The three CopilotKit actions (`submitAnswer`, `clickNode`, `forkAt`) re-invoke the graph with updated state and a specific entry node:

```python
app = build_graph()

# For submitAnswer: update constraints in state, then invoke with interrogator
result = app.invoke(updated_state, config={"configurable": {"thread_id": session_id}})

# For clickNode: set activeNodeId, then invoke starting at expander
# For forkAt: build fork state, then invoke starting at fork_regenerator
```

---

## 7. CopilotKit Runtime (`frontend/src/app/api/copilotkit/route.ts`)

### 7.1 Setup

```typescript
import { CopilotRuntime, CopilotKitServiceAdapter } from "@copilotkit/runtime";
import { NextRequest } from "next/server";

const runtime = new CopilotRuntime({
  remoteActions: [
    {
      url: "http://localhost:8000/copilotkit",  // LangGraph agent endpoint
    },
  ],
});

export async function POST(req: NextRequest) {
  const { handleRequest } = runtime;
  return handleRequest(req);
}
```

### 7.2 Actions Registered on Python Side

In the LangGraph agent server, register these CopilotKit actions:

**`submitAnswer`** — called by Phase 2's interrogation panel
- Parameters: `{ answer: string }`
- Updates constraints in state, triggers interrogator node
- Returns updated state with new `currentQuestion`

**`clickNode`** — called by Phase 2's map canvas
- Parameters: `{ nodeId: string }`
- Sets `activeNodeId`, triggers expander node
- Returns updated state with new child nodes in `mapState`

**`forkAt`** — called by Phase 2's scrubber
- Parameters: `{ forkIndex: number, newAnswer: string }`
- Triggers `createBranch` + `fork_regenerator`
- Returns updated state with new branch and regenerated map

**`ConfirmConstraints`** — triggered BY Phase 1 at ignition
- Uses `renderAndWait` — pauses agent, Phase 2 renders confirmation UI
- On confirm: resumes agent, calls `map_generator`
- Returns updated state with full `mapState` and `phase="exploration"`

---

## 8. JSON Validation Layer (`agent/validation.py`)

```python
def validate_interrogator_response(data: dict) -> tuple[bool, list[str]]:
    errors = []
    if "question" not in data or not isinstance(data["question"], str):
        errors.append("Missing or invalid 'question' field")
    if "targetDimension" not in data:
        errors.append("Missing 'targetDimension' field")
    elif data["targetDimension"] not in VALID_DIMENSIONS:
        errors.append(f"Invalid dimension: {data['targetDimension']}")
    if "isLastQuestion" not in data or not isinstance(data["isLastQuestion"], bool):
        errors.append("Missing or invalid 'isLastQuestion' field")
    return (len(errors) == 0, errors)


def validate_map_response(data: dict) -> tuple[bool, list[str]]:
    errors = []
    nodes = data.get("nodes", [])
    edges = data.get("edges", [])

    if not isinstance(nodes, list) or len(nodes) < 5:
        errors.append(f"Expected 12-15 nodes, got {len(nodes) if isinstance(nodes, list) else 'non-list'}")

    node_ids = set()
    has_root = False
    for i, node in enumerate(nodes):
        for field in ["id", "label", "depth", "x", "y"]:
            if field not in node:
                errors.append(f"Node {i} missing '{field}'")
        if node.get("depth") == 0:
            has_root = True
        nid = node.get("id")
        if nid in node_ids:
            errors.append(f"Duplicate node id: {nid}")
        node_ids.add(nid)
        if not (0 <= node.get("x", -1) <= 100):
            errors.append(f"Node {nid} x={node.get('x')} out of range 0-100")
        if not (0 <= node.get("y", -1) <= 100):
            errors.append(f"Node {nid} y={node.get('y')} out of range 0-100")

    if not has_root:
        errors.append("No depth-0 root node found")

    for edge in edges:
        if edge.get("sourceId") not in node_ids:
            errors.append(f"Edge sourceId '{edge.get('sourceId')}' not in nodes")
        if edge.get("targetId") not in node_ids:
            errors.append(f"Edge targetId '{edge.get('targetId')}' not in nodes")

    return (len(errors) == 0, errors)


def validate_expander_response(data: dict) -> tuple[bool, list[str]]:
    errors = []
    children = data.get("childNodes", [])
    if not isinstance(children, list) or not (1 <= len(children) <= 7):
        errors.append(f"Expected 3-5 child nodes, got {len(children) if isinstance(children, list) else 'non-list'}")
    for i, child in enumerate(children):
        for field in ["id", "label", "depth", "parentId", "x", "y"]:
            if field not in child:
                errors.append(f"Child {i} missing '{field}'")
    return (len(errors) == 0, errors)


# validate_fork_response reuses validate_map_response
validate_fork_response = validate_map_response

VALID_DIMENSIONS = {"resources", "timeline", "riskTolerance", "market", "founderContext"}
```

---

## 9. Claude Call Wrapper (`agent/nodes/_base.py`)

Shared utility for all nodes:

```python
import json
from langchain_anthropic import ChatAnthropic

MODEL = os.getenv("MODEL_NAME", "claude-sonnet-4-20250514")

llm = ChatAnthropic(model=MODEL, max_tokens=4096, temperature=0)

def call_claude_json(system_prompt: str, user_message: str, validator_fn, max_retries=1) -> dict:
    """Call Claude, parse JSON, validate, retry on failure."""
    for attempt in range(max_retries + 1):
        try:
            response = llm.invoke([
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ])
            text = response.content
            # Strip markdown code fences if present
            if text.startswith("```"):
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
            data = json.loads(text.strip())
            is_valid, errors = validator_fn(data)
            if is_valid:
                return data
            else:
                # Retry with error context
                user_message += f"\n\nYour previous response had these errors: {errors}. Please fix and regenerate."
        except (json.JSONDecodeError, Exception) as e:
            if attempt < max_retries:
                user_message += f"\n\nYour previous response was not valid JSON: {str(e)}. Return ONLY valid JSON."
            else:
                raise
    return data  # Return last attempt even if slightly invalid
```

---

## 10. Error Handling Summary

| Error | Strategy |
|---|---|
| **Malformed Claude JSON** | Retry once with error context appended to prompt. On second failure, return degraded fallback. |
| **Redis connection failure** | Fall back to in-memory dict. Log warning. Phase 2 never knows. |
| **CopilotKit sync failure** | Log error. Don't retry automatically. Phase 2 shows spinner. |
| **Claude timeout (>8s interrogator/expander, >15s map_generator)** | Cancel and retry once. |
| **Invalid dimension in interrogator** | Re-call with explicit list of uncovered dimensions. |
| **Duplicate node IDs from expander** | Prefix returned IDs with `{parentId}_` to guarantee uniqueness. |

---

## 11. Testing Strategy

### 11.1 Unit Tests (per node)

- `test_interrogator.py` — verify it asks about uncovered dimensions, returns valid JSON, stops when all 5 covered
- `test_map_generator.py` — verify 12–15 nodes, valid positions, conflict flags exist, edges valid
- `test_expander.py` — verify 3–5 children, positions near parent, no duplicate IDs
- `test_fork_regenerator.py` — verify different map than original when constraint changes

### 11.2 CLI Test Harness

Build a simple CLI (`python -m agent.test_cli`) that runs the full flow interactively:
1. Prompts for problem statement
2. Displays Claude's questions one at a time
3. Accepts typed answers
4. Prints constraint summary at ignition
5. Prints full node tree JSON (formatted)
6. Allows clicking nodes by ID
7. Allows forking at any answer index

This is the "terminal demo" milestone — Phase 1 is complete when this works end-to-end.

### 11.3 Priya Test Scenario (The Canonical E2E Test)

**Problem:** "I'm a UX designer leaving my full-time job to go independent. I need to figure out how to build a sustainable freelance practice."

**Expected 5 answers:**
1. Resources → "I have about 3 months of runway saved up, roughly $15k"
2. Timeline → "I want to be at $8k/month recurring within 6 months"
3. Risk Tolerance → "Low — I need stability. I can't afford to experiment wildly."
4. Market → "B2B SaaS companies, I have 5 years of enterprise UX experience"
5. Founder Context → "I have a warm network of ~50 past colleagues and clients I could reach out to"

**Expected map characteristics:**
- Center node: "Independent UX Practice"
- Depth-1 nodes: Client Acquisition, Service Packaging, Pricing Strategy, Network Activation, Financial Runway Management, Portfolio/Brand
- Conflict flags on: anything suggesting "build a product" (conflicts with low risk tolerance), anything suggesting "agency model with hires" (conflicts with 3-month runway)
- 12–15 total nodes, ≥2 conflict flags

**Fork test:** At Q3 (risk tolerance), change to "High — I'm willing to bet big and move fast." Regenerated map should include product-building, agency scaling nodes and remove conservative pricing.

---

## 12. Hour-by-Hour Execution Plan

| Time | Person 1 (Agent Nodes) | Person 2 (State + Runtime) |
|---|---|---|
| **0:00–0:30** | BOTH: Write `state.py` — freeze Pydantic models + TypedDict. No unilateral changes after this. | BOTH: Same. Agree on every field name and type. |
| **0:30–1:00** | Set up Python project structure, install deps, create all empty files | Set up Redis (docker), write `redis_store.py` with full CRUD + fallback |
| **1:00–1:30** | Build `interrogator` node + write system prompt. Test via direct Python call with Priya's problem. | Write `init_session`, `update_constraints`, `snapshot_map` in `transitions.py` |
| **1:30–2:00** | Build `map_generator` node + write system prompt. Test with Priya's full 5 constraints. | Set up Next.js app + CopilotKit runtime API route. Connect to LangGraph service. |
| **2:00–2:30** | Iterate on `map_generator` prompt — validate JSON, conflict flags, node positions. Run 3+ times. | Get `useCoAgent` returning live state in a minimal test React component |
| **2:30–3:00** | Build `expander` node. Test with 3 different node clicks on the generated map. | Write `trigger_ignition` + `ConfirmConstraints` renderAndWait wiring |
| **3:00** | **🎯 MILESTONE: Phase 2 can call useCoAgent and receive live state** | **🎯 MILESTONE: submitAnswer → state update → new question flow works** |
| **3:00–3:30** | Build `fork_regenerator` node + system prompt | Wire `submitAnswer`, `clickNode`, `forkAt` as CopilotKit actions |
| **3:30–4:00** | Build LangGraph graph (`graph.py`) — wire all nodes with conditional routing | Write `expand_node`, `create_branch` transition functions |
| **4:00–5:00** | End-to-end test: full agent graph from entry → interrogation → ignition → exploration → fork | Integration test: Phase 2 calls all 3 actions and receives correct state |
| **5:00–5:30** | Prompt tuning based on Phase 2 feedback. Fix malformed JSON. Improve conflict reasons. | Fix state sync bugs. Ensure scrubber snapshots are correct at every index. |
| **5:30–6:00** | Final prompt polish. Run Priya scenario 2x to confirm stability. | Support Phase 2 integration. Hotfix anything blocking the demo. |

---

## 13. Phase 2 Contract (What They Need by Hour 3)

Phase 2 is unblocked when they can:

1. `useCoAgent({ name: "oracle_agent" })` → receive live `OracleState`
2. `submitAnswer("I have 3 months runway")` → see `state.constraints` grow + `state.currentQuestion` update
3. `clickNode("node_123")` → see `state.mapState.nodes` grow with 3–5 children
4. Read `state.phase` to know which UI to show (entry | interrogation | ignition | exploration)
5. Read `state.explorationHistory` with valid `mapSnapshot` at each index for the scrubber
6. Receive `ConfirmConstraints` action trigger to render the ignition confirmation card

**Test this contract with a bare-bones React component before hour 3. If all 6 points work, Phase 2 is permanently unblocked.**

---

## 14. Critical Path & Risk Mitigation

### Highest Risk: `map_generator` Prompt
- Generating 12–15 nodes with valid JSON, positions, and conflict reasoning in one call
- **Mitigation:** Start iterating by hour 1:30. Have a 5-node fallback hardcoded. Validate every field.

### Second Risk: CopilotKit Integration
- `useCoAgent` state sync and `renderAndWait` are convention-heavy
- **Mitigation:** Follow CopilotKit docs exactly. Get hello-world state sync by hour 2:00.

### Third Risk: LangGraph Conditional Routing
- Graph must correctly route between all 4 nodes based on state
- **Mitigation:** Build incrementally. Interrogator loop first, then add map_generator, then expander/fork.

---

## 15. Key Technical Decisions (Locked)

| Decision | Choice | Rationale |
|---|---|---|
| LLM | Claude Sonnet | Latency > marginal quality for demo. Haiku too weak for structured JSON. |
| Structured output | JSON-in-prompt | Faster to implement than function calling. Sufficient with retry. |
| State store | Redis | Schema-free, CopilotKit-compatible, survives restarts. |
| State sync | CopilotKit useCoAgent | Saves building custom WebSocket layer. 6 hour constraint. |
| Graph framework | LangGraph | Checkpointing + conditional edges out of the box. |
| Frontend code in Phase 1 | NONE | Only the CopilotKit API route. Phase 2 owns all React. |
| Redis fallback | In-memory dict | Never crash. Phase 2 never knows. |
| Fork depth | 1 level only | Nested forks out of scope for hackathon. |

---

## 16. Success Criteria

Phase 1 is done when:

- [ ] Full Priya scenario runs end-to-end in CLI in under 90 seconds
- [ ] Map JSON has 12+ nodes with ≥2 meaningful conflict flags
- [ ] Every `explorationHistory` entry has a valid `mapSnapshot` that restores correctly
- [ ] Fork at Q3 produces a visibly different map than the original
- [ ] Phase 2 was never blocked waiting for Phase 1 after hour 3
- [ ] No crashes on Redis failure, malformed JSON, or slow Claude responses
