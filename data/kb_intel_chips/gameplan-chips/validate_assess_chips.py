#!/usr/bin/env python3
import sys, json
REQ = ["chip_id","type","source_doc","metadata","content"]
def validate_file(path):
    ok=0; bad=0; errs=[]
    with open(path,'r',encoding='utf-8') as f:
        for ln, line in enumerate(f, start=1):
            line=line.strip()
            if not line: continue
            try:
                obj=json.loads(line)
            except Exception as e:
                bad+=1; errs.append(f"Line {ln}: JSON error {e}"); continue
            miss=[k for k in REQ if k not in obj]
            if miss:
                bad+=1; errs.append(f"Line {ln}: Missing {miss}"); continue
            if not isinstance(obj["chip_id"], str): bad+=1; errs.append(f"Line {ln}: chip_id not str")
            if not isinstance(obj["type"], str): bad+=1; errs.append(f"Line {ln}: type not str")
            if not isinstance(obj["source_doc"], dict): bad+=1; errs.append(f"Line {ln}: source_doc not obj")
            if not isinstance(obj["metadata"], dict): bad+=1; errs.append(f"Line {ln}: metadata not obj")
            if not isinstance(obj["content"], str) or len(obj["content"].strip())<50:
                bad+=1; errs.append(f"Line {ln}: content too short"); continue
            ok+=1
    return ok,bad,errs
def main():
    files=sys.argv[1:] or []
    if not files:
        print("usage: validate_assess_chips.py file1.jsonl [file2.jsonl ...]"); return
    totals_ok=totals_bad=0
    for p in files:
        ok,bad,errs=validate_file(p)
        totals_ok+=ok; totals_bad+=bad
        print(f"[{p}] OK={ok} BAD={bad}")
        for e in errs[:10]:
            print("  -", e)
    print(f"TOTAL OK={totals_ok} BAD={totals_bad}")
if __name__ == "__main__":
    main()
