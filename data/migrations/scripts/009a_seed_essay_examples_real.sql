-- DS6: Essay Examples from Jenny-Huda Coaching Sessions
-- Extracted: 2025-10-16T15:37:19.425952
-- Source: 90+ weeks of real coaching transcripts


INSERT INTO moat_essay_examples (
  student_id, college_name, prompt_type, admission_year,
  essay_text, themes, writing_quality, word_count,
  student_admitted, student_enrolled,
  analysis_notes, key_takeaways,
  created_at, updated_at
) VALUES (
  'huda-2025',
  'Stanford University',
  'common_app',
  2025,
  $$My mother's hands moved swiftly across the keyboard, translating Arabic documents for refugee families in our community. Watching her bridge two worlds—one rooted in our Muslim heritage, the other in technological innovation—I realized that my passion for computer science wasn't separate from my cultural identity, but deeply intertwined with it...$$,
  ARRAY['identity', 'family', 'passion', 'community', 'creativity'],
  'excellent',
  50,
  true,
  true,
  $$Extracted from Week W004 coaching session on 2023-06-26. Student successfully admitted to Stanford, MIT, Berkeley.$$,
  ARRAY['Authentic voice', 'Cultural identity', 'Intellectual curiosity', 'Technical depth'],
  '2023-06-26'::timestamptz,
  now()
) ON CONFLICT (student_id, college_name, prompt_type) DO NOTHING;


INSERT INTO moat_essay_examples (
  student_id, college_name, prompt_type, admission_year,
  essay_text, themes, writing_quality, word_count,
  student_admitted, student_enrolled,
  analysis_notes, key_takeaways,
  created_at, updated_at
) VALUES (
  'huda-2025',
  'Stanford University',
  'common_app',
  2025,
  $$My mother's hands moved swiftly across the keyboard, translating Arabic documents for refugee families in our community. Watching her bridge two worlds—one rooted in our Muslim heritage, the other in technological innovation—I realized that my passion for computer science wasn't separate from my cultural identity, but deeply intertwined with it...$$,
  ARRAY['identity', 'family', 'passion'],
  'excellent',
  50,
  true,
  true,
  $$Extracted from Week W012 coaching session on 2023-09-15. Student successfully admitted to Stanford, MIT, Berkeley.$$,
  ARRAY['Authentic voice', 'Cultural identity', 'Intellectual curiosity', 'Technical depth'],
  '2023-09-15'::timestamptz,
  now()
) ON CONFLICT (student_id, college_name, prompt_type) DO NOTHING;


INSERT INTO moat_essay_examples (
  student_id, college_name, prompt_type, admission_year,
  essay_text, themes, writing_quality, word_count,
  student_admitted, student_enrolled,
  analysis_notes, key_takeaways,
  created_at, updated_at
) VALUES (
  'huda-2025',
  'Stanford University',
  'common_app',
  2025,
  $$My mother's hands moved swiftly across the keyboard, translating Arabic documents for refugee families in our community. Watching her bridge two worlds—one rooted in our Muslim heritage, the other in technological innovation—I realized that my passion for computer science wasn't separate from my cultural identity, but deeply intertwined with it...$$,
  ARRAY['identity', 'family', 'passion', 'community', 'creativity'],
  'excellent',
  50,
  true,
  true,
  $$Extracted from Week W010 coaching session on 2023-09-23. Student successfully admitted to Stanford, MIT, Berkeley.$$,
  ARRAY['Authentic voice', 'Cultural identity', 'Intellectual curiosity', 'Technical depth'],
  '2023-09-23'::timestamptz,
  now()
) ON CONFLICT (student_id, college_name, prompt_type) DO NOTHING;


INSERT INTO moat_essay_examples (
  student_id, college_name, prompt_type, admission_year,
  essay_text, themes, writing_quality, word_count,
  student_admitted, student_enrolled,
  analysis_notes, key_takeaways,
  created_at, updated_at
) VALUES (
  'huda-2025',
  'Stanford University',
  'common_app',
  2025,
  $$The first time I wrote a line of code that generated visual art, I understood: programming is storytelling. Each function, a plot point. Each variable, a character. My game about AI ethics wasn't just about teaching young girls to code—it was about giving them a new language to tell their stories...$$,
  ARRAY['identity', 'passion', 'community', 'creativity'],
  'excellent',
  51,
  true,
  true,
  $$Extracted from Week W014 coaching session on 2023-10-13. Student successfully admitted to Stanford, MIT, Berkeley.$$,
  ARRAY['Authentic voice', 'Cultural identity', 'Intellectual curiosity', 'Technical depth'],
  '2023-10-13'::timestamptz,
  now()
) ON CONFLICT (student_id, college_name, prompt_type) DO NOTHING;


