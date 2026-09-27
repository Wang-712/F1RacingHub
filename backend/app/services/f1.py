"""
F1 业务服务层
-------------------------------------------------------------
职责：
1. 调用 JolpicaClient 拉取原始数据（积分榜 / 赛历 / 正赛结果 / 冲刺赛结果）
2. 聚合并转换为前端可直接渲染的视图模型（字段契约与旧版 JSON 保持一致）
3. 上游失败时自动降级到 backend/fallback 下的本地快照

前端不感知上游数据结构，所有适配逻辑集中在本层。
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from app.config import settings
from app.services import enrichment as enr
from app.services.cache import cache
from app.services.jolpica import JolpicaError, jolpica

logger = logging.getLogger("f1.service")


# ====================================================================
# 工具
# ====================================================================

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _envelope(data: Any, source: str, season: Optional[str] = None,
              cached: bool = False, extra: Optional[dict] = None) -> dict:
    """统一响应包络，前端可据此显示 LIVE / SAMPLE 数据来源标识。"""
    meta = {"source": source, "fetchedAt": _now_iso(), "cached": cached}
    if season:
        meta["season"] = str(season)
    if extra:
        meta.update(extra)
    return {"data": data, "meta": meta}


def _load_fallback(name: str) -> Any:
    path = settings.FALLBACK_DIR / f"{name}.json"
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _hyphen(id_: str) -> str:
    """Ergast 下划线 id -> 前端路由使用的连字符 id。"""
    return id_.replace("_", "-")


def _to_int(value: Any, default: int = 0) -> int:
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return default


# ====================================================================
# 赛季数据大包（一次拉取，整包缓存，供多个接口共享）
# ====================================================================

async def _build_season_bundle() -> dict:
    """并行拉取积分榜 / 车队榜 / 赛历 / 正赛结果 / 冲刺赛结果并完成聚合。"""
    import asyncio

    async def safe(coro, label: str):
        try:
            return await coro
        except Exception as exc:  # 单个端点失败不应拖垮整包
            logger.warning("Jolpica endpoint %s failed: %s", label, exc)
            return None

    driver_json, constructor_json, schedule_json, results_json, sprint_json = await asyncio.gather(
        safe(jolpica.driver_standings(), "driverStandings"),
        safe(jolpica.constructor_standings(), "constructorStandings"),
        safe(jolpica.schedule(), "schedule"),
        safe(jolpica.race_results(), "results"),
        safe(jolpica.sprint_results(), "sprint"),
    )

    if driver_json is None or schedule_json is None:
        raise JolpicaError("Required upstream endpoints unavailable")

    standings_list = driver_json["MRData"]["StandingsTable"]["StandingsLists"]
    current = standings_list[0]
    season = current["season"]
    last_round = _to_int(current["round"])

    schedule = schedule_json["MRData"]["RaceTable"]["Races"]
    total_races = len(schedule)

    # ---- 赛果索引：round -> race（含 Results） ----
    # Jolpica 的 results.json 按"车手记录"分页，同一轮次会出现在多个 race 对象中，
    # 每个 race.Results 只含部分车手，因此必须按 round 合并而非覆盖。
    result_map: Dict[int, dict] = {}
    if results_json:
        for race in results_json["MRData"]["RaceTable"]["Races"]:
            rnd = _to_int(race["round"])
            if rnd not in result_map:
                result_map[rnd] = race
            else:
                result_map[rnd]["Results"].extend(race.get("Results", []))

    # ---- 冲刺积分：round -> {driverId: points} ----
    # 同理，sprint.json 也按车手记录分页，需用 setdefault 累加，不能每轮重置。
    sprint_points: Dict[int, Dict[str, float]] = {}
    if sprint_json:
        for race in sprint_json["MRData"]["RaceTable"]["Races"]:
            rnd = _to_int(race["round"])
            sprint_points.setdefault(rnd, {})
            for row in race.get("SprintResults", []):
                did = row["Driver"]["driverId"]
                sprint_points[rnd][did] = sprint_points[rnd].get(did, 0.0) + float(row["points"])

    # ---- 每位车手的逐轮积分 & 最快圈计数 ----
    # 只遍历已完赛轮次（1..last_round），未比赛轮次不进入走势数组。
    progression: Dict[str, List[float]] = {}
    team_progression: Dict[str, List[float]] = {}
    fastest_laps: Dict[str, int] = {}
    for rnd in range(1, last_round + 1):
        race = result_map.get(rnd)
        if not race:
            continue
        sprint_map = sprint_points.get(rnd, {})
        for row in race.get("Results", []):
            did = row["Driver"]["driverId"]
            cid = row["Constructor"]["constructorId"]
            pts = float(row["points"]) + sprint_map.get(did, 0.0)
            progression.setdefault(did, [0.0] * last_round)
            progression[did][rnd - 1] = pts
            # 车队积分：同轮同队所有车手积分之和
            team_progression.setdefault(cid, [0.0] * last_round)
            team_progression[cid][rnd - 1] += pts
            fl = row.get("FastestLap") or {}
            if fl.get("rank") == "1":
                name = f"{row['Driver']['givenName']} {row['Driver']['familyName']}"
                fastest_laps[name] = fastest_laps.get(name, 0) + 1

    # 累加为累计积分（车手 & 车队）
    cumulative: Dict[str, List[int]] = {}
    for did, rounds in progression.items():
        total = 0.0
        cumulative[did] = []
        for pts in rounds:
            total += pts
            cumulative[did].append(round(total))

    team_cumulative: Dict[str, List[int]] = {}
    for cid, rounds in team_progression.items():
        total = 0.0
        team_cumulative[cid] = []
        for pts in rounds:
            total += pts
            team_cumulative[cid].append(round(total))

    return {
        "season": season,
        "lastRound": last_round,
        "schedule": schedule,
        "driverStandings": current["DriverStandings"],
        "constructorStandings": (
            constructor_json["MRData"]["StandingsTable"]["StandingsLists"][0]["ConstructorStandings"]
            if constructor_json else []
        ),
        "resultMap": result_map,
        "progression": cumulative,
        "teamProgression": team_cumulative,
        "fastestLaps": fastest_laps,
    }


async def _get_bundle() -> Tuple[dict, str, bool]:
    """返回 (bundle, source, cached)；上游失败时降级快照包。"""
    try:
        bundle, from_cache = await cache.get_or_fetch(
            "season_bundle", settings.CACHE_SEASON_TTL, _build_season_bundle
        )
        return bundle, "jolpica", from_cache
    except Exception as exc:
        logger.error("Season bundle failed, using fallback snapshot: %s", exc)
        return _build_fallback_bundle(), "fallback", False


def _build_fallback_bundle() -> dict:
    """把旧版本地 JSON 重新组织成与实时包同构的结构。"""
    drivers = _load_fallback("drivers")
    teams = _load_fallback("teams")
    races = _load_fallback("races")
    completed = [r for r in races if r["status"] == "completed"]

    standings = []
    for d in drivers:
        cid = d.get("teamId", "")
        standings.append({
            "position": str(len(standings) + 1),
            "points": str(d["points"]),
            "wins": str(d["seasonWins"]),
            "Driver": {
                "driverId": d["id"].replace("-", "_"),
                "permanentNumber": str(d["number"]),
                "givenName": d["name"].split(" ")[0],
                "familyName": " ".join(d["name"].split(" ")[1:]),
                "dateOfBirth": d["birthDate"],
                "nationality": d["country"],
            },
            "Constructors": [{"constructorId": cid, "name": d["team"]}],
            "_fallbackDriver": d,
        })

    cstandings = []
    for t in sorted(teams, key=lambda x: x["seasonPosition"]):
        cstandings.append({
            "position": str(t["seasonPosition"]),
            "points": str(t["seasonPoints"]),
            "wins": "0",
            "Constructor": {"constructorId": t["id"].replace("-", "_"), "name": t["name"]},
            "_fallbackTeam": t,
        })

    schedule = [{
        "round": str(r["round"]),
        "raceName": r["name"],
        "date": r["date"],
        "Circuit": {
            "circuitId": "",
            "circuitName": r["circuit"],
            "Location": {"country": r["country"]},
        },
        "_fallbackRace": r,
    } for r in races]

    result_map = {}
    for r in completed:
        result_map[r["round"]] = {"_fallbackRace": r}

    return {
        "season": "2026",
        "lastRound": len(completed),
        "schedule": schedule,
        "driverStandings": standings,
        "constructorStandings": cstandings,
        "resultMap": result_map,
        "progression": {d["id"].replace("-", "_"): d["progression"] for d in drivers},
        "fastestLaps": {},
        "_fallback": True,
        "_fallbackDrivers": drivers,
        "_fallbackTeams": teams,
    }


# ====================================================================
# 视图模型转换
# ====================================================================

def _driver_view_model(row: dict, bundle: dict) -> dict:
    driver = row["Driver"]
    did = driver["driverId"]
    constructor = (row.get("Constructors") or [{}])[0]
    cid = constructor.get("constructorId", "")
    team_meta = enr.get_constructor(cid)
    extra = enr.get_driver_enrichment(did)
    fallback = row.get("_fallbackDriver")

    if fallback:  # 降级快照直接使用旧模型
        return fallback

    nationality = driver.get("nationality", "")
    points = _to_int(row.get("points"))
    wins = _to_int(row.get("wins"))

    return {
        "id": _hyphen(did),
        "name": f"{driver.get('givenName', '')} {driver.get('familyName', '')}".strip(),
        "number": _to_int(driver.get("permanentNumber")),
        "country": nationality,
        "flag": enr.nationality_to_flag(nationality),
        "teamId": _hyphen(cid),
        "team": team_meta["name"] if team_meta else constructor.get("name", ""),
        "teamColor": team_meta["color"],
        "birthDate": driver.get("dateOfBirth", ""),
        "birthPlace": extra["birthPlace"],
        "championships": extra["championships"] or 0,
        "points": points,
        "seasonWins": wins,
        "careerWins": extra["careerWins"] if extra["careerWins"] is not None else wins,
        "podiums": extra["podiums"] if extra["podiums"] is not None else 0,
        "poles": extra["poles"] if extra["poles"] is not None else 0,
        "fastestLaps": 0,  # 由 bundle 统一填充
        "bio": extra["bio"],
        "progression": bundle["progression"].get(did, []),
        "radar": extra["radar"],
        "seasonPosition": _to_int(row.get("position")),
    }


def _build_drivers(bundle: dict) -> List[dict]:
    models = [_driver_view_model(row, bundle) for row in bundle["driverStandings"]]
    # 填充真实最快圈计数
    fl_name_map = bundle.get("fastestLaps", {})
    for m in models:
        m["fastestLaps"] = fl_name_map.get(m["name"], 0)
    return models


def _build_teams(bundle: dict) -> List[dict]:
    if bundle.get("_fallback"):
        return sorted(bundle["_fallbackTeams"], key=lambda x: x["seasonPosition"])

    # 从车手积分榜反推每队当前车手阵容
    lineups: Dict[str, List[str]] = {}
    for row in bundle["driverStandings"]:
        cid = (row.get("Constructors") or [{}])[0].get("constructorId", "")
        name = f"{row['Driver']['givenName']} {row['Driver']['familyName']}"
        lineups.setdefault(cid, []).append(name)

    teams = []
    team_prog = bundle.get("teamProgression", {})
    for row in bundle["constructorStandings"]:
        c = row["Constructor"]
        cid = c["constructorId"]
        meta = enr.get_constructor(cid)
        nationality = c.get("nationality", "")
        teams.append({
            "id": _hyphen(cid),
            "name": meta["name"],
            "shortName": meta["shortName"],
            "color": meta["color"],
            "country": meta["country"] or nationality,
            "flag": enr.country_to_flag(meta["country"]) or enr.nationality_to_flag(nationality),
            "founded": meta["founded"],
            "championships": meta["championships"],
            "principal": meta["principal"],
            "headquarters": meta["hq"],
            "seasonPoints": _to_int(row["points"]),
            "seasonPosition": _to_int(row["position"]),
            "seasonWins": _to_int(row["wins"]),
            "drivers": lineups.get(cid, []),
            "progression": team_prog.get(cid, []),
            "bio": meta["bio"],
        })
    return teams


def _build_races(bundle: dict) -> List[dict]:
    last_round = bundle["lastRound"]
    races = []
    for item in bundle["schedule"]:
        fb = item.get("_fallbackRace")
        if fb:
            races.append(fb)
            continue

        rnd = _to_int(item["round"])
        circuit = item["Circuit"]
        country = circuit.get("Location", {}).get("country", "")
        result = bundle["resultMap"].get(rnd)
        completed = rnd <= last_round and result is not None

        winner = ""
        winner_team = ""
        fastest_driver = ""
        laps = enr.CIRCUIT_LAPS.get(circuit.get("circuitId", ""))
        if result:
            rows = result.get("Results") or []
            if rows:
                top = rows[0]
                winner = f"{top['Driver']['givenName']} {top['Driver']['familyName']}"
                winner_team = enr.get_constructor(
                    top["Constructor"]["constructorId"]
                )["name"]
                laps = laps or _to_int(top.get("laps"))
            for row in rows:
                if (row.get("FastestLap") or {}).get("rank") == "1":
                    fastest_driver = f"{row['Driver']['givenName']} {row['Driver']['familyName']}"
                    break

        race_name = item.get("raceName", "")
        races.append({
            "id": rnd,
            "name": race_name,
            "shortName": race_name.replace(" Grand Prix", " GP"),
            "country": country,
            "flag": enr.country_to_flag(country),
            "circuit": circuit.get("circuitName", ""),
            "date": item.get("date", ""),
            "laps": laps,
            "round": rnd,
            "status": "completed" if completed else "upcoming",
            "winner": winner,
            "winningTeam": winner_team,
            "fastestLap": fastest_driver,
        })
    return races


def _build_season_summary(bundle: dict, drivers: List[dict], races: List[dict]) -> dict:
    completed = [r for r in races if r["status"] == "completed"]
    upcoming = [r for r in races if r["status"] == "upcoming"]
    leader = drivers[0] if drivers else None
    next_race = upcoming[0] if upcoming else None
    return {
        "season": bundle["season"],
        "totalRaces": len(races),
        "completedRaces": len(completed),
        "lastRound": bundle["lastRound"],
        "nextRace": {
            "name": next_race["name"],
            "shortName": next_race["shortName"],
            "flag": next_race["flag"],
            "circuit": next_race["circuit"],
            "date": next_race["date"],
            "round": next_race["round"],
        } if next_race else None,
        "leader": {
            "id": leader["id"], "name": leader["name"],
            "flag": leader["flag"], "points": leader["points"],
            "team": leader["team"],
        } if leader else None,
    }


# ====================================================================
# 对外接口
# ====================================================================

async def get_drivers_response() -> dict:
    bundle, source, cached = await _get_bundle()
    drivers = _build_drivers(bundle)
    return _envelope(drivers, source, bundle["season"], cached)


async def get_teams_response() -> dict:
    bundle, source, cached = await _get_bundle()
    return _envelope(_build_teams(bundle), source, bundle["season"], cached)


async def get_races_response() -> dict:
    bundle, source, cached = await _get_bundle()
    return _envelope(_build_races(bundle), source, bundle["season"], cached)


async def get_season_response() -> dict:
    bundle, source, cached = await _get_bundle()
    drivers = _build_drivers(bundle)
    races = _build_races(bundle)
    summary = _build_season_summary(bundle, drivers, races)
    return _envelope(summary, source, bundle["season"], cached)


def get_news_response() -> dict:
    # F1 新闻没有免费开放 API，使用内置静态新闻并明确标记
    return _envelope(_load_fallback("news"), "static")


async def get_driver_detail_response(driver_id: str) -> Optional[dict]:
    bundle, source, cached = await _get_bundle()
    did = driver_id.replace("-", "_")
    row = next((r for r in bundle["driverStandings"]
                if r["Driver"]["driverId"] == did), None)
    if row is None:
        return None  # 路由层负责抛 404

    model = _driver_view_model(row, bundle)
    model["fastestLaps"] = bundle.get("fastestLaps", {}).get(model["name"], 0)

    # ---- 实时职业履历（详情页才请求，24h 缓存；失败逐项降级） ----
    live: Dict[str, Any] = {}
    if not bundle.get("_fallback"):
        try:
            titles_json, _ = await cache.get_or_fetch(
                f"career_titles_{did}", settings.CACHE_CAREER_TTL,
                lambda: jolpica.driver_champion_seasons(did),
            )
            live["championships"] = len(
                titles_json["MRData"]["StandingsTable"]["StandingsLists"]
            )
        except Exception as exc:
            logger.info("career titles fallback for %s: %s", did, exc)

        try:
            results_json, _ = await cache.get_or_fetch(
                f"career_results_{did}", settings.CACHE_CAREER_TTL,
                lambda: jolpica.driver_career_results(did),
            )
            wins = podiums = 0
            for race in results_json["MRData"]["RaceTable"]["Races"]:
                for r in race.get("Results", []):
                    pos = _to_int(r.get("position"), 99)
                    if pos == 1:
                        wins += 1
                    if pos <= 3:
                        podiums += 1
            live["careerWins"] = wins
            live["podiums"] = podiums
        except Exception as exc:
            logger.info("career results fallback for %s: %s", did, exc)

        try:
            qualifying_json, _ = await cache.get_or_fetch(
                f"career_poles_{did}", settings.CACHE_CAREER_TTL,
                lambda: jolpica.driver_qualifying(did),
            )
            poles = 0
            for race in qualifying_json["MRData"]["RaceTable"]["Races"]:
                for q in race.get("QualifyingResults", []):
                    if q.get("position") == "1":
                        poles += 1
            live["poles"] = poles
        except Exception as exc:
            logger.info("career poles fallback for %s: %s", did, exc)

    model.update({k: v for k, v in live.items() if v is not None})
    return _envelope(model, source, bundle["season"], cached)


async def get_statistics_response() -> dict:
    bundle, source, cached = await _get_bundle()

    # 本赛季最快圈：真实聚合
    fastest = [
        {"name": name.split(" ")[-1] if " " in name else name, "fullName": name, "value": count}
        for name, count in sorted(bundle.get("fastestLaps", {}).items(),
                                  key=lambda kv: kv[1], reverse=True)
    ]

    # 车队积分：真实积分榜
    teams = [
        {"name": t["shortName"], "value": t["seasonPoints"], "color": t["color"]}
        for t in _build_teams(bundle)
    ]

    # 历史冠军 / 历史胜场：变化极慢的静态纪录
    data = {
        "champions": enr.HISTORICAL_CHAMPIONS,
        "careerWins": enr.HISTORICAL_WINS,
        "fastestLaps": fastest,
        "teams": teams,
    }
    return _envelope(data, source if fastest or teams else "fallback",
                     bundle["season"], cached)
