
# iMessage KBv6 Re-embed (Clean V3) — Step-by-step

This run deletes the current iMessage namespace and re-embeds **with new chip types + situation tags**.

## ✅ What changed

- New chip types: `Micro_Tactic_Chip`, `Tone_Cue_Chip`, `Escalation_Pattern_Chip`, `Message_Template_Chip`, `Turnaround_Case_Chip`
- Added `situation_tag` for cross-linking (e.g., `deadline_crunch`, `parent_pushback`, `confidence_reset`)
- Forced `metadata.chip_family = "imessage"`
- Stable, human-readable IDs: `IMSG-<TYPE>-<hash>`; original ID preserved in `metadata.original_chip_id`

## 0) Prereqs

```
pip install --upgrade openai pinecone-client
export OPENAI_API_KEY="..."
export PINECONE_API_KEY="..."
export PINECONE_INDEX="jenny-v3-3072-093025"
```

## 1) Transform your existing iMessage chips → v3

If your two current files are here:
```
data/kb_intel_chips/imessage/iMessage_Intel_Chips_Batch_v1.jsonl
data/kb_intel_chips/imessage/iMessage_Intel_Chips_Batch_v2.jsonl
```

Run:
```
python /mnt/data/transform_imsg_chips_v3.py   --input data/kb_intel_chips/imessage/iMessage_Intel_Chips_Batch_v1.jsonl           data/kb_intel_chips/imessage/iMessage_Intel_Chips_Batch_v2.jsonl   --output data/kb_intel_chips/imessage/iMessage_Intel_Chips_Batch_v3.jsonl
```

This will:
- Normalize schema
- Infer new chip types (keyword heuristics)
- Add `situation_tag`
- Prefix IDs with `IMSG-` and keep `metadata.original_chip_id`

## 2) Delete current namespace and re-embed

We will **re-use** the same namespace for compatibility:
```
NAMESPACE="KBv6_iMessage_2025-10-07_v1.0"
python /mnt/data/embed_imsg_chips_v3.py   --input data/kb_intel_chips/imessage/iMessage_Intel_Chips_Batch_v3.jsonl   --namespace "$NAMESPACE"   --overwrite
```

This clears the namespace and upserts the transformed v3 chips.

## 3) Quick QA (precision probes)

- `deadline_crunch` → should surface Micro_Tactic_Chip(s) from late P4/P5
- `confidence reset` → Tone_Cue_Chip(s) from early P1 trust building
- `escalation after no response` → Escalation_Pattern_Chip(s)
- `thank you note template` → Message_Template_Chip(s)
- `turned around in 48 hours` → Turnaround_Case_Chip(s)

## 4) Federated search (backend)

Query both namespaces then pool + rerank:
- Sessions: `KBv6_2025-10-06_v1.0`
- iMessage: `KBv6_iMessage_2025-10-07_v1.0`

Use `metadata.chip_family in ["session","imessage"]` or a `source` toggle.

## 5) Situation taxonomy

See `/mnt/data/imsg_situations_taxonomy.json`; use as authoritative tag set.