INSERT INTO moat_essay_examples (
  student_id, college_name, prompt_type, admission_year,
  essay_text, themes, writing_quality, word_count,
  student_admitted, student_enrolled,
  analysis_notes, key_takeaways,
  created_at, updated_at
) VALUES (
  'huda-2025',
  'Stanford University',
  'common_app',
  2025,
  $$Teaching Sunday School wasn't what I expected to include in my college application. But creating a coding curriculum for young Muslim girls showed me that impact isn't about scale—it's about depth. Watching a 10-year-old's eyes light up when her first program ran taught me more about education than any classroom ever could...$$,
  ARRAY['passion', 'community'],
  'excellent',
  52,
  true,
  true,
  $$Extracted from Week W015 coaching session on 2023-10-23. Student successfully admitted to Stanford, MIT, Berkeley.$$,
  ARRAY['Authentic voice', 'Cultural identity', 'Intellectual curiosity', 'Technical depth'],
  '2023-10-23'::timestamptz,
  now()
) ON CONFLICT (student_id, college_name, prompt_type) DO NOTHING;


INSERT INTO moat_essay_examples (
  student_id, college_name, prompt_type, admission_year,
  essay_text, themes, writing_quality, word_count,
  student_admitted, student_enrolled,
  analysis_notes, key_takeaways,
  created_at, updated_at
) VALUES (
  'huda-2025',
  'Stanford University',
  'common_app',
  2025,
  $$My mother's hands moved swiftly across the keyboard, translating Arabic documents for refugee families in our community. Watching her bridge two worlds—one rooted in our Muslim heritage, the other in technological innovation—I realized that my passion for computer science wasn't separate from my cultural identity, but deeply intertwined with it...$$,
  ARRAY['identity', 'family', 'passion', 'community'],
  'excellent',
  50,
  true,
  true,
  $$Extracted from Week W021 coaching session on 2023-12-10. Student successfully admitted to Stanford, MIT, Berkeley.$$,
  ARRAY['Authentic voice', 'Cultural identity', 'Intellectual curiosity', 'Technical depth'],
  '2023-12-10'::timestamptz,
  now()
) ON CONFLICT (student_id, college_name, prompt_type) DO NOTHING;


INSERT INTO moat_essay_examples (
  student_id, college_name, prompt_type, admission_year,
  essay_text, themes, writing_quality, word_count,
  student_admitted, student_enrolled,
  analysis_notes, key_takeaways,
  created_at, updated_at
) VALUES (
  'huda-2025',
  'Stanford University',
  'common_app',
  2025,
  $$The first time I wrote a line of code that generated visual art, I understood: programming is storytelling. Each function, a plot point. Each variable, a character. My game about AI ethics wasn't just about teaching young girls to code—it was about giving them a new language to tell their stories...$$,
  ARRAY['identity', 'passion', 'community', 'creativity'],
  'excellent',
  51,
  true,
  true,
  $$Extracted from Week W022 coaching session on 2023-12-11. Student successfully admitted to Stanford, MIT, Berkeley.$$,
  ARRAY['Authentic voice', 'Cultural identity', 'Intellectual curiosity', 'Technical depth'],
  '2023-12-11'::timestamptz,
  now()
) ON CONFLICT (student_id, college_name, prompt_type) DO NOTHING;


INSERT INTO moat_essay_examples (
  student_id, college_name, prompt_type, admission_year,
  essay_text, themes, writing_quality, word_count,
  student_admitted, student_enrolled,
  analysis_notes, key_takeaways,
  created_at, updated_at
) VALUES (
  'huda-2025',
  'Stanford University',
  'common_app',
  2025,
  $$At the intersection of film and computer science, I found my voice. Not the voice I thought colleges wanted to hear, but the one that was authentically mine—technical yet creative, Muslim yet American, analytical yet emotional...$$,
  ARRAY['identity', 'passion'],
  'excellent',
  36,
  true,
  true,
  $$Extracted from Week W023 coaching session on 2023-12-17. Student successfully admitted to Stanford, MIT, Berkeley.$$,
  ARRAY['Authentic voice', 'Cultural identity', 'Intellectual curiosity', 'Technical depth'],
  '2023-12-17'::timestamptz,
  now()
) ON CONFLICT (student_id, college_name, prompt_type) DO NOTHING;


INSERT INTO moat_essay_examples (
  student_id, college_name, prompt_type, admission_year,
  essay_text, themes, writing_quality, word_count,
  student_admitted, student_enrolled,
  analysis_notes, key_takeaways,
  created_at, updated_at
) VALUES (
  'huda-2025',
  'Stanford University',
  'common_app',
  2025,
  $$My mother's hands moved swiftly across the keyboard, translating Arabic documents for refugee families in our community. Watching her bridge two worlds—one rooted in our Muslim heritage, the other in technological innovation—I realized that my passion for computer science wasn't separate from my cultural identity, but deeply intertwined with it...$$,
  ARRAY['identity', 'family', 'passion', 'community'],
  'excellent',
  50,
  true,
  true,
  $$Extracted from Week W032 coaching session on 2024-02-03. Student successfully admitted to Stanford, MIT, Berkeley.$$,
  ARRAY['Authentic voice', 'Cultural identity', 'Intellectual curiosity', 'Technical depth'],
  '2024-02-03'::timestamptz,
  now()
) ON CONFLICT (student_id, college_name, prompt_type) DO NOTHING;


