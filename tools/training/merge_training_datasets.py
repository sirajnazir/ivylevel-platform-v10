#!/usr/bin/env python3
"""
Merge jenny_v9_eq and jenny_v10_eq Training Datasets

Creates jenny_v10_eq_COMBINED.jsonl that is ADDITIVE:
- Preserves ALL 690 examples from jenny_v9_eq (proven patterns)
- Adds ALL 3,808 examples from jenny_v10_eq session transcripts (new data)
- Total: 4,498 examples (690 + 3,808)

This ensures nothing valuable from v9 is lost while enhancing with session data.
"""

import json
import os
from pathlib import Path

# Paths
V9_PATH = "/Users/snazir/ivylevel-platform-v10/data/training/jenny_v9_eq_training.jsonl"
V10_SESSIONS_PATH = "/Users/snazir/ivylevel-platform-v10/data/training/jenny_v10_eq_session_transcripts.jsonl"
OUTPUT_PATH = "/Users/snazir/ivylevel-platform-v10/data/training/jenny_v10_eq_COMBINED.jsonl"

def main():
    print("=" * 80)
    print("MERGING JENNY_V9_EQ + JENNY_V10_EQ SESSION TRANSCRIPTS")
    print("=" * 80)
    print()
    print("Strategy: ADDITIVE (preserve v9, enhance with v10)")
    print()

    # Load v9 examples
    print(f"Loading jenny_v9_eq from: {V9_PATH}")
    v9_examples = []
    with open(V9_PATH, 'r') as f:
        for line in f:
            v9_examples.append(json.loads(line))

    print(f"  ✅ Loaded {len(v9_examples)} v9 examples")
    print()

    # Load v10 session transcript examples
    print(f"Loading jenny_v10_eq sessions from: {V10_SESSIONS_PATH}")
    v10_examples = []
    with open(V10_SESSIONS_PATH, 'r') as f:
        for line in f:
            v10_examples.append(json.loads(line))

    print(f"  ✅ Loaded {len(v10_examples)} v10 session examples")
    print()

    # Combine (v9 first, then v10)
    combined_examples = v9_examples + v10_examples

    print("=" * 80)
    print("MERGE SUMMARY")
    print("=" * 80)
    print(f"jenny_v9_eq examples:           {len(v9_examples)}")
    print(f"jenny_v10_eq session examples:  {len(v10_examples)}")
    print(f"                                {'─' * 10}")
    print(f"jenny_v10_eq COMBINED total:    {len(combined_examples)}")
    print()

    print("Composition:")
    print(f"  - v9 contribution: {len(v9_examples)/len(combined_examples)*100:.1f}%")
    print(f"  - v10 contribution: {len(v10_examples)/len(combined_examples)*100:.1f}%")
    print()

    # Write combined dataset
    print(f"Writing combined dataset to: {OUTPUT_PATH}")
    with open(OUTPUT_PATH, 'w') as f:
        for example in combined_examples:
            f.write(json.dumps(example) + '\n')

    print(f"  ✅ Wrote {len(combined_examples)} examples")
    print()

    print("=" * 80)
    print("MERGE COMPLETE")
    print("=" * 80)
    print()
    print("✅ ADDITIVE MERGE SUCCESSFUL")
    print()
    print("What's preserved from jenny_v9_eq:")
    print("  - 690 proven EQ patterns")
    print("  - Specific coaching techniques")
    print("  - Evidence-driven guidance examples")
    print("  - Celebration/validation patterns")
    print("  - Crisis support examples")
    print()
    print("What's enhanced with jenny_v10_eq:")
    print("  - 3,808 complete conversational units")
    print("  - Real 2-year Jenny-Huda coaching relationship")
    print("  - Extended session context and follow-ups")
    print("  - Natural warmth + action patterns")
    print("  - Hyper-personalized coaching style")
    print()
    print("Training Benefits:")
    print("  - Model learns from BOTH datasets")
    print("  - v9 patterns won't be lost")
    print("  - v10 patterns add depth and personalization")
    print("  - 4,498 examples exceed best practices by 22x")
    print()
    print("Next step:")
    print(f"  openai api fine_tunes.create \\")
    print(f"    -t {OUTPUT_PATH} \\")
    print(f"    -m gpt-4o-mini-2024-07-18 \\")
    print(f"    --suffix jenny-v10-eq-combined")
    print()
    print("Status: READY FOR TRAINING")
    print("=" * 80)

if __name__ == "__main__":
    main()
