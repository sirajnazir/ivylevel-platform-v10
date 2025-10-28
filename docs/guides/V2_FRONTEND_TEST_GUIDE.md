# v2.0 Unified Frontend Test Guide

**Date:** 2025-10-20
**Status:** ✅ Backend Verified, Frontend Ready for Testing

## Test Credentials

**Huda's Student Account:**
- Email: `hudasir4j@gmail.com`
- Password: `testpass123`
- Student ID: `huda-2025`

## Backend Status

✅ **Agent Framework Server:** Running on `http://localhost:4101`
✅ **Authentication:** JWT-based, working
✅ **Agent Chat:** Tested successfully via API
✅ **GamePlan Agent:** Returning complete game plan data

### Verified Backend Test (via curl)

```bash
# 1. Login
curl -X POST http://localhost:4101/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "hudasir4j@gmail.com", "password": "testpass123"}'

# Response includes:
# - access_token (JWT)
# - refresh_token
# - student profile data

# 2. Chat with agent
curl -X POST http://localhost:4101/api/agents/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {ACCESS_TOKEN}" \
  -d '{"student_id": "huda-2025", "message": "What is my game plan?"}'

# Response includes:
# - answer (formatted game plan)
# - chips (evidence references)
# - hits (data returned from tools)
# - debug (agent_id, tools_called, took_ms)
# - session_id
```

## Frontend Status

✅ **Unified Frontend:** Running on `http://localhost:5173`
✅ **Authentication Service:** `agentFrameworkAuth.ts` configured
✅ **Agent Client:** `agentClient.ts` configured
✅ **API Config:** Points to `http://localhost:4101/api`

### Frontend Test Steps

1. **Open browser to:** `http://localhost:5173`

2. **Login with Huda's credentials:**
   - Email: `hudasir4j@gmail.com`
   - Password: `testpass123`

3. **Test chat queries:**
   - "What is my game plan?"
   - "What awards have I won?"
   - "What colleges did I apply to?"
   - "Show me my NSM dashboard"

4. **Verify features:**
   - [ ] Login successful
   - [ ] JWT token stored in localStorage
   - [ ] Agent routing works (GamePlan, Awards, College agents)
   - [ ] Responses display correctly
   - [ ] Session persistence works
   - [ ] Logout works

## Expected Data (Huda's Profile)

### Awards Won (6 total)
1. JCamp Finalist (National, 2023)
2. JCamp Recipient (National, 2023)
3. National Merit Scholarship Semifinalist (National, 2023)
4. Bank of America Student Leader (National, 2023)
5. Notre Dame Leadership Seminars Scholar (National, 2023)
6. AP Scholar with Distinction (National, 2024)

### College Acceptances (9 colleges)
- UC Berkeley, UC San Diego, UC Irvine, UC Davis, UC Santa Barbara
- U of Illinois Urbana-Champaign (ATTENDING)
- U of Wisconsin-Madison, Purdue U, Cal Poly SLO

### NSM Metrics
- **Recognition:** 6 national awards won
- **Leadership:** 8+ extracurricular activities (Empowering AI, Synthoria, etc.)
- **Academic:** SAT 1540, GPA 4.0 UW / 4.58 W
- **Programs:** 5 summer programs targeted

## Troubleshooting

### If login fails:
```bash
# Check backend is running
curl http://localhost:4101/api/health

# Check credentials in database
PGDATABASE=ivylevel PGUSER=postgres psql -c \
  "SELECT student_id, email FROM students WHERE email = 'hudasir4j@gmail.com';"
```

### If chat fails:
```bash
# Check frontend console for errors
# Open DevTools > Console

# Check backend logs
# Look at terminal running `tsx src/server-agents.ts`

# Verify API URL in frontend
cat /Users/snazir/ivylevel-platform-v10/unified-frontend/apps/unified-app/.env
# Should show: VITE_AGENT_API_URL=http://localhost:4101/api
```

### If agents not routing correctly:
```bash
# Check agent registry
curl http://localhost:4101/api/agents/list \
  -H "Authorization: Bearer {ACCESS_TOKEN}"

# Should return: GamePlanAgent, CollegeAgent, AwardsAgent, etc.
```

## Success Criteria

✅ **Authentication:** User can login with email/password and get JWT token
✅ **Agent Routing:** System routes queries to correct agents
✅ **Data Retrieval:** Agents return accurate data from database
✅ **UI Display:** Frontend displays agent responses correctly
✅ **Session Management:** Conversations persist across multiple messages
✅ **NSM Integration:** NSM tools work and return accurate metrics

## Next Steps After Testing

1. **If successful:** Move to production deployment planning
2. **If issues found:** Document in GitHub issues
3. **Performance testing:** Test with multiple concurrent users
4. **Security review:** Verify JWT implementation and RLS policies

## Notes

- Backend uses fine-tuned GPT-4o-mini model: `ft:gpt-4o-mini-2024-07-18:personal:jenny-v9-eq:CQMYIrRA`
- All data sources verified (zero hallucinations)
- Single source of truth: `kb_items` for awards, `college_list` for colleges
- v14 foundation + v1.0 multi-agent + v2.0 unified frontend = complete platform

---

**Status:** Ready for manual frontend testing
**Last Updated:** 2025-10-20
**Version:** v2.0
