#!/bin/bash
# run_pinecone_index.sh - Create and populate Pinecone v3 index

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Environment
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ivylevel"

echo -e "${GREEN}==============================${NC}"
echo -e "${GREEN}Jenny AI v3 Pinecone Indexing${NC}"
echo -e "${GREEN}==============================${NC}"

# Check for API keys
if [ -z "$OPENAI_API_KEY" ]; then
    echo -e "${RED}Error: OPENAI_API_KEY not set${NC}"
    echo "Please set: export OPENAI_API_KEY=your-key"
    exit 1
fi

if [ -z "$PINECONE_API_KEY" ]; then
    echo -e "${RED}Error: PINECONE_API_KEY not set${NC}"
    echo "Please set: export PINECONE_API_KEY=your-key"
    exit 1
fi

# Get data counts
echo -e "${YELLOW}Checking data to index...${NC}"
psql "$DATABASE_URL" << EOF
SELECT 'JTBD' as type, COUNT(*) as count FROM jtbd
UNION ALL
SELECT 'Interactions', COUNT(*) FROM interactions WHERE excluded_from_tactic_scoring = false
UNION ALL
SELECT 'Outcomes', COUNT(*) FROM outcomes;
EOF

echo ""
read -p "Proceed with indexing? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled"
    exit 0
fi

# Run indexing
echo -e "${YELLOW}Starting Pinecone indexing...${NC}"
npx ts-node index_to_pinecone_v3.ts

echo -e "${GREEN}✓ Indexing complete!${NC}"