# Agents SDK Exploration - ARCHIVED

**Date:** 2025-10-17
**Status:** Research/Exploration (NOT Production Path)
**Reason for Archive:** v1.0 NSM requires proven multi-step reasoning for coach quality

---

## Why This Was Explored

OpenAI recommended: "Do not block on Assistants SDK regression. Use Responses API + Agents SDK."

We implemented a full Agents SDK solution to evaluate it as an alternative to Basic SDK.

## Why This Was Archived

**NSM Analysis:**
- v1.0 NSM = Near-real human coach quality → College acceptances + Scholarships
- Cognitive features analysis showed **20-60% acceptance rate degradation risk** with Agents SDK single-run approach
- Complex reasoning (27-layer assessment, identity fusion, award ROI) requires proven multi-step Basic SDK

**Decision:**
- **v1.0:** Use Basic SDK (proven with real Huda data)
- **Post-launch:** A/B test Agents SDK vs Basic SDK with real acceptance rate data (Q1 2026)

## What Was Implemented

1. **Feature Flags** (`flags.ts`) - Toggle between Agents SDK / Basic SDK
2. **Agents SDK Runtime** (`runtime.ts`) - Multi-agent orchestration
3. **REST Wrapper** (`submitToolOutputsCompat.ts`) - Bypass Assistants API regression
4. **OTel Tracing** (`tracing.ts`) - Observability for agent spans
5. **OpenAPI Spec** (`openapi.yaml`) - API documentation
6. **Postman Collection** (`postman_collection.json`) - Testing scenarios
7. **Synthetic Canaries** (`canaries.ts`) - Hourly regression tests
8. **Rollout Plan** (`AGENTS_SDK_ROLLOUT_PLAN.md`) - 4-week deployment plan

## When to Re-Evaluate

**Trigger:** After v1.0 launch with 3+ months of acceptance rate baseline data

**A/B Test Plan:**
1. Run 10% traffic on Agents SDK
2. Track: Acceptance rate, scholarship $, IvyScore trajectory
3. Compare: Agents SDK vs Basic SDK
4. Decision: Migrate if quality matches/exceeds, archive permanently if degrades

## Files Archived

```
archive/2025-10-17-agents-sdk-exploration/
├── runtime.ts                              # Agents SDK multi-agent runtime
├── assistants/
│   └── submitToolOutputsCompat.ts          # REST wrapper for Assistants API
├── flags.ts                                # Feature flags
├── canaries.ts                             # Synthetic tests
├── openapi.yaml                            # OpenAPI spec
├── postman_collection.json                 # Postman test collection
├── AGENTS_SDK_ROLLOUT_PLAN.md             # Deployment plan
├── AGENTS_SDK_IMPLEMENTATION_SUMMARY.md   # Implementation summary
├── AGENTS_SDK_MIGRATION_COMPLETE.md       # Completion checklist
└── README.md                               # This file
```

## Analysis Documents (NOT Archived)

**Keep these in main docs/ for reference:**
- `docs/SDK_DECISION_USE_CASE_ANALYSIS.md` - Execution features analysis
- `docs/SDK_DECISION_COGNITIVE_FEATURES_ANALYSIS.md` - Complex reasoning analysis

**Why Keep:** These provide the strategic rationale for why v1.0 uses Basic SDK.

---

**Conclusion:** Agents SDK is a valid future path, but v1.0 NSM requires proven coach quality from Basic SDK multi-step reasoning.

**Re-evaluate:** Q1 2026 with real acceptance rate data.
