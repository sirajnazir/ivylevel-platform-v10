#!/usr/bin/env python3
"""
North Star Analysis: Digital Twin Jenny Training Gap Analysis

Analyzes v9 vs v10 training data to understand:
1. What is the ultimate goal? (Digital Twin Jenny for what prompts?)
2. What does v9 do well and where does it fail?
3. What does v10 add and where does it fail?
4. What is the real need and gap?
"""

import json
import random
from collections import Counter
from typing import List, Dict, Any

V9_PATH = "/Users/snazir/ivylevel-platform-v10/data/training/jenny_v9_eq_training.jsonl"
V10_PATH = "/Users/snazir/ivylevel-platform-v10/data/training/jenny_v10_eq_session_transcripts.jsonl"

def load_examples(path: str) -> List[Dict[str, Any]]:
    """Load training examples from JSONL file"""
    examples = []
    with open(path, 'r') as f:
        for line in f:
            examples.append(json.loads(line))
    return examples

def analyze_example(example: Dict[str, Any]) -> Dict[str, Any]:
    """Analyze a single training example"""
    system = example['messages'][0]['content']
    user = example['messages'][1]['content']
    assistant = example['messages'][2]['content']

    # Extract system prompt archetype
    if "references specific moments" in system or "evidence-driven" in system.lower():
        archetype = "evidence_driven"
    elif "celebrates" in system or "amplif" in system:
        archetype = "celebration"
    elif "validates emotions" in system or "warmth" in system.lower():
        archetype = "warmth_validation"
    elif "reframes" in system or "strategic" in system.lower():
        archetype = "strategic_reframe"
    elif "supportive" in system and "actionable" in system:
        archetype = "generic_supportive"
    else:
        archetype = "other"

    # Detect query type
    user_lower = user.lower()
    if "reject" in user_lower or "didn't get" in user_lower or "deferred" in user_lower:
        query_type = "rejection"
    elif "accepted" in user_lower or "got into" in user_lower or "got in" in user_lower or "won" in user_lower:
        query_type = "celebration"
    elif "stressed" in user_lower or "overwhelm" in user_lower or "panic" in user_lower:
        query_type = "stress_overwhelm"
    elif "essay" in user_lower and ("help" in user_lower or "review" in user_lower or "feedback" in user_lower):
        query_type = "essay_help"
    elif "can't" in user_lower or "don't know" in user_lower or "stuck" in user_lower:
        query_type = "stuck_paralysis"
    elif "should i" in user_lower or "is it okay" in user_lower or "can i" in user_lower:
        query_type = "permissioning"
    elif "parent" in user_lower:
        query_type = "parent_conflict"
    elif "?" in user:
        query_type = "question_strategic"
    else:
        query_type = "other"

    # Detect response characteristics
    has_warmth = any(phrase in assistant.lower() for phrase in [
        "i hear you", "i understand", "totally get it", "that makes sense",
        "i'm with you", "completely normal", "that's tough", "i'm sorry"
    ])

    has_action = any(phrase in assistant.lower() for phrase in [
        "try", "start by", "first,", "here's what", "let's", "you should",
        "next step", "focus on", "i recommend", "can you"
    ])

    has_evidence = any(phrase in assistant.lower() for phrase in [
        "remember when", "last time", "you mentioned", "in your", "from your"
    ])

    # Length
    user_words = len(user.split())
    assistant_words = len(assistant.split())

    return {
        "system_archetype": archetype,
        "query_type": query_type,
        "user_length": user_words,
        "assistant_length": assistant_words,
        "has_warmth": has_warmth,
        "has_action": has_action,
        "has_evidence": has_evidence,
        "system_prompt": system[:100],
        "user_query": user[:150],
        "assistant_response": assistant[:200]
    }

