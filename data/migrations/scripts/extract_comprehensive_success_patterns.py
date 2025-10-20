#!/usr/bin/env python3
"""
Extract COMPREHENSIVE Success Patterns from Huda's Journey
Created: 2025-10-16
Purpose: Multi-dimensional longitudinal analysis across ALL success factors
Data Sources: Intel chips (JSONL), Outcomes table, KB Items, Session transcripts
"""

import json
import os
from pathlib import Path
from collections import defaultdict
from datetime import datetime

# ============================================================================
# SUCCESS PATTERN TAXONOMY (15+ Categories)
# ============================================================================
PATTERN_CATEGORIES = {
    # AWARDS & RECOGNITION
    'national_award_win': {
        'name': 'National Award Win',
        'keywords': ['ncwit', 'national', 'winner', 'award', 'top 40']
    },
    'regional_award_win': {
        'name': 'Regional/State Award',
        'keywords': ['regional', 'state', 'semifinalist', 'finalist']
    },

    # EC SCALE & IMPACT
    'ec_user_scale': {
        'name': 'EC User/Impact Scale Growth',
        'keywords': ['scale', 'users', 'downloads', 'reach', 'impact metric']
    },
    'ec_funding': {
        'name': 'EC Funding & Resources',
        'keywords': ['funding', 'grant', 'raised', 'sponsors', 'revenue']
    },
    'ec_leadership_role': {
        'name': 'EC Leadership Acquisition',
        'keywords': ['founder', 'president', 'director', 'lead', 'captain']
    },

    # ACADEMIC PERFORMANCE
    'gpa_boost': {
        'name': 'GPA/Grade Improvement',
        'keywords': ['gpa', 'all a', 'grade improvement', 'academic turnaround']
    },
    'test_score_boost': {
        'name': 'Test Score Breakthrough',
        'keywords': ['sat', 'act', 'psat', '1550', 'score increase']
    },

    # PRODUCTIVITY & TIME
    'time_management_breakthrough': {
        'name': 'Time Management System',
        'keywords': ['168', 'schedule', 'time management', 'productivity', 'system']
    },
    'activity_output_surge': {
        'name': 'Activity Output Acceleration',
        'keywords': ['10 activities', 'compound', 'multiple outcomes']
    },

    # NARRATIVE & POSITIONING
    'essay_transformation': {
        'name': 'Essay Quality Transformation',
        'keywords': ['essay', 'parent story', 'narrative', 'reframe', 'differentiation']
    },
    'identity_clarity': {
        'name': 'Identity & Positioning Clarity',
        'keywords': ['identity', 'muslim', 'cultural', 'differentiator', 'positioning']
    },

    # TECHNICAL SKILLS
    'technical_skill_development': {
        'name': 'Technical Skill Mastery',
        'keywords': ['code', 'github', 'portfolio', 'technical', 'programming']
    },
    'portfolio_showcase': {
        'name': 'Portfolio & Showcase Creation',
        'keywords': ['portfolio', 'showcase', 'github', 'demo', 'project']
    },

    # COMMUNITY & IMPACT
    'community_impact_scale': {
        'name': 'Community Impact Growth',
        'keywords': ['community', 'sunday school', 'teaching', 'volunteer', 'service']
    },
    'barrier_breakthrough': {
        'name': 'Barrier Breaking Moment',
        'keywords': ['barrier', 'breakthrough', 'overcome', 'crisis', 'turning point']
    },

    # COACHING DYNAMICS
    'trust_building': {
        'name': 'Coach-Student Trust Building',
        'keywords': ['trust', 'game demo', 'investment', 'buy-in', 'confidence']
    }
}

def load_intel_chips_jsonl():
    """Load all intel chips from JSONL files"""
    chips_dir = Path('/Users/snazir/ivylevel-platform-v10/data/kb_intel_chips/chips')
    all_chips = []

    batch_files = sorted(chips_dir.glob('w*_intel_chips_batch*.json'))

    print(f"📊 Loading intel chips from {len(batch_files)} JSONL files...\n")

    for batch_file in batch_files:
        try:
            week_num = batch_file.stem.split('_')[0].upper()
            with open(batch_file, 'r') as f:
                for line_num, line in enumerate(f, 1):
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        chip = json.loads(line)
                        chip['week'] = week_num
                        chip['source_file'] = batch_file.name
                        all_chips.append(chip)
                    except json.JSONDecodeError as e:
                        print(f"   ⚠️  Skipping line {line_num} in {batch_file.name}: {e}")

        except Exception as e:
            print(f"   ❌ Error processing {batch_file.name}: {e}")

    print(f"✅ Loaded {len(all_chips)} intel chips total\n")
    return all_chips

