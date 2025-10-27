/**
 * Enrich Weekly Vitals v2.0 - Standardized College Application Schema
 *
 * Purpose: Enrich weekly vitals with standardized metrics aligned with Common App format
 * Schema: First-principle metrics organized by Scale, Impact, and Recognition
 * Version: v10.7
 * Date: 2025-10-27
 */

import { pool } from '../db/pool.js';

const STUDENT_ID = 'huda-2025';

// ============================================================================
// STANDARDIZED SCHEMAS (Common App Aligned)
// ============================================================================

interface ECDetailV2 {
  // Identity
  name: string;
  activity_type: 'academic' | 'community_service' | 'computer_science' | 'journalism_publication' | 'other_club';
  position: string;
  description: string;  // 150 chars for Common App

  // Timeline
  founded_week?: number;
  launched_week?: number;
  grade_levels: ('10' | '11' | '12')[];
  timing: 'school_year' | 'break' | 'all_year';

  // Commitment
  hours_per_week: number;
  weeks_per_year: number;
  intend_college: boolean;

  // Status
  status: 'planning' | 'development' | 'launched' | 'scaling' | 'in_app';

  // Scale & Reach
  scale: {
    participants_reached?: number;
    locations_reached?: number;
    audience_size?: number;
    organizational_size?: number;
  };

  // Impact & Outcomes
  impact: {
    funding_raised?: number;
    publications?: number;
    events_organized?: number;
    resources_created?: number;
    partnerships?: number;
  };

  // Recognition & Prestige
  recognition?: {
    press_mentions?: number;
    awards?: string[];
    speaking_engagements?: number;
    growth_rate?: number;
  };
}

interface AwardDetailV2 {
  name: string;
  level: 'school' | 'regional' | 'state' | 'national' | 'international';
  category: 'stem' | 'writing' | 'community_service' | 'academic';
  applied_week?: number;
  submitted_week?: number;
  won_week?: number;
  grade_level: '10' | '11' | '12';
  status: 'researching' | 'applying' | 'submitted' | 'finalist' | 'winner';
  description?: string;
  selection_rate?: number;
  prize_amount?: number;
  recognition_details?: string;
}

interface ProgramDetailV2 {
  name: string;
  program_type: 'summer' | 'year_round' | 'online';
  category: 'research' | 'leadership' | 'stem' | 'pre_college';
  attended_week?: number;
  start_date: string;
  end_date: string;
  grade_level: '10' | '11' | '12';
  institution?: string;
  location?: string;
  hours_total?: number;
  outcomes?: {
    projects_completed?: number;
    presentations?: number;
    skills_learned?: string[];
  };
}

// ============================================================================
// HUDA'S EC DATA (Standardized)
// ============================================================================

function getEmpoweringAI(weekNum: number): ECDetailV2 {
  const baseMetrics = {
    participants_reached: weekNum >= 55 ? 44 : weekNum >= 30 ? 25 : 0,
    locations_reached: weekNum >= 55 ? 44 : weekNum >= 30 ? 25 : 0,
    organizational_size: weekNum >= 40 ? 15 : weekNum >= 20 ? 8 : weekNum >= 10 ? 3 : 1
  };

  const impactMetrics = {
    funding_raised: weekNum >= 55 ? 23000 : weekNum >= 30 ? 13000 : weekNum >= 10 ? 5000 : 0,
    events_organized: weekNum >= 55 ? 44 : weekNum >= 30 ? 25 : weekNum >= 10 ? 5 : 0,
    partnerships: weekNum >= 40 ? 3 : weekNum >= 20 ? 1 : 0
  };

  const recognitionMetrics = weekNum >= 50 ? {
    press_mentions: 2,
    awards: ['Featured by Tech for Social Good'],
    speaking_engagements: 3
  } : undefined;

  return {
    name: 'Empowering AI',
    activity_type: 'community_service',
    position: 'Founder & National Officer Board Leader',
    description: 'Founded nonprofit teaching AI ethics to underserved communities. Raised $23K, reached 44 cities via EmpowHER Hacks hackathon series.',

    founded_week: 5,
    launched_week: 25,
    grade_levels: weekNum >= 20 ? ['10', '11', '12'] : weekNum >= 10 ? ['10', '11'] : ['10'],
    timing: 'all_year',

    hours_per_week: 8,
    weeks_per_year: 50,
    intend_college: true,

    status: weekNum >= 60 ? 'in_app' : weekNum >= 25 ? 'scaling' : weekNum >= 10 ? 'launched' : 'development',

    scale: baseMetrics,
    impact: impactMetrics,
    recognition: recognitionMetrics
  };
}

