"""In-process pub/sub for SSE fan-out (slice 7).

Single-process design only — multi-worker uvicorn or horizontal scaling will
need Redis pub/sub on top of this interface.

Subscribers register a center_id (or None for super-admin/global). Publishers
push events tagged with center_id; the bus routes events to matching queues.

Usage:
    async with subscribe(center_id=1) as queue:
        async for event in queue:
            ...

    publish("reward.created", center_id=1, payload={"id": 7})
"""

from __future__ import annotations

import asyncio
import json
import logging
from contextlib import asynccontextmanager
from dataclasses import dataclass
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class Event:
    type: str
    payload: Any
    center_id: int | None

    def to_sse(self) -> bytes:
        """Render as a single SSE message frame."""
        body = json.dumps({"type": self.type, "data": self.payload}, default=str)
        return f"event: {self.type}\ndata: {body}\n\n".encode("utf-8")


class _EventBus:
    """One queue per active subscriber; no buffering for offline ones."""

    def __init__(self) -> None:
        # center_id -> set of queues (None bucket holds super-admin / global subs)
        self._subs: dict[int | None, set[asyncio.Queue]] = {}
        self._lock = asyncio.Lock()

    async def _add(self, center_id: int | None, q: asyncio.Queue) -> None:
        async with self._lock:
            self._subs.setdefault(center_id, set()).add(q)

    async def _remove(self, center_id: int | None, q: asyncio.Queue) -> None:
        async with self._lock:
            bucket = self._subs.get(center_id)
            if bucket and q in bucket:
                bucket.discard(q)
                if not bucket:
                    self._subs.pop(center_id, None)

    def publish_nowait(
        self, type_: str, *, center_id: int | None, payload: Any = None
    ) -> None:
        """Publish from sync code (e.g. SQLAlchemy commits in route handlers).

        Drops events for slow subscribers (queue full) rather than blocking.
        """
        event = Event(type=type_, payload=payload, center_id=center_id)
        # Snapshot subscriber sets without awaiting the lock — publish from
        # sync route handlers must not be async. Iteration races are tolerated:
        # late subscribers miss in-flight events; that's acceptable for a UI
        # cache-invalidation signal (the next list-fetch repopulates state).
        targets: list[asyncio.Queue] = []
        for cid in (center_id, None):  # also fan to global (None) subs
            for q in list(self._subs.get(cid, ())):
                targets.append(q)
        for q in targets:
            try:
                q.put_nowait(event)
            except asyncio.QueueFull:
                logger.warning("SSE queue full; dropping %s for sub", type_)

    @asynccontextmanager
    async def subscribe(self, center_id: int | None):
        q: asyncio.Queue[Event] = asyncio.Queue(maxsize=128)
        await self._add(center_id, q)
        try:
            yield q
        finally:
            await self._remove(center_id, q)


# Module-level singleton
bus = _EventBus()
