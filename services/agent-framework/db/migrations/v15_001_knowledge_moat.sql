-- v15_001_knowledge_moat.sql
-- Knowledge Moat: Category 2 Data (DS1-DS8)
-- Purpose: Structured enrichment data for zero-hallucination college advisory
-- Created: 2025-10-16 (Phase 1, Week 1, Days 2-3)

-- Enable DDL for migrations
SET app.migration = true;

BEGIN;

-- ==============================================================================
-- DS1: Common Data Set (CDS) - College Benchmarks
-- ==============================================================================
-- Source: IPEDS, Common Data Set Initiative
-- Purpose: Authoritative college statistics for benchmarking student profile

CREATE TABLE moat_cds_colleges (
  college_id VARCHAR(50) PRIMARY KEY,
  college_name VARCHAR(255) NOT NULL,
  class_year INTEGER NOT NULL,            -- e.g., 2024
  acceptance_rate NUMERIC(5,4),           -- e.g., 0.0360 for 3.6%

  -- Academic benchmarks
  gpa_weighted_25 NUMERIC(3,2),           -- 25th percentile weighted GPA
  gpa_weighted_75 NUMERIC(3,2),           -- 75th percentile weighted GPA
  gpa_unweighted_25 NUMERIC(3,2),
  gpa_unweighted_75 NUMERIC(3,2),

  -- Testing benchmarks
  sat_total_25 INTEGER,                   -- 25th percentile SAT total (400-1600)
  sat_total_75 INTEGER,                   -- 75th percentile SAT total
  sat_ebrw_25 INTEGER,
  sat_ebrw_75 INTEGER,
  sat_math_25 INTEGER,
  sat_math_75 INTEGER,
  act_composite_25 INTEGER,
  act_composite_75 INTEGER,

  -- Class profile
  enrollment_size INTEGER,
  applicants INTEGER,
  admitted INTEGER,
  enrolled INTEGER,

  -- Metadata
  data_source VARCHAR(100),               -- e.g., 'CDS 2024', 'IPEDS 2023'
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_moat_cds_class_year ON moat_cds_colleges(class_year);
CREATE INDEX idx_moat_cds_name ON moat_cds_colleges(college_name);

COMMENT ON TABLE moat_cds_colleges IS 'DS1: Common Data Set - College benchmarks and statistics';

-- ==============================================================================
-- DS2: Rubric Factors - Admissions Evaluation Criteria
-- ==============================================================================
-- Source: College websites, admissions handbooks, rep interviews
-- Purpose: What each college values in applicants (e.g., Stanford's "intellectual vitality")

CREATE TABLE moat_rubric_factors (
  factor_id SERIAL PRIMARY KEY,
  college_id VARCHAR(50) REFERENCES moat_cds_colleges(college_id),
  factor_name VARCHAR(255) NOT NULL,      -- e.g., 'Intellectual Vitality'
  factor_category VARCHAR(50) NOT NULL,   -- 'academic', 'extracurricular', 'character', 'demonstrated_interest'
  importance VARCHAR(20) NOT NULL,        -- 'critical', 'important', 'considered', 'not_considered'
  description TEXT,                       -- What this factor means to the college
  examples TEXT,                          -- How students can demonstrate this
  source VARCHAR(255),                    -- e.g., 'Stanford Admissions website 2024'
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_moat_rubric_college ON moat_rubric_factors(college_id);
CREATE INDEX idx_moat_rubric_category ON moat_rubric_factors(factor_category);
CREATE INDEX idx_moat_rubric_importance ON moat_rubric_factors(importance);

COMMENT ON TABLE moat_rubric_factors IS 'DS2: Rubric Factors - What colleges value in applicants';

-- ==============================================================================
-- DS3: School Profiles - Hyperlocal High School Data
-- ==============================================================================
-- Source: Naviance, school websites, counselor data
-- Purpose: Context for student's high school (competitiveness, profile, history)

CREATE TABLE moat_school_profiles (
  school_id VARCHAR(50) PRIMARY KEY,
  school_name VARCHAR(255) NOT NULL,
  school_type VARCHAR(50),                -- 'public', 'private', 'charter', 'magnet'
  city VARCHAR(100),
  state VARCHAR(2),
  zip VARCHAR(10),

  -- Academic profile
  total_students INTEGER,
  gpa_scale NUMERIC(3,1),                 -- e.g., 4.0, 5.0, 6.0
  ranking_system VARCHAR(50),             -- 'percentile', 'decile', 'none'
  weighted_gpa_available BOOLEAN DEFAULT false,
  ap_courses_offered INTEGER,
  ib_program BOOLEAN DEFAULT false,

  -- College placement profile
  avg_sat_score INTEGER,
  avg_act_score INTEGER,
  percent_to_4year NUMERIC(5,2),          -- Percent going to 4-year colleges

  -- Competitiveness indicators
  competitiveness_tier VARCHAR(20),       -- 'highly_competitive', 'competitive', 'moderate', 'less_competitive'
  naviance_link VARCHAR(500),

  -- Metadata
  data_source VARCHAR(255),
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_moat_school_state ON moat_school_profiles(state);
CREATE INDEX idx_moat_school_type ON moat_school_profiles(school_type);
CREATE INDEX idx_moat_school_tier ON moat_school_profiles(competitiveness_tier);

COMMENT ON TABLE moat_school_profiles IS 'DS3: School Profiles - Hyperlocal high school context';

-- ==============================================================================
-- DS4: College Placement History - School → College Pipelines
-- ==============================================================================
-- Source: Naviance scattergrams, counselor records
-- Purpose: Historical acceptance data from student's high school to target colleges

CREATE TABLE moat_placement_history (
  placement_id SERIAL PRIMARY KEY,
  school_id VARCHAR(50) REFERENCES moat_school_profiles(school_id),
  college_id VARCHAR(50) REFERENCES moat_cds_colleges(college_id),
  class_year INTEGER NOT NULL,            -- Graduating class year

  -- Application outcomes
  applied INTEGER DEFAULT 0,
  accepted INTEGER DEFAULT 0,
  waitlisted INTEGER DEFAULT 0,
  rejected INTEGER DEFAULT 0,
  enrolled INTEGER DEFAULT 0,

  -- Accepted student profile (aggregates)
  gpa_weighted_avg NUMERIC(4,3),
  gpa_weighted_min NUMERIC(4,3),
  gpa_weighted_max NUMERIC(4,3),
  sat_total_avg INTEGER,
  sat_total_min INTEGER,
  sat_total_max INTEGER,

  -- Metadata
  data_source VARCHAR(255),               -- e.g., 'Naviance 2024'
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(school_id, college_id, class_year)
);

CREATE INDEX idx_moat_placement_school ON moat_placement_history(school_id);
CREATE INDEX idx_moat_placement_college ON moat_placement_history(college_id);
CREATE INDEX idx_moat_placement_year ON moat_placement_history(class_year);

COMMENT ON TABLE moat_placement_history IS 'DS4: College Placement History - School to college pipelines';

-- ==============================================================================
-- DS5: Student Twins - Similar Profiles
-- ==============================================================================
-- Source: College Confidential, Reddit, admissions data books
-- Purpose: Real outcomes for students with similar profiles (GPA, SAT, ECs, etc.)

CREATE TABLE moat_student_twins (
  twin_id SERIAL PRIMARY KEY,
  profile_hash VARCHAR(64) UNIQUE NOT NULL, -- Hash of profile (GPA range, SAT range, EC tier)

  -- Profile characteristics
  gpa_weighted_range VARCHAR(20),         -- e.g., '4.0-4.2', '3.8-4.0'
  sat_total_range VARCHAR(20),            -- e.g., '1450-1500', '1500-1550'
  ec_tier VARCHAR(20),                    -- 'tier1' (national), 'tier2' (state), 'tier3' (local), 'tier4' (school)
  awards_tier VARCHAR(20),
  essay_quality VARCHAR(20),              -- 'exceptional', 'strong', 'good', 'average'
  demographics VARCHAR(50),               -- 'asian', 'white', 'hispanic', 'black', 'other', 'unknown'
  school_tier VARCHAR(20),                -- References moat_school_profiles.competitiveness_tier

  -- Outcome summary
  colleges_applied INTEGER,
  colleges_accepted INTEGER,
  colleges_waitlisted INTEGER,
  colleges_rejected INTEGER,
  acceptance_rate NUMERIC(5,4),           -- Calculated: accepted / applied

  -- Sample colleges (JSON array of outcomes)
  outcomes JSONB,                         -- [{"college": "stanford", "decision": "rejected"}, ...]

  -- Metadata
  class_year INTEGER,
  data_source VARCHAR(255),               -- e.g., 'College Confidential 2024', 'Reddit r/ApplyingToCollege'
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_moat_twins_gpa ON moat_student_twins(gpa_weighted_range);
CREATE INDEX idx_moat_twins_sat ON moat_student_twins(sat_total_range);
CREATE INDEX idx_moat_twins_ec_tier ON moat_student_twins(ec_tier);
CREATE INDEX idx_moat_twins_year ON moat_student_twins(class_year);

COMMENT ON TABLE moat_student_twins IS 'DS5: Student Twins - Outcomes for similar profiles';

-- ==============================================================================
-- DS6: Summer Programs - Pre-College Opportunities
-- ==============================================================================
-- Source: Program websites, counselor recs, aggregators
-- Purpose: Catalog of summer programs with admissions impact ratings

CREATE TABLE moat_summer_programs (
  program_id VARCHAR(100) PRIMARY KEY,
  program_name VARCHAR(255) NOT NULL,
  sponsor_organization VARCHAR(255),      -- e.g., 'MIT', 'Stanford', 'CTY'
  program_type VARCHAR(50),               -- 'academic', 'research', 'leadership', 'service', 'arts'

  -- Program details
  duration_weeks INTEGER,
  cost_usd INTEGER,
  financial_aid_available BOOLEAN DEFAULT false,
  acceptance_rate NUMERIC(5,4),
  eligibility_criteria TEXT,

  -- Academic rigor
  selectivity VARCHAR(20),                -- 'highly_selective', 'selective', 'moderately_selective', 'open_enrollment'
  academic_credit BOOLEAN DEFAULT false,
  college_credit BOOLEAN DEFAULT false,

  -- Admissions impact
  prestige_tier VARCHAR(20),              -- 'tier1' (RSI, TASP), 'tier2' (MIT Launch, Stanford SIMR), 'tier3', 'tier4'
  admissions_boost VARCHAR(20),           -- 'significant', 'moderate', 'minor', 'none'
  target_colleges TEXT[],                 -- Which colleges value this program

  -- Application details
  application_deadline DATE,
  notification_date DATE,
  program_dates_start DATE,
  program_dates_end DATE,
  website VARCHAR(500),

  -- Metadata
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_moat_programs_type ON moat_summer_programs(program_type);
CREATE INDEX idx_moat_programs_tier ON moat_summer_programs(prestige_tier);
CREATE INDEX idx_moat_programs_selectivity ON moat_summer_programs(selectivity);

COMMENT ON TABLE moat_summer_programs IS 'DS6: Summer Programs - Pre-college opportunities catalog';

-- ==============================================================================
-- DS7: Research Articles - Academic Publications & Impact
-- ==============================================================================
-- Source: PubMed, arXiv, Google Scholar, IEEE Xplore
-- Purpose: Track student research publications for EC verification

CREATE TABLE moat_research_articles (
  article_id VARCHAR(100) PRIMARY KEY,    -- DOI or arXiv ID
  title TEXT NOT NULL,
  authors TEXT[] NOT NULL,                -- Array of author names
  publication_venue VARCHAR(255),         -- Journal or conference name
  publication_date DATE,
  publication_type VARCHAR(50),           -- 'peer_reviewed_journal', 'conference', 'preprint', 'poster'

  -- Impact metrics
  citation_count INTEGER DEFAULT 0,
  impact_factor NUMERIC(5,3),             -- Journal impact factor
  h_index INTEGER,                        -- Venue h-index

  -- Content
  abstract TEXT,
  keywords TEXT[],
  field VARCHAR(100),                     -- 'biology', 'chemistry', 'computer_science', etc.

  -- Links
  doi VARCHAR(255),
  arxiv_id VARCHAR(50),
  url VARCHAR(500),

  -- Metadata
  data_source VARCHAR(255),               -- 'PubMed', 'arXiv', 'Google Scholar'
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_moat_research_field ON moat_research_articles(field);
CREATE INDEX idx_moat_research_date ON moat_research_articles(publication_date);
CREATE INDEX idx_moat_research_type ON moat_research_articles(publication_type);

COMMENT ON TABLE moat_research_articles IS 'DS7: Research Articles - Academic publications database';

-- ==============================================================================
-- DS8: Competition Results - Academic Competitions & Rankings
-- ==============================================================================
-- Source: Competition websites, results databases
-- Purpose: Verify competition placements and assess prestige

CREATE TABLE moat_competition_results (
  result_id SERIAL PRIMARY KEY,
  competition_name VARCHAR(255) NOT NULL,
  competition_level VARCHAR(50),          -- 'international', 'national', 'state', 'regional', 'local'
  field VARCHAR(100),                     -- 'math', 'science', 'engineering', 'writing', 'arts', 'debate', etc.

  -- Competition details
  organizer VARCHAR(255),                 -- e.g., 'MAA', 'Science Olympiad', 'USACO'
  year INTEGER NOT NULL,
  total_participants INTEGER,

  -- Winner information (anonymized)
  placement VARCHAR(50),                  -- 'gold', 'silver', 'bronze', 'finalist', 'semifinalist', 'honorable_mention'
  placement_rank INTEGER,                 -- Numeric rank if available
  award_name VARCHAR(255),

  -- Prestige assessment
  prestige_tier VARCHAR(20),              -- 'tier1' (IMO, USAMO), 'tier2' (AIME qual), 'tier3', 'tier4'
  admissions_impact VARCHAR(20),          -- 'exceptional', 'strong', 'moderate', 'minor'
  target_colleges TEXT[],                 -- Which colleges heavily value this

  -- Metadata
  website VARCHAR(500),
  data_source VARCHAR(255),
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_moat_competition_level ON moat_competition_results(competition_level);
CREATE INDEX idx_moat_competition_field ON moat_competition_results(field);
CREATE INDEX idx_moat_competition_tier ON moat_competition_results(prestige_tier);
CREATE INDEX idx_moat_competition_year ON moat_competition_results(year);

COMMENT ON TABLE moat_competition_results IS 'DS8: Competition Results - Academic competitions database';

-- ==============================================================================
-- Helper Views for Knowledge Moat Queries
-- ==============================================================================

-- View: College benchmarks with acceptance difficulty
CREATE VIEW v_college_benchmarks AS
SELECT
  c.college_id,
  c.college_name,
  c.class_year,
  c.acceptance_rate,
  c.gpa_weighted_25,
  c.gpa_weighted_75,
  c.sat_total_25,
  c.sat_total_75,
  c.act_composite_25,
  c.act_composite_75,
  CASE
    WHEN c.acceptance_rate <= 0.10 THEN 'reach'
    WHEN c.acceptance_rate <= 0.25 THEN 'target'
    ELSE 'safety'
  END AS difficulty_tier,
  COUNT(rf.factor_id) AS rubric_factors_count
FROM moat_cds_colleges c
LEFT JOIN moat_rubric_factors rf ON c.college_id = rf.college_id
GROUP BY c.college_id, c.college_name, c.class_year, c.acceptance_rate,
         c.gpa_weighted_25, c.gpa_weighted_75, c.sat_total_25, c.sat_total_75,
         c.act_composite_25, c.act_composite_75;

COMMENT ON VIEW v_college_benchmarks IS 'College benchmarks with difficulty tier classification';

-- View: Hyperlocal context (school + placement history)
CREATE VIEW v_hyperlocal_context AS
SELECT
  sp.school_id,
  sp.school_name,
  sp.state,
  sp.competitiveness_tier AS school_tier,
  sp.gpa_scale,
  sp.ap_courses_offered,
  sp.avg_sat_score AS school_avg_sat,
  ph.college_id,
  ph.class_year,
  ph.accepted,
  ph.rejected,
  ph.gpa_weighted_avg AS accepted_gpa_avg,
  ph.sat_total_avg AS accepted_sat_avg,
  CASE
    WHEN ph.applied > 0 THEN (ph.accepted::NUMERIC / ph.applied)
    ELSE NULL
  END AS acceptance_rate_from_school
FROM moat_school_profiles sp
LEFT JOIN moat_placement_history ph ON sp.school_id = ph.school_id;

COMMENT ON VIEW v_hyperlocal_context IS 'Hyperlocal school context with placement history';

COMMIT;

-- ==============================================================================
-- Success Message
-- ==============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Knowledge Moat v15_001 migration complete!';
  RAISE NOTICE '';
  RAISE NOTICE 'Created 8 Category 2 data tables:';
  RAISE NOTICE '  - moat_cds_colleges (DS1)';
  RAISE NOTICE '  - moat_rubric_factors (DS2)';
  RAISE NOTICE '  - moat_school_profiles (DS3)';
  RAISE NOTICE '  - moat_placement_history (DS4)';
  RAISE NOTICE '  - moat_student_twins (DS5)';
  RAISE NOTICE '  - moat_summer_programs (DS6)';
  RAISE NOTICE '  - moat_research_articles (DS7)';
  RAISE NOTICE '  - moat_competition_results (DS8)';
  RAISE NOTICE '';
  RAISE NOTICE 'Created 2 helper views:';
  RAISE NOTICE '  - v_college_benchmarks';
  RAISE NOTICE '  - v_hyperlocal_context';
  RAISE NOTICE '';
  RAISE NOTICE 'Next: Seed data using tools/ingest/seed_knowledge_moat.sh';
END $$;
