#!/bin/bash
# Daily cleanup: archive old/temp files
# Usage: ./scripts/cleanup.sh [--dry-run]

DRY_RUN=false
if [ "$1" == "--dry-run" ]; then
    DRY_RUN=true
    echo "🔍 DRY RUN MODE - No changes will be made"
fi

echo "🧹 Starting cleanup..."
echo "=" * 50

# Archive directory
ARCHIVE_DIR="archive/$(date +%Y-%m-%d)"

# Patterns to archive
PATTERNS=(
    "*_old.*"
    "*_backup.*"
    "*_bak.*"
    "test_*.py"
    "test_*.js"
    "stub_*.py"
    "stub_*.js"
    "temp_*.*"
    "tmp_*.*"
    "debug_*.*"
    "DELETE_*.*"
    "*.tmp"
    "*.bak"
    "*.orig"
)

# Directories to skip
SKIP_DIRS="archive .git node_modules venv env .venv __pycache__ dist build .next"

count=0

for pattern in "${PATTERNS[@]}"; do
    # Find files matching pattern, excluding skip directories
    while IFS= read -r -d '' file; do
        # Check if in skip directory
        skip=false
        for skip_dir in $SKIP_DIRS; do
            if [[ "$file" == *"/$skip_dir/"* ]]; then
                skip=true
                break
            fi
        done

        if [ "$skip" = false ]; then
            if [ "$DRY_RUN" = true ]; then
                echo "  Would archive: $file"
            else
                mkdir -p "$ARCHIVE_DIR"
                basename_file=$(basename "$file")
                timestamp=$(date +%H%M%S)
                archived_name="${basename_file%.*}_${timestamp}.${basename_file##*.}"
                cp "$file" "$ARCHIVE_DIR/$archived_name"
                rm "$file"
                echo "  ✅ Archived: $file"
            fi
            ((count++))
        fi
    done < <(find . -name "$pattern" -type f -print0)
done

echo ""
echo "📊 Cleanup Summary:"
echo "  • Files archived: $count"
if [ "$DRY_RUN" = false ] && [ $count -gt 0 ]; then
    echo "  • Archive location: $ARCHIVE_DIR"
fi
echo "=" * 50
echo "✅ Cleanup complete!"
