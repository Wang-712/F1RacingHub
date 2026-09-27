"""
后端全局配置
- 通过环境变量即可覆盖上游地址、缓存时间等，无需改代码
"""
from __future__ import annotations

import os
from pathlib import Path


class Settings:
    # 上游真实 F1 数据源：Jolpica（已关停的 Ergast API 的社区延续）
    F1_API_BASE: str = os.getenv("F1_API_BASE", "https://api.jolpi.ca/ergast/f1")
    HTTP_TIMEOUT: float = float(os.getenv("F1_HTTP_TIMEOUT", "20"))
    # 免费服务有速率限制，分页请求之间的礼貌间隔（秒）
    REQUEST_INTERVAL: float = float(os.getenv("F1_REQUEST_INTERVAL", "0.6"))

    # 各类数据的内存缓存有效期（秒）
    CACHE_STANDINGS_TTL: int = int(os.getenv("CACHE_STANDINGS_TTL", "600"))       # 积分榜 10 分钟
    CACHE_SEASON_TTL: int = int(os.getenv("CACHE_SEASON_TTL", "1800"))             # 赛历/赛果 30 分钟
    CACHE_CAREER_TTL: int = int(os.getenv("CACHE_CAREER_TTL", "86400"))            # 职业历史数据 24 小时
    CACHE_STATIC_TTL: int = int(os.getenv("CACHE_STATIC_TTL", "3600"))             # 静态历史 1 小时

    # 降级快照目录（上游不可用时使用）
    FALLBACK_DIR: Path = Path(__file__).resolve().parent.parent / "fallback"

    # 允许的跨域来源（开发环境）
    CORS_ORIGINS = [
        "http://localhost:5173",   # Vite dev server
        "http://127.0.0.1:5173",
    ]


settings = Settings()
