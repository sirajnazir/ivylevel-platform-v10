# IvyLevel v1.0 Multi-Agent Comprehensive Test Prompts

**Last Updated**: 2025-10-20
**Version**: v1.0
**Purpose**: Comprehensive test coverage for all 7 agents across CAT-1/CAT-2/CAT-3 query types

---

## Test Execution

### Quick Test (Automated)
```bash
cd /Users/snazir/ivylevel-platform-v10/services/agent-framework
/tmp/comprehensive_test_suite.sh
```

### Manual Testing
Use the prompts below in the Test Chat UI or via API to manually verify agent responses.

---

## Test Categories

### Category 1: CAT-1 Enumeration Queries (SQL-Only)

#### Awards
| Prompt | Expected Agent | Expected Tool | Expected Result |
|--------|---------------|---------------|-----------------|
| "which awards did I win?" | gameplan-agent | get_nsm_recognition | 6 awards (NCWIT National, NCWIT Regional, Games for Change, AP Scholar, MHHS CS, College Board Rural) |
| "list my awards" | gameplan-agent | get_nsm_recognition | Same as above |
| "what honors do I have?" | gameplan-agent | get_nsm_recognition | Same as above |
| "which awards am I targeting?" | gameplan-agent | get_awards_list (phase=initial) | Planned/targeted awards |

#### College List
| Prompt | Expected Agent | Expected Tool | Expected Result |
|--------|---------------|---------------|-----------------|
| "what is my college list?" | gameplan-agent | get_college_list | 28 colleges with status |
| "which colleges did I apply to?" | gameplan-agent | get_college_list | Same as above |
| "show me my college list" | gameplan-agent | get_college_list | Same as above |
| "which colleges accepted me?" | gameplan-agent | get_college_acceptances | 9 acceptances (Northeastern, SJSU, UC Davis, UCI, UCR, UCSC, UIUC, UNC, USC) |
| "where did I get in?" | gameplan-agent | get_college_acceptances | Same as above |
| "which college am I attending?" | gameplan-agent | get_college_attending | UIUC |
| "where am I going to college?" | gameplan-agent | get_college_attending | UIUC |
| "which colleges rejected me?" | gameplan-agent | get_college_list | 11 rejections (Brown, Columbia, Cornell, Duke, Harvard, MIT, Northwestern, Stanford, UPenn, UT Austin, Yale) |
| "which colleges waitlisted me?" | gameplan-agent | get_college_list | 8 waitlists (Barnard, CMU, Cal Poly SLO, Georgia Tech, NYU, UC Berkeley, UCLA, UCSD) |

#### Extracurricular Activities
| Prompt | Expected Agent | Expected Tool | Expected Result |
|--------|---------------|---------------|-----------------|
| "what are my extracurricular activities?" | gameplan-agent | get_nsm_leadership | List of ECs with leadership roles |
| "list my ECs" | gameplan-agent | get_ecs_list | Same as above |
| "what leadership positions do I have?" | gameplan-agent | get_nsm_leadership | President/founder roles highlighted |

#### Summer Programs
| Prompt | Expected Agent | Expected Tool | Expected Result |
|--------|---------------|---------------|-----------------|
| "which summer programs did I attend?" | gameplan-agent | get_nsm_program | JCamp (AAJA), Kode With Klossy |
| "list my summer programs" | gameplan-agent | get_programs_list | Same as above |

#### Academics
| Prompt | Expected Agent | Expected Tool | Expected Result |
|--------|---------------|---------------|-----------------|
| "what is my GPA?" | gameplan-agent | get_gpa | 4.00 UW / 4.70 W |
| "what is my SAT score?" | gameplan-agent | get_sat_scores | 1530 (EBRW: 730, Math: 800) |
| "what are my test scores?" | gameplan-agent | get_sat_scores | SAT 1530 |
| "show me my transcript" | gameplan-agent | get_transcript | Full course history |

---

### Category 2: CAT-2 Strategic Queries (SQL + LLM Synthesis)

#### GamePlan Strategy
| Prompt | Expected Agent | Expected Tool | Expected Result |
|--------|---------------|---------------|-----------------|
| "what should I focus on this month?" | gameplan-agent | get_game_plan | Prioritized action plan |
| "what's my game plan?" | gameplan-agent | get_game_plan | Strategic roadmap |
| "what should I work on next?" | gameplan-agent | get_game_plan | Next steps with deadlines |

