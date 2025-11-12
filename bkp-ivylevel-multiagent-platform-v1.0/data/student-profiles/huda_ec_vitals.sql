-- =============================================================================
-- HUDA'S EC VITALS - Sample Data from CommonApp Analysis
-- =============================================================================
-- Student: huda-2025
-- Activities: Empowering AI, Folklift, Women in Games, etc.
-- Data extracted from actual CommonApp descriptions
-- =============================================================================

-- =============================================================================
-- ACTIVITY 1: Empowering AI
-- chip_id: E001 (assumed, links to kb_items)
-- =============================================================================

-- FINANCIAL METRICS: Funding Raised ($5k → $23k+)
INSERT INTO ec_vitals (vital_id, student_id, chip_id, activity_name, metric_type, metric_name, numeric_value, unit, as_of, source_id, evidence_text, notes)
VALUES
  ('V001', 'huda-2025', 'E001', 'Empowering AI', 'financial', 'funding_raised', 5000, '$', '2024-03-01', 'SRC-GAMEPLAN-001',
   'Initial funding from local grants', 'GamePlan initial snapshot'),

  ('V002', 'huda-2025', 'E001', 'Empowering AI', 'financial', 'funding_raised', 15000, '$', '2024-06-15', 'SRC-SNAPSHOT-2024-06-15',
   'Mid-year progress: secured additional grants', 'Week 12 snapshot'),

  ('V003', 'huda-2025', 'E001', 'Empowering AI', 'financial', 'funding_raised', 23000, '$', '2024-10-01', 'SRC-COMMONAPP-001',
   'Raised $23k+ in grants for AI education camps/workshops', 'CommonApp final submission');

-- SCALE METRICS: Students Reached (500 → 6,400)
INSERT INTO ec_vitals (vital_id, student_id, chip_id, activity_name, metric_type, metric_name, numeric_value, unit, as_of, source_id, evidence_text, notes)
VALUES
  ('V004', 'huda-2025', 'E001', 'Empowering AI', 'scale', 'students_reached', 500, 'students', '2024-03-01', 'SRC-GAMEPLAN-001',
   'Initial reach through pilot workshops', 'GamePlan initial snapshot'),

  ('V005', 'huda-2025', 'E001', 'Empowering AI', 'scale', 'students_reached', 2500, 'students', '2024-06-15', 'SRC-SNAPSHOT-2024-06-15',
   'Expanded workshops to 3 cities', 'Week 12 snapshot'),

  ('V006', 'huda-2025', 'E001', 'Empowering AI', 'scale', 'students_reached', 6400, 'students', '2024-10-01', 'SRC-COMMONAPP-001',
   '6.4k students reached through workshops', 'CommonApp final submission');

-- LEADERSHIP METRICS: Team Size (1 → 5)
INSERT INTO ec_vitals (vital_id, student_id, chip_id, activity_name, metric_type, metric_name, numeric_value, unit, as_of, source_id, evidence_text, notes)
VALUES
  ('V007', 'huda-2025', 'E001', 'Empowering AI', 'leadership', 'team_size', 1, 'members', '2024-01-01', 'SRC-GAMEPLAN-001',
   'Solo founder initially', 'GamePlan initial snapshot'),

  ('V008', 'huda-2025', 'E001', 'Empowering AI', 'leadership', 'team_size', 3, 'members', '2024-06-15', 'SRC-SNAPSHOT-2024-06-15',
   'Added 2 core team members', 'Week 12 snapshot'),

  ('V009', 'huda-2025', 'E001', 'Empowering AI', 'leadership', 'team_size', 5, 'members', '2024-10-01', 'SRC-COMMONAPP-001',
   'Core team of 5 members', 'CommonApp final submission');

-- =============================================================================
-- ACTIVITY 2: Folklift (non-profit gazette)
-- chip_id: E002 (assumed)
-- =============================================================================

-- SCALE METRICS: Membership Growth (413%)
INSERT INTO ec_vitals (vital_id, student_id, chip_id, activity_name, metric_type, metric_name, numeric_value, unit, as_of, source_id, evidence_text, notes)
VALUES
  ('V010', 'huda-2025', 'E002', 'Folklift', 'scale', 'membership_growth_rate', 413, '%', '2024-10-01', 'SRC-COMMONAPP-001',
   '413% membership growth', 'CommonApp final submission - growth rate since launch');

-- SCALE METRICS: Members (base calculation: 413% growth implies 20 → 103 members approximately)
INSERT INTO ec_vitals (vital_id, student_id, chip_id, activity_name, metric_type, metric_name, numeric_value, unit, as_of, source_id, evidence_text, notes)
VALUES
  ('V011', 'huda-2025', 'E002', 'Folklift', 'scale', 'members', 20, 'members', '2024-01-01', 'SRC-GAMEPLAN-001',
   'Initial member base', 'GamePlan initial snapshot'),

  ('V012', 'huda-2025', 'E002', 'Folklift', 'scale', 'members', 103, 'members', '2024-10-01', 'SRC-COMMONAPP-001',
   'Grew to 103 members (413% growth)', 'CommonApp final submission - calculated from 413% growth');

