# Authentication Analysis: Current vs Required for Multi-Coach

**Date:** 2025-10-16
**Purpose:** Explain why JWT authentication integration is needed and how it differs from current implementation

---

## Current Authentication Implementation

### What You Have Now (API Key Authentication)

**Location:** `src/middleware/security.ts`

```typescript
export function withApiKey(req: any, res: any, next: any) {
  const expected = process.env.API_KEY;
  if (!expected) return next(); // dev mode - no auth required!
  const got = req.header('X-API-Key');
  if (got !== expected) return res.status(401).json({ error:'unauthorized' });
  next();
}
```

**How it works:**
1. Client sends request with header: `X-API-Key: some-secret-key`
2. Server checks if it matches `process.env.API_KEY`
3. If match → allow request
4. If no match → reject with 401

**What this authenticates:**
- ✅ The **application/client** is authorized
- ❌ Does NOT identify **which coach** is making the request
- ❌ Does NOT identify **which student** the coach is working with
- ❌ No concept of user identity, roles, or permissions

**Current API Request:**
```bash
POST /api/agents/chat
Headers:
  X-API-Key: abc123secret

Body:
  {
    "student_id": "huda-2025",
    "message": "What are my chances at MIT?"
  }
```

**Problem:**
- Client must explicitly pass `student_id` in body
- **No way to know which coach is making the request**
- Anyone with the API key can query ANY student's data
- **No multi-coach isolation possible!**

---

## Why Current Authentication Doesn't Support Multi-Coach

### The Missing Piece: Coach Identity

**Scenario 1: Coach Jenny queries student data**
```bash
POST /api/agents/chat
Headers:
  X-API-Key: abc123secret  # ← Same key for all coaches!

Body:
  {
    "student_id": "huda-2025",
    "message": "Show me Huda's essay progress"
  }
```

**Scenario 2: Coach Alex queries the SAME student**
```bash
POST /api/agents/chat
Headers:
  X-API-Key: abc123secret  # ← Same key! Can't tell coaches apart!

Body:
  {
    "student_id": "huda-2025",
    "message": "Show me Huda's essay progress"
  }
```

**Current Behavior:**
- Both coaches see the SAME data
- No way to separate Jenny's sessions with Huda from Alex's sessions with Huda
- RLS has no idea which coach to filter by
- **Multi-coach platform impossible with API key alone**

### What's Hardcoded Now

**In SessionManager.createSession():**
```typescript
async createSession(
  studentId: string,
  category?: string,
  coachId: string = 'jenny-coach-1'  // ← HARDCODED DEFAULT!
): Promise<IvyLevelSession>
```

**In routes/agents.ts:**
```typescript
const coachId = session.coach_id || 'jenny-coach-1';  // ← FALLBACK TO JENNY!
```

**Result:**
- Every session defaults to 'jenny-coach-1'
- Multi-coach infrastructure exists but not used
- RLS works but always filters to jenny-coach-1
- **Platform is single-coach only right now**

---

## What JWT Authentication Adds

### JWT (JSON Web Token) Explained

**What is JWT?**
- A secure token that contains user identity and claims
- Signed by the server so it can't be tampered with
- Sent with every request to identify the user

**JWT Structure:**
```
header.payload.signature

Payload (decoded):
{
  "user_id": "coach-jenny-uuid-123",
  "coach_id": "jenny-coach-1",        ← THIS IS WHAT WE NEED!
  "email": "jenny@ivylevel.com",
  "role": "coach",
  "exp": 1697654321  // expiration
}
```

### How JWT Solves Multi-Coach

**Login Flow:**
```
1. Coach logs in with email/password
2. Server verifies credentials
3. Server generates JWT with coach_id inside
4. Client stores JWT (in localStorage or cookie)
5. Client sends JWT with every API request
```

**API Request with JWT:**
```bash
POST /api/agents/chat
Headers:
  Authorization: Bearer eyJhbGciOiJIUzI1NiIs...  ← JWT token

Body:
  {
    "student_id": "huda-2025",
    "message": "What are my chances at MIT?"
  }
```

