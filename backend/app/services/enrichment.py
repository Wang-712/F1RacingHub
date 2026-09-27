"""
静态增强数据
-------------------------------------------------------------
真实 F1 API（Ergast/Jolpica）只提供赛历、积分、赛果等"比分数据"，
不包含车队品牌色、车手传记、能力雷达、车队冠军史、赛道圈数等信息。
这些变化极慢的元数据在此集中维护，与实时数据分离。
键名统一使用 Ergast 的下划线 id（如 red_bull / max_verstappen）。
"""
from __future__ import annotations

from typing import Dict, Optional

# ---------- 国籍 / 国家名 -> ISO 3166-1 alpha-2 ----------
NATIONALITY_ISO: Dict[str, str] = {
    # 车手国籍（形容词形式）
    "dutch": "NL", "british": "GB", "monégasque": "MC", "monegasque": "MC",
    "australian": "AU", "spanish": "ES", "japanese": "JP", "french": "FR",
    "thai": "TH", "canadian": "CA", "german": "DE", "italian": "IT",
    "brazilian": "BR", "finnish": "F1",  # 占位防错，下面纠正
    "mexican": "MX", "danish": "DK", "chinese": "CN", "new zealander": "NZ",
    "argentine": "AR", "argentinean": "AR", "austrian": "AT", "belgian": "BE",
    "american": "US", "swedish": "SE", "portuguese": "PT",
    "south african": "ZA", "russian": "RU", "polish": "PL",
    "indonesian": "ID", "swiss": "CH", "irish": "IE", "venezuelan": "VE",
    "colombian": "CO", "indian": "IN",
    # 赛历国家（名词形式，含 Ergast 习惯缩写）
    "australia": "AU", "china": "CN", "japan": "JP", "bahrain": "BH",
    "saudi arabia": "SA", "united states": "US", "usa": "US",
    "u.s.a.": "US", "italy": "IT", "monaco": "MC", "canada": "CA",
    "spain": "ES", "austria": "AT", "united kingdom": "GB", "uk": "GB",
    "belgium": "BE", "hungary": "HU", "netherlands": "NL",
    "singapore": "SG", "mexico": "MX", "brazil": "BR",
    "united arab emirates": "AE", "uae": "AE", "qatar": "QA",
    "azerbaijan": "AZ", "turkey": "TR", "france": "FR", "germany": "DE",
    "portugal": "PT", "malaysia": "MY", "switzerland": "CH",
}
NATIONALITY_ISO["finnish"] = "FI"  # 修正芬兰代码

