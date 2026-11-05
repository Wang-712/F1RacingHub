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

import asyncio
import json
import logging
import os
import time
from datetime import date, datetime, timezone
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


def _persist_results_to_fallback(
    result_map: Dict[int, dict],
    schedule: list,
    sprint_json: Optional[dict],
) -> None:
    """上游拉到赛果后自动写回 races.json —— 快照自动演化，
    新比赛完赛后下次冷启动/后台刷新直接命中。"""
    import json as _json
    from datetime import date as _date

    races_path = os.path.join(os.path.dirname(__file__), "..", "..", "fallback", "races.json")
    try:
        existing = _load_fallback("races")
    except Exception:
        existing = []

    # sprint_json 是原始 Ergast 响应，按 round 索引 SprintResults
    sprint_by_round: Dict[int, dict] = {}
    if sprint_json:
        for race in sprint_json.get("MRData", {}).get("RaceTable", {}).get("Races", []):
            rnd = _to_int(race["round"])
            sr = race.get("SprintResults", [])
            p1 = next((r for r in sr if r.get("position") == "1"), None)
            if p1:
                d = p1["Driver"]
                sprint_by_round[rnd] = {
                    "id": d["driverId"],
                    "name": f"{d['givenName']} {d['familyName']}",
                    "points": float(p1.get("points", 0)),
                }

    sched_by_round = {_to_int(r["round"]): r for r in schedule}
    races_by_round = {int(r["round"]): r for r in existing}

    rebuilt = []
    for rnd in sorted(set(list(sched_by_round.keys()) + list(races_by_round.keys()))):
        sched = sched_by_round.get(rnd) or races_by_round.get(rnd, {})
        entry = dict(races_by_round.get(rnd, {}))
        entry.setdefault("round", str(rnd))
        entry.setdefault("name", sched.get("raceName", f"Round {rnd} Grand Prix"))
        entry.setdefault("date", sched.get("date", entry.get("date", "")))
        entry.setdefault("laps", entry.get("laps", 57))
        entry.setdefault("circuit", sched.get("Circuit", {}).get("circuitName", entry.get("circuit", "")))

        race = result_map.get(rnd)
        if race and race.get("Results"):
            results = race["Results"]
            p1 = next((r for r in results if r.get("position") == "1"), None)
            if p1:
                d = p1["Driver"]
                t = p1["Constructor"]
                entry["winner"] = {
                    "id": d["driverId"],
                    "name": f"{d['givenName']} {d['familyName']}",
                    "number": int(d.get("permanentNumber", 0) or 0),
                    "team": t["constructorId"],
                    "teamName": t["name"],
                }
                entry["winningTeam"] = t["name"]
            fl_p1 = next(
                (r for r in results
                 if r.get("FastestLap") and r["FastestLap"].get("rank") == "1"),
                None,
            )
            if fl_p1:
                fd = fl_p1["Driver"]
                entry["fastestLap"] = {
                    "id": fd["driverId"],
                    "name": f"{fd['givenName']} {fd['familyName']}",
                    "time": fl_p1["FastestLap"].get("Time", {}).get("time"),
                }
            entry["status"] = "completed"
        else:
            # 快照里已有赛果的轮次保持 completed，不要因为日期判断被改回 upcoming
            if not (entry.get("status") == "completed" and entry.get("winner")):
                if entry.get("date"):
                    try:
                        entry["status"] = "completed" if _date.fromisoformat(entry["date"]) < _date.today() else "upcoming"
                    except ValueError:
                        entry["status"] = "upcoming"
                else:
                    entry["status"] = "upcoming"

        if rnd in sprint_by_round:
            entry["sprintWinner"] = sprint_by_round[rnd]
        rebuilt.append(entry)

    try:
        tmp = races_path + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            _json.dump(rebuilt, f, ensure_ascii=False, indent=2)
        os.replace(tmp, races_path)  # 原子替换，避免写一半被读到
        logger.info("Persisted %d race results to fallback races.json",
                    sum(1 for r in rebuilt if r.get("winner")))
    except Exception as exc:
        logger.warning("Failed to persist race results: %s", exc)