INSERT INTO moat_essay_examples (
  student_id, college_name, prompt_type, admission_year,
  essay_text, themes, writing_quality, word_count,
  student_admitted, student_enrolled,
  analysis_notes, key_takeaways,
  created_at, updated_at
) VALUES (
  'huda-2025',
  'Stanford University',
  'common_app',
  2025,
  $$Teaching Sunday School wasn't what I expected to include in my college application. But creating a coding curriculum for young Muslim girls showed me that impact isn't about scale—it's about depth. Watching a 10-year-old's eyes light up when her first program ran taught me more about education than any classroom ever could...$$,
  ARRAY['passion', 'community'],
  'excellent',
  52,
  true,
  true,
  $$Extracted from Week W033 coaching session on 2024-02-10. Student successfully admitted to Stanford, MIT, Berkeley.$$,
  ARRAY['Authentic voice', 'Cultural identity', 'Intellectual curiosity', 'Technical depth'],
  '2024-02-10'::timestamptz,
  now()
) ON CONFLICT (student_id, college_name, prompt_type) DO NOTHING;


INSERT INTO moat_essay_examples (
  student_id, college_name, prompt_type, admission_year,
  essay_text, themes, writing_quality, word_count,
  student_admitted, student_enrolled,
  analysis_notes, key_takeaways,
  created_at, updated_at
) VALUES (
  'huda-2025',
  'Stanford University',
  'common_app',
  2025,
  $$At the intersection of film and computer science, I found my voice. Not the voice I thought colleges wanted to hear, but the one that was authentically mine—technical yet creative, Muslim yet American, analytical yet emotional...$$,
  ARRAY['resilience', 'passion'],
  'excellent',
  36,
  true,
  true,
  $$Extracted from Week W034 coaching session on 2024-02-21. Student successfully admitted to Stanford, MIT, Berkeley.$$,
  ARRAY['Authentic voice', 'Cultural identity', 'Intellectual curiosity', 'Technical depth'],
  '2024-02-21'::timestamptz,
  now()
) ON CONFLICT (student_id, college_name, prompt_type) DO NOTHING;


INSERT INTO moat_essay_examples (
  student_id, college_name, prompt_type, admission_year,
  essay_text, themes, writing_quality, word_count,
  student_admitted, student_enrolled,
  analysis_notes, key_takeaways,
  created_at, updated_at
) VALUES (
  'huda-2025',
  'Stanford University',
  'common_app',
  2025,
  $$The first time I wrote a line of code that generated visual art, I understood: programming is storytelling. Each function, a plot point. Each variable, a character. My game about AI ethics wasn't just about teaching young girls to code—it was about giving them a new language to tell their stories...$$,
  ARRAY['family', 'resilience', 'passion', 'community', 'creativity'],
  'excellent',
  51,
  true,
  true,
  $$Extracted from Week W038 coaching session on 2024-03-10. Student successfully admitted to Stanford, MIT, Berkeley.$$,
  ARRAY['Authentic voice', 'Cultural identity', 'Intellectual curiosity', 'Technical depth'],
  '2024-03-10'::timestamptz,
  now()
) ON CONFLICT (student_id, college_name, prompt_type) DO NOTHING;


INSERT INTO moat_essay_examples (
  student_id, college_name, prompt_type, admission_year,
  essay_text, themes, writing_quality, word_count,
  student_admitted, student_enrolled,
  analysis_notes, key_takeaways,
  created_at, updated_at
) VALUES (
  'huda-2025',
  'Stanford University',
  'common_app',
  2025,
  $$My mother's hands moved swiftly across the keyboard, translating Arabic documents for refugee families in our community. Watching her bridge two worlds—one rooted in our Muslim heritage, the other in technological innovation—I realized that my passion for computer science wasn't separate from my cultural identity, but deeply intertwined with it...$$,
  ARRAY['identity', 'family', 'passion', 'community', 'creativity'],
  'excellent',
  50,
  true,
  true,
  $$Extracted from Week W039 coaching session on 2024-03-20. Student successfully admitted to Stanford, MIT, Berkeley.$$,
  ARRAY['Authentic voice', 'Cultural identity', 'Intellectual curiosity', 'Technical depth'],
  '2024-03-20'::timestamptz,
  now()
) ON CONFLICT (student_id, college_name, prompt_type) DO NOTHING;


INSERT INTO moat_essay_examples (
  student_id, college_name, prompt_type, admission_year,
  essay_text, themes, writing_quality, word_count,
  student_admitted, student_enrolled,
  analysis_notes, key_takeaways,
  created_at, updated_at
) VALUES (
  'huda-2025',
  'Stanford University',
  'common_app',
  2025,
  $$The first time I wrote a line of code that generated visual art, I understood: programming is storytelling. Each function, a plot point. Each variable, a character. My game about AI ethics wasn't just about teaching young girls to code—it was about giving them a new language to tell their stories...$$,
  ARRAY['identity', 'passion', 'community', 'creativity'],
  'excellent',
  51,
  true,
  true,
  $$Extracted from Week W041 coaching session on 2024-04-05. Student successfully admitted to Stanford, MIT, Berkeley.$$,
  ARRAY['Authentic voice', 'Cultural identity', 'Intellectual curiosity', 'Technical depth'],
  '2024-04-05'::timestamptz,
  now()
) ON CONFLICT (student_id, college_name, prompt_type) DO NOTHING;


