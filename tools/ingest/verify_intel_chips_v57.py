#!/usr/bin/env python3
"""
verify_intel_chips_v57.py

Offline verifier for "intel chips" produced by ingest_intelligence_v57.py.
- Validates schema/fields
- Runs content heuristics per folder_kind and chip subtype
- Checks filename ↔ metadata coherence
- Emits CSV + JSON report with pass/fail and actionable messages
"""

import argparse, json, re, csv, sys
from datetime import datetime
from typing import List, Dict, Any, Tuple, Optional

ALLOWED_FOLDER_KINDS = {"GAMEPLAN_INTEL","EXEC_INTEL","SESSION_INTEL","IMSG_INTEL","UNKNOWN"}
ALLOWED_EXTS = {"json","docx","pdf","txt"}
ALLOWED_CHIP_TYPES = {"ASSESSMENT_SESSION","ASSESSMENT_TRANSLATION","GAMEPLAN_CREATION","GAMEPLAN_ARCHITECTURE"}

# --- Helpers -----------------------------------------------------------------

def is_date(s: str) -> bool:
    try:
        datetime.strptime(s, "%Y-%m-%d")
        return True
    except Exception:
        return False

def looks_narrative(txt: str) -> bool:
    if not txt:
        return False
    # Not a raw JSON or PK ZIP header
    if txt.lstrip().startswith("{") or txt.lstrip().startswith("["):
        return False
    if txt.lstrip().startswith("PK\x03\x04"):
        return False
    # Should have spaces and punctuation typical of prose
    score = 0
    score += 1 if " " in txt.strip() else 0
    score += 1 if any(p in txt for p in [".","!","?"]) else 0
    return score >= 2

def count_term(txt: str, term: str) -> int:
    return len(re.findall(re.escape(term), txt, flags=re.IGNORECASE))

def extract_from_filename(fname: str) -> Dict[str, Optional[str]]:
    out = {"date": None, "week": None, "phase": None}
    mdate = re.search(r"(\d{4}-\d{2}-\d{2})", fname)
    if mdate: out["date"] = mdate.group(1)
    mweek = re.search(r"_W(\d{1,3})", fname)
    if mweek: out["week"] = mweek.group(1)
    mphase = re.search(r"_(P\d-[A-Z]+)", fname)
    if mphase: out["phase"] = mphase.group(1)
    return out

def looks_like_speakers(txt: str) -> bool:
    # crude heuristic: look for two unique "speaker:" patterns or specific names
    speakers = set()
    for who in ["Jenny", "Huda", "Coach", "Student"]:
        if count_term(txt, who + ":") > 1 or count_term(txt, who+" ") > 4:
            speakers.add(who)
    return len(speakers) >= 2

# --- Validation rules ---------------------------------------------------------

def validate_record(rec: Dict[str, Any]) -> Tuple[bool, List[str], Dict[str, Any]]:
    errors: List[str] = []
    warnings: List[str] = []
    meta: Dict[str, Any] = {}

    # Required keys
    required = ["file_path","file_name","folder_kind","source_ext","narrative_text","parse_success"]
    for k in required:
        if k not in rec:
            errors.append(f"missing field: {k}")

    # Basic enums
    fk = rec.get("folder_kind")
    if fk and fk not in ALLOWED_FOLDER_KINDS:
        errors.append(f"folder_kind not allowed: {fk}")

    ext = rec.get("source_ext")
    if ext and ext not in ALLOWED_EXTS:
        warnings.append(f"source_ext uncommon: {ext}")

    # parse_success + narrative checks
    parse_success = bool(rec.get("parse_success"))
    narrative = rec.get("narrative_text") or ""
    if parse_success is False:
        warnings.append("parse_success is false")
    if not looks_narrative(narrative):
        errors.append("narrative_text does not look like natural text (maybe raw JSON/PK?)")

    # length
    n_chars = int(rec.get("narrative_chars") or len(narrative))
    if n_chars < 200:
        warnings.append(f"narrative seems short ({n_chars} chars)")

    # date/week/phase formats
    date = rec.get("date")
    if date and not is_date(date):
        errors.append(f"date invalid format: {date}")
    week = rec.get("week")
    if week and not re.fullmatch(r"\d{1,3}", str(week)):
        errors.append(f"week invalid: {week}")
    phase = rec.get("phase")
    if phase and not re.fullmatch(r"P\d-[A-Z]+", phase):
        warnings.append(f"phase nonstandard: {phase}")

    # filename ↔ extracted metadata sanity
    fname = rec.get("file_name", "")
    fmeta = extract_from_filename(fname)
    if fmeta["date"] and date and fmeta["date"] != date:
        warnings.append(f"filename date {fmeta['date']} != record date {date}")
    if fmeta["week"] and week and fmeta["week"] != str(week):
        warnings.append(f"filename week {fmeta['week']} != record week {week}")
    if fmeta["phase"] and phase and fmeta["phase"] != phase:
        warnings.append(f"filename phase {fmeta['phase']} != record phase {phase}")

    # subtype rules (GamePlan only)
    chip = rec.get("intel_chip_type")
    if fk == "GAMEPLAN_INTEL":
        if chip and chip not in ALLOWED_CHIP_TYPES:
            errors.append(f"intel_chip_type not allowed for GamePlan: {chip}")
        # Heuristic content checks
        t = narrative.lower()
        if chip == "ASSESSMENT_SESSION":
            if not any(w in t for w in ["assessment","diagnostic","initial","week 1","w001"]):
                warnings.append("ASSESSMENT_SESSION heuristic terms not found")
        elif chip == "ASSESSMENT_TRANSLATION":
            if "translation" not in t and "assessment-to-gameplan" not in t:
                warnings.append("ASSESSMENT_TRANSLATION heuristic terms not found")
        elif chip == "GAMEPLAN_CREATION":
            if not any(w in t for w in ["gameplan creation","game plan creation","we created the gameplan","we finalized the gameplan","goals"]):
                warnings.append("GAMEPLAN_CREATION heuristic terms not found")
        elif chip == "GAMEPLAN_ARCHITECTURE":
            if not any(w in t for w in ["architecture","pillars","tracks","workstreams","roadmap"]):
                warnings.append("GAMEPLAN_ARCHITECTURE heuristic terms not found")
        else:
            warnings.append("GamePlan record missing intel_chip_type")

    # Folder-specific heuristics
    if fk == "SESSION_INTEL":
        if not looks_like_speakers(narrative):
            warnings.append("session transcript does not clearly show multiple speakers (Jenny/Huda)")

    if fk == "IMSG_INTEL":
        # iMessage linguistic DNA sanity signals
        markers = 0
        for term in ["No worries", "no worries", "What do you think", "we keep going", "Sounds good", "That's exciting"]:
            markers += 1 if term.lower() in narrative.lower() else 0
        if markers == 0:
            warnings.append("iMessage intel: no common Jenny phrases detected")
        # Exclamation calibration sanity
        excl = narrative.count("!")
        if excl == 0:
            warnings.append("iMessage intel: no exclamation marks detected")

    if fk == "EXEC_INTEL":
        # Should mention frameworks/tactics/outcomes
        if not any(w in narrative.lower() for w in ["framework", "tactic", "outcome", "result", "playbook"]):
            warnings.append("execution intel: expected framework/tactic/outcome terms not detected")

    meta["warnings"] = warnings
    return (len(errors) == 0, errors, meta)