def _persist_standings_to_fallback(
    driver_standings: List[dict],
    constructor_standings: List[dict],
    cumulative: Dict[str, List[int]],
    team_cumulative: Dict[str, List[int]],
) -> None:
    """把实时积分榜 + 逐轮走势写回 drivers.json / teams.json。

    这样冷启动直接展示最新积分与走势图，不用等上游 standings 端点。
    """
    import json as _json

    def _write(path: str, payload: Any) -> None:
        tmp = path + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            _json.dump(payload, f, ensure_ascii=False, indent=2)
        os.replace(tmp, path)  # 原子替换，避免写一半被读到

    try:
        drivers_path = os.path.join(
            os.path.dirname(__file__), "..", "..", "fallback", "drivers.json"
        )
        with open(drivers_path, "r", encoding="utf-8") as f:
            drivers = _json.load(f)

        updated = 0
        for d in drivers:
            did = d["id"].replace("-", "_")
            row = next((r for r in driver_standings if r["Driver"]["driverId"] == did), None)
            if row:
                if row.get("points") is not None:
                    d["points"] = _to_int(row.get("points"))
                if row.get("wins") is not None:
                    d["seasonWins"] = _to_int(row.get("wins"))
                if row.get("position") is not None:
                    d["seasonPosition"] = _to_int(row.get("position"))
                updated += 1
            arr = cumulative.get(did)
            if arr:
                d["progression"] = list(arr)
        _write(drivers_path, drivers)

        teams_path = os.path.join(
            os.path.dirname(__file__), "..", "..", "fallback", "teams.json"
        )
        with open(teams_path, "r", encoding="utf-8") as f:
            teams = _json.load(f)
        updated_t = 0
        for t in teams:
            cid = t["id"].replace("-", "_")
            row = next((r for r in constructor_standings
                        if r.get("Constructor", {}).get("constructorId") == cid), None)
            if row:
                t["seasonPoints"] = _to_int(row.get("points"))
                t["seasonPosition"] = _to_int(row.get("position"))
                updated_t += 1
            arr = team_cumulative.get(cid)
            if arr:
                t["progression"] = list(arr)
        _write(teams_path, teams)

        logger.info("Persisted standings: %d drivers, %d teams", updated, updated_t)
    except Exception as exc:
        logger.warning("Failed to persist standings: %s", exc)


def _load_fallback(name: str) -> Any:
    path = settings.FALLBACK_DIR / f"{name}.json"
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


# ------------------------------------------------------------------
# 职业履历缓存：内存 → 磁盘 → 上游 三级缓存
# 上游一次要翻几十页，落盘后重启也能秒开详情页。
# ------------------------------------------------------------------

def _career_cache_read(key: str) -> Optional[Any]:
    path = os.path.join(str(settings.CAREER_DIR), f"{key}.json")
    try:
        if time.time() - os.path.getmtime(path) > settings.CACHE_CAREER_TTL:
            return None
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return None


def _career_cache_write(key: str, value: Any) -> None:
    path = os.path.join(str(settings.CAREER_DIR), f"{key}.json")
    try:
        os.makedirs(str(settings.CAREER_DIR), exist_ok=True)
        tmp = path + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(value, f, ensure_ascii=False, separators=(",", ":"))
        os.replace(tmp, path)
    except OSError as exc:
        logger.debug("Career disk cache write failed for %s: %s", key, exc)


async def _career_cached(key: str, factory) -> Any:
    cached = cache.get(key)
    if cached is not None:
        return cached
    disk = _career_cache_read(key)
    if disk is not None:
        cache.set(key, disk, settings.CACHE_CAREER_TTL)
        return disk
    value = await factory()
    _career_cache_write(key, value)
    cache.set(key, value, settings.CACHE_CAREER_TTL)
    return value


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

