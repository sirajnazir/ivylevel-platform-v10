#!/bin/bash
# seed_knowledge_moat.sh
# Purpose: Seed Knowledge Moat (DS1-DS8) with sample data
# Usage: ./tools/ingest/seed_knowledge_moat.sh
# Created: 2025-10-16 (Phase 1, Week 1, Days 2-3)

set -e

echo "🌱 Seeding Knowledge Moat (DS1-DS8)..."
echo ""

# Database connection
DB_URL="postgresql://postgres:postgres@localhost:5432/ivylevel"

# ==============================================================================
# DS1: Common Data Set - College Benchmarks
# ==============================================================================
echo "📊 DS1: Seeding college benchmarks (CDS)..."

psql "$DB_URL" << EOF
-- Top 10 colleges with realistic data
INSERT INTO moat_cds_colleges (
  college_id, college_name, class_year, acceptance_rate,
  gpa_weighted_25, gpa_weighted_75,
  sat_total_25, sat_total_75,
  sat_ebrw_25, sat_ebrw_75, sat_math_25, sat_math_75,
  act_composite_25, act_composite_75,
  enrollment_size, applicants, admitted, enrolled,
  data_source
) VALUES
('stanford', 'Stanford University', 2024, 0.0360, 4.00, 4.30, 1470, 1570, 720, 770, 750, 800, 33, 35, 7645, 56378, 2030, 1738, 'CDS 2024'),
('harvard', 'Harvard University', 2024, 0.0330, 4.10, 4.30, 1460, 1580, 730, 780, 740, 800, 33, 35, 6755, 61220, 2020, 1968, 'CDS 2024'),
('mit', 'Massachusetts Institute of Technology', 2024, 0.0395, 4.15, 4.30, 1510, 1570, 730, 780, 780, 800, 34, 36, 4638, 33796, 1335, 1127, 'CDS 2024'),
('yale', 'Yale University', 2024, 0.0463, 4.10, 4.25, 1460, 1570, 720, 780, 740, 800, 33, 35, 6536, 52250, 2420, 1554, 'CDS 2024'),
('princeton', 'Princeton University', 2024, 0.0387, 4.05, 4.25, 1450, 1560, 710, 770, 740, 790, 33, 35, 5604, 39644, 1535, 1367, 'CDS 2024'),
('columbia', 'Columbia University', 2024, 0.0385, 4.00, 4.20, 1450, 1560, 710, 770, 740, 790, 33, 35, 8842, 60551, 2332, 1470, 'CDS 2024'),
('uchicago', 'University of Chicago', 2024, 0.0528, 3.95, 4.20, 1500, 1570, 730, 780, 770, 800, 34, 35, 7559, 34648, 1829, 1799, 'CDS 2024'),
('upenn', 'University of Pennsylvania', 2024, 0.0533, 3.90, 4.15, 1460, 1550, 720, 770, 740, 790, 33, 35, 10019, 59465, 3168, 2417, 'CDS 2024'),
('caltech', 'California Institute of Technology', 2024, 0.0290, 4.15, 4.30, 1530, 1580, 730, 780, 790, 800, 35, 36, 987, 16626, 482, 235, 'CDS 2024'),
('duke', 'Duke University', 2024, 0.0597, 3.95, 4.20, 1480, 1560, 720, 770, 750, 790, 34, 35, 6883, 49469, 2955, 1759, 'CDS 2024')
ON CONFLICT (college_id) DO UPDATE SET
  class_year = EXCLUDED.class_year,
  acceptance_rate = EXCLUDED.acceptance_rate,
  last_updated = NOW();
EOF

echo "✅ DS1: Seeded 10 colleges"
echo ""

# ==============================================================================
# DS2: Rubric Factors
# ==============================================================================
echo "📋 DS2: Seeding rubric factors..."

psql "$DB_URL" << EOF
-- Stanford rubric factors
INSERT INTO moat_rubric_factors (college_id, factor_name, factor_category, importance, description, examples, source) VALUES
('stanford', 'Intellectual Vitality', 'academic', 'critical', 'Curiosity and love of learning demonstrated through coursework and pursuits', 'Taking courses beyond requirements, independent research, deep exploration of interests', 'Stanford Admissions 2024'),
('stanford', 'Impact and Initiative', 'extracurricular', 'critical', 'Making meaningful contributions and taking leadership roles', 'Starting organizations, significant community impact, entrepreneurial ventures', 'Stanford Admissions 2024'),
('stanford', 'Character and Context', 'character', 'important', 'Personal qualities and how you''ve used opportunities', 'Overcoming challenges, ethical leadership, empathy, resilience', 'Stanford Admissions 2024'),

