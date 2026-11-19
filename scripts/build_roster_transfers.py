"""Build the 2025 roster-transfer seed from the CC0 NCAA roster release.

Reads the football roster, the bio sidecar, and the football stats sidecar
published by Dharit Shah (CC0 1.0). Writes server/data/roster2025.json and
server/data/roster2025.meta.json. Does not invent a missing field.

A row is kept only when the roster's previous_school text identifies a
college or junior college. Rows whose previous school is the high school,
reads as a high school, or is an academic major are left out. Strings that
do not identify a college are left out too, and counted in the meta file.
"""

import json
import re
from collections import Counter
from pathlib import Path

import duckdb

ROOT = Path(__file__).resolve().parents[1]
PARQUET = Path("/tmp/ncaa")
OUT = ROOT / "server" / "data" / "roster2025.json"
META = ROOT / "server" / "data" / "roster2025.meta.json"

ABBR = [
    ("kentucky", "ky"),
    ("michigan", "mich"),
    ("illinois", "ill"),
    ("carolina", "caro"),
    ("florida", "fla"),
    ("tennessee", "tenn"),
    ("colorado", "colo"),
    ("mississippi", "miss"),
    ("georgia", "ga"),
    ("alabama", "ala"),
    ("louisiana", "la"),
    ("connecticut", "conn"),
    ("massachusetts", "mass"),
    ("pennsylvania", "pa"),
    ("saint", "st"),
    ("state", "st"),
    ("university", ""),
    ("college", ""),
]

# Tokenized previous-school text -> tokenized roster school, when the
# roster file uses a shorter name for the same institution.
ALIASES = {
    "northern illinois": "niu",
    "appalachian st": "app st",
    "grambling st": "grambling",
    "mcneese st": "mcneese",
    "northern arizona": "northern ariz",
    "army": "army west point",
    "umass": "massachusetts",
    "usc": "southern california",
    "fau": "fla atlantic",
    "florida international": "fiu",
    "alcorn st": "alcorn",
    "sam houston st": "sam houston",
    "eastern washington": "eastern wash",
    "uapb": "ark pine bluff",
    "arkansas pine bluff": "ark pine bluff",
    "hawai i": "hawaii",
    "hawaii": "hawaii",
    "middle tennessee st": "middle tenn",
    "middle tennessee": "middle tenn",
    "central arkansas": "central ark",
    "unc charlotte": "charlotte",
    "north carolina central": "n c central",
    "northern iowa": "uni",
    "ut chattanooga": "chattanooga",
    "nicholls st": "nicholls",
    "missouri western": "missouri western st",
    "southeast missouri st": "southeast mo st",
    "southeast missouri": "southeast mo st",
    "mississippi valley st": "mississippi val",
    "charleston southern": "charleston so",
    "ga southern": "ga southern",
    "georgia southern": "ga southern",
    "usf": "south fla",
    "south florida": "south fla",
    "louisiana monroe": "louisiana monroe",
    "ul monroe": "louisiana monroe",
    "utm": "ut martin",
    "ut martin": "ut martin",
    "mtsu": "middle tenn",
    "pitt": "pittsburgh",
    "semo": "southeast mo st",
    "iup": "indiana university of pennsylvania",
    "missouri southern": "missouri southern st",
    "western connecticut": "western connecticut st",
    "st francis pa": "st francis pa",
    "saint francis pa": "st francis pa",
    "miami fla": "miami fl",
    "miami ohio": "miami oh",
    "miami fl": "miami fl",
    "miami oh": "miami oh",
    "connecticut": "uconn",
    "north carolina a and t": "n c a and t",
    "nc a and t": "n c a and t",
    "utpb": "ut permian basin",
    "csu pueblo": "colorado st pueblo",
    "hcu": "houston christian",
    "stephen f austin": "stephen f austin",
    "sfa": "stephen f austin",
    "arkansas st univ": "arkansas st",
    "univ of arkansas": "arkansas",
}

