#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
eval_tone_proof.py
Quick evaluation harness for tone & proof behaviors.
"""

import json, re, statistics, sys
from pathlib import Path

EVAL = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("data/training/ft_eval_sample.jsonl")

def heuristic_tone_score(text: str) -> float:
    # crude tone heuristic: warmth markers + avoidance of harsh negations
    warm = len(re.findall(r"\b(thank|appreciate|glad|together|let's|we can|i hear)\b", text.lower()))
    harsh = len(re.findall(r"\b(stupid|dumb|lazy|worthless)\b", text.lower()))
    return max(0.0, min(1.0, 0.5 + 0.1*warm - 0.2*harsh))

def heuristic_proof_score(text: str) -> float:
    # looks for proof cues (not perfect but useful)
    cues = sum(
        c in text.lower()
        for c in ["source:", "verified", "citation", "proof", "evidence", "as of ", "on ", "per "]
    )
    return max(0.0, min(1.0, 0.3 + 0.1*cues))

def main():
    items=[json.loads(l) for l in open(EVAL,"r",encoding="utf-8")]
    asst = []
    for it in items:
        a = next((m["content"] for m in it["messages"] if m["role"]=="assistant"), "")
        asst.append(a)
    tones=[heuristic_tone_score(t) for t in asst]
    proofs=[heuristic_proof_score(t) for t in asst]
    print(json.dumps({
        "eval_count": len(asst),
        "tone_mean": statistics.mean(tones) if tones else None,
        "proof_mean": statistics.mean(proofs) if proofs else None
    }, indent=2))

if __name__ == "__main__":
    main()
