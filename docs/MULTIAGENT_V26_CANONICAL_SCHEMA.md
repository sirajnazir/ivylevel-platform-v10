# MultiAgent Platform v2.0 - Canonical Data Schema

**Version:** v26.0
**Last Updated:** 2025-11-02
**Purpose:** **SINGLE SOURCE OF TRUTH** for all data field names across MultiAgent Platform v2.0

---

## Document Purpose

This document defines the **canonical field names** that MUST be used consistently across:

1. **Database Storage** (`kb_items.edges` JSONB, `multiagent_sessions.*_package` JSONB)
2. **GPT-4o Extraction** (`assessmentExtract.ts`)
3. **Intelligence Types** (TYPE-080, TYPE-081, TYPE-082, TYPE-083, etc.)
4. **Agent Logic** (AssessmentAgent, GamePlanAgent, ExecutionAgent)
5. **API Responses** (all v26 endpoints)

**Key Principle:** These field names are **additive extensions** to the production database schema documented in `PROD_DB_ARCH.md`. They leverage existing `kb_items` table infrastructure while adding new JSONB fields for conversational assessment data.

---

## Schema Alignment Strategy

### Existing Production Schema (Baseline)
From `PROD_DB_ARCH.md` - `kb_items` table:
- Uses snake_case: `item_id`, `student_id`, `tier1_state`, `tier2_substate`, `key_metric_value`
- Structured columns for core facts (dates, states, metrics)
- JSONB `edges` field for flexible extensions

### New v26 Fields (Additive)
Stored in:
- `kb_items.edges` JSONB (for persistent facts)
- `multiagent_sessions.assessment_package` JSONB (for session state)
- `multiagent_sessions.gameplan_package` JSONB (for game plan state)
- `multiagent_sessions.execution_package` JSONB (for execution state)

---

## Canonical Field Names

### Academic Profile Fields

| Field Name | Type | Example | Used In | Notes |
|------------|------|---------|---------|-------|
| `grade` | number | `11` | Assessment, GamePlan | Grade level (9-12) |
| `high_school` | string | `"Mountain House High"` | Assessment | Current school name |
| `gpa` | number | `4.3` | Assessment | GPA on 4.0 or 5.0 scale |
| `gpa_type` | enum | `"weighted"` / `"unweighted"` | Assessment | GPA weighting type |
| `sat_total` | number | `1520` | Assessment | SAT total score (400-1600) |
| `sat_math` | number | `760` | Assessment | SAT Math section (200-800) |
| `sat_verbal` | number | `760` | Assessment | SAT Verbal section (200-800) |
| `act_composite` | number | `34` | Assessment | ACT composite (1-36) |
| `ap_count` | number | `8` | Assessment | Number of AP courses |
| `class_rank` | number | `5` | Assessment | Class ranking |
| `class_rank_total` | number | `400` | Assessment | Total students in class |

### Student Profile Fields

| Field Name | Type | Example | Used In | Notes |
|------------|------|---------|---------|-------|
| `target_major` | string | `"Computer Science"` | Assessment, GamePlan | Intended major |
| `target_colleges` | string[] | `["MIT", "Stanford"]` | Assessment, GamePlan | Target schools |
| `personality_type` | enum | `"introverted"` / `"extroverted"` | Assessment | Personality self-description |
| `friend_group_size` | enum | `"small"` / `"medium"` / `"large"` | Assessment | Social circle size |
| `friend_group_dynamic` | enum | `"competitive"` / `"collaborative"` | Assessment | Group dynamic |

### Interests & Activities Fields

| Field Name | Type | Example | Used In | Notes |
|------------|------|---------|---------|-------|
| `interests` | string[] | `["AI", "Game Development"]` | Assessment | Academic/personal interests |
| `activities` | string[] | `["Robotics Club", "Debate Team"]` | Assessment | Extracurricular activities |
| `leadership_roles` | string[] | `["President of Coding Club"]` | Assessment | Leadership positions |

### Goals & Aspirations Fields

| Field Name | Type | Example | Used In | Notes |
|------------|------|---------|---------|-------|
| `career_goals` | string[] | `["Software Engineer", "AI Researcher"]` | Assessment, GamePlan | Career aspirations |
| `motivations` | string[] | `["Help underserved communities"]` | Assessment | What drives the student |

### Narrative Fields (v26.1+)

| Field Name | Type | Example | Used In | Notes |
|------------|------|---------|---------|-------|
| `unique_experiences` | string[] | `["Built game for blind students"]` | Assessment | Defining experiences |
| `core_values` | string[] | `["Accessibility", "Education"]` | Assessment | Guiding principles |
| `challenges_overcome` | string[] | `["First-gen college student"]` | Assessment | Obstacles faced |
| `defining_moments` | string[] | `["Teaching coding to girls"]` | Assessment | Key life moments |
| `identity_keywords` | string[] | `["creative", "analytical"]` | Assessment | How others describe them |

