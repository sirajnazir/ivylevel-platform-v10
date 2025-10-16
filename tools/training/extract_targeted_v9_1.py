#!/usr/bin/env python3
"""
Targeted Extraction for jenny_v9.1_eq

Extracts 200-300 high-quality examples from iMessage data to fill specific gaps:
1. Warmth enhancement (rejection, stress, crisis, self-doubt)
2. Action enhancement (overwhelm, stuck, time-boxing, planning)
3. Coverage gaps (crisis, permissioning, parent conflict, celebration)

Quality bar: ≥8/10, manual review, no contamination
"""

import json
import os
from pathlib import Path
from typing import List, Dict, Any
from collections import Counter

IMSG_DIR = "/Users/snazir/ivylevel-platform-v10/data/eq/imsg"
V9_PATH = "/Users/snazir/ivylevel-platform-v10/data/training/jenny_v9_eq_training.jsonl"
OUTPUT_PATH = "/Users/snazir/ivylevel-platform-v10/data/training/jenny_v9_1_eq_targeted.jsonl"

# Target labels for each gap category
WARMTH_LABELS = {
    "validation", "empathy", "normalization", "warmth", "zero_judgment",
    "emotional_acknowledgment", "supportive", "encouragement"
}

ACTION_LABELS = {
    "actionable", "concrete_steps", "strategy", "planning", "time_boxing",
    "next_steps", "framework", "tactical", "specific_guidance"
}

PRIORITY_QUERY_TYPES = {
    "rejection": ["rejection", "deferral", "waitlist", "denied"],
    "stress": ["stress", "overwhelm", "panic", "anxiety", "breakdown"],
    "crisis": ["crisis", "emergency", "can't_handle", "total_breakdown"],
    "self_doubt": ["imposter", "not_good_enough", "self_doubt", "insecurity"],
    "celebration": ["celebration", "win", "accepted", "success", "achievement"],
    "permissioning": ["permission", "can_i", "is_it_okay", "should_i"],
    "parent_conflict": ["parent", "family_conflict", "disagreement"],
    "stuck": ["stuck", "paralysis", "don't_know", "confused"],
    "essay_help": ["essay", "writing", "feedback", "review"]
}

def load_imsg_files() -> List[Dict[str, Any]]:
    """Load all iMessage extraction files"""
    files = []
    for path in Path(IMSG_DIR).glob("jenny_eq_extract_imsg_*.json"):
        with open(path) as f:
            files.append(json.load(f))
    return files

def load_v9_examples() -> List[Dict[str, Any]]:
    """Load existing v9 examples"""
    examples = []
    with open(V9_PATH) as f:
        for line in f:
            examples.append(json.loads(line))
    return examples

def categorize_example(example: Dict[str, Any]) -> Dict[str, Any]:
    """Categorize example by labels and content"""
    labels = set(example.get('labels', []))
    user_msg = example['messages'][1]['content'].lower()
    assistant_msg = example['messages'][2]['content'].lower()

    # Check warmth
    has_warmth = bool(labels & WARMTH_LABELS)

    # Check action
    has_action = bool(labels & ACTION_LABELS)

    # Determine query type
    query_type = "other"
    for qtype, keywords in PRIORITY_QUERY_TYPES.items():
        if any(kw in user_msg for kw in keywords):
            query_type = qtype
            break

    # Calculate metrics
    user_words = len(user_msg.split())
    assistant_words = len(assistant_msg.split())

    return {
        "example": example,
        "has_warmth": has_warmth,
        "has_action": has_action,
        "query_type": query_type,
        "quality_score": example.get('quality_score', 0),
        "labels": labels,
        "user_words": user_words,
        "assistant_words": assistant_words
    }

def analyze_v9_coverage(v9_examples: List[Dict]) -> Dict[str, int]:
    """Analyze what v9 already covers"""
    coverage = Counter()

    for ex in v9_examples:
        user_msg = ex['messages'][1]['content'].lower()

        for qtype, keywords in PRIORITY_QUERY_TYPES.items():
            if any(kw in user_msg for kw in keywords):
                coverage[qtype] += 1
                break
        else:
            coverage["other"] += 1

    return dict(coverage)