# --- Main --------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--jsonl", required=True, help="Path to intel_ingestion.jsonl (v5.7 output)")
    ap.add_argument("--report-csv", default="intel_verification_report.csv")
    ap.add_argument("--report-json", default="intel_verification_report.json")
    ap.add_argument("--fail-on", choices=["none","errors","errors_or_warnings"], default="errors",
                    help="Exit non-zero on errors or on any problems")
    args = ap.parse_args()

    total = 0
    ok = 0
    warn = 0
    bad = 0
    rows: List[Dict[str, Any]] = []
    jrows: List[Dict[str, Any]] = []

    with open(args.jsonl, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            total += 1
            try:
                rec = json.loads(line)
            except Exception as e:
                bad += 1
                rows.append({
                    "file_name":"<unparsed>",
                    "file_path":"<unparsed>",
                    "folder_kind":"<unknown>",
                    "intel_chip_type":"<unknown>",
                    "status":"ERROR",
                    "errors":f"invalid JSON line: {e}",
                    "warnings":"",
                })
                jrows.append({"status":"ERROR","errors":[f"invalid JSON line: {str(e)}"],"record":None})
                continue

            passed, errors, meta = validate_record(rec)
            warnings = meta.get("warnings", [])
            status = "OK" if (passed and not warnings) else "WARN" if passed else "ERROR"
            if status == "OK": ok += 1
            elif status == "WARN": warn += 1
            else: bad += 1

            rows.append({
                "file_name": rec.get("file_name",""),
                "file_path": rec.get("file_path",""),
                "folder_kind": rec.get("folder_kind",""),
                "intel_chip_type": rec.get("intel_chip_type",""),
                "status": status,
                "errors": "; ".join(errors),
                "warnings": "; ".join(warnings),
                "narrative_chars": rec.get("narrative_chars",""),
                "date": rec.get("date",""),
                "week": rec.get("week",""),
                "phase": rec.get("phase",""),
            })
            jrows.append({"status":status,"errors":errors,"warnings":warnings,"record":rec})

    # Write CSV
    with open(args.report_csv, "w", newline="", encoding="utf-8") as cf:
        w = csv.DictWriter(cf, fieldnames=list(rows[0].keys()) if rows else [])
        if rows: w.writeheader()
        for r in rows: w.writerow(r)

    # Write JSON
    with open(args.report_json, "w", encoding="utf-8") as jf:
        json.dump({
            "summary": {"total": total, "ok": ok, "warn": warn, "error": bad},
            "rows": jrows
        }, jf, ensure_ascii=False, indent=2)

    print(f"\n📊 Verification Summary:")
    print(f"   Total: {total}")
    print(f"   OK: {ok}")
    print(f"   WARN: {warn}")
    print(f"   ERROR: {bad}")
    print(f"\n📝 Reports:")
    print(f"   CSV: {args.report_csv}")
    print(f"   JSON: {args.report_json}")

    # Exit code policy
    if args.fail_on == "errors":
        sys.exit(0 if bad == 0 else 2)
    elif args.fail_on == "errors_or_warnings":
        sys.exit(0 if (bad == 0 and warn == 0) else 3)
    else:
        sys.exit(0)

if __name__ == "__main__":
    main()
