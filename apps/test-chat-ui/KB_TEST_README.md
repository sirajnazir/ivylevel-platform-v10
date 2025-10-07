# KB Retrieval Test UI - Quick Start

**Version**: v1.2
**Purpose**: Comprehensive testing interface for KBv6 federated search across 973 vectors

---

## Setup (One-Time)

### 1. Install Dependencies

```bash
cd apps/test-chat-ui
pnpm install
```

### 2. Configure Environment

Edit `.env.local`:

```bash
# OpenAI (required for embeddings + LLM)
OPENAI_API_KEY=sk-...

# Pinecone (required for KB retrieval)
PINECONE_API_KEY=...
PINECONE_INDEX=jenny-v3-3072-093025

# Federated search namespaces (comma-separated)
PINECONE_NAMESPACES=KBv6_2025-10-06_v1.0,KBv6_iMessage_2025-10-07_v1.0,KBv6_Assessment_2025-10-07_v1.0

# Namespace guard (safety)
PINECONE_ALLOWED_NAMESPACES=KBv6_2025-10-06_v1.0,KBv6_iMessage_2025-10-07_v1.0,KBv6_Assessment_2025-10-07_v1.0
```

### 3. Verify Pinecone Index

Run QA smoke tests to ensure index is live:

```bash
cd ../..  # back to root
PINECONE_INDEX=jenny-v3-3072-093025 \
NS_SESS=KBv6_2025-10-06_v1.0 \
NS_IMSG=KBv6_iMessage_2025-10-07_v1.0 \
NS_ASSESS=KBv6_Assessment_2025-10-07_v1.0 \
./tools/qa/smoke_tests.sh
```

Expected output:
```
✅ Sessions: 924 vectors
✅ iMessage: 40 vectors
✅ Assessment+GamePlan: 9 vectors
✅ All smoke tests pass
```

---

## Running the Test UI

### Start the Dev Server

```bash
cd apps/test-chat-ui
pnpm dev
```

### Open the UI

- **KB Test UI**: http://localhost:3001/kb-test
- **Original Fact UI**: http://localhost:3001 (still works)

---

## Using the KB Test UI

### Interface Overview

**Controls Panel**:
- **Namespaces**: Toggle Sessions+Exec, iMessage, Assessment+GamePlan
- **Top-K**: Number of results to retrieve (default: 6)
- **Show Debug Panel**: Toggle evidence inspection

**Chat Area**:
- Type queries, press Enter to send
- Shift+Enter for multi-line input

**Debug Panel** (per message):
- Evidence cards with chip_id, namespace, type, week, phase, score
- Content preview (first 300 chars)
- Copy citation button (📋) for easy reference

---

## Quick Test Workflow

### 1. Basic Query (168-Hour Framework)

**Prompt**: `What is the 168-hour framework?`

**Expected**:
- Top evidence: `W001-FRAMEWORK-168HOUR`
- Namespace: `KBv6_2025-10-06_v1.0` (Sessions+Exec)
- Type: `Framework_Chip`
- Score: ≥ 0.50

### 2. iMessage Template

**Prompt**: `I need a thank-you note for a recommender teacher—give the template.`

**Expected**:
- Top evidence: `Message_Template_Chip`
- Namespace: `KBv6_iMessage_2025-10-07_v1.0`
- Situation tag: `recommender_outreach`
- Score: ≥ 0.45

### 3. Assessment Query

**Prompt**: `Run the initial assessment on a student like Huda. What are the top 3 gaps and why?`

**Expected**:
- Top evidence: `ASSESS-INSIGHT-001`
- Namespace: `KBv6_Assessment_2025-10-07_v1.0`
- Type: `Insight_Chip`
- Score: ≥ 0.50

---

## Comprehensive Test Suite

See `KB_TEST_SUITE.md` for 28 prompts organized into 11 categories:

- **A-D**: Single-family tests (Assessment, Sessions, Exec, iMessage)
- **E-F**: Cross-namespace federated recall
- **G**: Hallucination resistance (guardrails)
- **H**: Filtered retrieval (namespace toggles)
- **I-K**: Longitudinal stitching, adversarial, multiform

### Running the Full Suite

1. Open UI: http://localhost:3001/kb-test
2. Copy/paste prompts from `KB_TEST_SUITE.md`
3. For each prompt:
   - Verify top-3 evidence shows correct namespace
   - Check answer includes citations like `[W027-STRATEGY-001 @ KBv6_2025-10-06_v1.0]`
   - Confirm low-confidence banner if score < 0.40
   - Validate namespace filters change evidence surface

### Success Criteria

- ✅ 25/28 prompts pass validation (89% pass rate)
- ✅ No hallucinations in G19-G20
- ✅ Filtered retrieval (H21-H23) isolates namespaces correctly
- ✅ Federated recall (E14-E16) pools from multiple namespaces
- ✅ Timeline correction validated: 168-hour in Sessions, NOT Assessment

---

## Troubleshooting

### "No grounded evidence found"

**Cause**: Query doesn't match any KB content or score < 0.40

**Fix**:
- Refine query with more specific keywords
- Adjust namespace filters
- Check if query is related to coaching sessions/frameworks/micro-interactions

### Low Confidence Warnings

**Cause**: Top score < 0.40

**Fix**:
- UI should show "Low-confidence match" banner
- Ask clarifying questions
- Try different phrasing

### Missing Dependencies

**Symptom**: Import errors for `@pinecone-database/pinecone` or `openai`

**Fix**:
```bash
cd apps/test-chat-ui
pnpm install
```

### Namespace Guard Errors

**Symptom**: `❌ Blocked namespace: "..."`

**Fix**:
- Verify `.env.local` has `PINECONE_ALLOWED_NAMESPACES` set correctly
- Ensure namespace names match exactly (case-sensitive)

---

## Architecture Summary

```
User Query
    ↓
[/api/kb-chat]
    ↓
retrieve() → Pinecone (federated search)
    ├─ embed query (text-embedding-3-large, 3072 dims)
    ├─ query each namespace in parallel
    ├─ pool results
    ├─ apply hybrid heuristics (score nudges)
    └─ rerank by score
    ↓
OpenAI LLM (gpt-4o-mini)
    ├─ system prompt: proof-over-prose
    ├─ user prompt: query + evidence context
    └─ generate answer with citations
    ↓
Return: { answer, evidence, meta }
```

---

## Files Reference

| File | Purpose |
|------|---------|
| `app/kb-test/page.tsx` | Main KB test UI component |
| `app/api/kb-chat/route.ts` | API handler for KB-powered chat |
| `lib/retrieval.ts` | Federated retrieval client |
| `KB_TEST_SUITE.md` | 28 comprehensive test prompts |
| `KB_TEST_README.md` | This file |

---

## Next Steps

After validating basic functionality:

1. **Run Full Test Suite**: Copy/paste all 28 prompts from `KB_TEST_SUITE.md`
2. **Log Results**: Track pass/fail for each prompt category
3. **Optimize Thresholds**: Adjust score thresholds based on results
4. **Iterate on Prompts**: Refine low-performing queries
5. **Automate**: Build automated test runner (future)

---

**Last Updated**: 2025-10-07 (v1.2)
**Maintained By**: Platform Team
