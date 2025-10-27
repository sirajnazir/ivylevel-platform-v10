/**
 * v3.0 Weekly Vitals Enrichment - Complete Common App Alignment
 *
 * Enriches all 89 weeks with:
 * - Complete academic data (GPA, SAT breakdown, AP scores, courses)
 * - All 10 activities from Huda's Common App
 * - Enhanced program details with selectivity
 * - Progressive week-by-week evolution
 *
 * Reference: Huda's UNC Chapel Hill EA Application (Fall 2025)
 */

import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'ivylevel',
  user: 'postgres',
  password: 'postgres',
});

// ============================================================================
// INTERFACES (matching v3.0 schema)
// ============================================================================

interface AcademicVitals {
  gpa_weighted?: number;
  gpa_unweighted?: number | null;
  gpa_scale: number;
  gpa_trend?: 'improving' | 'stable' | 'declining';

  class_rank?: number | 'na';
  class_size?: number;
  percentile?: number | null;

  sat?: {
    total: number;
    ebrw: number;
    math: number;
    attempts: {
      date: string;
      total: number;
      ebrw: number;
      math: number;
    }[];
  };

  ap_exams?: {
    subject: string;
    score: number;
    test_date: string;
    grade_level: '9' | '10' | '11' | '12';
  }[];

  current_courses?: {
    year: '9' | '10' | '11' | '12' | 'PG';
    semester: 'fall' | 'spring';
    courses: {
      subject: string;
      title: string;
      level: 'REG' | 'HONORS' | 'AP' | 'IB' | 'DE';
    }[];
  }[];

  total_ap_courses?: number;
  academic_rigor_score?: number;
}

interface ECDetail {
  name: string;
  activity_type: string;
  position?: string;
  description: string;

  founded_week?: number;
  launched_week?: number;
  started_week?: number;
  attended_week?: number;
  grade_levels: string[];
  timing: 'school_year' | 'break' | 'all_year';

  hours_per_week: number;
  weeks_per_year: number;
  intend_college: boolean;

  status: 'planning' | 'development' | 'launched' | 'scaling' | 'in_app';

  scale?: {
    participants_reached?: number;
    locations_reached?: number;
    audience_size?: number;
    organizational_size?: number;
  };

  impact?: {
    funding_raised?: number;
    publications?: number;
    events_organized?: number;
    resources_created?: number;
    partnerships?: number;
    projects_completed?: number;
  };

  recognition?: {
    press_mentions?: number;
    awards?: string[];
    speaking_engagements?: number;
    growth_rate?: number;
    selection_rate?: number;
  };
}

interface ProgramDetail {
  name: string;
  program_type: 'summer' | 'year_round' | 'competition';
  category: string;

  selection_rate?: number;
  attended_week?: number;
  start_date?: string;
  end_date?: string;
  grade_level: '9' | '10' | '11' | '12';

  institution?: string;
  location?: string;
  is_paid: boolean;
  scholarship_amount?: number;
  hours_total?: number;

  outcomes?: {
    projects_completed?: number;
    publications?: number;
    presentations?: number;
    skills_learned?: string[];
    recommendation_received?: boolean;
  };

  related_activity_name?: string;
}

// ============================================================================
// ACADEMIC VITALS GENERATOR
// ============================================================================

