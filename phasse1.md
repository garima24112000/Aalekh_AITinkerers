# ORACLE — Phase 1 Design Document
## Intelligence + Backend
### Team: Person 1 (Agent Nodes) + Person 2 (State + Runtime)

---

## 1. What Phase 1 Is Responsible For

Phase 1 is the entire brain of ORACLE. It has no UI. Its job is to receive user inputs, run them through Claude, manage all application state, and expose a clean interface that Phase 2 can call without knowing anything about what happens underneath.

When Phase 1 is complete, you can run the full application logic end-to-end in a terminal. Type a problem, get interrogated, confirm constraints, receive a node tree as JSON. Phase 2 plugs into this and renders it.

Phase 1 owns:
- All Claude API calls and system prompts
- The LangGraph agent graph and node execution logic
- The canonical state object and all state transitions
- Redis persistence and snapshot management
- The CopilotKit runtime that bridges backend to frontend
- The three actions Phase 2 calls: `submitAnswer`, `clickNode`, `forkAt`

Phase 1 does not own:
- Any React components
- Any CSS or visual logic
- Any frontend routing

---

## 2. Technology Decisions

### 2.1 LangGraph (Python)

**What it is:** A framework for building stateful, multi-step AI agents as directed graphs. Each node in the graph is a function that receives state, does work (usually calls an LLM), and returns updated state.

**Why we chose it:**
ORACLE has four distinct Claude "modes" — interrogating, map generating, expanding a node, and regenerating after a fork. These are not one conversation. They are separate reasoning tasks with different inputs, outputs, and system prompts. LangGraph lets us model each mode as an isolated node, run them conditionally based on application phase, and pass a typed state object through the whole graph.

The alternative would be managing these as ad-hoc API calls scattered across the codebase. That breaks down fast when you need conditional branching (e.g. only call map_generator when all 5 dimensions are covered) and when you need to checkpoint state at each step.

**Why not LangChain alone:** LangChain is a library. LangGraph is the orchestration layer on top of it. For a multi-step agent with conditional routing, you need LangGraph. LangChain handles the Claude API calls inside each node.

**Why not a custom orchestrator:** We have 6 hours. LangGraph gives us checkpointing, conditional edges, and state management out of the box. Writing that ourselves is a day of work.

---

### 2.2 Claude via Anthropic API

**Model choice:** Claude Sonnet for all nodes.

**Why Sonnet and not Opus:** Sonnet gives 80% of Opus capability at significantly lower latency. For a hackathon demo, response speed matters more than marginal reasoning quality. The interrogation loop especially needs to feel snappy — a 4-second wait between questions kills the experience. Haiku is too weak for the structured JSON generation we need, particularly for map_generator which must reason about constraint conflicts across 15 nodes simultaneously.

**Why not GPT-4o:** The hackathon is on Anthropic credits. Also, Claude's instruction-following for structured JSON output with complex system prompts is genuinely stronger for this use case.

**Structured output strategy:** We do not use function calling or tool use for structured outputs. We prompt Claude to return JSON in a defined schema and parse it. This is faster to implement and sufficient for our needs. We wrap every Claude call in a try/except that retries once if the JSON is malformed.

---

### 2.3 Redis

**What it is:** An in-memory key-value store. We use it as the single source of truth for application state across the session.

**Why Redis and not just in-memory Python state:**
Two reasons. First, CopilotKit's runtime expects to read and write state from a persistent store — Redis is the recommended integration. Second, if the server restarts during a demo (it will), all state survives. In-memory state dies with the process.

**Why Redis and not a SQL database:**
The state object is a deeply nested JSON blob that changes shape as the session progresses. SQL schemas require migration every time the shape changes. Redis stores the blob as-is. For a 6-hour hackathon, schema flexibility is worth more than query power. We never query across sessions — we only read and write one session at a time by sessionId.

