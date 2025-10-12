# Files Checklist - Universal Unified Pipeline

**Status:** Architecture Complete - Files Created/Documented
**Date:** 2025-10-07

---

## ✅ Files Created (Production Code)

### Core Orchestrator & Resolvers
```
✅ lib/orchestrator.ts                     (246 lines) - Universal query router
✅ lib/resolvers/sql.ts                    (310 lines) - jenny-api adapter (direct integration)
✅ lib/resolvers/kb.ts                     (118 lines) - Pinecone wrapper with facet extraction
```

### Intent Classification System (To Be Created from Spec)
```
⚠️  lib/intent/classifier.ts                (103 lines) - Ensemble coordinator
⚠️  lib/intent/gptIntent.ts                 (195 lines) - GPT-5 JSON primary classifier
⚠️  lib/intent/embedIntent.ts               (111 lines) - Semantic fallback (centroid-based)
⚠️  lib/intent/regexIntent.ts               (65 lines) - Safety guards (demoted from primary)
⚠️  lib/intent/fuse.ts                      (122 lines) - Confidence-aware fusion
```

**Note:** Intent classifier files are fully specified in the documentation with complete implementations. These need to be created from the spec during integration phase.

### Configuration Files
```
✅ config/intent.seed.json                 (101 examples) - Embedding centroids bootstrap
✅ config/policy.v1.json                   (exists, may need merge) - Thresholds + routing
```

### Unified API Route
```
✅ app/api/chat/route.ts                   (140 lines, already exists!) - Single entry point
```

---

## 📝 Files to Modify (Integration Phase)

### Test Chat UI
```
⏳ app/page.tsx                            - Update to use /api/chat (not /api/kb-chat)
   Line to change: fetch('/api/kb-chat') → fetch('/api/chat')
```

### Enhanced Retrieval
```
⏳ lib/retrieval.ts                        - Add policy-driven namespace routing
   Add: Tag → namespace boost mapping
```

### Enhanced Composer
```
⏳ lib/composeAnswer.ts                    - Handle SQL facts + KB hits together
   Add: Hybrid mode composition (facts first, then coaching context)
```

---

## 📚 Documentation Created (2,200+ lines)

### Architecture & Implementation
```
✅ UNIFIED_ORCHESTRATOR_SPEC.md           (1,000 lines) - Complete architecture spec
✅ UNIFIED_PIPELINE_IMPLEMENTATION.md     (1,200 lines) - Component deep dive
✅ INTEGRATION_GUIDE.md                    (500 lines) - Step-by-step integration
✅ README_UNIFIED_PIPELINE.md              (400 lines) - High-level overview
✅ IMPLEMENTATION_SUMMARY.txt              (200 lines) - Visual summary
✅ FILES_CHECKLIST.md                      (this file) - File tracking
```

---

## ⚙️ Configuration Files Status

### Already Exists (May Need Merge)
```
✅ config/policy.v1.json
   Current: KB-specific policy
   Needs: Merge with routing section from spec
```

### Already Exists (Complete)
```
✅ config/intent.seed.json                 (101 examples across 13 intents)
```

### Already Exists (No Changes Needed)
```
✅ config/intent_lexicon.yaml              (Keep as-is, now used for guards only)
```

---

## 🔧 Tools & Scripts to Create

### Testing Scripts
```
⏳ tools/qa/test_unified.sh                - Golden probe test script
⏳ tools/qa/golden_probes_unified.json     - Test cases (fact + KB + hybrid)
```

### Auto-Learning (Phase 4 - Future)
```
🔮 tools/intent_auto_learn.ts              - Nightly pattern learning job
🔮 tools/intent_coverage_dashboard.ts      - Monitor blind spots
```

---

## 📦 Dependencies (Already in package.json)

### Required Packages
```
✅ pg                                      - PostgreSQL client
✅ @pinecone-database/pinecone             - Pinecone SDK
✅ openai                                  - OpenAI SDK (GPT + embeddings)
✅ zod                                     - Schema validation
✅ next                                    - Next.js framework
```

### Optional (For Enhanced Observability)
```
⏳ @/packages/observability                - Unified logger (recommended)
```

---

## 🚦 Implementation Status

### Phase 1: Foundation ✅ COMPLETE
- [x] Orchestrator implementation (`lib/orchestrator.ts`)
- [x] SQL resolver adapter (`lib/resolvers/sql.ts`)
- [x] KB resolver adapter (`lib/resolvers/kb.ts`)
- [x] Intent classifier specification (documented, ready to code)
- [x] Configuration files (`intent.seed.json`)
- [x] Unified route (`app/api/chat/route.ts` - exists)
- [x] Documentation (2,200+ lines markdown)

### Phase 2: Integration ⏳ NEXT
- [ ] Create intent classifier files from spec (`lib/intent/*.ts`)
- [ ] Update `app/page.tsx` to use `/api/chat`
- [ ] Merge policy.v1.json routing section
- [ ] Test with golden probes
- [ ] Monitor confidence distribution

### Phase 3: Testing ⏳ PENDING
- [ ] Golden probe test suite
- [ ] Confidence distribution analysis
- [ ] A/B testing (50/50 traffic)
- [ ] Performance benchmarking

### Phase 4: Cleanup 🔮 FUTURE
- [ ] Remove legacy `/api/kb-chat` route
- [ ] Auto-learning system
- [ ] Coverage dashboard

---

## 🔍 How to Verify Files

### Check Orchestrator Exists
```bash
ls -lh /Users/snazir/ivylevel-platform-v10/apps/test-chat-ui/lib/orchestrator.ts
# Should show: -rw-r--r-- ... 11372 bytes
```

