import { describe, test, expect, beforeAll } from '@jest/globals';
import fetch from 'node-fetch';

const API_URL = process.env.API_URL || 'http://localhost:4000';
const AGENT_URL = process.env.AGENT_URL || 'http://localhost:4101';

describe('Vitals Contract Tests', () => {
  describe('View Parameter Contract', () => {
    test('default view should allow unlimited ECs and awards', async () => {
      const response = await fetch(`${API_URL}/students/huda/state?view=default`);
      const data = await response.json();
      
      expect(response.ok).toBe(true);
      
      // Default view can have any number of ECs and awards
      if (data.ecs) {
        expect(Array.isArray(data.ecs)).toBe(true);
        // No upper limit enforced
      }
      
      if (data.awards) {
        expect(Array.isArray(data.awards)).toBe(true);
        // No upper limit enforced
      }
      
      // Should have college list
      expect(data.apps?.collegeList).toBeDefined();
      expect(Array.isArray(data.apps.collegeList)).toBe(true);
    });

    test('application view should return exactly 10 ECs and 5 awards', async () => {
      const response = await fetch(`${API_URL}/students/huda/state?view=application`);
      const data = await response.json();
      
      expect(response.ok).toBe(true);
      
      // Application view must have submitted subset
      expect(data.apps?.submitted).toBeDefined();
      expect(data.apps.submitted.ecs).toBeDefined();
      expect(data.apps.submitted.awards).toBeDefined();
      
      // Exactly 10 ECs
      expect(Array.isArray(data.apps.submitted.ecs)).toBe(true);
      expect(data.apps.submitted.ecs.length).toBe(10);
      
      // Exactly 5 awards
      expect(Array.isArray(data.apps.submitted.awards)).toBe(true);
      expect(data.apps.submitted.awards.length).toBe(5);
      
      // Each EC should have required fields
      data.apps.submitted.ecs.forEach((ec: any, index: number) => {
        expect(ec.id).toBeDefined();
        expect(ec.name).toBeDefined();
        expect(typeof ec.id).toBe('string');
        expect(typeof ec.name).toBe('string');
        expect(ec.id).toMatch(/^ec_/); // Should start with ec_
      });
      
      // Each award should have required fields
      data.apps.submitted.awards.forEach((award: any, index: number) => {
        expect(award.id).toBeDefined();
        expect(award.name).toBeDefined();
        expect(typeof award.id).toBe('string');
        expect(typeof award.name).toBe('string');
        expect(award.id).toMatch(/^award_/); // Should start with award_
      });
    });

    test('application view ECs should have position field', async () => {
      const response = await fetch(`${API_URL}/students/huda/state?view=application`);
      const data = await response.json();
      
      // Each EC in application view should have position
      data.apps.submitted.ecs.forEach((ec: any) => {
        expect(ec.position).toBeDefined();
        expect(typeof ec.position).toBe('string');
        expect(ec.position.length).toBeGreaterThan(0);
      });
    });

    test('application view awards should have level field', async () => {
      const response = await fetch(`${API_URL}/students/huda/state?view=application`);
      const data = await response.json();
      
      // Each award in application view should have level
      data.apps.submitted.awards.forEach((award: any) => {
        expect(award.level).toBeDefined();
        expect(['School', 'State', 'National', 'International']).toContain(award.level);
      });
    });

    test('both views should return same college list', async () => {
      const defaultResponse = await fetch(`${API_URL}/students/huda/state?view=default`);
      const defaultData = await defaultResponse.json();
      
      const appResponse = await fetch(`${API_URL}/students/huda/state?view=application`);
      const appData = await appResponse.json();
      
      // College list should be identical in both views
      expect(defaultData.apps?.collegeList).toEqual(appData.apps?.collegeList);
      expect(defaultData.apps?.collegeList?.length).toBe(28); // Known count
    });
  });

  describe('EC/Award ID Consistency', () => {
    test('EC IDs should follow naming convention', async () => {
      const response = await fetch(`${API_URL}/students/huda/state?view=application`);
      const data = await response.json();
      
      const validECIds = [
        'ec_empowering_ai',
        'ec_synthoria',
        'ec_folklift',
        'ec_yuvamanthan',
        'ec_coding_club',
        'ec_chess',
        'ec_math_circle',
        'ec_research',
        'ec_tedx',
        'ec_yearbook'
      ];
      
      data.apps.submitted.ecs.forEach((ec: any) => {
        expect(validECIds).toContain(ec.id);
      });
    });

    test('Award IDs should follow naming convention', async () => {
      const response = await fetch(`${API_URL}/students/huda/state?view=application`);
      const data = await response.json();
      
      const validAwardIds = [
        'award_ncwit',
        'award_sts',
        'award_congressional_app',
        'award_diamond',
        'award_ap_scholar'
      ];
      
      data.apps.submitted.awards.forEach((award: any) => {
        expect(validAwardIds).toContain(award.id);
      });
    });
  });
});

