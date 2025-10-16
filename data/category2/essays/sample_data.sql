-- DS6: Sample Essay Examples
-- Created: 2025-10-16 (Week 6)

-- Sample essay 1: Stanford Common App essay
INSERT INTO moat_essay_examples (
  essay_id,
  college_name,
  prompt_text,
  prompt_type,
  essay_text,
  word_count,
  student_profile,
  admission_result,
  admission_year,
  strengths,
  themes,
  writing_quality,
  tags,
  reviewer_notes
) VALUES (
  'essay_stanford_ca_001',
  'Stanford University',
  'The lessons we take from obstacles we encounter can be fundamental to later success. Recount a time when you faced a challenge, setback, or failure. How did it affect you, and what did you learn from the experience?',
  'common_app',
  'I stared at the error message for the hundredth time: "Compilation failed: Type mismatch in line 47." My game engine, six months in the making, refused to run. It was 2 AM, the hackathon submission deadline was in six hours, and I was ready to quit.

But then I remembered why I started coding games in the first place—not to win competitions, but to tell stories that matter. My game "Echoes of Empathy" was designed to teach players about AI ethics through interactive scenarios. If I gave up now, those stories would never be told.

I took a deep breath, opened a fresh file, and started debugging line by line. By 5 AM, I found it: a single misplaced semicolon in my emotion recognition algorithm. The game compiled. We didn''t win the hackathon, but three months later, a high school teacher emailed me saying she used my game in her ethics class.

That failure taught me that impact isn''t measured by trophies—it''s measured by the conversations we start and the minds we open. Now, when I face setbacks in my work with Empowering AI, I remember: the goal isn''t perfection, it''s progress toward something meaningful.',
  250,
  '{"gpa": 4.15, "sat": 1480, "intended_major": "Computer Science", "demographics": "Asian American Female"}',
  'accepted',
  2024,
  '["Shows genuine passion for CS and AI ethics", "Vulnerability in admitting failure", "Clear growth mindset", "Connects to broader impact"]',
  '["resilience", "intellectual_curiosity", "social_impact", "technical_skills"]',
  'exceptional',
  '["common_app_1", "setback", "computer_science", "ai_ethics", "hackathon"]',
  'Strong narrative arc. Authentic voice. Clear Stanford fit with tech-for-good mission.'
);

-- Sample essay 2: MIT supplemental
INSERT INTO moat_essay_examples (
  essay_id,
  college_name,
  prompt_text,
  prompt_type,
  essay_text,
  word_count,
  student_profile,
  admission_result,
  admission_year,
  strengths,
  themes,
  writing_quality,
  tags
) VALUES (
  'essay_mit_supp_001',
  'MIT',
  'Describe the world you come from (for example, your family, school, community, city, or town). How has that world shaped your dreams and aspirations?',
  'supplemental',
  'Mountain House, California isn''t on most maps. With 25,000 residents and one high school, we''re the definition of "small town." But what we lack in size, we make up for in diversity—my school has students from 40+ countries, each bringing their own stories.

Growing up here taught me that innovation doesn''t require Silicon Valley. My grandmother, who immigrated from Pakistan with $200 and a dream, started a nonprofit serving refugee families. Watching her code switch between Urdu, English, and broken Spanish to help families navigate healthcare systems showed me that technology isn''t just about building apps—it''s about building bridges.

That''s why I founded Folklift, a platform documenting immigrant stories through interactive media. When I coded the first prototype, I thought about my grandmother navigating a new country. When I added multilingual support, I thought about the Korean family down the street. When I integrated oral history features, I thought about preserving voices that might otherwise be lost.

MIT asks how my world shaped my dreams. My answer: a small town with big hearts taught me that the best technology serves those who need it most.',
  250,
  '{"gpa": 4.15, "sat": 1480, "intended_major": "Computer Science", "demographics": "Asian American Female"}',
  'accepted',
  2024,
  '["Unique geographical angle", "Family story adds depth", "Clear connection between background and work", "Demonstrates MIT values (innovation + service)"]',
  '["community", "cultural_identity", "social_impact", "family_influence"]',
  'strong',
  '["mit_supplemental", "community", "nonprofit", "immigration", "diversity"]'
);

-- Sample essay 3: UC PIQ #3 (greatest talent/skill)
INSERT INTO moat_essay_examples (
  essay_id,
  college_name,
  prompt_text,
  prompt_type,
  essay_text,
  word_count,
  student_profile,
  admission_result,
  admission_year,
  strengths,
  themes,
  writing_quality,
  tags
) VALUES (
  'essay_uc_piq3_001',
  'UC Berkeley',
  'What would you say is your greatest talent or skill? How have you developed and demonstrated that talent over time?',
  'uc_piq',
  'My greatest talent is translation—not between languages, but between complex technical concepts and real human understanding.

This skill emerged when I volunteered to teach coding to middle schoolers. My first lesson was a disaster. I dove into variables and loops, and within ten minutes, half the class looked lost. That''s when I realized: being smart isn''t enough. You have to meet people where they are.

So I rebuilt the curriculum using games. Variables became "character stats" in a role-playing game. Loops became "dance move repeats" in a rhythm game. Suddenly, concepts clicked. One student who swore she "wasn''t a math person" built a quiz game that went viral at her school.

I''ve since applied this skill to my AI ethics advocacy. When teaching adults about algorithmic bias, I don''t lecture about neural networks—I show them Instagram''s photo cropping controversy. When explaining data privacy to parents, I compare it to house locks and windows.

The best technologists aren''t just builders—they''re translators who make innovation accessible to everyone.',
  200,
  '{"gpa": 4.15, "sat": 1480, "intended_major": "Computer Science"}',
  'accepted',
  2024,
  '["Meta-skill (translation) is unique", "Shows teaching/mentorship", "Concrete examples", "Demonstrates communication skills"]',
  '["teaching", "communication", "technical_skills", "accessibility"]',
  'strong',
  '["uc_piq", "teaching", "coding", "education", "communication"]'
);