**What we store in Redis:**
- `session:{sessionId}` → the full canonical state object as JSON
- `snapshot:{sessionId}:{timelineIndex}` → map snapshots for the scrubber (separate keys for fast lookup)

**What we do not store in Redis:**
- Claude conversation history (kept in LangGraph node state, not persisted between server restarts — acceptable for a demo)
- User authentication (no auth in scope)

---

### 2.4 CopilotKit Runtime

**What it is:** A middleware layer that sits between the LangGraph backend and the React frontend. It exposes the agent's state to the frontend via the `useCoAgent` hook and lets the frontend call agent actions via `useCopilotAction`.

**Why we need it:**
Without CopilotKit, we would need to build our own WebSocket server, define our own event protocol, write frontend state sync logic, and handle the human-in-the-loop confirmation flow manually. CopilotKit gives us all of that in exchange for following its conventions.

**The specific CopilotKit primitives we use:**

`useCoAgent` — bidirectional state sync. The agent writes state; the frontend reads it automatically. The frontend writes state (e.g. user clicks a node); the agent reads it. No custom sync code needed.

`useCopilotAction` with `renderAndWait` — used for the ignition confirmation moment. The agent pauses execution, the frontend renders a custom confirmation UI, the user confirms, and the agent resumes. This is exactly the human-in-the-loop primitive we need.

`useCoAgentStateRender` — used to render intermediate agent states during map generation. While Claude is generating the node tree, the frontend shows a loading state. This hook lets the agent push partial state to the frontend as it works.

**Why not build a custom WebSocket layer:**
6 hours. CopilotKit's conventions are worth the constraint.

---

### 2.5 Next.js (API Routes for Runtime)

**Why Next.js for the backend runtime:**
CopilotKit's runtime is designed to run as a Next.js API route. The LangGraph Python agent runs as a separate service, and the CopilotKit runtime proxies between the React frontend and the LangGraph service. This is the documented, supported architecture. Deviating from it costs time.

**The service architecture:**
- Next.js app (frontend + CopilotKit runtime API route) on port 3000
- LangGraph Python agent server on port 8000
- Redis on port 6379

All three run locally during the hackathon. No deployment needed.

---

## 3. The Canonical State Object

This is the single most important design decision in the entire project. Every component in Phase 1 and Phase 2 is a pure function of this object. If the shape changes, both phases need to know.

This schema is frozen after the first 30 minutes. No unilateral changes.

```
OracleState {
  sessionId: string
  phase: "entry" | "interrogation" | "ignition" | "exploration"
  problem: string

  constraints: Array of {
    id: string
    dimension: "resources" | "timeline" | "riskTolerance" | "market" | "founderContext"
    type: "eliminator" | "shaper" | "anchor"
    value: string          — the raw user answer
    answeredAt: ISO timestamp
    timelineIndex: number  — which pill on the scrubber this maps to
  }

  dimensionCoverage: {
    resources: boolean
    timeline: boolean
    riskTolerance: boolean
    market: boolean
    founderContext: boolean
  }

  mapState: {
    nodes: Array of {
      id: string
      label: string
      depth: number          — 0 is center, 1 is first ring, 2+ are expansions
      parentId: string | null
      conflictFlag: boolean
      conflictReason: string — shown in tooltip, empty if no conflict
      x: number              — 0 to 100, percentage of canvas width
      y: number              — 0 to 100, percentage of canvas height
    }
    edges: Array of { sourceId, targetId }
    activeNodeId: string | null
  }

  explorationHistory: Array of {
    index: number
    timestamp: ISO timestamp
    type: "answer" | "nodeClick"
    nodeId: string | null        — null for answer events
    answer: string | null        — null for nodeClick events
    mapSnapshot: mapState        — full copy of mapState at this moment
  }

  branches: Array of {
    branchId: string
    forkIndex: number            — which explorationHistory index this forked from
    label: string                — "Fork at Q3" for display on scrubber
    explorationHistory: Array    — this branch's own history after the fork
    mapSnapshot: mapState        — the map as it exists on this branch
  }

  activeBranchId: "main" | string
}
```