function getSynthoria(weekNum: number): ECDetailV2 {
  const baseMetrics = {
    audience_size: weekNum >= 50 ? 6400 : weekNum >= 30 ? 2000 : weekNum >= 10 ? 150 : 0,
    organizational_size: 1  // Solo developer
  };

  const impactMetrics = {
    resources_created: weekNum >= 50 ? 200 : weekNum >= 30 ? 100 : weekNum >= 10 ? 20 : 0,
    events_organized: weekNum >= 40 ? 15 : weekNum >= 20 ? 5 : 0
  };

  const recognitionMetrics = weekNum >= 40 ? {
    press_mentions: 1,
    growth_rate: weekNum >= 50 ? 4266 : weekNum >= 30 ? 1333 : 0  // % growth from launch
  } : undefined;

  return {
    name: 'Synthoria',
    activity_type: 'computer_science',
    position: 'Founder & Solo Developer',
    description: 'Created educational game teaching data science & AI ethics. Distributed lesson kit to 200 classes reaching 6,400 students.',

    founded_week: 1,
    launched_week: 8,
    grade_levels: weekNum >= 20 ? ['10', '11', '12'] : weekNum >= 10 ? ['10', '11'] : ['10'],
    timing: 'school_year',

    hours_per_week: 6,
    weeks_per_year: 48,
    intend_college: true,

    status: weekNum >= 60 ? 'in_app' : weekNum >= 40 ? 'scaling' : weekNum >= 8 ? 'launched' : 'development',

    scale: baseMetrics,
    impact: impactMetrics,
    recognition: recognitionMetrics
  };
}

function getFilmmakersClub(weekNum: number): ECDetailV2 {
  const baseMetrics = {
    organizational_size: weekNum >= 10 ? 132 : 30
  };

  const impactMetrics = {
    events_organized: weekNum >= 30 ? 25 : weekNum >= 10 ? 10 : 3,
    resources_created: weekNum >= 30 ? 40 : weekNum >= 10 ? 15 : 5
  };

  const recognitionMetrics = weekNum >= 10 ? {
    growth_rate: 413,  // 413% growth
    awards: ['Best Student Film Festival 2024']
  } : undefined;

  return {
    name: 'Filmmaker\'s Club',
    activity_type: 'other_club',
    position: 'President',
    description: 'Led club from 30 to 132 members (413% growth). Organized 25+ film screenings, workshops, and student film competitions.',

    founded_week: 1,
    grade_levels: weekNum >= 20 ? ['10', '11', '12'] : weekNum >= 10 ? ['10', '11'] : ['10'],
    timing: 'school_year',

    hours_per_week: 5,
    weeks_per_year: 48,
    intend_college: false,

    status: weekNum >= 50 ? 'in_app' : weekNum >= 10 ? 'scaling' : 'launched',

    scale: baseMetrics,
    impact: impactMetrics,
    recognition: recognitionMetrics
  };
}

