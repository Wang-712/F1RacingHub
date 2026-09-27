"""
极简异步安全 TTL 内存缓存
- 避免每次请求都打上游免费 API
- 使用 asyncio.Lock 防止缓存失效瞬间的缓存击穿
"""
from __future__ import annotations

import asyncio
import time
from typing import Any, Optional


class TTLCache:
    def __init__(self) -> None:
        self._store: dict[str, tuple[float, Any]] = {}
        self._locks: dict[str, asyncio.Lock] = {}
        self._global_lock = asyncio.Lock()

    async def _get_lock(self, key: str) -> asyncio.Lock:
        async with self._global_lock:
            if key not in self._locks:
                self._locks[key] = asyncio.Lock()
            return self._locks[key]

    def get(self, key: str) -> Optional[Any]:
        item = self._store.get(key)
        if not item:
            return None
        expires_at, value = item
        if time.monotonic() > expires_at:
            self._store.pop(key, None)
            return None
        return value

    def set(self, key: str, value: Any, ttl: int) -> None:
        self._store[key] = (time.monotonic() + ttl, value)

    async def get_or_fetch(self, key: str, ttl: int, factory):
        """命中缓存直接返回；否则只允许一个协程执行 factory 回填缓存。"""
        cached = self.get(key)
        if cached is not None:
            return cached, True  # value, from_cache

        lock = await self._get_lock(key)
        async with lock:
            # 双重检查：可能已被其他协程回填
            cached = self.get(key)
            if cached is not None:
                return cached, True
            value = await factory()
            self.set(key, value, ttl)
            return value, False


# 全局单例
cache = TTLCache()
