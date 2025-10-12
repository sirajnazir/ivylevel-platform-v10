-- EQ Signal Ingestion - 8-Minute Verification Suite
-- Run this after ingestion to verify data quality

\echo ''
\echo '═══════════════════════════════════════════════════════════════'
\echo '  EQ SIGNAL INGESTION - VERIFICATION QUERIES'
\echo '═══════════════════════════════════════════════════════════════'
\echo ''

-- Check 1: Counts by source and phase
\echo '📊 Check 1: Row Counts by Source and Phase'
\echo '───────────────────────────────────────────────────────────────'
SELECT
  CASE
    WHEN source_path LIKE '%imsg%' THEN 'imsg'
    WHEN source_path LIKE '%session%' THEN 'sessions'
    ELSE 'unknown'
  END AS source_type,
  phase,
  COUNT(*) AS file_count
FROM eq_signal_sets
GROUP BY 1, 2
ORDER BY 1, 2;

\echo ''
\echo '   ✅ PASS if: imsg has ~7 files, sessions has ~5 files'
\echo ''

-- Check 2: Cue distribution
\echo '🎯 Check 2: Cue Distribution'
\echo '───────────────────────────────────────────────────────────────'
SELECT
  cue_type,
  COUNT(*) AS signal_count,
  ROUND(AVG(score)::numeric, 2) AS avg_score
FROM eq_signal_cues
GROUP BY cue_type
ORDER BY signal_count DESC
LIMIT 15;

\echo ''
\echo '   ✅ PASS if: warmth, normalization, celebration, specificity present'
\echo ''

-- Check 3: Tactic distribution
\echo '🎭 Check 3: Tactic Distribution'
\echo '───────────────────────────────────────────────────────────────'
SELECT
  tactic_type,
  COUNT(*) AS occurrence_count
FROM eq_signal_tactics
GROUP BY tactic_type
ORDER BY occurrence_count DESC
LIMIT 15;

\echo ''
\echo '   ✅ PASS if: rejection_sandwich, celebration_explosion_peak present'
\echo ''

-- Check 4: Provenance completeness
\echo '🔗 Check 4: Provenance Completeness'
\echo '───────────────────────────────────────────────────────────────'
SELECT
  'eq_signals' AS table_name,
  COUNT(*) FILTER (WHERE provenance IS NULL OR provenance = '{}'::jsonb) AS missing_provenance,
  COUNT(*) AS total,
  ROUND(100.0 * COUNT(*) FILTER (WHERE provenance IS NOT NULL AND provenance != '{}'::jsonb) / COUNT(*), 1) AS pct_with_provenance
FROM eq_signals

UNION ALL

SELECT
  'eq_utterances' AS table_name,
  COUNT(*) FILTER (WHERE provenance IS NULL OR provenance = '{}'::jsonb) AS missing_provenance,
  COUNT(*) AS total,
  ROUND(100.0 * COUNT(*) FILTER (WHERE provenance IS NOT NULL AND provenance != '{}'::jsonb) / COUNT(*), 1) AS pct_with_provenance
FROM eq_utterances;

\echo ''
\echo '   ✅ PASS if: pct_with_provenance ≥ 90% for both tables'
\echo ''

-- Check 5: PII scan (soft check)
\echo '🔒 Check 5: PII Scan'
\echo '───────────────────────────────────────────────────────────────'
SELECT
  COUNT(*) AS pii_email_suspects
FROM eq_signal_tactics
WHERE text ~* '[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}';

SELECT
  COUNT(*) AS pii_phone_suspects
FROM eq_signal_tactics
WHERE text ~* '\b\d{3}[-. ]?\d{3}[-. ]?\d{4}\b';

\echo ''
\echo '   ✅ PASS if: both counts = 0 (or known false positives)'
\echo ''

-- Check 6: Exemplar coverage
\echo '💬 Check 6: Exemplar Coverage'
\echo '───────────────────────────────────────────────────────────────'
SELECT
  COUNT(*) FILTER (WHERE exemplar IS NOT NULL AND exemplar != '') AS with_exemplar,
  COUNT(*) AS total,
  ROUND(100.0 * COUNT(*) FILTER (WHERE exemplar IS NOT NULL AND exemplar != '') / COUNT(*), 1) AS pct_with_exemplar
FROM eq_signals;

\echo ''
\echo '   ✅ PASS if: pct_with_exemplar ≥ 50%'
\echo ''

-- Check 7: Sample exemplars (visual inspection)
\echo '📝 Check 7: Sample Exemplars (Visual Inspection)'
\echo '───────────────────────────────────────────────────────────────'
SELECT
  cue_type,
  LEFT(exemplar, 80) AS sample_quote
FROM eq_signal_cues
WHERE exemplar IS NOT NULL
LIMIT 10;

\echo ''
\echo '   ✅ PASS if: quotes look human and match cue types'
\echo ''

-- Check 8: Student/phase breakdown
\echo '👤 Check 8: Student/Phase Breakdown'
\echo '───────────────────────────────────────────────────────────────'
SELECT
  student_id,
  phase,
  COUNT(*) AS file_count,
  SUM((SELECT COUNT(*) FROM eq_signals WHERE set_id = eq_signal_sets.id)) AS signal_count,
  SUM((SELECT COUNT(*) FROM eq_utterances WHERE set_id = eq_signal_sets.id)) AS utterance_count
FROM eq_signal_sets
GROUP BY student_id, phase
ORDER BY student_id, phase;

\echo ''
\echo '   ✅ PASS if: counts look reasonable (signals > 0, utterances > 0)'
\echo ''

-- Check 9: Runtime view functionality
\echo '📊 Check 9: Runtime Views'
\echo '───────────────────────────────────────────────────────────────'
SELECT * FROM v_eq_signals_runtime ORDER BY n DESC LIMIT 5;

\echo ''
\echo '   ✅ PASS if: view returns results'
\echo ''

-- Summary
\echo ''
\echo '═══════════════════════════════════════════════════════════════'
\echo '  VERIFICATION COMPLETE'
\echo '═══════════════════════════════════════════════════════════════'
\echo ''
\echo 'Quality Gates:'
\echo '  ☐ All 7 imsg files + 5 session files ingested'
\echo '  ☐ Zero ingestion errors'
\echo '  ☐ Provenance present ≥90%'
\echo '  ☐ Exemplars present ≥50%'
\echo '  ☐ No PII detected'
\echo '  ☐ All cues and tactics present'
\echo ''
\echo 'If all green → proceed to runtime integration'
\echo ''