# ---------- 车队元数据（constructorId -> 信息） ----------
CONSTRUCTORS: Dict[str, dict] = {
    "red_bull": {
        "name": "Red Bull Racing", "shortName": "Red Bull", "color": "#3671C6",
        "country": "Austria", "founded": 2005, "championships": 6,
        "principal": "Christian Horner", "hq": "Milton Keynes, United Kingdom",
        "bio": "四连冠卫冕车队，在荷兰明星车手的带领下全力冲击双冠。",
    },
    "ferrari": {
        "name": "Ferrari", "shortName": "Ferrari", "color": "#E8002D",
        "country": "Italy", "founded": 1950, "championships": 16,
        "principal": "Frédéric Vasseur", "hq": "Maranello, Italy",
        "bio": "F1 历史上最成功、历史最悠久的车队，正追逐自 2007 年以来的首个车手世界冠军。",
    },
    "mercedes": {
        "name": "Mercedes-AMG Petronas", "shortName": "Mercedes", "color": "#27F4D2",
        "country": "Germany", "founded": 2010, "championships": 8,
        "principal": "Toto Wolff", "hq": "Brackley, United Kingdom",
        "bio": "涡轮增压混动时代的霸主，2026 赛季以全新年轻阵容重新出发。",
    },
    "mclaren": {
        "name": "McLaren F1 Team", "shortName": "McLaren", "color": "#FF8000",
        "country": "United Kingdom", "founded": 1966, "championships": 9,
        "principal": "Andrea Stella", "hq": "Woking, United Kingdom",
        "bio": "木瓜色军团正凭借令人振奋的年轻车手阵容，追逐自 1998 年以来的首个车队冠军。",
    },
    "aston_martin": {
        "name": "Aston Martin Aramco", "shortName": "Aston Martin", "color": "#229971",
        "country": "United Kingdom", "founded": 2021, "championships": 0,
        "principal": "Mike Krack", "hq": "Silverstone, United Kingdom",
        "bio": "雄心勃勃的绿色厂队，由两届世界冠军 Fernando Alonso 领军出战。",
    },
    "alpine": {
        "name": "BWT Alpine", "shortName": "Alpine", "color": "#0093CC",
        "country": "France", "founded": 2021, "championships": 0,
        "principal": "Oliver Oakes", "hq": "Enstone, United Kingdom",
        "bio": "Renault 的蓝粉厂队，正力争重返中游竞争行列并更进一步。",
    },
    "williams": {
        "name": "Williams Racing", "shortName": "Williams", "color": "#64C4FF",
        "country": "United Kingdom", "founded": 1977, "championships": 9,
        "principal": "James Vowles", "hq": "Grove, United Kingdom",
        "bio": "九冠传奇车队，在新领导层带领下稳步复苏。",
    },
    "rb": {
        "name": "Visa Cash App Racing Bulls", "shortName": "Racing Bulls", "color": "#6692FF",
        "country": "Italy", "founded": 2024, "championships": 0,
        "principal": "Alan Permane", "hq": "Faenza, Italy",
        "bio": "Red Bull 的姊妹车队，以培养年轻天才闻名——其中就包括 Max Verstappen。",
    },
    "haas": {
        "name": "MoneyGram Haas F1 Team", "shortName": "Haas", "color": "#B6BABD",
        "country": "United States", "founded": 2016, "championships": 0,
        "principal": "Ayao Komatsu", "hq": "Kannapolis, United States",
        "bio": "美国本土车队，凭借经验丰富的车手与新秀的组合屡屡超水平发挥。",
    },
    "sauber": {
        "name": "Stake F1 Team Kick Sauber", "shortName": "Kick Sauber", "color": "#52E252",
        "country": "Switzerland", "founded": 1993, "championships": 0,
        "principal": "Alessandro Alunni Bravi", "hq": "Hinwil, Switzerland",
        "bio": "这支瑞士车队正从 2026 年起逐步转型为 Audi 厂队项目。",
    },
    "kick_sauber": {
        "name": "Stake F1 Team Kick Sauber", "shortName": "Kick Sauber", "color": "#52E252",
        "country": "Switzerland", "founded": 1993, "championships": 0,
        "principal": "Alessandro Alunni Bravi", "hq": "Hinwil, Switzerland",
        "bio": "这支瑞士车队正从 2026 年起逐步转型为 Audi 厂队项目。",
    },
    "audi": {
        "name": "Audi F1 Team", "shortName": "Audi", "color": "#D71920",
        "country": "Germany", "founded": 2026, "championships": 0,
        "principal": "Gernot Döllner", "hq": "Hinwil, Switzerland & Neuburg, Germany",
        "bio": "四环品牌于 2026 年以全厂队身份登场，接管 Sauber 运营并搭载专属动力单元。",
    },
    "cadillac": {
        "name": "Cadillac F1 Team", "shortName": "Cadillac", "color": "#C8A24B",
        "country": "United States", "founded": 2026, "championships": 0,
        "principal": "Laura Wontrop Klauser", "hq": "Warren, Michigan, United States",
        "bio": "通用汽车旗下标志性豪华品牌带来第 11 支车队，将美式制造带入 2026 赛季围场。",
    },
}

