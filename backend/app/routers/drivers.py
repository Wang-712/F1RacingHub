"""车手相关路由"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.services import f1

router = APIRouter(prefix="/drivers", tags=["drivers"])


@router.get("")
async def list_drivers() -> dict:
    """当前赛季车手积分榜（含增强信息与逐轮积分走势）"""
    return await f1.get_drivers_response()


@router.get("/{driver_id}")
async def driver_detail(driver_id: str) -> dict:
    """车手详情：档案、赛季数据、职业履历、能力雷达"""
    result = await f1.get_driver_detail_response(driver_id)
    if result is None:
        # 约定：资源不存在必须返回 404，不能返回 None 破坏响应契约
        raise HTTPException(status_code=404, detail=f"Driver '{driver_id}' not found")
    return result
