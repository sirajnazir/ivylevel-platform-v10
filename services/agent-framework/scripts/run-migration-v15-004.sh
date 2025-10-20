#!/bin/bash
#
# Run v15_004 - Weekly Execution Infrastructure Migration
#

DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ivylevel"

echo "🚀 Running v15_004 - Weekly Execution Infrastructure Migration..."

psql "$DATABASE_URL" <<EOF
SET app.migration=true;

\i /Users/snazir/ivylevel-platform-v10/services/agent-framework/db/migrations/v15_004_weekly_execution_infrastructure.sql

EOF

echo "✅ Migration complete!"