# ---------- 车手增强信息（driverId -> 传记 / 出生地 / 能力雷达 / 职业数据兜底） ----------
DRIVERS: Dict[str, dict] = {
    "max_verstappen": {
        "birthPlace": "Hasselt, Belgium",
        "bio": "他这一代车手中的标志性人物，将令人窒息的赛车控制力与对胜利的无情渴望融为一体。",
        "radar": {"pace": 99, "qualifying": 95, "consistency": 92, "tyreManagement": 97, "wetSkill": 99, "racecraft": 96},
        "careerWins": 68, "podiums": 117, "poles": 44, "championships": 4,
    },
    "lando_norris": {
        "birthPlace": "Bristol, United Kingdom",
        "bio": "F1 最耀眼的年轻天才，以惊人的单圈速度引领 McLaren 的争冠之路。",
        "radar": {"pace": 96, "qualifying": 98, "consistency": 90, "tyreManagement": 88, "wetSkill": 89, "racecraft": 92},
        "careerWins": 14, "podiums": 42, "poles": 14, "championships": 0,
    },
    "leclerc": {
        "birthPlace": "Monte Carlo, Monaco",
        "bio": "Ferrari 的金童、排位赛大师，每个比赛周末都承载着 Tifosi 的期望。",
        "radar": {"pace": 94, "qualifying": 97, "consistency": 85, "tyreManagement": 86, "wetSkill": 88, "racecraft": 90},
        "careerWins": 8, "podiums": 45, "poles": 29, "championships": 0,
    },
    "piastri": {
        "birthPlace": "Melbourne, Australia",
        "bio": "压力下冷静如冰、已证明实力的分站冠军，这位墨尔本土生土长的车手是未来的世界冠军候选。",
        "radar": {"pace": 92, "qualifying": 91, "consistency": 93, "tyreManagement": 90, "wetSkill": 87, "racecraft": 93},
        "careerWins": 4, "podiums": 14, "poles": 3, "championships": 0,
    },
    "hamilton": {
        "birthPlace": "Stevenage, United Kingdom",
        "bio": "七届世界冠军，在身披红色战袍的首个赛季追逐史无前例的第八冠。",
        "radar": {"pace": 91, "qualifying": 93, "consistency": 88, "tyreManagement": 95, "wetSkill": 97, "racecraft": 96},
        "careerWins": 105, "podiums": 201, "poles": 104, "championships": 7,
    },
    "russell": {
        "birthPlace": "King's Lynn, United Kingdom",
        "bio": "Mercedes 车队领袖、排位赛专家，因出色的单圈速度被戏称为“周六先生”。",
        "radar": {"pace": 90, "qualifying": 94, "consistency": 89, "tyreManagement": 87, "wetSkill": 86, "racecraft": 88},
        "careerWins": 5, "podiums": 16, "poles": 5, "championships": 0,
    },
    "antonelli": {
        "birthPlace": "Bologna, Italy",
        "bio": "在低级别赛事中统治级表现后，这位少年天才获得了 F1 最令人垂涎的席位之一。",
        "radar": {"pace": 88, "qualifying": 89, "consistency": 82, "tyreManagement": 80, "wetSkill": 90, "racecraft": 84},
        "careerWins": 0, "podiums": 3, "poles": 0, "championships": 0,
    },
    "alonso": {
        "birthPlace": "Oviedo, Spain",
        "bio": "不老的两届世界冠军、比赛策略大师，仍能在并不出彩的赛车中拿下领奖台。",
        "radar": {"pace": 88, "qualifying": 87, "consistency": 90, "tyreManagement": 98, "wetSkill": 95, "racecraft": 99},
        "careerWins": 32, "podiums": 106, "poles": 22, "championships": 2,
    },
    "tsunoda": {
        "birthPlace": "Sagamihara, Japan",
        "bio": "日本热血天才，在 2026 年梦想成真，晋升至 Red Bull 大车队。",
        "radar": {"pace": 87, "qualifying": 88, "consistency": 78, "tyreManagement": 79, "wetSkill": 84, "racecraft": 82},
        "careerWins": 0, "podiums": 1, "poles": 0, "championships": 0,
    },
    "sainz": {
        "birthPlace": "Madrid, Spain",
        "bio": "“顺滑先生”，驾驶风格丝滑的分站冠军，从前方引领 Williams 的复兴。",
        "radar": {"pace": 89, "qualifying": 90, "consistency": 89, "tyreManagement": 92, "wetSkill": 90, "racecraft": 92},
        "careerWins": 4, "podiums": 24, "poles": 6, "championships": 0,
    },
    "gasly": {
        "birthPlace": "Rouen, France",
        "bio": "蒙扎大奖赛冠军、Alpine 领袖，始终以超出赛车实力的表现战斗。",
        "radar": {"pace": 86, "qualifying": 87, "consistency": 84, "tyreManagement": 88, "wetSkill": 89, "racecraft": 90},
        "careerWins": 1, "podiums": 5, "poles": 0, "championships": 0,
    },
    "albon": {
        "birthPlace": "London, United Kingdom",
        "bio": "从超级替补成长为车队领袖，以在竞争力不足的赛车中创造神奇周日而闻名。",
        "radar": {"pace": 85, "qualifying": 86, "consistency": 85, "tyreManagement": 90, "wetSkill": 88, "racecraft": 90},
        "careerWins": 0, "podiums": 2, "poles": 0, "championships": 0,
    },
    "stroll": {
        "birthPlace": "Montreal, Canada",
        "bio": "雨战领奖台专家，驾驶风格无畏，善于抓住机会完成超车。",
        "radar": {"pace": 82, "qualifying": 82, "consistency": 78, "tyreManagement": 84, "wetSkill": 89, "racecraft": 83},
        "careerWins": 0, "podiums": 3, "poles": 1, "championships": 0,
    },
    "hadjar": {
        "birthPlace": "Paris, France",
        "bio": "Red Bull 青训出品，速度原始，在 2026 赛季围场中快速成长。",
        "radar": {"pace": 84, "qualifying": 85, "consistency": 76, "tyreManagement": 75, "wetSkill": 82, "racecraft": 80},
        "careerWins": 0, "podiums": 0, "poles": 0, "championships": 0,
    },
    "hulkenberg": {
        "birthPlace": "Emmerich, Germany",
        "bio": "经验丰富的“绿巨人”——周六排位赛大师，200 余场的职业生涯仍在续写传奇。",
        "radar": {"pace": 83, "qualifying": 88, "consistency": 82, "tyreManagement": 87, "wetSkill": 85, "racecraft": 84},
        "careerWins": 0, "podiums": 1, "poles": 1, "championships": 0,
    },
    "bearman": {
        "birthPlace": "Chelmsford, United Kingdom",
        "bio": "超级 Ollie，这位 Ferrari 青训车手在 F1 首秀即拿分，随后获得 Haas 正式车手席位。",
        "radar": {"pace": 83, "qualifying": 84, "consistency": 78, "tyreManagement": 77, "wetSkill": 81, "racecraft": 81},
        "careerWins": 0, "podiums": 1, "poles": 0, "championships": 0,
    },
    "ocon": {
        "birthPlace": "Évreux, France",
        "bio": "2021 年匈牙利站冠军，为 Haas 的年轻阵容带来经验与锋芒。",
        "radar": {"pace": 83, "qualifying": 84, "consistency": 79, "tyreManagement": 85, "wetSkill": 86, "racecraft": 86},
        "careerWins": 1, "podiums": 3, "poles": 0, "championships": 0,
    },
    "doohan": {
        "birthPlace": "Gold Coast, Australia",
        "bio": "摩托车传奇 Mick Doohan 之子，在 F1 四轮世界开辟自己的道路。",
        "radar": {"pace": 81, "qualifying": 83, "consistency": 74, "tyreManagement": 73, "wetSkill": 78, "racecraft": 76},
        "careerWins": 0, "podiums": 0, "poles": 0, "championships": 0,
    },
    "bortoleto": {
        "birthPlace": "São Paulo, Brazil",
        "bio": "巴西下一位 F1 希望、前 F3 冠军，被视为 Audi 时代的未来之星。",
        "radar": {"pace": 80, "qualifying": 82, "consistency": 73, "tyreManagement": 72, "wetSkill": 80, "racecraft": 77},
        "careerWins": 0, "podiums": 0, "poles": 0, "championships": 0,
    },
    "lawson": {
        "birthPlace": "Hastings, New Zealand",
        "bio": "新西兰的超级替补，在多次亮眼替补表现后全职回归 Red Bull 体系。",
        "radar": {"pace": 86, "qualifying": 87, "consistency": 79, "tyreManagement": 78, "wetSkill": 84, "racecraft": 82},
        "careerWins": 0, "podiums": 1, "poles": 0, "championships": 0,
    },
    "lindblad": {
        "birthPlace": "Vatican City / London, United Kingdom",
        "bio": "Red Bull 的少年卡丁车天才，直接从 F2 跳级登上 F1 围场。",
        "radar": {"pace": 83, "qualifying": 85, "consistency": 74, "tyreManagement": 72, "wetSkill": 80, "racecraft": 76},
        "careerWins": 0, "podiums": 0, "poles": 0, "championships": 0,
    },
    "colapinto": {
        "birthPlace": "Pilar, Argentina",
        "bio": "阿根廷无畏车手，在 Williams 惊艳首秀后，于 Alpine 获得第二次 F1 机会。",
        "radar": {"pace": 84, "qualifying": 85, "consistency": 75, "tyreManagement": 74, "wetSkill": 85, "racecraft": 80},
        "careerWins": 0, "podiums": 0, "poles": 0, "championships": 0,
    },
    "bottas": {
        "birthPlace": "Nastola, Finland",
        "bio": "冷静的“芬兰飞人”、十座分站冠军得主，领衔 Cadillac 的处子赛季。",
        "radar": {"pace": 86, "qualifying": 87, "consistency": 86, "tyreManagement": 91, "wetSkill": 88, "racecraft": 88},
        "careerWins": 10, "podiums": 67, "poles": 20, "championships": 0,
    },
    "perez": {
        "birthPlace": "Guadalajara, Mexico",
        "bio": "墨西哥街道赛之王，为 Cadillac 的全新项目带来分站冠军经验。",
        "radar": {"pace": 85, "qualifying": 84, "consistency": 83, "tyreManagement": 92, "wetSkill": 88, "racecraft": 89},
        "careerWins": 6, "podiums": 39, "poles": 3, "championships": 0,
    },
}