#### Profile Analysis
| Prompt | Expected Agent | Expected Tool | Expected Result |
|--------|---------------|---------------|-----------------|
| "summarize my entire profile" | gameplan-agent | get_nsm_dashboard | Comprehensive profile with NSM scores |
| "how strong is my profile?" | gameplan-agent | get_nsm_dashboard | Profile assessment with metrics |
| "what are my strengths?" | gameplan-agent | get_nsm_dashboard | Recognition, leadership, academic metrics |
| "what am I missing in my profile?" | gameplan-agent | get_nsm_dashboard | Gap analysis |
| "what are my weaknesses?" | gameplan-agent | get_nsm_dashboard | Areas to improve |

#### College Chances Assessment
| Prompt | Expected Agent | Expected Tool | Expected Result |
|--------|---------------|---------------|-----------------|
| "what are my chances at Stanford?" | college-agent | get_college_benchmark | Data-driven chances assessment |
| "can I get into MIT?" | college-agent | get_college_benchmark | Benchmark comparison |
| "am I competitive for Harvard?" | college-agent | get_college_benchmark | Profile vs. school benchmarks |

#### Strategic Recommendations
| Prompt | Expected Agent | Expected Tool | Expected Result |
|--------|---------------|---------------|-----------------|
| "how can I improve my chances at top schools?" | gameplan-agent | get_nsm_dashboard, get_relevant_tactics | Action plan with tactics |
| "what should I add to my profile?" | gameplan-agent | get_nsm_dashboard | Strategic additions |

---

### Category 3: CAT-3 Conversational Queries (Pure LLM)

#### Emotional Support
| Prompt | Expected Agent | Expected Tool | Expected Result |
|--------|---------------|---------------|-----------------|
| "I'm feeling stressed about college applications" | gameplan-agent | None | Empathetic response with encouragement |
| "I'm overwhelmed with deadlines" | gameplan-agent | get_relevant_tactics | Support + time management tactics |
| "I don't think I'm good enough for top colleges" | gameplan-agent | None | Reassurance + reality check |

#### Encouragement
| Prompt | Expected Agent | Expected Tool | Expected Result |
|--------|---------------|---------------|-----------------|
| "I'm worried I won't get into any good colleges" | gameplan-agent | get_college_list | Perspective on existing acceptances |
| "am I doing enough?" | gameplan-agent | get_nsm_dashboard | Validation + guidance |

#### Celebration
| Prompt | Expected Agent | Expected Tool | Expected Result |
|--------|---------------|---------------|-----------------|
| "I just got accepted to my dream school!" | gameplan-agent | None | Celebration + next steps |
| "I won an award!" | gameplan-agent | None | Congratulations |

---

### Category 4: Specialist Agent Routing

#### Essay Agent
| Prompt | Expected Agent | Expected Tool | Expected Result |
|--------|---------------|---------------|-----------------|
| "help me brainstorm Common App essay topics" | essay-agent | None | Essay topic suggestions |
| "can you review my essay draft?" | essay-agent | search_essay_examples | Feedback + examples |
| "show me example essays about overcoming challenges" | essay-agent | search_essay_examples | Essay examples from DS6 |
| "what makes a good personal statement?" | essay-agent | get_ao_perspectives | AO insights from DS7 |

#### Admissions Agent
| Prompt | Expected Agent | Expected Tool | Expected Result |
|--------|---------------|---------------|-----------------|
| "what do admissions officers look for in ECs?" | admissions-agent | get_ao_perspectives | AO perspective on ECs |
| "how do AOs evaluate essays?" | admissions-agent | get_ao_perspectives | AO insights on essays |
| "what is holistic review?" | admissions-agent | get_ao_perspectives | Explanation with AO quotes |

#### College Agent
| Prompt | Expected Agent | Expected Tool | Expected Result |
|--------|---------------|---------------|-----------------|
| "compare Stanford and MIT for computer science" | college-agent | get_college_benchmark | Side-by-side comparison |
| "what does Harvard look for in applicants?" | college-agent | get_college_rubric | Harvard rubric factors |
| "what is the acceptance rate at MIT?" | college-agent | get_college_benchmark | Benchmark data |
| "students from my school who got into Stanford" | college-agent | get_placement_history | Hyperlocal data (DS3) |

#### ECs Agent
| Prompt | Expected Agent | Expected Tool | Expected Result |
|--------|---------------|---------------|-----------------|
| "how can I improve my leadership profile?" | ecs-agent | get_nsm_leadership, get_relevant_tactics | Leadership strategy |
| "what ECs should I add?" | ecs-agent | get_ecs_list | Strategic EC additions |
| "is my EC profile strong enough?" | ecs-agent | get_nsm_leadership | EC assessment |

