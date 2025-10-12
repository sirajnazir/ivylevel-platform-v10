#!/bin/bash
# EQ Signal Validation: 10-minute smoke test suite
# Tests ingestion + runtime behavior of humanizer guards

set -e

echo "🔍 EQ SIGNAL VALIDATION SUITE"
echo "=============================="
echo ""

# Check DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL not set"
  echo "   Export it first: export DATABASE_URL=postgres://..."
  exit 1
fi

echo "✅ DATABASE_URL configured"
echo ""

# Test 1: Schema validation
echo "📊 Test 1: Schema Validation"
echo "----------------------------"
psql "$DATABASE_URL" -c "
  SELECT
    table_name
  FROM information_schema.tables
  WHERE table_name IN ('eq_signal_sets', 'eq_signals', 'eq_utterances')
  ORDER BY table_name;
" -t | grep -q "eq_signal_sets" && echo "   ✅ eq_signal_sets exists" || echo "   ❌ eq_signal_sets missing"

psql "$DATABASE_URL" -c "
  SELECT
    table_name
  FROM information_schema.tables
  WHERE table_name IN ('eq_signal_sets', 'eq_signals', 'eq_utterances')
  ORDER BY table_name;
" -t | grep -q "eq_signals" && echo "   ✅ eq_signals exists" || echo "   ❌ eq_signals missing"

psql "$DATABASE_URL" -c "
  SELECT
    table_name
  FROM information_schema.tables
  WHERE table_name IN ('eq_signal_sets', 'eq_signals', 'eq_utterances')
  ORDER BY table_name;
" -t | grep -q "eq_utterances" && echo "   ✅ eq_utterances exists" || echo "   ❌ eq_utterances missing"

echo ""

# Test 2: Data counts
echo "📈 Test 2: Data Ingestion Counts"
echo "---------------------------------"
SET_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM eq_signal_sets;")
SIGNAL_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM eq_signals;")
UTTERANCE_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM eq_utterances;")

echo "   Signal Sets:  $SET_COUNT"
echo "   Signals:      $SIGNAL_COUNT"
echo "   Utterances:   $UTTERANCE_COUNT"

if [ "$SET_COUNT" -gt 0 ]; then
  echo "   ✅ Data ingested successfully"
else
  echo "   ⚠️  No data found - run ingestion first"
  echo "      python apps/ingest/ingest_eq_json.py"
fi

echo ""

# Test 3: Cue coverage
echo "🎯 Test 3: EQ Cue Coverage"
echo "--------------------------"
psql "$DATABASE_URL" -c "
  SELECT
    cue,
    COUNT(*) as signal_count
  FROM eq_signals
  GROUP BY cue
  ORDER BY signal_count DESC
  LIMIT 10;
"

echo ""

# Test 4: Move type patterns
echo "🎭 Test 4: Move Type Patterns"
echo "-----------------------------"
psql "$DATABASE_URL" -c "
  SELECT
    move_type,
    COUNT(*) as occurrence_count
  FROM eq_utterances
  WHERE move_type IS NOT NULL
  GROUP BY move_type
  ORDER BY occurrence_count DESC
  LIMIT 10;
"

echo ""

# Test 5: Exemplar samples
echo "💬 Test 5: Exemplar Samples"
echo "---------------------------"
psql "$DATABASE_URL" -c "
  SELECT
    cue,
    LEFT(exemplar, 80) as sample_quote
  FROM eq_signals
  WHERE exemplar IS NOT NULL
  LIMIT 5;
"

echo ""

# Test 6: Student/phase breakdown
echo "👤 Test 6: Student/Phase Breakdown"
echo "-----------------------------------"
psql "$DATABASE_URL" -c "
  SELECT
    student_id,
    phase,
    COUNT(*) as file_count
  FROM eq_signal_sets
  GROUP BY student_id, phase
  ORDER BY student_id, phase;
"

echo ""

# Test 7: Provenance check
echo "🔗 Test 7: Provenance Links"
echo "---------------------------"
PROV_COUNT=$(psql "$DATABASE_URL" -t -c "
  SELECT COUNT(*)
  FROM eq_signals
  WHERE provenance IS NOT NULL;
")
echo "   Signals with provenance: $PROV_COUNT"

if [ "$PROV_COUNT" -gt 0 ]; then
  echo "   ✅ Provenance tracking active"
else
  echo "   ⚠️  No provenance found"
fi

echo ""

# Test 8: View validation
echo "📊 Test 8: Aggregate Views"
echo "--------------------------"
psql "$DATABASE_URL" -c "
  SELECT * FROM eq_cue_summary LIMIT 3;
"

echo ""
psql "$DATABASE_URL" -c "
  SELECT * FROM eq_move_patterns LIMIT 3;
"

echo ""

# Summary
echo "✅ VALIDATION COMPLETE"
echo "======================"
echo ""
echo "Next steps:"
echo "  1. Review cue coverage above"
echo "  2. Verify move types match expected tactics"
echo "  3. Check provenance links are present"
echo "  4. Run smoke tests: ./tools/qa/eq_smoke_tests.sh"
echo ""
