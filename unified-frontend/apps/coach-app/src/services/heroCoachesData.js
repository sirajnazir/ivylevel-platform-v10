// Hero Coaches Data - Kelvin, Noor, Jamie
// Enhanced with real coaching scenarios, personalized insights, and dynamic content

export const HERO_COACHES = {
  kelvin: {
    id: 'kelvin-uid',
    name: 'Kelvin Chen',
    email: 'kelvin@ivylevel.com',
    bio: 'Former Stanford admissions reader with 8+ years of coaching experience. Specializes in STEM applicants and first-generation college students.',
    expertise: ['Engineering', 'Computer Science', 'Pre-Med', 'First-Gen Support'],
    yearsExperience: 8,
    studentsHelped: 450,
    acceptanceRate: 92,
    topSchools: ['Stanford', 'MIT', 'Harvard', 'Yale', 'Princeton'],
    coachingStyle: 'Strategic and data-driven with emphasis on authentic storytelling',
    profileImage: '/images/coaches/kelvin.jpg',
    specialty: {
      focusAreas: ['STEM Excellence', 'Research Narratives', 'Leadership Development'],
      methodologies: ['Design Thinking', 'Story Arc Development', 'Strategic Positioning']
    },
    testimonials: [
      {
        student: 'Alex Kumar',
        school: 'MIT',
        year: 2024,
        quote: "Kelvin helped me transform my robotics passion into a compelling narrative that connected my technical skills with social impact."
      },
      {
        student: 'Sarah Lin',
        school: 'Stanford',
        year: 2023,
        quote: "His strategic approach to positioning my research experience made all the difference in my applications."
      }
    ]
  },
  noor: {
    id: 'noor-uid',
    name: 'Noor Patel',
    email: 'noor@ivylevel.com',
    bio: 'Yale alum and published author with expertise in humanities and creative writing. Champions diversity and helps students find their unique voice.',
    expertise: ['Liberal Arts', 'Creative Writing', 'International Students', 'Diversity Advocacy'],
    yearsExperience: 6,
    studentsHelped: 380,
    acceptanceRate: 89,
    topSchools: ['Yale', 'Columbia', 'Brown', 'UChicago', 'Duke'],
    coachingStyle: 'Empathetic and creative with focus on authentic self-expression',
    profileImage: '/images/coaches/noor.jpg',
    specialty: {
      focusAreas: ['Essay Crafting', 'Cultural Identity', 'Creative Expression'],
      methodologies: ['Narrative Therapy', 'Voice Development', 'Cultural Bridging']
    },
    testimonials: [
      {
        student: 'Maria Rodriguez',
        school: 'Yale',
        year: 2024,
        quote: "Noor helped me embrace my multicultural identity and turn it into my greatest strength in my essays."
      },
      {
        student: 'David Park',
        school: 'Columbia',
        year: 2023,
        quote: "Her approach to finding my authentic voice transformed my writing from good to exceptional."
      }
    ]
  },
  jamie: {
    id: 'jamie-uid',
    name: 'Jamie Thompson',
    email: 'jamie@ivylevel.com',
    bio: 'Harvard MBA and former McKinsey consultant. Specializes in business-minded students and entrepreneurial narratives.',
    expertise: ['Business', 'Entrepreneurship', 'Economics', 'Leadership'],
    yearsExperience: 10,
    studentsHelped: 520,
    acceptanceRate: 94,
    topSchools: ['Harvard', 'Wharton', 'Princeton', 'Northwestern', 'Berkeley'],
    coachingStyle: 'Results-oriented with emphasis on leadership and impact',
    profileImage: '/images/coaches/jamie.jpg',
    specialty: {
      focusAreas: ['Business Leadership', 'Startup Narratives', 'Social Impact'],
      methodologies: ['Case Study Approach', 'ROI Storytelling', 'Leadership Framework']
    },
    testimonials: [
      {
        student: 'Michael Chen',
        school: 'Harvard',
        year: 2024,
        quote: "Jamie\'s business acumen helped me position my startup experience in a way that resonated with admissions committees."
      },
      {
        student: 'Emma Watson',
        school: 'Wharton',
        year: 2023,
        quote: "Her strategic approach to showcasing leadership made my application stand out among thousands."
      }
    ]
  }
};

