#!/usr/bin/env python3
"""
Generate SQL Seed Data for Success Patterns
Created: 2025-10-16
Purpose: Transform extracted patterns into INSERT statements
Input: extracted_success_patterns_comprehensive.json
Output: 008c_seed_jenny_huda_success_patterns.sql
"""

import json
from pathlib import Path
from datetime import datetime

def escape_sql_string(s):
    """Escape single quotes and backslashes for SQL"""
    if s is None:
        return ''
    # Replace backslash first, then single quotes
    return str(s).replace('\\', '\\\\').replace("'", "''")

def generate_pattern_sql(category_key, pattern_data):
    """Generate INSERT statement for a success pattern"""

    category_name = pattern_data['category_name']
    chip_count = pattern_data['chip_count']
    start_week = pattern_data['start_week']
    start_date = pattern_data['start_date']
    end_week = pattern_data['end_week']
    end_date = pattern_data['end_date']
    duration_weeks = pattern_data['duration_weeks']
    phases = pattern_data.get('phases_covered', [])
    avg_quality = pattern_data.get('avg_quality', 0)
    tactics = pattern_data.get('tactics_used', [])
    breakthroughs = pattern_data.get('breakthrough_moments', [])
    key_insights = pattern_data.get('key_insights', [])
    all_chips = pattern_data.get('all_chips', [])
    measurable_results = pattern_data.get('measurable_results', {})

    # Build descriptive title
    title_map = {
        'national_award_win': 'NCWIT National Winner Journey',
        'test_score_boost': 'SAT 1360 → 1550+ Breakthrough',
        'gpa_boost': 'All A\'s Consistency Strategy',
        'essay_transformation': 'Essay Generic → Differentiated Transformation',
        'identity_clarity': 'Muslim Tech Pioneer Identity Crystallization',
        'time_management_breakthrough': '168-Hour Framework & 10 Activities in 6 Months',
        'ec_user_scale': 'Synthoria Scale Growth Journey',
        'ec_funding': 'Funding & Resource Acquisition Pattern',
        'ec_leadership_role': 'Leadership Role Acquisition',
        'portfolio_showcase': 'Portfolio & GitHub Showcase Strategy',
        'community_impact_scale': 'Community Impact & Sunday School Teaching',
        'trust_building': 'Coach-Student Trust Building Pattern',
        'barrier_breakthrough': 'Barrier Breaking Moments',
        'technical_skill_development': 'Technical Skills Mastery Journey',
        'activity_output_surge': '10 Meaningful Activities Output Surge',
        'regional_award_win': 'Regional/State Award Wins'
    }

    title = title_map.get(category_key, category_name)
    slug = category_key.replace('_', '-')

    # Build archetype
    archetype_json = {
        'demographics': {
            'identity': 'Muslim girl, first-gen immigrant, public HS',
            'family': 'Language barrier household, parent involvement',
            'location': 'Public high school, competitive region'
        },
        'academic_profile': {
            'starting_gpa': '4.3 weighted',
            'pattern': 'B first semester → A second semester',
            'sat_baseline': '1360',
            'courses': '8→11 APs through self-study'
        },
        'starting_stats': {
            'activities': 'Game dev since age 8, film interest, Sunday School teaching',
            'time_crisis': '4 hrs/day social media, scattered focus',
            'barriers': 'Time management, generic narrative, hidden identity'
        }
    }

    archetype_tags = ['first-gen-immigrant', 'muslim-female', 'STEM', 'public-school', 'time-crisis', 'high-achiever']

    # Starting stats JSONB
    starting_stats_json = {
        'gpa': '4.3 weighted',
        'sat': 1360,
        'ecs': 'Game dev project, Sunday School teaching, film interest',
        'screen_time': '4 hours/day social media',
        'productivity': 'Low - scattered, no system'
    }

    # Barriers faced
    barriers = ['time-crisis', 'procrastination', 'generic-narrative', 'identity-hiding', 'low-differentiation']

    # Initial challenges
    initial_challenges_map = {
        'national_award_win': 'No national recognition, generic CS narrative, hidden projects',
        'test_score_boost': 'SAT 1360 baseline, needed 190+ point jump for top schools',
        'gpa_boost': 'B→A pattern showing adjustment issues, needed consistency',
        'essay_transformation': 'Generic parent sacrifice story, no differentiation',
        'identity_clarity': 'Hiding Muslim identity due to Asian CS stereotype fears',
        'time_management_breakthrough': '4 hrs/day social media, no structured schedule',
        'ec_user_scale': 'Synthoria struggling to scale beyond initial users',
        'ec_funding': 'No funding sources identified, resource constraints',
        'ec_leadership_role': 'Follower mindset, no leadership positions',
        'portfolio_showcase': 'Hidden game project, no GitHub presence',
        'community_impact_scale': 'Sunday School teaching not leveraged as differentiator',
        'trust_building': 'New coach relationship, student skepticism',
        'barrier_breakthrough': 'Multiple barriers: time, identity, narrative, scale',
        'technical_skill_development': 'Self-taught but no portfolio proof',
        'activity_output_surge': 'Scattered activities, no compound-benefit thinking',
        'regional_award_win': 'No regional recognition established'
    }

    initial_challenges = initial_challenges_map.get(category_key, f'{category_name} challenges')

    # Tactics used (slugs)
    tactics_slugs = ['168-hour-framework', 'parent-story-reframe', 'early-work-showcase', 'daily-schedule-architecture', 'identity-as-differentiator']

    # Tactic sequence
    tactic_sequence_json = {
        'week_1_3': '168-hour-framework, early-work-showcase',
        'week_3_6': 'daily-schedule-architecture, identity-as-differentiator',
        'week_12': 'parent-story-reframe (NCWIT essay)'
    }

    # Most impactful
    most_impactful = ['168-hour-framework', 'parent-story-reframe', 'identity-as-differentiator']

    # Breakthrough moments
    breakthroughs_json = {
        'week_1': 'Game demo moment - Jenny sees technical sophistication',
        'week_3': '168-hour framework reveals 26 hrs/week available',
        'week_12': 'Parent story reframe unlocks authentic essay'
    }

    what_clicked = f'{category_name} breakthrough came from systematic application of coaching tactics over {duration_weeks} weeks across {", ".join(phases)} phases'

    # Final outcomes
    final_outcomes_map = {
        'national_award_win': {'award': 'NCWIT National Winner (Top 40 in US)', 'date': '2024-03-15', 'category': 'CS + Social Impact'},
        'test_score_boost': {'sat_final': 1550, 'increase': 190, 'percentile': '99th'},
        'gpa_boost': {'gpa_final': '4.0 unweighted, 4.5+ weighted', 'consistency': 'All A\'s both semesters'},
        'essay_transformation': {'quality_before': '3/10', 'quality_after': '9/10', 'authenticity': 'Generic → Deeply personal'},
        'identity_clarity': {'narrative': 'Muslim tech pioneer breaking barriers through games', 'confidence': 'Hiding → Leading with identity'},
        'time_management_breakthrough': {'time_reclaimed': '20-40 hrs/week', 'activities_completed': 10, 'duration': '6 months'},
        'ec_user_scale': {'users_before': '<100', 'users_after': '500+', 'impact': 'Immigrant families helped'},
        'ec_funding': {'amount': '$5000+', 'sources': 'School grants, competitions'},
        'ec_leadership_role': {'roles': 'Women in AI Club Founder, Encode Justice Lead'},
        'portfolio_showcase': {'github_projects': 5, 'showcase_quality': 'College-level work demonstrated'},
        'community_impact_scale': {'students_taught': '50+ Sunday School', 'cultural_content': 'Video series created'},
        'trust_building': {'investment': '90%+ task completion', 'trust_score': 'High'},
        'barrier_breakthrough': {'barriers_broken': 5, 'timeframe': '6 months'},
        'technical_skill_development': {'skills_acquired': 'Backend, frontend, ML, portfolio building'},
        'activity_output_surge': {'activities_before': 2, 'activities_after': 10, 'timeframe': '6 months'},
        'regional_award_win': {'count': 2, 'categories': 'Speech & Debate, Film'}
    }

    final_outcomes_json = final_outcomes_map.get(category_key, {'outcome': f'{category_name} achieved'})

    # Measurable results
    measurable_results_json = measurable_results or {'success': 'Pattern validated across journey'}

    # What worked
    what_worked_map = {
        'national_award_win': f'Systematic narrative building over {duration_weeks} weeks. Parent story reframe created authentic differentiation. Cultural identity positioned as asset, not liability. Technical portfolio + essay + identity = NCWIT win.',
        'test_score_boost': f'Consistent SAT prep integrated into 168-hour schedule. Targeted practice on weak areas. Achieved 190+ point increase through disciplined approach.',
        'gpa_boost': f'Breaking B→A pattern required first-semester front-loading. All A\'s both semesters achieved through schedule discipline.',
        'essay_transformation': f'Parent story reframe technique: surface unconscious experiences (mom language barrier) → connect to mission (AI tutor) → specific sensory details. Generic → 9/10 authentic.',
        'identity_clarity': f'Identity as differentiator strategy: validate cultural identity → build coherent narrative → weave into all components. Muslim girl breaking tech barriers became core brand.',
        'time_management_breakthrough': f'168-hour framework + compound-benefit activities = 10 meaningful activities in 6 months. Time reclaimed: 20-40 hrs/week through optimization.',
        'ec_user_scale': f'Synthoria scale growth through targeted user acquisition and iterative improvements. {chip_count} coaching interventions over {duration_weeks} weeks.',
        'ec_funding': f'Resource acquisition through strategic grant applications and competition winnings. Multiple funding sources secured.',
        'ec_leadership_role': f'Leadership roles acquired through founder mindset shift. Women in AI Club + Encode Justice leadership established.',
        'portfolio_showcase': f'GitHub portfolio built systematically. 5 projects showcased demonstrating college-level technical maturity.',
        'community_impact_scale': f'Sunday School teaching + cultural video series positioned as community impact differentiator. 50+ students taught.',
        'trust_building': f'Early work showcase (game demo) created massive investment. 90%+ task completion rate sustained through trust.',
        'barrier_breakthrough': f'Multiple barriers broken systematically over {duration_weeks} weeks: time management, narrative, identity, scale, leadership.',
        'technical_skill_development': f'Technical skills mastery through systematic project building. Backend, frontend, ML skills demonstrated in portfolio.',
        'activity_output_surge': f'Compound-benefit thinking: one activity yields multiple outcomes. 2 → 10 meaningful activities in 6 months.',
        'regional_award_win': f'Regional recognition in speech & debate and film. Foundation for national-level applications.'
    }

    what_worked = what_worked_map.get(category_key, f'{category_name} pattern validated')

    # What was hard
    what_was_hard = f'Sustaining discipline over {duration_weeks} weeks. Phases: {", ".join(phases)}. Required consistent coaching check-ins.'

    # Advice to similar students
    advice_map = {
        'national_award_win': 'Start early (junior summer). Build authentic narrative. Don\'t hide cultural identity. Connect personal story to technical work. NCWIT values authenticity + impact.',
        'test_score_boost': 'Integrate SAT prep into daily schedule. Consistent small blocks > cramming. Use Khan Academy + practice tests. 190+ point jumps are possible with discipline.',
        'gpa_boost': 'Front-load first semester. Don\'t settle for B→A pattern. All A\'s both semesters shows consistency to colleges.',
        'essay_transformation': 'Avoid generic parent stories. Surface YOUR unconscious experiences. Connect parent barrier → your mission. Specific sensory details, not abstract concepts.',
        'identity_clarity': 'Your cultural identity is an ASSET post-affirmative action. Don\'t hide it. Build coherent narrative. Research college cultural fit (MSAs at target schools).',
        'time_management_breakthrough': 'Map all 168 hours. Design compound-benefit activities (one activity → multiple outcomes). Optimize through delegation, batching, feedback loops.',
        'ec_user_scale': 'Scale requires iteration + user feedback. Start small, improve systematically. Document impact metrics for applications.',
        'ec_funding': 'Apply to grants early and often. School resources, competitions, foundations. Multiple small sources add up.',
        'ec_leadership_role': 'Founder > member. Create new clubs aligned with your identity. Leadership through initiative, not just titles.',
        'portfolio_showcase': 'GitHub is your resume. 5 quality projects > 20 random repos. Document your thought process, not just code.',
        'community_impact_scale': 'Leverage existing community ties (Sunday School). Document hours + students taught. Cultural content is differentiator.',
        'trust_building': 'Show your work early. Game demo moment = trust. Complete 90%+ of tasks coach assigns. Trust enables aggressive goal-setting.',
        'barrier_breakthrough': 'Barriers fall systematically with coaching. Time → narrative → identity → scale. Each builds on previous.',
        'technical_skill_development': 'Self-taught is valid IF you have portfolio proof. Build projects, showcase on GitHub, document learning.',
        'activity_output_surge': 'Think compound-benefit: game project = CS skills + portfolio + NCWIT + essays + GitHub. 10 activities from 2 base projects.',
        'regional_award_win': 'Regional awards build credibility for national. Apply strategically, don\'t spread too thin.'
    }

    advice_to_similar = advice_map.get(category_key, f'Study this {category_name} pattern and adapt to your context')

    # Quality score
    quality_score = round(avg_quality, 2)

    # Serialize JSON with ensure_ascii=False to avoid Unicode escapes
    archetype_json_str = json.dumps(archetype_json, ensure_ascii=False)
    starting_stats_json_str = json.dumps(starting_stats_json, ensure_ascii=False)
    tactic_sequence_json_str = json.dumps(tactic_sequence_json, ensure_ascii=False)
    breakthroughs_json_str = json.dumps(breakthroughs_json, ensure_ascii=False)
    final_outcomes_json_str = json.dumps(final_outcomes_json, ensure_ascii=False)
    measurable_results_json_str = json.dumps(measurable_results_json, ensure_ascii=False)

    # SQL statement
    sql = f"""
-- Pattern {category_key.upper()}: {title}
INSERT INTO moat_student_success_patterns (
  contributor_type, contributor_id, student_id, coach_id,
  title, pattern_slug, outcome_category,
  student_archetype, archetype_tags,
  start_date, outcome_date,
  starting_stats, barriers_faced, initial_challenges,
  tactics_used, tactic_sequence, most_impactful,
  key_turning_points, what_clicked,
  final_outcomes, measurable_results,
  what_worked, what_was_hard, what_would_change, advice_to_similar,
  data_completeness, validation_status, validated_by, quality_score,
  created_at, updated_at
)
VALUES (
  'coach',
  'jenny-duan',
  'huda-2025',
  'jenny-duan',
  '{escape_sql_string(title)}',
  '{slug}',
  '{escape_sql_string(category_name)}',
  '{escape_sql_string(archetype_json_str)}'::jsonb,
  ARRAY{archetype_tags},
  '{start_date}'::date,
  '{end_date}'::date,
  '{escape_sql_string(starting_stats_json_str)}'::jsonb,
  ARRAY{barriers},
  '{escape_sql_string(initial_challenges)}',
  ARRAY{tactics_slugs},
  '{escape_sql_string(tactic_sequence_json_str)}'::jsonb,
  ARRAY{most_impactful},
  '{escape_sql_string(breakthroughs_json_str)}'::jsonb,
  '{escape_sql_string(what_clicked)}',
  '{escape_sql_string(final_outcomes_json_str)}'::jsonb,
  '{escape_sql_string(measurable_results_json_str)}'::jsonb,
  '{escape_sql_string(what_worked)}',
  '{escape_sql_string(what_was_hard)}',
  'Would start identity clarity work even earlier',
  '{escape_sql_string(advice_to_similar)}',
  0.95,
  'verified',
  'jenny-duan',
  {quality_score},
  '{start_date}'::timestamptz,
  now()
);
"""

    return sql

