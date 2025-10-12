#!/bin/bash
# Simple file archiver for production code
# Usage: ./scripts/archive_file.sh <filename>

set -e

FILE="$1"
if [ -z "$FILE" ]; then
    echo "Usage: $0 <filename>"
    echo "Example: $0 src/old_file.ts"
    exit 1
fi

if [ ! -f "$FILE" ]; then
    echo "❌ File not found: $FILE"
    exit 1
fi

# Create archive directory with date
ARCHIVE_DIR="archive/$(date +%Y-%m-%d)"
mkdir -p "$ARCHIVE_DIR"

# Generate timestamped filename
BASENAME=$(basename "$FILE")
TIMESTAMP=$(date +%H%M%S)
ARCHIVED_NAME="${BASENAME%.*}_${TIMESTAMP}.${BASENAME##*.}"

# Copy to archive
cp "$FILE" "$ARCHIVE_DIR/$ARCHIVED_NAME"

echo "✅ Archived: $FILE"
echo "   → $ARCHIVE_DIR/$ARCHIVED_NAME"
echo ""
echo "📝 Don't forget to update documentation after making changes!"