function getAcademicVitals(weekNum: number): AcademicVitals {
  const vitals: AcademicVitals = {
    gpa_weighted: 3.93,
    gpa_unweighted: null,
    gpa_scale: 4.0,
    gpa_trend: 'stable',

    class_rank: 'na',
    class_size: 582,
    percentile: null,
  };

  // SAT progression
  if (weekNum >= 25) { // First SAT attempt (Dec 2023 - Junior year)
    vitals.sat = {
      total: weekNum >= 50 ? 1530 : 1510, // Improved on second attempt
      ebrw: weekNum >= 50 ? 750 : 730,
      math: 780, // Consistent
      attempts: []
    };

    // First attempt
    vitals.sat.attempts.push({
      date: '12/01/2023',
      total: 1510,
      ebrw: 730,
      math: 780
    });

    // Second attempt (if after week 50)
    if (weekNum >= 50) {
      vitals.sat.attempts.push({
        date: '03/04/2024',
        total: 1530,
        ebrw: 750,
        math: 780
      });
    }
  }

  // AP Exams (taken at end of each year)
  vitals.ap_exams = [];

  if (weekNum >= 35) { // After 10th grade AP exam
    vitals.ap_exams.push({
      subject: 'Human Geography',
      score: 5,
      test_date: '05/2023',
      grade_level: '10'
    });
  }

  if (weekNum >= 70) { // After 11th grade AP exams
    vitals.ap_exams.push(
      {
        subject: 'United States History',
        score: 4,
        test_date: '05/2024',
        grade_level: '11'
      },
      {
        subject: 'Calculus AB',
        score: 4,
        test_date: '05/2024',
        grade_level: '11'
      },
      {
        subject: 'English Language & Composition',
        score: 4,
        test_date: '05/2024',
        grade_level: '11'
      }
    );
  }

  // Current courses (Senior year)
  if (weekNum >= 70) {
    vitals.current_courses = [
      {
        year: '12',
        semester: 'fall',
        courses: [
          { subject: 'OTH/ELE', title: 'Adulting', level: 'REG' },
          { subject: 'COMPSCI', title: 'Applied Computer Science Practices', level: 'REG' },
          { subject: 'ENG', title: 'AP Literature and Composition', level: 'AP' },
          { subject: 'MATH', title: 'AP Statistics', level: 'AP' },
          { subject: 'LANG', title: 'AP Spanish Language and Culture', level: 'AP' },
          { subject: 'HIST', title: 'AP US Government and Politics', level: 'AP' },
          { subject: 'HIST', title: 'AP Psychology', level: 'AP' }
        ]
      },
      {
        year: '12',
        semester: 'spring',
        courses: [
          { subject: 'OTH/ELE', title: 'Adulting', level: 'REG' },
          { subject: 'COMPSCI', title: 'Applied Computer Science Practices', level: 'REG' },
          { subject: 'ENG', title: 'AP Literature and Composition', level: 'AP' },
          { subject: 'MATH', title: 'AP Statistics', level: 'AP' },
          { subject: 'LANG', title: 'AP Spanish Language and Culture', level: 'AP' },
          { subject: 'HIST', title: 'AP Psychology', level: 'AP' }
        ]
      }
    ];

    vitals.total_ap_courses = 11; // 4 taken + 7 current (some overlap)
    vitals.academic_rigor_score = 11;
  }

  return vitals;
}

// ============================================================================
// ACTIVITY GENERATORS (All 10)
// ============================================================================

function getEmpoweringAI(weekNum: number): ECDetail {
  const founded = 5;
  const launched = 25;

  if (weekNum < founded) return null as any;

  const activity: ECDetail = {
    name: 'Empowering AI',
    activity_type: 'community_service',
    position: 'Founder & National Officer Board Leader',
    description: 'Founded nonprofit teaching AI ethics to underserved communities. Raised $23K, reached 44 cities via EmpowHER Hacks hackathon series.',

    founded_week: founded,
    launched_week: launched,
    grade_levels: weekNum >= 70 ? ['10', '11', '12'] : weekNum >= 35 ? ['10', '11'] : ['10'],
    timing: 'all_year',

    hours_per_week: 8,
    weeks_per_year: 50,
    intend_college: true,

    status: weekNum >= 60 ? 'in_app' : weekNum >= launched ? 'scaling' : weekNum >= 10 ? 'development' : 'planning',
  };

  // Progressive metrics
  if (weekNum >= launched) {
    activity.scale = {
      participants_reached: weekNum >= 70 ? 44 : weekNum >= 50 ? 30 : weekNum >= 35 ? 15 : 5,
      locations_reached: weekNum >= 70 ? 44 : weekNum >= 50 ? 30 : weekNum >= 35 ? 15 : 5,
      organizational_size: weekNum >= 60 ? 15 : weekNum >= 40 ? 10 : weekNum >= 25 ? 5 : 3
    };

    activity.impact = {
      funding_raised: weekNum >= 70 ? 23000 : weekNum >= 50 ? 18000 : weekNum >= 35 ? 10000 : 5000,
      events_organized: weekNum >= 70 ? 44 : weekNum >= 50 ? 30 : weekNum >= 35 ? 15 : 5,
      partnerships: weekNum >= 50 ? 3 : weekNum >= 35 ? 2 : 1
    };

    if (weekNum >= 50) {
      activity.recognition = {
        press_mentions: 2,
        awards: ['Featured by Tech for Social Good'],
        speaking_engagements: weekNum >= 70 ? 3 : 2
      };
    }
  }

  return activity;
}

