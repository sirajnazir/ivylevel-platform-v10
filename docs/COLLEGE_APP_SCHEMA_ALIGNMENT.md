# College Application Schema Alignment - First Principles

**Date:** 2025-10-27
**Purpose:** Define standardized metric schema aligned with Common Application format
**Status:** Schema Definition

---

## Common Application Activity Format

Based on Common App and Coalition App standard fields:

### Activity Entry Fields
1. **Activity Type** - Dropdown selection (Academic, Arts, Athletics, Career, Community Service, etc.)
2. **Position/Leadership** - Text (e.g., "Founder", "President", "Co-founder")
3. **Organization Name** - Text
4. **Description** - 150 characters max
5. **Participation Grade Levels** - Checkboxes (9, 10, 11, 12, PG)
6. **Timing** - During school year, during break, all year
7. **Hours per Week** - Number
8. **Weeks per Year** - Number
9. **Intend to Participate in College** - Yes/No

### Additional Details (in description)
- Scope/Scale metrics (participants, reach, impact)
- Outcomes/Results (funding raised, users reached, publications)
- Recognition (awards, press, partnerships)

---

## First-Principle Metric Categories

### Universal Metrics (All Activities)
```json
{
  "hours_per_week": number,
  "weeks_per_year": number,
  "grade_levels": string[],  // ["9", "10", "11", "12"]
  "timing": string,           // "school_year" | "break" | "all_year"
  "position": string,         // "Founder" | "President" | "Co-founder"
  "intend_college": boolean
}
```

### Scale/Reach Metrics (Depth & Breadth)
```json
{
  "participants_reached": number,      // Direct participants/beneficiaries
  "locations_reached": number,         // Cities/schools/countries
  "audience_size": number,             // Total audience (viewers, readers, users)
  "organizational_size": number        // Team/club/chapter members
}
```

### Impact Metrics (Outcomes)
```json
{
  "funding_raised": number,            // USD
  "publications": number,              // Articles, papers, pieces
  "events_organized": number,          // Workshops, sessions, competitions
  "resources_created": number,         // Lesson plans, kits, tools
  "partnerships": number               // Organizations partnered with
}
```

### Recognition/Prestige Metrics
```json
{
  "press_mentions": number,            // Media coverage count
  "awards_received": string[],         // Related awards
  "speaking_engagements": number,      // Conferences, panels
  "growth_rate": number                // Percentage growth
}
```

---

## Current Schema Issues

### Problem 1: Inconsistent Naming
```json
// CURRENT - Inconsistent
{
  "users_reached": 6400,           // Should be participants_reached or audience_size
  "classes_distributed": 200,      // Should be resources_created
  "membership": 132,               // Should be organizational_size
  "cities_reached": 44,            // Should be locations_reached
  "writers_recruited": 5,          // Should be organizational_size
  "articles_published": 3,         // Should be publications
  "members": 25,                   // Should be organizational_size
  "membership_growth": 413         // Should be growth_rate
}
```

### Problem 2: Missing Universal Metrics
- No `weeks_per_year` field
- No `grade_levels` tracking
- No `timing` specification
- No `position` standardization
- No `intend_college` flag

### Problem 3: Missing Context Fields
- No `description` (150 char summary for app)
- No `activity_type` (Academic, Community Service, etc.)
- No `recognition` (press, partnerships, speaking)

---

## Proposed Standardized Schema

### EC Detail Schema (v2.0)
```typescript
interface ECDetail {
  // Identity
  name: string;
  activity_type: 'academic' | 'arts_music' | 'athletics' | 'career' | 'community_service' | 'computer_science' | 'cultural' | 'journalism_publication' | 'junior_rotc' | 'lgbtq' | 'other_club' | 'research' | 'robotics' | 'science_math' | 'student_government' | 'work';
  position: string;  // "Founder", "President", "Co-founder", "Member"
  description: string;  // 150 chars for Common App

  // Timeline
  founded_week?: number;
  launched_week?: number;
  grade_levels: ('9' | '10' | '11' | '12' | 'PG')[];
  timing: 'school_year' | 'break' | 'all_year';

  // Commitment
  hours_per_week: number;
  weeks_per_year: number;
  intend_college: boolean;

  // Status
  status: 'planning' | 'development' | 'launched' | 'scaling' | 'in_app' | 'continued_college';

  // Scale & Reach (choose relevant metrics)
  scale: {
    participants_reached?: number;      // Direct participants/beneficiaries
    locations_reached?: number;         // Cities/schools/countries
    audience_size?: number;             // Total audience (users, viewers, readers)
    organizational_size?: number;       // Team/club/chapter size
  };

  // Impact & Outcomes
  impact: {
    funding_raised?: number;            // USD
    publications?: number;              // Articles, papers, pieces published
    events_organized?: number;          // Workshops, sessions, competitions
    resources_created?: number;         // Lesson plans, kits, curriculum
    partnerships?: number;              // Organizations partnered with
  };

  // Recognition & Prestige
  recognition?: {
    press_mentions?: number;            // Media coverage
    awards?: string[];                  // Related awards (not main Awards section)
    speaking_engagements?: number;      // Conferences, panels
    growth_rate?: number;               // Percentage growth (e.g., 413%)
  };
}
```

