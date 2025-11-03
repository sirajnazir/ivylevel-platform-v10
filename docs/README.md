# IvyLevel Platform v10 - Documentation Index

**Current Version:** v23.0 - AssessmentAgent Intelligence Types Complete  
**Last Updated:** 2025-10-31  
**Status:** ✅ Production Ready

---

## 🎯 START HERE

### For Development

1. **System Flow & API Reference** → [COMPLETE_SYSTEM_FLOW_SPECS.md](./COMPLETE_SYSTEM_FLOW_SPECS.md) ⭐ **PRIMARY REFERENCE**
   - Complete system architecture
   - All API endpoints with examples
   - Frontend pages & components map
   - Database schema & queries
   - Authentication flow
   - Data flow diagrams
   - Troubleshooting guide

2. **Quick Reference Card** → [SYSTEM_QUICK_REFERENCE.md](./SYSTEM_QUICK_REFERENCE.md)
   - Quick start (30 seconds)
   - Critical ports & URLs
   - Test account credentials
   - Common commands
   - One-line troubleshooting

### For Architecture

3. **Master Technical Specification** → [MASTER_PROD_TECH_SPEC.md](./MASTER_PROD_TECH_SPEC.md)
   - Overall architecture
   - Component relationships
   - Technology stack

4. **Database Architecture** → [PROD_DB_ARCH.md](./PROD_DB_ARCH.md)
   - Schema design (89 tables, 12 views)
   - Relationships
   - Indexes & optimization
   - Migration history

5. **Feature Release History** → [PROD_FEATURE_RELEASE_DETAILS.md](./PROD_FEATURE_RELEASE_DETAILS.md)
   - Version history (v1.0 → v23.0)
   - Feature changelog
   - Breaking changes

---

## 📚 Documentation Structure

```
docs/
├── COMPLETE_SYSTEM_FLOW_SPECS.md    ⭐ Complete system reference (v23.0)
├── SYSTEM_QUICK_REFERENCE.md        Quick start & common tasks
├── MASTER_PROD_TECH_SPEC.md         Architecture specification
├── PROD_DB_ARCH.md                  Database architecture
├── PROD_FEATURE_RELEASE_DETAILS.md  Release history
├── README.md                        This file
│
├── agents/                          Agent-specific specifications
│   ├── GAMEPLAN_AGENT_TECH_SPEC.md
│   ├── ASSESSMENT_AGENT_SPEC.md
│   ├── AWARDS_AGENT_TECH_SPEC.md
│   └── EXTRACURRICULARS_AGENT_TECH_SPEC.md
│
├── guides/                          Implementation guides
│   ├── PROJECT_STRUCTURE.md
│   ├── DEEP_CLEANUP_SUMMARY.md
│   └── V14_IMPLEMENTATION_GUIDE.md
│
├── setup/                           Setup instructions
│   └── (future setup docs)
│
└── archive/                         Archived/outdated docs
    └── 2025-10-31-pre-v23.0/       Pre-v23.0 docs (DO NOT USE)
        ├── README.md                Why archived
        ├── UI_LAUNCH_STEP_BY_STEP.md
        ├── JENNY_TEST_LAB_*.md
        ├── HUDA_TEST_INTERFACE.md
        ├── CAT1_COMPLETE_TECH_SPEC.md
        ├── CAT3_COMPLETE_TECH_SPEC.md
        └── V15.2_IMPLEMENTATION_PLAN.md
```

---

## 🚨 IMPORTANT NOTES

### What NOT to Use

**Archived Documentation (2025-10-31):**
- ❌ `docs/archive/2025-10-31-pre-v23.0/*` - Contains **outdated information**
  - Wrong ports (3456, 3000, 4000 instead of 8787)
  - Wrong API endpoints
  - Wrong account details
  - Outdated architecture

**Why Archived:**
- System upgraded to v23.0 with standardized ports & endpoints
- Backend now uses `server-utfa.ts` on port 8787
- Frontend uses Vite on port 5173
- Student ID format unified: `huda-2025` (backend/DB), `huda_001` (login)

### What TO Use