function getFolklift(weekNum: number): ECDetailV2 {
  const baseMetrics = {
    organizational_size: weekNum >= 30 ? 5 : 2,
    audience_size: weekNum >= 40 ? 5000 : weekNum >= 30 ? 1000 : weekNum >= 25 ? 100 : 0
  };

  const impactMetrics = {
    publications: weekNum >= 30 ? 3 : weekNum >= 25 ? 1 : 0
  };

  return {
    name: 'Folklift Youth Journalism',
    activity_type: 'journalism_publication',
    position: 'Founder & Editor-in-Chief',
    description: 'Founded youth journalism platform amplifying underrepresented voices. Published 3 articles, recruited 5 writers, reached 5K readers.',

    founded_week: 20,
    launched_week: 25,
    grade_levels: weekNum >= 40 ? ['11', '12'] : ['11'],
    timing: 'all_year',

    hours_per_week: 4,
    weeks_per_year: 50,
    intend_college: true,

    status: weekNum >= 60 ? 'in_app' : weekNum >= 30 ? 'scaling' : weekNum >= 25 ? 'launched' : 'development',

    scale: baseMetrics,
    impact: impactMetrics
  };
}

function getWomenInAIClub(weekNum: number): ECDetailV2 {
  const baseMetrics = {
    organizational_size: weekNum >= 30 ? 25 : 15
  };

  const impactMetrics = {
    events_organized: weekNum >= 30 ? 12 : weekNum >= 15 ? 5 : 2
  };

  return {
    name: 'Women in AI Club',
    activity_type: 'computer_science',
    position: 'Co-founder',
    description: 'Co-founded school club promoting women in AI. Organized 12 workshops with industry speakers, grew to 25 active members.',

    founded_week: 10,
    grade_levels: weekNum >= 30 ? ['11', '12'] : ['11'],
    timing: 'school_year',

    hours_per_week: 3,
    weeks_per_year: 48,
    intend_college: false,

    status: weekNum >= 50 ? 'in_app' : weekNum >= 20 ? 'scaling' : 'launched',

    scale: baseMetrics,
    impact: impactMetrics
  };
}

// ============================================================================
// HUDA'S AWARD DATA (Standardized)
// ============================================================================

function getNCWiTAward(weekNum: number): AwardDetailV2 | null {
  if (weekNum < 10) return null;

  return {
    name: 'NCWiT National Awardee and Regional Winner',
    level: 'national',
    category: 'stem',
    applied_week: 10,
    submitted_week: 14,
    won_week: weekNum >= 22 ? 22 : undefined,
    grade_level: '11',
    status: weekNum >= 22 ? 'winner' : weekNum >= 14 ? 'submitted' : 'applying',
    description: 'National computing award recognizing technical achievement and community impact',
    selection_rate: 0.03,
    recognition_details: '1 of ~40 National Awardees from 3,500+ applicants'
  };
}

function getGamesForChangeAward(weekNum: number): AwardDetailV2 | null {
  if (weekNum < 15) return null;

  return {
    name: 'Games for Change Writing Impact Award',
    level: 'international',
    category: 'writing',
    applied_week: 15,
    submitted_week: 20,
    won_week: weekNum >= 30 ? 30 : undefined,
    grade_level: '11',
    status: weekNum >= 30 ? 'winner' : weekNum >= 20 ? 'submitted' : 'applying',
    description: 'International award for impactful writing on games and social change',
    recognition_details: '1 of 15 international winners'
  };
}

function getCSCTEAward(weekNum: number): AwardDetailV2 | null {
  if (weekNum < 35) return null;

  return {
    name: 'CS CTE Award',
    level: 'school',
    category: 'stem',
    applied_week: 35,
    submitted_week: 38,
    won_week: weekNum >= 40 ? 40 : undefined,
    grade_level: '11',
    status: weekNum >= 40 ? 'winner' : weekNum >= 38 ? 'submitted' : 'applying',
    description: 'School-level award for excellence in Computer Science Career Technical Education'
  };
}

function getAPScholarAward(weekNum: number): AwardDetailV2 | null {
  if (weekNum < 50) return null;

  return {
    name: 'AP Scholar with Distinction',
    level: 'national',
    category: 'academic',
    won_week: weekNum >= 55 ? 55 : undefined,
    grade_level: '11',
    status: weekNum >= 55 ? 'winner' : 'finalist',
    description: 'Awarded for scoring 3+ on 5+ AP exams with average score of 3.5+',
    recognition_details: 'Top 10% of AP test takers nationally'
  };
}