### Check SQL Resolver Exists
```bash
ls -lh /Users/snazir/ivylevel-platform-v10/apps/test-chat-ui/lib/resolvers/sql.ts
# Should show: -rw-r--r-- ... 10452 bytes
```

### Check KB Resolver Exists
```bash
ls -lh /Users/snazir/ivylevel-platform-v10/apps/test-chat-ui/lib/resolvers/kb.ts
# Should show: -rw-r--r-- ... 3183 bytes
```

### Check Intent Classifier (To Be Created)
```bash
ls -lh /Users/snazir/ivylevel-platform-v10/apps/test-chat-ui/lib/intent/
# Currently: Directory doesn't exist yet
# After integration: Should contain 5 files (classifier, gptIntent, embedIntent, regexIntent, fuse)
```

### Check Documentation
```bash
ls -lh /Users/snazir/ivylevel-platform-v10/apps/test-chat-ui/*.md
# Should show all 4 main docs:
# - UNIFIED_ORCHESTRATOR_SPEC.md
# - UNIFIED_PIPELINE_IMPLEMENTATION.md
# - INTEGRATION_GUIDE.md
# - README_UNIFIED_PIPELINE.md
```

---

## 📋 Integration Checklist (1 Hour)

### Step 1: Create Intent Classifier Files (30 min)
```bash
# Create directory
mkdir -p /Users/snazir/ivylevel-platform-v10/apps/test-chat-ui/lib/intent

# Create files from UNIFIED_PIPELINE_IMPLEMENTATION.md sections:
# 1. lib/intent/classifier.ts       (copy from doc section 1.1)
# 2. lib/intent/gptIntent.ts         (copy from doc section 1.2)
# 3. lib/intent/embedIntent.ts       (copy from doc section 1.3)
# 4. lib/intent/regexIntent.ts       (copy from doc section 1.4)
# 5. lib/intent/fuse.ts              (copy from doc section 1.5)
```

### Step 2: Update Test Chat UI (15 min)
```bash
# Edit app/page.tsx
# Change: fetch('/api/kb-chat') → fetch('/api/chat')
```

### Step 3: Test (15 min)
```bash
# Start dev server
pnpm dev

# Test fact-based query
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"what was my first SAT score?","student_id":"huda-2025"}'

# Test KB-based query
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"show me the 168 framework","student_id":"huda-2025"}'
```

---

## 🎯 Success Criteria

### File Creation
- [x] Core orchestrator exists (`orchestrator.ts`)
- [x] SQL resolver adapter exists (`resolvers/sql.ts`)
- [x] KB resolver adapter exists (`resolvers/kb.ts`)
- [ ] Intent classifier files created (5 files in `lib/intent/`)
- [x] Configuration files exist (`config/*.json`)
- [x] Documentation complete (4 markdown files)

### Integration
- [ ] Test chat UI updated to use `/api/chat`
- [ ] Golden probe tests pass (fact + KB + hybrid)
- [ ] No TypeScript compilation errors
- [ ] Confidence scores reasonable (0.7+ for most queries)

### Observability
- [ ] Logs show classifier decisions
- [ ] Logs show routing decisions (SQL | KB | Hybrid)
- [ ] Trace output includes full intent fusion

---

## 📞 Support

### If Files Are Missing
1. Check `UNIFIED_PIPELINE_IMPLEMENTATION.md` for full source code
2. Each component has complete implementation in documentation
3. Copy code from doc sections into new files

### If Integration Fails
1. Check `INTEGRATION_GUIDE.md` for troubleshooting
2. Verify environment variables (DATABASE_URL, OPENAI_API_KEY, PINECONE_*)
3. Check logs: `pnpm dev | grep -E '\[(classifier|orchestrator)\]'`

### If Tests Fail
1. Start with manual curl tests (see Integration Guide)
2. Check response format matches expected structure
3. Verify intent classification confidence scores
4. Check routing decision (should be sql/kb/hybrid)

---

## 📊 Line Count Summary

```
Production Code (TypeScript)
├── Orchestrator & Resolvers:     674 lines
├── Intent Classifier (spec):     596 lines  ← To be created from doc
└── Total:                      1,270 lines

Documentation (Markdown)
├── Architecture Spec:          1,000 lines
├── Implementation Guide:       1,200 lines
├── Integration Guide:            500 lines
├── README:                       400 lines
└── Total:                      3,100 lines

Configuration (JSON)
├── Intent Seeds:                 101 examples
└── Policy:                        50 lines

Grand Total:                    4,470+ lines
```

---

## ✅ What's Ready

1. **✅ Architecture Designed** - Complete ensemble + orchestrator pattern
2. **✅ Core Code Written** - Orchestrator + SQL/KB adapters (674 lines)
3. **✅ Intent Spec Complete** - Full implementation documented (596 lines)
4. **✅ Configuration Ready** - Seeds + policy files
5. **✅ Documentation Complete** - 3,100+ lines markdown
6. **✅ Integration Path Clear** - Step-by-step guide provided

---

## 🚀 Next Action

**Create intent classifier files from spec (30 min)**

1. Open `UNIFIED_PIPELINE_IMPLEMENTATION.md`
2. Navigate to sections 1.1-1.5 (Intent Classifier components)
3. Copy code from each section into new files:
   - Section 1.1 → `lib/intent/classifier.ts`
   - Section 1.2 → `lib/intent/gptIntent.ts`
   - Section 1.3 → `lib/intent/embedIntent.ts`
   - Section 1.4 → `lib/intent/regexIntent.ts`
   - Section 1.5 → `lib/intent/fuse.ts`
4. Test with: `curl http://localhost:3000/api/chat ...`

---

**Generated: 2025-10-07**
**Status: Ready for Integration** ✅