#### Awards Agent
| Prompt | Expected Agent | Expected Tool | Expected Result |
|--------|---------------|---------------|-----------------|
| "which awards should I apply for?" | awards-agent | get_awards_list | Award recommendations |
| "how can I improve my awards profile?" | awards-agent | get_nsm_recognition | Awards strategy |
| "what awards are realistic for me?" | awards-agent | get_success_patterns | Data-driven suggestions |

#### Programs Agent
| Prompt | Expected Agent | Expected Tool | Expected Result |
|--------|---------------|---------------|-----------------|
| "which summer programs should I apply to for CS?" | programs-agent | get_programs_catalog | Program recommendations |
| "are there any good AI summer programs?" | programs-agent | get_programs_catalog | Filtered program list |

---

### Category 5: Multi-Dimensional Queries

#### Factual + Strategic
| Prompt | Expected Agent | Expected Tool | Expected Result |
|--------|---------------|---------------|-----------------|
| "what are my awards and which ones should I add?" | gameplan-agent | get_nsm_recognition | Current awards + recommendations |
| "show me my college list and tell me where I should go" | gameplan-agent | get_college_list, get_college_attending | List + decision guidance |

#### Profile + Advice
| Prompt | Expected Agent | Expected Tool | Expected Result |
|--------|---------------|---------------|-----------------|
| "show me my profile and tell me what to improve" | gameplan-agent | get_nsm_dashboard | Profile + gap analysis |
| "analyze my entire application" | gameplan-agent | get_nsm_dashboard | Comprehensive analysis |

#### Multiple Data Points
| Prompt | Expected Agent | Expected Tool | Expected Result |
|--------|---------------|---------------|-----------------|
| "what are my GPA, SAT, and awards?" | gameplan-agent | Multiple tools | All requested data |
| "show me all my achievements" | gameplan-agent | get_nsm_dashboard | Awards, ECs, programs, academics |

---

### Category 6: Knowledge Moat Queries

#### Tactics (DS-T1)
| Prompt | Expected Agent | Expected Tool | Expected Result |
|--------|---------------|---------------|-----------------|
| "I'm struggling with time management" | gameplan-agent | get_relevant_tactics | 168-Hour Framework tactic |
| "I keep procrastinating on essays" | gameplan-agent | get_relevant_tactics | Procrastination tactics |
| "how do I balance school and ECs?" | gameplan-agent | get_relevant_tactics | Balance tactics |

#### Success Patterns (DS-T2)
| Prompt | Expected Agent | Expected Tool | Expected Result |
|--------|---------------|---------------|-----------------|
| "show me students similar to me who got into top schools" | gameplan-agent | get_success_patterns | Similar student outcomes |
| "what worked for students like me?" | gameplan-agent | get_success_patterns | Success patterns |

#### Essay Examples (DS6)
| Prompt | Expected Agent | Expected Tool | Expected Result |
|--------|---------------|---------------|-----------------|
| "show me example essays about overcoming challenges" | essay-agent | search_essay_examples | Essay examples |
| "example Common App essays" | essay-agent | search_essay_examples | Essay corpus |

#### AO Perspectives (DS7)
| Prompt | Expected Agent | Expected Tool | Expected Result |
|--------|---------------|---------------|-----------------|
| "what do AOs look for in essays?" | admissions-agent | get_ao_perspectives | AO insights |
| "how do admissions officers evaluate ECs?" | admissions-agent | get_ao_perspectives | AO perspective |

#### College Data (DS1-DS5)
| Prompt | Expected Agent | Expected Tool | Expected Result |
|--------|---------------|---------------|-----------------|
| "what are the average stats for MIT admits?" | college-agent | get_college_benchmark | CDS data (DS1) |
| "what does Stanford value?" | college-agent | get_college_rubric | Rubric factors (DS2) |
| "students from my high school who got into Harvard" | college-agent | get_placement_history | School pipeline data (DS3) |
| "find students similar to me" | college-agent | find_similar_profiles | Twin profiles (DS5) |

---

### Category 7: Edge Cases & Error Handling

#### Empty/Invalid Input
| Prompt | Expected Agent | Expected Tool | Expected Result |
|--------|---------------|---------------|-----------------|
| "" (empty) | gameplan-agent | None | Prompt for question |
| "help" | gameplan-agent | None | General guidance |
| "hello" | gameplan-agent | None | Greeting + offer to help |

