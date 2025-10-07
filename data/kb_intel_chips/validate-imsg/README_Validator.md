# KBv6 Chips Validator

This validator checks your **Session** and **iMessage** Intel Chips before embedding.

## What it does
- Validates schema for each chip (required keys, allowed types, enums)
- Ensures `insight_vector` is a compact summary (40–300 chars)
- Confirms `content` looks like natural language (>= 40 chars)
- Detects **duplicate `chip_id`** across batches
- Produces a machine-readable JSON report + CLI summary

## Install & Run
From the `KBv6` folder that contains `sessions/` and `iMessage/`:

```bash
python KBv6/tools/validate_kbv6_chips.py   --root KBv6   --sessions_glob "sessions/*.jsonl"   --imessage_glob "iMessage/*.jsonl"   --out KBv6/report_kbv6.json
```

If your files are elsewhere:
```bash
python KBv6/tools/validate_kbv6_chips.py   --root /absolute/path/to/KBv6   --sessions_glob "sessions/*.jsonl"   --imessage_glob "iMessage/*.jsonl"   --out /absolute/path/to/KBv6/report_kbv6.json
```

## Notes
- Allowed types include the 10 Session types and 6 iMessage types (`Tone_Style_Chip`, `Microtactic_Chip`, `Boundary_Chip`, `Crisis_Intervention_Chip`, `Decision_Framework_Chip`, `Accountability_Chip`).
- `phase_enum` is optional but, if present, must be one of: `FOUNDATION, BUILDING, JUNIOR, SUMMER, SENIOR`.