**Key decisions in this schema:**

`mapSnapshot` is stored inline in each `explorationHistory` entry. This makes rewind a single `setState` call — no reconstruction, no re-querying. The cost is storage size, but for a hackathon demo with a short session, this is fine.

`conflictReason` is a string, not a code. Claude generates a human-readable explanation ("Productized services typically take 3–6 months — conflicts with your 3-month runway"). This appears directly in the tooltip.

`x` and `y` are percentages, not pixels. This makes the layout resolution-independent and means Phase 2 can render on any screen size without recalculating positions.

`branches` is a flat array, not a tree. We support one level of forking for the hackathon. Nested forks are out of scope.

---

## 4. The Four LangGraph Nodes

### Node 1: `interrogator`

**Purpose:** Given the problem and constraints collected so far, generate the next best question to ask.

**When it runs:** Every time the user submits an answer during the interrogation phase. Also runs once at the start with an empty constraints array to generate the first question.

**Input it receives:**
- The user's problem statement
- The full constraints array (empty on first call)
- The dimensionCoverage object showing which dimensions are already closed

**Output it must return:**
- The next question as a string
- Which dimension this question targets
- Whether this is the last question (true when all 5 dimensions are covered)

**Claude's job in this node:**
Claude looks at which dimensions are not yet covered and decides which gap is most important to close given what it already knows. It does not ask about a dimension that already has a constraint. It asks one question at a time. It never asks compound questions ("what is your budget and timeline?"). It writes questions that are direct and purposeful — not friendly chatbot filler.

**System prompt design principles:**
- Tell Claude it is an expert advisor extracting decision constraints, not a conversationalist
- Give Claude the 5 dimension names and what each means
- Tell Claude to classify the question it is writing by dimension before returning
- Instruct Claude to set isLastQuestion true only when all 5 dimensions have at least one constraint
- Instruct Claude to return JSON only, no preamble

**Routing logic after this node:**
- If `isLastQuestion` is false → return to waiting state, render question in UI
- If `isLastQuestion` is true → route to the `confirm_constraints` action, pause for human confirmation

---

### Node 2: `map_generator`

**Purpose:** Given the full set of constraints, generate the complete node tree representing the solution space.

**When it runs:** Once, immediately after the user confirms the constraint summary at ignition.

**Input it receives:**
- The user's problem statement
- The full constraints array with all dimensions covered

**Output it must return:**
- An array of 12–15 nodes with id, label, depth, parentId, conflictFlag, conflictReason, x, y
- An array of edges connecting them

**Claude's job in this node:**
Claude generates a meaningful solution space for the user's problem. Depth-0 is the problem itself (the center node). Depth-1 nodes (5–7 of them) are the major strategic areas. Depth-2 nodes (5–8 of them) are initial sub-branches hanging off the most important depth-1 nodes. Claude does not generate all possible depth-2 nodes — just enough to make the map feel rich immediately.

For each node, Claude must evaluate whether it conflicts with any stated constraint and write a plain-English reason if it does.

Claude also assigns x/y positions. The center node is at 50/50. Depth-1 nodes are arranged in a ring. Depth-2 nodes cluster near their parents. Claude does not need to be precise — Phase 2 will render whatever positions Claude returns.

**System prompt design principles:**
- Give Claude the problem and all constraints as structured input
- Tell Claude the canvas is 0–100 in both dimensions, center is 50/50
- Instruct Claude to think about conflict before assigning the flag — not to flag everything as conflicted
- Require Claude to return valid JSON matching the node schema exactly
- Tell Claude the output will be parsed programmatically — no markdown, no explanation

**Why this node is the highest-risk prompt:**
Generating 15 nodes with positions, conflict flags, and reasons in one call is the most complex structured output we ask Claude to produce. If the JSON is malformed or the conflict reasoning is poor, the entire app falls apart. This node gets the most prompt iteration time.