-- MIT rubric factors
('mit', 'Collaboration and Community', 'character', 'critical', 'Ability to work with others and contribute to community', 'Team projects, collaborative research, community building', 'MIT Admissions 2024'),
('mit', 'Risk-Taking and Resilience', 'character', 'critical', 'Willingness to try difficult things and learn from failure', 'Taking challenging courses, pursuing difficult research, recovering from setbacks', 'MIT Admissions 2024'),
('mit', 'Hands-On Creativity', 'academic', 'important', 'Making things and solving problems through building', 'Engineering projects, robotics, maker activities, hackathons', 'MIT Admissions 2024'),

-- Harvard rubric factors
('harvard', 'Academic Excellence', 'academic', 'critical', 'Intellectual achievement and potential', 'Rigorous curriculum, academic awards, research accomplishments', 'Harvard Admissions 2024'),
('harvard', 'Extracurricular Distinction', 'extracurricular', 'critical', 'Unusual excellence in one or more areas', 'National-level achievement, significant impact in chosen area', 'Harvard Admissions 2024'),
('harvard', 'Personal Qualities', 'character', 'important', 'Maturity, character, leadership, self-confidence, warmth of personality', 'Strong recommendations, compelling personal narrative', 'Harvard Admissions 2024')
ON CONFLICT DO NOTHING;
EOF

echo "✅ DS2: Seeded 9 rubric factors (3 colleges)"
echo ""

# ==============================================================================
# DS3: School Profiles - Hyperlocal
# ==============================================================================
echo "🏫 DS3: Seeding school profiles..."

psql "$DB_URL" << EOF
INSERT INTO moat_school_profiles (
  school_id, school_name, school_type, city, state, zip,
  total_students, gpa_scale, ranking_system, weighted_gpa_available,
  ap_courses_offered, ib_program,
  avg_sat_score, avg_act_score, percent_to_4year,
  competitiveness_tier, data_source
) VALUES
('palo-alto-hs', 'Palo Alto High School', 'public', 'Palo Alto', 'CA', '94301', 2100, 4.0, 'percentile', true, 28, false, 1350, 30, 92.0, 'highly_competitive', 'Naviance 2024'),
('stuyvesant-hs', 'Stuyvesant High School', 'public', 'New York', 'NY', '10282', 3350, 5.0, 'percentile', true, 25, false, 1480, 33, 99.0, 'highly_competitive', 'Naviance 2024'),
('thomas-jefferson', 'Thomas Jefferson High School for Science and Technology', 'public', 'Alexandria', 'VA', '22312', 1900, 4.0, 'percentile', true, 30, false, 1500, 34, 99.0, 'highly_competitive', 'Naviance 2024'),
('phillips-exeter', 'Phillips Exeter Academy', 'private', 'Exeter', 'NH', '03833', 1100, 4.0, 'none', false, 0, false, 1430, 32, 100.0, 'highly_competitive', 'School Website 2024'),
('mission-hs', 'Mission High School', 'public', 'San Francisco', 'CA', '94110', 950, 4.0, 'percentile', true, 12, false, 1050, 22, 65.0, 'moderate', 'School District Data 2024')
ON CONFLICT (school_id) DO UPDATE SET
  total_students = EXCLUDED.total_students,
  avg_sat_score = EXCLUDED.avg_sat_score,
  last_updated = NOW();
EOF

echo "✅ DS3: Seeded 5 school profiles"
echo ""

# ==============================================================================
# DS4: Placement History
# ==============================================================================
echo "📈 DS4: Seeding placement history..."

psql "$DB_URL" << EOF
-- Palo Alto HS → Stanford pipeline
INSERT INTO moat_placement_history (
  school_id, college_id, class_year,
  applied, accepted, waitlisted, rejected, enrolled,
  gpa_weighted_avg, gpa_weighted_min, gpa_weighted_max,
  sat_total_avg, sat_total_min, sat_total_max,
  data_source
) VALUES
('palo-alto-hs', 'stanford', 2024, 85, 8, 12, 65, 5, 4.20, 4.10, 4.35, 1520, 1480, 1570, 'Naviance 2024'),
('palo-alto-hs', 'mit', 2024, 42, 4, 6, 32, 3, 4.25, 4.15, 4.35, 1540, 1510, 1570, 'Naviance 2024'),
('stuyvesant-hs', 'mit', 2024, 180, 22, 25, 133, 18, 4.85, 4.60, 5.00, 1550, 1510, 1590, 'Naviance 2024'),
('stuyvesant-hs', 'harvard', 2024, 165, 18, 20, 127, 14, 4.88, 4.70, 5.00, 1560, 1520, 1590, 'Naviance 2024'),
('thomas-jefferson', 'mit', 2024, 95, 18, 12, 65, 15, 4.30, 4.20, 4.38, 1560, 1530, 1590, 'Naviance 2024')
ON CONFLICT (school_id, college_id, class_year) DO UPDATE SET
  applied = EXCLUDED.applied,
  accepted = EXCLUDED.accepted,
  last_updated = NOW();
