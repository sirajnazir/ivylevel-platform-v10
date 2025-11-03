# UI Launch Guide - Step-by-Step Execution

**Status:** 🎯 READY TO EXECUTE
**Date:** 2025-10-23
**Prerequisites:** ✅ Backend deployed & verified
**Target:** Launch 3 UI surfaces without 2am pages

---

## Quick Navigation

- [Step 1: Lock Environment](#step-1-lock-environment-5-min)
- [Step 2: Start Workers](#step-2-start-workers-10-min)
- [Step 3: Deploy UI](#step-3-deploy-ui-surfaces-2-hours)
- [Step 4: Enable Guardrails](#step-4-enable-guardrails-30-min)
- [Step 5: Setup Monitoring](#step-5-setup-monitoring-1-hour)
- [Step 6: Execute Rollout](#step-6-execute-rollout)
- [Emergency Rollback](#emergency-rollback)

---

## Step 1: Lock Environment (5 min)

### 1.1: Copy Locked Configuration

```bash
cd /Users/snazir/ivylevel-platform-v10/unified-frontend/apps/unified-app

# Backup current .env
cp .env .env.backup.$(date +%Y%m%d)

# Use locked production config
cp .env.production.locked .env

# Verify it's read-only
ls -la .env.production.locked
# Expected: -r--r--r-- (read-only permissions)
```

### 1.2: Verify Feature Flags

```bash
echo "=== Week 0 Feature Flags (Locked) ==="
grep "^VITE_FEATURE_" .env
```

**Expected Output:**
```
VITE_FEATURE_EVIDENCE_PANEL=true    ✅ ENABLED
VITE_FEATURE_HGTI_GRAPH=true        ✅ ENABLED
VITE_FEATURE_412_UX=true            ✅ ENABLED
VITE_FEATURE_EQ_LAYER=false         ❌ DISABLED (Week 2)
VITE_FEATURE_EQ_TOGGLE=false        ❌ DISABLED (Week 2)
VITE_FEATURE_PARENT_SIGNALS=false   ❌ DISABLED (Week 3)
```

### 1.3: Verify IvyScore Version

```bash
grep "^VITE_IVYSCORE_VERSION" .env
# Expected: VITE_IVYSCORE_VERSION=1 (0% HGTI weight)
```

### 1.4: Lock in CI/CD

```bash
# Make .env.production.locked read-only in git
git update-index --chmod=-w unified-frontend/apps/unified-app/.env.production.locked

# Add to CI validation
cat >> .github/workflows/validate-env.yml <<'YAML'
name: Validate Production Environment
on: [pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Check production env unchanged
        run: |
          if ! diff <(sort .env.production.locked) <(sort .env.production.locked.committed); then
            echo "ERROR: .env.production.locked modified without approval"
            exit 1
          fi
YAML
```

✅ **Checkpoint:** Environment locked, version controlled, CI-protected

---

## Step 2: Start Workers (10 min)

### 2.1: Install PM2 (if not installed)

```bash
npm install -g pm2

# Verify installation
pm2 --version
```

### 2.2: Build Workers

```bash
cd /Users/snazir/ivylevel-platform-v10/services/agent-framework

# Install dependencies
npm ci

# Build TypeScript to dist/
npm run build

# Verify dist/ exists
ls -la dist/workers/
# Expected: outbox-processor.js, mv-refresher.js, eq-auditor.js
```

### 2.3: Start Workers with PM2

```bash
# Start all workers
pm2 start workers.ecosystem.config.js

# Verify all running
pm2 status
```

**Expected Output:**
```
┌─────┬──────────────────────┬─────────┬─────────┬──────────┬────────┐
│ id  │ name                 │ status  │ restart │ uptime   │ cpu    │
├─────┼──────────────────────┼─────────┼─────────┼──────────┼────────┤
│ 0   │ outbox-processor     │ online  │ 0       │ 5s       │ 0.1%   │
│ 1   │ mv-refresher         │ online  │ 0       │ 5s       │ 0.1%   │
│ 2   │ eq-auditor           │ online  │ 0       │ 5s       │ 0.1%   │
└─────┴──────────────────────┴─────────┴─────────┴──────────┴────────┘
```

### 2.4: Verify Worker Health

```bash
# Check outbox backlog (should be < 100)
PGPASSWORD=postgres psql -h localhost -U postgres -d ivylevel -c \
  "SELECT COUNT(*) as outbox_backlog FROM outbox WHERE processed_at IS NULL;"

# Expected: outbox_backlog < 100

# Check MV refresh timestamp (should be < 10 min old)
PGPASSWORD=postgres psql -h localhost -U postgres -d ivylevel -c \
  "SELECT NOW() - MAX(calculated_at) as mv_age FROM mv_hgti_scores;"

# Expected: mv_age < 00:10:00

# View worker logs
pm2 logs --lines 50
```

### 2.5: Enable PM2 Startup (Persist Across Reboots)

```bash
pm2 startup
# Follow the displayed command (varies by OS)

pm2 save
# Saves current process list
```

✅ **Checkpoint:** Workers running, health checks passing, persistence enabled

---

## Step 3: Deploy UI Surfaces (2 hours)

### 3.1: Evidence Panel (1 hour)

#### Create Component

```bash
cd /Users/snazir/ivylevel-platform-v10/unified-frontend/apps/unified-app

# Create v3.2 components directory
mkdir -p src/components/v3.2
```

**File:** `src/components/v3.2/EvidencePanel.tsx`

Copy the Evidence Panel implementation from `docs/guides/V3.2_FRONTEND_INTEGRATION_GUIDE.md` Phase 3.

#### Verify Implementation

```typescript
// Add to src/components/student/StudentDashboard.tsx
import { EvidencePanel } from '../v3.2/EvidencePanel';

const showEvidence = import.meta.env.VITE_FEATURE_EVIDENCE_PANEL === 'true';

// In render:
{showEvidence && (
  <div className="col-span-12 lg:col-span-4">
    <EvidencePanel studentId={studentId} />
  </div>
)}
```

#### Test Locally

```bash
npm run dev

# Open http://localhost:5173
# Log in as coach
# Navigate to student dashboard
# Verify Evidence Panel renders
```

**Acceptance Criteria:**
- ✅ Panel renders for at least 1 real student
- ✅ Shows >= 1 chip (if student has chips)
- ✅ No PII visible in chip source
- ✅ "View Trace" button opens trace URL

### 3.2: 412 Missing Evidence UI (30 min)

**File:** `src/components/v3.2/MissingEvidenceCard.tsx`

Copy implementation from guide Phase 4.

#### Enable Only 2 Actions

```typescript
// In MissingEvidenceCard.tsx
const ENABLED_ACTIONS = ['add_award', 'upload_transcript'];

// Filter suggested_actions
{missing.suggested_actions
  .filter(action => ENABLED_ACTIONS.includes(action.action))
  .map((action, i) => (
    // ... button implementation
  ))
}
```

#### Test 412 Flow

```bash
# Test with missing deadline
curl -H "Authorization: Bearer <token>" \
  "http://localhost:4101/api/students/<student_id>/facts/deadline_latest"

# Expected: 412 status with missing evidence structure
```

**Acceptance Criteria:**
- ✅ 412 card renders when evidence missing
- ✅ Only 2 actions visible: "Add award", "Upload transcript"
- ✅ Buttons navigate to correct endpoints
- ✅ Actions actually write rows that produce chips

### 3.3: HGTI Score Card (30 min)

**File:** `src/components/v3.2/HGTIScoreCard.tsx`

Copy implementation from guide Phase 5.

#### Disable Editing (Read-Only)

```typescript
// Ensure no edit buttons or forms
// Only display score + breakdown + cached/realtime toggle
```

**Acceptance Criteria:**
- ✅ Score displays (if student has growth events)
- ✅ Breakdown shows barrier types
- ✅ Cached mode loads fast (< 200ms)
- ✅ Realtime mode shows "Calculating..." state
- ✅ No edit capabilities visible

### 3.4: Build Production Bundle

```bash
cd /Users/snazir/ivylevel-platform-v10/unified-frontend/apps/unified-app

# Build for production
npm run build

# Preview production build locally
npm run preview

# Verify no console errors
# Check Network tab for API calls
```

✅ **Checkpoint:** 3 UI surfaces implemented, tested locally, production-ready

---

## Step 4: Enable Guardrails (30 min)

### 4.1: Setup RLS Canary (Hourly)

#### Configure Probe

```bash
# Set environment variables
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ivylevel"
export API_BASE_URL="http://localhost:4101/api"

# Get Coach A token (login as Coach A, copy JWT from localStorage)
export COACH_A_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Get Student B ID (student NOT owned by Coach A)
export STUDENT_B_ID="student_002"  # Owned by Coach B

# Optional: PagerDuty/Slack webhook
export ALERT_WEBHOOK="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
```

#### Test Probe Manually

```bash
./scripts/rls_canary_probe.sh
```

**Expected Output:**
```
[RLS_CANARY] ======================================
[RLS_CANARY] Cross-Student Access Probe
[RLS_CANARY] ======================================
[RLS_CANARY] Test 1: Cross-student chips access
[RLS_CANARY] ✅ Test 1 PASSED: 403 Forbidden (expected)
[RLS_CANARY] Test 2: Cross-student HGTI access
[RLS_CANARY] ✅ Test 2 PASSED: 403 Forbidden (expected)
[RLS_CANARY] Test 3: Database RLS policy verification
[RLS_CANARY] ✅ Test 3 PASSED: 3 RLS policies active
[RLS_CANARY] ======================================
[RLS_CANARY] ✅ ALL TESTS PASSED
[RLS_CANARY] ======================================
```

#### Schedule Hourly

```bash
# Add to crontab
crontab -e

# Add line (runs every hour):
0 * * * * /Users/snazir/ivylevel-platform-v10/scripts/rls_canary_probe.sh >> /Users/snazir/ivylevel-platform-v10/logs/rls_canary.log 2>&1
```

### 4.2: Setup PII Audit (Daily)

#### Test Audit Manually

```bash
./scripts/pii_audit_chips.sh
```

**Expected Output:**
```
[PII_AUDIT] ======================================
[PII_AUDIT] Chip Source PII Validation
[PII_AUDIT] ======================================
[PII_AUDIT] Fetching 100 latest chips...
[PII_AUDIT] Auditing 42 chips...
[PII_AUDIT] ======================================
[PII_AUDIT] ✅ PASSED: No PII detected in 42 chips
[PII_AUDIT] ======================================
```

#### Schedule Daily (2am)

```bash
crontab -e

# Add line:
0 2 * * * /Users/snazir/ivylevel-platform-v10/scripts/pii_audit_chips.sh >> /Users/snazir/ivylevel-platform-v10/logs/pii_audit.log 2>&1
```

### 4.3: Deadline Determinism Check

#### Manual Test

```bash
# Fetch deadline twice in 10 seconds
curl -H "Authorization: Bearer <token>" \
  "http://localhost:4101/api/students/<student_id>/facts/deadline_latest" \
  | jq '.college_name, .deadline_date'

sleep 10

curl -H "Authorization: Bearer <token>" \
  "http://localhost:4101/api/students/<student_id>/facts/deadline_latest" \
  | jq '.college_name, .deadline_date'

# Expected: SAME college_name and deadline_date (deterministic tie-breaking)
```

✅ **Checkpoint:** Guardrails enabled (RLS hourly, PII daily, determinism verified)

---

## Step 5: Setup Monitoring (1 hour)

### 5.1: Create Monitoring Dashboard

**File:** `scripts/monitor_dashboard.sh`

```bash
cat > /Users/snazir/ivylevel-platform-v10/scripts/monitor_dashboard.sh <<'MONITOR'
#!/usr/bin/env bash
# Real-time monitoring dashboard (run in separate terminal)

watch -n 10 '
clear
echo "======================================================================"
echo "v3.2 Production Monitoring Dashboard"
echo "======================================================================"
echo "Time: $(date)"
echo ""

echo "=== Workers Status ==="
pm2 jlist | jq -r ".[] | \"\(.name): \(.pm2_env.status) (restarts: \(.pm2_env.restart_time))\""
echo ""

echo "=== Outbox Backlog ===" 
PGPASSWORD=postgres psql -h localhost -U postgres -d ivylevel -Atc \
  "SELECT COUNT(*) FROM outbox WHERE processed_at IS NULL;" | \
  awk "{print \$1 \" pending (threshold: 100)\"}"
echo ""

echo "=== MV Refresh Age ==="
PGPASSWORD=postgres psql -h localhost -U postgres -d ivylevel -Atc \
  "SELECT EXTRACT(EPOCH FROM (NOW() - MAX(calculated_at)))/60 FROM mv_hgti_scores;" | \
  awk "{print \$1 \" minutes (threshold: 10)\"}"
echo ""

echo "=== API Health ==="
curl -s http://localhost:4101/api/health/liveness | jq -r ".status // \"DOWN\""
echo ""

echo "=== Recent Errors (Last 10) ==="
tail -10 /Users/snazir/ivylevel-platform-v10/logs/*-error.log 2>/dev/null || echo "No errors"
echo ""

echo "======================================================================"
'
MONITOR

chmod +x /Users/snazir/ivylevel-platform-v10/scripts/monitor_dashboard.sh
```

### 5.2: Start Dashboard

```bash
# In separate terminal window
./scripts/monitor_dashboard.sh
```

Keep this running during Week 0 rollout.

### 5.3: Alert Thresholds

| Metric | Threshold | Action |
|--------|-----------|--------|
| RLS Violations | 0 | 🚨 PAGE IMMEDIATELY + ROLLBACK |
| PII Leaks | 0 | 🚨 DISABLE EVIDENCE_PANEL + INVESTIGATE |
| Outbox Backlog | > 100 for 5 min | ⚠️ Alert, check worker logs |
| MV Refresh Age | > 10 min | ⚠️ Alert, restart mv-refresher |
| API Error Rate | > 1% for 10 min | ⚠️ Alert, check traces |
| Worker Restarts | > 3 in 1 hour | ⚠️ Alert, investigate crashes |

✅ **Checkpoint:** Monitoring dashboard running, alert thresholds documented

---

## Step 6: Execute Rollout

### Week 0: Foundation (Current)

#### Day 1: Deploy to Production

```bash
cd /Users/snazir/ivylevel-platform-v10/unified-frontend/apps/unified-app

# Final build
npm run build

# Start production server
npm run start

# Verify accessible
curl http://localhost:3000
```

#### Day 1-7: Monitor

**Daily Checklist:**
- [ ] Check monitoring dashboard (outbox, MV, errors)
- [ ] Review RLS canary logs (should be 100% pass)
- [ ] Review PII audit logs (should be 0 violations)
- [ ] Check user feedback (coaches using Evidence Panel)
- [ ] Verify no support tickets related to:
  - Cross-student data visibility
  - PII exposure
  - Deadline flickering

#### End of Week 0: Decision Point

**Go/No-Go for Week 2:**
- ✅ Zero RLS violations
- ✅ Zero PII leaks
- ✅ Outbox backlog < 100 for 95%+ of time
- ✅ MV refresh < 10 min for 95%+ of time
- ✅ No critical bugs
- ✅ Coach feedback positive

**If ANY criteria fails:** Stay on Week 0, fix issues before proceeding.

### Week 2: EQ Shadow Mode

#### Prep (Sunday before Week 2)

```bash
# Update .env (requires approval)
sed -i '' 's/VITE_FEATURE_EQ_LAYER=false/VITE_FEATURE_EQ_LAYER=true/' .env
sed -i '' 's/VITE_FEATURE_EQ_TOGGLE=false/VITE_FEATURE_EQ_TOGGLE=true/' .env
sed -i '' 's/VITE_IVYSCORE_VERSION=1/VITE_IVYSCORE_VERSION=2/' .env

# Rebuild
npm run build && npm run start
```

#### Monitor EQ Metrics

```bash
# Check EQ similarity scores (p95 should be >= 0.85)
PGPASSWORD=postgres psql -h localhost -U postgres -d ivylevel -c "
  SELECT 
    percentile_cont(0.95) WITHIN GROUP (ORDER BY similarity_score) as p95_similarity
  FROM eq_audits
  WHERE created_at >= NOW() - INTERVAL '24 hours';
"
```

### Week 3: Parent Signals

```bash
sed -i '' 's/VITE_FEATURE_PARENT_SIGNALS=false/VITE_FEATURE_PARENT_SIGNALS=true/' .env
sed -i '' 's/VITE_IVYSCORE_VERSION=2/VITE_IVYSCORE_VERSION=3/' .env
npm run build && npm run start
```

### Week 5: Full Production

```bash
sed -i '' 's/VITE_IVYSCORE_VERSION=3/VITE_IVYSCORE_VERSION=4/' .env
npm run build && npm run start
```

✅ **Checkpoint:** Rollout complete, all features enabled, metrics stable

---

## Emergency Rollback

### Feature-Level Rollback (Preferred)

```bash
cd /Users/snazir/ivylevel-platform-v10/unified-frontend/apps/unified-app

# Disable Evidence Panel
sed -i '' 's/VITE_FEATURE_EVIDENCE_PANEL=true/VITE_FEATURE_EVIDENCE_PANEL=false/' .env

# Freeze HGTI weight
sed -i '' 's/VITE_IVYSCORE_VERSION=[0-9]/VITE_IVYSCORE_VERSION=1/' .env

# Rebuild
npm run build && npm run start
```

### Full Rollback (Nuclear)

```bash
# Stop frontend
pkill -f "npm run start"

# Restore pre-v3.2 environment
cp .env.backup.* .env

# Rebuild with old config
npm run build && npm run start

# Stop workers
pm2 stop all

# Restore database (LAST RESORT)
PGPASSWORD=postgres psql -h localhost -U postgres -d ivylevel \
  < /tmp/backups/ivylevel_pre_v3.2_20251023_212345.sql
```

---

## Coach Runbook (One-Page)

### Evidence Tab
**What:** Shows receipts for claims about students  
**How:** Click a chip to see where data came from  
**When:** Updated within 5 minutes of new data

### Missing Evidence Card
**What:** Yellow card when we can't prove a claim  
**How:** Click button to add missing data  
**When:** Immediately after you add evidence

### Growth Score (HGTI)
**What:** Measures breakthrough moments  
**How:** Updates every ~5 minutes  
**When:** Don't refresh frantically - patience is a virtue

### Tone Weird?
**What:** EQ styling may not match student  
**How:** Toggle "Show original" to see raw text  
**When:** We log misses for tuning

---

## Owner Matrix

| Component | Owner | Responsibility |
|-----------|-------|----------------|
| Frontend Enablement | FE Lead | Flag changes, builds, deploys |
| Worker Uptime | BE Lead | PM2 status, outbox/MV SLOs |
| RLS & PII Audits | Security/Infra | Automated checks, alerts |
| EQ Similarity | Applied ML | Threshold tuning, fallback analysis |
| Score Change Comms | Product/Success | User announcements, coach training |

---

## Quick Reference

### Common Commands

```bash
# Check worker status
pm2 status

# View worker logs
pm2 logs

# Restart workers
pm2 restart all

# Check outbox backlog
PGPASSWORD=postgres psql -h localhost -U postgres -d ivylevel -c \
  "SELECT COUNT(*) FROM outbox WHERE processed_at IS NULL;"

# Check MV refresh age
PGPASSWORD=postgres psql -h localhost -U postgres -d ivylevel -c \
  "SELECT NOW() - MAX(calculated_at) FROM mv_hgti_scores;"

# Run RLS probe manually
./scripts/rls_canary_probe.sh

# Run PII audit manually
./scripts/pii_audit_chips.sh

# Start monitoring dashboard
./scripts/monitor_dashboard.sh
```

### Emergency Contacts

- Frontend Issues: @fe-lead
- Backend/Workers: @be-lead
- Security/RLS: @security-team
- On-Call: #oncall-engineering

---

**Status:** 🎯 READY TO EXECUTE  
**Next Step:** Execute Step 1 (Lock Environment)  
**Timeline:** Week 0 starts today