# 未知车手的默认增强值
DEFAULT_DRIVER = {
    "birthPlace": "",
    "bio": "一位参加 2026 年 FIA 一级方程式世界锦标赛的现役 F1 车手。",
    "radar": {"pace": 84, "qualifying": 84, "consistency": 80, "tyreManagement": 80, "wetSkill": 82, "racecraft": 82},
    "careerWins": None, "podiums": None, "poles": None, "championships": None,
}

# ---------- 赛道计划圈数（赛历接口不提供圈数；用于尚未出结果的赛道） ----------
CIRCUIT_LAPS: Dict[str, int] = {
    "albert_park": 58, "shanghai": 56, "suzuka": 53, "bahrain": 57,
    "jeddah": 50, "miami": 57, "imola": 63, "monaco": 78,
    "villeneuve": 70, "catalunya": 66, "red_bull_ring": 71,
    "silverstone": 52, "spa": 44, "hungaroring": 70, "zandvoort": 72,
    "monza": 53, "marina_bay": 62, "americas": 56, "rodriguez": 71,
    "interlagos": 71, "vegas": 50, "losail": 57, "yas_marina": 58,
}

# ---------- 历史纪录（变化极慢，作为 Statistics 页静态数据） ----------
HISTORICAL_CHAMPIONS = [
    {"name": "Hamilton", "value": 7}, {"name": "Schumacher", "value": 7},
    {"name": "Verstappen", "value": 4}, {"name": "Prost", "value": 4},
    {"name": "Vettel", "value": 4}, {"name": "Senna", "value": 3},
    {"name": "Brabham", "value": 3}, {"name": "Stewart", "value": 3},
    {"name": "Alonso", "value": 2},
]

