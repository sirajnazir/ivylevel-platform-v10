#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
prepare_ft_dataset.py
Universal dedupe + stratified split + curriculum-weighted sampling without literal duplicates.
Inputs: final_v8_core.jsonl, final_v8_med.jsonl
Outputs:
  data/training/ft_train.jsonl
  data/training/ft_val.jsonl
  data/training/ft_test.jsonl
  data/training/ft_eval_sample.jsonl   (for quick eval prompts)
  data/training/ft_train_weighted.jsonl (weighted mix without exact duplicates)
"""

import json, hashlib, random, os, math
from pathlib import Path

BASE = Path("data/training")
CORE = BASE / "final_v8_core.jsonl"
MED  = BASE / "final_v8_med.jsonl"
OUT  = {
  "train": BASE / "ft_train.jsonl",
  "val":   BASE / "ft_val.jsonl",
  "test":  BASE / "ft_test.jsonl",
  "eval":  BASE / "ft_eval_sample.jsonl",
  "weighted": BASE / "ft_train_weighted.jsonl",
}

random.seed(42)

def load_jsonl(p: Path):
    items=[]
    with open(p, "r", encoding="utf-8") as f:
        for ln, line in enumerate(f,1):
            line=line.strip()
            if not line: continue
            obj=json.loads(line)
            obj["_source_file"]=p.name
            obj["_line"]=ln
            items.append(obj)
    return items

def pair_hash(rec):
    # hash user+assistant content only so dedupe doesn't depend on system wording
    msgs = rec.get("messages", [])
    pair = tuple((m.get("role"), m.get("content")) for m in msgs if m.get("role") in ("user","assistant"))
    h = hashlib.sha256(json.dumps(pair, ensure_ascii=False).encode()).hexdigest()
    return h

def dedupe(records):
    seen=set()
    out=[]
    for r in records:
        h = pair_hash(r)
        if h in seen:
            continue
        seen.add(h)
        r["_phash"]=h
        out.append(r)
    return out

def write_jsonl(path, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        for r in rows:
            # scrub helper fields
            r.pop("_phash", None)
            r.pop("_source_file", None)
            r.pop("_line", None)
            r.pop("_tier", None)
            f.write(json.dumps(r, ensure_ascii=False) + "\n")

def stratified_split(records, train_p=0.85, val_p=0.10, test_p=0.05):
    # crude stratification based on prompt length bucket + presence of "cite/verify" keywords
    buckets = {}
    for r in records:
        msgs = r.get("messages", [])
        user = next((m["content"] for m in msgs if m.get("role")=="user"), "")
        ulen = len(user.split())
        if any(k in user.lower() for k in ["cite", "verify", "source", "proof", "evidence"]):
            key=("proofy", min(100, (ulen//10)*10))
        else:
            key=("coaching", min(100, (ulen//10)*10))
        buckets.setdefault(key, []).append(r)

    train, val, test = [], [], []
    for key, rows in buckets.items():
        random.shuffle(rows)
        n=len(rows)
        n_train = max(0, int(round(n*train_p)))
        n_val   = max(0, int(round(n*val_p)))
        n_test  = max(0, n - n_train - n_val)
        train += rows[:n_train]
        val   += rows[n_train:n_train+n_val]
        test  += rows[n_train+n_val:n_train+n_val+n_test]
    return train, val, test

def curriculum_weighted_sample(train_core, train_med, core_weight=2, med_weight=1):
    """
    Build a weighted training set WITHOUT literal duplicates by over-sampling from core buckets.
    If sampling repeats, we allow same (phash) at most 2x across the entire file (soft cap).
    """
    # bucket by prompt length and topic to diversify sampling
    def bucketize(rows):
        buckets={}
        for r in rows:
            msgs = r.get("messages", [])
            user = next((m["content"] for m in msgs if m.get("role")=="user"), "")
            ulen = len(user.split())
            topic = "proofy" if any(k in user.lower() for k in ["cite","verify","source","proof","evidence"]) else "coaching"
            key=(topic, min(100, (ulen//10)*10))
            buckets.setdefault(key, []).append(r)
        return buckets

    b_core = bucketize(train_core)
    b_med  = bucketize(train_med)

    # target size ≈ core*2 + med*1
    target = len(train_core)*core_weight + len(train_med)*med_weight
    out=[]
    allowed_counts={}
    def add_row(r):
        h=r["_phash"]
        if allowed_counts.get(h,0) >= 2:
            return False
        out.append(r)
        allowed_counts[h]=allowed_counts.get(h,0)+1
        return True

    # round-robin sampler
    keys = sorted(set(list(b_core.keys()) + list(b_med.keys())))
    idx_map = {k: {"core":0, "med":0} for k in keys}

    while len(out) < target and keys:
        for k in list(keys):
            # sample core twice
            for _ in range(core_weight):
                rows=b_core.get(k,[])
                if rows:
                    r=rows[idx_map[k]["core"] % len(rows)]
                    add_row(r)
                    idx_map[k]["core"]+=1
            # sample med once
            rows=b_med.get(k,[])
            if rows:
                r=rows[idx_map[k]["med"] % len(rows)]
                add_row(r)
                idx_map[k]["med"]+=1
            if len(out)>=target: break

    # drop helper fields before write in write_jsonl()
    return out

def main():
    core = load_jsonl(CORE)
    med  = load_jsonl(MED)

    # de-dupe each, mark with tier before union
    core_d = dedupe(core)
    med_d  = dedupe(med)

    # Mark tier before deduping union (so we know which came from core vs med)
    for r in core_d:
        r["_tier"] = "core"
    for r in med_d:
        r["_tier"] = "med"

    union  = dedupe(core_d + med_d)

    # split
    train, val, test = stratified_split(union)

    # also generate a small eval set of 50 for quick A/B prompts
    eval_sample = random.sample(union, k=min(50, len(union)))

    # curriculum-weighted train WITHOUT literal duplicates
    # (uses tier provenance retained to this point)
    train_core = [r for r in train if r.get("_tier")=="core"]
    train_med  = [r for r in train if r.get("_tier")=="med"]
    weighted   = curriculum_weighted_sample(train_core, train_med, core_weight=2, med_weight=1)

    # write base splits
    write_jsonl(OUT["train"], train)
    write_jsonl(OUT["val"],   val)
    write_jsonl(OUT["test"],  test)
    write_jsonl(OUT["eval"],  eval_sample)
    write_jsonl(OUT["weighted"], weighted)

    print(json.dumps({
        "counts": {
            "core_raw": len(core),
            "core_dedup": len(core_d),
            "med_raw": len(med),
            "med_dedup": len(med_d),
            "union_dedup": len(union),
            "train": len(train),
            "val": len(val),
            "test": len(test),
            "weighted_train": len(weighted),
            "eval_sample": len(eval_sample)
        }
    }, indent=2))

if __name__ == "__main__":
    main()