describe('Fact Guard Tests', () => {
  const factualQueries = [
    'What is my SAT score?',
    'What is my GPA?',
    'List my college decisions',
    'What awards did I win?',
    'What are my extracurricular activities?',
    'How many colleges did I apply to?',
    'Which colleges accepted me?',
    'What is my final SAT superscore?'
  ];

  const forbiddenPhrases = [
    "I don't have access",
    "I cannot access",
    "I don't have information",
    "I'm unable to see",
    "I cannot find",
    "not available to me",
    "don't have visibility",
    "cannot retrieve"
  ];

  factualQueries.forEach(query => {
    test(`should not hedge when asked: "${query}"`, async () => {
      const response = await fetch(`${AGENT_URL}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: 'huda',
          message: query
        })
      });

      const data = await response.json();
      expect(response.ok).toBe(true);
      expect(data.reply).toBeDefined();

      const replyLower = data.reply.toLowerCase();
      
      // Check for forbidden hedging phrases
      forbiddenPhrases.forEach(phrase => {
        expect(replyLower).not.toContain(phrase.toLowerCase());
      });

      // Should contain actual data
      if (query.includes('SAT')) {
        expect(data.reply).toMatch(/\d{3,4}/); // Should contain a number
      }
      if (query.includes('college')) {
        expect(data.reply.length).toBeGreaterThan(100); // Should be substantial
      }
    });
  });

  test('should provide specific numbers for SAT score', async () => {
    const response = await fetch(`${AGENT_URL}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: 'huda',
        message: 'What is my final SAT superscore?'
      })
    });

    const data = await response.json();
    expect(data.reply).toMatch(/1550/); // Known superscore
    expect(data.reply).not.toMatch(/I don't|I cannot/i);
  });

  test('should list all 28 colleges when asked for complete list', async () => {
    const response = await fetch(`${AGENT_URL}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: 'huda',
        message: 'What was my complete college list and the final decisions for each?'
      })
    });

    const data = await response.json();
    
    // Should mention specific colleges
    const expectedColleges = ['Northwestern', 'UC Irvine', 'MIT', 'Stanford', 'Harvard'];
    expectedColleges.forEach(college => {
      expect(data.reply).toContain(college);
    });

    // Should mention decisions
    expect(data.reply).toMatch(/ACCEPTED|REJECTED|WAITLISTED/);
    
    // Should have all 28 (count numbered list items)
    const numberedItems = data.reply.match(/\d+\./g) || [];
    expect(numberedItems.length).toBeGreaterThanOrEqual(28);
  });
});

describe('Evidence Citation Tests', () => {
  test('should cite evidence when discussing awards', async () => {
    const response = await fetch(`${AGENT_URL}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: 'huda',
        message: 'Where did we capture my NCWIT win?'
      })
    });

    const data = await response.json();
    
    // Should reference source or evidence
    const evidencePatterns = [
      /from your (vitals|records)/i,
      /captured in/i,
      /recorded in/i,
      /source:/i,
      /week \d+/i,
      /evidence/i
    ];

    const hasEvidence = evidencePatterns.some(pattern => pattern.test(data.reply));
    expect(hasEvidence).toBe(true);
  });

  test('factual responses should include evidence references', async () => {
    const factQueries = [
      'What activities show leadership?',
      'When did I take the SAT?',
      'Which awards did we target initially?'
    ];

    for (const query of factQueries) {
      const response = await fetch(`${AGENT_URL}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: 'huda',
          message: query
        })
      });

      const data = await response.json();
      
      // Should have some form of citation or reference
      const citationPatterns = [
        /according to/i,
        /from your/i,
        /in your/i,
        /shows? that/i,
        /indicates?/i,
        /records?/i,
        /vitals/i,
        /week \d+/i
      ];

      const hasCitation = citationPatterns.some(pattern => pattern.test(data.reply));
      expect(hasCitation).toBe(true);
    }
  });

  test('college list should reference vitals as source', async () => {
    const response = await fetch(`${AGENT_URL}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: 'huda',
        message: 'How do you know my college decisions?'
      })
    });

    const data = await response.json();
    
    // Should mention vitals or records as source
    expect(data.reply).toMatch(/vitals|records|captured|stored|database/i);
  });
});

describe('Data Integrity Tests', () => {
  test('SAT score should be consistent across queries', async () => {
    const queries = [
      'What is my SAT score?',
      'Tell me my final SAT superscore',
      'What SAT score did I achieve?'
    ];

    const scores: string[] = [];

    for (const query of queries) {
      const response = await fetch(`${AGENT_URL}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: 'huda',
          message: query
        })
      });

      const data = await response.json();
      const scoreMatch = data.reply.match(/\b(1\d{3})\b/);
      if (scoreMatch) {
        scores.push(scoreMatch[1]);
      }
    }

    // All queries should return the same SAT score
    expect(scores.length).toBe(queries.length);
    expect(new Set(scores).size).toBe(1); // All scores should be identical
    expect(scores[0]).toBe('1550'); // Known score
  });

  test('college acceptance count should be consistent', async () => {
    const response = await fetch(`${AGENT_URL}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: 'huda',
        message: 'How many colleges accepted me?'
      })
    });

    const data = await response.json();
    
    // Should mention the number 9 (known accepted count)
    expect(data.reply).toMatch(/\b9\b/);
    expect(data.reply).toContain('accepted');
  });
});