def categorize_chip(chip):
    """Categorize chip into success pattern type(s) - can match multiple"""
    content = str(chip.get('content', '')).lower()
    chip_id = chip.get('chip_id', '').lower()
    chip_type = chip.get('type', '')
    matched_categories = []

    for category_key, category_data in PATTERN_CATEGORIES.items():
        keywords = category_data['keywords']
        if any(kw in content or kw in chip_id for kw in keywords):
            matched_categories.append(category_key)

    return matched_categories

def extract_measurable_results(chip):
    """Extract quantitative metrics from chip content"""
    content = str(chip.get('content', '')).lower()
    results = {}

    # SAT scores
    if '1550' in content or '1560' in content or 'sat' in content:
        results['test_scores'] = 'SAT improvement detected'

    # GPA
    if 'all a' in content or 'gpa' in content or 'grade' in content:
        results['academic'] = 'GPA improvement detected'

    # User scale
    if 'users' in content or 'scale' in content or 'downloads' in content:
        results['ec_impact'] = 'Scale growth detected'

    # Funding
    if 'funding' in content or 'grant' in content or 'raised' in content:
        results['ec_funding'] = 'Funding acquired'

    # Time reclaimed
    if '168' in content or 'schedule' in content or 'time' in content:
        results['productivity'] = 'Time management improvement'

    # Awards
    if 'ncwit' in content or 'winner' in content or 'award' in content:
        results['recognition'] = 'Award won'

    return results

def build_success_patterns(chips):
    """Build comprehensive success patterns from chips"""
    patterns_by_category = defaultdict(list)

    for chip in chips:
        categories = categorize_chip(chip)

        for category in categories:
            pattern_data = {
                'chip_id': chip.get('chip_id'),
                'week': chip.get('week'),
                'type': chip.get('type'),
                'date': chip.get('source_doc', {}).get('date'),
                'phase': chip.get('source_doc', {}).get('phase'),
                'quality_score': chip.get('metadata', {}).get('quality_score'),
                'content': chip.get('content', '')[:300],  # First 300 chars
                'full_content': chip.get('content', ''),
                'insight_vector': chip.get('insight_vector', ''),
                'measurable_results': extract_measurable_results(chip)
            }

            patterns_by_category[category].append(pattern_data)

    return patterns_by_category

def aggregate_pattern_journey(category, chips):
    """Aggregate chips in category into coherent success pattern story"""

    if not chips:
        return None

    # Sort by date
    sorted_chips = sorted(chips, key=lambda x: x.get('date') or '2023-01-01')

    # Find start and end
    start_chip = sorted_chips[0]
    end_chip = sorted_chips[-1]

    # Extract tactics used (from tactic chips)
    tactics_used = []
    for chip in sorted_chips:
        if chip.get('type') == 'Tactic_Chip':
            tactics_used.append(chip.get('chip_id'))

    # Extract breakthrough moments (from silver bullet chips)
    breakthroughs = []
    for chip in sorted_chips:
        if chip.get('type') == 'Silver_Bullet_Chip':
            breakthroughs.append({
                'week': chip.get('week'),
                'what': chip.get('content')[:200]
            })

    # Aggregate measurable results
    all_results = {}
    for chip in sorted_chips:
        all_results.update(chip.get('measurable_results', {}))

    pattern = {
        'category': category,
        'category_name': PATTERN_CATEGORIES[category]['name'],
        'chip_count': len(chips),
        'start_week': start_chip.get('week'),
        'start_date': start_chip.get('date'),
        'end_week': end_chip.get('week'),
        'end_date': end_chip.get('date'),
        'duration_weeks': len(set(c.get('week') for c in chips)),
        'phases_covered': list(set(c.get('phase') for c in chips if c.get('phase'))),
        'quality_scores': [c.get('quality_score') for c in chips if c.get('quality_score')],
        'avg_quality': sum(c.get('quality_score', 0) for c in chips) / len(chips) if chips else 0,
        'tactics_used': tactics_used,
        'breakthrough_moments': breakthroughs,
        'measurable_results': all_results,
        'all_chips': [{'chip_id': c.get('chip_id'), 'week': c.get('week'), 'content': c.get('content')[:150]} for c in chips[:10]],  # Top 10
        'key_insights': [c.get('insight_vector') for c in chips if c.get('insight_vector')][:5]  # Top 5
    }

    return pattern

