# System Quick Reference Card

**Version:** v23.0
**Last Updated:** 2025-10-31
**Full Specs:** See [COMPLETE_SYSTEM_FLOW_SPECS.md](./COMPLETE_SYSTEM_FLOW_SPECS.md)

---

## 🚀 QUICK START (30 seconds)

```bash
# Terminal 1 - Backend
cd services/agent-framework
tsx src/server-utfa.ts

# Terminal 2 - Frontend
cd unified-frontend/apps/unified-app
pnpm dev

# Browser
http://localhost:5173
Login: hudasir4j@gmail.com / Password123
```

---

## 📍 CRITICAL INFORMATION

### Ports
- **Frontend:** `5173` (Vite)
- **Backend:** `8787` (Express)
- **Database:** `5432` (PostgreSQL)

### URLs
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8787
- **Health Check:** http://localhost:8787/health

### Test Account (Huda)
```
Frontend Login:
  Email: hudasir4j@gmail.com
  Password: Password123

Backend/Database ID: huda-2025
Data Scope: 89 weeks (2023-08-02 to 2025-03-04)
IvyScore: 85 (Platinum)
```

### Key Files
```
Backend:   services/agent-framework/src/server-utfa.ts
Frontend:  unified-frontend/apps/unified-app/src/App.tsx
Dashboard: unified-frontend/apps/unified-app/src/components/student/StudentDashboard.tsx
API:       unified-frontend/apps/unified-app/src/utils/v10ApiService.ts
```

---

## 🔌 API ENDPOINTS

**Base:** `http://localhost:8787`

### Authentication
```http
POST /api/auth/login
Body: { "username": "huda_001", "password": "huda123" }
Returns: { "token": "...", "user": {...} }
```

### Assessment
```http
GET /students/huda-2025/assessment
Returns: IvyScore (85), 4 pillars, dimensional scores, strengths, weak spots
```

### Game Plan
```http
GET /students/huda-2025/game-plan
Returns: Multi-year roadmap, phases, opportunities, milestones
```

### Weekly Vitals
```http
GET /students/huda-2025/vitals/weeks?limit=4
Returns: 4 most recent weeks with academic, EC, award data
```

### Opportunities
```http
GET /students/huda-2025/opportunities
Returns: 16+ awards, programs, scholarships
```

---

## 🎯 FRONTEND TABS

**Dashboard Tabs (StudentDashboard.tsx):**

1. **Assessment** - IvyScore (85), 4 Pillar Cards, Dimensional Scores
2. **Game Plan** - Multi-year roadmap, Target Profile, Opportunities
3. **Preparation** - Weekly Progress (89 weeks), Action Plans
4. **Sessions** - Coaching session videos
5. **Application** - Projects, Timeline
6. **Growth Journey** - Transformations timeline

---

## 💾 DATABASE

**Connection:** `$DATABASE_URL` from `.env`

**Key Tables:**
- `students` - Student profiles
- `game_plans` - Strategic roadmaps (1 per student)
- `weekly_vitals` - Weekly snapshots (89 for Huda)
- `opportunities` - Awards, programs (16+ for Huda)
- `tasks` - Action items
- `timeline_events` - Journey events

**Quick Queries:**
```sql
-- Huda's profile
SELECT * FROM students WHERE student_id = 'huda-2025';

-- Latest week
SELECT * FROM weekly_vitals
WHERE student_id = 'huda-2025'
ORDER BY week_number DESC LIMIT 1;

-- All opportunities
SELECT title, category, status, deadline
FROM opportunities
WHERE student_id = 'huda-2025';
```

---

## 🔧 TROUBLESHOOTING

### Backend won't start
```bash
pkill -f "tsx.*server-utfa"
cd services/agent-framework
tsx src/server-utfa.ts
```

### Frontend shows 404 errors
```bash
# Check .env.local
cat unified-frontend/apps/unified-app/.env.local
# Should have: VITE_API_URL=http://localhost:8787

# Verify backend running
curl http://localhost:8787/health
```

### Login fails
```bash
# Verify user exists
psql "$DATABASE_URL" -c "SELECT * FROM users WHERE username = 'huda_001';"

# Clear browser cache
# In browser console: localStorage.clear()
```

---

## 📚 DOCUMENTATION HIERARCHY

**Master Docs (Use These):**
1. `COMPLETE_SYSTEM_FLOW_SPECS.md` ⭐ Complete system reference (v23.0)
2. `MASTER_PROD_TECH_SPEC.md` - Architecture specification
3. `PROD_DB_ARCH.md` - Database architecture
4. `PROD_FEATURE_RELEASE_DETAILS.md` - Release history

**Archived Docs (Don't Use):**
- `docs/archive/2025-10-31-pre-v23.0/` - Outdated (wrong ports, endpoints)

---

## ⚡ ONE-LINERS

```bash
# Check everything is running
lsof -nP -iTCP -sTCP:LISTEN | grep -E "8787|5173"

# Test full stack
curl http://localhost:8787/health && curl -I http://localhost:5173

# Check Huda's data
curl -s http://localhost:8787/students/huda-2025/assessment | python3 -m json.tool | head -20

# View logs
tail -f logs/agent-framework-utfa.log

# Restart backend
pkill -f server-utfa && sleep 2 && cd services/agent-framework && tsx src/server-utfa.ts &
```

---

## 🎨 FRONTEND STACK

- **Framework:** React 18.3.1 + TypeScript
- **Build:** Vite
- **Styling:** styled-components
- **Routing:** react-router-dom
- **State:** React hooks + Context
- **HTTP:** fetch API

---

## 🔐 ENVIRONMENT VARIABLES

**Backend** (`services/agent-framework/.env.local`):
```bash
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
PINECONE_API_KEY=...
PINECONE_INDEX=jenny-v3-3072-093025
PORT=8787
```

**Frontend** (`unified-frontend/apps/unified-app/.env.local`):
```bash
VITE_API_URL=http://localhost:8787
VITE_API_BASE_URL=http://localhost:8787
```

---

**For Complete Details:** See [COMPLETE_SYSTEM_FLOW_SPECS.md](./COMPLETE_SYSTEM_FLOW_SPECS.md)