def select_targeted_examples(
    imsg_files: List[Dict],
    v9_coverage: Dict[str, int]
) -> List[Dict[str, Any]]:
    """Select examples to fill gaps"""

    # Extract all training examples from iMessage files
    all_examples = []
    for imsg_file in imsg_files:
        for ex in imsg_file.get('training_examples', []):
            categorized = categorize_example(ex)
            all_examples.append(categorized)

    print(f"Total iMessage training examples: {len(all_examples)}")
    print()

    # Filter by quality
    quality_examples = [ex for ex in all_examples if ex['quality_score'] >= 8]
    print(f"High quality examples (≥8/10): {len(quality_examples)}")
    print()

    # Analyze coverage
    print("Query Type Distribution in iMessage Data:")
    query_types = Counter(ex['query_type'] for ex in quality_examples)
    for qtype, count in query_types.most_common():
        v9_count = v9_coverage.get(qtype, 0)
        print(f"  {qtype:20} V9: {v9_count:3}  |  iMsg: {count:3}  |  Gap: {max(0, 30 - v9_count):3}")
    print()

    # Selection strategy:
    # 1. WARMTH PRIORITY: 100-150 examples with explicit warmth
    # 2. ACTION PRIORITY: 100-150 examples with explicit action
    # 3. COVERAGE GAPS: Fill query types with low v9 coverage

    selected = []

    # Priority 1: Warmth examples for high-priority query types
    warmth_priority_types = ["rejection", "stress", "crisis", "self_doubt"]
    warmth_examples = [
        ex for ex in quality_examples
        if ex['has_warmth'] and ex['query_type'] in warmth_priority_types
    ]
    warmth_examples.sort(key=lambda x: x['quality_score'], reverse=True)
    selected.extend(warmth_examples[:100])
    print(f"Selected warmth examples: {len(warmth_examples[:100])}")

    # Priority 2: Action examples for high-priority query types
    action_priority_types = ["stuck", "stress", "essay_help"]
    action_examples = [
        ex for ex in quality_examples
        if ex['has_action'] and ex['query_type'] in action_priority_types
        and ex not in selected
    ]
    action_examples.sort(key=lambda x: x['quality_score'], reverse=True)
    selected.extend(action_examples[:100])
    print(f"Selected action examples: {len(action_examples[:100])}")

    # Priority 3: Coverage gaps (query types with <20 v9 examples)
    gap_types = [qtype for qtype, count in v9_coverage.items() if count < 20]
    gap_examples = [
        ex for ex in quality_examples
        if ex['query_type'] in gap_types and ex not in selected
    ]
    gap_examples.sort(key=lambda x: x['quality_score'], reverse=True)
    selected.extend(gap_examples[:100])
    print(f"Selected gap-filling examples: {len(gap_examples[:100])}")

    print()
    print(f"Total selected: {len(selected)}")
    print()

    return selected

def analyze_selected(selected: List[Dict]) -> None:
    """Analyze selected examples"""
    print("="*80)
    print("SELECTED EXAMPLES ANALYSIS")
    print("="*80)
    print()

    warmth_count = sum(1 for ex in selected if ex['has_warmth'])
    action_count = sum(1 for ex in selected if ex['has_action'])
    both_count = sum(1 for ex in selected if ex['has_warmth'] and ex['has_action'])

    print(f"Total: {len(selected)}")
    print(f"Has Warmth: {warmth_count} ({warmth_count/len(selected)*100:.1f}%)")
    print(f"Has Action: {action_count} ({action_count/len(selected)*100:.1f}%)")
    print(f"Has Both: {both_count} ({both_count/len(selected)*100:.1f}%)")
    print()

    print("Query Type Breakdown:")
    query_types = Counter(ex['query_type'] for ex in selected)
    for qtype, count in query_types.most_common():
        print(f"  {qtype:20} {count:3} ({count/len(selected)*100:.1f}%)")
    print()

    avg_quality = sum(ex['quality_score'] for ex in selected) / len(selected)
    print(f"Average Quality Score: {avg_quality:.2f}/10")
    print()

def write_v9_1_dataset(v9_examples: List[Dict], selected: List[Dict]) -> None:
    """Write combined v9 + new examples to v9.1 dataset"""

    # Convert selected examples to training format
    new_examples = [ex['example']['messages'] for ex in selected]
    new_examples_formatted = [{"messages": ex} for ex in new_examples]

    # Combine with v9
    combined = v9_examples + new_examples_formatted

    print("="*80)
    print("JENNY_V9.1_EQ_TARGETED DATASET")
    print("="*80)
    print()
    print(f"V9 examples: {len(v9_examples)}")
    print(f"New examples: {len(new_examples_formatted)}")
    print(f"Total: {len(combined)}")
    print(f"Growth: +{len(new_examples_formatted)/len(v9_examples)*100:.1f}%")
    print()

    # Write to file
    with open(OUTPUT_PATH, 'w') as f:
        for example in combined:
            f.write(json.dumps(example) + '\n')

    print(f"Saved to: {OUTPUT_PATH}")
    print()

def main():
    print("="*80)
    print("TARGETED EXTRACTION FOR JENNY_V9.1_EQ")
    print("="*80)
    print()

    # Load data
    print("Loading data...")
    imsg_files = load_imsg_files()
    v9_examples = load_v9_examples()
    print(f"Loaded {len(imsg_files)} iMessage files")
    print(f"Loaded {len(v9_examples)} v9 examples")
    print()

    # Analyze v9 coverage
    print("="*80)
    print("V9 COVERAGE ANALYSIS")
    print("="*80)
    print()
    v9_coverage = analyze_v9_coverage(v9_examples)
    for qtype, count in sorted(v9_coverage.items(), key=lambda x: x[1], reverse=True):
        print(f"  {qtype:20} {count:3} examples")
    print()

    # Select targeted examples
    print("="*80)
    print("SELECTING TARGETED EXAMPLES")
    print("="*80)
    print()
    selected = select_targeted_examples(imsg_files, v9_coverage)

    # Analyze selection
    analyze_selected(selected)

    # Write dataset
    write_v9_1_dataset(v9_examples, selected)

    print("="*80)
    print("NEXT STEPS")
    print("="*80)
    print()
    print("1. Review sample of new examples for quality")
    print("2. Upload jenny_v9_1_eq_targeted.jsonl to OpenAI")
    print("3. Launch fine-tuning job")
    print("4. Test with CAT-3 suite (target: 55-65% pass rate)")
    print()

if __name__ == "__main__":
    main()