INSERT INTO moat_essay_examples (
  student_id, college_name, prompt_type, admission_year,
  essay_text, themes, writing_quality, word_count,
  student_admitted, student_enrolled,
  analysis_notes, key_takeaways,
  created_at, updated_at
) VALUES (
  'huda-2025',
  'Stanford University',
  'common_app',
  2025,
  $$My mother's hands moved swiftly across the keyboard, translating Arabic documents for refugee families in our community. Watching her bridge two worlds—one rooted in our Muslim heritage, the other in technological innovation—I realized that my passion for computer science wasn't separate from my cultural identity, but deeply intertwined with it...$$,
  ARRAY['identity', 'family', 'passion', 'creativity'],
  'excellent',
  50,
  true,
  true,
  $$Extracted from Week W057 coaching session on 2024-07-24. Student successfully admitted to Stanford, MIT, Berkeley.$$,
  ARRAY['Authentic voice', 'Cultural identity', 'Intellectual curiosity', 'Technical depth'],
  '2024-07-24'::timestamptz,
  now()
) ON CONFLICT (student_id, college_name, prompt_type) DO NOTHING;


INSERT INTO moat_essay_examples (
  student_id, college_name, prompt_type, admission_year,
  essay_text, themes, writing_quality, word_count,
  student_admitted, student_enrolled,
  analysis_notes, key_takeaways,
  created_at, updated_at
) VALUES (
  'huda-2025',
  'Stanford University',
  'common_app',
  2025,
  $$The first time I wrote a line of code that generated visual art, I understood: programming is storytelling. Each function, a plot point. Each variable, a character. My game about AI ethics wasn't just about teaching young girls to code—it was about giving them a new language to tell their stories...$$,
  ARRAY['identity', 'passion', 'community', 'creativity'],
  'excellent',
  51,
  true,
  true,
  $$Extracted from Week W058 coaching session on 2024-07-27. Student successfully admitted to Stanford, MIT, Berkeley.$$,
  ARRAY['Authentic voice', 'Cultural identity', 'Intellectual curiosity', 'Technical depth'],
  '2024-07-27'::timestamptz,
  now()
) ON CONFLICT (student_id, college_name, prompt_type) DO NOTHING;


INSERT INTO moat_essay_examples (
  student_id, college_name, prompt_type, admission_year,
  essay_text, themes, writing_quality, word_count,
  student_admitted, student_enrolled,
  analysis_notes, key_takeaways,
  created_at, updated_at
) VALUES (
  'huda-2025',
  'Stanford University',
  'common_app',
  2025,
  $$My mother's hands moved swiftly across the keyboard, translating Arabic documents for refugee families in our community. Watching her bridge two worlds—one rooted in our Muslim heritage, the other in technological innovation—I realized that my passion for computer science wasn't separate from my cultural identity, but deeply intertwined with it...$$,
  ARRAY['identity', 'family', 'passion', 'creativity'],
  'excellent',
  50,
  true,
  true,
  $$Extracted from Week W059 coaching session on 2024-07-31. Student successfully admitted to Stanford, MIT, Berkeley.$$,
  ARRAY['Authentic voice', 'Cultural identity', 'Intellectual curiosity', 'Technical depth'],
  '2024-07-31'::timestamptz,
  now()
) ON CONFLICT (student_id, college_name, prompt_type) DO NOTHING;


INSERT INTO moat_essay_examples (
  student_id, college_name, prompt_type, admission_year,
  essay_text, themes, writing_quality, word_count,
  student_admitted, student_enrolled,
  analysis_notes, key_takeaways,
  created_at, updated_at
) VALUES (
  'huda-2025',
  'Stanford University',
  'common_app',
  2025,
  $$My mother's hands moved swiftly across the keyboard, translating Arabic documents for refugee families in our community. Watching her bridge two worlds—one rooted in our Muslim heritage, the other in technological innovation—I realized that my passion for computer science wasn't separate from my cultural identity, but deeply intertwined with it...$$,
  ARRAY['identity', 'family', 'resilience', 'passion', 'creativity'],
  'excellent',
  50,
  true,
  true,
  $$Extracted from Week W063 coaching session on 2024-08-23. Student successfully admitted to Stanford, MIT, Berkeley.$$,
  ARRAY['Authentic voice', 'Cultural identity', 'Intellectual curiosity', 'Technical depth'],
  '2024-08-23'::timestamptz,
  now()
) ON CONFLICT (student_id, college_name, prompt_type) DO NOTHING;


INSERT INTO moat_essay_examples (
  student_id, college_name, prompt_type, admission_year,
  essay_text, themes, writing_quality, word_count,
  student_admitted, student_enrolled,
  analysis_notes, key_takeaways,
  created_at, updated_at
) VALUES (
  'huda-2025',
  'Stanford University',
  'common_app',
  2025,
  $$My mother's hands moved swiftly across the keyboard, translating Arabic documents for refugee families in our community. Watching her bridge two worlds—one rooted in our Muslim heritage, the other in technological innovation—I realized that my passion for computer science wasn't separate from my cultural identity, but deeply intertwined with it...$$,
  ARRAY['identity', 'family', 'passion', 'community'],
  'excellent',
  50,
  true,
  true,
  $$Extracted from Week W066 coaching session on 2024-09-09. Student successfully admitted to Stanford, MIT, Berkeley.$$,
  ARRAY['Authentic voice', 'Cultural identity', 'Intellectual curiosity', 'Technical depth'],
  '2024-09-09'::timestamptz,
  now()
) ON CONFLICT (student_id, college_name, prompt_type) DO NOTHING;


