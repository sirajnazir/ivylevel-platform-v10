# Claude Code Project Guidelines - IvyLevel Platform v10

**Last Updated:** 2025-10-09
**Current Version:** v10.1 - Quality Guards + Deep Cleanup
**Production Code Location:** `/services/jenny-api/` ONLY
**Master Specs:** See [Project Structure](docs/MASTER_PROD_TECH_SPEC.md#project-structure)

---

## 🚨 CRITICAL RULES - NEVER VIOLATE

### RULE 1: FILE CREATION - MANDATORY PRE-CHECK

**BEFORE creating ANY new file, you MUST:**

1. **Check proper location:**
   ```
   ✅ Production code → /services/jenny-api/src/
   ✅ Test UI → /apps/test-chat-ui/app/ or /apps/test-chat-ui/lib/
   ✅ Documentation → /docs/guides/ or /docs/setup/
   ✅ Scripts → /scripts/ or /tools/
   ✅ Logs → /logs/ (NEVER in root)
   ```

2. **Verify not creating temporary/random files:**
   ```
   ❌ NEVER: test_*.py, temp_*.js, debug_*.log in random locations
   ❌ NEVER: *_old.*, *_backup.*, *_bak.* files
   ❌ NEVER: .log, .txt files in root directory
   ❌ NEVER: random .sh, .js, .py scripts in root
   ❌ NEVER: documentation .md files in root (except CLAUDE.md, README.md)
   ```

3. **If replacing existing file:**
   ```bash
   # MANDATORY archiving before replacement
   mkdir -p archive/$(date +%Y-%m-%d)
   mv oldfile.ts archive/$(date +%Y-%m-%d)/oldfile_$(date +%H%M%S).ts
   # Then create new file
   ```

### RULE 2: MANDATORY DOCUMENTATION + GIT SYNC

**🚨 CRITICAL: Master Specs, Code, and Git MUST ALWAYS BE IN SYNC 🚨**

**AFTER EVERY CODE/FEATURE/INTEGRATION CHANGE, you MUST complete this FULL SEQUENCE:**

#### Step 1: Update All Master Specs (not optional)

1. **docs/MASTER_PROD_TECH_SPEC.md** - If architecture/flow/components changed
   - Update version number (e.g., v10.1 → v10.2)
   - Add timestamp: `**Last Update:** YYYY-MM-DD`
   - Update affected sections
   - Add to relevant section with code references

2. **docs/PROD_DB_ARCH.md** - If database schema changed
   - Update version number
   - Add timestamp
   - Document new tables/columns/views
   - Update migration section

3. **docs/PROD_FEATURE_RELEASE_DETAILS.md** - ALWAYS update for ANY change
   - Add new version section at top
   - Format: `## vX.Y - Feature Name (YYYY-MM-DD)`
   - List all changes with file locations
   - Update "Current Version" at top of file

4. **CHANGELOG.md** - ALWAYS update (create if missing)
   - Add entry with exact timestamp
   - Format: `- [YYYY-MM-DD HH:MM] Description with file:line references`

#### Step 2: MANDATORY Git Commit (immediately after spec updates)

**🚨 YOU MUST COMMIT TO GIT IMMEDIATELY AFTER UPDATING SPECS 🚨**

```bash
# MANDATORY sequence - DO NOT skip
git add services/jenny-api/src/path/to/changed/files
git add docs/MASTER_PROD_TECH_SPEC.md
git add docs/PROD_DB_ARCH.md  # if DB changed
git add docs/PROD_FEATURE_RELEASE_DETAILS.md
git add CHANGELOG.md
git commit -m "vX.Y: Feature Name

- Added: Feature in file.ts:123-456
- Updated: MASTER_PROD_TECH_SPEC.md (Section N)
- Updated: PROD_FEATURE_RELEASE_DETAILS.md (vX.Y)

Closes #issue (if applicable)
"
```

#### Step 3: Verify Git+Specs Sync

**BEFORE proceeding with ANY new work, VERIFY:**

```bash
# Check git log matches master specs version
git log -1 --oneline
# Should show: "vX.Y: Feature Name"

# Check master specs show same version
head -5 docs/PROD_FEATURE_RELEASE_DETAILS.md
# Should show: "Current Version: vX.Y"

# If MISMATCH detected:
# ❌ STOP ALL WORK
# ❌ Fix sync issue first
# ❌ Never proceed with out-of-sync code+specs
```

#### ANTI-PATTERN: Out-of-Sync Specs (NEVER DO THIS)

```bash
# ❌ BAD: Update specs but don't commit
vim docs/MASTER_PROD_TECH_SPEC.md  # Updated to v10.2
# ... continue working on v10.3 ...
# Result: Specs claim v10.2, git shows v10.1, code is v10.3 - CHAOS!

# ✅ GOOD: Update specs → commit immediately → then continue
vim docs/MASTER_PROD_TECH_SPEC.md  # Updated to v10.2
git add docs/ services/jenny-api/src/
git commit -m "v10.2: Feature complete"
# Now start v10.3 work with clean baseline
```

**Template for version updates:**
```markdown
## vX.Y - Feature Name (YYYY-MM-DD)

**Focus:** Brief description

### Changes
- Added: New feature in `file.ts:123-456`
- Updated: Modified component in `file.ts:789`
- Fixed: Issue in `file.ts:100`

### Files Modified
- services/jenny-api/src/module/file.ts (lines 123-456)
- docs/MASTER_PROD_TECH_SPEC.md (Section N)

### Impact
- Description of impact
```

### RULE 3: STRICT DIRECTORY STRUCTURE

**ONLY create files in these locations:**

```
ALLOWED LOCATIONS:

/services/jenny-api/src/        ✅ Production business logic ONLY
/apps/test-chat-ui/app/         ✅ Test UI pages/routes
/apps/test-chat-ui/lib/         ✅ Test UI client-side logic
/apps/test-chat-ui/components/  ✅ Test UI React components
/docs/guides/                   ✅ Implementation guides
/docs/setup/                    ✅ Setup instructions
/scripts/                       ✅ Production scripts
/tools/ingest/                  ✅ KB ingestion tools
/tools/ops/                     ✅ Operational scripts
/tools/qa/                      ✅ QA/testing tools
/data/canonical/                ✅ Student data
/data/eq/                       ✅ EQ/Session data
/data/kb_intel_chips/           ✅ KB chips
/data/training/                 ✅ Training data
/logs/                          ✅ Application logs
/archive/YYYY-MM-DD/            ✅ Archived old files

FORBIDDEN LOCATIONS:

/                               ❌ NO files except: CLAUDE.md, README.md,
                                   package.json, .env*, .gitignore,
                                   docker-compose.yml, tsconfig*.json,
                                   pnpm-*.yaml, requirements.txt
/apps/test-chat-ui/lib/intent*  ❌ NO routing logic (duplicate)
/apps/test-chat-ui/lib/orchestr* ❌ NO orchestration (duplicate)
/apps/test-chat-ui/lib/compos*  ❌ NO composition (duplicate)
```

### RULE 4: ANTI-BLOAT ENFORCEMENT

**Before creating ANY file, ask yourself:**

1. **Is this a temporary file?** → Don't create it, use existing logs/
2. **Is this a test script?** → Put in /tools/qa/ or /scripts/
3. **Is this documentation?** → Put in /docs/guides/ or /docs/setup/
4. **Is this a log file?** → Must go in /logs/ directory
5. **Does similar file exist?** → Update existing, don't duplicate
6. **Will this be used once?** → Don't create, use inline or temp location

**Automatic cleanup check (run mentally before creating file):**
```bash
# Would this file be caught by cleanup script?
# If YES, DON'T CREATE IT!

# Patterns that would be auto-archived:
*_old.*, *_backup.*, *_bak.*
test_*.py, test_*.js (in root)
temp_*.*, debug_*.*
*.log (in root)
*_COMPLETE.md, *_STATUS.txt (in root)
```

### RULE 5: VERSION TRACKING

**Every change MUST increment version:**

Current version format: `vMAJOR.MINOR`

**When to increment:**
- New feature/component → MINOR (v10.1 → v10.2)
- Architecture change → MINOR (v10.1 → v10.2)
- Bug fix → MINOR (v10.1 → v10.2)
- Breaking change → MAJOR (v10.1 → v11.0)

**Where to update version:**
1. `docs/MASTER_PROD_TECH_SPEC.md` - Line 6: `**Version:** vX.Y`
2. `docs/PROD_DB_ARCH.md` - Line 6: `**Version:** vX.Y`
3. `docs/PROD_FEATURE_RELEASE_DETAILS.md` - Line 6: `**Current Version:** vX.Y`
4. Add new section in PROD_FEATURE_RELEASE_DETAILS.md

**Version section template:**
```markdown
## vX.Y - Feature Name (YYYY-MM-DD)

**Focus:** What this version does

### Summary
Brief description of changes

### Key Features
1. Feature 1 (`file.ts:lines`)
2. Feature 2 (`file.ts:lines`)

### Files Modified
- Path to file (what changed)

### Impact
- User-facing changes
- Performance impact
- Breaking changes (if any)

### Migration
- Steps needed (if any)
```

---

## 📋 MANDATORY WORKFLOW CHECKLIST

### BEFORE Starting ANY Task

```bash
# 1. Verify current version
head -10 docs/PROD_FEATURE_RELEASE_DETAILS.md

# 2. Check for temporary files that need archiving
ls -la | grep -E "\.(log|txt)$|test_|temp_|debug_"

# 3. Run cleanup if any found
./scripts/cleanup.sh
```

### DURING Implementation

**For EVERY file you create/modify:**

1. ✅ Is file in correct directory per RULE 3?
2. ✅ Does file follow naming convention (no temp_, test_, debug_)?
3. ✅ Is this the right location (production vs test vs docs)?
4. ✅ Am I duplicating existing functionality?

### AFTER Implementation (MANDATORY)

**Step 1: Update documentation (IN ORDER)**

```bash
# 1. Decide new version number
# Current: v10.1 → New: v10.2 (example)

# 2. Update PROD_FEATURE_RELEASE_DETAILS.md
# - Add new section at top: ## v10.2 - Feature Name (YYYY-MM-DD)
# - Update line 6: **Current Version:** v10.2

# 3. Update MASTER_PROD_TECH_SPEC.md
# - Update line 6: **Version:** v10.2
# - Update line 5: **Last Update:** YYYY-MM-DD
# - Add/update relevant sections

# 4. Update PROD_DB_ARCH.md (if DB changed)
# - Update line 6: **Version:** v10.2
# - Update line 5: **Last Update:** YYYY-MM-DD

# 5. Update/create CHANGELOG.md
# - Add entry: - [YYYY-MM-DD HH:MM] Feature added in file.ts:123-456
```

**Step 2: Verify clean structure**

```bash
# Check root is clean (should be ~15 files)
ls -la | grep "^-" | wc -l

# Check no temporary files
ls *.log *.txt test_* temp_* 2>/dev/null
# Should return: no such file or directory

# Check no duplicate routing in test-chat-ui
ls apps/test-chat-ui/lib/ | grep -E "intent|orchestr|compos"
# Should return: nothing (empty)
```

**Step 3: Document in commit**

```bash
# Git commit message format:
git commit -m "vX.Y: Feature Name

- Added: Feature in file.ts:123-456
- Updated: MASTER_PROD_TECH_SPEC.md (Section N)
- Updated: PROD_FEATURE_RELEASE_DETAILS.md (vX.Y)

Closes #issue
"
```

---

## 🗂️ PRODUCTION ARCHITECTURE

### Current Version: v10.1

**Production Code Location (ONLY):**
```
/services/jenny-api/
├── src/
│   ├── router/intentRouter.ts         # Intent + fact guardrails [v10.1]
│   ├── orchestrator/agentChat-utfa.ts # Orchestration + dedup [v10.1]
│   ├── compose/compose.ts             # Composition + meta-strip [v10.1]
│   ├── resolvers/
│   │   ├── enums.ts                   # Awards, ECs, Programs [v3.0]
│   │   └── academics.ts               # Transcript, GPA [v3.4]
│   ├── retrieval/hybrid.ts            # RAG retrieval [v5.5]
│   ├── db/pool.ts                     # Database connection
│   └── services/                      # Business logic
└── package.json
```

**Test UI (HTTP Client ONLY):**
```
/apps/test-chat-ui/
├── app/api/kb-chat/route.ts           # HTTP client to jenny-api
├── app/api/testlab/                   # Test Lab routes
├── app/test-lab/page.tsx              # Test Lab UI
└── lib/testlab/                       # Test Lab logic
```

**Documentation (Source of Truth):**
```
/docs/
├── MASTER_PROD_TECH_SPEC.md           # Architecture [ALWAYS UPDATE]
├── PROD_DB_ARCH.md                    # Database [UPDATE IF SCHEMA CHANGES]
├── PROD_FEATURE_RELEASE_DETAILS.md    # Releases [ALWAYS UPDATE]
├── guides/
│   ├── PROJECT_STRUCTURE.md           # Structure reference
│   ├── JENNY_TEST_LAB_*.md            # Test Lab guides
│   └── DEEP_CLEANUP_SUMMARY.md        # Cleanup docs
└── setup/
    └── CLAUDE_CODE_SETUP.md           # Setup guide
```

---

## 🚫 FORBIDDEN PATTERNS - NEVER DO THESE

### ❌ Creating Random Files in Root

```bash
# DON'T DO THIS:
touch test_feature.py                   # ❌ NO random test files
touch debug.log                         # ❌ NO logs in root
touch IMPLEMENTATION_NOTES.md           # ❌ NO docs in root
touch run_test.sh                       # ❌ NO scripts in root
echo "data" > output.json               # ❌ NO data files in root

# DO THIS INSTEAD:
touch tools/qa/test_feature.py          # ✅ Tests in tools/qa/
echo "log" >> logs/app.log              # ✅ Logs in logs/
touch docs/guides/FEATURE_GUIDE.md      # ✅ Docs in docs/guides/
touch scripts/run_test.sh               # ✅ Scripts in scripts/
echo "data" > data/output.json          # ✅ Data in data/
```

### ❌ Creating Duplicate Logic

```typescript
// DON'T DO THIS:
// File: apps/test-chat-ui/lib/intentRouter.ts
export function classifyIntent(msg: string) {
  // ❌ WRONG! This duplicates jenny-api routing
}

// DO THIS INSTEAD:
// File: services/jenny-api/src/router/intentRouter.ts
export async function classifyIntent(msg: string) {
  // ✅ CORRECT! Single source of truth
}
```

### ❌ Skipping Documentation Updates

```bash
# DON'T DO THIS:
# Make code changes
git add services/jenny-api/src/new-feature.ts
git commit -m "added feature"  # ❌ NO docs updated!

# DO THIS INSTEAD:
# 1. Make code changes
# 2. Update all master specs with new version
# 3. Update CHANGELOG.md
# 4. Verify version incremented
git add services/jenny-api/src/new-feature.ts
git add docs/MASTER_PROD_TECH_SPEC.md
git add docs/PROD_FEATURE_RELEASE_DETAILS.md
git add CHANGELOG.md
git commit -m "v10.2: Add new feature

- Added: New feature in new-feature.ts:1-50
- Updated: MASTER_PROD_TECH_SPEC.md (Section 4)
- Updated: PROD_FEATURE_RELEASE_DETAILS.md (v10.2)
"
```

### ❌ Creating Temporary Files Without Cleanup

```bash
# DON'T DO THIS:
echo "test" > test_output.txt           # ❌ Temporary file in root
python debug_script.py                  # ❌ Creates debug files
# ... continue working, forget to clean up

# DO THIS INSTEAD:
echo "test" > /tmp/test_output.txt      # ✅ Use /tmp for true temp files
# OR
echo "test" > logs/test_output.log      # ✅ Use logs/ for persistent logs
# AND at end of session:
./scripts/cleanup.sh                    # ✅ Auto-archive any strays
```

---

## ✅ CORRECT PATTERNS - ALWAYS DO THESE

### ✅ Proper File Creation Flow

```bash
# Creating new production feature:

# 1. Determine location
# Business logic? → services/jenny-api/src/module/
# UI component? → apps/test-chat-ui/components/
# Documentation? → docs/guides/
# Script? → scripts/ or tools/

# 2. Create file in correct location
mkdir -p services/jenny-api/src/new-module
touch services/jenny-api/src/new-module/feature.ts

# 3. Implement feature

# 4. Update documentation (MANDATORY)
# - Increment version: v10.1 → v10.2
# - Update MASTER_PROD_TECH_SPEC.md
# - Update PROD_FEATURE_RELEASE_DETAILS.md
# - Update CHANGELOG.md

# 5. Verify clean structure
ls -la | grep "^-" | wc -l  # Should be ~15
```

### ✅ Proper Versioning Flow

```markdown
# BEFORE (v10.1):
**Version:** v10.1 - Quality Guards
**Last Update:** 2025-10-09

# AFTER (v10.2):
**Version:** v10.2 - New Feature Name
**Last Update:** 2025-10-09

# Add to PROD_FEATURE_RELEASE_DETAILS.md:
## v10.2 - New Feature Name (2025-10-09)

**Focus:** Brief description

### Summary
What changed and why

### Key Features
1. Feature A in `file.ts:10-50`
2. Feature B in `file.ts:60-100`

### Files Modified
- services/jenny-api/src/module/file.ts (new feature)
- docs/MASTER_PROD_TECH_SPEC.md (updated Section 5)

### Impact
- Improves X by Y%
- Adds capability Z
```

---

## 📊 QUICK REFERENCE

### File Location Decision Tree

```
New file needed?
├─ Is it business logic?
│  └─ YES → /services/jenny-api/src/
│
├─ Is it UI component?
│  └─ YES → /apps/test-chat-ui/app/ or components/
│
├─ Is it documentation?
│  ├─ Implementation guide? → /docs/guides/
│  ├─ Setup guide? → /docs/setup/
│  └─ Architecture? → Update existing master spec
│
├─ Is it a script?
│  ├─ Production script? → /scripts/
│  ├─ Ingestion? → /tools/ingest/
│  ├─ Operations? → /tools/ops/
│  └─ Testing? → /tools/qa/
│
├─ Is it data?
│  ├─ Student data? → /data/canonical/
│  ├─ KB chips? → /data/kb_intel_chips/
│  └─ Training data? → /data/training/
│
├─ Is it a log?
│  └─ YES → /logs/ (NEVER root)
│
└─ Is it temporary?
   └─ YES → /tmp/ or DON'T CREATE
```

### Documentation Update Checklist

**For EVERY change:**
- [ ] Increment version number (vX.Y → vX.Y+1)
- [ ] Update PROD_FEATURE_RELEASE_DETAILS.md (new section)
- [ ] Update MASTER_PROD_TECH_SPEC.md (version + timestamp)
- [ ] Update PROD_DB_ARCH.md (if schema changed)
- [ ] Update CHANGELOG.md (timestamped entry)
- [ ] Verify all file references include line numbers
- [ ] Verify no temporary files created
- [ ] Run cleanup script

### Version Number Format

```
vMAJOR.MINOR

Examples:
v10.1 → v10.2  (new feature)
v10.2 → v10.3  (bug fix)
v10.3 → v11.0  (breaking change)

Update in 3 places:
1. docs/MASTER_PROD_TECH_SPEC.md:6
2. docs/PROD_DB_ARCH.md:6
3. docs/PROD_FEATURE_RELEASE_DETAILS.md:6
```

---

## 🎯 FINAL REMINDERS

**MANDATORY BEHAVIORS:**
1. ✅ Check file location BEFORE creating ANY file
2. ✅ Update ALL master specs AFTER ANY change
3. ✅ Increment version number for EVERY change
4. ✅ Add timestamp to EVERY doc update
5. ✅ Archive old files BEFORE replacing
6. ✅ Run cleanup script at end of session
7. ✅ Verify root directory stays clean (~15 files)

**FORBIDDEN BEHAVIORS:**
1. ❌ NEVER create files in root (except allowed list)
2. ❌ NEVER create temporary/test files in random locations
3. ❌ NEVER skip documentation updates
4. ❌ NEVER duplicate business logic in test-chat-ui
5. ❌ NEVER create files without checking proper location first
6. ❌ NEVER commit without updating version numbers
7. ❌ NEVER leave project with temporary files

**MASTER SPECS (Source of Truth):**
- Architecture: [MASTER_PROD_TECH_SPEC.md](docs/MASTER_PROD_TECH_SPEC.md)
- Database: [PROD_DB_ARCH.md](docs/PROD_DB_ARCH.md)
- Releases: [PROD_FEATURE_RELEASE_DETAILS.md](docs/PROD_FEATURE_RELEASE_DETAILS.md)
- Structure: [PROJECT_STRUCTURE.md](docs/guides/PROJECT_STRUCTURE.md)

---

**Status:** ✅ v10.1 - Clean & Production Ready
**Last Updated:** 2025-10-09
**Production Code:** `/services/jenny-api/` ONLY
**Next Version:** v10.2 (when next feature added)