EOF

echo "✅ DS4: Seeded 5 placement records"
echo ""

# ==============================================================================
# DS5: Student Twins
# ==============================================================================
echo "👥 DS5: Seeding student twins (similar profiles)..."

psql "$DB_URL" << EOF
INSERT INTO moat_student_twins (
  profile_hash, gpa_weighted_range, sat_total_range, ec_tier, awards_tier,
  essay_quality, demographics, school_tier,
  colleges_applied, colleges_accepted, colleges_waitlisted, colleges_rejected,
  acceptance_rate, outcomes, class_year, data_source
) VALUES
(
  md5('4.0-4.2_1450-1500_tier2_tier2_strong_asian_highly_competitive'),
  '4.0-4.2', '1450-1500', 'tier2', 'tier2', 'strong', 'asian', 'highly_competitive',
  12, 5, 3, 4, 0.4167,
  '[
    {"college": "stanford", "decision": "rejected"},
    {"college": "mit", "decision": "waitlisted"},
    {"college": "berkeley", "decision": "accepted"},
    {"college": "ucla", "decision": "accepted"},
    {"college": "uchicago", "decision": "accepted"}
  ]'::jsonb,
  2024, 'Reddit r/ApplyingToCollege 2024'
),
(
  md5('4.2-4.4_1500-1550_tier1_tier1_exceptional_white_highly_competitive'),
  '4.2-4.4', '1500-1550', 'tier1', 'tier1', 'exceptional', 'white', 'highly_competitive',
  15, 9, 2, 4, 0.6000,
  '[
    {"college": "stanford", "decision": "accepted"},
    {"college": "harvard", "decision": "accepted"},
    {"college": "yale", "decision": "waitlisted"},
    {"college": "princeton", "decision": "accepted"},
    {"college": "mit", "decision": "rejected"}
  ]'::jsonb,
  2024, 'College Confidential 2024'
)
ON CONFLICT (profile_hash) DO UPDATE SET
  class_year = EXCLUDED.class_year,
  last_updated = NOW();
EOF

echo "✅ DS5: Seeded 2 student twin profiles"
echo ""

# ==============================================================================
# DS6: Summer Programs
# ==============================================================================
echo "☀️ DS6: Seeding summer programs..."

psql "$DB_URL" << EOF
INSERT INTO moat_summer_programs (
  program_id, program_name, sponsor_organization, program_type,
  duration_weeks, cost_usd, financial_aid_available, acceptance_rate,
  selectivity, academic_credit, college_credit,
  prestige_tier, admissions_boost, target_colleges,
  website
) VALUES
('rsi', 'Research Science Institute', 'MIT / CEE', 'research', 6, 0, true, 0.0500, 'highly_selective', false, false, 'tier1', 'significant', ARRAY['mit', 'stanford', 'caltech', 'harvard'], 'https://www.cee.org/rsi'),
('tasp', 'Telluride Association Summer Program', 'Telluride Association', 'academic', 6, 0, true, 0.0600, 'highly_selective', false, false, 'tier1', 'significant', ARRAY['yale', 'cornell', 'uchicago'], 'https://www.tellurideassociation.org/tasp'),
('mit-launch', 'MIT Launch', 'MIT', 'leadership', 4, 7500, true, 0.2000, 'selective', false, false, 'tier2', 'moderate', ARRAY['mit', 'stanford'], 'https://mitlaunch.com'),
('stanford-simr', 'Stanford Institutes of Medicine Summer Research Program', 'Stanford', 'research', 8, 7000, true, 0.1500, 'selective', false, false, 'tier2', 'moderate', ARRAY['stanford', 'harvard'], 'https://simr.stanford.edu'),
('ssp', 'Summer Science Program', 'SSP', 'academic', 6, 6800, true, 0.2500, 'selective', false, false, 'tier2', 'moderate', ARRAY['caltech', 'mit'], 'https://summerscience.org')
ON CONFLICT (program_id) DO UPDATE SET
  cost_usd = EXCLUDED.cost_usd,
  last_updated = NOW();