function getCollegeBoardRuralAward(weekNum: number): AwardDetailV2 | null {
  if (weekNum < 55) return null;

  return {
    name: 'College Board National Rural and Small Town Award',
    level: 'national',
    category: 'academic',
    applied_week: 55,
    submitted_week: 58,
    won_week: weekNum >= 60 ? 60 : undefined,
    grade_level: '12',
    status: weekNum >= 60 ? 'winner' : weekNum >= 58 ? 'submitted' : 'applying',
    description: 'National recognition for rural/small-town students with strong academic achievement',
    selection_rate: 0.05,
    recognition_details: 'Approximately 5% of eligible students selected'
  };
}

// ============================================================================
// MAIN ENRICHMENT FUNCTION
// ============================================================================

async function enrichWeeklyVitals() {
  console.log('🔄 Enriching weekly vitals with v2.0 standardized schema...\\n');

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get all weeks
    const weeksResult = await client.query(`
      SELECT week_number, week_start_date, week_end_date
      FROM weekly_vitals
      WHERE student_id = $1
      ORDER BY week_number
    `, [STUDENT_ID]);

    console.log(`📊 Processing ${weeksResult.rows.length} weeks...\\n`);

    for (const week of weeksResult.rows) {
      const weekNum = week.week_number;

      // Gather ECs for this week
      const ecs: ECDetailV2[] = [];

      if (weekNum >= 5) ecs.push(getEmpoweringAI(weekNum));
      if (weekNum >= 1) ecs.push(getSynthoria(weekNum));
      if (weekNum >= 1) ecs.push(getFilmmakersClub(weekNum));
      if (weekNum >= 20) ecs.push(getFolklift(weekNum));
      if (weekNum >= 10) ecs.push(getWomenInAIClub(weekNum));

      // Gather awards for this week
      const awards: AwardDetailV2[] = [];

      const ncwit = getNCWiTAward(weekNum);
      if (ncwit) awards.push(ncwit);

      const gamesForChange = getGamesForChangeAward(weekNum);
      if (gamesForChange) awards.push(gamesForChange);

      const csCTE = getCSCTEAward(weekNum);
      if (csCTE) awards.push(csCTE);

      const apScholar = getAPScholarAward(weekNum);
      if (apScholar) awards.push(apScholar);

      const collegeBoardRural = getCollegeBoardRuralAward(weekNum);
      if (collegeBoardRural) awards.push(collegeBoardRural);

      // Update database
      await client.query(`
        UPDATE weekly_vitals
        SET
          ec_details = $1::jsonb,
          award_details = $2::jsonb,
          updated_at = NOW()
        WHERE student_id = $3 AND week_number = $4
      `, [JSON.stringify(ecs), JSON.stringify(awards), STUDENT_ID, weekNum]);

      // Progress indicator
      if (weekNum % 10 === 0 || weekNum === 1 || weekNum === weeksResult.rows.length) {
        console.log(`✅ Week ${weekNum}: ${ecs.length} ECs, ${awards.length} awards`);
      }
    }

    await client.query('COMMIT');

    console.log(`\\n✅ Successfully enriched ${weeksResult.rows.length} weeks with v2.0 schema!`);

    // Sample output
    const sampleResult = await client.query(`
      SELECT week_number, jsonb_array_length(ec_details) as ec_count, jsonb_array_length(award_details) as award_count
      FROM weekly_vitals
      WHERE student_id = $1 AND week_number IN (1, 20, 60, 89)
      ORDER BY week_number
    `, [STUDENT_ID]);

    console.log('\\n📊 Sample weeks:');
    sampleResult.rows.forEach(row => {
      console.log(`  Week ${row.week_number}: ${row.ec_count} ECs, ${row.award_count} awards`);
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error enriching weekly vitals:', error);
    throw error;
  } finally {
    client.release();
  }
}

// ============================================================================
// EXECUTE
// ============================================================================

enrichWeeklyVitals()
  .then(() => {
    console.log('\\n✅ Enrichment complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\\n❌ Enrichment failed:', error);
    process.exit(1);
  });