HISTORICAL_WINS = [
    {"name": "L. Hamilton", "value": 105}, {"name": "M. Schumacher", "value": 91},
    {"name": "M. Verstappen", "value": 68}, {"name": "S. Vettel", "value": 53},
    {"name": "A. Prost", "value": 51}, {"name": "S. Senna", "value": 41},
    {"name": "F. Alonso", "value": 32}, {"name": "N. Mansell", "value": 31},
    {"name": "J. Stewart", "value": 27}, {"name": "J. Clark", "value": 25},
]


# ---------- 工具函数 ----------
def iso_to_flag_emoji(iso: Optional[str]) -> str:
    """ISO alpha-2 代码转国旗 emoji（区域指示符）。"""
    if not iso or len(iso) != 2 or not iso.isalpha():
        return ""
    iso = iso.lower()
    return chr(0x1F1E6 + ord(iso[0]) - 97) + chr(0x1F1E6 + ord(iso[1]) - 97)


def nationality_to_iso(nationality: Optional[str]) -> str:
    return NATIONALITY_ISO.get((nationality or "").strip().lower(), "")


def country_to_flag(country: Optional[str]) -> str:
    iso = NATIONALITY_ISO.get((country or "").strip().lower(), "")
    return iso_to_flag_emoji(iso)


def nationality_to_flag(nationality: Optional[str]) -> str:
    return iso_to_flag_emoji(nationality_to_iso(nationality))


def get_driver_enrichment(driver_id: str) -> dict:
    return DRIVERS.get(driver_id, DEFAULT_DRIVER)


def get_constructor(constructor_id: str) -> dict:
    return CONSTRUCTORS.get(
        constructor_id,
        {
            "name": constructor_id.replace("_", " ").title(),
            "shortName": constructor_id.replace("_", " ").title(),
            "color": "#999999", "country": "", "founded": None,
            "championships": 0, "principal": "", "hq": "", "bio": "",
        },
    )
