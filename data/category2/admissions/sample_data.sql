-- DS7: Sample AO Perspectives
-- Created: 2025-10-16 (Week 7)

-- Stanford AO on essays
INSERT INTO moat_ao_perspectives (
  perspective_id,
  college_name,
  ao_role,
  topic,
  question,
  perspective_text,
  key_points,
  red_flags,
  green_flags,
  selectivity,
  admission_year,
  source,
  tags
) VALUES (
  'ao_stanford_essays_001',
  'Stanford University',
  'dean',
  'essays',
  'What makes an essay stand out in Stanford admissions?',
  'We read thousands of essays about winning championships, curing diseases, and changing the world. What actually stands out? Authenticity. The essays that stick with us are the ones where students aren''t trying to impress us—they''re trying to help us understand who they are.

I remember one essay about a student who failed to make their high school varsity team three years in a row, but kept showing up to practice anyway. They didn''t frame it as "resilience" or use buzzwords. They just told the story of loving something enough to stay committed even when they weren''t the best. That honesty? That''s what we''re looking for.

Another common mistake: students write what they think we want to hear rather than what they genuinely care about. We can tell. The passion test is simple—could this student talk about this topic for an hour without notes? If not, it''s probably not the right essay topic.',
  '["Authenticity over achievement narratives", "Vulnerability is strength", "Passion must be genuine", "Avoid buzzwords and clichés"]',
  '["Generic achievement narratives", "Thesaurus vocabulary (trying too hard)", "Essays that sound like résumés", "Writing what you think AOs want to hear"]',
  '["Genuine vulnerability", "Specific details and scenes", "Natural, conversational voice", "Clear self-awareness"]',
  'highly_selective',
  2024,
  'admissions conference',
  '["essays", "authenticity", "stanford", "application_advice"]'
);

-- MIT AO on extracurriculars
INSERT INTO moat_ao_perspectives (
  perspective_id,
  college_name,
  ao_role,
  topic,
  question,
  perspective_text,
  key_points,
  red_flags,
  green_flags,
  selectivity,
  admission_year,
  source,
  tags
) VALUES (
  'ao_mit_ecs_001',
  'MIT',
  'senior_reader',
  'extracurriculars',
  'What do MIT admissions officers look for in extracurriculars?',
  'At MIT, we''re not counting activities—we''re looking for evidence of what we call "maker behavior." Did you build something? Did you start something? Did you tinker, experiment, fail, and try again?

We see plenty of students with impressive titles: "Founder of 5 clubs" or "President of 3 organizations." But when we dig deeper, sometimes those clubs met twice and did nothing. That''s not impressive—that''s résumé padding.

What IS impressive: A student who spent two years building a single robot that never quite worked, but learned Python, CAD, electronics, and persistence along the way. A student who taught themselves game development and published a small mobile app with 50 downloads. A student who organized a single hackathon that brought 30 students together to code for a weekend.

Quality over quantity. Depth over breadth. Impact over titles.',
  '["Evidence of "maker behavior" - building and creating", "Depth and long-term commitment matter more than titles", "Learning from failure shows growth", "Real impact > impressive-sounding positions"]',
  '["Résumé padding with empty titles", "Starting many things but finishing nothing", "Joining clubs just to list them", "No clear passion or through-line"]',
  '["Multi-year commitment to single pursuit", "Tangible projects or creations", "Evidence of technical learning", "Genuine curiosity and experimentation"]',
  'highly_selective',
  2024,
  'podcast interview',
  '["extracurriculars", "mit", "maker_culture", "authenticity"]'
);

-- Harvard AO on holistic review
INSERT INTO moat_ao_perspectives (
  perspective_id,
  college_name,
  ao_role,
  topic,
  question,
  perspective_text,
  key_points,
  red_flags,
  green_flags,
  selectivity,
  admission_year,
  source,
  tags
) VALUES (
  'ao_harvard_holistic_001',
  'Harvard University',
  'dean',
  'holistic_review',
  'How does Harvard practice holistic admissions?',
  'People often misunderstand holistic review. They think it means "anything goes" or "you don''t need great grades." That''s not true. Academic excellence is table stakes—you need it to be competitive. Holistic review means we''re looking beyond the numbers to understand the whole person.

Here''s how we think about it: Academic strength is the foundation. Once we establish you can handle Harvard''s rigor, we ask: What will you contribute to campus? How will you make your classmates'' lives richer? What unique perspective or experience do you bring?

We''re building a class, not just admitting individuals. We need violinists and rugby players, future doctors and future poets, students from Montana and students from Mumbai. We need different voices, different stories, different ways of seeing the world.

So yes, grades and test scores matter. But so does everything else—your essays, your activities, your letters, your intellectual curiosity, your character. That''s holistic review.',
  '["Academic excellence is foundation, not optional", "Looking for contribution to campus community", "Building diverse class with different perspectives", "Character and intellectual curiosity matter as much as achievements"]',
  '["Assuming you can compensate for weak academics with great essays", "Generic involvement without depth", "Trying to be everything to everyone", "Lack of intellectual curiosity"]',
  '["Intellectual vitality and curiosity", "Unique perspective or background", "Depth in specific area", "Evidence of positive impact on others"]',
  'highly_selective',
  2023,
  'admissions panel',
  '["holistic_review", "harvard", "class_building", "evaluation_criteria"]'
);

-- UC Berkeley AO on Personal Insight Questions
INSERT INTO moat_ao_perspectives (
  perspective_id,
  college_name,
  ao_role,
  topic,
  question,
  perspective_text,
  key_points,
  red_flags,
  green_flags,
  selectivity,
  source,
  tags
) VALUES (
  'ao_ucb_piqs_001',
  'UC Berkeley',
  'regional_director',
  'essays',
  'What makes strong UC Personal Insight Questions?',
  'With UC PIQs, you have 350 words and 4 questions to show us who you are. That''s not much space, so every word needs to count. The biggest mistake students make? Trying to summarize their whole life or résumé.

Instead, zoom in. Pick one specific moment, one specific challenge, one specific achievement. Give us scenes, not summaries. Don''t tell us "I learned leadership through Model UN"—show us the moment you convinced your delegation to change their position on a resolution.

We''re reading thousands of PIQs. The ones that stick are the ones with specific details: "I spent three hours debugging line 487 of my app" is more memorable than "I''m passionate about coding."

Remember: We already have your activities list. Don''t repeat it. Use PIQs to add dimension, context, and personality to those activities.',
  '["Be specific - scenes over summaries", "Don''t repeat activities list", "Show, don''t tell", "Each PIQ should reveal something new"]',
  '["Vague, generic statements", "Repeating activities list", "Trying to cover too much ground", "No specific examples or details"]',
  '["Specific, vivid details", "Genuine reflection and insight", "Clear personal voice", "Adding context to activities"]',
  'highly_selective',
  2024,
  'webinar',
  '["uc_system", "piqs", "essays", "specificity"]'
);