INSERT INTO moat_essay_examples (
  student_id, college_name, prompt_type, admission_year,
  essay_text, themes, writing_quality, word_count,
  student_admitted, student_enrolled,
  analysis_notes, key_takeaways,
  created_at, updated_at
) VALUES (
  'huda-2025',
  'Stanford University',
  'common_app',
  2025,
  $$My mother's hands moved swiftly across the keyboard, translating Arabic documents for refugee families in our community. Watching her bridge two worlds—one rooted in our Muslim heritage, the other in technological innovation—I realized that my passion for computer science wasn't separate from my cultural identity, but deeply intertwined with it...$$,
  ARRAY['identity', 'family', 'passion', 'creativity'],
  'excellent',
  50,
  true,
  true,
  $$Extracted from Week W067 coaching session on 2024-09-16. Student successfully admitted to Stanford, MIT, Berkeley.$$,
  ARRAY['Authentic voice', 'Cultural identity', 'Intellectual curiosity', 'Technical depth'],
  '2024-09-16'::timestamptz,
  now()
) ON CONFLICT (student_id, college_name, prompt_type) DO NOTHING;


INSERT INTO moat_essay_examples (
  student_id, college_name, prompt_type, admission_year,
  essay_text, themes, writing_quality, word_count,
  student_admitted, student_enrolled,
  analysis_notes, key_takeaways,
  created_at, updated_at
) VALUES (
  'huda-2025',
  'Stanford University',
  'common_app',
  2025,
  $$The first time I wrote a line of code that generated visual art, I understood: programming is storytelling. Each function, a plot point. Each variable, a character. My game about AI ethics wasn't just about teaching young girls to code—it was about giving them a new language to tell their stories...$$,
  ARRAY['identity', 'passion', 'creativity'],
  'excellent',
  51,
  true,
  true,
  $$Extracted from Week W068 coaching session on 2024-09-30. Student successfully admitted to Stanford, MIT, Berkeley.$$,
  ARRAY['Authentic voice', 'Cultural identity', 'Intellectual curiosity', 'Technical depth'],
  '2024-09-30'::timestamptz,
  now()
) ON CONFLICT (student_id, college_name, prompt_type) DO NOTHING;


INSERT INTO moat_essay_examples (
  student_id, college_name, prompt_type, admission_year,
  essay_text, themes, writing_quality, word_count,
  student_admitted, student_enrolled,
  analysis_notes, key_takeaways,
  created_at, updated_at
) VALUES (
  'huda-2025',
  'Stanford University',
  'common_app',
  2025,
  $$The first time I wrote a line of code that generated visual art, I understood: programming is storytelling. Each function, a plot point. Each variable, a character. My game about AI ethics wasn't just about teaching young girls to code—it was about giving them a new language to tell their stories...$$,
  ARRAY['identity', 'resilience', 'passion', 'community', 'creativity'],
  'excellent',
  51,
  true,
  true,
  $$Extracted from Week W076 coaching session on 2024-10-01. Student successfully admitted to Stanford, MIT, Berkeley.$$,
  ARRAY['Authentic voice', 'Cultural identity', 'Intellectual curiosity', 'Technical depth'],
  '2024-10-01'::timestamptz,
  now()
) ON CONFLICT (student_id, college_name, prompt_type) DO NOTHING;


INSERT INTO moat_essay_examples (
  student_id, college_name, prompt_type, admission_year,
  essay_text, themes, writing_quality, word_count,
  student_admitted, student_enrolled,
  analysis_notes, key_takeaways,
  created_at, updated_at
) VALUES (
  'huda-2025',
  'Stanford University',
  'common_app',
  2025,
  $$My mother's hands moved swiftly across the keyboard, translating Arabic documents for refugee families in our community. Watching her bridge two worlds—one rooted in our Muslim heritage, the other in technological innovation—I realized that my passion for computer science wasn't separate from my cultural identity, but deeply intertwined with it...$$,
  ARRAY['identity', 'family', 'passion', 'creativity'],
  'excellent',
  50,
  true,
  true,
  $$Extracted from Week W069 coaching session on 2024-10-02. Student successfully admitted to Stanford, MIT, Berkeley.$$,
  ARRAY['Authentic voice', 'Cultural identity', 'Intellectual curiosity', 'Technical depth'],
  '2024-10-02'::timestamptz,
  now()
) ON CONFLICT (student_id, college_name, prompt_type) DO NOTHING;


INSERT INTO moat_essay_examples (
  student_id, college_name, prompt_type, admission_year,
  essay_text, themes, writing_quality, word_count,
  student_admitted, student_enrolled,
  analysis_notes, key_takeaways,
  created_at, updated_at
) VALUES (
  'huda-2025',
  'Stanford University',
  'uc_piq',
  2025,
  $$The first time I wrote a line of code that generated visual art, I understood: programming is storytelling. Each function, a plot point. Each variable, a character. My game about AI ethics wasn't just about teaching young girls to code—it was about giving them a new language to tell their stories...$$,
  ARRAY['passion', 'community', 'creativity'],
  'excellent',
  51,
  true,
  true,
  $$Extracted from Week W070 coaching session on 2024-10-05. Student successfully admitted to Stanford, MIT, Berkeley.$$,
  ARRAY['Authentic voice', 'Cultural identity', 'Intellectual curiosity', 'Technical depth'],
  '2024-10-05'::timestamptz,
  now()
) ON CONFLICT (student_id, college_name, prompt_type) DO NOTHING;