# Colleges and junior colleges whose roster spelling is not in the 660
# football school names, or whose short name would otherwise be ambiguous
# with a high school. Each one is a real college the previous-school cell
# is using. They are included as the printed string, not renamed.
ALLOW = {
    "limestone",
    "iowa western",
    "iowa central",
    "cal",
    "louisiana",
    "wayne st",
    "virginia union",
    "incarnate word",
    "uiw",
    "minnesota st",
    "alderson broaddus",
    "nmmi",
    "lackawanna",
    "cisco",
    "louisburg",
    "blinn",
    "dodge city",
    "mt sac",
    "mt san antonio",
    "san diego mesa",
    "nw mississippi",
    "hutchinson",
    "stephen f austin",
    "siena heights",
    "faulkner",
    "carson newman",
    "indiana wesleyan",
    "texas wesleyan",
    "arizona christian",
    "keiser",
    "georgia military",
    "miami",
    "clarion",
    "notre dame ohio",
    "west georgia",
    "fort valley st",
    "louisiana monroe",
    "concordia mich",
    "california pa",
    "st thomas",
    "st thomas mn",
    "bethel",
    "monroe",
    "birmingham southern",
    "kansas wesleyan",
    "st francis pa",
    "missouri valley",
    "umhb",
    "golden west",
    "olivet nazarene",
    "butler",
    "campbellsville",
    "kentucky christian",
    "lawrence tech",
    "louisiana christian",
    "navarro",
    "william penn",
    "webber international",
    "kilgore",
}

COLLEGE = re.compile(
    r"(?i)(\b(college|university|univ|community|junior|institute|juco)\b"
    r"|school of mines"
    r"|\ba\s*&\s*m\b"
    r"|(?<![a-z])c\. ?c\.?"
    r"|(?<![a-z])j\. ?c\.?"
    r"|\b(cc|jc)\b"
    r"|\bu\.?\s+of\b)"
)
STATE = re.compile(r"(?i)\bstate\b")
HS = re.compile(
    r"(?i)(\bhigh school\b|\bhs\b|h\.s\.|\bsenior high\b|\bprep\b|\bacademy\b|\bhigh\b|\bschool\b)"
)
JUNK = re.compile(
    r"(?i)^(business|finance|management|marketing|communications?|exercise science|"
    r"sport management|sports administration|sports management|mechanical engineering|"
    r"biology|psychology|accounting|economics|kinesiology|undecided|general studies|"
    r"criminal justice|health science|sports medicine|political science|engineering)$"
)
PREFIX = re.compile(r"(?i)^previous school:\s*")

STAT_LABELS = [
    ("gp", "Games played"),
    ("pass_cmp", "Completions"),
    ("pass_att", "Pass attempts"),
    ("pass_yds", "Passing yards"),
    ("pass_td", "Passing touchdowns"),
    ("pass_int", "Interceptions thrown"),
    ("rush_att", "Rushing attempts"),
    ("rush_yds", "Rushing yards"),
    ("rush_td", "Rushing touchdowns"),
    ("rec", "Receptions"),
    ("rec_yds", "Receiving yards"),
    ("rec_td", "Receiving touchdowns"),
    ("tackles_solo", "Solo tackles"),
    ("tackles_ast", "Assisted tackles"),
    ("tackles_tot", "Total tackles"),
    ("tfl", "Tackles for loss"),
    ("sacks", "Sacks"),
    ("def_int", "Interceptions"),
    ("pbu", "Passes defended"),
    ("fgm", "Field goals made"),
    ("fga", "Field goals attempted"),
    ("punts", "Punts"),
    ("punt_avg", "Punt average"),
]

WORD_GROUPS = [
    (re.compile(r"(?i)snapper|\bLS\b|\bSN\b"), "LS"),
    (re.compile(r"(?i)quarterback|\bQB\b"), "QB"),
    (re.compile(r"(?i)running back|\bRB\b"), "RB"),
    (re.compile(r"(?i)wide rec"), "WR"),
    (re.compile(r"(?i)tight end|\bTE\b"), "TE"),
    (re.compile(r"(?i)offensive line"), "OL"),
    (re.compile(r"(?i)defensive back|\bDB\b|\bsafety\b|\bcorner"), "DB"),
    (re.compile(r"(?i)defensive (line|end|tackle)|lineman"), "DL"),
    (re.compile(r"(?i)linebacker|\bLB\b"), "LB"),
    (re.compile(r"(?i)kicker|\bPK\b|\bK\b"), "K"),
    (re.compile(r"(?i)punter|\bP\b"), "P"),
]


