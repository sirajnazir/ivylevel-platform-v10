# ivylevel-platform-v10

## Overview
IvyLevel Platform v10 - AI-powered college admissions coaching system with Jenny, a digital twin coach.

## Key Features
- **RAG-powered responses** with evidence chips from 93-week coaching corpus
- **Vitals system** for tracking student metrics and achievements
- **Never-blank doctrine** for factual responses
- **168-hour planning** framework
- **Fine-tuned models** capturing Jenny's coaching style

## Quick Start
1. Install dependencies: `pnpm install`
2. Set environment variables (see `.env.example`)
3. Start services: 
   ```bash
   docker-compose up -d db  # PostgreSQL
   pnpm --filter @services/retriever dev
   pnpm --filter @services/agent dev
   pnpm --filter @apps/api dev
   ```
4. Run vitals smoke test: `./scripts/smoke-test-vitals.sh`

## Documentation
- [Master Spec](docs/MASTER_SPEC_v1.0.md) - Technical architecture and implementation details
- [Manual Steps](docs/MANUAL_STEPS_CHECKLIST.md) - Step-by-step setup guide
- [Vitals Quick Start](docs/VITALS_QUICK_START.md) - Vitals system overview

## Recent Updates (v1.1.0)
- Added Vitals & Observations system for student state tracking
- Implemented fact enforcement to ensure accurate responses
- Added nightly cron for vitals recomputation
- Created bulk backfill scripts for historical data import
