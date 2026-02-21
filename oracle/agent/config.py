"""
Central configuration for ORACLE backend.
All credentials, API keys, and service URLs live here.
Replace placeholder values with real ones before running.
"""

import os
from dotenv import load_dotenv

load_dotenv()

# ── Anthropic / Claude ──────────────────────────────────────────────
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "sk-ant-PLACEHOLDER")
MODEL_NAME = os.getenv("MODEL_NAME", "claude-sonnet-4-20250514")
MODEL_MAX_TOKENS = int(os.getenv("MODEL_MAX_TOKENS", "4096"))
MODEL_TEMPERATURE = float(os.getenv("MODEL_TEMPERATURE", "0"))

# ── Redis ────────────────────────────────────────────────────────────
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

# ── Server ───────────────────────────────────────────────────────────
AGENT_HOST = os.getenv("AGENT_HOST", "0.0.0.0")
AGENT_PORT = int(os.getenv("AGENT_PORT", "8000"))

# ── CopilotKit / LangSmith (optional) ───────────────────────────────
LANGSMITH_API_KEY = os.getenv("LANGSMITH_API_KEY", "")
COPILOTKIT_LOG_LEVEL = os.getenv("COPILOTKIT_LOG_LEVEL", "INFO")

# ── Timeouts (seconds) ──────────────────────────────────────────────
INTERROGATOR_TIMEOUT = int(os.getenv("INTERROGATOR_TIMEOUT", "8"))
MAP_GENERATOR_TIMEOUT = int(os.getenv("MAP_GENERATOR_TIMEOUT", "15"))
EXPANDER_TIMEOUT = int(os.getenv("EXPANDER_TIMEOUT", "8"))
FORK_REGENERATOR_TIMEOUT = int(os.getenv("FORK_REGENERATOR_TIMEOUT", "15"))

# ── Retry config ─────────────────────────────────────────────────────
MAX_LLM_RETRIES = int(os.getenv("MAX_LLM_RETRIES", "1"))
