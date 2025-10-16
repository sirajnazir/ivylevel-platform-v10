-- ===============================
-- v4.6.1 Huda College & Scholarship Data Inserts
-- ===============================

-- College List Inserts
INSERT INTO college_list (student_id, college_name, bucket_category, decision_plan, decision_result, waitlist, program, supplements, location, acceptance_rate, interview_status)
VALUES
('huda-2025','Northwestern University','Reach','RD','Rejected',FALSE,NULL,NULL,'Illinois',7.2,NULL),
('huda-2025','UC Irvine','Reach','RD','Accepted',FALSE,'BS Game Design and Interactive Media',NULL,'California',20,NULL),
('huda-2025','UC San Diego','Reach','RD','Waitlisted',TRUE,'BS Cognitive Science, Machine Learning','4 essays','California',15.13,NULL),
('huda-2025','Carnegie Mellon University','Reach','RD','Waitlisted',TRUE,'Bachelor of Computer Science and Arts','3 essays','Pennsylvania',11.2,NULL),
('huda-2025','University of Pennsylvania','Reach','RD','Rejected',FALSE,'Cognitive Science','2 essays','Pennsylvania',5.13,NULL),
('huda-2025','New York University','Reach','RD','Waitlisted',TRUE,'BFA Game Design','1 essay','New York',8,NULL),
('huda-2025','Northeastern University','Reach','RD','Accepted',FALSE,'BFA Game Design','Common App','Massachusetts',7.5,NULL),
('huda-2025','MIT','Reach','RD','Rejected',FALSE,'Comparative Media Studies','None','Massachusetts',4,'Interviewed'),
('huda-2025','University of Southern California','Reach','EA','Accepted',FALSE,'B.S. Computer Science (Games)','2 essays','California',9.2,NULL),
('huda-2025','Stanford University','Reach','REA','Rejected',FALSE,'Science, Technology, Society','3 essays','California',4,'Optional'),
('huda-2025','UNC Chapel Hill','Match','EA','Accepted',FALSE,'Computer Science',NULL,'North Carolina',8.2,NULL),
('huda-2025','Georgia Tech','Match','RD','Waitlisted',TRUE,NULL,'1 essay','Georgia',10,NULL),
('huda-2025','Barnard University','Reach','RD','Waitlisted',TRUE,NULL,NULL,'New York',8,NULL),
('huda-2025','UC Davis','Match','RD','Accepted',FALSE,'BS Data Science',NULL,'California',36.4,NULL),
('huda-2025','UT Austin','Match','RD','Rejected',FALSE,NULL,NULL,'Texas',11.76,NULL),
('huda-2025','Harvard','Reach','RD','Rejected',FALSE,NULL,NULL,'Massachusetts',3.59,NULL),
('huda-2025','Brown','Reach','RD','Rejected',FALSE,NULL,NULL,'Rhode Island',5,NULL),
('huda-2025','Cornell','Reach','RD','Rejected',FALSE,NULL,NULL,'New York',7.5,NULL),
('huda-2025','Yale','Reach','RD','Rejected',FALSE,NULL,NULL,'Connecticut',3.7,NULL),
('huda-2025','Columbia','Reach','RD','Rejected',FALSE,NULL,NULL,'New York',4,NULL),
('huda-2025','Duke','Reach','RD','Rejected',FALSE,NULL,NULL,'North Carolina',5.1,NULL),
('huda-2025','UIUC','Match','EA','Accepted',FALSE,NULL,NULL,'Illinois',24,NULL),
('huda-2025','UC Berkeley','Reach','RD','Waitlisted',TRUE,'BA Data Science',NULL,'California',15,NULL),
('huda-2025','UC Riverside','Safety','RD','Accepted',FALSE,'BS Data Science',NULL,'California',70.3,NULL),
('huda-2025','UC Santa Cruz','Match','RD','Accepted',FALSE,'BS Computer Game Design',NULL,'California',61,NULL),
('huda-2025','UC Los Angeles','Reach','RD','Waitlisted',TRUE,'Data Science',NULL,'California',9.46,NULL),
('huda-2025','Cal Poly SLO','Match','RD','Waitlisted',TRUE,NULL,NULL,'California',29,NULL),
('huda-2025','SJSU','Safety','RD','Accepted',FALSE,NULL,NULL,'California',80,NULL);

-- Scholarships Inserts
INSERT INTO scholarships (student_id, scholarship_name, sponsor_org, amount_usd, application_status, decision_date, notes)
VALUES
('huda-2025','UIUC Chancellor''s Scholarship','University of Illinois',10000,'Accepted','2025-04-15','Merit-based tuition scholarship'),
('huda-2025','NCWIT Aspirations National Award','NCWIT',2500,'Accepted','2024-05-10','National award for computing excellence'),
('huda-2025','Presidential Volunteer Service Award','White House',0,'Accepted','2024-06-01','Recognition for volunteer service'),
('huda-2025','Cameron Impact Scholarship','Bryan Cameron Education Foundation',NULL,'Applied',NULL,'Full scholarship - submitted'),
('huda-2025','Amazon Future Engineer','Amazon',40000,'Applied','2024-12-19','STEM scholarship program'),
('huda-2025','Generation Google','Google',NULL,'Applied','2024-04-30','Computer science scholarship'),
('huda-2025','Girls Make Games','Girls Make Games',10000,'Applied','2024-05-31','Game development scholarship'),
('huda-2025','Elks Foundation Scholarship','Elks Foundation',NULL,'Applied','2024-11-12','Leadership and service scholarship'),
('huda-2025','Taco Bell Scholars','Taco Bell Foundation',NULL,'Applied','2025-01-08','Leadership scholarship'),
('huda-2025','Crowdstrike NextGen Scholarship','Crowdstrike',10000,'Applied',NULL,'Cybersecurity scholarship'),
('huda-2025','Women at Microsoft Scholarship','Microsoft',5000,'Applied','2025-01-31','Women in tech scholarship'),
('huda-2025','Coca-Cola Scholarship','Coca-Cola Scholars Foundation',NULL,'Applied',NULL,'Leadership and service scholarship'),
('huda-2025','Burger King Whopper Scholarship','Burger King Foundation',NULL,'Applied','2024-12-16','Scholarship for high school students'),
('huda-2025','Equitable Excellence Foundation','Equitable Foundation',20000,'Applied','2024-12-18','4-year scholarship ($5K/year)'),
('huda-2025','GE-Reagan Foundation','Reagan Foundation',40000,'Applied','2025-01-31','Leadership scholarship'),
('huda-2025','Lockheed Martin STEM Scholarship','Lockheed Martin',40000,'Applied','2025-04-30','STEM scholarship program'),
('huda-2025','ESA Game Development Scholarship','ESA Foundation',NULL,'Applied',NULL,'Game development scholarship'),
('huda-2025','Society for Women Engineers','SWE',NULL,'Applied',NULL,'Women in engineering scholarship'),
('huda-2025','Dr. Adawia Alousi STEM Scholarship','Alousi Foundation',10000,'Applied',NULL,'Muslim women in STEM'),
('huda-2025','SNC Women in STEM Scholarship','Sierra Nevada Corporation',7500,'Applied',NULL,'Women in STEM scholarship'),
('huda-2025','Navisite Scholarship','Navisite',10000,'Applied','2025-04-30','Technology scholarship'),
('huda-2025','Hyundai Women in STEM Scholarship','Hyundai',10000,'Applied',NULL,'Women in STEM scholarship');
