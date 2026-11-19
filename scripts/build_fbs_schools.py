"""Mark roster schools as FBS or not, without guessing.

The 136 Football Bowl Subdivision members for 2025 are the conference lineups
published by FBSchedules on 1 July 2025:
https://fbschedules.com/college-football-realignment-conference-changes-for-2025-take-effect-today/

A roster school is FBS only when its name matches one of those programs.
Every other school in the CC0 football file is stored as not FBS.
A name that matches two different labels is omitted. Unmatched previous
schools stay unknown at read time and are left off the board.
"""

import importlib.util
import json
from pathlib import Path

import duckdb

ROOT = Path(__file__).resolve().parents[1]
PARQUET = Path("/tmp/ncaa/football.parquet")
OUT = ROOT / "server" / "data" / "school-fbs.json"

FBS = {
    "ACC": ["Boston College", "California", "Clemson", "Duke", "Florida State", "Georgia Tech", "Louisville", "Miami", "NC State", "North Carolina", "Pittsburgh", "SMU", "Stanford", "Syracuse", "Virginia", "Virginia Tech", "Wake Forest"],
    "American": ["Army", "Charlotte", "East Carolina", "Florida Atlantic", "Memphis", "Navy", "North Texas", "Rice", "Temple", "Tulane", "Tulsa", "UAB", "USF", "UTSA"],
    "Big 12": ["Arizona", "Arizona State", "Baylor", "BYU", "Cincinnati", "Colorado", "Houston", "Iowa State", "Kansas", "Kansas State", "Oklahoma State", "TCU", "Texas Tech", "UCF", "Utah", "West Virginia"],
    "Big Ten": ["Indiana", "Illinois", "Iowa", "Maryland", "Michigan", "Michigan State", "Minnesota", "Nebraska", "Northwestern", "Ohio State", "Oregon", "Penn State", "Purdue", "Rutgers", "UCLA", "USC", "Washington", "Wisconsin"],
    "CUSA": ["Delaware", "FIU", "Jacksonville State", "Kennesaw State", "Liberty", "Louisiana Tech", "Middle Tennessee", "Missouri State", "New Mexico State", "Sam Houston", "UTEP", "WKU"],
    "Independent": ["Notre Dame", "UConn"],
    "MAC": ["Akron", "Ball State", "Bowling Green", "Buffalo", "Central Michigan", "Eastern Michigan", "Kent State", "Miami (Ohio)", "Northern Illinois", "Ohio", "Toledo", "UMass", "Western Michigan"],
    "Mountain West": ["Air Force", "Boise State", "Colorado State", "Fresno State", "Hawaii", "Nevada", "New Mexico", "San Diego State", "San Jose State", "UNLV", "Utah State", "Wyoming"],
    "Pac-12": ["Oregon State", "Washington State"],
    "SEC": ["Alabama", "Arkansas", "Auburn", "Florida", "Georgia", "Kentucky", "LSU", "Mississippi State", "Missouri", "Oklahoma", "Ole Miss", "South Carolina", "Tennessee", "Texas", "Texas A&M", "Vanderbilt"],
    "Sun Belt": ["Appalachian State", "Arkansas State", "Coastal Carolina", "Georgia Southern", "Georgia State", "James Madison", "Louisiana", "Marshall", "Old Dominion", "South Alabama", "Southern Miss", "Texas State", "Troy", "ULM"],
}

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
]

# Same program as the cited lineup, different spelling in the roster file or
# in a previous-school cell. These are not guesses about other schools.
CANON = {
    "Miami": "Miami (FL)",
    "WKU": "Western Ky.",
    "Appalachian State": "App State",
}
EXTRA_FBS = {
    "Western Kentucky",
    "Western Ky.",
    "Appalachian St.",
    "App St.",
    "UL Lafayette",
    "Louisiana Lafayette",
    "Louisiana-Lafayette",
    "Miami (FL)",
    "Miami FL",
    "Miami Fla.",
}


def load_roster():
    spec = importlib.util.spec_from_file_location("roster", ROOT / "scripts" / "build_roster_transfers.py")
    roster = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(roster)
    return roster


def lookup_keys(value, roster):
    base = roster.tokens(value)
    keys = {base}
    current = base
    for long, short in ABBR:
        current = roster.re.sub(r"\s+", " ", roster.re.sub(rf"\b{long}\b", short, current)).strip()
        if current:
            keys.add(current)
    for key in list(keys):
        alias = roster.ALIASES.get(key)
        if alias:
            keys.add(alias)
    return {item for item in keys if item}


def main():
    roster = load_roster()
    listed = [(conference, name) for conference, names in FBS.items() for name in names]
    if len(listed) != 136:
        raise SystemExit(f"expected 136 FBS programs, found {len(listed)}")
    rows = duckdb.connect().execute(
        "SELECT DISTINCT school, division FROM read_parquet(?) WHERE school IS NOT NULL AND division IS NOT NULL",
        [str(PARQUET)],
    ).fetchall()
    fbs_keys = {}
    for _conference, name in listed:
        for key in lookup_keys(name, roster):
            fbs_keys.setdefault(key, set()).add(name)
    matched = {}
    unmatched = []
    for conference, name in listed:
        if name in CANON:
            matched[name] = CANON[name]
            continue
        keys = lookup_keys(name, roster)
        exact = roster.tokens(name)
        hits = []
        for school, _division in rows:
            if keys & lookup_keys(school, roster):
                hits.append(school)
        unique = sorted(set(hits))
        exact_hits = [school for school in unique if roster.tokens(school) == exact or roster.tokens(school) in keys]
        chosen = exact_hits if len(exact_hits) == 1 else unique
        if len(chosen) == 1:
            matched[name] = chosen[0]
        else:
            unmatched.append((name, unique))
    if unmatched:
        print("unmatched or ambiguous FBS names:")
        for name, schools in unmatched:
            print(f"  {name}: {schools}")
    labels = {}
    ambiguous = set()
    fbs_schools = set(matched.values())
    for school, division in rows:
        label = "FBS" if school in fbs_schools else division
        for key in lookup_keys(school, roster):
            if key in labels and labels[key] != label:
                ambiguous.add(key)
            else:
                labels[key] = label
    for name in [name for _conference, name in listed] + sorted(EXTRA_FBS):
        for key in lookup_keys(name, roster):
            if key in labels and labels[key] != "FBS":
                ambiguous.add(key)
            else:
                labels[key] = "FBS"
    for key in ambiguous:
        labels.pop(key, None)
    for alias, target in roster.ALIASES.items():
        if alias in ambiguous:
            continue
        target_keys = lookup_keys(target, roster)
        found = {labels[key] for key in target_keys if key in labels}
        if len(found) != 1:
            continue
        label = found.pop()
        if alias in labels and labels[alias] != label:
            labels.pop(alias, None)
            ambiguous.add(alias)
        else:
            labels[alias] = label
    OUT.write_text(json.dumps(labels, separators=(",", ":"), sort_keys=True))
    print(f"matched {len(matched)} of 136")
    print(f"wrote {len(labels)} keys, dropped {len(ambiguous)} ambiguous, fbs schools {len(fbs_schools)}")


if __name__ == "__main__":
    main()
