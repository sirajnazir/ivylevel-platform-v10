# Archived Documentation - Pre v23.0

**Archive Date:** 2025-10-31
**Reason:** Outdated system flow information (wrong ports, endpoints, account details)
**Superseded By:** `docs/COMPLETE_SYSTEM_FLOW_SPECS.md` (v23.0)

## What Changed in v23.0

1. **Backend Port:** Changed from various (3456, 3000, 4000) → **8787** (server-utfa.ts)
2. **Frontend Port:** Standardized to **5173** (Vite default)
3. **API Base URL:** Now `http://localhost:8787` (was various)
4. **Student ID Format:** Unified to `huda-2025` in backend/DB (frontend uses `huda_001` for login)
5. **Authentication:** Token-based JWT (stored in localStorage)
6. **API Endpoints:** All documented in COMPLETE_SYSTEM_FLOW_SPECS.md Section 6

## Archived Files

These files contained outdated information and have been preserved for reference only.
**DO NOT USE THESE FOR CURRENT DEVELOPMENT** - Use `COMPLETE_SYSTEM_FLOW_SPECS.md` instead.

Files archived:
- UI_LAUNCH_STEP_BY_STEP.md (outdated ports)
- JENNY_TEST_LAB_*.md (outdated test endpoints)
- HUDA_TEST_INTERFACE.md (outdated account info)
- V15.2_IMPLEMENTATION_PLAN.md (outdated architecture)
- CURRENT_PLATFORM_STATUS.md (outdated status)
- CAT1_COMPLETE_TECH_SPEC.md (outdated API endpoints)
- CAT3_COMPLETE_TECH_SPEC.md (outdated API endpoints)
- V1.0_OPENAI_IMPLEMENTATION_GUIDE.md (outdated setup)