def print_comprehensive_summary(patterns):
    """Print detailed summary of all success patterns"""
    print("=" * 100)
    print("COMPREHENSIVE SUCCESS PATTERN EXTRACTION - HUDA'S JOURNEY")
    print("=" * 100)
    print()

    total_chips = sum(len(v) for v in patterns.values())
    print(f"📊 Total Chips Analyzed: {total_chips}")
    print(f"📈 Pattern Categories Identified: {len(patterns)}")
    print()

    print("=" * 100)
    print("PATTERN BREAKDOWN BY CATEGORY")
    print("=" * 100)

    for category, chips in sorted(patterns.items(), key=lambda x: len(x[1]), reverse=True):
        category_name = PATTERN_CATEGORIES[category]['name']

        print(f"\n{'='*100}")
        print(f"📌 {category_name.upper()}")
        print(f"{'='*100}")
        print(f"   Total Chips: {len(chips)}")

        if chips:
            weeks = sorted(set(c.get('week') for c in chips))
            print(f"   Weeks Covered: {', '.join(weeks)}")

            phases = set(c.get('phase') for c in chips if c.get('phase'))
            print(f"   Phases: {', '.join(phases)}")

            avg_quality = sum(c.get('quality_score', 0) for c in chips) / len(chips)
            print(f"   Avg Quality Score: {avg_quality:.2f}")

            # Show top 5 examples
            print(f"\n   🔍 Top Examples:")
            for i, chip in enumerate(chips[:5], 1):
                print(f"      {i}. {chip.get('chip_id')} ({chip.get('week')}) - Q:{chip.get('quality_score', 'N/A')}")
                print(f"         {chip.get('content')[:120]}...")

                results = chip.get('measurable_results', {})
                if results:
                    print(f"         📈 Metrics: {', '.join(f'{k}={v}' for k, v in results.items())}")

    print("\n" + "=" * 100)
    print(f"✅ Extraction Complete - Ready to seed {len(patterns)} success pattern categories")
    print("=" * 100)

def main():
    print("🚀 COMPREHENSIVE SUCCESS PATTERN EXTRACTION - MULTI-DIMENSIONAL ANALYSIS\n")

    # Load all intel chips
    all_chips = load_intel_chips_jsonl()

    # Categorize and build patterns
    print("🔍 Categorizing chips into success patterns...\n")
    patterns_by_category = build_success_patterns(all_chips)

    # Print summary
    print_comprehensive_summary(patterns_by_category)

    # Aggregate into coherent journeys
    print("\n\n🎯 Aggregating into Success Pattern Journeys...\n")
    aggregated_patterns = {}
    for category, chips in patterns_by_category.items():
        aggregated = aggregate_pattern_journey(category, chips)
        if aggregated:
            aggregated_patterns[category] = aggregated

    # Save results
    output_file = Path('/Users/snazir/ivylevel-platform-v10/data/migrations/scripts/extracted_success_patterns_comprehensive.json')
    with open(output_file, 'w') as f:
        json.dump({
            'extraction_date': datetime.now().isoformat(),
            'total_chips': len(all_chips),
            'patterns_by_category': {k: [{'chip_id': c.get('chip_id'), 'week': c.get('week')} for c in v] for k, v in patterns_by_category.items()},
            'aggregated_patterns': aggregated_patterns
        }, f, indent=2)

    print(f"\n💾 Saved comprehensive extraction to: {output_file}")
    print(f"📋 Pattern categories: {len(aggregated_patterns)}")
    print(f"🎯 Ready for seed data generation!\n")

if __name__ == '__main__':
    main()