// Sample sessions for each hero coach with rich, actionable content
export const HERO_SESSIONS = {
  kelvin: [
    {
      id: 'kelvin-session-1',
      uuid: 'Coaching_A_Kelvin_AlexKumar_Wk4_2024-03-15_M_12345U_abc123',
      title: 'Engineering Excellence: Crafting Your Research Narrative',
      student: 'Alex Kumar',
      date: '2024-03-15',
      week: 4,
      duration: 65,
      category: 'Coaching',
      hasVideo: true,
      hasTranscript: true,
      hasInsights: true,
      keyTopics: ['Research Positioning', 'Technical Leadership', 'MIT Strategy'],
      insights: {
        summary: "Focused on transforming Alex\'s robotics research into a compelling narrative that demonstrates both technical excellence and social impact. Developed a three-tier strategy for positioning the AI ethics component.",
        actionItems: [
          'Refine research abstract to emphasize societal implications',
          'Connect robotics work to accessibility initiatives',
          'Prepare 3 concrete examples of leadership in research team'
        ],
        coachingHighlights: [
          'Identified unique angle: AI ethics in assistive robotics',
          'Developed STAR method examples for technical leadership',
          'Created timeline for research paper submission'
        ],
        studentProgress: {
          strengths: ['Technical depth', 'Innovative thinking', 'Research methodology'],
          improvements: ['Storytelling clarity', 'Impact articulation', 'Time management'],
          nextSteps: ['Draft research summary for Common App', 'Schedule professor recommendation']
        }
      },
      gameChangingMoment: "When Alex realized his robotics work for elderly care wasn\'t just technical—it was deeply personal, inspired by his grandmother.",
      videoUrl: 'https://drive.google.com/file/d/1dgx7k3J_z0PO7cOVMqKuFOajl_x_Dulg/view'
    },
    {
      id: 'kelvin-session-2',
      uuid: 'Coaching_A_Kelvin_SarahLin_Wk8_2024-04-02_M_12346U_def456',
      title: 'Stanford Strategy: Intellectual Vitality in Action',
      student: 'Sarah Lin',
      date: '2024-04-02',
      week: 8,
      duration: 58,
      category: 'Coaching',
      hasVideo: true,
      hasTranscript: true,
      hasInsights: true,
      keyTopics: ['Stanford Positioning', 'Intellectual Vitality', 'Research Impact'],
      insights: {
        summary: "Developed Stanford-specific strategy focusing on intellectual vitality through Sarah\'s cancer research. Created framework for demonstrating curiosity beyond the lab.",
        actionItems: [
          'Write intellectual vitality essay draft focusing on "failed" experiments',
          'Connect research to Stanford professors\' work',
          'Develop list of interdisciplinary interests'
        ],
        coachingHighlights: [
          'Reframed "failures" as intellectual growth moments',
          'Identified 3 Stanford labs for potential collaboration',
          'Created narrative arc from curiosity to discovery'
        ],
        studentProgress: {
          strengths: ['Research sophistication', 'Intellectual curiosity', 'Perseverance'],
          improvements: ['Connecting ideas across disciplines', 'Casual tone in writing'],
          nextSteps: ['Research Stanford faculty', 'Draft "What matters" essay']
        }
      },
      gameChangingMoment: "Sarah\'s realization that her \'failed\' cancer drug experiment led to discovering a new research pathway—perfect for Stanford\'s innovation focus.",
      videoUrl: 'https://drive.google.com/file/d/1dgx7k3J_z0PO7cOVMqKuFOajl_x_Dulg/view'
    }
  ],
  noor: [
    {
      id: 'noor-session-1',
      uuid: 'Coaching_B_Noor_MariaRodriguez_Wk6_2024-03-22_M_12347U_ghi789',
      title: 'Finding Your Voice: Multicultural Identity as Strength',
      student: 'Maria Rodriguez',
      date: '2024-03-22',
      week: 6,
      duration: 62,
      category: 'Coaching',
      hasVideo: true,
      hasTranscript: true,
      hasInsights: true,
      keyTopics: ['Cultural Identity', 'Essay Voice', 'Yale Fit'],
      insights: {
        summary: "Transformative session helping Maria embrace her Mexican-American identity as a source of strength. Developed essay framework weaving family traditions with academic aspirations.",
        actionItems: [
          "Write vignette about abuela's kitchen as chemistry lab",
          'List 5 cultural bridges in daily life',
          'Draft Yale "Why Us" with diversity angle'
        ],
        coachingHighlights: [
          'Breakthrough: Kitchen chemistry metaphor',
          'Connected cultural code-switching to adaptability',
          'Identified Yale\'s cultural houses as community fit'
        ],
        studentProgress: {
          strengths: ['Authentic voice', 'Cultural awareness', 'Emotional intelligence'],
          improvements: ['Essay structure', 'Confidence in identity', 'Academic positioning'],
          nextSteps: ['Complete personal statement draft', 'Research Yale cultural organizations']
        }
      },
      gameChangingMoment: "Maria\'s tears when she realized her \'embarrassment\' about her mother\'s accent was actually pride in her mother\'s courage.",
      videoUrl: 'https://drive.google.com/file/d/1dgx7k3J_z0PO7cOVMqKuFOajl_x_Dulg/view'
    },
    {
      id: 'noor-session-2',
      uuid: 'Coaching_B_Noor_DavidPark_Wk10_2024-04-10_M_12348U_jkl012',
      title: 'Creative Writing Meets College Essays: Your Unique Style',
      student: 'David Park',
      date: '2024-04-10',
      week: 10,
      duration: 55,
      category: 'Coaching',
      hasVideo: true,
      hasTranscript: true,
      hasInsights: true,
      keyTopics: ['Creative Writing', 'Essay Style', 'Columbia Approach'],
      insights: {
        summary: "Helped David apply his fiction writing skills to college essays while maintaining authenticity. Developed unique approach using scene-setting and dialogue.",
        actionItems: [
          'Transform community service story into scene-based narrative',
          'Create dialogue-driven opening for main essay',
          'Write Columbia supplement using NYC imagery'
        ],
        coachingHighlights: [
          "Adapted 'show don't tell' for application context",
          'Developed signature style: lyrical but clear',
          'Connected writing passion to future goals'
        ],
        studentProgress: {
          strengths: ['Creative expression', 'Unique voice', 'Storytelling ability'],
          improvements: ['Balancing creativity with clarity', 'Essay length management'],
          nextSteps: ['Revise opening scene', 'Workshop essay with peers']
        }
      },
      gameChangingMoment: "David\'s realization that his \'weird\' writing style was actually his superpower—when used strategically.",
      videoUrl: 'https://drive.google.com/file/d/1dgx7k3J_z0PO7cOVMqKuFOajl_x_Dulg/view'
    }
  ],
  jamie: [
    {
      id: 'jamie-session-1',
      uuid: 'Coaching_C_Jamie_MichaelChen_Wk5_2024-03-28_M_12349U_mno345',
      title: 'Startup Story: From Failure to Harvard',
      student: 'Michael Chen',
      date: '2024-03-28',
      week: 5,
      duration: 60,
      category: 'Coaching',
      hasVideo: true,
      hasTranscript: true,
      hasInsights: true,
      keyTopics: ['Entrepreneurship', 'Failure Narrative', 'Leadership Lessons'],
      insights: {
        summary: "Reframed Michael\'s \'failed\' startup as a powerful learning experience. Developed framework showing maturity, resilience, and business acumen through failure.",
        actionItems: [
          'Create failure analysis framework (what learned)',
          'Quantify startup impact despite closure',
          'Connect lessons to Harvard\'s case method'
        ],
        coachingHighlights: [
          'Transformed failure into leadership story',
          'Identified $50K raised and 10 jobs created',
          'Developed "pivot mindset" narrative'
        ],
        studentProgress: {
          strengths: ['Business acumen', 'Resilience', 'Leadership experience'],
          improvements: ['Vulnerability in writing', 'Failure ownership', 'Future vision clarity'],
          nextSteps: ['Draft failure essay', 'Prepare startup portfolio']
        }
      },
      gameChangingMoment: "Michael\'s shift from hiding his failure to leading with it—showing true entrepreneurial spirit.",
      videoUrl: 'https://drive.google.com/file/d/1dgx7k3J_z0PO7cOVMqKuFOajl_x_Dulg/view'
    },
    {
      id: 'jamie-session-2',
      uuid: 'Coaching_C_Jamie_EmmaWatson_Wk12_2024-04-18_M_12350U_pqr678',
      title: 'Social Impact Leadership: Your Nonprofit Journey',
      student: 'Emma Watson',
      date: '2024-04-18',
      week: 12,
      duration: 63,
      category: 'Coaching',
      hasVideo: true,
      hasTranscript: true,
      hasInsights: true,
      keyTopics: ['Social Impact', 'Nonprofit Leadership', 'Wharton Strategy'],
      insights: {
        summary: "Positioned Emma\'s nonprofit work as executive-level leadership experience. Developed metrics-driven narrative showing real impact and business skills.",
        actionItems: [
          'Calculate total impact metrics (lives touched, funds raised)',
          'Create leadership philosophy statement',
          'Map nonprofit skills to business competencies'
        ],
        coachingHighlights: [
          'Quantified impact: 5000 students, $200K budget',
          'Developed CEO-level narrative despite age',
          'Connected social impact to business innovation'
        ],
        studentProgress: {
          strengths: ['Leadership maturity', 'Impact focus', 'Execution ability'],
          improvements: ['Business language', 'Strategic thinking articulation'],
          nextSteps: ['Finalize impact report', 'Draft Wharton essays']
        }
      },
      gameChangingMoment: "Emma realizing she wasn\'t \'just a high school student\'—she was a CEO who happened to be in high school.",
      videoUrl: 'https://drive.google.com/file/d/1dgx7k3J_z0PO7cOVMqKuFOajl_x_Dulg/view'
    }
  ]
};