INSERT INTO moat_essay_examples (
  student_id, college_name, prompt_type, admission_year,
  essay_text, themes, writing_quality, word_count,
  student_admitted, student_enrolled,
  analysis_notes, key_takeaways,
  created_at, updated_at
) VALUES (
  'huda-2025',
  'Stanford University',
  'supplemental',
  2025,
  $$Teaching Sunday School wasn't what I expected to include in my college application. But creating a coding curriculum for young Muslim girls showed me that impact isn't about scale—it's about depth. Watching a 10-year-old's eyes light up when her first program ran taught me more about education than any classroom ever could...$$,
  ARRAY['family', 'resilience', 'passion', 'community'],
  'excellent',
  52,
  true,
  true,
  $$Extracted from Week W071 coaching session on 2024-10-06. Student successfully admitted to Stanford, MIT, Berkeley.$$,
  ARRAY['Authentic voice', 'Cultural identity', 'Intellectual curiosity', 'Technical depth'],
  '2024-10-06'::timestamptz,
  now()
) ON CONFLICT (student_id, college_name, prompt_type) DO NOTHING;


INSERT INTO moat_essay_examples (
  student_id, college_name, prompt_type, admission_year,
  essay_text, themes, writing_quality, word_count,
  student_admitted, student_enrolled,
  analysis_notes, key_takeaways,
  created_at, updated_at
) VALUES (
  'huda-2025',
  'Stanford University',
  'common_app',
  2025,
  $$At the intersection of film and computer science, I found my voice. Not the voice I thought colleges wanted to hear, but the one that was authentically mine—technical yet creative, Muslim yet American, analytical yet emotional...$$,
  ARRAY['family', 'passion'],
  'excellent',
  36,
  true,
  true,
  $$Extracted from Week W072 coaching session on 2024-10-06. Student successfully admitted to Stanford, MIT, Berkeley.$$,
  ARRAY['Authentic voice', 'Cultural identity', 'Intellectual curiosity', 'Technical depth'],
  '2024-10-06'::timestamptz,
  now()
) ON CONFLICT (student_id, college_name, prompt_type) DO NOTHING;


INSERT INTO moat_essay_examples (
  student_id, college_name, prompt_type, admission_year,
  essay_text, themes, writing_quality, word_count,
  student_admitted, student_enrolled,
  analysis_notes, key_takeaways,
  created_at, updated_at
) VALUES (
  'huda-2025',
  'Stanford University',
  'common_app',
  2025,
  $$My mother's hands moved swiftly across the keyboard, translating Arabic documents for refugee families in our community. Watching her bridge two worlds—one rooted in our Muslim heritage, the other in technological innovation—I realized that my passion for computer science wasn't separate from my cultural identity, but deeply intertwined with it...$$,
  ARRAY['identity', 'family', 'passion'],
  'excellent',
  50,
  true,
  true,
  $$Extracted from Week W073 coaching session on 2024-10-07. Student successfully admitted to Stanford, MIT, Berkeley.$$,
  ARRAY['Authentic voice', 'Cultural identity', 'Intellectual curiosity', 'Technical depth'],
  '2024-10-07'::timestamptz,
  now()
) ON CONFLICT (student_id, college_name, prompt_type) DO NOTHING;


INSERT INTO moat_essay_examples (
  student_id, college_name, prompt_type, admission_year,
  essay_text, themes, writing_quality, word_count,
  student_admitted, student_enrolled,
  analysis_notes, key_takeaways,
  created_at, updated_at
) VALUES (
  'huda-2025',
  'Stanford University',
  'common_app',
  2025,
  $$My mother's hands moved swiftly across the keyboard, translating Arabic documents for refugee families in our community. Watching her bridge two worlds—one rooted in our Muslim heritage, the other in technological innovation—I realized that my passion for computer science wasn't separate from my cultural identity, but deeply intertwined with it...$$,
  ARRAY['identity', 'family', 'passion'],
  'excellent',
  50,
  true,
  true,
  $$Extracted from Week W074 coaching session on 2024-10-09. Student successfully admitted to Stanford, MIT, Berkeley.$$,
  ARRAY['Authentic voice', 'Cultural identity', 'Intellectual curiosity', 'Technical depth'],
  '2024-10-09'::timestamptz,
  now()
) ON CONFLICT (student_id, college_name, prompt_type) DO NOTHING;