---

## Field Name Mapping Rules

### DO NOT Use These Field Names

| ❌ WRONG (Old/Custom) | ✅ CORRECT (Canonical) | Why Changed |
|----------------------|------------------------|-------------|
| `grade_level` | `grade` | Simpler, matches extraction |
| `current_school` | `high_school` | Matches GPT-4o extraction schema |
| `academic_interests` | `interests` | Unified with personal interests |
| `passion_areas` | `interests` | Merged with interests array |
| `extracurricular_activities` | `activities` | Simpler, matches extraction |
| `personal_constraints` | (narrative fields) | Captured in challenges_overcome |
| `family_context` | (narrative fields) | Captured in unique_experiences |

---

## Database Storage Strategy

### kb_items.edges JSONB Structure

For assessment data extracted from conversations:

```json
{
  "grade": 11,
  "high_school": "Mountain House High",
  "gpa": 4.3,
  "gpa_type": "weighted",
  "interests": ["AI", "Game Development", "Video Editing"],
  "activities": ["Teaching young girls", "Educational Games Building"],
  "target_major": "Computer Science",
  "target_colleges": ["MIT", "Stanford", "CMU"]
}
```

### multiagent_sessions.assessment_package JSONB Structure

For session state and progress tracking:

```json
{
  "phase": "discovery",
  "completion": 0.65,
  "collected_data": {
    "grade": 11,
    "high_school": "Mountain House High",
    "interests": ["AI", "Game Development"],
    "activities": ["Teaching young girls"]
  },
  "questions_asked": [
    "What grade are you in right now?",
    "What school do you currently attend?"
  ],
  "intelligence_results": [
    {
      "type_id": "TYPE-080",
      "triggered": true,
      "data": { ... }
    }
  ]
}
```

---

## Implementation Checklist

To ensure canonical schema compliance across the platform:

### 1. Database Layer
- [x] `kb_items.edges` uses canonical field names
- [x] `multiagent_sessions.*_package` uses canonical field names
- [ ] Migration script to rename any legacy fields

### 2. Extraction Layer
- [ ] `assessmentExtract.ts` uses canonical field names
- [ ] GPT-4o function schema matches canonical names
- [ ] Validation functions use canonical names

### 3. Intelligence Layer
- [ ] TYPE-080 `PHASE_REQUIREMENTS` use canonical names
- [ ] TYPE-080 question map keys use canonical names
- [ ] TYPE-081, TYPE-082, TYPE-083 use canonical names
- [ ] All new intelligence types use canonical names

### 4. Agent Layer
- [ ] AssessmentAgent `extractCollectedData()` uses canonical names
- [ ] GamePlanAgent uses canonical names
- [ ] ExecutionAgent uses canonical names

### 5. API Layer
- [ ] All v26 endpoints return canonical field names
- [ ] Frontend receives and displays canonical names
- [ ] UI logging shows canonical names

---

## Migration Notes

**For existing code using old field names:**

1. Update `TYPE-080-FourPhaseAssessmentFlow.ts`:
   - Change `PHASE_REQUIREMENTS` to use canonical names
   - Change question map keys to use canonical names

2. Keep `assessmentExtract.ts` unchanged (already uses canonical names):
   - `grade` ✅
   - `high_school` ✅
   - `interests` ✅
   - `activities` ✅
   - `target_major` ✅
   - `target_colleges` ✅

3. Add field aliasing in PostgresFactSource if needed for backward compatibility

---

## Validation

**To verify canonical schema compliance:**

```typescript
// Example validation function
function validateCanonicalFields(data: Record<string, any>): boolean {
  const canonicalFields = [
    'grade', 'high_school', 'gpa', 'gpa_type',
    'sat_total', 'sat_math', 'sat_verbal', 'act_composite',
    'target_major', 'target_colleges',
    'interests', 'activities', 'leadership_roles',
    'career_goals', 'motivations',
    'unique_experiences', 'core_values', 'challenges_overcome',
    'defining_moments', 'identity_keywords'
  ];

  const invalidFields = Object.keys(data).filter(
    key => !canonicalFields.includes(key)
  );

  if (invalidFields.length > 0) {
    console.error('[SCHEMA_VIOLATION] Non-canonical fields detected:', invalidFields);
    return false;
  }

  return true;
}
```

---

## Version History

- **v26.0** (2025-11-02): Initial canonical schema definition
  - Defined 30+ canonical field names
  - Established kb_items.edges storage strategy
  - Created field name mapping rules

---

**Next Update:** When new data fields are needed, they MUST be added to this document FIRST before implementation.