**Server extracts coach_id:**
```typescript
// Middleware decodes JWT
const token = req.headers.authorization?.split(' ')[1];
const decoded = jwt.verify(token, SECRET_KEY);

// Now we know WHO is making the request!
req.user = {
  user_id: decoded.user_id,
  coach_id: decoded.coach_id,  // ← "jenny-coach-1"
  email: decoded.email,
  role: decoded.role
};

// Pass coach_id to session creation
const session = await sessionManager.createSession(
  student_id,
  category,
  req.user.coach_id  // ← From JWT, not hardcoded!
);
```

**Result:**
- Jenny's requests create sessions with coach_id = 'jenny-coach-1'
- Alex's requests create sessions with coach_id = 'alex-coach-2'
- RLS automatically filters data by coach
- **Multi-coach platform works!**

---

## Comparison: API Key vs JWT

| Feature | API Key (Current) | JWT (Needed) |
|---------|------------------|--------------|
| **Authenticates application** | ✅ Yes | ✅ Yes |
| **Identifies specific user** | ❌ No | ✅ Yes (user_id) |
| **Identifies coach** | ❌ No | ✅ Yes (coach_id) |
| **Identifies student** | ⚠️ Client must send | ✅ Can be in token |
| **Supports multiple coaches** | ❌ No | ✅ Yes |
| **Supports role-based access** | ❌ No | ✅ Yes (role claim) |
| **Can expire** | ❌ No | ✅ Yes (exp claim) |
| **Can be revoked** | ⚠️ Must change global key | ✅ Yes (token blacklist) |
| **Supports permissions** | ❌ No | ✅ Yes (custom claims) |
| **Audit trail** | ⚠️ Only app-level | ✅ User-level logging |

---

## What JWT Integration Means

### NOT Replacing API Key

**Both can coexist:**
```typescript
router.post('/chat',
  withApiKey,  // ← Still validate API key (app-level)
  withJWT,     // ← ALSO validate JWT (user-level)
  async (req, res) => {
    // Now we have:
    // - API key confirms this is our app
    // - JWT tells us which coach is using the app
    const coachId = req.user.coach_id;
    // ...
  }
);
```

**Why both?**
- API key: "Is this request from our authorized frontend app?"
- JWT: "Which specific user in that app is making this request?"

### What Changes in Your Code

**Minimal changes required:**

1. **Add JWT middleware** (new file):
```typescript
// src/middleware/auth.ts
import jwt from 'jsonwebtoken';

export function withJWT(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;  // Contains coach_id
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

2. **Update routes** (1 line change):
```typescript
// src/routes/agents.ts
router.post('/chat', withJWT, async (req, res) => {  // ← Add middleware
  const { student_id, message } = req.body;

  // OLD: Hardcoded
  // const coachId = 'jenny-coach-1';

  // NEW: From JWT
  const coachId = req.user.coach_id;  // ← Extract from JWT

  const session = await sessionManager.getOrCreateSession(
    student_id,
    undefined,
    coachId  // ← Pass extracted coach_id
  );
  // ... rest unchanged
});
```

**That's it!** The rest of your multi-coach infrastructure already works.

---

## Do You Already Have JWT Elsewhere?

Let me check your existing authentication implementations:

### Found: API Key Only

**Current auth files:**
- `src/middleware/security.ts` - API key validation only
- No JWT implementation found in agent-framework

**Other components might have JWT:**
- Check if your frontend/web app has JWT login
- Check if other services (jenny-api, etc.) use JWT
- Check authentication microservice if you have one

### If You Already Have JWT Login

**You might already have:**
- User login endpoint (`/api/auth/login`)
- JWT generation on login
- JWT secret in environment variables
- Frontend storing and sending JWT

**What you need to add:**
1. Include `coach_id` in JWT payload when generating tokens
2. Add JWT verification middleware to agent-framework routes
3. Extract `coach_id` from req.user and pass to SessionManager

**Estimated time:** 1-2 hours (just wire it up)

### If You Don't Have JWT Yet

**You need to implement:**
1. User/coach table in database (users, coaches)
2. Login endpoint with password hashing (bcrypt)
3. JWT generation on successful login
4. JWT secret management (environment variable)
5. JWT verification middleware
6. Frontend login UI and token storage

**Estimated time:** 4-8 hours (full auth system)

---

## Why It's Critical for v1.0 Multi-Coach Platform

### Without JWT + coach_id

**Every session is jenny-coach-1:**
```typescript
// All these default to jenny-coach-1
const session1 = await sessionManager.createSession('huda-2025');
const session2 = await sessionManager.createSession('sarah-2026');
const session3 = await sessionManager.createSession('mike-2024');

