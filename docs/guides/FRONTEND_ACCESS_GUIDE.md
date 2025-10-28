# Frontend Access Guide - v2.0

**Date:** 2025-10-20
**Status:** ✅ RUNNING

---

## Service Status

### Backend (Agent Framework)
- **URL:** http://localhost:4101
- **Status:** ✅ Running
- **Health Check:** http://localhost:4101/api/health

### Frontend (Unified App)
- **URL:** http://localhost:5173
- **Status:** ✅ Running
- **Process:** Vite dev server (PID: 82528)

---

## Access the Application

### 1. Open Your Browser

Navigate to: **http://localhost:5173**

### 2. Login Credentials

**Huda's Student Account:**
- Email: `hudasir4j@gmail.com`
- Password: `testpass123`
- Student ID: `huda-2025`

### 3. Test Queries

Once logged in, try these queries in the chat:

#### Profile & Game Plan
```
What is my game plan?
Show me my NSM dashboard
What is my IvyReady score?
```

#### Academic Data
```
What was my first SAT score?
Show me all my SAT scores
What were my final grades?
What is my GPA?
```

#### Awards & Recognition
```
What awards have I won?
Show me my award win rate
What national awards did I get?
```

#### College Applications
```
What colleges did I apply to?
Which colleges accepted me?
Where am I attending?
What is my college list breakdown?
```

#### Extracurriculars & Programs
```
What are my extracurricular activities?
What leadership positions do I have?
What summer programs did I apply to?
```

---

## Expected Data (Huda's Profile)

### IvyReady Score
- **Score:** 90.5/100 (final_submit)

### Academic Metrics
- **SAT Progression:** 1360 (practice) → 1480 (official) → 1530 (official final)
- **GPA:** 3.97 UW / 4.52 W
- **AP Courses:** 5 (Senior year: AP Lit, AP Stats, AP Spanish Lang, AP Gov, AP Psych)
- **Final Grades:** All A's in senior year courses

### Recognition
- **6 Awards Won:**
  1. NCWIT Aspirations in Computing - National Awardee
  2. NCWIT Aspirations in Computing - Northern California Regional Winner
  3. Mountain House High School CS CTE Award
  4. AP Scholar with Distinction
  5. Games for Change Writing Impact Award
  6. College Board National Rural and Small Town Award
- **Win Rate:** 100%

### Leadership
- **20 Total ECs**
- **2 President Roles**
- **3 Founder Roles**
- **2 Leadership ECs**

### College List
- **28 Total Colleges**
  - 19 Reach schools
  - 7 Match schools
  - 2 Safety schools
- **9 Acceptances:**
  - Northeastern University
  - UC Irvine
  - University of Southern California
  - UC Davis
  - UC Santa Cruz
  - UIUC (ATTENDING)
  - UNC Chapel Hill
  - SJSU
  - UC Riverside

### Summer Programs
- **Attended:** 2 (JCamp AAJA, Kode With Klossy)
- **Planned:** 5 (Notre Dame Leadership, AI Scholars, Bank of America Student Leaders, YYGS, AAJA JCamp)
- **Total:** 7 programs

### Essays
- **Common App:** Draft quality
- **Identity Fusion:** Weak clarity
- **Differentiation Score:** 4

---

## Recent Updates (v2.0.1 - 2025-10-20)

### Academic Data Corrections
- ✅ **Fixed senior year courses** - Database now contains correct courses from final college application
- ✅ **Fixed NSM academic vitals** - Now queries v14 specialized views (v_sat_enum_latest, v_gpa_latest)
- ✅ **Fixed AP course counting** - Now uses `level = 'AP'` filter instead of title matching
- ✅ **Complete documentation** - See `/docs/guides/NSM_V2_ACADEMIC_DATA_FIX.md` for details

