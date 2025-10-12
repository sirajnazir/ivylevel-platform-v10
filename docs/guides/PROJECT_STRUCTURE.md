# Project Structure - IvyLevel Platform v10

**Last Updated:** 2025-10-09
**Status:** ✅ Clean & Organized

---

## Root Directory (Essential Files Only)

```
ivylevel-platform-v10/
├── .env                           # Environment variables (gitignored)
├── .env.example                   # Environment template
├── .env.local                     # Local overrides (gitignored)
├── .gitignore                     # Git ignore rules
├── CLAUDE.md                      # Project guidelines (auto-read by Claude Code)
├── CODEOWNERS                     # GitHub code owners
├── README.md                      # Main project readme
├── docker-compose.yml             # Docker configuration
├── package.json                   # Root package config
├── pnpm-lock.yaml                 # Dependency lock file
├── pnpm-workspace.yaml            # Monorepo workspace config
├── requirements.txt               # Python dependencies
├── tsconfig.base.json             # Base TypeScript config
└── tsconfig.json                  # Root TypeScript config
```

**Note:** NO temporary files (.log, .txt, .sh, .js) in root - all archived!

---

## Directory Structure

### `/services/` - Production Services

```
services/
├── jenny-api/                     ✅ PRODUCTION API (v10.1)
│   ├── src/
│   │   ├── router/                # Intent routing + fact guardrails
│   │   ├── orchestrator/          # Query orchestration + deduplication
│   │   ├── compose/               # Answer composition + meta-stripping
│   │   ├── resolvers/             # SQL resolvers (enums, academics)
│   │   ├── retrieval/             # Hybrid search (SQL + KB)
│   │   ├── db/                    # Database connection
│   │   └── services/              # Business logic services
│   └── package.json
├── opportunity-catalog/           ✅ AWS/K8s Future Scaling
├── opportunity-recommender/       ✅ AWS/K8s Future Scaling
└── opportunity-scorer/            ✅ AWS/K8s Future Scaling
```

### `/apps/` - Applications

```
apps/
└── test-chat-ui/                  ✅ PRODUCTION TEST UI (v10.1)
    ├── app/
    │   ├── api/
    │   │   ├── kb-chat/           # HTTP client to jenny-api
    │   │   └── testlab/           # Test Lab API routes
    │   ├── test-lab/              # Test Lab UI
    │   └── kb-test/               # KB Chat UI
    ├── lib/
    │   ├── testlab/               # Test Lab logic
    │   └── retrieval.ts           # Client-side retrieval
    └── components/
        └── testlab/               # Test Lab components
```

### `/docs/` - Documentation

```
docs/
├── MASTER_PROD_TECH_SPEC.md       ✅ Production architecture (SOURCE OF TRUTH)
├── PROD_DB_ARCH.md                ✅ Production database schema
├── PROD_FEATURE_RELEASE_DETAILS.md ✅ Release history
├── README.md                      ✅ Documentation index
├── guides/                        # Implementation guides
│   ├── DEEP_CLEANUP_SUMMARY.md    # Cleanup documentation
│   ├── JENNY_TEST_LAB_IMPLEMENTATION.md # Test Lab guide
│   ├── JENNY_TEST_LAB_QUICK_START.md # Quick start
│   └── PROJECT_STRUCTURE.md       # This file
└── setup/                         # Setup guides
    └── CLAUDE_CODE_SETUP.md       # Claude Code setup
```

### `/data/` - Production Data

```
data/
├── canonical/                     ✅ Canonical student data
├── eq/                            ✅ EQ/Session data
├── kb_intel_chips/                ✅ KB chips (v6)
├── training/                      ✅ Fine-tuning training data
└── huda_final_app.json            ✅ Sample student data
```

### `/tools/` - Production Tools

```
tools/
├── ingest/                        ✅ KB ingestion tools
│   ├── src/
│   └── run_kb_ingestion.sh
├── ops/                           ✅ Operational scripts
│   └── manifestTrack.py
└── qa/                            ✅ QA/testing tools
    ├── run_qa_v8.sh
    └── qa_suite_v8.json
```

### `/packages/` - Shared Packages

```
packages/
├── aws-utils/                     # AWS utilities (future scaling)
├── intent/                        # Intent detection
├── logger/                        # Logging utilities
├── observability/                 # Observability
├── scripts/                       # Utility scripts
└── types/                         # TypeScript types
```

### `/scripts/` - Production Scripts

