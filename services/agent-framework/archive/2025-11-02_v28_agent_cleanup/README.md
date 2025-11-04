# Archived Agents - v28.0 Cleanup (2025-11-02)

## Why These Were Archived

This directory contains 15 agent files that were moved out of production during the v28.0 cleanup. These agents were either:
1. **Old versions** replaced by newer, more sophisticated implementations
2. **Deprioritized features** that were never completed

## Archive Contents (15 files)

### Old Versions (11 files)
These were replaced by production-ready versions with Intelligence Types Architecture v3.0:

1. **AssessmentAgent.ts** → Replaced by `AssessmentAgentV3ConversationalRealtime.ts`
2. **AssessmentAgentRefactored.ts** → Replaced by `AssessmentAgentV3ConversationalRealtime.ts`
3. **AssessmentAgentV3.ts** → Replaced by `AssessmentAgentV3ConversationalRealtime.ts`
4. **AssessmentAgentV3Conversational.ts** → Replaced by `AssessmentAgentV3ConversationalRealtime.ts`
5. **GamePlanAgent.ts** (43K) → Replaced by `GamePlanAgentV3.ts`
6. **GamePlanAgentRefactored.ts** → Replaced by `GamePlanAgentV3.ts`
7. **AwardsAgent.ts** → Replaced by `AwardsAgentRefactored.ts`
8. **ScholarshipAgent.ts** → Replaced by `ScholarshipsAgent.ts`
9. **SummerProgramsAgent.ts** → Replaced by `SummerProgramsAgentRefactored.ts`
10. **ExtracurricularsAgent.ts** → Replaced by `ExtracurricularsAgentRefactored.ts`
11. **BaseAgent.ts** → Replaced by `BaseAgentWithIntelligence.ts`

### Deprioritized Features (4 files)
These agents were never completed and were deprioritized for v1.0 launch:

12. **AdmissionsAgent.ts** - Admissions strategy agent (not completed)
13. **CollegeListAgent.ts** - College list management (not completed)
14. **EssayAgent.ts** - Essay writing assistance (not completed)
15. **WeeklyExecutionAgent.ts** - Weekly planning (replaced by ExecutionAgent)

## Current Production Agents

After cleanup, only these 7 agents remain in production:

1. **AssessmentAgentV3ConversationalRealtime** (56K) - 5 Intelligence Types
2. **GamePlanAgentV3** (21K) - 6 Intelligence Types
3. **ExecutionAgent** (32K) - 16 Intelligence Types
4. **AwardsAgentRefactored** (10K) - 3 Intelligence Types
5. **SummerProgramsAgentRefactored** (15K) - 3 Intelligence Types
6. **ScholarshipsAgent** (13K) - 3 Intelligence Types
7. **ExtracurricularsAgentRefactored** (30K) - registered

**Total: 36 Intelligence Types across 6 production agents**

## Can These Be Restored?

Yes, all files are preserved and can be restored if needed. However, they should not be used for production as they:
- Lack Intelligence Types Architecture v3.0
- Don't match current technical specifications
- May have compatibility issues with v26/v27/v28 enhancements

## Reference

For details on the cleanup process, see:
- `/tmp/v28_cleanup_complete.md` - Full cleanup summary
- `docs/agents/ASSESSMENT_AGENT_TECH_SPEC.md` - Assessment Agent spec
- `docs/agents/GAMEPLAN_AGENT_TECH_SPEC.md` - GamePlan Agent spec

## Version Info

- **Archive Date:** 2025-11-02
- **Platform Version:** v28.0
- **Cleanup Reason:** Production readiness and spec compliance
- **Files Archived:** 15
- **Production Agents:** 7
