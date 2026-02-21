# ORACLE — AI-Powered Strategic Advisor

> Phase 1 Backend: LangGraph + Claude + Redis + CopilotKit AG-UI

## Architecture

```
┌─────────────────┐     AG-UI / SSE      ┌─────────────────┐
│  Next.js + CK   │ ◄──────────────────► │  FastAPI Agent   │
│  (Phase 2 FE)   │                      │  (Phase 1 BE)   │
└─────────────────┘                      └────────┬────────┘
                                                  │
                                         ┌────────▼────────┐
                                         │   LangGraph     │
                                         │   State Graph   │
                                         └────────┬────────┘
                                                  │
                               ┌──────────────────┼──────────────────┐
                               │                  │                  │
                        ┌──────▼──────┐   ┌──────▼──────┐   ┌──────▼──────┐
                        │   Claude    │   │   Redis     │   │  In-Memory  │
                        │  (Sonnet)   │   │ Persistence │   │  Fallback   │
                        └─────────────┘   └─────────────┘   └─────────────┘
```

## Quick Start

### 1. Setup

```bash
cd oracle/agent

# Create virtual environment
python -m venv .venv && source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure credentials
cp .env .env.local   # edit .env.local with your real keys
```

### 2. Set your Anthropic API key

Edit `.env` (or `.env.local`):
```
ANTHROPIC_API_KEY=sk-ant-your-real-key-here
```

### 3. Run the agent

```bash
# Option A: Direct
python run.py

# Option B: Docker
cd ..  # back to oracle/
docker compose up --build
```

The agent will be available at `http://localhost:8000`.

### 4. Test with CLI

```bash
# Interactive mode
python test_cli.py

# Auto-play Priya scenario
python test_cli.py --auto
```

## Project Structure

```
oracle/
├── docker-compose.yml
├── agent/
│   ├── run.py                  # Entrypoint
│   ├── config.py               # Central config (reads .env)
│   ├── .env                    # Placeholder credentials
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── test_cli.py             # CLI test harness
│   └── agent/
│       ├── __init__.py
│       ├── state.py            # OracleState (extends CopilotKitState)
│       ├── graph.py            # LangGraph StateGraph definition
│       ├── server.py           # FastAPI + AG-UI endpoint
│       ├── redis_store.py      # Redis persistence + fallback
│       ├── validation.py       # JSON schema validators
│       ├── transitions.py      # Pure state transition functions
│       ├── nodes/
│       │   ├── __init__.py
│       │   ├── llm_caller.py   # Claude wrapper with retry
│       │   ├── interrogator.py
│       │   ├── map_generator.py
│       │   ├── expander.py
│       │   └── fork_regenerator.py
│       └── prompts/
│           ├── interrogator.md
│           ├── map_generator.md
│           ├── expander.md
│           └── fork_regenerator.md
└── frontend/
    └── src/app/api/copilotkit/
        └── route.ts            # CopilotKit runtime proxy
```

## Agent Flow

1. **Interrogation** — Asks 5 targeted questions across key dimensions (Goals, Channels, Resources, Differentiation, Timeline)
2. **Map Generation** — Produces a 12–15 node solution space based on answers
3. **Exploration** — Expands any node into 3–5 child nodes on demand
4. **Forking** — Re-generates an alternate map when a user changes an answer

## CopilotKit Integration

**Python side** (`server.py`):
- `LangGraphAGUIAgent` wraps the LangGraph graph
- `add_langgraph_fastapi_endpoint` binds it to FastAPI via AG-UI protocol

**Next.js side** (`route.ts`):
- `LangGraphHttpAgent` points to `http://localhost:8000`
- `CopilotRuntime` + `ExperimentalEmptyAdapter` for the API route

**Frontend hook** (Phase 2):
```tsx
const { state } = useCoAgent({ name: "oracle_agent" });
```

## Configuration

All credentials and settings are in `agent/config.py`, loaded from `.env`:

| Variable | Default | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | placeholder | Claude API key |
| `REDIS_URL` | `redis://localhost:6379/0` | Redis connection URL |
| `MODEL_NAME` | `claude-sonnet-4-20250514` | Claude model to use |
| `AGENT_HOST` | `0.0.0.0` | Server bind host |
| `AGENT_PORT` | `8000` | Server bind port |
| `MAX_LLM_RETRIES` | `2` | Retry count for Claude calls |
| `LLM_TEMPERATURE` | `0.7` | Claude temperature |

## License

Hackathon project — MIT.