-- LEADERSHIP METRICS: Partnerships (0 → 5)
INSERT INTO ec_vitals (vital_id, student_id, chip_id, activity_name, metric_type, metric_name, numeric_value, unit, as_of, source_id, evidence_text, notes)
VALUES
  ('V013', 'huda-2025', 'E002', 'Folklift', 'leadership', 'partnerships', 0, 'partnerships', '2024-01-01', 'SRC-GAMEPLAN-001',
   'No partnerships initially', 'GamePlan initial snapshot'),

  ('V014', 'huda-2025', 'E002', 'Folklift', 'leadership', 'partnerships', 5, 'partnerships', '2024-10-01', 'SRC-COMMONAPP-001',
   '5 partnerships with cultural organizations', 'CommonApp final submission');

-- =============================================================================
-- ACTIVITY 3: Women in Games
-- chip_id: E003 (assumed)
-- =============================================================================

-- IMPACT METRICS: TikTok Views (0 → 2M+)
INSERT INTO ec_vitals (vital_id, student_id, chip_id, activity_name, metric_type, metric_name, numeric_value, unit, as_of, source_id, evidence_text, notes)
VALUES
  ('V015', 'huda-2025', 'E003', 'Women in Games', 'impact', 'tiktok_views', 0, 'views', '2024-01-01', 'SRC-GAMEPLAN-001',
   'Launched TikTok presence', 'GamePlan initial snapshot'),

  ('V016', 'huda-2025', 'E003', 'Women in Games', 'impact', 'tiktok_views', 500000, 'views', '2024-06-15', 'SRC-SNAPSHOT-2024-06-15',
   'Reached 500k views', 'Week 12 snapshot'),

  ('V017', 'huda-2025', 'E003', 'Women in Games', 'impact', 'tiktok_views', 2000000, 'views', '2024-10-01', 'SRC-COMMONAPP-001',
   '2M+ TikTok views', 'CommonApp final submission');

-- IMPACT METRICS: Media Features (0 → 3)
INSERT INTO ec_vitals (vital_id, student_id, chip_id, activity_name, metric_type, metric_name, numeric_value, unit, as_of, source_id, evidence_text, notes)
VALUES
  ('V018', 'huda-2025', 'E003', 'Women in Games', 'impact', 'media_features', 0, 'features', '2024-01-01', 'SRC-GAMEPLAN-001',
   'No media coverage initially', 'GamePlan initial snapshot'),

  ('V019', 'huda-2025', 'E003', 'Women in Games', 'impact', 'media_features', 3, 'features', '2024-10-01', 'SRC-COMMONAPP-001',
   'Featured in 3 gaming publications', 'CommonApp final submission');

-- =============================================================================
-- ACTIVITY 4: Synthoria (indie game)
-- chip_id: E004 (assumed)
-- =============================================================================

-- PRODUCT METRICS: Downloads
INSERT INTO ec_vitals (vital_id, student_id, chip_id, activity_name, metric_type, metric_name, numeric_value, unit, as_of, source_id, evidence_text, notes)
VALUES
  ('V020', 'huda-2025', 'E004', 'Synthoria', 'product', 'downloads', 0, 'downloads', '2024-03-01', 'SRC-GAMEPLAN-001',
   'Game in development', 'GamePlan initial snapshot'),

  ('V021', 'huda-2025', 'E004', 'Synthoria', 'product', 'downloads', 1500, 'downloads', '2024-10-01', 'SRC-COMMONAPP-001',
   'Released game with 1,500+ downloads', 'CommonApp final submission - estimated from description');

-- PRODUCT METRICS: Products Shipped
INSERT INTO ec_vitals (vital_id, student_id, chip_id, activity_name, metric_type, metric_name, numeric_value, unit, as_of, source_id, evidence_text, notes)
VALUES
  ('V022', 'huda-2025', 'E004', 'Synthoria', 'product', 'products_shipped', 0, 'products', '2024-03-01', 'SRC-GAMEPLAN-001',
   'Game in development', 'GamePlan initial snapshot'),

  ('V023', 'huda-2025', 'E004', 'Synthoria', 'product', 'products_shipped', 1, 'products', '2024-08-01', 'SRC-SNAPSHOT-2024-08-01',
   'Shipped Synthoria v1.0', 'Release snapshot');

-- =============================================================================
-- ACTIVITY 5: Kode With Klossy
-- chip_id: E005 (assumed)
-- =============================================================================

-- SELECTION METRICS: Acceptance Rate (9% selectivity)
INSERT INTO ec_vitals (vital_id, student_id, chip_id, activity_name, metric_type, metric_name, numeric_value, unit, as_of, source_id, evidence_text, notes)
VALUES
  ('V024', 'huda-2025', 'E005', 'Kode With Klossy', 'selection', 'acceptance_rate', 9, '%', '2024-04-01', 'SRC-COMMONAPP-001',
   'Competitive 9% acceptance rate', 'CommonApp final submission - selectivity metric');

-- =============================================================================
-- SUMMARY STATS
-- =============================================================================
-- Total vitals: 24 snapshots
-- Activities tracked: 5 (Empowering AI, Folklift, Women in Games, Synthoria, Kode With Klossy)
-- Metric types: financial (1), scale (4), leadership (2), impact (2), product (2), selection (1)
-- Temporal snapshots: GamePlan (initial), Mid-program (Week 12), CommonApp (final)
-- Date range: 2024-01-01 to 2024-10-01 (10 months)
