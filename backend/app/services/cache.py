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
        self._refreshing: set[str] = set()

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

    # ------------------------------------------------------------------
    # Stale-While-Revalidate：有过期旧值时立即返回，后台静默刷新。
    # 用于赛季大包这类"宁可旧一秒也不要等一分钟"的数据。
    # ------------------------------------------------------------------
    async def get_or_fetch_swr(self, key: str, ttl: int, factory):
        """返回 (value, from_cache)；有过期旧值时秒回并在后台刷新。"""
        item = self._store.get(key)
        if item and time.monotonic() <= item[0]:
            return item[1], True
        if item:
            # 过期旧值存在：立即返回，后台刷新（去重，避免并发重复拉取）
            if key not in self._refreshing:
                self._refreshing.add(key)
                asyncio.create_task(self._background_refresh(key, ttl, factory))
            return item[1], True

        # 完全没有值（冷启动）：同步回填，与 get_or_fetch 相同的锁语义
        lock = await self._get_lock(key)
        async with lock:
            item = self._store.get(key)
            if item:
                return item[1], True
            value = await factory()
            self.set(key, value, ttl)
            return value, False

    async def _background_refresh(self, key: str, ttl: int, factory) -> None:
        try:
            value = await factory()
            self.set(key, value, ttl)  # 刷新失败时保留旧值继续服务
        except Exception as exc:
            import logging
            logging.getLogger(__name__).warning(
                "Background refresh for %s failed, serving stale: %s", key, exc
            )
        finally:
            self._refreshing.discard(key)


# 全局单例
cache = TTLCache()