function getSynthoria(weekNum: number): ECDetail {
  const founded = 1;
  const launched = 8;

  return {
    name: 'Synthoria',
    activity_type: 'computer_science',
    position: 'Founder & Solo Developer',
    description: 'Created educational game teaching data science & AI ethics. Distributed lesson kit to 200 classes reaching 6,400 students.',

    founded_week: founded,
    launched_week: launched,
    grade_levels: weekNum >= 70 ? ['9', '10', '11', '12'] : weekNum >= 35 ? ['9', '10', '11'] : ['9', '10'],
    timing: 'school_year',

    hours_per_week: 6,
    weeks_per_year: 48,
    intend_college: true,

    status: weekNum >= 60 ? 'in_app' : weekNum >= launched ? 'scaling' : 'development',

    scale: {
      audience_size: weekNum >= 70 ? 6400 : weekNum >= 50 ? 3000 : weekNum >= 35 ? 800 : weekNum >= launched ? 150 : 0,
      organizational_size: 1
    },

    impact: {
      resources_created: weekNum >= 70 ? 200 : weekNum >= 50 ? 100 : weekNum >= 35 ? 40 : weekNum >= launched ? 10 : 0,
      events_organized: weekNum >= 60 ? 15 : weekNum >= 40 ? 10 : weekNum >= 25 ? 5 : 2
    },

    recognition: weekNum >= 50 ? {
      press_mentions: 1,
      growth_rate: weekNum >= 70 ? 4266 : 1900
    } : undefined
  };
}

function getFilmmakersClub(weekNum: number): ECDetail {
  return {
    name: "Filmmaker's Club",
    activity_type: 'other_club',
    position: 'President',
    description: 'Led club from 30 to 132 members (413% growth). Directed award-winning films "Bluff" & "Breaking Bad Grades". Anchored student news reaching 2.5K students.',

    started_week: 1,
    grade_levels: weekNum >= 70 ? ['9', '10', '11', '12'] : weekNum >= 35 ? ['9', '10', '11'] : ['9', '10'],
    timing: 'school_year',

    hours_per_week: 5,
    weeks_per_year: 36,
    intend_college: false,

    status: weekNum >= 60 ? 'in_app' : 'launched',

    scale: {
      organizational_size: weekNum >= 70 ? 132 : weekNum >= 50 ? 100 : weekNum >= 35 ? 60 : 30,
      audience_size: 2500
    },

    impact: {
      events_organized: weekNum >= 70 ? 25 : weekNum >= 50 ? 18 : weekNum >= 35 ? 12 : 6,
      resources_created: weekNum >= 70 ? 40 : weekNum >= 50 ? 28 : weekNum >= 35 ? 15 : 8
    },

    recognition: weekNum >= 60 ? {
      awards: ['Best Student Film Festival 2024'],
      growth_rate: 413
    } : undefined
  };
}