#### Ambiguous Queries
| Prompt | Expected Agent | Expected Tool | Expected Result |
|--------|---------------|---------------|-----------------|
| "tell me about my profile" | gameplan-agent | get_nsm_dashboard | Comprehensive overview |
| "what should I do?" | gameplan-agent | get_game_plan | Context-specific guidance |

#### Off-Topic Queries
| Prompt | Expected Agent | Expected Tool | Expected Result |
|--------|---------------|---------------|-----------------|
| "what's the weather today?" | gameplan-agent | None | Redirect to college admissions |
| "tell me a joke" | gameplan-agent | None | Polite redirect |

#### Complex Multi-Part Questions
| Prompt | Expected Agent | Expected Tool | Expected Result |
|--------|---------------|---------------|-----------------|
| "what are my awards, my GPA, and my college list?" | gameplan-agent | Multiple tools | All three data points |
| "show me everything about my profile and tell me what to improve" | gameplan-agent | get_nsm_dashboard | Comprehensive analysis |

#### Non-Existent Data
| Prompt | Expected Agent | Expected Tool | Expected Result |
|--------|---------------|---------------|-----------------|
| "did I get into Caltech?" | gameplan-agent | get_college_list | "You didn't apply to Caltech" |
| "what is my ACT score?" | gameplan-agent | get_sat_scores | "No ACT scores on record" |

#### Boundary Cases
| Prompt | Expected Agent | Expected Tool | Expected Result |
|--------|---------------|---------------|-----------------|
| "show me my top 3 awards" | gameplan-agent | get_nsm_recognition | Top 3 from 6 awards |
| "which colleges in California accepted me?" | gameplan-agent | get_college_acceptances | Filter CA schools (6 of 9) |

---

## Expected Response Patterns

### CAT-1 Response Pattern
```
Answer: [SQL data formatted as list/table]
Chips: [evidence chip with view/table name]
Hits: [raw SQL result rows]
Tools Called: [specific resolver tool]
```

### CAT-2 Response Pattern
```
Answer: [LLM synthesis of SQL facts with strategic advice]
Chips: [evidence + notice chips]
Hits: [SQL data + external knowledge]
Tools Called: [multiple tools possible]
```

### CAT-3 Response Pattern
```
Answer: [Pure LLM response with empathy/encouragement]
Chips: [minimal or none]
Hits: [none or minimal]
Tools Called: [none or tactics/patterns]
```

---

## Success Criteria

### Agent Routing
- ✅ 90%+ accuracy on routing to correct specialist agent
- ✅ GamePlan agent handles multi-dimensional queries
- ✅ Specialist agents stay in their domain

### Tool Calling
- ✅ CAT-1 queries ALWAYS call appropriate SQL tool
- ✅ CAT-2 queries call 1-3 tools for synthesis
- ✅ CAT-3 queries minimize tool calls (empathy-first)

### Data Accuracy
- ✅ Zero hallucinated facts for CAT-1 queries
- ✅ All numbers match database exactly
- ✅ Consistent results across multiple queries

### Response Quality
- ✅ Answers are relevant and complete
- ✅ Tone matches query type (factual/strategic/empathetic)
- ✅ Evidence chips show data source
- ✅ Response time < 10 seconds for 90% of queries

---

## Running the Test Suite

### Automated Test
```bash
# Run full test suite (40+ tests)
/tmp/comprehensive_test_suite.sh

# Expected output:
# ✅ PASSED: 40+ / 40+
# 🎉 ALL TESTS PASSED! System is production ready.
```

### Manual Testing via UI
1. Navigate to http://localhost:5173 (Test Chat UI)
2. Login as Huda (hudasir4j@gmail.com / password123)
3. Test prompts from each category above
4. Verify agent routing, tool calling, and response accuracy

### API Testing
```bash
TOKEN=$(cat /tmp/token.txt)
curl -X POST http://localhost:4101/api/agents/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"student_id": "huda-2025", "message": "YOUR_TEST_PROMPT"}' | python3 -m json.tool
```

---

## Maintenance

### Adding New Tests
1. Add prompt to appropriate category in this document
2. Add test case to `/tmp/comprehensive_test_suite.sh`
3. Document expected agent, tool, and result
4. Run full suite to verify no regressions

### Updating Expected Results
When database or agent logic changes:
1. Update expected results in this document
2. Update assertions in test suite
3. Re-run full suite
4. Update docs if tests reveal issues

---

**Last Review**: 2025-10-20
**Next Review**: When adding new agents or data sources
**Status**: ✅ All tests passing