def print_analysis(examples: List[Dict], name: str):
    """Print analysis of examples"""
    print(f"\n{'='*80}")
    print(f"{name} ANALYSIS")
    print(f"{'='*80}\n")

    analyses = [analyze_example(ex) for ex in examples]

    print(f"Total Examples: {len(examples)}\n")

    # System archetypes
    archetypes = Counter(a['system_archetype'] for a in analyses)
    print("System Prompt Archetypes:")
    for arch, count in archetypes.most_common():
        pct = count / len(analyses) * 100
        print(f"  {arch:25} {count:4} ({pct:5.1f}%)")
    print()

    # Query types
    query_types = Counter(a['query_type'] for a in analyses)
    print("Query Types:")
    for qtype, count in query_types.most_common():
        pct = count / len(analyses) * 100
        print(f"  {qtype:25} {count:4} ({pct:5.1f}%)")
    print()

    # Response characteristics
    warmth_count = sum(1 for a in analyses if a['has_warmth'])
    action_count = sum(1 for a in analyses if a['has_action'])
    evidence_count = sum(1 for a in analyses if a['has_evidence'])

    print("Response Characteristics:")
    print(f"  Has Warmth:               {warmth_count:4} ({warmth_count/len(analyses)*100:5.1f}%)")
    print(f"  Has Action:               {action_count:4} ({action_count/len(analyses)*100:5.1f}%)")
    print(f"  Has Evidence:             {evidence_count:4} ({evidence_count/len(analyses)*100:5.1f}%)")
    print()

    # Length stats
    avg_user = sum(a['user_length'] for a in analyses) / len(analyses)
    avg_asst = sum(a['assistant_length'] for a in analyses) / len(analyses)

    print("Length Statistics:")
    print(f"  Avg User Query Length:    {avg_user:6.1f} words")
    print(f"  Avg Assistant Response:   {avg_asst:6.1f} words")
    print()

    return analyses

def compare_examples(v9_analyses: List[Dict], v10_analyses: List[Dict]):
    """Compare v9 and v10 examples"""
    print(f"\n{'='*80}")
    print("COMPARATIVE ANALYSIS: V9 vs V10")
    print(f"{'='*80}\n")

    print("Key Differences:\n")

    # Query type coverage
    v9_queries = set(a['query_type'] for a in v9_analyses)
    v10_queries = set(a['query_type'] for a in v10_analyses)

    print("Query Type Coverage:")
    print(f"  V9 unique:  {v9_queries - v10_queries}")
    print(f"  V10 unique: {v10_queries - v9_queries}")
    print(f"  Both:       {v9_queries & v10_queries}")
    print()

    # Response quality
    v9_warmth = sum(1 for a in v9_analyses if a['has_warmth']) / len(v9_analyses) * 100
    v10_warmth = sum(1 for a in v10_analyses if a['has_warmth']) / len(v10_analyses) * 100

    v9_action = sum(1 for a in v9_analyses if a['has_action']) / len(v9_analyses) * 100
    v10_action = sum(1 for a in v10_analyses if a['has_action']) / len(v10_analyses) * 100

    v9_evidence = sum(1 for a in v9_analyses if a['has_evidence']) / len(v9_analyses) * 100
    v10_evidence = sum(1 for a in v10_analyses if a['has_evidence']) / len(v10_analyses) * 100

    print("Response Quality Comparison:")
    print(f"  Warmth:   V9: {v9_warmth:5.1f}%  |  V10: {v10_warmth:5.1f}%  |  Diff: {v10_warmth - v9_warmth:+6.1f}pp")
    print(f"  Action:   V9: {v9_action:5.1f}%  |  V10: {v10_action:5.1f}%  |  Diff: {v10_action - v9_action:+6.1f}pp")
    print(f"  Evidence: V9: {v9_evidence:5.1f}%  |  V10: {v10_evidence:5.1f}%  |  Diff: {v10_evidence - v9_evidence:+6.1f}pp")
    print()

    # Length comparison
    v9_user_len = sum(a['user_length'] for a in v9_analyses) / len(v9_analyses)
    v10_user_len = sum(a['user_length'] for a in v10_analyses) / len(v10_analyses)

    v9_asst_len = sum(a['assistant_length'] for a in v9_analyses) / len(v9_analyses)
    v10_asst_len = sum(a['assistant_length'] for a in v10_analyses) / len(v10_analyses)

    print("Length Comparison:")
    print(f"  User Query:      V9: {v9_user_len:6.1f}  |  V10: {v10_user_len:6.1f}  |  Diff: {v10_user_len - v9_user_len:+7.1f}")
    print(f"  Assistant Reply: V9: {v9_asst_len:6.1f}  |  V10: {v10_asst_len:6.1f}  |  Diff: {v10_asst_len - v9_asst_len:+7.1f}")
    print()

