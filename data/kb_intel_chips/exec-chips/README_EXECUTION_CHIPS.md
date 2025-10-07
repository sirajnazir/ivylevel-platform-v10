# Execution Intel Chips (KB v6)

Generated: 2025-10-07

## Files
- exec_W007_TacticalSolutions_Intel_Chips.jsonl  (week_span 007–050)
- exec_W001_OutcomeCorrelationMap_Intel_Chips.jsonl (week_span 001–093)

## Local placement (next to Session chips)
Copy these into your repo under:
```
data/kb_intel_chips/execution/
```

Your existing embed job can include this folder by setting:
```
EMBED_INPUT_DIRS="data/kb_intel_chips/sessions,data/kb_intel_chips/execution"
PINECONE_NAMESPACE="KBv6_2025-10-06_v1.0"
```

## Schema
Each chip uses KB v6 fields:
- chip_id: W###-TYPE-### (range docs mapped to first week; `week_span` is in metadata)
- type ∈ {Insight_Chip, Strategy_Chip, Tactic_Chip, Trust_Chip, Adaptation_Chip, Framework_Chip, Result_Chip, Channel_Chip, Relatability_Chip, Silver_Bullet_Chip}
- source_doc: {week, filename, date, phase}
- metadata: {doc_type: EXEC-INTEL, week_span, quality_score, confidence_score}
- content: Natural language summary
- insight_vector: 120–200 char semantic teaser for embedding
