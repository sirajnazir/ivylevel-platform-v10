# Assessment + Game Plan Intel Chips (v1.0)

This package contains two JSONL batches for the **Assessment** and **Game Plan** onboarding stages
for Jenny AI's digital twin. It follows KB v6 conventions and is ready for validation and embedding.

## Files
- `ASSESS_Intel_Chips_Batch_v1.jsonl` — 30 Assessment chips
- `GAMEPLAN_Intel_Chips_Batch_v1.jsonl` — 30 Game Plan chips
- `validate_assess_chips.py` — lightweight validator (KB v6 required fields)
- `embed_assess_chips.py` — stub embed script (wire to your embed pipeline)

## Namespace
Recommended: `KBv6_Assessment_2025-10-07_v1.0`

## Quick Start
```bash
python3 validate_assess_chips.py ASSESS_Intel_Chips_Batch_v1.jsonl GAMEPLAN_Intel_Chips_Batch_v1.jsonl
export PINECONE_INDEX="jenny-v3-3072-093025"
export NAMESPACE="KBv6_Assessment_2025-10-07_v1.0"
python3 embed_assess_chips.py ASSESS_Intel_Chips_Batch_v1.jsonl GAMEPLAN_Intel_Chips_Batch_v1.jsonl
```

## Schema (KB v6 subset)
Each line is a JSON object with:
- `chip_id` (str): e.g., `W001-DIAGNOSTIC-001`
- `type` (str): e.g., `Diagnostic_Chip`, `GamePlan_Framework_Chip`
- `family` (str): `assessment` or `gameplan`
- `source_doc` (obj): `{week, filename, date, phase}`
- `metadata` (obj): `{participants, duration, quality_score, confidence_score, phase_enum}`
- `content` (str): natural language content
- `insight_vector` (str): concise summary string (150–200 chars)
- `cross_links` (obj): `{jtbd, situation_tag, phase, week}`
- `tags` (array): labels

## Notes
- Content is derived from your uploaded assessment transcript, game‑plan PDF, and supporting intelligence docs.
- Chip IDs use week=001 convention to anchor the onboarding stage.
- Integrate this namespace into federated search with Sessions, Exec, and iMessage.
