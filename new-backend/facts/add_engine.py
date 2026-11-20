"""Add `engine` and `outcome` to records that are already generated (no Supabase needed).

Usage, from new-backend/facts/:
    python add_engine.py                      # every file in data/records/
    python add_engine.py 00Kia 04E5q          # just these puzzles
    python add_engine.py --depth 22 --stockfish /path/to/stockfish

Rewrites data/records/<id>.json in place and prints anything surprising
(a solution that isn't the engine's top move, or no single clear solution).
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import engine
from records import SCHEMA_VERSION, validate_document

HERE = Path(__file__).resolve().parent
DEFAULT_DIR = HERE / "data" / "records"


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("puzzle_ids", nargs="*", help="default: every file in --dir")
    ap.add_argument("--dir", type=Path, default=DEFAULT_DIR)
    ap.add_argument("--stockfish", help="path to the Stockfish binary (default: $STOCKFISH_PATH or PATH)")
    ap.add_argument("--depth", type=int, default=engine.DEPTH)
    args = ap.parse_args(argv)

    paths = ([args.dir / f"{pid}.json" for pid in args.puzzle_ids]
             or sorted(args.dir.glob("*.json")))
    missing = [p for p in paths if not p.is_file()]
    if missing:
        sys.exit(f"no records file: {', '.join(str(p) for p in missing)}")

    try:
        analyzer = engine.Analyzer(args.stockfish, depth=args.depth)
    except FileNotFoundError as e:
        sys.exit(str(e))

    flagged = []
    with analyzer:
        print(f"{analyzer.name}, depth {args.depth}, MultiPV {engine.MULTIPV}")
        for path in paths:
            doc = json.loads(path.read_text())
            for r in doc["records"]:
                r.setdefault("outcome", {})   # records from schema v1 had no `outcome`
            doc["schema_version"] = SCHEMA_VERSION
            warnings = engine.enrich_document(doc, analyzer)
            validate_document(doc)
            path.write_text(json.dumps(doc, indent=2) + "\n")
            for r in doc["records"]:
                e, o = r["engine"], r["outcome"]
                print(f"  {doc['puzzle_id']} {r['move_index']} {r['move_san']:7} "
                      f"top={e['lines'][0]['move']:7} gap: {e['gap']:22} "
                      f"clear={e['one_clear_solution']!s:5} | outcome {o}")
            for w in warnings:
                print(f"! {w}", file=sys.stderr)
            flagged += warnings

    print(f"\n{len(paths)} puzzle(s) updated, {len(flagged)} flag(s).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
