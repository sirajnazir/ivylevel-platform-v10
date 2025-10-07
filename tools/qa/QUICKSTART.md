# KB QA Quick Start

## 🚀 Fast Commands

### 1. Smoke Test (10 seconds)
```bash
./tools/qa/smoke_tests.sh
```

### 2. Full QA Suite (3-5 minutes)
```bash
export PINECONE_INDEX="jenny-v3-3072-093025"
./tools/qa/run_qa_suite.sh
```

### 3. Individual Checks
```bash
# Vector counts only
python3 tools/qa/check_vector_counts.py

# Metadata integrity
python3 tools/qa/check_metadata_integrity.py

# Precision probes
python3 tools/qa/precision_probes_test.py

# Structural QA
python3 tools/qa/structural_qa.py
```

## ✅ Expected Results

### Smoke Tests
```
Test 1: Sessions - ✅ PASS (score ≥ 0.40)
Test 2: iMessage - ✅ PASS (score ≥ 0.35)
```

### Full Suite
```
Checks Run: 4
Passed: 4
Failed: 0
```

## 🔧 Environment Setup

```bash
# Required
export PINECONE_API_KEY="pcsk_..."
export OPENAI_API_KEY="sk-proj-..."

# Optional (defaults shown)
export PINECONE_INDEX="jenny-v3-3072-093025"
export NS_SESS="KBv6_2025-10-06_v1.0"
export NS_IMSG="KBv6_iMessage_2025-10-07_v1.0"
```

## 📊 Current KB State

| Namespace | Vectors | Chip Types |
|-----------|---------|------------|
| Sessions+Exec | 923 | Framework, Strategy, Tactic, Result, Silver |
| iMessage | 40 | Message_Template, Tone_Cue, Escalation_Pattern, Micro_Tactic, Turnaround_Case |

## 🐛 Troubleshooting

### "Resource jenny-v2 not found"
```bash
export PINECONE_INDEX="jenny-v3-3072-093025"
```

### Precision probes timeout
Reduce probe count or increase timeout in `precision_probes_test.py`

### API rate limits
Add delays between requests or use caching

## 📁 Where to Find Results

Latest QA run:
```bash
ls -lt data/kb_intel_chips/qa_runs/ | head -2
```

View summary:
```bash
cat data/kb_intel_chips/qa_runs/YYYYMMDD_HHMMSS/qa_summary.json | jq
```

## 🔗 Links

- **Full Docs:** `tools/qa/README.md`
- **Implementation Summary:** `KB_QA_IMPLEMENTATION_SUMMARY.md`
- **Probe Queries:** `tools/qa/precision_probes.json`
