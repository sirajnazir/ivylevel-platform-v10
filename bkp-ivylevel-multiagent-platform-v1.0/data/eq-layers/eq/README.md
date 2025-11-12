# EQ Signal Data

This directory contains emotional intelligence (EQ) analysis files extracted from real Jenny conversations.

## Directory Structure

- **`imsg/`** - iMessage conversation analysis (7 files from P5-SENIOR phase)
- **`sessions/`** - Session transcript analysis (future)

## File Format

Each JSON file contains:
- `student_id` - Student identifier
- `source` - Phase/week metadata
- `conversation_summary` - High-level summary
- `utterance_spans` - Turn-by-turn dialogue with cues
- `speech_patterns` - Aggregate pattern counts and exemplars
- `coaching_intelligence` - Tactic deployments (rejection_sandwich, celebration_explosion_peak, etc.)

## Usage

1. Drop EQ JSON files into the appropriate directory
2. Run ingestion: `python apps/ingest/ingest_eq_json.py`
3. Signals are stored in `eq_signal_sets`, `eq_signals`, `eq_utterances` tables
4. Runtime guards read from these tables to apply humanizer rules

## Provenance Chain

```
EQ JSON file → eq_signal_sets (parent container)
             ├→ eq_signals (cue counts + exemplars)
             └→ eq_utterances (turn-level spans with move types)
```

All signals include `provenance` JSONB linking back to source file + line anchors.
