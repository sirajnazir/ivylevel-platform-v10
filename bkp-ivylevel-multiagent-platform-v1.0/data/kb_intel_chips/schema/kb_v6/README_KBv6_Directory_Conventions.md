
# KBv6 Directory Conventions

## Directory Structure
```
data/canonical/jenny-huda/kb_v6/
├── chips/
│   ├── P1-FOUNDATION/
│   │   ├── W001/
│   │   │   ├── W001_Intel_Chips_Batch_v1.jsonl
│   │   │   └── W001_Processing_Summary_v1.json
│   ├── P2-BUILDING/
│   ├── P3-SHOWCASE/
│   └── P4-APPLICATION/
└── schema/
    ├── intel_chip.schema.json
    ├── batch_summary.schema.json
    ├── batch_file.schema.json
    ├── validate_chips.py
    └── README_KBv6_Directory_Conventions.md
```

### File Naming Pattern
- `W{week}_Intel_Chips_Batch_v{version}.jsonl`
- `W{week}_Processing_Summary_v{version}.json`

### Validation Command
```bash
cd data/canonical/schema/kb_v6
python3 validate_chips.py ../../jenny-huda/kb_v6/chips/P1-FOUNDATION/W001
```
