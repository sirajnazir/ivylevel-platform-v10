#!/usr/bin/env python3
"""
Extract ALL Success Patterns from Huda's Journey
Created: 2025-10-16
Purpose: Comprehensive longitudinal analysis across ALL dimensions of success
"""

import json
import os
from pathlib import Path
from collections import defaultdict

# Success Pattern Categories (Comprehensive)
PATTERN_CATEGORIES = {
    'awards': 'National Award Win',
    'ec_scale': 'EC Scale & Impact Growth',
    'funding': 'Funding & Resource Acquisition',
    'time_management': 'Time Management Breakthrough',
    'essay_quality': 'Essay Transformation',
    'identity_clarity': 'Identity & Positioning Clarity',
    'trust_building': 'Coach-Student Trust Building',
    'academic_improvement': 'Academic Performance Boost',
    'leadership': 'Leadership Role Acquisition',
    'technical_skills': 'Technical Skill Development',
    'community_impact': 'Community Impact Scale',
    'application_strategy': 'College Application Strategy',
    'barrier_breakthrough': 'Barrier Breaking Moment',
    'portfolio_building': 'Portfolio & Showcase Creation',
    'network_leverage': 'Network & Resource Leverage'
}

def extract_patterns_from_intel_chips():
    """Extract success patterns from all intel chip batches"""
    chips_dir = Path('/Users/snazir/ivylevel-platform-v10/data/kb_intel_chips/chips')
    patterns = defaultdict(list)

    # Get all intel chip batch files
    batch_files = sorted(chips_dir.glob('w*_intel_chips_batch*.json'))

    print(f"📊 Analyzing {len(batch_files)} intel chip batch files...\n")

    for batch_file in batch_files:
        try:
            with open(batch_file, 'r') as f:
                batch_data = json.load(f)

            week_num = batch_file.stem.split('_')[0].upper()

            # Extract chips from batch
            chips = batch_data if isinstance(batch_data, list) else batch_data.get('chips', [])

            for chip in chips:
                chip_id = chip.get('chip_id', 'UNKNOWN')
                chip_type = chip.get('type', 'UNKNOWN')
                metadata = chip.get('metadata', {})
                content = chip.get('content', '')

                # Categorize pattern
                category = categorize_pattern(chip_id, chip_type, content, metadata)

                if category:
                    patterns[category].append({
                        'chip_id': chip_id,
                        'week': week_num,
                        'type': chip_type,
                        'content': content[:200] if isinstance(content, str) else str(content)[:200],
                        'metadata': metadata
                    })

        except Exception as e:
            print(f"❌ Error processing {batch_file.name}: {e}")

    return patterns

def categorize_pattern(chip_id, chip_type, content, metadata):
    """Categorize chip into success pattern type"""
    content_lower = str(content).lower()
    chip_id_lower = chip_id.lower()

    # Awards & Recognition
    if 'ncwit' in content_lower or 'award' in content_lower or 'winner' in content_lower:
        return 'awards'

    # EC Scale & Impact
    if 'scale' in content_lower or 'users' in content_lower or 'impact' in content_lower:
        if 'synthoria' in content_lower or 'ai tutor' in content_lower:
            return 'ec_scale'

    # Funding
    if 'funding' in content_lower or 'grant' in content_lower or 'raised' in content_lower:
        return 'funding'

    # Time Management
    if '168' in content_lower or 'time management' in content_lower or 'schedule' in content_lower:
        return 'time_management'

    # Essay
    if 'essay' in content_lower or 'parent story' in content_lower or 'narrative' in content_lower:
        return 'essay_quality'

    # Identity
    if 'identity' in content_lower or 'muslim' in content_lower or 'cultural' in content_lower:
        return 'identity_clarity'

    # Trust Building
    if 'trust' in content_lower or 'game demo' in content_lower or 'investment' in content_lower:
        return 'trust_building'

    # Academic
    if 'gpa' in content_lower or 'grade' in content_lower or 'academic' in content_lower:
        return 'academic_improvement'

    # Leadership
    if 'leader' in content_lower or 'president' in content_lower or 'founder' in content_lower:
        return 'leadership'

    # Technical Skills
    if 'code' in content_lower or 'github' in content_lower or 'technical' in content_lower:
        return 'technical_skills'

    # Community Impact
    if 'community' in content_lower or 'sunday school' in content_lower or 'teaching' in content_lower:
        return 'community_impact'

    # Portfolio
    if 'portfolio' in content_lower or 'showcase' in content_lower or 'github' in content_lower:
        return 'portfolio_building'

    # Barrier Breaking
    if 'barrier' in content_lower or 'breakthrough' in content_lower or 'overcome' in content_lower:
        return 'barrier_breakthrough'

    return None

def print_pattern_summary(patterns):
    """Print comprehensive summary of extracted patterns"""
    print("=" * 80)
    print("SUCCESS PATTERN EXTRACTION SUMMARY")
    print("=" * 80)
    print()

    total_patterns = sum(len(v) for v in patterns.values())
    print(f"Total Patterns Extracted: {total_patterns}")
    print(f"Pattern Categories: {len(patterns)}")
    print()

    for category, items in sorted(patterns.items(), key=lambda x: len(x[1]), reverse=True):
        print(f"\n📌 {PATTERN_CATEGORIES.get(category, category).upper()}")
        print(f"   Count: {len(items)} patterns")
        print(f"   Weeks: {', '.join(sorted(set(p['week'] for p in items)))}")

        # Show top 3 examples
        for i, pattern in enumerate(items[:3]):
            print(f"   {i+1}. {pattern['chip_id']} ({pattern['week']})")
            print(f"      {pattern['content'][:100]}...")

    print("\n" + "=" * 80)
    print(f"\n✅ Ready to create {total_patterns} success pattern seed records")
    print()

if __name__ == '__main__':
    print("🚀 Starting Comprehensive Success Pattern Extraction\n")
    patterns = extract_patterns_from_intel_chips()
    print_pattern_summary(patterns)

    # Save for seed data generation
    output_file = Path('/Users/snazir/ivylevel-platform-v10/data/migrations/scripts/extracted_success_patterns.json')
    with open(output_file, 'w') as f:
        json.dump(patterns, f, indent=2)

    print(f"💾 Saved to: {output_file}")
