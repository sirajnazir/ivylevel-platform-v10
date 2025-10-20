# Agents SDK Rollout Plan - v1.0

**Created:** 2025-10-17
**Status:** Production-Ready
**Decision:** Use Responses API + Agents SDK (Primary Path)

---

## Executive Summary

### Decision

**Do not block on Assistants SDK submitToolOutputs regression in openai@6.4.0.**

Ship v1.0 using **Responses API + Agents SDK** for tools/multi-agent workflows. For any legacy Assistants flows, use a **REST wrapper** or pin to known-good SDK behind a flag.

### Why

- **Repro-confirmed regression**: OpenAI SDK v6.4.0 `runs.submitToolOutputs` loses `thread_id` parameter, causing `/threads/undefined/...` errors (GitHub #1605)
- **Known workaround exists**: SDK v5.10.1 works, REST API wrapper bypasses Node SDK
- **Roadmap alignment**: OpenAI promoting Responses API + Agents SDK; Assistants API sunset mid-2026

### Data Validation

- **Regression evidence**: Thread_id lost in v5.11–v6.4.0; v5.10.1 confirmed working
- **Local reproduction**: Stack trace matches community reports
- **Forward path**: OpenAI official docs point to Responses API + Agents SDK

---

## Architecture

### Primary Path (Default)

```
User Request
    ↓
Responses API (OpenAI)
    ↓
Agents SDK (@openai/agents)
    ↓
Tool Execution (executeResolverTool)
    ↓
SQL Resolvers (Facts)  +  Pinecone RAG (Narrative)
    ↓
Agent Response
    ↓
OTel Traces → Grafana
```

**Benefits:**
- ✅ No Assistants API dependency (no regression risk)
- ✅ Multi-agent orchestration built-in
- ✅ Streaming support
- ✅ Thread persistence via conversation history
- ✅ Production-ready (no SDK bugs)

### Compat Path (Flagged)

```
Legacy Assistants Thread
    ↓
REST API Wrapper (submitToolOutputsCompat)
    ↓
https://api.openai.com/v1/threads/{threadId}/runs/{runId}/submit_tool_outputs
    ↓
Manual Polling (pollRunCompat)
    ↓
Agent Response
```

**Use Case:** Existing Assistants threads only (migration path)

### Fallback Pin (Flagged)

```
ASSISTANTS_SDK_PIN=5.10.1
    ↓
openai@5.10.1 (known-good version)
    ↓
submitToolOutputsAndPoll (works in 5.10.1)
```

**Use Case:** Emergency fallback if REST wrapper fails

---

## Feature Flags

### Environment Variables

```bash
# Primary path (default: on)
USE_AGENTS_SDK=true

# Compat wrapper (default: off, enable for legacy threads)
ASSISTANTS_COMPAT=false

# Pin known-good SDK (default: off, emergency only)
ASSISTANTS_SDK_PIN=false

# Observability (default: on)
ENABLE_TRACING=true

# Canaries (default: on in staging/prod, off in dev)
ENABLE_CANARIES=true
```

### Flag Validation

- Cannot use `USE_AGENTS_SDK=true` + `ASSISTANTS_SDK_PIN=true` (conflicting)
- Warning if `ASSISTANTS_COMPAT=true` + `USE_AGENTS_SDK=true` (compat may not be needed)

---

## Rollout Steps

### Phase 1: Staging Deployment (Week 1)

**Goal:** Validate Agents SDK with real Huda data in staging

**Steps:**
1. Deploy to staging with `USE_AGENTS_SDK=true`
2. Run synthetic canaries hourly (`tsx scripts/canaries.ts`)
3. Validate Golden 1: Multi-agent plan returns JSON with `steps >= 2` and `tool_calls >= 1` within 1.5s p95
4. Monitor OTel traces in Grafana (check `agent.planner`, `tool.gameplan_initial` spans)
5. Manual testing with Postman collection (3 test scenarios: Stanford, timeline, awards)

**Success Criteria:**
- ✅ 100% canary pass rate (24 hours)
- ✅ p95 latency < 1.5s
- ✅ No errors in OTel traces
- ✅ Response quality matches Basic SDK baseline

**Rollback Trigger:**
- ❌ Canary failure rate > 5%
- ❌ p95 latency > 2.0s
- ❌ Agent hallucinations detected

### Phase 2: Production Deployment (Week 2)

**Goal:** Ship v1.0 to production with Agents SDK

**Steps:**
1. Deploy to production with `USE_AGENTS_SDK=true`
2. Enable canaries in production (`ENABLE_CANARIES=true`)
3. Monitor PostHog events for agent runs
4. A/B test: 10% traffic → Agents SDK, 90% → Basic SDK (gradual ramp)
5. Compare metrics: latency, tokens_used, user satisfaction

**Success Criteria:**
- ✅ Agents SDK latency ≤ Basic SDK + 200ms
- ✅ Tool call success rate > 99%
- ✅ User satisfaction ≥ baseline (NPS, feedback)

**Ramp Schedule:**
- Day 1-2: 10% Agents SDK
- Day 3-4: 25% Agents SDK
- Day 5-7: 50% Agents SDK
- Week 2: 100% Agents SDK

### Phase 3: Legacy Migration (Week 3-4)

**Goal:** Migrate existing Assistants threads to Agents SDK

**Steps:**
1. Identify active Assistants threads (query DB)
2. For each thread, check if migration is safe:
   - Thread created < 7 days ago → migrate
   - Thread has active conversation → preserve with compat wrapper
3. Enable `ASSISTANTS_COMPAT=true` for preserved threads
4. Monitor compat wrapper success rate (Golden 2)

**Success Criteria:**
- ✅ 90% threads migrated to Agents SDK
- ✅ Compat wrapper success rate > 95% (within 2 retries)
- ✅ No user-reported conversation breaks

---

## Backout Plan

### Trigger Conditions

**Immediate Backout (< 5 minutes):**
- ❌ Canary failure rate > 20%
- ❌ P50 latency > 3.0s
- ❌ Error rate > 10%
- ❌ Tool execution failures > 5%

**Planned Backout (< 1 hour):**
- ❌ User reports of incorrect data (hallucinations)
- ❌ Agents SDK quality degradation (acceptance rate drop > 10%)
- ❌ Sustained high latency (p95 > 2.0s for 30 minutes)

### Backout Steps

#### Option 1: Feature Flag Flip (Fast - 30 seconds)

```bash
# Flip flag in production .env
USE_AGENTS_SDK=false

# Restart service
kubectl rollout restart deployment/agent-framework -n production
```

**Result:** All traffic routes to Basic SDK (proven, stable)

#### Option 2: Rollback Deployment (Medium - 5 minutes)

```bash
# Rollback to previous version
kubectl rollout undo deployment/agent-framework -n production

# Verify rollback
kubectl rollout status deployment/agent-framework -n production
```

**Result:** Previous version (Basic SDK) restored

#### Option 3: Enable Compat Wrapper (Slow - 15 minutes)

```bash
# Enable compat for all threads
ASSISTANTS_COMPAT=true USE_AGENTS_SDK=false

# Redeploy
kubectl apply -f k8s/agent-framework.yaml
```

**Result:** All Assistants threads use REST wrapper

---

## Golden Tests

### Golden 1: Multi-Agent Plan Quality

**Test:** Send "Plan my next 2 weeks" to GamePlan agent

**Expected:**
```json
{
  "response": "Based on your profile, here's your game plan...",
  "agent_name": "gameplan",
  "tool_calls": [
    {
      "tool_name": "gameplan_initial",
      "tool_result": {
        "narrative_items": 5,
        "award_targets": 9,
        "ec_targets": 8,
        "program_targets": 5
      }
    }
  ],
  "latency_ms": 1200,
  "tokens_used": 800
}
```

**Validation:**
- ✅ `tool_calls.length >= 1`
- ✅ Response includes timeline with weeks/dates
- ✅ `latency_ms < 1500` (p95)

### Golden 2: Compat Wrapper Success

**Test:** Submit synthetic tool output via REST wrapper

**Expected:**
```json
{
  "id": "run_xyz789",
  "status": "completed",
  "thread_id": "thread_abc123"
}
```

**Validation:**
- ✅ Status = "completed" within 2 retries
- ✅ No 400/500 errors
- ✅ `thread_id` not undefined

### Golden 3: Flag Isolation

**Test:** Flip `USE_AGENTS_SDK` flag and compare responses

**Expected:**
- Agents SDK ON: Uses `@openai/agents` runtime
- Agents SDK OFF: Uses Basic SDK (manual loop)
- **Output identical** (same tool calls, same data)

**Validation:**
- ✅ No user-visible output change
- ✅ OTel traces show correct branch (`flag.use_agents_sdk=true/false`)

---

## Monitoring & Alerts

### Key Metrics

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Canary pass rate | 100% | < 95% |
| Agent latency (p95) | < 1.5s | > 2.0s |
| Tool execution success | > 99% | < 95% |
| Error rate | < 1% | > 5% |
| Hallucination rate | 0% | > 0.1% |

### OTel Traces

**Required Spans:**
- `agent.gameplan` - GamePlan agent execution
- `tool.gameplan_initial` - Game plan tool call
- `tool.awards_initial` - Awards tool call
- `tool.ecs_initial` - ECs tool call
- `compat.submit_tool_outputs` - Compat wrapper (if used)

**Required Attributes:**
- `student.id` - Student ID
- `coach.id` - Coach ID
- `flag.use_agents_sdk` - Feature flag state
- `tokens.used` - Token count
- `latency.ms` - Latency

### Grafana Dashboards

**Dashboard 1: Agents SDK Health**
- Canary pass rate (24h)
- Agent latency (p50, p95, p99)
- Tool execution success rate
- Error rate by agent type

**Dashboard 2: Compat Wrapper**
- submitToolOutputs success rate
- Poll run latency
- Compat vs Agents SDK traffic split

**Dashboard 3: User Experience**
- Response quality (manual grading)
- User satisfaction (NPS, feedback)
- Acceptance rate impact (college acceptances)

---

## Risk Assessment

### High Risk: Cognitive Feature Quality

**Risk:** Agents SDK single-run approach may degrade complex reasoning quality (27-layer assessment, identity fusion, award ROI optimization)

**Mitigation:**
- Keep Basic SDK multi-step approach for assessment, strategic planning
- Use Agents SDK only for simple queries (timeline, awards list)
- A/B test with acceptance rate tracking (20-60% degradation = rollback)

**Status:** See `docs/SDK_DECISION_COGNITIVE_FEATURES_ANALYSIS.md`

### Medium Risk: SDK Instability

**Risk:** Future OpenAI SDK regressions (like v6.4.0 submitToolOutputs bug)

**Mitigation:**
- Pin SDK version in package.json
- Run canaries hourly to catch regressions
- Maintain REST wrapper as fallback

### Low Risk: Performance Degradation

**Risk:** Agents SDK adds latency vs Basic SDK

**Mitigation:**
- Monitor p95 latency
- Optimize tool execution (batch SQL queries)
- Cache frequent queries (game plan, awards)

---

## Next Steps

### Week 1: Implementation Complete ✅

- [x] Feature flags (`config/flags.ts`)
- [x] Agents SDK runtime (`src/agents/runtime.ts`)
- [x] Compat REST wrapper (`src/assistants/submitToolOutputsCompat.ts`)
- [x] OTel tracing (`src/observability/tracing.ts`)
- [x] OpenAPI spec (`api/openapi.yaml`)
- [x] Postman collection (`api/postman_collection.json`)
- [x] Synthetic canaries (`scripts/canaries.ts`)

### Week 2: Testing & Validation

- [ ] Deploy to staging
- [ ] Run canaries (24h baseline)
- [ ] Manual testing (Postman scenarios)
- [ ] OTel trace validation (Grafana)
- [ ] Golden tests (3 scenarios)

### Week 3: Production Rollout

- [ ] Deploy to production (10% traffic)
- [ ] A/B test (Agents SDK vs Basic SDK)
- [ ] Monitor metrics (latency, quality, satisfaction)
- [ ] Ramp to 100% (if metrics pass)

### Week 4: Legacy Migration

- [ ] Identify Assistants threads
- [ ] Migrate to Agents SDK (90% goal)
- [ ] Enable compat wrapper (10% preserved)
- [ ] Monitor compat success rate

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-10-17 | Use Agents SDK as primary path | Sidesteps Assistants API regression, aligns with OpenAI roadmap |
| 2025-10-17 | Implement REST wrapper for compat | Maintains support for legacy threads during migration |
| 2025-10-17 | Keep Basic SDK multi-step for cognitive features | Analysis shows 20-60% acceptance rate risk with single-run approach |
| 2025-10-17 | A/B test post-launch | Validate Agents SDK quality before full migration |

---

**Owner:** IvyLevel Platform Team
**Contact:** tech@ivylevel.com
**Status:** Ready for Staging Deployment
