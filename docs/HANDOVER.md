# Handover / Onboarding

## 1. Purpose
This guide lets a new engineer get productive in under a day with the Ivylevel v1 codebase.

## 2. Setup
- Node 20+, Python 3.11+
- pnpm (managed by corepack)
- Env: OPENAI_API_KEY, PINECONE_API_KEY, PINECONE_INDEX, PINECONE_NAMESPACE

## 3. How to run
Follow MANUAL_STEPS_CHECKLIST.md (sections A–E).

## 4. PR Ritual
- Reference Spec IDs you touch (from MASTER_SPEC).
- Update IMPLEMENTATION_TRACKER.md rows.
- Include curl commands + log snippets in the PR.
- No temp files in repo; put scratch into `archive/YYYY-MM-DD/` (gitignored).

## 5. Logging & Debug
- Use `@packages/logger` child loggers (service, reqId, studentId).
- Evidence problems? Check agent logs for `ensureEvidence()` fallback.
- Retriever API enforces strict param validation (q, k, filters). Bad keys = 400 error. No mock fallback.

## 6. Release
- Weekly tag `v1.0.x`. Update CHANGELOG (if added) and Implementation Tracker status deltas.

## 7. Contacts
- Code owners: @founder, @cto
