#!/bin/bash
# Load DS6 (Essays) and DS7 (AO Perspectives) into database
# Created: 2025-10-16 (Week 6)

set -e

echo "Loading DS6 (Essay Examples) and DS7 (AO Perspectives)..."

# Check DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL not set"
  exit 1
fi

echo "✅ DATABASE_URL is set"

# Create DS6 schema (enable migrations)
echo "Creating DS6 (Essay Examples) schema..."
psql "$DATABASE_URL" -c "SET app.migration=true;" -f data/category2/essays/schema.sql

# Load DS6 data
echo "Loading DS6 sample data (3 essays)..."
psql "$DATABASE_URL" -f data/category2/essays/sample_data.sql

# Create DS7 schema
echo "Creating DS7 (AO Perspectives) schema..."
psql "$DATABASE_URL" -f data/category2/admissions/schema.sql

# Load DS7 data
echo "Loading DS7 sample data (4 perspectives)..."
psql "$DATABASE_URL" -f data/category2/admissions/sample_data.sql

# Verify data loaded
echo ""
echo "Verifying data..."
psql "$DATABASE_URL" -c "SELECT COUNT(*) as essay_count FROM moat_essay_examples;"
psql "$DATABASE_URL" -c "SELECT COUNT(*) as perspective_count FROM moat_ao_perspectives;"

echo ""
echo "✅ DS6 and DS7 data loaded successfully!"
echo ""
echo "Sample queries:"
echo "  - psql \$DATABASE_URL -c \"SELECT * FROM v_essay_search LIMIT 3;\""
echo "  - psql \$DATABASE_URL -c \"SELECT * FROM v_ao_insights LIMIT 3;\""