**Mitigation:** Build a validation function that checks the returned JSON against the schema. If any required field is missing, retry the call once with an error message appended to the prompt.

---

### Node 3: `expander`

**Purpose:** When the user clicks a node, generate 3–5 child nodes that expand that branch.

**When it runs:** Every time the user clicks a node during exploration phase.

**Input it receives:**
- The clicked node's id and label
- The full constraints array
- The exploration history (which nodes have been visited, in what order)

**Output it must return:**
- 3–5 child nodes with id, label, conflictFlag, conflictReason
- x/y positions offset from the parent node

**Claude's job in this node:**
Claude generates child nodes that are specifically relevant to the clicked node's label, consistent with all constraints, and not redundant with nodes the user has already visited. The exploration history is included so Claude can see the user's curiosity path and generate children that go deeper in the direction the user is heading, not sideways into territory already covered.

**System prompt design principles:**
- Tell Claude the parent node label and the full path of nodes visited so far
- Instruct Claude to generate children that are more specific and actionable than the parent
- Tell Claude to check each child against all constraints before including it
- Keep the output schema identical to the map node schema for consistency

**Performance consideration:**
This node runs on every click. It must be fast. Use Sonnet, not Opus. Keep the system prompt concise — no long explanations of what ORACLE is. Claude only needs the task context, not the product context.

---

### Node 4: `fork_regenerator`

**Purpose:** When the user forks the timeline at a past answer and gives a different answer, regenerate the entire map from that point forward with the new constraint set.

**When it runs:** Once per fork, immediately after the user gives their alternative answer.

**Input it receives:**
- The user's problem statement
- All constraints up to (but not including) the fork index
- The new answer at the fork point
- The dimension that answer covers

**Output it must return:**
- A full new mapState (identical schema to map_generator output)
- This becomes the map for the new branch

**Claude's job in this node:**
Identical to map_generator, but with a different constraint set. The key difference is that one constraint has changed — Claude should generate a meaningfully different map that reflects the new constraint, not just slightly rearrange the original.

**System prompt design principles:**
- Include the original constraint that was replaced, so Claude understands what changed
- Explicitly instruct Claude: "The user originally said X. They are now exploring what would happen if they had said Y instead. Generate a map that reflects this different path."
- This framing produces a more meaningfully different map than just passing the new constraints blindly

---

## 5. State Transition Logic

These are the functions Person 2 owns. They are called by the agent nodes after each execution and keep Redis in sync.

**`initSession(problem)`**
Creates a new sessionId, writes the initial state to Redis with phase="entry", then immediately transitions to phase="interrogation" and calls the interrogator node for the first question.

**`updateConstraints(answer, dimension, type)`**
Adds a new constraint to the constraints array. Updates dimensionCoverage. Writes updated state to Redis. Calls `snapshotMap()`. Checks if all 5 dimensions are now covered — if yes, triggers the confirmation action.

**`snapshotMap()`**
Copies the current `mapState` into a new `explorationHistory` entry with the current timestamp and index. Also writes the snapshot to a separate Redis key `snapshot:{sessionId}:{index}` for fast scrubber lookup.

**`triggerIgnition()`**
Sets phase to "ignition". Fires the `ConfirmConstraints` CopilotKit action, which pauses the agent and renders the confirmation UI in Phase 2. On confirmation, calls `map_generator`, writes the returned mapState to Redis, sets phase to "exploration".

**`expandNode(nodeId)`**
Calls the `expander` node. Appends returned child nodes to `mapState.nodes`. Adds new edges. Writes to Redis. Calls `snapshotMap()`.

**`createBranch(forkIndex, newAnswer)`**
Creates a new branch entry in the `branches` array. Sets `activeBranchId` to the new branch. Rewrites constraints to the fork point. Calls `fork_regenerator`. Writes the returned mapState as the branch's mapSnapshot.

---

## 6. The Three Actions Phase 2 Calls

