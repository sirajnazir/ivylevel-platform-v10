#!/bin/bash

echo "=== Testing KB Items Universal Ledger ==="
echo ""

echo "1. Testing SAT Progression:"
echo "   First SAT:"
psql "$DATABASE_URL" -c "SELECT * FROM v_sat_progression WHERE student_id='huda-2025' ORDER BY nth LIMIT 1;" -t

echo ""
echo "   All SAT scores:"
psql "$DATABASE_URL" -c "SELECT nth, score_total, fact_date, modality FROM v_sat_progression WHERE student_id='huda-2025' ORDER BY nth;"

echo ""
echo "2. Testing Awards Won:"
psql "$DATABASE_URL" -c "SELECT title_name, status_detail, outcome_date FROM v_awards_won WHERE student_id='huda-2025' ORDER BY outcome_date LIMIT 3;"

echo ""
echo "3. Testing Awards Initial (if migrated from award_targets):"
psql "$DATABASE_URL" -c "SELECT title_name, tier1_state, tier2_substate FROM v_awards_initial WHERE student_id='huda-2025' LIMIT 3;"

echo ""
echo "4. Testing KB Items Summary:"
psql "$DATABASE_URL" -c "SELECT item_type, tier1_state, COUNT(*) FROM kb_items WHERE student_id='huda-2025' GROUP BY item_type, tier1_state;"

echo ""
echo "=== All Tests Complete ==="
