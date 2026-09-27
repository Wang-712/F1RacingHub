"""健康检查与赛季概览路由"""
from __future__ import annotations

from fastapi import APIRouter

from app.services import f1

router = APIRouter()


@router.get("/health")
async def health() -> dict:
    """容器/代理探活接口"""
    return {"status": "ok", "service": "f1-racing-hub-api"}


@router.get("/season")
async def season_summary() -> dict:
    """首页赛季概览：已完成场次、下一场、积分领先者"""
    return await f1.get_season_response()