These are the public API of Phase 1. Phase 2 calls these and nothing else.

**`submitAnswer(answer: string)`**
Phase 2 calls this when the user submits a text answer in the interrogation panel. Phase 1 runs `updateConstraints`, then calls `interrogator` for the next question (or triggers ignition if done).

**`clickNode(nodeId: string)`**
Phase 2 calls this when the user clicks a node on the canvas. Phase 1 runs `expandNode`, updates state in Redis, and the updated state flows back to Phase 2 via `useCoAgent`.

**`forkAt(forkIndex: number, newAnswer: string)`**
Phase 2 calls this when the user forks the timeline. Phase 1 runs `createBranch`, regenerates the map for the new branch, and updates state. Phase 2 receives the new branch's mapState and the new branch entry.

---

## 7. Error Handling Strategy

**Malformed Claude JSON:** Every node wraps its Claude call in a validator. If the returned JSON doesn't match the expected schema, retry once with the error appended to the prompt ("Your previous response was missing the conflictReason field. Please regenerate."). If the retry also fails, return a graceful degraded response (e.g. empty childNodes for expander, or a minimal 3-node map for map_generator).

**Redis connection failure:** Fall back to in-memory Python dict for the session. Phase 2 never knows this happened. Do not crash.

**CopilotKit sync failure:** Log the error, do not retry automatically. Phase 2 shows a loading spinner. The user can re-trigger the action.

**Slow Claude response:** The interrogator and expander nodes should respond in under 3 seconds on Sonnet. If a call exceeds 8 seconds, cancel it and retry. Map_generator is allowed up to 15 seconds — it only runs once and the ignition animation can cover the wait.

---

## 8. Hour-by-Hour Plan for Phase 1

| Time | Person 1 | Person 2 |
|---|---|---|
| 0:00–0:30 | Both: Align on state schema. Freeze it. | Both: Align on state schema. Freeze it. |
| 0:30–1:30 | Build interrogator node, test with Priya's problem via CLI | Stand up Redis locally, initialize state object, write initSession function |
| 1:30–2:30 | Build map_generator node, test with Priya's full constraints | Stand up CopilotKit runtime in Next.js API route, connect to LangGraph, get useCoAgent returning live state in a test component |
| 2:30–3:30 | Build expander node, test with 3 different node clicks | Write all state transition functions: updateConstraints, snapshotMap, triggerIgnition |
| 3:30–4:00 | Build fork_regenerator node | Implement ConfirmConstraints renderAndWait action, wire to triggerIgnition |
| 4:00–5:00 | End-to-end test of full agent graph from entry to exploration | Wire submitAnswer, clickNode, forkAt actions. Test that Phase 2 can call them and receive updated state |
| 5:00–6:00 | Prompt tuning based on Phase 2 feedback. Fix malformed JSON issues. | Support Phase 2 integration. Fix any state sync bugs. |

---

## 9. What Phase 2 Needs From Phase 1 (The Contract)

By hour 3, Phase 2 must be able to:

1. Call `useCoAgent({ name: "oracle_agent" })` and receive the live state object
2. Call `submitAnswer("I have 3 months runway")` and see `state.constraints` update
3. Call `clickNode("node_123")` and see `state.mapState.nodes` grow
4. Receive `state.phase` changes and know when to transition UI
5. Receive `state.explorationHistory` with valid snapshots for the scrubber

If Person 2 can demonstrate these 5 things working in a test component by hour 3, Phase 2 is unblocked for the rest of the build.

---

## 10. What Success Looks Like

At the end of 6 hours, Phase 1 is successful if:

- You can run through the full Priya example end-to-end in the terminal in under 90 seconds
- The node tree JSON is valid, has 12+ nodes, and has at least 2 meaningful conflict flags
- Scrubbing back to any history index returns the correct map snapshot instantly
- A fork at question 3 produces a meaningfully different map than the original
- Phase 2 has not been blocked waiting for Phase 1 at any point after hour 3
