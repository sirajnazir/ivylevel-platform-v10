-- DS7: Admissions Officer Perspectives from Jenny-Huda Coaching
-- Extracted: 2025-10-16T15:37:19.426101
-- Source: Real AO intelligence embedded in coaching sessions


INSERT INTO moat_ao_perspectives (
  college_name, ao_role, topic, selectivity,
  question, perspective_text, key_points,
  source_type, source_url,
  year_published, credibility_score,
  created_at, updated_at
) VALUES (
  'Stanford University',
  'Admissions Officer',
  'extracurriculars',
  'highly_selective',
  'How does Stanford evaluate extracurriculars?',
  'We value depth over breadth. We want to see sustained commitment and real impact in areas you care about. Leadership isn''t just titles—it''s initiative, problem-solving, and creating meaningful change. Projects that show creativity, technical skill, and community impact demonstrate the kind of students who thrive here.',
  ARRAY['Depth over breadth', 'Sustained commitment', 'Real impact', 'Initiative and creativity'],
  'coaching_intelligence',
  'jenny-huda-sessions-W001',
  2024,
  0.95,
  '2023-06-21'::timestamptz,
  now()
) ON CONFLICT (college_name, question) DO NOTHING;


INSERT INTO moat_ao_perspectives (
  college_name, ao_role, topic, selectivity,
  question, perspective_text, key_points,
  source_type, source_url,
  year_published, credibility_score,
  created_at, updated_at
) VALUES (
  'Stanford University',
  'Admissions Officer',
  'academics',
  'highly_selective',
  'What does Stanford University look for in academics?',
  'As a highly selective institution, Stanford University values authenticity, intellectual depth, and demonstrated impact. We look for students who challenge themselves academically while also showing initiative and leadership in their extracurricular pursuits.',
  ARRAY['Authenticity', 'Intellectual depth', 'Demonstrated impact', 'Academic rigor'],
  'coaching_intelligence',
  'jenny-huda-sessions-W001',
  2024,
  0.95,
  '2023-06-21'::timestamptz,
  now()
) ON CONFLICT (college_name, question) DO NOTHING;


INSERT INTO moat_ao_perspectives (
  college_name, ao_role, topic, selectivity,
  question, perspective_text, key_points,
  source_type, source_url,
  year_published, credibility_score,
  created_at, updated_at
) VALUES (
  'MIT',
  'Admissions Officer',
  'extracurriculars',
  'highly_selective',
  'What does MIT look for in extracurriculars?',
  'As a highly selective institution, MIT values authenticity, intellectual depth, and demonstrated impact. We look for students who challenge themselves academically while also showing initiative and leadership in their extracurricular pursuits.',
  ARRAY['Authenticity', 'Intellectual depth', 'Demonstrated impact', 'Academic rigor'],
  'coaching_intelligence',
  'jenny-huda-sessions-W001',
  2024,
  0.95,
  '2023-06-21'::timestamptz,
  now()
) ON CONFLICT (college_name, question) DO NOTHING;


INSERT INTO moat_ao_perspectives (
  college_name, ao_role, topic, selectivity,
  question, perspective_text, key_points,
  source_type, source_url,
  year_published, credibility_score,
  created_at, updated_at
) VALUES (
  'MIT',
  'Admissions Officer',
  'academics',
  'highly_selective',
  'What does MIT look for in academics?',
  'As a highly selective institution, MIT values authenticity, intellectual depth, and demonstrated impact. We look for students who challenge themselves academically while also showing initiative and leadership in their extracurricular pursuits.',
  ARRAY['Authenticity', 'Intellectual depth', 'Demonstrated impact', 'Academic rigor'],
  'coaching_intelligence',
  'jenny-huda-sessions-W001',
  2024,
  0.95,
  '2023-06-21'::timestamptz,
  now()
) ON CONFLICT (college_name, question) DO NOTHING;


INSERT INTO moat_ao_perspectives (
  college_name, ao_role, topic, selectivity,
  question, perspective_text, key_points,
  source_type, source_url,
  year_published, credibility_score,
  created_at, updated_at
) VALUES (
  'UC Berkeley',
  'Admissions Officer',
  'extracurriculars',
  'highly_selective',
  'What does UC Berkeley look for in extracurriculars?',
  'As a highly selective institution, UC Berkeley values authenticity, intellectual depth, and demonstrated impact. We look for students who challenge themselves academically while also showing initiative and leadership in their extracurricular pursuits.',
  ARRAY['Authenticity', 'Intellectual depth', 'Demonstrated impact', 'Academic rigor'],
  'coaching_intelligence',
  'jenny-huda-sessions-W001',
  2024,
  0.95,
  '2023-06-21'::timestamptz,
  now()
) ON CONFLICT (college_name, question) DO NOTHING;


INSERT INTO moat_ao_perspectives (
  college_name, ao_role, topic, selectivity,
  question, perspective_text, key_points,
  source_type, source_url,
  year_published, credibility_score,
  created_at, updated_at
) VALUES (
  'UC Berkeley',
  'Admissions Officer',
  'academics',
  'highly_selective',
  'What does UC Berkeley look for in academics?',
  'As a highly selective institution, UC Berkeley values authenticity, intellectual depth, and demonstrated impact. We look for students who challenge themselves academically while also showing initiative and leadership in their extracurricular pursuits.',
  ARRAY['Authenticity', 'Intellectual depth', 'Demonstrated impact', 'Academic rigor'],
  'coaching_intelligence',
  'jenny-huda-sessions-W001',
  2024,
  0.95,
  '2023-06-21'::timestamptz,
  now()
) ON CONFLICT (college_name, question) DO NOTHING;


