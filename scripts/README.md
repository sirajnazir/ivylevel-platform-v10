# IvyLevel v3.1 Hardening Scripts

This directory contains operational scripts to ensure the "never-blank" doctrine stays true under load and as new data is added.

## 🚀 Quick Start

```bash
# Run comprehensive validation
pnpm test:validate

# Create a snapshot before changes
pnpm snapshot

# Run smoke tests after deployment
pnpm test:smoke
```

## 📚 Scripts Overview

### Testing & Validation

- **`validate_v3.sh`** - Comprehensive validation suite with JSON assertions
  ```bash
  pnpm test:validate
  ```

- **`smoke_test.sh`** - Quick smoke tests for critical queries (SAT, awards, planning)
  ```bash
  pnpm test:smoke
  ```

- **`ci_evidence_gate.sh`** - CI gates that fail build if evidence < 95% or forbidden phrases found
  ```bash
  pnpm test:ci
  ```

- **`run_golden_questions.sh`** - Run 25 golden questions across all phases (P1-P5)
  ```bash
  pnpm test:golden
  ```

### Monitoring & Snapshots

- **`golden_snapshot.sh`** - Export vitals, canon, and retriever stats for rollback
  ```bash
  pnpm snapshot
  ```

- **`canary_monitor.sh`** - Hourly health check (add to cron)
  ```bash
  pnpm monitor:canary
  ```

### Data Management

- **`validate_new_data.sh`** - Interactive checklist for validating new JSONL data
  ```bash
  pnpm validate:new-data
  ```

## 📋 Daily Operations

### Before Deployment
```bash
# Create snapshot
pnpm snapshot

# Run full validation
pnpm test:validate
```

### After Deployment
```bash
# Quick smoke test
pnpm test:smoke

# Check response metrics
tail -f services/agent/logs/app.log | grep "response-metrics"
```

### Adding New Data
```bash
# Follow the interactive checklist
pnpm validate:new-data
```

## 🚨 Incident Response

If tests fail or canary alerts fire, see [INCIDENT_PLAYBOOK.md](../docs/INCIDENT_PLAYBOOK.md)

## ⏰ Cron Setup

Add to your crontab:
```bash
# Hourly canary
5 * * * * cd /path/to/project && pnpm monitor:canary

# Daily golden questions
0 2 * * * cd /path/to/project && pnpm test:golden

# Weekly snapshot
0 3 * * 0 cd /path/to/project && pnpm snapshot
```

## 📊 Success Metrics

- Evidence compliance: ≥ 95%
- No "don't have access" responses
- All golden questions pass
- Response time < 5s
- Correct chip kinds for each query type