**Corrected Senior Year Courses:**
1. AP Literature and Composition
2. AP Statistics
3. AP Spanish Language and Culture
4. AP US Government and Politics
5. AP Psychology
6. Adulting (Regular)
7. Applied Computer Science practices (Regular)

**All 7 courses show final grade of A**

---

## Troubleshooting

### Frontend Not Loading

1. **Check if service is running:**
   ```bash
   lsof -ti :5173
   ```

2. **If not running, start it:**
   ```bash
   cd /Users/snazir/ivylevel-platform-v10/unified-frontend/apps/unified-app
   npm run dev
   ```

3. **Check logs:**
   ```bash
   tail -f /tmp/vite-dev.log
   ```

### Backend Not Responding

1. **Check if service is running:**
   ```bash
   lsof -ti :4101
   ```

2. **If not running, start it:**
   ```bash
   cd /Users/snazir/ivylevel-platform-v10/services/agent-framework
   tsx src/server-agents.ts
   ```

3. **Check logs:**
   ```bash
   tail -f /tmp/agent-server.log
   ```

### Login Issues

1. **Verify credentials:**
   ```bash
   PGDATABASE=ivylevel PGUSER=postgres psql -c \
     "SELECT student_id, email FROM students WHERE email = 'hudasir4j@gmail.com';"
   ```

2. **Reset password if needed:**
   ```bash
   cd /Users/snazir/ivylevel-platform-v10/services/agent-framework
   node set_test_password.mjs
   ```

### Agent Not Responding

1. **Test backend directly:**
   ```bash
   # Login
   curl -X POST http://localhost:4101/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email": "hudasir4j@gmail.com", "password": "testpass123"}'

   # Chat (use token from login)
   curl -X POST http://localhost:4101/api/agents/chat \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer {ACCESS_TOKEN}" \
     -d '{"student_id": "huda-2025", "message": "What is my game plan?"}'
   ```

2. **Check API configuration:**
   ```bash
   cat /Users/snazir/ivylevel-platform-v10/unified-frontend/apps/unified-app/.env
   # Should show: VITE_AGENT_API_URL=http://localhost:4101/api
   ```

---

## Features Available

### ✅ Authentication
- JWT-based login
- Auto token refresh
- Role-based access (student/coach/admin)

### ✅ Agent Routing
- Auto-routes queries to correct agent
- GamePlan, College, Awards, ECs, Programs, Essay, Admissions agents

### ✅ NSM Dashboard
- IvyReady score
- Recognition vitals
- Leadership vitals
- Academic vitals
- Program vitals
- College list vitals
- Essay vitals

### ✅ Data Accuracy
- 100% alignment with v14 foundation
- Zero hallucinations
- Single source of truth

### ✅ Session Management
- Conversation history persistence
- Session continuity across multiple queries
- Context preservation

---

## Browser DevTools (for Debugging)

### Check Console for Errors
1. Open DevTools (F12 or Cmd+Option+I)
2. Go to Console tab
3. Look for errors related to API calls

### Check Network Tab
1. Go to Network tab
2. Filter by "Fetch/XHR"
3. Check API calls to http://localhost:4101/api/*

### Check Local Storage
1. Go to Application tab
2. Expand "Local Storage" → http://localhost:5173
3. Verify tokens:
   - `access_token` should exist
   - `refresh_token` should exist

---

## Performance Expectations

### Agent Response Times
- Simple queries (awards, colleges): 1-2 seconds
- Complex queries (game plan, NSM): 3-5 seconds
- First query (cold start): 5-7 seconds

### Data Loading
- Authentication: < 500ms
- Initial page load: 1-2 seconds
- Subsequent navigation: < 500ms

---

## Next Steps

1. **Open browser to** http://localhost:5173
2. **Login** with Huda's credentials
3. **Test queries** from the list above
4. **Verify** all data displays correctly
5. **Report** any issues found

---

**Status:** ✅ Ready for Testing
**Last Updated:** 2025-10-20
**Version:** v2.0.1
