# Aalekh — AI Decision Map Agent

## Overview

**Aalekh** is an AI-powered agent system for mapping complex decision spaces. It uses LangGraph, Claude Sonnet, and CopilotKit to guide users through constraint interrogation, generate solution maps, and enable interactive exploration and forking. The project is split into two phases:

- **Phase 1:** Backend agent service (LangGraph, FastAPI, Redis) — in the `oracle` folder
- **Phase 2:** Frontend (Next.js, CopilotKit UI) — in the `frontendui` folder

## Project Structure

```
oracle/
├── agent/        # Python LangGraph service (port 8000)
│   ├── agent/    # Agent logic, nodes, state, prompts
│   ├── tests/    # Unit and e2e tests
frontendui/       # Next.js app (port 3000)
├── app/api/copilotkit/route.ts
docker-compose.yml
README.md
```


## Key Features

- **Constraint Interrogation:**
  - Extracts decision constraints across 5 dimensions: resources, timeline, risk tolerance, market, founder context
  - Uses targeted, non-chatty questions to clarify user priorities
- **Map Generation:**
  - Creates a node/edge map of the solution space (12–15 nodes)
  - Flags conflicts, tags dimensions and categories, positions nodes visually
- **Interactive Exploration:**
  - Expand nodes to reveal sub-strategies
  - Fork scenarios to explore alternate answers
  - Track exploration history and restore map snapshots
- **State Sync:**
  - CopilotKit runtime for real-time frontend updates
  - Actions: submitAnswer, clickNode, forkAt, ConfirmConstraints
- **Robust Error Handling:**
  - Fallbacks for Redis, Claude, and JSON validation
  - Minimal fallback maps and in-memory state on backend failures

## Setup

### 1. Backend (Python Agent — oracle)

- Install dependencies:
  - `langgraph`, `langchain-anthropic`, `redis`, `pydantic`, `fastapi`, `uvicorn`, `langserve`, `python-dotenv`
- Set environment variables in `.env`:
  - `ANTHROPIC_API_KEY`, `REDIS_URL`, `MODEL_NAME`
- Start Redis:
  - `docker run -d -p 6379:6379 redis:7-alpine`
- Run agent server:
  - `uvicorn agent.server:app --reload`

### 2. Frontend (Next.js + CopilotKit — frontendui)

- Install dependencies:
  - `@copilotkit/runtime`, `@copilotkit/react-core`, `@copilotkit/react-ui`
- Start frontend:
  - `npm install && npm run dev`

### 3. Docker Compose (Recommended)

- Run all services:
  - `docker-compose up`

## Usage

1. **Start a session** with a problem statement (e.g., "How do I build a sustainable freelance practice?")
2. **Answer constraint questions** (resources, timeline, risk tolerance, market, founder context)
3. **Confirm constraints** and generate the solution map
4. **Explore the map** by clicking nodes to expand, forking at any answer to see alternate paths
5. **Track exploration history** and restore previous map snapshots
6. **Frontend syncs state** via CopilotKit actions (`submitAnswer`, `clickNode`, `forkAt`, `ConfirmConstraints`)

## Example Scenario

**Problem:** "I'm a UX designer leaving my full-time job to go independent. I need to figure out how to build a sustainable freelance practice."

**Expected answers:**
- Resources: "I have about 3 months of runway saved up, roughly $15k"
- Timeline: "I want to be at $8k/month recurring within 6 months"
- Risk Tolerance: "Low — I need stability. I can't afford to experiment wildly."
- Market: "B2B SaaS companies, I have 5 years of enterprise UX experience"
- Founder Context: "I have a warm network of ~50 past colleagues and clients I could reach out to"

**Expected map:**
- Center node: "Independent UX Practice"
- Depth-1 nodes: Client Acquisition, Service Packaging, Pricing Strategy, Network Activation, Financial Runway Management, Portfolio/Brand
- Conflict flags: "build a product" (conflicts with low risk tolerance), "agency model with hires" (conflicts with 3-month runway)
- 12–15 nodes, ≥2 conflict flags

**Fork test:**
- At Q3 (risk tolerance), change to "High — I'm willing to bet big and move fast."
- Regenerated map includes product-building, agency scaling nodes, removes conservative pricing

## Testing

- Unit tests for each agent node
- CLI harness for end-to-end flow (`python -m agent.test_cli`)
- Priya scenario for canonical e2e test

## Success Criteria

- Full scenario runs in CLI in <90s
- Map JSON has 12+ nodes, ≥2 conflict flags
- Fork produces visibly different map
- No crashes on Redis/Claude errors
- Phase 2 frontend is unblocked by hour 3
- Every explorationHistory entry restores a valid map snapshot

## License

MIT License

For detailed implementation plan, see [agents.md](agents.md).