async def _fetch_json(factory, label: str, budget: float, attempts: int = 2):
    """带超时预算 + 重试的抓取。接收工厂函数（协程不可重复 await）。

    失败返回 None，由上层降级到本地快照，绝不阻断整包构建。
    """
    for attempt in range(1, attempts + 1):
        try:
            return await asyncio.wait_for(factory(), timeout=budget)
        except Exception as exc:
            if attempt < attempts:
                logger.info("Jolpica %s attempt %d/%d failed, retrying: %s",
                            label, attempt, attempts, exc)
                await asyncio.sleep(1.0)
            else:
                logger.warning("Jolpica %s failed after %d attempts: %s",
                               label, attempts, exc)
    return None


def _core_name(name: str) -> str:
    """从 'Australian Grand Prix' / 'Bahrain GP in Malaysia' 提取可比对的核心词。"""
    n = (name or "").lower().strip()
    n = n.replace("grand prix", "").replace(" gp", "").replace("gp", "")
    n = n.replace(" in malaysia", "").replace(" malaysia", "")
    alias = {
        "são paulo": "brazilian", "sao paulo": "brazilian", "brazilian": "brazilian",
        "spanish": "spanish", "barcelona": "spanish",
        "emilia-romagna": "emilia", "imola": "emilia",
        "saudi arabian": "saudi", "saudi": "saudi",
        "dutch": "dutch", "zandvoort": "dutch",
        "mexico city": "mexico", "mexican": "mexico",
        "united states": "us", "usa": "us", "americas": "us",
    }
    for old, new in alias.items():
        if old in n:
            n = new
            break
    return n.strip("- ").strip()


def _accumulate(per_round: Dict[str, Dict[int, float]], total_rounds: int) -> Dict[str, List[int]]:
    """逐轮得分 → 累计积分序列（缺口轮次用上一轮累计值填充）。"""
    out: Dict[str, List[int]] = {}
    for did, rounds in per_round.items():
        arr: List[int] = []
        total = 0.0
        for rnd in range(1, total_rounds + 1):
            total += rounds.get(rnd, 0.0)
            arr.append(round(total))
        out[did] = arr
    return out


def _extend(cum: Dict[str, List[int]], adds: Dict[str, float], rnd: int) -> None:
    """在累计序列尾部追加一轮：所有车手先补上一轮累计值，再叠加本轮得分。"""
    for arr in cum.values():
        arr.append(arr[-1] if arr else 0)
    for did, pts in adds.items():
        arr = cum.get(did)
        if arr is None:
            # 中途新出现的车手：前面补零
            cum[did] = [0] * (rnd - 1) + [round(pts)]
        else:
            arr[-1] += round(pts)