EOF

echo "✅ DS6: Seeded 5 summer programs"
echo ""

# ==============================================================================
# DS7: Research Articles (sample for verification)
# ==============================================================================
echo "📚 DS7: Seeding research articles..."

psql "$DB_URL" << EOF
INSERT INTO moat_research_articles (
  article_id, title, authors, publication_venue, publication_date, publication_type,
  citation_count, impact_factor, abstract, keywords, field, doi, url, data_source
) VALUES
('10.1038/s41586-023-06789-0', 'Machine Learning Approaches to Protein Folding Prediction', ARRAY['Smith, J.', 'Chen, L.', 'Patel, R.'], 'Nature', '2023-08-15', 'peer_reviewed_journal', 45, 42.778, 'We present a novel machine learning approach to predict protein structures...', ARRAY['machine learning', 'protein folding', 'bioinformatics'], 'biology', '10.1038/s41586-023-06789-0', 'https://doi.org/10.1038/s41586-023-06789-0', 'PubMed 2024'),
('arxiv:2308.12345', 'Quantum Error Correction in Superconducting Qubits', ARRAY['Lee, M.', 'Johnson, K.'], 'arXiv preprint', '2023-08-20', 'preprint', 12, NULL, 'This paper explores quantum error correction techniques...', ARRAY['quantum computing', 'error correction', 'qubits'], 'computer_science', NULL, 'https://arxiv.org/abs/2308.12345', 'arXiv 2024')
ON CONFLICT (article_id) DO UPDATE SET
  citation_count = EXCLUDED.citation_count,
  last_updated = NOW();
EOF

echo "✅ DS7: Seeded 2 research articles"
echo ""

# ==============================================================================
# DS8: Competition Results
# ==============================================================================
echo "🏆 DS8: Seeding competition results..."

psql "$DB_URL" << EOF
INSERT INTO moat_competition_results (
  competition_name, competition_level, field, organizer, year, total_participants,
  placement, placement_rank, award_name,
  prestige_tier, admissions_impact, target_colleges,
  website, data_source
) VALUES
('International Mathematical Olympiad', 'international', 'math', 'IMO', 2024, 600, 'gold', 1, 'Gold Medal', 'tier1', 'exceptional', ARRAY['mit', 'stanford', 'harvard', 'princeton'], 'https://www.imo-official.org', 'IMO Results 2024'),
('USA Mathematics Olympiad', 'national', 'math', 'MAA', 2024, 550, 'winner', 5, 'Top 5 Score', 'tier1', 'exceptional', ARRAY['mit', 'stanford', 'harvard', 'caltech'], 'https://www.maa.org/usamo', 'MAA Results 2024'),
('ISEF Grand Awards', 'international', 'science', 'Society for Science', 2024, 1800, 'first_place', 1, 'First Place - Engineering', 'tier1', 'exceptional', ARRAY['mit', 'caltech', 'stanford'], 'https://www.societyforscience.org/isef', 'ISEF 2024'),
('USA Computing Olympiad Gold Division', 'national', 'computer_science', 'USACO', 2024, 10000, 'gold', NULL, 'Gold Division Qualifier', 'tier2', 'strong', ARRAY['mit', 'stanford', 'cmu'], 'http://www.usaco.org', 'USACO 2024'),
('National Science Bowl', 'national', 'science', 'DOE', 2024, 9000, 'finalist', 8, 'Top 8 Team', 'tier2', 'strong', ARRAY['mit', 'caltech', 'princeton'], 'https://science.osti.gov/nsb', 'NSB 2024')
ON CONFLICT DO NOTHING;
EOF

echo "✅ DS8: Seeded 5 competition results"
echo ""

# ==============================================================================
# Summary
# ==============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Knowledge Moat seeding complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Seeded data:"
echo "  DS1: 10 colleges (CDS benchmarks)"
echo "  DS2: 9 rubric factors (3 colleges)"
echo "  DS3: 5 school profiles"
echo "  DS4: 5 placement records"
echo "  DS5: 2 student twin profiles"
echo "  DS6: 5 summer programs"
echo "  DS7: 2 research articles"
echo "  DS8: 5 competition results"
echo ""
echo "Next: Query the data to verify it works"
echo ""
