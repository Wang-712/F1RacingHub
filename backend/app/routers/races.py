"""比赛相关路由"""
from __future__ import annotations

from fastapi import APIRouter

from app.services import f1

router = APIRouter(prefix="/races", tags=["races"])


@router.get("")
async def list_races() -> dict:
    """赛季赛历：赛道、日期、圈数、状态、冠军与最快圈"""
    return await f1.get_races_response()