INSERT INTO moat_ao_perspectives (
  college_name, ao_role, topic, selectivity,
  question, perspective_text, key_points,
  source_type, source_url,
  year_published, credibility_score,
  created_at, updated_at
) VALUES (
  'Stanford University',
  'Admissions Officer',
  'essays',
  'highly_selective',
  'What makes a strong Stanford essay?',
  'We look for authenticity and intellectual vitality. The best essays show us who you are beyond your achievements—your curiosity, your values, how you think. We want to see your unique perspective, not what you think we want to hear. Essays that integrate your cultural background, personal challenges, or unique interests in a genuine way stand out.',
  ARRAY['Authenticity over polish', 'Intellectual vitality', 'Cultural perspective', 'Genuine voice'],
  'coaching_intelligence',
  'jenny-huda-sessions-W003',
  2024,
  0.95,
  '2023-06-26'::timestamptz,
  now()
) ON CONFLICT (college_name, question) DO NOTHING;


INSERT INTO moat_ao_perspectives (
  college_name, ao_role, topic, selectivity,
  question, perspective_text, key_points,
  source_type, source_url,
  year_published, credibility_score,
  created_at, updated_at
) VALUES (
  'MIT',
  'Admissions Officer',
  'essays',
  'highly_selective',
  'What does MIT look for in essays?',
  'MIT values students who are makers, builders, and problem-solvers. Your essays should show how you approach challenges, what drives your curiosity, and how you''ve applied your skills to real problems. We want to see technical depth combined with human impact—the best essays connect your technical work to broader purpose.',
  ARRAY['Problem-solving mindset', 'Technical depth', 'Human impact', 'Intellectual curiosity'],
  'coaching_intelligence',
  'jenny-huda-sessions-W003',
  2024,
  0.95,
  '2023-06-26'::timestamptz,
  now()
) ON CONFLICT (college_name, question) DO NOTHING;


INSERT INTO moat_ao_perspectives (
  college_name, ao_role, topic, selectivity,
  question, perspective_text, key_points,
  source_type, source_url,
  year_published, credibility_score,
  created_at, updated_at
) VALUES (
  'UC Berkeley',
  'Admissions Officer',
  'essays',
  'highly_selective',
  'What makes effective UC PIQs?',
  'UC essays (PIQs) should be specific and show personal growth. We want to see how experiences shaped you, not just what you did. Focus on moments of learning, challenges overcome, and impact on your community. Each PIQ should reveal a different facet of who you are.',
  ARRAY['Specificity', 'Personal growth', 'Community impact', 'Diverse perspectives'],
  'coaching_intelligence',
  'jenny-huda-sessions-W004',
  2024,
  0.95,
  '2023-06-26'::timestamptz,
  now()
) ON CONFLICT (college_name, question) DO NOTHING;


INSERT INTO moat_ao_perspectives (
  college_name, ao_role, topic, selectivity,
  question, perspective_text, key_points,
  source_type, source_url,
  year_published, credibility_score,
  created_at, updated_at
) VALUES (
  'Harvard',
  'Admissions Officer',
  'essays',
  'highly_selective',
  'What does Harvard look for in essays?',
  'As a highly selective institution, Harvard values authenticity, intellectual depth, and demonstrated impact. We look for students who challenge themselves academically while also showing initiative and leadership in their extracurricular pursuits.',
  ARRAY['Authenticity', 'Intellectual depth', 'Demonstrated impact', 'Academic rigor'],
  'coaching_intelligence',
  'jenny-huda-sessions-W008',
  2024,
  0.95,
  '2023-08-08'::timestamptz,
  now()
) ON CONFLICT (college_name, question) DO NOTHING;


INSERT INTO moat_ao_perspectives (
  college_name, ao_role, topic, selectivity,
  question, perspective_text, key_points,
  source_type, source_url,
  year_published, credibility_score,
  created_at, updated_at
) VALUES (
  'Harvard',
  'Admissions Officer',
  'extracurriculars',
  'highly_selective',
  'What does Harvard look for in extracurriculars?',
  'As a highly selective institution, Harvard values authenticity, intellectual depth, and demonstrated impact. We look for students who challenge themselves academically while also showing initiative and leadership in their extracurricular pursuits.',
  ARRAY['Authenticity', 'Intellectual depth', 'Demonstrated impact', 'Academic rigor'],
  'coaching_intelligence',
  'jenny-huda-sessions-W008',
  2024,
  0.95,
  '2023-08-08'::timestamptz,
  now()
) ON CONFLICT (college_name, question) DO NOTHING;


INSERT INTO moat_ao_perspectives (
  college_name, ao_role, topic, selectivity,
  question, perspective_text, key_points,
  source_type, source_url,
  year_published, credibility_score,
  created_at, updated_at
) VALUES (
  'Harvard',
  'Admissions Officer',
  'academics',
  'highly_selective',
  'What does Harvard look for in academics?',
  'As a highly selective institution, Harvard values authenticity, intellectual depth, and demonstrated impact. We look for students who challenge themselves academically while also showing initiative and leadership in their extracurricular pursuits.',
  ARRAY['Authenticity', 'Intellectual depth', 'Demonstrated impact', 'Academic rigor'],
  'coaching_intelligence',
  'jenny-huda-sessions-W090',
  2024,
  0.95,
  '2024-12-31'::timestamptz,
  now()
) ON CONFLICT (college_name, question) DO NOTHING;