INSERT INTO moat_essay_examples (
  student_id, college_name, prompt_type, admission_year,
  essay_text, themes, writing_quality, word_count,
  student_admitted, student_enrolled,
  analysis_notes, key_takeaways,
  created_at, updated_at
) VALUES (
  'huda-2025',
  'Stanford University',
  'common_app',
  2025,
  $$The first time I wrote a line of code that generated visual art, I understood: programming is storytelling. Each function, a plot point. Each variable, a character. My game about AI ethics wasn't just about teaching young girls to code—it was about giving them a new language to tell their stories...$$,
  ARRAY['family', 'passion', 'creativity'],
  'excellent',
  51,
  true,
  true,
  $$Extracted from Week W075 coaching session on 2024-10-12. Student successfully admitted to Stanford, MIT, Berkeley.$$,
  ARRAY['Authentic voice', 'Cultural identity', 'Intellectual curiosity', 'Technical depth'],
  '2024-10-12'::timestamptz,
  now()
) ON CONFLICT (student_id, college_name, prompt_type) DO NOTHING;


INSERT INTO moat_essay_examples (
  student_id, college_name, prompt_type, admission_year,
  essay_text, themes, writing_quality, word_count,
  student_admitted, student_enrolled,
  analysis_notes, key_takeaways,
  created_at, updated_at
) VALUES (
  'huda-2025',
  'Stanford University',
  'common_app',
  2025,
  $$The first time I wrote a line of code that generated visual art, I understood: programming is storytelling. Each function, a plot point. Each variable, a character. My game about AI ethics wasn't just about teaching young girls to code—it was about giving them a new language to tell their stories...$$,
  ARRAY['identity', 'passion', 'creativity'],
  'excellent',
  51,
  true,
  true,
  $$Extracted from Week W078 coaching session on 2024-10-17. Student successfully admitted to Stanford, MIT, Berkeley.$$,
  ARRAY['Authentic voice', 'Cultural identity', 'Intellectual curiosity', 'Technical depth'],
  '2024-10-17'::timestamptz,
  now()
) ON CONFLICT (student_id, college_name, prompt_type) DO NOTHING;


INSERT INTO moat_essay_examples (
  student_id, college_name, prompt_type, admission_year,
  essay_text, themes, writing_quality, word_count,
  student_admitted, student_enrolled,
  analysis_notes, key_takeaways,
  created_at, updated_at
) VALUES (
  'huda-2025',
  'Stanford University',
  'common_app',
  2025,
  $$My mother's hands moved swiftly across the keyboard, translating Arabic documents for refugee families in our community. Watching her bridge two worlds—one rooted in our Muslim heritage, the other in technological innovation—I realized that my passion for computer science wasn't separate from my cultural identity, but deeply intertwined with it...$$,
  ARRAY['identity', 'family', 'passion', 'community', 'creativity'],
  'excellent',
  50,
  true,
  true,
  $$Extracted from Week W079 coaching session on 2024-10-22. Student successfully admitted to Stanford, MIT, Berkeley.$$,
  ARRAY['Authentic voice', 'Cultural identity', 'Intellectual curiosity', 'Technical depth'],
  '2024-10-22'::timestamptz,
  now()
) ON CONFLICT (student_id, college_name, prompt_type) DO NOTHING;


INSERT INTO moat_essay_examples (
  student_id, college_name, prompt_type, admission_year,
  essay_text, themes, writing_quality, word_count,
  student_admitted, student_enrolled,
  analysis_notes, key_takeaways,
  created_at, updated_at
) VALUES (
  'huda-2025',
  'Stanford University',
  'uc_piq',
  2025,
  $$At the intersection of film and computer science, I found my voice. Not the voice I thought colleges wanted to hear, but the one that was authentically mine—technical yet creative, Muslim yet American, analytical yet emotional...$$,
  ARRAY['passion'],
  'excellent',
  36,
  true,
  true,
  $$Extracted from Week W081 coaching session on 2024-10-29. Student successfully admitted to Stanford, MIT, Berkeley.$$,
  ARRAY['Authentic voice', 'Cultural identity', 'Intellectual curiosity', 'Technical depth'],
  '2024-10-29'::timestamptz,
  now()
) ON CONFLICT (student_id, college_name, prompt_type) DO NOTHING;


INSERT INTO moat_essay_examples (
  student_id, college_name, prompt_type, admission_year,
  essay_text, themes, writing_quality, word_count,
  student_admitted, student_enrolled,
  analysis_notes, key_takeaways,
  created_at, updated_at
) VALUES (
  'huda-2025',
  'Stanford University',
  'uc_piq',
  2025,
  $$The first time I wrote a line of code that generated visual art, I understood: programming is storytelling. Each function, a plot point. Each variable, a character. My game about AI ethics wasn't just about teaching young girls to code—it was about giving them a new language to tell their stories...$$,
  ARRAY['identity', 'passion', 'creativity'],
  'excellent',
  51,
  true,
  true,
  $$Extracted from Week W083 coaching session on 2024-11-16. Student successfully admitted to Stanford, MIT, Berkeley.$$,
  ARRAY['Authentic voice', 'Cultural identity', 'Intellectual curiosity', 'Technical depth'],
  '2024-11-16'::timestamptz,
  now()
) ON CONFLICT (student_id, college_name, prompt_type) DO NOTHING;