### Award Detail Schema (v2.0)
```typescript
interface AwardDetail {
  // Identity
  name: string;
  level: 'school' | 'regional' | 'state' | 'national' | 'international';
  category: 'academic' | 'community_service' | 'leadership' | 'arts' | 'athletics' | 'stem' | 'writing' | 'other';

  // Timeline
  applied_week?: number;
  submitted_week?: number;
  won_week?: number;
  grade_level: '9' | '10' | '11' | '12' | 'PG';

  // Status
  status: 'researching' | 'applying' | 'submitted' | 'finalist' | 'winner' | 'declined';

  // Details
  description?: string;  // Brief description
  selection_rate?: number;  // Acceptance rate if known
  prize_amount?: number;  // USD if monetary
  recognition_details?: string;  // e.g., "1 of 20 nationally"
}
```

### Program Detail Schema (v2.0)
```typescript
interface ProgramDetail {
  // Identity
  name: string;
  program_type: 'summer' | 'year_round' | 'weekend' | 'online';
  category: 'academic' | 'research' | 'leadership' | 'arts' | 'stem' | 'pre_college' | 'internship';

  // Timeline
  attended_week?: number;
  start_date: string;
  end_date: string;
  grade_level: '9' | '10' | '11' | '12' | 'PG';

  // Details
  institution?: string;  // Host institution
  location?: string;
  hours_total?: number;
  selection_rate?: number;  // Acceptance rate if known
  cost?: number;  // USD
  scholarship_amount?: number;  // USD if received

  // Outcomes
  outcomes?: {
    projects_completed?: number;
    papers_published?: number;
    presentations?: number;
    skills_learned?: string[];
  };
}
```

---

## Migration Plan

### Phase 1: Update Database Schema
1. Add new columns to `weekly_vitals` table (or use existing JSONB flexibility)
2. Maintain backwards compatibility with existing `ec_details`, `award_details`, `program_details`

### Phase 2: Update Enrichment Script
1. Map old metric names to new standardized names
2. Add missing universal metrics (weeks_per_year, grade_levels, etc.)
3. Add activity_type and category classifications
4. Add Common App descriptions

### Phase 3: Update TypeScript Interfaces
1. Update `ECDetail`, `AwardDetail`, `ProgramDetail` interfaces
2. Add backwards compatibility for old metric names
3. Update formatMetric() function to handle new schema

### Phase 4: Update UI Rendering
1. Update display logic to show new organized metric categories
2. Add sections: Scale/Reach, Impact, Recognition
3. Show Common App preview (150 char description)

---

## Example: Empowering AI (Standardized Schema)

```json
{
  "name": "Empowering AI",
  "activity_type": "community_service",
  "position": "Founder & National Officer Board Leader",
  "description": "Founded nonprofit teaching AI ethics to underserved communities. Raised $23K, reached 44 cities via EmpowHER Hacks hackathon series.",

  "founded_week": 5,
  "launched_week": 25,
  "grade_levels": ["10", "11", "12"],
  "timing": "all_year",

  "hours_per_week": 8,
  "weeks_per_year": 50,
  "intend_college": true,

  "status": "in_app",

  "scale": {
    "participants_reached": 44,
    "locations_reached": 44,
    "organizational_size": 15
  },

  "impact": {
    "funding_raised": 23000,
    "events_organized": 44,
    "partnerships": 3
  },

  "recognition": {
    "press_mentions": 2,
    "awards": ["Featured by Tech for Social Good"],
    "speaking_engagements": 3
  }
}
```

---

## Example: NCWiT Award (Standardized Schema)

```json
{
  "name": "NCWiT National Awardee and Regional Winner",
  "level": "national",
  "category": "stem",

  "applied_week": 10,
  "submitted_week": 14,
  "won_week": 22,
  "grade_level": "11",

  "status": "winner",

  "description": "National computing award recognizing technical achievement and community impact in computer science.",
  "selection_rate": 0.03,
  "prize_amount": 0,
  "recognition_details": "1 of ~40 National Awardees from 3,500+ applicants"
}
```

---

**Status:** Schema defined, ready for implementation
**Next Steps:**
1. Update enrichment script with new schema
2. Migrate existing data
3. Update UI to display organized categories
4. Test with multiple students
