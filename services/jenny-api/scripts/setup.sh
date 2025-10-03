#!/bin/bash
# setup.sh - Initial setup script for Jenny API

set -e

echo "🚀 Jenny API Setup"
echo "=================="

# Check if .env exists
if [ ! -f .env ]; then
    echo "Creating .env from template..."
    cp .env.example .env
    echo "✅ Created .env - Please edit with your credentials"
else
    echo "✅ .env already exists"
fi

# Install dependencies
echo ""
echo "Installing dependencies..."
npm install

# Check database connection
echo ""
echo "Checking database connection..."
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  DATABASE_URL not set. Using values from .env"
    source .env
    export DATABASE_URL="postgresql://$PGUSER:$PGPASSWORD@$PGHOST:$PGPORT/$PGDATABASE"
fi

# Test connection
if psql "$DATABASE_URL" -c "SELECT 1" >/dev/null 2>&1; then
    echo "✅ Database connection successful"
else
    echo "❌ Cannot connect to database. Please check your .env settings"
    exit 1
fi

# Apply lexical sidecar SQL
echo ""
echo "Setting up FTS materialized views..."
psql "$DATABASE_URL" -f src/indexers/sql/lexical_sidecar.sql
echo "✅ FTS views created"

# Build TypeScript
echo ""
echo "Building TypeScript..."
npm run build
echo "✅ Build complete"

echo ""
echo "==================="
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Run ETL to populate data:"
echo "   cd ../../packages/scripts/src/etl/jenny-v3"
echo "   ./run_etl.sh \"$DATABASE_URL\""
echo ""
echo "2. Start the server:"
echo "   npm run dev"
echo ""
echo "3. Test the API:"
echo "   curl http://localhost:8787/health"