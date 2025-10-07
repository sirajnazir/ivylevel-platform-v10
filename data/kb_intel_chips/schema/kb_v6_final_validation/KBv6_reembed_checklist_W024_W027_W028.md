
# KBv6 → Pinecone Re-Embed Checklist (Weeks 24, 27, 28)

This checklist re-validates and re-embeds **only** the three corrected weeks.

## 1) Place the corrected files
Put these files in your KB root next to the other weeks:

```
KBv6/
  sessions/
    W024_Intel_Chips_Batch_v1.jsonl
    W027_Intel_Chips_Batch_v1.jsonl
    W028_Intel_Chips_Batch_v1.jsonl
```

> If you're keeping prior broken files for audit, move them to: `KBv6/archive/`

## 2) Run validation (KBv6 schema)
Example command (adjust paths to your repo structure):

```bash
python tools/validate_kb_v6_chips.py   --root KBv6   --sessions_glob "sessions/W0{24,27,28}_Intel_Chips_Batch_v1.jsonl"   --out KBv6/reports/kb_v6_validation_reembed_W024_W027_W028.json
```

Expected results:
- files_passed: 3
- files_failed: 0
- chips_invalid: 0

## 3) Re-embed ONLY these weeks
(Overwrite in your Pinecone namespace.)

```bash
python tools/embed_kb_v6_to_v8.py   --input_glob "KBv6/sessions/W0{24,27,28}_Intel_Chips_Batch_v1.jsonl"   --namespace kb_v6_prod   --embed_model text-embedding-3-large   --overwrite true   --batch_size 64   --upsert
```

**Tip:** Keep a run log:
```
KBv6/reports/embed_runs/
  2025-10-06_reembed_W024_W027_W028.json
```

## 4) Smoke test retrieval
Run 2–3 representative queries per week to confirm signal quality increased:

- W024: `"168-hour framework"`, `"time audit two hours per day"`
- W027: `"NCWIT narrative surgery"`, `"first-principles pivot"`
- W028: `"Notre Dame seminar app tactics"`, `"parent validation quote"`

```bash
python tools/search_kb_v8.py   --namespace kb_v6_prod   --top_k 5   --queries "168-hour framework" "NCWIT narrative surgery" "Notre Dame seminar app tactics"
```

Expect: Top-5 include at least one chip from each targeted week.

## 5) Archive artifacts
- Move validator output to: `KBv6/reports/`
- Save embed job output + Pinecone upsert counts
- Commit corrected weeks with message:
  `fix(kb-v6): normalize W024/W027/W028 chips to schema; re-embed`

---

### Rollback Plan
If retrieval quality regresses:
1. Restore previous namespace snapshot (if using Pinecone collections/snapshots).
2. Re-run embed with last known good batches.
3. File follow-up issue with the diff of chips that changed (IDs + content hash).

---

### Notes
- The validator is intentionally tolerant of JSONL quirks; keep the canonical source as **valid JSONL** with one chip per line.
- Maintain unique `chip_id`s; the validator checks duplicates within a file, but CI should also guard cross-file uniqueness.