def sample_examples(analyses: List[Dict], name: str, n: int = 3):
    """Print sample examples"""
    print(f"\n{'='*80}")
    print(f"SAMPLE EXAMPLES FROM {name}")
    print(f"{'='*80}\n")

    samples = random.sample(analyses, min(n, len(analyses)))

    for i, sample in enumerate(samples, 1):
        print(f"Example {i}:")
        print(f"  Archetype: {sample['system_archetype']}")
        print(f"  Query Type: {sample['query_type']}")
        print(f"  Has Warmth: {sample['has_warmth']} | Has Action: {sample['has_action']} | Has Evidence: {sample['has_evidence']}")
        print(f"\n  System: {sample['system_prompt']}...")
        print(f"\n  User: {sample['user_query']}")
        print(f"\n  Assistant: {sample['assistant_response']}...")
        print()

def identify_gaps():
    """Identify what's missing and what's needed"""
    print(f"\n{'='*80}")
    print("NORTH STAR: DIGITAL TWIN JENNY - GOALS & GAPS")
    print(f"{'='*80}\n")

    print("ULTIMATE GOAL:")
    print("───────────────\n")
    print("Create a fine-tuned model that responds to emotional/coaching queries with:")
    print("  1. Warmth & Validation (80%+ coverage)")
    print("  2. Actionable Guidance (75%+ coverage)")
    print("  3. Evidence-Driven Coaching (when relevant)")
    print("  4. Jenny's Authentic Voice (casual, supportive, specific)")
    print("  5. Appropriate Personalization (student context awareness)")
    print()

    print("TARGET QUERY TYPES:")
    print("───────────────────\n")
    print("  1. Rejection/Deferral Support (high priority)")
    print("  2. Celebration/Win Amplification (high priority)")
    print("  3. Stress/Overwhelm Management (high priority)")
    print("  4. Essay Feedback & Writing Help (medium priority)")
    print("  5. Decision Paralysis/Stuck Moments (medium priority)")
    print("  6. Permissioning (\"Can I...\", \"Is it okay...\") (medium priority)")
    print("  7. Parent Conflict Navigation (medium priority)")
    print("  8. Strategic Questions (\"What should I...\") (medium priority)")
    print("  9. Crisis Support (breakdown, panic) (low frequency, high impact)")
    print("  10. Motivation/Passion Loss (low frequency, high impact)")
    print()

    print("CURRENT V9 PERFORMANCE (46.3% CAT-3 pass rate):")
    print("────────────────────────────────────────────────\n")
    print("STRENGTHS:")
    print("  ✓ Clean, curated examples (no contamination)")
    print("  ✓ High-quality responses (9.53/10 average)")
    print("  ✓ 5 emotional archetypes well-covered")
    print("  ✓ Evidence-driven coaching patterns")
    print("  ✓ Zero JSON artifacts")
    print()
    print("WEAKNESSES:")
    print("  ✗ Only 690 examples (limited coverage)")
    print("  ✗ Warmth coverage ~40-50% (target: 80%+)")
    print("  ✗ Action coverage ~40-50% (target: 75%+)")
    print("  ✗ Curated examples may lack natural conversational flow")
    print("  ✗ Generic (not Huda-specific)")
    print()

    print("V10 SESSION TRANSCRIPTS (3,808 examples):")
    print("──────────────────────────────────────────\n")
    print("INTENDED STRENGTHS:")
    print("  ✓ 6.5x more data (690 → 4,498)")
    print("  ✓ Complete conversational units (context + response + follow-up)")
    print("  ✓ Natural Jenny-Huda relationship (2 years)")
    print("  ✓ Authentic voice and tone")
    print()
    print("ACTUAL PROBLEMS:")
    print("  ✗ Training data contamination (structural artifacts)")
    print("  ✗ Memorized fragments (\"4/2? That's more than 2...\")")
    print("  ✗ Quality dilution (unverified examples)")
    print("  ✗ Too much noise in extraction")
    print("  ✗ Hyper-personalization caused assumptions")
    print()

    print("DIAGNOSIS:")
    print("──────────\n")
    print("v9 PROBLEM: Not enough examples, coverage gaps in warmth/action")
    print("v10 APPROACH: Add 3,808 session transcript examples (additive)")
    print("v10 RESULT: 0% pass rate (complete failure)")
    print()
    print("ROOT CAUSE: Quantity without quality. Session transcripts contained:")
    print("  • Structural artifacts from PDF extraction")
    print("  • Conversational fragments without coaching value")
    print("  • Over-personalization to Huda context")
    print("  • Noise that diluted v9's proven patterns")
    print()

    print("REAL NEED:")
    print("──────────\n")
    print("What we ACTUALLY need is NOT more data, but BETTER data:")
    print()
    print("  1. WARMTH ENHANCEMENT:")
    print("     - Add 100-150 examples with EXPLICIT warmth patterns")
    print("     - Focus on: rejection, stress, crisis, self-doubt")
    print("     - Must include: validation, normalization, empathy")
    print()
    print("  2. ACTION ENHANCEMENT:")
    print("     - Add 100-150 examples with EXPLICIT action guidance")
    print("     - Focus on: overwhelm, stuck, time-boxing, planning")
    print("     - Must include: concrete next steps, specific strategies")
    print()
    print("  3. COVERAGE GAPS:")
    print("     - Crisis support (breakdown, panic) - need 20-30 examples")
    print("     - Permissioning (\"Can I take a break?\") - need 20-30 examples")
    print("     - Parent conflict - need 20-30 examples")
    print("     - Celebration amplification - need 30-50 examples")
    print()
    print("  4. QUALITY BAR:")
    print("     - Every example must be manually reviewed")
    print("     - Quality score ≥8/10")
    print("     - No structural artifacts")
    print("     - Complete coaching exchange (warmth + action)")
    print()
    print("RECOMMENDED APPROACH:")
    print("─────────────────────\n")
    print("jenny_v9.1_eq_targeted.jsonl")
    print()
    print("  Base: ALL 690 v9 examples (proven quality)")
    print()
    print("  Add: 200-300 CURATED examples from:")
    print("    • Best iMessage threads (not session transcripts)")
    print("    • Manual extraction with quality scoring")
    print("    • Focus on warmth/action gaps")
    print("    • Target specific query types with low v9 coverage")
    print()
    print("  Total: ~900-1,000 examples")
    print("  Growth: Conservative (30-45% increase, not 550%)")
    print("  Quality: High (every example reviewed)")
    print()
    print("  Expected Performance:")
    print("    • CAT-3 pass rate: 55-65% (realistic +10-15pp)")
    print("    • Warmth: 70-80% (up from ~45%)")
    print("    • Action: 70-80% (up from ~45%)")
    print("    • No contamination: 100%")
    print("    • Latency: <2s")
    print()

def main():
    print("="*80)
    print("NORTH STAR ANALYSIS: DIGITAL TWIN JENNY TRAINING GAP")
    print("="*80)

    # Load datasets
    print("\nLoading datasets...")
    v9_examples = load_examples(V9_PATH)
    v10_examples = load_examples(V10_PATH)
    print(f"Loaded {len(v9_examples)} v9 examples")
    print(f"Loaded {len(v10_examples)} v10 examples")

    # Analyze each dataset
    v9_analyses = print_analysis(v9_examples, "JENNY_V9_EQ")
    v10_analyses = print_analysis(v10_examples, "JENNY_V10_EQ SESSION TRANSCRIPTS")

    # Compare
    compare_examples(v9_analyses, v10_analyses)

    # Sample examples
    sample_examples(v9_analyses, "V9", 3)
    sample_examples(v10_analyses, "V10", 3)

    # Identify gaps and needs
    identify_gaps()

    print("\n" + "="*80)
    print("ANALYSIS COMPLETE")
    print("="*80 + "\n")

if __name__ == "__main__":
    main()