// Dynamic insights generator based on coach and student profile
export const generatePersonalizedInsights = (coach, student, week) => {
  const insights = {
    kelvin: {
      approach: 'Data-driven analysis with technical depth',
      focusAreas: {
        early: 'Building technical narrative foundation',
        mid: 'Connecting research to impact',
        late: 'School-specific positioning'
      },
      coachingStyle: 'Uses engineering principles to structure stories'
    },
    noor: {
      approach: 'Emotional intelligence and authentic expression',
      focusAreas: {
        early: 'Finding unique voice and perspective',
        mid: 'Weaving identity into academics',
        late: 'Cultural fit and community'
      },
      coachingStyle: 'Creates safe space for vulnerable storytelling'
    },
    jamie: {
      approach: 'Strategic positioning with ROI mindset',
      focusAreas: {
        early: 'Leadership inventory and impact audit',
        mid: 'Building executive presence in essays',
        late: 'Future vision and career trajectory'
      },
      coachingStyle: 'Applies business frameworks to personal narratives'
    }
  };

  const phase = week <= 6 ? 'early' : week <= 12 ? 'mid' : 'late';
  return {
    approach: insights[coach.toLowerCase()].approach,
    currentFocus: insights[coach.toLowerCase()].focusAreas[phase],
    style: insights[coach.toLowerCase()].coachingStyle
  };
};