function getJCamp(weekNum: number): ECDetail | null {
  const attended = 60; // Summer before senior year

  if (weekNum < attended) return null;

  return {
    name: 'JCamp (AAJA)',
    activity_type: 'journalism_publication',
    position: 'Student Leader',
    description: 'Selected as 1 of 30 top student journalists in US. Reported under CNN, Washington Post, Bloomberg, ABC7 professionals on Austin politics.',

    attended_week: attended,
    grade_levels: ['12'],
    timing: 'break',

    hours_per_week: 100,
    weeks_per_year: 1,
    intend_college: true,

    status: 'in_app',

    scale: {
      participants_reached: 30,
      organizational_size: 30
    },

    impact: {
      publications: 2,
      partnerships: 4
    },

    recognition: {
      selection_rate: 0.01,
      awards: ['Selected as 1 of 30 Student Journalists Nationally']
    }
  };
}

function getSundaySchool(weekNum: number): ECDetail | null {
  const started = 10; // Sophomore year

  if (weekNum < started) return null;

  return {
    name: 'Sunday School Teacher',
    activity_type: 'community_service',
    position: 'Volunteer Teacher',
    description: 'Taught Islam to kindergarteners at local mosque. Created lesson plans using games and trivia to engage students. Volunteered 126+ hours.',

    started_week: started,
    grade_levels: weekNum >= 70 ? ['10', '11', '12'] : weekNum >= 35 ? ['10', '11'] : ['10'],
    timing: 'school_year',

    hours_per_week: 2,
    weeks_per_year: 42,
    intend_college: true,

    status: weekNum >= 60 ? 'in_app' : 'launched',

    scale: {
      participants_reached: 15,
      organizational_size: 1
    },

    impact: {
      resources_created: weekNum >= 70 ? 20 : weekNum >= 50 ? 15 : weekNum >= 35 ? 10 : 5,
      events_organized: weekNum >= 70 ? 84 : weekNum >= 50 ? 60 : weekNum >= 35 ? 42 : 21
    }
  };
}

function getFolklift(weekNum: number): ECDetail | null {
  const founded = 20;
  const launched = 25;

  if (weekNum < founded) return null;

  return {
    name: 'Folklift',
    activity_type: 'journalism_publication',
    position: 'Founder & Editor-in-Chief',
    description: 'Founded youth journalism platform amplifying underrepresented voices. Published 3 articles, recruited 5 writers, reached 5K readers.',

    founded_week: founded,
    launched_week: launched,
    grade_levels: weekNum >= 70 ? ['11', '12'] : ['11'],
    timing: 'all_year',

    hours_per_week: 4,
    weeks_per_year: 50,
    intend_college: true,

    status: weekNum >= 60 ? 'in_app' : weekNum >= launched ? 'launched' : 'development',

    scale: {
      audience_size: weekNum >= 70 ? 5000 : weekNum >= 50 ? 2500 : weekNum >= launched ? 500 : 0,
      organizational_size: weekNum >= 60 ? 5 : weekNum >= 40 ? 3 : 2
    },

    impact: {
      publications: weekNum >= 70 ? 3 : weekNum >= 50 ? 2 : weekNum >= launched ? 1 : 0
    },

    recognition: weekNum >= 60 ? {
      press_mentions: 1
    } : undefined
  };
}

function getKodeWithKlossy(weekNum: number): ECDetail | null {
  const attended = 55; // Summer between junior/senior year

  if (weekNum < attended) return null;

  return {
    name: 'Kode With Klossy Scholar',
    activity_type: 'computer_science',
    position: 'Scholar',
    description: 'Built data visualization on tech access vs GDP. Trained ML model to recognize acne types and suggest solutions.',

    attended_week: attended,
    grade_levels: weekNum >= 70 ? ['11', '12'] : ['11'],
    timing: 'break',

    hours_per_week: 15,
    weeks_per_year: 4,
    intend_college: true,

    status: 'in_app',

    scale: {
      organizational_size: 20
    },

    impact: {
      resources_created: 2,
      projects_completed: 2
    }
  };
}

