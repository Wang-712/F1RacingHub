"""
Jolpica F1 API 异步客户端
- 封装 Ergast 风格路径，自动处理 limit=100 的分页聚合
- 全局串行锁 + 请求间隔，遵守免费服务速率限制
- 单一 httpx.AsyncClient 复用连接
"""
from __future__ import annotations

import asyncio
import logging
from typing import Any, Dict, List, Optional

import httpx

from app.config import settings

logger = logging.getLogger("f1.jolpica")

# Ergast 单次硬上限为 100 条
PAGE_SIZE = 100


class JolpicaError(RuntimeError):
    """上游 API 不可用或返回异常时抛出，由 service 层决定降级策略。"""


class JolpicaClient:
    def __init__(self) -> None:
        self._client: Optional[httpx.AsyncClient] = None
        # 免费服务限速：所有请求串行发出
        self._throttle = asyncio.Lock()

    async def startup(self) -> None:
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=settings.F1_API_BASE,
                timeout=settings.HTTP_TIMEOUT,
                headers={"User-Agent": "F1RacingHub/1.0 (+demo backend)"},
            )

    async def shutdown(self) -> None:
        if self._client is not None:
            await self._client.aclose()
            self._client = None

    async def _get_page(self, path: str, offset: int, limit: int = PAGE_SIZE) -> Dict[str, Any]:
        """请求单个分页，带节流与基础错误处理。"""
        sep = "&" if "?" in path else "?"
        url = f"{path}{sep}limit={limit}&offset={offset}"
        async with self._throttle:
            assert self._client is not None
            response = await self._client.get(url)
            # 免费服务偶发 429，稍等后由上层决定是否重试
            if response.status_code == 429:
                raise JolpicaError("Upstream rate limited (429)")
            response.raise_for_status()
            await asyncio.sleep(settings.REQUEST_INTERVAL)
        return response.json()

    async def fetch(self, path: str, paginate: bool = True) -> Dict[str, Any]:
        """
        获取 Ergast 风格 JSON。
        paginate=True 时自动翻页并把所有行合并进第一页的容器中，
        返回的结构始终是标准的 {"MRData": {...}}，MRData 内含具体数据表。
        """
        if self._client is None:
            await self.startup()

        first = await self._get_page(path, 0)
        if not paginate:
            return first

        mr = first.get("MRData", {})
        total = int(mr.get("total", 0))
        if total <= PAGE_SIZE:
            return first

        # 找到承载列表的表节点（StandingsTable / RaceTable / DriverTable ...）
        table_key, table_node = _find_table_node(mr)
        if table_key is None:
            return first

        list_key, rows = next(iter(table_node.items()))
        merged_rows: List[Dict[str, Any]] = list(rows)
        offset = PAGE_SIZE
        while offset < total:
            page = await self._get_page(path, offset)
            pmr = page.get("MRData", {})
            _, pnode = _find_table_node(pmr)
            if pnode is None:
                break
            _, prows = next(iter(pnode.items()))
            merged_rows.extend(prows)
            offset += PAGE_SIZE

        # 用合并后的列表覆盖第一页结构
        root_table = first["MRData"][table_key]
        root_table[list_key] = merged_rows
        first["MRData"]["limit"] = str(total)
        return first

    # ---- 常用端点快捷方法 ----

    async def driver_standings(self, season: str = "current") -> Dict[str, Any]:
        return await self.fetch(f"/{season}/driverStandings.json")

    async def constructor_standings(self, season: str = "current") -> Dict[str, Any]:
        return await self.fetch(f"/{season}/constructorStandings.json")

    async def schedule(self, season: str = "current") -> Dict[str, Any]:
        return await self.fetch(f"/{season}.json")

    async def race_results(self, season: str = "current") -> Dict[str, Any]:
        return await self.fetch(f"/{season}/results.json")

    async def sprint_results(self, season: str = "current") -> Dict[str, Any]:
        return await self.fetch(f"/{season}/sprint.json")

    async def driver_career_results(self, driver_id: str) -> Dict[str, Any]:
        return await self.fetch(f"/drivers/{driver_id}/results.json")

    async def driver_champion_seasons(self, driver_id: str) -> Dict[str, Any]:
        # position=1 只返回其获得世界冠军的赛季
        return await self.fetch(
            f"/drivers/{driver_id}/driverStandings.json?position=1", paginate=False
        )

    async def driver_qualifying(self, driver_id: str) -> Dict[str, Any]:
        # 注意：Jolpica/Ergast 的 qualifying 端点不支持 position 过滤，
        # 需拉取该车手全部排位赛记录后由服务端统计 position=1 的杆位数
        return await self.fetch(f"/drivers/{driver_id}/qualifying.json")


def _find_table_node(mrdata: Dict[str, Any]):
    """在 MRData 中找到形如 XxxTable: { XxxLists/Races/...: [...] } 的容器。"""
    for key, value in mrdata.items():
        if key.endswith("Table") and isinstance(value, dict):
            for list_key, rows in value.items():
                if isinstance(rows, list):
                    return key, {list_key: rows}
    return None, None


# 全局单例
jolpica = JolpicaClient()
