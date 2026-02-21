"""
Shared Claude call wrapper used by all agent nodes.
Handles JSON parsing, validation, and retry with error feedback.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Callable

from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage, SystemMessage

from config import ANTHROPIC_API_KEY, MAX_LLM_RETRIES, MODEL_MAX_TOKENS, MODEL_NAME, MODEL_TEMPERATURE

logger = logging.getLogger(__name__)

# Singleton LLM instance
_llm: ChatAnthropic | None = None


def get_llm() -> ChatAnthropic:
    global _llm
    if _llm is None:
        _llm = ChatAnthropic(
            model=MODEL_NAME,
            anthropic_api_key=ANTHROPIC_API_KEY,
            max_tokens=MODEL_MAX_TOKENS,
            temperature=MODEL_TEMPERATURE,
        )
    return _llm


def _extract_json(text: str) -> str:
    """Strip markdown code fences if present."""
    # Match ```json ... ``` or ``` ... ```
    match = re.search(r"```(?:json)?\s*\n?(.*?)```", text, re.DOTALL)
    if match:
        return match.group(1).strip()
    return text.strip()


def call_claude_json(
    system_prompt: str,
    user_message: str,
    validator_fn: Callable[[dict], tuple[bool, list[str]]],
    max_retries: int = MAX_LLM_RETRIES,
) -> dict:
    """
    Call Claude, parse JSON, validate, retry on failure.
    Returns the parsed dict on success.
    Raises ValueError on exhausted retries.
    """
    llm = get_llm()
    current_user_msg = user_message

    last_data: dict = {}
    for attempt in range(max_retries + 1):
        try:
            response = llm.invoke(
                [
                    SystemMessage(content=system_prompt),
                    HumanMessage(content=current_user_msg),
                ]
            )
            raw = response.content if isinstance(response.content, str) else str(response.content)
            text = _extract_json(raw)
            data = json.loads(text)
            last_data = data

            is_valid, errors = validator_fn(data)
            if is_valid:
                return data

            # Retry with error context
            logger.warning(
                "Claude response validation failed (attempt %d): %s",
                attempt + 1,
                errors,
            )
            current_user_msg = (
                user_message
                + "\n\n⚠️ Your previous response had these errors:\n"
                + "\n".join(f"- {e}" for e in errors)
                + "\n\nPlease fix ALL errors and regenerate valid JSON only."
            )

        except json.JSONDecodeError as e:
            logger.warning(
                "Claude returned invalid JSON (attempt %d): %s", attempt + 1, e
            )
            current_user_msg = (
                user_message
                + f"\n\n⚠️ Your previous response was not valid JSON: {e}. "
                + "Return ONLY valid JSON with no markdown or explanation."
            )
        except Exception as e:
            logger.error("Unexpected error calling Claude: %s", e)
            if attempt >= max_retries:
                raise
            current_user_msg = user_message + f"\n\n⚠️ Error: {e}. Please try again."

    # Return last attempt even if slightly invalid (caller handles fallback)
    return last_data
