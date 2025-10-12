# Claude Code Setup - IvyLevel Platform v10

**Date:** 2025-10-09
**Version:** v10.1
**Status:** ✅ Active

---

## What Was Implemented

I've set up **production-only guidelines** that I (Claude) will automatically follow for this project, based on the actual features Claude Code supports:

### 1. ✅ CLAUDE.md - Automatic Guidelines

**Location:** `/CLAUDE.md`

**What it does:**
- I automatically read this file at the start of every conversation
- Contains critical rules I MUST follow:
  - ALL code in `/services/jenny-api/` ONLY (no test-chat-ui business logic)
  - Archive files before replacing them
  - Update documentation after every change
  - No random test/temp files
  - Production architecture patterns

### 2. ✅ Simple Archive Script

**Location:** `/scripts/archive_file.sh`

**Usage:**
```bash
# Before replacing any file
./scripts/archive_file.sh src/old_file.ts

# Creates timestamped archive: archive/2025-10-09/old_file_183045.ts
```

### 3. ✅ Automated Cleanup Script

**Location:** `/scripts/cleanup.sh`

**Usage:**
```bash
# Dry run to see what would be archived
./scripts/cleanup.sh --dry-run

# Actually archive old files
./scripts/cleanup.sh
```

**What it archives:**
- `*_old.*`, `*_backup.*`, `*_bak.*`
- `test_*.py`, `test_*.js`
- `stub_*.py`, `stub_*.js`
- `temp_*.*`, `tmp_*.*`
- `debug_*.*`, `DELETE_*.*`
- `*.tmp`, `*.bak`, `*.orig`

### 4. ✅ Archive Directory Structure

**Location:** `/archive/`

**Structure:**
```
archive/
├── .gitignore                    # Ignores all archived files
├── 2025-10-09/                  # Date-based folders
│   ├── oldfile_183045.ts
│   ├── test_feature_184520.js
│   └── ...
└── lib-old-routing/             # Previously archived duplicates
    ├── README.md
    ├── intentLexicon.ts
    ├── orchestrator.ts
    └── ...
```

---

## How It Works

### Automatic Behavior

Every time you start a conversation with me (Claude), I will:

1. **Read CLAUDE.md** automatically
2. **Follow all rules** listed there
3. **Never create** random test/temp files
4. **Always archive** before replacing files
5. **Always update** documentation after changes
6. **Only modify** production code in `/services/jenny-api/`

### Manual Commands You Can Run

```bash
# Start of each coding session
./scripts/cleanup.sh

# Before replacing a file
./scripts/archive_file.sh path/to/file.ts

# Check what would be cleaned up
./scripts/cleanup.sh --dry-run
```

---

## Daily Workflow

### Morning (Start of Session)

```bash
cd /Users/snazir/ivylevel-platform-v10

# Clean up any old files from previous session
./scripts/cleanup.sh

# Check git status
git status
```

### During Development (With Claude)

Just tell me:
```
"I need to update the intent router"
```

I will automatically:
1. ✅ Check if file exists
2. ✅ Archive old version if replacing
3. ✅ Make changes in `/services/jenny-api/` ONLY
4. ✅ Update CHANGELOG.md
5. ✅ Update master specs if needed
6. ✅ NO random test files created

### Before Committing

```bash
# I will have already updated documentation, but verify:
git diff docs/MASTER_PROD_TECH_SPEC.md
git diff CHANGELOG.md

# Then commit
git add -A
git commit -m "Your message"
```

---

## What You DON'T Need To Do

