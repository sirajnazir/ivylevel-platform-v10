#!/usr/bin/env python3
import json, sys, os, re

def tokens(s):
    return set(re.findall(r"[a-z0-9]+", s.lower()))

def jaccard(a, b):
    A = tokens(a); B = tokens(b)
    if not A and not B: return 0.0
    return len(A & B) / max(1, len(A | B))

def load_chips(paths):
    chips = []
    for p in paths:
        with open(p,"r",encoding="utf-8") as f:
            for line in f:
                line=line.strip()
                if not line: continue
                obj = json.loads(line)
                obj["_search_blob"] = (obj.get("content","") + " " + obj.get("insight_vector","")).strip()
                chips.append(obj)
    return chips

def main():
    if len(sys.argv) < 4:
        print("Usage: precision_probes_assess_gameplan.py <probes.json> <assess.jsonl> <gameplan.jsonl>")
        sys.exit(2)
    probes = json.load(open(sys.argv[1], "r", encoding="utf-8"))
    chips = load_chips(sys.argv[2:4])
    print(f"Loaded {len(chips)} chips.")
    results = []
    for q in probes["queries"]:
        scored = []
        for c in chips:
            score = jaccard(q["text"], c["_search_blob"])
            scored.append((score, c))
        scored.sort(key=lambda x: x[0], reverse=True)
        top = scored[:3]
        print(f"\nQuery: {q['text']}")
        for rank,(score,c) in enumerate(top, start=1):
            print(f"  {rank}. {c['chip_id']} [{c['type']}] score={score:.3f}")
        results.append((q["id"], top[0][0]))
    # Simple gate: all top-1 scores must be >= 0.10 in this offline check
    fails = [qid for qid, s in results if s < 0.10]
    print("\nGate: top1 ≥ 0.10")
    if fails:
        print("FAILED queries:", ", ".join(fails)); sys.exit(1)
    print("PASS"); sys.exit(0)

if __name__ == "__main__":
    main()
