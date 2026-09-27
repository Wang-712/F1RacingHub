"""数据分析与新闻路由"""
from __future__ import annotations

from fastapi import APIRouter

from app.services import f1

router = APIRouter(tags=["statistics"])


@router.get("/statistics")
async def statistics() -> dict:
    """历史冠军 / 历史胜场 / 本赛季车队积分 / 本赛季最快圈"""
    return await f1.get_statistics_response()


@router.get("/news")
async def news() -> dict:
    """F1 新闻（无免费开放 API，使用内置静态数据）"""
    return f1.get_news_response()