❌ **You don't need to:**
- Tell me to archive files (I'll do it automatically)
- Remind me to update docs (I'll do it automatically)
- Tell me not to create test files (I won't)
- Specify production location (I know it's jenny-api)
- Manually run cleanup scripts (but you can if you want)

✅ **You just need to:**
- Tell me what you want to build/fix
- Review my changes
- Run `./scripts/cleanup.sh` occasionally

---

## Testing the Setup

### Test 1: Check CLAUDE.md
```bash
cat CLAUDE.md | head -20
# Should show production-only guidelines
```

### Test 2: Test Archive Script
```bash
echo "test" > test_file_delete_me.txt
./scripts/archive_file.sh test_file_delete_me.txt
# Should show: ✅ Archived: test_file_delete_me.txt
ls archive/$(date +%Y-%m-%d)/
# Should show timestamped file
```

### Test 3: Test Cleanup Script
```bash
./scripts/cleanup.sh --dry-run
# Should list files that would be archived
```

### Test 4: Ask Claude
Start a new conversation and say:
```
"What are the critical rules for this project?"
```

I should reference:
- Production code in `/services/jenny-api/` ONLY
- Archive before replacing files
- Update documentation after changes
- No random test files

---

## Project Rules Summary

### 🎯 Production Code Location
**ONLY:** `/services/jenny-api/`
- ✅ `src/router/intentRouter.ts` - Intent classification + fact guardrails
- ✅ `src/orchestrator/agentChat-utfa.ts` - Orchestration + deduplication
- ✅ `src/compose/compose.ts` - Answer composition + meta-stripping
- ✅ `src/resolvers/enums.ts` - Awards, ECs, Programs resolvers

**NOT:** `/apps/test-chat-ui/lib/` (UI layer only)

### 📝 Documentation (Always Updated)
- `CHANGELOG.md` - Every change logged
- `docs/MASTER_PROD_TECH_SPEC.md` - Production architecture
- `docs/PROD_DB_ARCH.md` - Database schema
- `docs/PROD_FEATURE_RELEASE_DETAILS.md` - Version history

### 🗂️ Archive Strategy
- Before replacing: `./scripts/archive_file.sh <file>`
- Daily cleanup: `./scripts/cleanup.sh`
- Archives stored: `archive/YYYY-MM-DD/`
- All gitignored (not committed)

### 🚫 Never Create
- ❌ `test_*.py`, `temp_*.js`, `stub_*.py`
- ❌ `*_old.*`, `*_backup.*`, `*_bak.*`
- ❌ Duplicate routing in test-chat-ui
- ❌ Random files in src directories

---

## Examples

### Example 1: Fixing a Bug

**You say:**
```
"Fix the deduplication bug in the orchestrator"
```

**I will:**
1. ✅ Archive current `agentChat-utfa.ts`
2. ✅ Fix the bug in `/services/jenny-api/src/orchestrator/`
3. ✅ Update `CHANGELOG.md`: "- [2025-10-09 18:30] Fixed deduplication bug"
4. ✅ Update `MASTER_PROD_TECH_SPEC.md` if needed

**You verify and commit**

### Example 2: Adding a Feature

**You say:**
```
"Add support for college essay queries"
```

**I will:**
1. ✅ Add intent patterns to `intentRouter.ts` (after archiving)
2. ✅ Add resolver to `resolvers/essays.ts`
3. ✅ Update orchestrator to handle essay queries
4. ✅ Update all documentation:
   - CHANGELOG.md: "- [timestamp] Added college essay query support"
   - MASTER_PROD_TECH_SPEC.md: Document new resolver
   - PROD_FEATURE_RELEASE_DETAILS.md: Add to v10.2 features

**No random test files created**

### Example 3: Replacing a File

**You say:**
```
"Replace the old intent router with the new one"
```

**I will:**
1. ✅ Run: `./scripts/archive_file.sh services/jenny-api/src/router/intentRouter.ts`
2. ✅ Create new `intentRouter.ts`
3. ✅ Update documentation
4. ✅ Confirm archive location

**Old version safely stored in archive/**

---

## Troubleshooting

### Issue: Files not being archived

**Check:**
```bash
ls -la scripts/
# Should show archive_file.sh and cleanup.sh as executable

# If not:
chmod +x scripts/*.sh
```

### Issue: Too many old files accumulating

**Solution:**
```bash
# Run cleanup
./scripts/cleanup.sh

# Manually clean very old archives (optional)
find archive/ -name "*.ts" -mtime +30 -delete
```

### Issue: Claude creating random test files

**This shouldn't happen, but if it does:**
1. Remind me: "See CLAUDE.md - no random test files"
2. Run cleanup: `./scripts/cleanup.sh`
3. Report the issue (this would be a bug)

---

## Summary

### What's Active Now

✅ **CLAUDE.md** - I automatically follow these rules
✅ **Archive scripts** - Manual file archiving available
✅ **Cleanup script** - Automated old file removal
✅ **Archive directory** - Gitignored storage for old files
✅ **Production-only focus** - All code in `/services/jenny-api/`

### What This Prevents

❌ Random test files scattered everywhere
❌ Multiple versions of same file
❌ Duplicate routing logic in test-chat-ui
❌ Outdated documentation
❌ Lost old file versions

### What You Get

✅ Clean project structure
✅ Always up-to-date documentation
✅ Safe file archiving
✅ Production-only code discipline
✅ Automatic best practices

---

**Status:** ✅ Active
**Last Updated:** 2025-10-09
**Production Code:** `/services/jenny-api/` ONLY