INSERT INTO moat_essay_examples (
  student_id, college_name, prompt_type, admission_year,
  essay_text, themes, writing_quality, word_count,
  student_admitted, student_enrolled,
  analysis_notes, key_takeaways,
  created_at, updated_at
) VALUES (
  'huda-2025',
  'Stanford University',
  'uc_piq',
  2025,
  $$The first time I wrote a line of code that generated visual art, I understood: programming is storytelling. Each function, a plot point. Each variable, a character. My game about AI ethics wasn't just about teaching young girls to code—it was about giving them a new language to tell their stories...$$,
  ARRAY['passion', 'creativity'],
  'excellent',
  51,
  true,
  true,
  $$Extracted from Week W084 coaching session on 2024-11-20. Student successfully admitted to Stanford, MIT, Berkeley.$$,
  ARRAY['Authentic voice', 'Cultural identity', 'Intellectual curiosity', 'Technical depth'],
  '2024-11-20'::timestamptz,
  now()
) ON CONFLICT (student_id, college_name, prompt_type) DO NOTHING;


INSERT INTO moat_essay_examples (
  student_id, college_name, prompt_type, admission_year,
  essay_text, themes, writing_quality, word_count,
  student_admitted, student_enrolled,
  analysis_notes, key_takeaways,
  created_at, updated_at
) VALUES (
  'huda-2025',
  'Stanford University',
  'uc_piq',
  2025,
  $$My mother's hands moved swiftly across the keyboard, translating Arabic documents for refugee families in our community. Watching her bridge two worlds—one rooted in our Muslim heritage, the other in technological innovation—I realized that my passion for computer science wasn't separate from my cultural identity, but deeply intertwined with it...$$,
  ARRAY['identity', 'family', 'passion', 'community', 'creativity'],
  'excellent',
  50,
  true,
  true,
  $$Extracted from Week W087 coaching session on 2024-11-20. Student successfully admitted to Stanford, MIT, Berkeley.$$,
  ARRAY['Authentic voice', 'Cultural identity', 'Intellectual curiosity', 'Technical depth'],
  '2024-11-20'::timestamptz,
  now()
) ON CONFLICT (student_id, college_name, prompt_type) DO NOTHING;


INSERT INTO moat_essay_examples (
  student_id, college_name, prompt_type, admission_year,
  essay_text, themes, writing_quality, word_count,
  student_admitted, student_enrolled,
  analysis_notes, key_takeaways,
  created_at, updated_at
) VALUES (
  'huda-2025',
  'Stanford University',
  'uc_piq',
  2025,
  $$The first time I wrote a line of code that generated visual art, I understood: programming is storytelling. Each function, a plot point. Each variable, a character. My game about AI ethics wasn't just about teaching young girls to code—it was about giving them a new language to tell their stories...$$,
  ARRAY['passion', 'community', 'creativity'],
  'excellent',
  51,
  true,
  true,
  $$Extracted from Week W085 coaching session on 2024-11-21. Student successfully admitted to Stanford, MIT, Berkeley.$$,
  ARRAY['Authentic voice', 'Cultural identity', 'Intellectual curiosity', 'Technical depth'],
  '2024-11-21'::timestamptz,
  now()
) ON CONFLICT (student_id, college_name, prompt_type) DO NOTHING;


INSERT INTO moat_essay_examples (
  student_id, college_name, prompt_type, admission_year,
  essay_text, themes, writing_quality, word_count,
  student_admitted, student_enrolled,
  analysis_notes, key_takeaways,
  created_at, updated_at
) VALUES (
  'huda-2025',
  'Stanford University',
  'uc_piq',
  2025,
  $$My mother's hands moved swiftly across the keyboard, translating Arabic documents for refugee families in our community. Watching her bridge two worlds—one rooted in our Muslim heritage, the other in technological innovation—I realized that my passion for computer science wasn't separate from my cultural identity, but deeply intertwined with it...$$,
  ARRAY['identity', 'family', 'passion', 'creativity'],
  'excellent',
  50,
  true,
  true,
  $$Extracted from Week W088 coaching session on 2024-11-25. Student successfully admitted to Stanford, MIT, Berkeley.$$,
  ARRAY['Authentic voice', 'Cultural identity', 'Intellectual curiosity', 'Technical depth'],
  '2024-11-25'::timestamptz,
  now()
) ON CONFLICT (student_id, college_name, prompt_type) DO NOTHING;


INSERT INTO moat_essay_examples (
  student_id, college_name, prompt_type, admission_year,
  essay_text, themes, writing_quality, word_count,
  student_admitted, student_enrolled,
  analysis_notes, key_takeaways,
  created_at, updated_at
) VALUES (
  'huda-2025',
  'Stanford University',
  'common_app',
  2025,
  $$The first time I wrote a line of code that generated visual art, I understood: programming is storytelling. Each function, a plot point. Each variable, a character. My game about AI ethics wasn't just about teaching young girls to code—it was about giving them a new language to tell their stories...$$,
  ARRAY['identity', 'passion', 'community', 'creativity'],
  'excellent',
  51,
  true,
  true,
  $$Extracted from Week W086 coaching session on 2024-11-27. Student successfully admitted to Stanford, MIT, Berkeley.$$,
  ARRAY['Authentic voice', 'Cultural identity', 'Intellectual curiosity', 'Technical depth'],
  '2024-11-27'::timestamptz,
  now()
) ON CONFLICT (student_id, college_name, prompt_type) DO NOTHING;
