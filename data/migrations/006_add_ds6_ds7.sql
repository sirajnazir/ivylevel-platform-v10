-- Migration 006: Add DS6 (Essays) and DS7 (AO Perspectives)
-- Created: 2025-10-16 (Week 6)

SET app.migration=true;

-- DS6: Essay Examples
CREATE TABLE IF NOT EXISTS moat_essay_examples (
  essay_id TEXT PRIMARY KEY,
  college_name TEXT NOT NULL,
  prompt_text TEXT NOT NULL,
  prompt_type TEXT NOT NULL,
  essay_text TEXT NOT NULL,
  word_count INTEGER NOT NULL,
  student_profile JSONB,
  admission_result TEXT NOT NULL,
  admission_year INTEGER NOT NULL,
  strengths JSONB,
  themes JSONB,
  writing_quality TEXT,
  tags JSONB,
  reviewer_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_essay_college ON moat_essay_examples(college_name);
CREATE INDEX IF NOT EXISTS idx_essay_prompt_type ON moat_essay_examples(prompt_type);
CREATE INDEX IF NOT EXISTS idx_essay_year ON moat_essay_examples(admission_year);
CREATE INDEX IF NOT EXISTS idx_essay_themes ON moat_essay_examples USING gin(themes);
CREATE INDEX IF NOT EXISTS idx_essay_tags ON moat_essay_examples USING gin(tags);

CREATE OR REPLACE VIEW v_essay_search AS
SELECT
  essay_id,
  college_name,
  prompt_type,
  LEFT(essay_text, 200) as excerpt,
  word_count,
  admission_result,
  admission_year,
  themes,
  writing_quality
FROM moat_essay_examples
ORDER BY admission_year DESC, college_name;

-- DS7: AO Perspectives
CREATE TABLE IF NOT EXISTS moat_ao_perspectives (
  perspective_id TEXT PRIMARY KEY,
  college_name TEXT NOT NULL,
  ao_role TEXT NOT NULL,
  topic TEXT NOT NULL,
  question TEXT NOT NULL,
  perspective_text TEXT NOT NULL,
  key_points JSONB NOT NULL,
  red_flags JSONB,
  green_flags JSONB,
  selectivity TEXT NOT NULL,
  admission_year INTEGER,
  source TEXT,
  tags JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ao_college ON moat_ao_perspectives(college_name);
CREATE INDEX IF NOT EXISTS idx_ao_topic ON moat_ao_perspectives(topic);
CREATE INDEX IF NOT EXISTS idx_ao_selectivity ON moat_ao_perspectives(selectivity);
CREATE INDEX IF NOT EXISTS idx_ao_tags ON moat_ao_perspectives USING gin(tags);

CREATE OR REPLACE VIEW v_ao_insights AS
SELECT
  perspective_id,
  college_name,
  ao_role,
  topic,
  question,
  LEFT(perspective_text, 300) as excerpt,
  key_points,
  selectivity
FROM moat_ao_perspectives
ORDER BY college_name, topic;

-- Load sample data for DS6
INSERT INTO moat_essay_examples VALUES
('essay_stanford_ca_001', 'Stanford University', 'The lessons we take from obstacles we encounter can be fundamental to later success. Recount a time when you faced a challenge, setback, or failure. How did it affect you, and what did you learn from the experience?', 'common_app', 'I stared at the error message for the hundredth time: "Compilation failed: Type mismatch in line 47." My game engine, six months in the making, refused to run. It was 2 AM, the hackathon submission deadline was in six hours, and I was ready to quit.

But then I remembered why I started coding games in the first place—not to win competitions, but to tell stories that matter. My game "Echoes of Empathy" was designed to teach players about AI ethics through interactive scenarios. If I gave up now, those stories would never be told.

I took a deep breath, opened a fresh file, and started debugging line by line. By 5 AM, I found it: a single misplaced semicolon in my emotion recognition algorithm. The game compiled. We didn''t win the hackathon, but three months later, a high school teacher emailed me saying she used my game in her ethics class.

That failure taught me that impact isn''t measured by trophies—it''s measured by the conversations we start and the minds we open. Now, when I face setbacks in my work with Empowering AI, I remember: the goal isn''t perfection, it''s progress toward something meaningful.', 250, '{"gpa": 4.15, "sat": 1480, "intended_major": "Computer Science", "demographics": "Asian American Female"}', 'accepted', 2024, '["Shows genuine passion for CS and AI ethics", "Vulnerability in admitting failure", "Clear growth mindset", "Connects to broader impact"]', '["resilience", "intellectual_curiosity", "social_impact", "technical_skills"]', 'exceptional', '["common_app_1", "setback", "computer_science", "ai_ethics", "hackathon"]', 'Strong narrative arc. Authentic voice. Clear Stanford fit with tech-for-good mission.', NOW(), NOW())
ON CONFLICT (essay_id) DO NOTHING;

INSERT INTO moat_essay_examples VALUES
('essay_mit_supp_001', 'MIT', 'Describe the world you come from (for example, your family, school, community, city, or town). How has that world shaped your dreams and aspirations?', 'supplemental', 'Mountain House, California isn''t on most maps. With 25,000 residents and one high school, we''re the definition of "small town." But what we lack in size, we make up for in diversity—my school has students from 40+ countries, each bringing their own stories.

Growing up here taught me that innovation doesn''t require Silicon Valley. My grandmother, who immigrated from Pakistan with $200 and a dream, started a nonprofit serving refugee families. Watching her code switch between Urdu, English, and broken Spanish to help families navigate healthcare systems showed me that technology isn''t just about building apps—it''s about building bridges.

That''s why I founded Folklift, a platform documenting immigrant stories through interactive media. When I coded the first prototype, I thought about my grandmother navigating a new country. When I added multilingual support, I thought about the Korean family down the street. When I integrated oral history features, I thought about preserving voices that might otherwise be lost.

MIT asks how my world shaped my dreams. My answer: a small town with big hearts taught me that the best technology serves those who need it most.', 250, '{"gpa": 4.15, "sat": 1480, "intended_major": "Computer Science", "demographics": "Asian American Female"}', 'accepted', 2024, '["Unique geographical angle", "Family story adds depth", "Clear connection between background and work", "Demonstrates MIT values (innovation + service)"]', '["community", "cultural_identity", "social_impact", "family_influence"]', 'strong', '["mit_supplemental", "community", "nonprofit", "immigration", "diversity"]', NOW(), NOW())
ON CONFLICT (essay_id) DO NOTHING;

INSERT INTO moat_essay_examples VALUES
('essay_uc_piq3_001', 'UC Berkeley', 'What would you say is your greatest talent or skill? How have you developed and demonstrated that talent over time?', 'uc_piq', 'My greatest talent is translation—not between languages, but between complex technical concepts and real human understanding.

This skill emerged when I volunteered to teach coding to middle schoolers. My first lesson was a disaster. I dove into variables and loops, and within ten minutes, half the class looked lost. That''s when I realized: being smart isn''t enough. You have to meet people where they are.

So I rebuilt the curriculum using games. Variables became "character stats" in a role-playing game. Loops became "dance move repeats" in a rhythm game. Suddenly, concepts clicked. One student who swore she "wasn''t a math person" built a quiz game that went viral at her school.

I''ve since applied this skill to my AI ethics advocacy. When teaching adults about algorithmic bias, I don''t lecture about neural networks—I show them Instagram''s photo cropping controversy. When explaining data privacy to parents, I compare it to house locks and windows.

The best technologists aren''t just builders—they''re translators who make innovation accessible to everyone.', 200, '{"gpa": 4.15, "sat": 1480, "intended_major": "Computer Science"}', 'accepted', 2024, '["Meta-skill (translation) is unique", "Shows teaching/mentorship", "Concrete examples", "Demonstrates communication skills"]', '["teaching", "communication", "technical_skills", "accessibility"]', 'strong', '["uc_piq", "teaching", "coding", "education", "communication"]', NOW(), NOW())
ON CONFLICT (essay_id) DO NOTHING;

-- Load sample data for DS7
INSERT INTO moat_ao_perspectives VALUES
('ao_stanford_essays_001', 'Stanford University', 'dean', 'essays', 'What makes an essay stand out in Stanford admissions?', 'We read thousands of essays about winning championships, curing diseases, and changing the world. What actually stands out? Authenticity. The essays that stick with us are the ones where students aren''t trying to impress us—they''re trying to help us understand who they are.

I remember one essay about a student who failed to make their high school varsity team three years in a row, but kept showing up to practice anyway. They didn''t frame it as "resilience" or use buzzwords. They just told the story of loving something enough to stay committed even when they weren''t the best. That honesty? That''s what we''re looking for.

Another common mistake: students write what they think we want to hear rather than what they genuinely care about. We can tell. The passion test is simple—could this student talk about this topic for an hour without notes? If not, it''s probably not the right essay topic.', '["Authenticity over achievement narratives", "Vulnerability is strength", "Passion must be genuine", "Avoid buzzwords and clichés"]', '["Generic achievement narratives", "Thesaurus vocabulary (trying too hard)", "Essays that sound like résumés", "Writing what you think AOs want to hear"]', '["Genuine vulnerability", "Specific details and scenes", "Natural, conversational voice", "Clear self-awareness"]', 'highly_selective', 2024, 'admissions conference', '["essays", "authenticity", "stanford", "application_advice"]', NOW(), NOW())
ON CONFLICT (perspective_id) DO NOTHING;

INSERT INTO moat_ao_perspectives VALUES
('ao_mit_ecs_001', 'MIT', 'senior_reader', 'extracurriculars', 'What do MIT admissions officers look for in extracurriculars?', 'At MIT, we''re not counting activities—we''re looking for evidence of what we call "maker behavior." Did you build something? Did you start something? Did you tinker, experiment, fail, and try again?

We see plenty of students with impressive titles: "Founder of 5 clubs" or "President of 3 organizations." But when we dig deeper, sometimes those clubs met twice and did nothing. That''s not impressive—that''s résumé padding.

What IS impressive: A student who spent two years building a single robot that never quite worked, but learned Python, CAD, electronics, and persistence along the way. A student who taught themselves game development and published a small mobile app with 50 downloads. A student who organized a single hackathon that brought 30 students together to code for a weekend.

Quality over quantity. Depth over breadth. Impact over titles.', '["Evidence of "maker behavior" - building and creating", "Depth and long-term commitment matter more than titles", "Learning from failure shows growth", "Real impact > impressive-sounding positions"]', '["Résumé padding with empty titles", "Starting many things but finishing nothing", "Joining clubs just to list them", "No clear passion or through-line"]', '["Multi-year commitment to single pursuit", "Tangible projects or creations", "Evidence of technical learning", "Genuine curiosity and experimentation"]', 'highly_selective', 2024, 'podcast interview', '["extracurriculars", "mit", "maker_culture", "authenticity"]', NOW(), NOW())
ON CONFLICT (perspective_id) DO NOTHING;

INSERT INTO moat_ao_perspectives VALUES
('ao_harvard_holistic_001', 'Harvard University', 'dean', 'holistic_review', 'How does Harvard practice holistic admissions?', 'People often misunderstand holistic review. They think it means "anything goes" or "you don''t need great grades." That''s not true. Academic excellence is table stakes—you need it to be competitive. Holistic review means we''re looking beyond the numbers to understand the whole person.

Here''s how we think about it: Academic strength is the foundation. Once we establish you can handle Harvard''s rigor, we ask: What will you contribute to campus? How will you make your classmates'' lives richer? What unique perspective or experience do you bring?

We''re building a class, not just admitting individuals. We need violinists and rugby players, future doctors and future poets, students from Montana and students from Mumbai. We need different voices, different stories, different ways of seeing the world.

So yes, grades and test scores matter. But so does everything else—your essays, your activities, your letters, your intellectual curiosity, your character. That''s holistic review.', '["Academic excellence is foundation, not optional", "Looking for contribution to campus community", "Building diverse class with different perspectives", "Character and intellectual curiosity matter as much as achievements"]', '["Assuming you can compensate for weak academics with great essays", "Generic involvement without depth", "Trying to be everything to everyone", "Lack of intellectual curiosity"]', '["Intellectual vitality and curiosity", "Unique perspective or background", "Depth in specific area", "Evidence of positive impact on others"]', 'highly_selective', 2023, 'admissions panel', '["holistic_review", "harvard", "class_building", "evaluation_criteria"]', NOW(), NOW())
ON CONFLICT (perspective_id) DO NOTHING;

INSERT INTO moat_ao_perspectives VALUES
('ao_ucb_piqs_001', 'UC Berkeley', 'regional_director', 'essays', 'What makes strong UC Personal Insight Questions?', 'With UC PIQs, you have 350 words and 4 questions to show us who you are. That''s not much space, so every word needs to count. The biggest mistake students make? Trying to summarize their whole life or résumé.

Instead, zoom in. Pick one specific moment, one specific challenge, one specific achievement. Give us scenes, not summaries. Don''t tell us "I learned leadership through Model UN"—show us the moment you convinced your delegation to change their position on a resolution.

We''re reading thousands of PIQs. The ones that stick are the ones with specific details: "I spent three hours debugging line 487 of my app" is more memorable than "I''m passionate about coding."

Remember: We already have your activities list. Don''t repeat it. Use PIQs to add dimension, context, and personality to those activities.', '["Be specific - scenes over summaries", "Don''t repeat activities list", "Show, don''t tell", "Each PIQ should reveal something new"]', '["Vague, generic statements", "Repeating activities list", "Trying to cover too much ground", "No specific examples or details"]', '["Specific, vivid details", "Genuine reflection and insight", "Clear personal voice", "Adding context to activities"]', 'highly_selective', 2024, 'webinar', '["uc_system", "piqs", "essays", "specificity"]', NOW(), NOW())
ON CONFLICT (perspective_id) DO NOTHING;