function getWomenInGames(weekNum: number): ECDetail | null {
  const started = 50; // Junior year

  if (weekNum < started) return null;

  return {
    name: 'Women in Games Ambassador',
    activity_type: 'career',
    position: 'Ambassador (Youngest)',
    description: 'Youngest ambassador promoting game development for women in 46 cities. Hosted "Game Development for STEMinism" workshop.',

    started_week: started,
    grade_levels: weekNum >= 70 ? ['11', '12'] : ['11'],
    timing: 'all_year',

    hours_per_week: 2,
    weeks_per_year: 30,
    intend_college: true,

    status: weekNum >= 60 ? 'in_app' : 'launched',

    scale: {
      locations_reached: 46,
      participants_reached: weekNum >= 70 ? 150 : 80
    },

    impact: {
      events_organized: weekNum >= 70 ? 1 : 0
    },

    recognition: {
      awards: ['Youngest Ambassador for Women in Games']
    }
  };
}

function getMustangPodcast(weekNum: number): ECDetail | null {
  const founded = 10;
  const launched = 15;

  if (weekNum < founded) return null;

  return {
    name: 'Mustang Studios Podcast Club',
    activity_type: 'journalism_publication',
    position: 'Vice President',
    description: 'Produced 30+ podcast episodes on Spotify/TuneIn covering local issues. Gave students platform to discuss construction, local government.',

    founded_week: founded,
    launched_week: launched,
    grade_levels: weekNum >= 70 ? ['10', '11', '12'] : weekNum >= 35 ? ['10', '11'] : ['10'],
    timing: 'all_year',

    hours_per_week: 4,
    weeks_per_year: 50,
    intend_college: true,

    status: weekNum >= 60 ? 'in_app' : weekNum >= launched ? 'launched' : 'development',

    scale: {
      audience_size: 2500,
      organizational_size: 8
    },

    impact: {
      publications: weekNum >= 70 ? 30 : weekNum >= 50 ? 22 : weekNum >= 35 ? 12 : weekNum >= launched ? 5 : 0,
      events_organized: weekNum >= 70 ? 30 : weekNum >= 50 ? 22 : weekNum >= 35 ? 12 : weekNum >= launched ? 5 : 0
    }
  };
}

function getTechInfluencer(weekNum: number): ECDetail | null {
  const founded = 70; // Senior year

  if (weekNum < founded) return null;

  return {
    name: 'Tech Influencer & Freelancer',
    activity_type: 'computer_science',
    position: 'Independent Creator',
    description: 'Created tech TikToks (2M+ views, 364K likes). Built MHTJobz helping 300 locals find jobs post-pandemic. Competed in college hackathons.',

    founded_week: founded,
    launched_week: founded,
    grade_levels: ['12'],
    timing: 'school_year',

    hours_per_week: 3,
    weeks_per_year: 20,
    intend_college: true,

    status: 'in_app',

    scale: {
      audience_size: 2000000,
      participants_reached: 300
    },

    impact: {
      resources_created: 1,
      publications: weekNum >= 80 ? 50 : 30
    }
  };
}

// ============================================================================
// PROGRAM DETAILS
// ============================================================================