```
scripts/
├── archive_file.sh                # File archiving
├── cleanup.sh                     # Auto cleanup
├── finetune_adapter.py            # Fine-tuning
├── deploy_v8_production.sh        # Deployment
└── sql/                           # SQL utilities
```

### `/infra/` - Infrastructure (Future Scaling)

```
infra/
└── terraform/                     # Terraform configs for AWS/K8s
```

### `/config/` - Configuration

```
config/
└── routing.json                   # Routing configuration
```

### `/logs/` - Application Logs

```
logs/
└── *.log                          # Application logs (gitignored)
```

### `/archive/` - Archived Code

```
archive/
├── 2025-10-09/                    # Initial cleanup
└── 2025-10-09-deep-cleanup/       # Deep cleanup (latest)
    ├── services/                  # Old agent, retriever
    ├── apps/                      # Old api, web, proxy, ingest
    ├── docs/                      # Old documentation
    ├── data/                      # Old data folders
    ├── tools/                     # Old tools
    └── root-files/                # Old temporary files
```

---

## File Organization Rules

### ✅ DO THIS

**Documentation:**
- Implementation guides → `/docs/guides/`
- Setup guides → `/docs/setup/`
- Production specs → `/docs/` (root level)

**Code:**
- Production business logic → `/services/jenny-api/`
- Test UI → `/apps/test-chat-ui/`
- Shared packages → `/packages/`

**Data:**
- Production data → `/data/`
- Test data → `/apps/test-chat-ui/data/`

**Scripts:**
- Production scripts → `/scripts/`
- Tool scripts → `/tools/*/`

**Logs:**
- All logs → `/logs/` (NOT in root!)

### ❌ DON'T DO THIS

**Never put these in root:**
- ❌ Temporary files (.txt, .log, .json snippets)
- ❌ Test scripts (.sh files)
- ❌ Utility scripts (random .js, .py files)
- ❌ Documentation markdown files
- ❌ Old/backup files (*_old.*, *_backup.*)

**Never create duplicates:**
- ❌ Multiple versions of same file
- ❌ Business logic in test-chat-ui
- ❌ Documentation in multiple locations

---

## Quick Reference

### Production Code Locations

| Component | Location |
|-----------|----------|
| Intent Router | `services/jenny-api/src/router/intentRouter.ts` |
| Orchestrator | `services/jenny-api/src/orchestrator/agentChat-utfa.ts` |
| Composer | `services/jenny-api/src/compose/compose.ts` |
| Resolvers | `services/jenny-api/src/resolvers/` |
| Test UI | `apps/test-chat-ui/` |

### Documentation Locations

| Type | Location |
|------|----------|
| Architecture | `docs/MASTER_PROD_TECH_SPEC.md` |
| Database | `docs/PROD_DB_ARCH.md` |
| Releases | `docs/PROD_FEATURE_RELEASE_DETAILS.md` |
| Guides | `docs/guides/` |
| Setup | `docs/setup/` |

### Data Locations

| Type | Location |
|------|----------|
| Student Data | `data/canonical/` |
| EQ Data | `data/eq/` |
| KB Chips | `data/kb_intel_chips/` |
| Training Data | `data/training/` |
| Test Data | `apps/test-chat-ui/data/` |

---

## Maintenance

### Adding New Files

**Documentation:**
```bash
# Implementation guide
touch docs/guides/NEW_FEATURE_GUIDE.md

# Setup guide
touch docs/setup/NEW_SETUP.md
```

**Production Code:**
```bash
# New service module
mkdir services/jenny-api/src/new-module
touch services/jenny-api/src/new-module/index.ts
```

**Scripts:**
```bash
# Production script
touch scripts/new_script.sh
chmod +x scripts/new_script.sh

# Tool script
touch tools/ops/new_tool.py
```

### Archiving Old Files

**Use cleanup script:**
```bash
# Auto-archive old files
./scripts/cleanup.sh
```

**Manual archiving:**
```bash
# Create dated archive directory
mkdir -p archive/$(date +%Y-%m-%d)

# Move file
mv old_file.ts archive/$(date +%Y-%m-%d)/
```

---

## Verification

**Check root is clean:**
```bash
ls -la | grep "^-" | wc -l
# Should be ~15 (only essential files)
```

**Check no random logs:**
```bash
ls *.log 2>/dev/null
# Should return: no such file or directory
```

**Check docs organized:**
```bash
ls docs/guides/ docs/setup/
# Should show organized documentation
```

---

**Status:** ✅ Clean & Organized
**Last Updated:** 2025-10-09
