#!/usr/bin/env python3
import json, sys, os

REQUIRED = ["chip_id","type","source_doc","metadata","content"]

def validate_file(path):
    valid = 0
    invalid = 0
    errors = []
    line_no = 0
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line_no += 1
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except Exception as e:
                errors.append(f"{os.path.basename(path)}:L{line_no}: JSON parse error: {e}")
                invalid += 1
                continue
            missing = [k for k in REQUIRED if k not in obj]
            if missing:
                errors.append(f"{os.path.basename(path)}:L{line_no}: Missing fields: {missing}")
                invalid += 1
                continue
            if not isinstance(obj["chip_id"], str):
                errors.append(f"{os.path.basename(path)}:L{line_no}: chip_id must be string")
                invalid += 1; continue
            if not isinstance(obj["type"], str):
                errors.append(f"{os.path.basename(path)}:L{line_no}: type must be string")
                invalid += 1; continue
            if not isinstance(obj["source_doc"], dict):
                errors.append(f"{os.path.basename(path)}:L{line_no}: source_doc must be object")
                invalid += 1; continue
            if not isinstance(obj["metadata"], dict):
                errors.append(f"{os.path.basename(path)}:L{line_no}: metadata must be object")
                invalid += 1; continue
            if not isinstance(obj["content"], str) or len(obj["content"].strip()) < 50:
                errors.append(f"{os.path.basename(path)}:L{line_no}: content too short (<50 chars)")
                invalid += 1; continue
            valid += 1
    return valid, invalid, errors

def main():
    if len(sys.argv) < 2:
        print("Usage: validate_assess_gameplan_chips.py <file1.jsonl> [file2.jsonl ...]")
        sys.exit(2)
    total_v = total_i = 0
    all_errors = []
    for p in sys.argv[1:]:
        v,i,e = validate_file(p)
        total_v += v; total_i += i; all_errors.extend(e)
        print(f"[{os.path.basename(p)}] valid={v} invalid={i}")
    if all_errors:
        print("\nErrors:"); print("\n".join(all_errors))
    print(f"\nSummary: valid={total_v} invalid={total_i}")
    sys.exit(0 if total_i==0 else 1)

if __name__ == "__main__":
    main()
