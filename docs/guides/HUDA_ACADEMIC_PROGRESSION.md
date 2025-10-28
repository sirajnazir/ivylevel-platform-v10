# Huda's Complete Academic Progression (2023-2025)

**Student ID:** huda-2025
**Program Duration:** 08/02/2023 - January 2025
**Data Source:** Weekly execution notes + Final college application

---

## Overview

This document captures the complete 2-year academic journey from the weekly coaching sessions and final college application submission.

---

## SAT Score Progression

| Date | Test Type | Score | Source |
|------|-----------|-------|--------|
| Jan 2024 | Practice | 1360 | Week 1 notes |
| Early 2024 | Practice | 1470 | Execution notes |
| Mar 2024 | Official | 1480 | sat_timeline_enum |
| Apr 2024 | **Official (Final)** | **1530** | sat_timeline_enum |
| Spring 2024 | Practice | 1490, 1500 | Execution notes |

**Final SAT Score:** 1530 (April 2024)

---

## GPA Progression

| Period | GPA Unweighted | GPA Weighted | Source |
|--------|----------------|--------------|--------|
| Cumulative (Final) | 3.97 | 4.52 | v_gpa_latest |

---

## Academic Courses by Year

### Junior Year (2023-2024)

**From Execution Notes:**
- Week 1 (08/02/2023): Planning "4 APs" for Junior year
- APUSH (AP US History) mentioned multiple times
- Session notes reference AP coursework throughout Junior year

**Inferred Junior Year Course Load:**
- AP US History (APUSH) - confirmed in multiple sessions
- 3 additional AP courses (total 4 APs as planned)
- Regular/Honors courses to complete schedule

**Note:** Specific Junior year course names not fully captured in v14 database. Only Senior year courses stored.

### Senior Year (2024-2025) - **FROM FINAL COLLEGE APPLICATION**

| Course Title | Level | Credits | Final Grade | Subject Area |
|-------------|-------|---------|-------------|--------------|
| **AP Literature and Composition** | AP | 5 | A | English |
| **AP Statistics** | AP | 5 | A | Mathematics |
| **AP Spanish Language and Culture** | AP | 5 | A | World Language |
| **AP US Government and Politics** | AP | 5 | A | Social Studies |
| **AP Psychology** | AP | 5 | A | Social Studies |
| **Adulting** | Regular | 5 | A | Life Skills |
| **Applied Computer Science practices** | Regular | 5 | A | Computer Science |

**Senior Year Summary:**
- **5 AP Courses** (AP Lit, AP Stats, AP Spanish Lang, AP Gov, AP Psych)
- **2 Regular Courses** (Adulting, Applied CS practices)
- **All A's** in final grades reported to colleges

---

## AP Courses Planning Timeline

### Session 26 P1 (01/06/2024) - Senior Year Planning

Original course planning (NOT final application):
- AP Stats
- English 12 Honors
- AP CSP/Game Design
- AP Gov/Econ
- AP Environmental Science OR TA
- AP Psych OR TA
- Adulting

### Final Application (October 2024)

**Actual courses submitted in college applications:**
- AP Literature and Composition ✅ (changed from English 12 Honors)
- AP Statistics ✅
- AP Spanish Language and Culture ✅ (added)
- AP US Government and Politics ✅
- AP Psychology ✅
- Adulting ✅
- Applied Computer Science practices ✅ (added)

---

## Database Corrections Made (2025-10-20)

### BEFORE (Incorrect Data in v14)
Database contained WRONG senior year courses:
- AP Calculus BC ❌
- AP Computer Science A ❌
- AP English Language ❌
- AP Physics 1 ❌
- AP US History ❌
- Spanish 3 Honors ❌

**Issue:** These courses were NEVER in the final college application.

### AFTER (Corrected Data)
Database now contains CORRECT senior year courses from final application:
- AP Literature and Composition ✅
- AP Statistics ✅
- AP Spanish Language and Culture ✅
- AP US Government and Politics ✅
- AP Psychology ✅
- Adulting ✅
- Applied Computer Science practices ✅

**SQL Migration:** `/scripts/fix_huda_senior_courses.sql` (executed 2025-10-20)

---

## NSM Academic Metrics

### Current NSM Dashboard Output

**Academic Vitals:**
- SAT: 1530 (latest official score)
- GPA: 3.97 UW / 4.52 W (cumulative)
- AP: 5 courses taken (Senior year)

**Data Sources:**
- `v_sat_enum_latest` - SAT scores
- `v_gpa_latest` - GPA data
- `academic_courses` (level = 'AP') - AP course count

---

## Data Quality Notes

### What's Stored in v14

✅ **Complete SAT Progression:**
- `sat_timeline_enum` table has all 3 official scores (1360, 1480, 1530)
- `v_sat_enum_latest`, `v_sat_enum_first`, `v_sat_enum_progression` views work correctly

✅ **Complete GPA Data:**
- `v_gpa_latest` shows 3.97 UW / 4.52 W
- Cumulative scope correctly captured

✅ **Correct Senior Year Courses:**
- `academic_courses` table updated with 7 correct courses from final application
- `academic_grades` table has all final grades (all A's)

⚠️ **Missing Junior Year Courses:**
- Database only has senior year term data
- Junior year courses mentioned in execution notes not fully captured in v14
- `academics_events` table has timeline simulation but not actual course roster

### Historical Data Gaps

**Junior Year (2023-2024):**
- Execution notes mention "4 APs" for Junior year
- APUSH confirmed in multiple sessions
- Specific course names for other 3 APs not extracted from notes
- Course roster not stored in `academic_courses` table

**Recommendation:** If needed, parse execution notes more deeply to extract Junior year course names and add to v14 database with term_id = 'huda-2025-2023-JUNIOR'.

---

## References

### Execution Notes Timeline

**Week 1 (08/02/2023):** "4 APs" planned for Junior year, APUSH mentioned
**Session 26 P1 (01/06/2024):** Senior year course planning
**Spring 2024:** SAT progression, college application prep
**Week 10 (August 30, 2024):** Common App essay work
**Week 28 (October 16, 2024):** Final senior year courses confirmed in college app

### Database Tables

- `sat_timeline_enum` - SAT score history
- `academic_courses` - Course roster
- `academic_grades` - Final grades
- `academic_gpa` - GPA calculations
- `academics_events` - Academic timeline events

### V14 Views Used by NSM

- `v_sat_enum_latest` - Latest SAT score (1530)
- `v_sat_enum_first` - First SAT score (1360)
- `v_sat_enum_progression` - All SAT scores over time
- `v_gpa_latest` - Current GPA (3.97 UW / 4.52 W)
- `v_transcript_final` - Complete transcript

---

**Status:** ✅ Senior Year Data Complete & Accurate
**Last Updated:** 2025-10-20
**Version:** v2.0.1
**Next Step:** Consider adding Junior year courses if needed for complete historical view