✅ **COMPLETE_SYSTEM_FLOW_SPECS.md** - Single source of truth for:
- Ports (8787, 5173)
- API endpoints
- Authentication
- Data flows
- File locations
- Test accounts

---

## 🔄 Document Update Policy

**When to Update Documentation:**

1. ✅ New API endpoint → Update `COMPLETE_SYSTEM_FLOW_SPECS.md` Section 6
2. ✅ New frontend page → Update `COMPLETE_SYSTEM_FLOW_SPECS.md` Section 8
3. ✅ Database change → Update `PROD_DB_ARCH.md` + `COMPLETE_SYSTEM_FLOW_SPECS.md` Section 5
4. ✅ New feature → Update `PROD_FEATURE_RELEASE_DETAILS.md`
5. ✅ Architecture change → Update `MASTER_PROD_TECH_SPEC.md`
6. ✅ Version increment → Update all version stamps

**Update Process:**
```bash
# 1. Make code changes
# 2. Update relevant documentation
# 3. Increment version numbers
# 4. Commit together
git add docs/ services/ unified-frontend/
git commit -m "v24.0: Feature name + docs update"
```

---

## 📖 Common Tasks

### Starting the System
```bash
# See: SYSTEM_QUICK_REFERENCE.md
# Or: COMPLETE_SYSTEM_FLOW_SPECS.md Section "Quick Start Checklist"
```

### Adding a New API Endpoint
```bash
# 1. Implement in services/agent-framework/src/routes/
# 2. Update COMPLETE_SYSTEM_FLOW_SPECS.md Section 6
# 3. Add to v10ApiService.ts
# 4. Update version
```

### Adding a New Frontend Page
```bash
# 1. Create component in unified-frontend/apps/unified-app/src/components/
# 2. Add route in App.tsx
# 3. Update COMPLETE_SYSTEM_FLOW_SPECS.md Section 8
# 4. Update version
```

### Troubleshooting
```bash
# See: COMPLETE_SYSTEM_FLOW_SPECS.md Section "Troubleshooting"
# Or: SYSTEM_QUICK_REFERENCE.md Section "Troubleshooting"
```

---

## 🏗️ Architecture Overview

```
Frontend (React/Vite) :5173
    ↓ HTTP/JSON
Backend (Express/Node) :8787
    ↓ SQL
Database (PostgreSQL) :5432
    ↓
Pinecone (Vector Store)
```

**Key Technologies:**
- Frontend: React 18.3.1, TypeScript, styled-components, Vite
- Backend: Express.js, Node v22.16.0, TypeScript, tsx
- Database: PostgreSQL 15+, 89 tables, 12 views
- Vector: Pinecone (jenny-v3-3072-093025)
- Intelligence: 36 Intelligence Types (v3.0 architecture)

---

## 📞 Getting Help

1. **System Flow Questions** → `COMPLETE_SYSTEM_FLOW_SPECS.md`
2. **Quick Commands** → `SYSTEM_QUICK_REFERENCE.md`
3. **Architecture Questions** → `MASTER_PROD_TECH_SPEC.md`
4. **Database Questions** → `PROD_DB_ARCH.md`
5. **Version History** → `PROD_FEATURE_RELEASE_DETAILS.md`

---

## ✅ Document Status

| Document | Version | Status | Last Updated |
|----------|---------|--------|--------------|
| COMPLETE_SYSTEM_FLOW_SPECS.md | v23.0 | ✅ Current | 2025-10-31 |
| SYSTEM_QUICK_REFERENCE.md | v23.0 | ✅ Current | 2025-10-31 |
| MASTER_PROD_TECH_SPEC.md | v10.1 | ✅ Current | 2025-10-09 |
| PROD_DB_ARCH.md | v10.1 | ✅ Current | 2025-10-09 |
| PROD_FEATURE_RELEASE_DETAILS.md | v10.1 | ✅ Current | 2025-10-09 |

---

**Last Updated:** 2025-10-31
**Maintained By:** Development Team
**Questions?** See `COMPLETE_SYSTEM_FLOW_SPECS.md` Section 11 (Version History)
