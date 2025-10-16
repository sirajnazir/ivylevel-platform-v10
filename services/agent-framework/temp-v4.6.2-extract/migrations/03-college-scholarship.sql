-- ===============================
-- v4.6.1 College + Scholarship + Readiness Correlation Layer
-- ===============================

-- 1️⃣ College List Table
CREATE TABLE IF NOT EXISTS college_list (
    college_id SERIAL PRIMARY KEY,
    student_id TEXT REFERENCES students(student_id) ON DELETE CASCADE,
    college_name TEXT NOT NULL,
    bucket_category TEXT CHECK (bucket_category IN ('Wild Card', 'Reach', 'Match', 'Safety')),
    decision_plan TEXT CHECK (decision_plan IN ('EA', 'ED', 'RD', 'REA', 'Rolling')),
    decision_result TEXT CHECK (decision_result IN ('Accepted', 'Rejected', 'Waitlisted', 'Deferred', 'Withdrawn', 'Pending')),
    waitlist BOOLEAN DEFAULT FALSE,
    program TEXT,
    supplements TEXT,
    location TEXT,
    acceptance_rate NUMERIC,
    interview_status TEXT,
    ivyready_score_at_submit NUMERIC,
    created_ts TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2️⃣ Scholarships Table
CREATE TABLE IF NOT EXISTS scholarships (
    scholarship_id SERIAL PRIMARY KEY,
    student_id TEXT REFERENCES students(student_id) ON DELETE CASCADE,
    scholarship_name TEXT NOT NULL,
    sponsor_org TEXT,
    amount_usd NUMERIC,
    application_status TEXT CHECK (application_status IN ('Applied', 'Accepted', 'Rejected', 'Pending')),
    decision_date DATE,
    notes TEXT,
    created_ts TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3️⃣ Readiness Correlation View
CREATE OR REPLACE VIEW v_college_readiness_correlation AS
SELECT
    c.student_id,
    c.college_name,
    c.bucket_category,
    c.decision_result,
    c.acceptance_rate,
    COALESCE(r.overall_score, 0) AS ivyready_score_at_submit,
    rf.domain,
    rf.feature_key,
    rf.feature_value,
    (rf.feature_value / NULLIF(rfw.target_value, 0)) AS relative_strength,
    CASE
        WHEN c.decision_result = 'Accepted' THEN 1
        WHEN c.decision_result = 'Waitlisted' THEN 0.5
        ELSE 0
    END AS acceptance_numeric
FROM
    college_list c
    LEFT JOIN ivyready_snapshots r ON r.student_id = c.student_id AND r.snapshot_phase = 'final_submit'
    LEFT JOIN v_features_all rf ON rf.student_id = c.student_id
    LEFT JOIN readiness_feature_weights rfw ON rfw.feature_key = rf.feature_key;

-- 4️⃣ Scholarship Impact View
CREATE OR REPLACE VIEW v_scholarship_impact AS
SELECT
    sch.student_id,
    sch.scholarship_name,
    sch.amount_usd,
    sch.application_status,
    sch.decision_date,
    COALESCE(r.overall_score, 0) AS ivyready_score_final,
    (sch.amount_usd / 1000.0) AS affordability_boost,
    (r.overall_score + (sch.amount_usd / 5000.0)) AS adjusted_readiness_score
FROM
    scholarships sch
    LEFT JOIN ivyready_snapshots r ON r.student_id = sch.student_id AND r.snapshot_phase = 'final_submit';
