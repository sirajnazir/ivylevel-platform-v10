# UI Login Credentials - Quick Reference

**Last Updated:** 2025-10-23
**Frontend URL:** http://localhost:5175/

---

## 🔐 Test Account Credentials

### Primary Test Student

**Email:** `newhuda@test.com`
**Password:** `newhuda123`

**Student Details:**
- Student ID: `huda-2025-new`
- Full Name: Huda New
- Type: Real student (not synthetic)
- Assessment Mode: Interactive
- Parent Student ID: `huda-2025` (linked to real student)

---

## 📊 Available Students in Database

```sql
student_id    | email                | full_name | is_synthetic
--------------+----------------------+-----------+-------------
huda-2025     | hudasir4j@gmail.com  | Huda A.   | false
huda-2025-new | newhuda@test.com     | Huda New  | false
```

---

## 🚀 How to Login

### Step 1: Access Frontend
```
Open browser: http://localhost:5175/
```

### Step 2: Login Page
You should see the login page. If not, navigate to `/login`

### Step 3: Enter Credentials
```
Email:    newhuda@test.com
Password: newhuda123
```

### Step 4: Access Dashboard
After login, you should be redirected to the student dashboard.

---

## 🧪 Testing v3.2 Components

Once logged in as `newhuda@test.com`, you can test v3.2 features:

### 1. Evidence Panel
The Evidence Panel will show chips for this student. Currently empty, but you can add test data:

```bash
# Create a test chip
PGPASSWORD=postgres psql -h localhost -U postgres -d ivylevel -c "
INSERT INTO chips (id, student_id, kind, source, hash, trace_id, created_at)
VALUES (
  gen_random_uuid(),
  'huda-2025-new',
  'SQL',
  '{\"query\": \"SELECT gpa FROM transcripts\", \"result\": 3.85}',
  md5('test_chip_huda_1'),
  'trace_' || md5(random()::text),
  NOW()
);
"
```

### 2. HGTI Score Card
Shows growth barriers. Add test growth event:

```bash
# Create test growth event
PGPASSWORD=postgres psql -h localhost -U postgres -d ivylevel -c "
INSERT INTO growth_events (
  student_id, barrier_type, trigger, coach_reflection,
  breakthrough, transformation_delta, occurred_at
)
VALUES (
  'huda-2025-new',
  'INTERNAL_CONFIDENCE',
  'Overcame fear of public speaking',
  'Major breakthrough during presentation',
  true,
  0.75,
  CURRENT_DATE
);
"

# Refresh materialized view
PGPASSWORD=postgres psql -h localhost -U postgres -d ivylevel -c "
REFRESH MATERIALIZED VIEW mv_hgti_scores;
"
```

### 3. Missing Evidence Card (412 UX)
Will automatically show when trying to load missing data (e.g., GPA without transcript).

---

## 🔧 Troubleshooting Login

### Problem: Can't Login / Invalid Credentials

**Solution 1: Verify password is set**
```bash
# Check if password is hashed in database
PGPASSWORD=postgres psql -h localhost -U postgres -d ivylevel -c "
SELECT student_id, email, password IS NOT NULL as has_password
FROM students
WHERE email = 'newhuda@test.com';
"
```

**Solution 2: Reset password manually**
```bash
# Use the set_test_password script
cd /Users/snazir/ivylevel-platform-v10/services/agent-framework
node set_test_password.mjs
```

**Solution 3: Check auth configuration**
```bash
# Verify Firebase/auth is configured in frontend
cat unified-frontend/apps/unified-app/.env | grep FIREBASE
```

### Problem: Login Page Not Loading

**Solution: Verify frontend dev server is running**
```bash
# Should show Vite dev server on port 5175
curl http://localhost:5175/
```

### Problem: After Login, Redirected to Error

**Solution: Check browser console for errors**
1. Open browser DevTools (F12)
2. Check Console tab for errors
3. Check Network tab for failed API calls

---

## 📋 Quick Testing Checklist

After logging in:
- [ ] Dashboard loads successfully
- [ ] No console errors in browser DevTools
- [ ] API calls to http://localhost:8787 are successful (check Network tab)
- [ ] v3.2 components render (if integrated into dashboard)
- [ ] Feature flags are enabled (Evidence Panel, HGTI, 412 UX)

---

## 🔗 Related Resources

- **Frontend URL:** http://localhost:5175/
- **Backend API:** http://localhost:8787/
- **Full Integration Guide:** `docs/guides/FULL_STACK_INTEGRATION_COMPLETE.md`
- **Quick Reference:** `docs/guides/V3.2_QUICK_REFERENCE.md`

---

## 📊 Current System Status

**Frontend Dev Server:** ✅ RUNNING (Port 5175)
**Backend API Server:** ✅ RUNNING (Port 8787)
**Database:** ✅ CONNECTED (2 real students)
**v3.2 Components:** ✅ IMPLEMENTED (ready for integration)
**v3.2 API Endpoints:** ✅ TESTED (all working)

---

**Last Verified:** 2025-10-23
**Test Account:** newhuda@test.com / newhuda123
**Status:** ✅ READY FOR LOGIN & TESTING