// RLS filters all to coach_id = 'jenny-coach-1'
// Multi-coach infrastructure exists but unused
// Platform is effectively single-coach
```

**Problems:**
- Can't onboard new coaches
- Can't separate coach data
- Can't bill per coach
- Can't track coach metrics
- RLS works but always for same coach
- **Platform launch claims "multi-coach" but isn't really**

### With JWT + coach_id

**Each coach gets their own isolated data:**
```typescript
// Coach Jenny logs in → JWT has coach_id: 'jenny-coach-1'
const sessionJenny = await sessionManager.createSession(
  'huda-2025',
  undefined,
  req.user.coach_id  // 'jenny-coach-1'
);

// Coach Alex logs in → JWT has coach_id: 'alex-coach-2'
const sessionAlex = await sessionManager.createSession(
  'huda-2025',
  undefined,
  req.user.coach_id  // 'alex-coach-2'
);

// Same student (huda-2025) but DIFFERENT sessions
// RLS ensures Jenny sees only her session with Huda
// RLS ensures Alex sees only his session with Huda
// TRUE multi-coach platform!
```

**Benefits:**
- ✅ Onboard unlimited coaches
- ✅ Complete data isolation (RLS enforced)
- ✅ Bill per coach (track sessions by coach_id)
- ✅ Coach-specific analytics
- ✅ Audit trail (who did what)
- ✅ Role-based access (coach vs admin vs student)
- ✅ **Platform ready for scale**

---

## Recommendation: Check What You Have First

### Step 1: Search for Existing JWT Implementation

**Commands to run:**
```bash
# Search for JWT libraries
grep -r "jsonwebtoken\|jwt" package.json

# Search for JWT usage in code
grep -r "jwt.sign\|jwt.verify" . --include="*.ts" --include="*.js"

# Search for login endpoints
grep -r "/login\|/auth" . --include="*.ts" --include="*.js"

# Search for user/coach tables
psql $DATABASE_URL -c "\d users; \d coaches; \d auth_users;"
```

### Step 2: If JWT Exists

**You need:**
1. Confirm `coach_id` is in JWT payload
2. Add JWT middleware to agent-framework
3. Wire up `req.user.coach_id` to SessionManager
4. Test with different coaches

**Time:** 1-2 hours

### Step 3: If JWT Doesn't Exist

**You need:**
1. Design user/coach data model
2. Implement authentication endpoints
3. Add JWT generation and verification
4. Update frontend to login and store tokens
5. Wire up to agent-framework

**Time:** 4-8 hours for full implementation

---

## Bottom Line

**Why JWT is needed:**
- API key says "this is our app" ✅
- JWT says "this is Jenny, not Alex" ✅
- coach_id enables multi-coach platform ✅

**Current state:**
- Multi-coach infrastructure: 100% complete ✅
- RLS working perfectly: 100% tested ✅
- Authentication gap: coach_id extraction ⚠️

**To launch multi-coach v1.0:**
- Need to extract coach_id from somewhere
- JWT is the standard way to do this
- Without it, platform defaults to single coach

**Not urgent if:**
- You're only launching with Jenny initially
- You'll add more coaches later
- You have time to implement JWT before next coach

**Urgent if:**
- You want multiple coaches at launch
- You're demoing multi-coach capability
- You need per-coach billing/analytics

---

## Questions to Answer

1. **Do you already have user authentication anywhere?**
   - Frontend login page?
   - Auth service?
   - OAuth/SSO integration?

2. **How do coaches currently access the platform?**
   - Direct API calls?
   - Web dashboard?
   - Mobile app?

3. **Where does student_id come from now?**
   - Hardcoded in tests?
   - User selects from dropdown?
   - Passed from external system?

4. **Do you have a users/coaches table?**
   - In PostgreSQL?
   - In another service?
   - Managed externally?

**Based on your answers, I can provide:**
- Exact implementation steps
- Code to reuse from existing auth
- Timeline estimate
- Or explain why it's not needed yet

Would you like me to search your codebase for existing authentication implementations to see what's already there?
