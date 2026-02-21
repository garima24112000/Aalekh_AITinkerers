"""
Redis persistence layer with automatic in-memory fallback.
Stores sessions and map snapshots for timeline scrubbing.
"""

from __future__ import annotations

import json
import logging
from typing import Optional

import redis.asyncio as aioredis

from config import REDIS_URL
from agent.state import MapState, OracleState

logger = logging.getLogger(__name__)

# ── Connection ──────────────────────────────────────────────────────

_pool: Optional[aioredis.ConnectionPool] = None
_fallback: dict[str, str] = {}  # in-memory fallback if Redis is down


async def _get_redis() -> aioredis.Redis:
    global _pool
    if _pool is None:
        _pool = aioredis.ConnectionPool.from_url(REDIS_URL, decode_responses=True)
    return aioredis.Redis(connection_pool=_pool)


# ── Session CRUD ────────────────────────────────────────────────────


async def save_session(session_id: str, state: OracleState) -> None:
    key = f"session:{session_id}"
    data = state.model_dump_json()
    try:
        r = await _get_redis()
        await r.set(key, data)
    except (aioredis.ConnectionError, aioredis.TimeoutError, OSError):
        logger.warning("Redis unavailable — using in-memory fallback for save_session")
        _fallback[key] = data


async def load_session(session_id: str) -> Optional[OracleState]:
    key = f"session:{session_id}"
    try:
        r = await _get_redis()
        data = await r.get(key)
    except (aioredis.ConnectionError, aioredis.TimeoutError, OSError):
        logger.warning("Redis unavailable — using in-memory fallback for load_session")
        data = _fallback.get(key)

    if data is None:
        return None
    return OracleState.model_validate_json(data)


async def delete_session(session_id: str) -> None:
    try:
        r = await _get_redis()
        keys = []
        async for k in r.scan_iter(f"session:{session_id}"):
            keys.append(k)
        async for k in r.scan_iter(f"snapshot:{session_id}:*"):
            keys.append(k)
        if keys:
            await r.delete(*keys)
    except (aioredis.ConnectionError, aioredis.TimeoutError, OSError):
        logger.warning("Redis unavailable — skipping delete_session")
        # Also clean fallback
        to_del = [k for k in _fallback if session_id in k]
        for k in to_del:
            del _fallback[k]


# ── Snapshot CRUD (for timeline scrubber) ───────────────────────────


async def save_snapshot(session_id: str, index: int, map_state: MapState) -> None:
    key = f"snapshot:{session_id}:{index}"
    data = map_state.model_dump_json()
    try:
        r = await _get_redis()
        await r.set(key, data)
    except (aioredis.ConnectionError, aioredis.TimeoutError, OSError):
        logger.warning("Redis unavailable — using in-memory fallback for save_snapshot")
        _fallback[key] = data


async def load_snapshot(session_id: str, index: int) -> Optional[MapState]:
    key = f"snapshot:{session_id}:{index}"
    try:
        r = await _get_redis()
        data = await r.get(key)
    except (aioredis.ConnectionError, aioredis.TimeoutError, OSError):
        logger.warning("Redis unavailable — using in-memory fallback for load_snapshot")
        data = _fallback.get(key)

    if data is None:
        return None
    return MapState.model_validate_json(data)