// Student success patterns by coach
export const SUCCESS_PATTERNS = {
  kelvin: {
    studentTypes: ['STEM-focused', 'Research-oriented', 'First-generation'],
    commonBreakthroughs: [
      'Connecting technical work to human impact',
      'Finding confidence in academic achievements',
      'Developing clear research narratives'
    ],
    typicalTimeline: {
      weeks1_4: 'Technical inventory and story mining',
      weeks5_8: 'Impact narrative development',
      weeks9_12: 'School-specific customization',
      weeks13_16: 'Interview prep and final polish'
    }
  },
  noor: {
    studentTypes: ['Creative writers', 'International students', 'Liberal arts'],
    commonBreakthroughs: [
      'Embracing cultural identity',
      'Finding authentic voice',
      'Connecting creativity to academics'
    ],
    typicalTimeline: {
      weeks1_4: 'Voice discovery and authenticity',
      weeks5_8: 'Essay crafting and revision',
      weeks9_12: 'Supplement customization',
      weeks13_16: 'Final edits and confidence building'
    }
  },
  jamie: {
    studentTypes: ['Entrepreneurs', 'Business-minded', 'Leaders'],
    commonBreakthroughs: [
      'Owning leadership identity',
      'Quantifying impact effectively',
      'Developing executive presence'
    ],
    typicalTimeline: {
      weeks1_4: 'Leadership audit and impact analysis',
      weeks5_8: 'Strategic narrative development',
      weeks9_12: 'Business school positioning',
      weeks13_16: 'Interview strategy and negotiation'
    }
  }
};

// Actionable templates and frameworks by coach
export const COACHING_FRAMEWORKS = {
  kelvin: {
    templates: [
      {
        name: 'Research Impact Framework',
        structure: 'Problem → Approach → Innovation → Impact → Future',
        example: 'Used by 89% of Kelvin\'s MIT admits'
      },
      {
        name: 'Technical Leadership Matrix',
        structure: 'Technical Skills × Leadership Moments × Outcomes',
        example: 'Helps position STEM students as leaders, not just researchers'
      }
    ]
  },
  noor: {
    templates: [
      {
        name: 'Cultural Bridge Essay Structure',
        structure: 'Heritage → Conflict → Integration → Growth → Contribution',
        example: 'Helped 50+ international students articulate identity'
      },
      {
        name: 'Voice Development Worksheet',
        structure: 'Natural Voice → Academic Voice → Integrated Authentic Voice',
        example: 'Creates distinctive writing style in 3 sessions'
      }
    ]
  },
  jamie: {
    templates: [
      {
        name: 'ROI Storytelling Framework',
        structure: 'Investment → Strategy → Execution → Results → Learning',
        example: 'Used by 95% of Jamie\'s business program admits'
      },
      {
        name: 'Leadership Impact Calculator',
        structure: 'Role × Challenge × Action × Result × Scale',
        example: 'Quantifies any leadership experience impressively'
      }
    ]
  }
};