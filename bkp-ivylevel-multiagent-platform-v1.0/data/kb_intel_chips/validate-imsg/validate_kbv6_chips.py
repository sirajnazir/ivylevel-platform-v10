#!/usr/bin/env python3
import argparse, json, glob, os, re, sys
from pathlib import Path
from typing import Dict, Any, List, Tuple

ALLOWED_TYPES = {
    "Insight_Chip","Strategy_Chip","Tactic_Chip","Trust_Chip","Adaptation_Chip",
    "Framework_Chip","Result_Chip","Channel_Chip","Relatability_Chip","Silver_Bullet_Chip",
    "Tone_Style_Chip","Microtactic_Chip","Boundary_Chip","Crisis_Intervention_Chip",
    "Decision_Framework_Chip","Accountability_Chip",
}
PHASE_ENUM = {"FOUNDATION","BUILDING","JUNIOR","SUMMER","SENIOR"}
REQUIRED_CHIP_KEYS = {"chip_id","type","source_doc","metadata","content","insight_vector"}
REQUIRED_SOURCE_DOC = {"week","filename","date","phase"}
REQUIRED_METADATA = {"participants","duration"}

def read_jsonl(path: Path):
    records = []
    with path.open("r", encoding="utf-8") as f:
        for i, line in enumerate(f, 1):
            line = line.strip()
            if not line: 
                continue
            try:
                obj = json.loads(line)
                records.append(obj)
            except Exception as e:
                records.append({"_error": f"JSON parse error on line {i}: {e}", "_raw": line})
    return records

def validate_chip(chip: Dict[str, Any]):
    errs = []
    if "_error" in chip:
        errs.append(chip["_error"]); return errs
    missing = REQUIRED_CHIP_KEYS - chip.keys()
    if missing: errs.append(f"Missing top-level keys: {sorted(missing)}")
    t = chip.get("type")
    if t not in ALLOWED_TYPES:
        errs.append(f"Invalid type: {t}")
    cid = chip.get("chip_id")
    if not cid or not isinstance(cid, str):
        errs.append("chip_id must be a non-empty string")
    else:
        if not re.match(r"^W\d{3}-[A-Z]+-\d{3}$", cid):
            errs.append(f"chip_id '{cid}' should match pattern W###-SECTION-###")
    sd = chip.get("source_doc")
    if not isinstance(sd, dict): errs.append("source_doc must be an object")
    else:
        miss_sd = REQUIRED_SOURCE_DOC - sd.keys()
        if miss_sd: errs.append(f"source_doc missing keys: {sorted(miss_sd)}")
    md = chip.get("metadata")
    if not isinstance(md, dict): errs.append("metadata must be an object")
    else:
        miss_md = REQUIRED_METADATA - md.keys()
        if miss_md: errs.append(f"metadata missing keys: {sorted(miss_md)}")
        if "quality_score" in md and not (0 <= md["quality_score"] <= 1): errs.append("quality_score must be 0-1")
        if "confidence_score" in md and not (0 <= md["confidence_score"] <= 1): errs.append("confidence_score must be 0-1")
        if "phase_enum" in md and md["phase_enum"] not in PHASE_ENUM: errs.append(f"phase_enum '{md['phase_enum']}' invalid")
    content = chip.get("content","")
    iv = chip.get("insight_vector","")
    if not isinstance(content, str) or len(content.strip()) < 40: errs.append("content should be >=40 chars")
    if not isinstance(iv, str) or not (40 <= len(iv) <= 300): errs.append("insight_vector 40-300 chars")
    return errs

def collect_from_glob(root: Path, pattern: str):
    out = []
    for file in sorted(root.glob(pattern)):
        for r in read_jsonl(file):
            out.append((file, r))
    return out

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=".")
    ap.add_argument("--sessions_glob", default="sessions/*.jsonl")
    ap.add_argument("--imessage_glob", default="iMessage/*.jsonl")
    ap.add_argument("--out", default="report_kbv6.json")
    args = ap.parse_args()
    root = Path(args.root)

    batches = {
        "sessions": collect_from_glob(root, args.sessions_glob),
        "iMessage": collect_from_glob(root, args.imessage_glob),
    }

    dup = {}
    stats = {"total":0,"valid":0,"invalid":0,"by_batch":{"sessions":0,"iMessage":0}}
    details = []

    for bname, items in batches.items():
        for file_path, chip in items:
            stats["total"] += 1
            stats["by_batch"][bname] += 1
            errs = validate_chip(chip)
            cid = chip.get("chip_id")
            if cid:
                if cid in dup:
                    errs.append(f"Duplicate chip_id across files (also in {dup[cid]})")
                else:
                    dup[cid] = file_path.name
            if errs: stats["invalid"] += 1
            else: stats["valid"] += 1
            details.append({"file": str(file_path), "chip_id": cid, "type": chip.get("type"), "errors": errs})

    report = {"summary": stats, "details": details, "scanned":{"root": str(root), "sessions_glob": args.sessions_glob, "imessage_glob": args.imessage_glob}}
    out_path = Path(args.out)
    out_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"KBv6 Validator Report -> {out_path}")
    print(json.dumps(stats, indent=2))
    invalid = [d for d in details if d["errors"]]
    if invalid:
        print("\nFirst 10 issues:")
        for d in invalid[:10]:
            print(f"- {d['chip_id']} in {d['file']}: {d['errors']}")
    else:
        print("\nAll chips passed validation.")

if __name__ == "__main__":
    main()
