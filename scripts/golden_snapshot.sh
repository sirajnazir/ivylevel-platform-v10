#!/bin/bash
# Golden snapshot export script - captures current state for rollback/comparison

set -euo pipefail

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📸 Creating golden snapshot...${NC}"

# Create snapshot directory with date
SNAPSHOT_DIR="data/snapshots/$(date +%F)"
mkdir -p "$SNAPSHOT_DIR"

echo -e "${GREEN}✓ Created snapshot directory: $SNAPSHOT_DIR${NC}"

# Export vitals for key students
STUDENTS=("huda" "sarah" "jenny")  # Add more students as needed
for student in "${STUDENTS[@]}"; do
    echo -n "  - Exporting vitals for $student..."
    curl -s "http://localhost:4103/students/$student/vitals" > "$SNAPSHOT_DIR/vitals.$student.json" 2>/dev/null || {
        echo -e " ${RED}Failed${NC}"
        continue
    }
    echo -e " ${GREEN}Done${NC}"
done

# Export canon documents
CANON_KEYS=("APP_FINAL_AWARDS" "APP_FINAL_ECS" "GAMEPLAN_INITIAL_AWARDS" "COLLEGE_DECISIONS")
for canon_key in "${CANON_KEYS[@]}"; do
    echo -n "  - Exporting canon $canon_key..."
    curl -s "http://localhost:4103/canon/$canon_key/chips" > "$SNAPSHOT_DIR/canon.$canon_key.chips.json" 2>/dev/null || {
        echo -e " ${RED}Failed${NC}"
        continue
    }
    echo -e " ${GREEN}Done${NC}"
done

# Export retriever stats
echo -n "  - Exporting retriever stats..."
curl -s -X POST http://localhost:4102/admin/stats \
    -H "content-type: application/json" \
    -d '{}' > "$SNAPSHOT_DIR/retriever.stats.json" 2>/dev/null || {
    echo -e " ${RED}Failed${NC}"
}
echo -e " ${GREEN}Done${NC}"

# Export system metadata
echo -n "  - Capturing system metadata..."
cat > "$SNAPSHOT_DIR/metadata.json" <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "git_commit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
  "branch": "$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')",
  "services": {
    "agent": "$(curl -s http://localhost:4101/health | jq -r '.version' 2>/dev/null || echo 'offline')",
    "retriever": "$(curl -s http://localhost:4102/health | jq -r '.version' 2>/dev/null || echo 'offline')",
    "api": "$(curl -s http://localhost:4000/health | jq -r '.version' 2>/dev/null || echo 'offline')"
  }
}
EOF
echo -e " ${GREEN}Done${NC}"

# Calculate snapshot size
SNAPSHOT_SIZE=$(du -sh "$SNAPSHOT_DIR" | cut -f1)
FILE_COUNT=$(find "$SNAPSHOT_DIR" -type f | wc -l | tr -d ' ')

echo -e "${GREEN}✅ Snapshot complete!${NC}"
echo -e "   📁 Location: $SNAPSHOT_DIR"
echo -e "   📊 Size: $SNAPSHOT_SIZE ($FILE_COUNT files)"
echo -e "   🔖 Commit: $(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')"