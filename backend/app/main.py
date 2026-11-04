"""
F1 Racing Hub - FastAPI 应用入口
-------------------------------------------------------------
启动方式（在 backend/ 目录下）：
    uvicorn app.main:app --reload --port 8000

架构：
    前端 React (:5173) --/api 代理--> 本服务 (:8000)
                                        │
                                        ├─ Jolpica F1 API（实时赛历/积分/赛果）
                                        └─ 本地 fallback 快照（上游故障时降级）
"""
from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.services import f1 as f1_service
from app.services.jolpica import jolpica
from app.routers import drivers, health, races, statistics, teams

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时预热连接池
    await jolpica.startup()
    # 立即播种准确的本地快照（0ms 可用），请求不必等任何上游聚合
    f1_service.seed_cache()
    # 后台拉取实时数据替换快照，完成后用户无感切换为实时源
    warmup = asyncio.create_task(f1_service.warmup_cache())
    yield
    warmup.cancel()
    # 关闭时释放
    await jolpica.shutdown()


app = FastAPI(
    title="F1 Racing Hub API",
    description="Real Formula 1 data aggregated from the Jolpica (Ergast) API with static enrichment.",
    version="2.0.0",
    lifespan=lifespan,
)

# 开发环境跨域（生产应由网关/同源部署处理）
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 路由统一挂在 /api 前缀下，方便 Vite 代理与网关转发
app.include_router(health.router, prefix="/api")
app.include_router(drivers.router, prefix="/api")
app.include_router(teams.router, prefix="/api")
app.include_router(races.router, prefix="/api")
app.include_router(statistics.router, prefix="/api")
