"""车队相关路由"""
from __future__ import annotations

from fastapi import APIRouter

from app.services import f1

router = APIRouter(prefix="/teams", tags=["teams"])


@router.get("")
async def list_teams() -> dict:
    """当前赛季车队积分榜（含品牌信息与当前车手阵容）"""
    return await f1.get_teams_response()