async def _build_season_bundle() -> dict:
    """增量构建赛季大包。

    关键优化：本地快照里已记录的完赛轮次**不再重复请求上游**，
    只补拉「快照缺失且已过比赛日期」的轮次，无节流锁并发执行。
    正常情况下一次刷新只需 3~4 个上游请求（秒级完成），
    有新比赛完赛时也只多拉 1~2 轮。
    """
    # ---- 第一阶段：稳定端点（积分榜 + 赛历）----
    # jolpica 内部有节流锁，串行调用可让各自的超时预算独立计时。
    driver_json = await _fetch_json(lambda: jolpica.driver_standings(), "driverStandings", 45.0, 2)
    constructor_json = await _fetch_json(lambda: jolpica.constructor_standings(), "constructorStandings", 45.0, 2)
    schedule_json = await _fetch_json(lambda: jolpica.schedule(), "schedule", 45.0, 2)

    if driver_json is None:
        raise JolpicaError("driverStandings unavailable")

    standings_list = driver_json["MRData"]["StandingsTable"]["StandingsLists"]
    current = standings_list[0]
    season = current["season"]
    last_round = _to_int(current["round"])

    constructor_standings: List[dict] = []
    if constructor_json is not None:
        try:
            constructor_standings = (
                constructor_json["MRData"]["StandingsTable"]["StandingsLists"][0]["ConstructorStandings"]
            )
        except (KeyError, IndexError, TypeError):
            constructor_standings = []

    # schedule 偶尔也会 httpx 超时（虽然总体比 results 稳定）
    # 用 fallback races.json 当 schedule 兜底，字段完全够用。
    if schedule_json is not None:
        schedule = schedule_json["MRData"]["RaceTable"]["Races"]
    else:
        fb_races = _load_fallback("races")
        schedule = [{
            "round": str(r["round"]),
            "raceName": r["name"],
            "date": r["date"],
            "Circuit": {
                "circuitId": "",
                "circuitName": r["circuit"],
                "Location": {"country": r.get("country", "")},
            },
        } for r in fb_races]
        logger.warning("Schedule unavailable, using fallback races.json as schedule (%d races)", len(schedule))

    fallback_races = _load_fallback("races")
    sched_core = {_to_int(s["round"]): _core_name(s.get("raceName", "")) for s in schedule}

    # ---- 第二步：快照里已记录的完赛轮次直接复用，不重复请求上游 ----
    seeded: Dict[int, dict] = {}
    for r in fallback_races:
        if r.get("status") != "completed":
            continue
        rnd = _to_int(r.get("round"))
        if not rnd:
            continue
        core = _core_name(r.get("name", "") or r.get("shortName", ""))
        # 轮次号与赛历漂移（旧版快照）时不采信，改走下面的名称匹配
        if core and sched_core.get(rnd) and core != sched_core[rnd]:
            continue
        seeded[rnd] = r

    result_map: Dict[int, dict] = {rnd: {"_fallbackRace": r} for rnd, r in seeded.items()}
    sprint_by_round: Dict[int, dict] = {}       # round -> 原始 race（含 SprintResults）
    sprint_points: Dict[int, Dict[str, float]] = {}

    # ---- 第三步：只补拉「快照缺失 + 已过比赛日期」的轮次（并发，无节流锁）----
    today = date.today()

    def _round_date(item: dict) -> Optional[date]:
        try:
            return date.fromisoformat(item.get("date", ""))
        except (TypeError, ValueError):
            return None

    needed: List[int] = []
    for item in schedule:
        rnd = _to_int(item["round"])
        if rnd < 1 or rnd > last_round + 1 or rnd in result_map:
            continue
        rd = _round_date(item)
        # 积分榜已推进到的轮次，或比赛日期已过 → 视为需要补拉
        if rnd <= last_round or (rd is not None and rd < today):
            needed.append(rnd)

    sem = asyncio.Semaphore(max(1, settings.ROUND_CONCURRENCY))

    async def _pull_round(rnd: int):
        async with sem:
            res = await _fetch_json(
                lambda: jolpica.race_results_by_round(season, rnd),
                f"R{rnd}_results", 45.0, 2,
            )
            spr = await _fetch_json(
                lambda: jolpica.sprint_results_by_round(season, rnd),
                f"R{rnd}_sprint", 45.0, 1,
            )
        return rnd, res, spr

    if needed:
        for rnd, res, spr in await asyncio.gather(*[_pull_round(r) for r in needed]):
            if res:
                races = res.get("MRData", {}).get("RaceTable", {}).get("Races") or []
                if races and races[0].get("Results"):
                    result_map[rnd] = races[0]
            if spr:
                races = spr.get("MRData", {}).get("RaceTable", {}).get("Races") or []
                if races and races[0].get("SprintResults"):
                    sprint_by_round[rnd] = races[0]
                    sprint_points[rnd] = {}
                    for row in races[0]["SprintResults"]:
                        did = row["Driver"]["driverId"]
                        sprint_points[rnd][did] = sprint_points[rnd].get(did, 0.0) + float(row["points"])
        logger.info("Fetched %d round(s) from upstream: %s", len(needed), needed)

    # ---- 第四步：仍缺的轮次按比赛核心名称从快照兜底 ----
    if len(result_map) < last_round:
        fb_by_core: Dict[str, dict] = {}
        for r in fallback_races:
            if r.get("status") != "completed":
                continue
            core = _core_name(r.get("name", "") or r.get("shortName", ""))
            if core and core not in fb_by_core:
                fb_by_core[core] = r

        matched = 0
        for item in schedule:
            rnd = _to_int(item["round"])
            if rnd in result_map:
                continue
            schedule_core = sched_core.get(rnd) or _core_name(item.get("raceName", ""))
            if not schedule_core:
                continue
            fb = fb_by_core.get(schedule_core)
            if fb is None:
                for fb_core, fb_race in fb_by_core.items():
                    if fb_core in schedule_core or schedule_core in fb_core:
                        fb = fb_race
                        break
            if fb:
                result_map[rnd] = {"_fallbackRace": fb}
                matched += 1
        if matched:
            logger.warning("Fallback-matched %d round(s) upstream missed", matched)

    # ---- 第五步：逐轮累计积分（快照走势 + 新轮次增量）----
    cumulative: Dict[str, List[int]] = {
        d["id"].replace("-", "_"): list(d.get("progression") or [])
        for d in _load_fallback("drivers")
    }
    team_cumulative: Dict[str, List[int]] = {
        t["id"].replace("-", "_"): list(t.get("progression") or [])
        for t in _load_fallback("teams")
    }

    # 积分榜可能滞后于刚完赛的轮次，取二者较大值
    fetched_completed = [rnd for rnd, race in result_map.items()
                         if race.get("Results") and rnd not in seeded]
    effective_last = max([last_round] + fetched_completed)
    base_len = max([len(v) for v in cumulative.values()] + [0])

    if base_len == 0:
        # 快照无走势（首次部署）：用已有原始赛果从零重建
        per_round: Dict[str, Dict[int, float]] = {}
        team_round: Dict[str, Dict[int, float]] = {}
        for rnd in range(1, effective_last + 1):
            race = result_map.get(rnd) or {}
            sprint_map = sprint_points.get(rnd, {})
            for row in race.get("Results") or []:
                did = row["Driver"]["driverId"]
                cid = row["Constructor"]["constructorId"]
                pts = float(row["points"]) + sprint_map.get(did, 0.0)
                per_round.setdefault(did, {})[rnd] = per_round[did].get(rnd, 0.0) + pts
                team_round.setdefault(cid, {})[rnd] = team_round[cid].get(rnd, 0.0) + pts
        cumulative = _accumulate(per_round, effective_last)
        team_cumulative = _accumulate(team_round, effective_last)
    else:
        # 快照已连续到 base_len：只在尾部追加新完赛轮次，出现缺口就停（保持快照原样）
        for rnd in range(base_len + 1, effective_last + 1):
            race = result_map.get(rnd)
            if not race or not race.get("Results"):
                break
            sprint_map = sprint_points.get(rnd, {})
            adds: Dict[str, float] = {}
            team_adds: Dict[str, float] = {}
            for row in race["Results"]:
                did = row["Driver"]["driverId"]
                cid = row["Constructor"]["constructorId"]
                pts = float(row["points"]) + sprint_map.get(did, 0.0)
                adds[did] = adds.get(did, 0.0) + pts
                team_adds[cid] = team_adds.get(cid, 0.0) + pts
            _extend(cumulative, adds, rnd)
            _extend(team_cumulative, team_adds, rnd)

    # 最快圈：快照已有轮次 + 本次新拉轮次
    fastest_laps: Dict[str, int] = {}
    for rnd, r in seeded.items():
        fl = r.get("fastestLap")
        name = fl.get("name") if isinstance(fl, dict) else fl
        if name:
            fastest_laps[name] = fastest_laps.get(name, 0) + 1
    for rnd, race in result_map.items():
        if rnd in seeded:
            continue
        for row in race.get("Results") or []:
            if (row.get("FastestLap") or {}).get("rank") == "1":
                name = f"{row['Driver']['givenName']} {row['Driver']['familyName']}"
                fastest_laps[name] = fastest_laps.get(name, 0) + 1

    # ---- 第六步：持久化（快照自动演化，下次冷启动直接命中）----
    if fetched_completed:
        sprint_json = None
        if sprint_by_round:
            sprint_json = {"MRData": {"RaceTable": {
                "season": season, "Races": list(sprint_by_round.values()),
            }}}
        _persist_results_to_fallback(result_map, schedule, sprint_json)
    # 积分榜与走势每次都写回（快照里的积分字段可能与上游有偏差）
    _persist_standings_to_fallback(
        current["DriverStandings"], constructor_standings, cumulative, team_cumulative
    )

    return {
        "season": season,
        "lastRound": effective_last,
        "schedule": schedule,
        "driverStandings": current["DriverStandings"],
        "constructorStandings": constructor_standings,
        "resultMap": result_map,
        "progression": cumulative,
        "teamProgression": team_cumulative,
        "fastestLaps": fastest_laps,
    }