function getProgramDetails(weekNum: number): ProgramDetail[] {
  const programs: ProgramDetail[] = [];

  // JCamp
  if (weekNum >= 60) {
    programs.push({
      name: 'JCamp (AAJA)',
      program_type: 'summer',
      category: 'journalism',

      selection_rate: 0.01,
      attended_week: 60,
      start_date: '2024-07-01',
      end_date: '2024-07-06',
      grade_level: '12',

      institution: 'Asian American Journalists Association',
      location: 'Austin, TX',
      is_paid: false,
      scholarship_amount: 3000,
      hours_total: 100,

      outcomes: {
        projects_completed: 2,
        presentations: 1,
        skills_learned: ['investigative journalism', 'multimedia reporting', 'ethics'],
        recommendation_received: true
      },

      related_activity_name: 'JCamp (AAJA)'
    });
  }

  // Kode With Klossy
  if (weekNum >= 55) {
    programs.push({
      name: 'Kode With Klossy',
      program_type: 'summer',
      category: 'stem',

      selection_rate: 0.15,
      attended_week: 55,
      start_date: '2024-06-15',
      end_date: '2024-07-12',
      grade_level: '11',

      institution: 'Kode With Klossy',
      is_paid: false,
      hours_total: 60,

      outcomes: {
        projects_completed: 2,
        skills_learned: ['data visualization', 'machine learning', 'Python']
      },

      related_activity_name: 'Kode With Klossy Scholar'
    });
  }

  return programs;
}

// ============================================================================
// MAIN ENRICHMENT FUNCTION
// ============================================================================

async function enrichWeeklyVitals() {
  console.log('🚀 Starting v3.0 Weekly Vitals Enrichment...\n');

  const studentId = 'huda-2025';

  for (let week = 1; week <= 89; week++) {
    // Academic vitals
    const academicVitals = getAcademicVitals(week);

    // Collect all activities for this week
    const activities: ECDetail[] = [];

    const empoweringAI = getEmpoweringAI(week);
    if (empoweringAI) activities.push(empoweringAI);

    activities.push(getSynthoria(week));
    activities.push(getFilmmakersClub(week));

    const sundaySchool = getSundaySchool(week);
    if (sundaySchool) activities.push(sundaySchool);

    const folklift = getFolklift(week);
    if (folklift) activities.push(folklift);

    const jcamp = getJCamp(week);
    if (jcamp) activities.push(jcamp);

    const kwk = getKodeWithKlossy(week);
    if (kwk) activities.push(kwk);

    const wig = getWomenInGames(week);
    if (wig) activities.push(wig);

    const podcast = getMustangPodcast(week);
    if (podcast) activities.push(podcast);

    const techInfluencer = getTechInfluencer(week);
    if (techInfluencer) activities.push(techInfluencer);

    // Programs
    const programs = getProgramDetails(week);

    // Update database
    await pool.query(
      `UPDATE weekly_vitals
       SET academic_vitals = $1,
           ec_details = $2,
           program_details = $3,
           updated_at = NOW()
       WHERE student_id = $4 AND week_number = $5`,
      [
        JSON.stringify(academicVitals),
        JSON.stringify(activities),
        JSON.stringify(programs),
        studentId,
        week
      ]
    );

    // Log progress
    if (week % 10 === 0 || week === 1 || week === 89) {
      console.log(`✅ Week ${week}: ${activities.length} activities, ${programs.length} programs, ${academicVitals.ap_exams?.length || 0} AP exams`);
    }
  }

  console.log('\n🎉 Enrichment complete! Verifying...\n');

  // Verification queries
  const weeks = [1, 30, 60, 89];
  for (const week of weeks) {
    const result = await pool.query(
      `SELECT
        week_number,
        jsonb_array_length(ec_details) as ec_count,
        jsonb_array_length(program_details) as program_count,
        jsonb_array_length(academic_vitals->'ap_exams') as ap_count,
        academic_vitals->'sat'->>'total' as sat_total
      FROM weekly_vitals
      WHERE student_id = $1 AND week_number = $2`,
      [studentId, week]
    );

    const row = result.rows[0];
    console.log(`Week ${row.week_number}: ${row.ec_count} ECs, ${row.program_count} programs, ${row.ap_count || 0} APs, SAT: ${row.sat_total || 'N/A'}`);
  }

  console.log('\n✅ v3.0 Enrichment Complete - All 10 activities + complete academic data!');
}

// Run enrichment
enrichWeeklyVitals()
  .then(() => {
    pool.end();
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Error:', err);
    pool.end();
    process.exit(1);
  });