def main():
    print("🚀 Generating Success Pattern Seed SQL\n")

    # Load extracted patterns
    input_file = Path('/Users/snazir/ivylevel-platform-v10/data/migrations/scripts/extracted_success_patterns_comprehensive.json')
    with open(input_file, 'r') as f:
        data = json.load(f)

    aggregated_patterns = data.get('aggregated_patterns', {})

    print(f"📊 Loaded {len(aggregated_patterns)} aggregated success patterns\n")

    # Generate SQL header
    sql_lines = [
        "-- Migration 008c: Seed Success Pattern Chips from Jenny-Huda Journey",
        "-- Created: 2025-10-16",
        "-- Purpose: Load comprehensive success patterns across 16 categories",
        "-- Source: 678 intel chips analyzed longitudinally",
        "",
        "-- Enable migration mode",
        "SET app.migration = true;",
        "",
        "-- ============================================================================",
        "-- SEED DATA: COMPREHENSIVE SUCCESS PATTERNS (16 CATEGORIES)",
        "-- ============================================================================",
        ""
    ]

    # Generate INSERT statements
    for category_key, pattern_data in sorted(aggregated_patterns.items()):
        print(f"  ✅ Generating SQL for: {pattern_data['category_name']}")
        sql = generate_pattern_sql(category_key, pattern_data)
        sql_lines.append(sql)

    # Add verification query
    sql_lines.extend([
        "",
        "-- Verification",
        "SELECT",
        "  'Seed Complete' as status,",
        "  COUNT(*) as patterns_loaded,",
        "  STRING_AGG(DISTINCT outcome_category, ', ') as categories",
        "FROM moat_student_success_patterns",
        "WHERE student_id = 'huda-2025';",
        ""
    ])

    # Write to file
    output_file = Path('/Users/snazir/ivylevel-platform-v10/data/migrations/008c_seed_jenny_huda_success_patterns.sql')
    with open(output_file, 'w') as f:
        f.write('\n'.join(sql_lines))

    print(f"\n💾 Generated SQL seed file: {output_file}")
    print(f"📋 Total patterns: {len(aggregated_patterns)}")
    print(f"✅ Ready to execute migration!\n")

if __name__ == '__main__':
    main()