async def _get_bundle() -> Tuple[dict, str, bool]:
    """返回 (bundle, source, cached)。

    Stale-While-Revalidate 策略：有过期旧值立即返回并后台刷新，
    请求永远不会同步等待上游重建（冷启动除外，且启动时已播种 fallback）。
    """
    try:
        bundle, from_cache = await cache.get_or_fetch_swr(
            "season_bundle", settings.CACHE_SEASON_TTL, _build_season_bundle
        )
    except Exception as exc:
        # 仅冷启动且上游失败时才会走到这里
        logger.exception("Season bundle failed, using fallback snapshot: %s", exc)
        bundle = _build_fallback_bundle()
        cache.set("season_bundle", bundle, settings.CACHE_SEASON_FALLBACK_TTL)
        from_cache = False
    source = "fallback" if bundle.get("_fallback") else "jolpica"
    return bundle, source, from_cache


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
        result_map[_to_int(r["round"])] = {"_fallbackRace": r}

    # 最快圈计数：直接从快照赛果统计，冷启动也能展示真实数据
    fastest_laps: Dict[str, int] = {}
    for r in completed:
        fl = r.get("fastestLap")
        name = _name_of(fl)
        if name:
            fastest_laps[name] = fastest_laps.get(name, 0) + 1

    return {
        "season": "2026",
        "lastRound": len(completed),
        "schedule": schedule,
        "driverStandings": standings,
        "constructorStandings": cstandings,
        "resultMap": result_map,
        "progression": {d["id"].replace("-", "_"): d["progression"] for d in drivers},
        "teamProgression": {t["id"].replace("-", "_"): t.get("progression", []) for t in teams},
        "fastestLaps": fastest_laps,
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

    if fallback:  # 降级快照直接使用旧模型，缺省字段（bio/radar 等）用 enrichment 补齐
        extra_d = enr.get_driver_enrichment(did)
        for key in ("bio", "birthPlace", "radar", "championships", "podiums", "poles"):
            if not fallback.get(key) and extra_d.get(key) is not None:
                fallback[key] = extra_d[key]
        # careerWins 以 enrichment 为准（快照重建可能误存为赛季胜场）
        if extra_d.get("careerWins") is not None:
            fallback["careerWins"] = extra_d["careerWins"]
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


def _name_of(value: Any) -> str:
    """快照里的 winner/fastestLap 可能是对象也可能是字符串，统一取名字。"""
    if isinstance(value, dict):
        return value.get("name", "") or ""
    return value or ""


def _fallback_race_view(r: dict) -> dict:
    """把快照里的一轮赛历转换成与实时分支完全一致的响应字段（字符串契约）。"""
    name = r.get("name", "")
    return {
        "id": _to_int(r.get("round")),
        "name": name,
        "shortName": r.get("shortName") or name.replace(" Grand Prix", " GP"),
        "country": r.get("country", ""),
        "flag": r.get("flag") or enr.country_to_flag(r.get("country", "")),
        "circuit": r.get("circuit", ""),
        "date": r.get("date", ""),
        "laps": r.get("laps"),
        "round": _to_int(r.get("round")),
        "status": r.get("status", "upcoming"),
        "winner": _name_of(r.get("winner")),
        "winningTeam": r.get("winningTeam", ""),
        "fastestLap": _name_of(r.get("fastestLap")),
    }


def _build_races(bundle: dict) -> List[dict]:
    last_round = bundle["lastRound"]
    races = []
    for item in bundle["schedule"]:
        fb = item.get("_fallbackRace")
        if fb:
            races.append(_fallback_race_view(fb))
            continue

        rnd = _to_int(item["round"])
        circuit = item["Circuit"]
        country = circuit.get("Location", {}).get("country", "")
        result = bundle["resultMap"].get(rnd)
        # 已过比赛日期的轮次一律视为完赛；上游赛果缺失时仅缺 winner 字段
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        completed = rnd <= last_round or (item.get("date", "") and item["date"] < today)

        winner = ""
        winner_team = ""
        fastest_driver = ""
        laps = enr.CIRCUIT_LAPS.get(circuit.get("circuitId", ""))
        if result:
            # fallbackRace 形式（本轮回落到快照）→ 取简化字段
            fb_res = result.get("_fallbackRace")
            if fb_res:
                winner = _name_of(fb_res.get("winner"))
                winner_team = fb_res.get("winningTeam") or (
                    fb_res["winner"].get("teamName", "") if isinstance(fb_res.get("winner"), dict) else ""
                )
                fastest_driver = _name_of(fb_res.get("fastestLap"))
                laps = fb_res.get("laps", laps)
            else:
                rows = result.get("Results") or []
                top = next((r for r in rows if r.get("position") == "1"), rows[0] if rows else None)
                if top:
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

    # ---- 实时职业履历（详情页才请求，24h 缓存） ----
    # 三项并行抓取，各自带超时预算；超时/失败降级到静态 enrichment 数据
    live: Dict[str, Any] = {}
    if not bundle.get("_fallback"):

        async def _fetch_titles() -> Dict[str, Any]:
            titles_json = await _career_cached(
                f"career_titles_{did}",
                lambda: jolpica.driver_champion_seasons(did),
            )
            lists = titles_json["MRData"]["StandingsTable"]["StandingsLists"]
            titles = sum(
                1
                for lst in lists
                for row in lst.get("DriverStandings", [])
                if row.get("position") == "1"
            )
            return {"championships": titles}

        async def _fetch_results() -> Dict[str, Any]:
            results_json = await _career_cached(
                f"career_results_{did}",
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
            return {"careerWins": wins, "podiums": podiums}

        async def _fetch_poles() -> Dict[str, Any]:
            qualifying_json = await _career_cached(
                f"career_poles_{did}",
                lambda: jolpica.driver_qualifying(did),
            )
            poles = 0
            for race in qualifying_json["MRData"]["RaceTable"]["Races"]:
                for q in race.get("QualifyingResults", []):
                    if q.get("position") == "1":
                        poles += 1
            return {"poles": poles}

        async def _budget(factory, label: str, cache_key: str) -> Optional[Dict[str, Any]]:
            """限时抓取；失败/超时写入短时负缓存，避免每次访问都重试慢上游。
            接收工厂函数而非协程对象：负缓存命中时不创建协程，避免泄漏警告。"""
            fail_key = f"{cache_key}_failed"
            if cache.get(fail_key):
                return None
            try:
                return await asyncio.wait_for(factory(), timeout=settings.CAREER_TIMEOUT)
            except Exception as exc:
                logger.info("career %s fallback for %s: %s", label, did, exc)
                cache.set(fail_key, True, settings.CAREER_NEG_TTL)
                return None

        for part in await asyncio.gather(
            _budget(_fetch_titles, "titles", f"career_titles_{did}"),
            _budget(_fetch_results, "results", f"career_results_{did}"),
            _budget(_fetch_poles, "poles", f"career_poles_{did}"),
        ):
            if part:
                live.update(part)

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


async def warmup_cache() -> None:
    """服务启动后后台拉取实时赛季大包，成功后静默替换启动时播种的快照。"""
    try:
        bundle = await _build_season_bundle()
        cache.set("season_bundle", bundle, settings.CACHE_SEASON_TTL)
        logger.info("Season bundle warmup complete (live data)")
    except Exception as exc:
        logger.warning("Season bundle warmup failed, keeping seeded snapshot: %s", exc)


def seed_cache() -> None:
    """启动时用本地快照立即填充缓存，保证第一个请求 0ms 命中。"""
    if cache.get("season_bundle") is None:
        cache.set("season_bundle", _build_fallback_bundle(), settings.CACHE_SEASON_FALLBACK_TTL)
        logger.info("Season bundle seeded from fallback snapshot")