def tokens(value):
    text = value.lower()
    text = PREFIX.sub("", text)
    text = text.replace("&", " and ")
    text = text.replace(".", " ")
    text = text.replace("'", "")
    text = text.replace("’", "")
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def variants(value):
    base = tokens(value)
    found = {base}
    current = base
    for long, short in ABBR:
        current = re.sub(r"\s+", " ", re.sub(rf"\b{long}\b", short, current)).strip()
        found.add(current)
    for long, short in ABBR:
        found.add(re.sub(r"\s+", " ", re.sub(rf"\b{long}\b", short, base)).strip())
    if base.endswith(" st"):
        found.add(base[:-3].strip())
    alias = ALIASES.get(base)
    if alias:
        found.add(alias)
    return {item for item in found if item}


def group_of(raw, grouped):
    if grouped in {"QB", "RB", "WR", "TE", "OL", "DL", "LB", "DB", "ATH"}:
        return grouped
    text = raw or ""
    if grouped == "ST" or re.search(r"(?i)kick|punt|snap", text):
        if re.search(r"(?i)snapper|\bLS\b|\bSN\b", text):
            return "LS"
        has_k = re.search(r"(?i)kick|\bK\b|\bPK\b", text)
        has_p = re.search(r"(?i)punt|\bP\b", text)
        if has_k and has_p:
            return "K" if re.match(r"(?i)\s*k", text) else "P"
        if has_p:
            return "P"
        if has_k:
            return "K"
        return None
    for pattern, group in WORD_GROUPS:
        if pattern.search(text):
            return group
    return None


def inches_to_height(value):
    if value is None:
        return None
    number = float(value)
    if abs(number - round(number)) > 1e-6:
        return None
    whole = int(round(number))
    if whole < 58 or whole > 90:
        return None
    return f"{whole // 12}-{whole % 12}"


def clean_weight(value):
    if value is None:
        return None
    whole = int(value)
    if whole < 85 or whole > 450:
        return None
    return whole


def is_college(part, canon):
    key = tokens(part)
    if key in ALLOW or key in canon:
        return True
    alias = ALIASES.get(key)
    if alias and (alias in canon or alias in ALLOW):
        return True
    if any(item in canon for item in variants(part)):
        return True
    if COLLEGE.search(part) or STATE.search(part):
        return True
    return False


def classify(previous, high_school, canon):
    text = PREFIX.sub("", previous).strip()
    stripped = text != previous.strip()
    if high_school and tokens(text) == tokens(high_school):
        return "same_high_school", text, stripped
    parts = [part.strip() for part in re.split(r"\s*/\s*|\s*;\s*", text) if part.strip()]
    if any(is_college(part, canon) for part in parts):
        return "keep", text, stripped
    if any(JUNK.match(tokens(part)) for part in parts):
        return "major", text, stripped
    if any(HS.search(part) for part in parts):
        return "high_school", text, stripped
    return "unclassified", text, stripped


def stat_rows(record):
    rows = []
    for key, label in STAT_LABELS:
        value = record.get(key)
        if value is None:
            continue
        number = float(value)
        if number == 0:
            continue
        if key == "punt_avg" and not record.get("punts"):
            continue
        stored = int(number) if number.is_integer() else round(number, 2)
        rows.append({"season": "2025", "key": key, "label": label, "value": stored})
    return rows


