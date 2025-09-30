# IvyLevel v3.1 Incident Response Playbook

## 🚨 Quick Response Guide

When an incident is detected (canary alert, user report, or test failure), follow these steps:

### 1. Verify the Issue (2 mins)

```bash
# Check service health
curl http://localhost:4101/health
curl http://localhost:4102/health
curl http://localhost:4000/health

# Run smoke test
./scripts/smoke_test.sh
```

### 2. Check Vitals (2 mins)

```bash
# Verify vitals are populated
curl http://localhost:4103/students/huda/vitals | jq '.'

# If empty or missing data:
pnpm cron:recompute
```

### 3. Check Canon Documents (2 mins)

```bash
# Check critical canon documents
curl http://localhost:4103/canon/APP_FINAL_AWARDS/chips | jq '.'
curl http://localhost:4103/canon/APP_FINAL_ECS/chips | jq '.'

# If missing:
cd services/agent && npm run build && npm start
```

### 4. Test Retriever (2 mins)

```bash
# Run kind-locked searches in each namespace
curl -X POST http://localhost:4102/search \
  -H "content-type: application/json" \
  -d '{"q":"SAT score","k":5,"filter":{"kind":"APP-DOC"},"student":"huda"}' | jq '.'

curl -X POST http://localhost:4102/search \
  -H "content-type: application/json" \
  -d '{"q":"Week 6 plan","k":5,"filter":{"kind":"EXEC-INTEL"},"student":"huda"}' | jq '.'
```

### 5. Emergency Rollback (if needed)

```bash
# Option A: Rollback to yesterday's snapshot
./scripts/restore_snapshot.sh data/snapshots/$(date -d "yesterday" +%F)

# Option B: Re-run ETL and recompute
./scripts/etl_pipeline.sh
pnpm cron:recompute
```

## 📊 Common Issues & Solutions

### Issue: "don't have access" responses

**Symptoms:**
- Agent returns hedging language
- No evidence chips returned

**Fix:**
1. Check vitals: `curl http://localhost:4103/students/{studentId}/vitals`
2. If empty, run: `curl -X POST http://localhost:4000/admin/recompute-all`
3. Check retriever is running and indexed
4. Verify the orchestrator is using tool-safe implementation

### Issue: Wrong/Missing Evidence Chips

**Symptoms:**
- Chips don't match query intent
- Mixed namespace chips (e.g., EXEC + APP-DOC)

**Fix:**
1. Check canon registry mappings in `services/agent/src/canon/registry.ts`
2. Verify retriever filters are working:
   ```bash
   curl -X POST http://localhost:4102/admin/stats | jq '.namespaces'
   ```
3. Re-index if namespace counts are wrong

### Issue: Slow Response Times

**Symptoms:**
- Responses take > 5 seconds
- Canary alerts for slow responses

**Fix:**
1. Check retriever load:
   ```bash
   # Look for high rerank counts
   tail -100 services/retriever/logs/app.log | grep "rerank"
   ```
2. Enable rate limiting (if not already)
3. Reduce default k value in searches
4. Check for tool calling loops in agent logs

### Issue: Failed CI Gates

**Symptoms:**
- CI build fails on evidence compliance
- Forbidden phrases detected

**Fix:**
1. Review recent code changes
2. Check for new prompts that might bypass evidence
3. Run full validation: `./scripts/validate_v3.sh`
4. Review response-metrics logs for patterns

## 🔍 Monitoring & Alerts

### Key Metrics to Watch

```bash
# Response metrics (should log for every request)
tail -f services/agent/logs/app.log | grep "response-metrics"

# Look for:
# - gatePassed: false
# - chips: 0
# - vitalsUsed: false
```

### Alert Thresholds

- **Evidence Compliance**: < 95% → Investigate immediately
- **Response Time**: > 5s → Check retriever performance
- **Chip Count**: 0 for factual queries → Check retriever/canon
- **Forbidden Phrases**: Any occurrence → Review agent prompts

## 📞 Escalation Path

1. **Level 1** (0-30 mins): Follow this playbook
2. **Level 2** (30-60 mins): If unresolved, check:
   - Recent deployments
   - Database connectivity
   - OpenAI API status
3. **Level 3** (60+ mins): 
   - Rollback to last known good state
   - Engage team lead
   - Document findings in incident report

## 📝 Post-Incident

After resolving:

1. **Document**:
   ```bash
   # Create incident report
   echo "Incident $(date +%F-%H%M): [description]" >> docs/incidents.log
   ```

2. **Update Tests**:
   - Add failing case to golden questions
   - Update smoke tests if needed

3. **Snapshot Current State**:
   ```bash
   ./scripts/golden_snapshot.sh
   ```

4. **Run Full Validation**:
   ```bash
   ./scripts/validate_v3.sh
   ```

## 🛠️ Useful Commands Reference

```bash
# Full system validation
./scripts/validate_v3.sh

# Quick smoke test
./scripts/smoke_test.sh

# Create snapshot
./scripts/golden_snapshot.sh

# Run golden questions
./scripts/run_golden_questions.sh

# Check specific student vitals
curl http://localhost:4103/students/{studentId}/vitals | jq '.'

# Force vitals recomputation
curl -X POST http://localhost:4000/admin/recompute-all

# View recent response metrics
tail -100 services/agent/logs/app.log | jq -r 'select(.msg=="response-metrics") | "\(.time) student:\(.studentId) chips:\(.chips) gate:\(.gatePassed)"'
```

---

Remember: The goal is to maintain the "never-blank" doctrine. Every factual query should return specific data with evidence.