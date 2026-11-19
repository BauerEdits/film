"""Map roster school names to D1, D2, or D3 for the competition grade.

Uses the same CC0 football parquet and the same name variants as
build_roster_transfers.py. A name that matches two divisions is dropped.
"""

import importlib.util
import json
from pathlib import Path

import duckdb

ROOT = Path(__file__).resolve().parents[1]
PARQUET = Path("/tmp/ncaa/football.parquet")
OUT = ROOT / "server" / "data" / "school-divisions.json"


def main():
    spec = importlib.util.spec_from_file_location("roster", ROOT / "scripts" / "build_roster_transfers.py")
    roster = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(roster)
    rows = duckdb.connect().execute(
        "SELECT DISTINCT school, division FROM read_parquet(?) WHERE school IS NOT NULL AND division IS NOT NULL",
        [str(PARQUET)],
    ).fetchall()
    lookup = {}
    ambiguous = set()
    for school, division in rows:
        for key in roster.variants(school):
            if key in lookup and lookup[key] != division:
                ambiguous.add(key)
            else:
                lookup[key] = division
    for key in ambiguous:
        lookup.pop(key, None)
    for alias, target in roster.ALIASES.items():
        if alias in ambiguous:
            continue
        division = lookup.get(target)
        if not division:
            continue
        if alias in lookup and lookup[alias] != division:
            lookup.pop(alias, None)
            ambiguous.add(alias)
        else:
            lookup[alias] = division
    OUT.write_text(json.dumps(lookup, separators=(",", ":"), sort_keys=True))
    print(f"wrote {len(lookup)} keys, dropped {len(ambiguous)} ambiguous")


if __name__ == "__main__":
    main()