def main():
    con = duckdb.connect()
    schools = [
        name
        for (name,) in con.execute(
            "SELECT DISTINCT school FROM '/tmp/ncaa/football.parquet' WHERE school IS NOT NULL"
        ).fetchall()
    ]
    canon = set()
    for school in schools:
        canon |= variants(school)

    result = con.execute(
        """
        SELECT r.athlete_id, r.first_name, r.last_name, r.school, r.position_raw, r.position_group,
               r.class_year_raw, r.hometown_raw, r.high_school, r.division, r.source_url,
               b.previous_school, b.height_in, b.weight_lbs,
               s.gp, s.pass_cmp, s.pass_att, s.pass_yds, s.pass_td, s.pass_int,
               s.rush_att, s.rush_yds, s.rush_td, s.rec, s.rec_yds, s.rec_td,
               s.tackles_solo, s.tackles_ast, s.tackles_tot, s.tfl, s.sacks, s.def_int,
               s.pbu, s.fgm, s.fga, s.punts, s.punt_avg
        FROM '/tmp/ncaa/football.parquet' r
        JOIN '/tmp/ncaa/bio.parquet' b USING (athlete_id)
        LEFT JOIN '/tmp/ncaa/football-stats.parquet' s USING (athlete_id)
        WHERE b.previous_school IS NOT NULL AND b.previous_school <> ''
        """
    )
    columns = [item[0] for item in result.description]
    records = [dict(zip(columns, row)) for row in result.fetchall()]

    reasons = Counter()
    unclassified = Counter()
    players = []
    seen = set()
    for record in records:
        reason, school_from, stripped = classify(
            record["previous_school"], record["high_school"] or "", canon
        )
        reasons[reason] += 1
        if reason != "keep":
            if reason == "unclassified":
                unclassified[school_from] += 1
            continue
        first = (record["first_name"] or "").strip()
        last = (record["last_name"] or "").strip()
        name = re.sub(r"\s+", " ", f"{first} {last}").strip()
        school_to = (record["school"] or "").strip()
        if not name or not school_from or not school_to:
            reasons["missing_name"] += 1
            continue
        athlete_id = record["athlete_id"]
        if athlete_id in seen:
            continue
        seen.add(athlete_id)
        position = (record["position_raw"] or "").strip() or None
        group = group_of(position, record["position_group"])
        eligibility = (record["class_year_raw"] or "").strip() or None
        hometown = (record["hometown_raw"] or "").strip() or None
        division = (record["division"] or "").strip() or None
        note = None
        if stripped:
            note = 'The roster cell included the label "Previous School:"; that label was removed.'
        context = "2025-26 football roster"
        if division:
            context += f", {division}"
        context += ". Previous school is the field that roster printed."
        stats = stat_rows(record)
        players.append(
            {
                "personKey": athlete_id,
                "name": name,
                "pos": position,
                "group": group,
                "height": inches_to_height(record["height_in"]),
                "weight": clean_weight(record["weight_lbs"]),
                "to": school_to,
                "from": school_from,
                "eligibility": eligibility,
                "hometown": hometown,
                "rosterUrl": (record["source_url"] or "").strip() or None,
                "dataNote": note,
                "contextNote": context,
                "stats": stats,
            }
        )

    players.sort(key=lambda player: (player["name"].lower(), player["from"].lower(), player["personKey"]))
    OUT.write_text(json.dumps(players, ensure_ascii=False, separators=(",", ":")))
    meta = {
        "players": len(players),
        "withHeightAndWeight": sum(1 for player in players if player["height"] and player["weight"]),
        "withAnyStat": sum(1 for player in players if player["stats"]),
        "missingHeightOrWeight": sum(1 for player in players if not player["height"] or not player["weight"]),
        "missingGroup": sum(1 for player in players if not player["group"]),
        "footballRosterRows": 72512,
        "previousSchoolRows": int(reasons.total()),
        "excludedSameAsHighSchool": reasons["same_high_school"],
        "excludedHighSchoolWording": reasons["high_school"],
        "excludedMajor": reasons["major"],
        "excludedUnclassified": reasons["unclassified"],
        "unclassifiedExamples": [name for name, _count in unclassified.most_common(25)],
    }
    META.write_text(json.dumps(meta, indent=2) + "\n")
    print(json.dumps(meta, indent=2))
    print("top unclassified:")
    for name, count in unclassified.most_common(30):
        print(f"{count:4} {name}")


if __name__ == "__main__":
    main()
