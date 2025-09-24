import { describe, test, expect, beforeAll } from '@jest/globals';
import fetch from 'node-fetch';

const API_URL = process.env.API_URL || 'http://localhost:4000';
const AGENT_URL = process.env.AGENT_URL || 'http://localhost:4101';
const STUDENT_ID = 'huda';

describe('v1.2 Opportunity Evaluation Suite', () => {
  
  // Ensure services are healthy
  beforeAll(async () => {
    const apiHealth = await fetch(`${API_URL}/health`);
    const agentHealth = await fetch(`${AGENT_URL}/health`);
    
    expect(apiHealth.ok).toBe(true);
    expect(agentHealth.ok).toBe(true);
  });

  describe('Opportunity Catalog', () => {
    test('should list available opportunities', async () => {
      const response = await fetch(`${API_URL}/opportunities`);
      const data = await response.json();
      
      expect(response.ok).toBe(true);
      expect(data.opportunities).toBeDefined();
      expect(Array.isArray(data.opportunities)).toBe(true);
      expect(data.total).toBeGreaterThan(0);
    });

    test('should filter opportunities by kind', async () => {
      const response = await fetch(`${API_URL}/opportunities?kind=summer`);
      const data = await response.json();
      
      expect(response.ok).toBe(true);
      data.opportunities.forEach(opp => {
        expect(opp.kind).toBe('summer');
      });
    });

    test('should filter by grade level', async () => {
      const response = await fetch(`${API_URL}/opportunities?grade_level=11`);
      const data = await response.json();
      
      expect(response.ok).toBe(true);
      data.opportunities.forEach(opp => {
        expect(opp.requirements.grade_levels).toContain('11');
      });
    });
  });

  describe('Opportunity Recommendations', () => {
    test('should get personalized recommendations', async () => {
      const response = await fetch(`${API_URL}/students/${STUDENT_ID}/opportunities/recommendations`);
      const data = await response.json();
      
      expect(response.ok).toBe(true);
      expect(data.student_id).toBe(STUDENT_ID);
      expect(data.recommendations_by_bucket).toBeDefined();
      expect(data.summary).toBeDefined();
      
      // Should have recommendations in different buckets
      const buckets = Object.keys(data.recommendations_by_bucket);
      expect(buckets.length).toBeGreaterThan(0);
    });

    test('should prioritize immediate action items', async () => {
      const response = await fetch(`${API_URL}/students/${STUDENT_ID}/opportunities/recommendations?buckets=immediate_action`);
      const data = await response.json();
      
      expect(response.ok).toBe(true);
      if (data.recommendations_by_bucket.immediate_action) {
        data.recommendations_by_bucket.immediate_action.forEach(opp => {
          // Check deadlines are within 2 weeks
          const deadline = new Date(opp.deadlines[0].date);
          const daysUntil = Math.floor((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          expect(daysUntil).toBeLessThan(15);
        });
      }
    });
  });

  describe('Bombardment Strategy', () => {
    test('should create bombardment episode', async () => {
      const response = await fetch(`${API_URL}/students/${STUDENT_ID}/opportunities/bombardment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trigger: { type: 'morale_drop' },
          size: 3
        })
      });
      
      const data = await response.json();
      
      expect(response.ok).toBe(true);
      expect(data.episode).toBeDefined();
      expect(data.opportunities).toBeDefined();
      expect(data.opportunities.length).toBeGreaterThan(0);
      expect(data.opportunities.length).toBeLessThanOrEqual(3);
      expect(data.strategy.rationale).toContain('confidence');
    });

    test('should exclude reach opportunities in morale boost', async () => {
      const response = await fetch(`${API_URL}/students/${STUDENT_ID}/opportunities/bombardment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trigger: { type: 'morale_drop' },
          size: 5,
          exclude_buckets: ['reach']
        })
      });
      
      const data = await response.json();
      
      expect(response.ok).toBe(true);
      data.opportunities.forEach(opp => {
        expect(opp.bucket).not.toBe('reach');
      });
    });
  });

  describe('Agent Opportunity Guidance', () => {
    test('should provide opportunity recommendations through agent', async () => {
      const response = await fetch(`${AGENT_URL}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: STUDENT_ID,
          message: 'What summer programs should I apply to?'
        })
      });
      
      const data = await response.json();
      
      expect(response.ok).toBe(true);
      expect(data.reply).toBeDefined();
      expect(data.reply.toLowerCase()).toContain('summer');
      expect(data.reply).toMatch(/deadline|application|apply/i);
    });

    test('should suggest bombardment after rejection', async () => {
      const response = await fetch(`${AGENT_URL}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: STUDENT_ID,
          message: 'I just got rejected from MIT PRIMES. What should I do now?'
        })
      });
      
      const data = await response.json();
      
      expect(response.ok).toBe(true);
      expect(data.reply).toBeDefined();
      // Should provide encouragement and alternatives
      expect(data.reply).toMatch(/alternative|other|option|opportunit/i);
      expect(data.reply.length).toBeGreaterThan(100); // Substantive response
    });

    test('should cite deadlines and commitments', async () => {
      const response = await fetch(`${AGENT_URL}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: STUDENT_ID,
          message: 'Tell me about research opportunities'
        })
      });
      
      const data = await response.json();
      
      expect(response.ok).toBe(true);
      expect(data.reply).toMatch(/deadline|week|hours|time|commitment/i);
    });
  });

  describe('Opportunity Discovery', () => {
    test('should discover new opportunities not yet scored', async () => {
      const response = await fetch(`${API_URL}/students/${STUDENT_ID}/opportunities/discover?limit=5`);
      const data = await response.json();
      
      expect(response.ok).toBe(true);
      expect(data.student_id).toBe(STUDENT_ID);
      expect(data.new_opportunities).toBeDefined();
      
      // If new opportunities found, they should be scored
      if (data.new_opportunities.length > 0) {
        data.new_opportunities.forEach(opp => {
          expect(opp.score).toBeDefined();
          expect(opp.bucket).toBeDefined();
          expect(opp.rationale).toBeDefined();
        });
      }
    });
  });

  describe('Vitals Integration', () => {
    test('should track applied opportunities in vitals', async () => {
      // First apply to an opportunity
      await fetch(`${API_URL}/observe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: STUDENT_ID,
          kind: 'OPPORTUNITY',
          subtype: 'APPLIED',
          value: { opportunity_id: 'test-opp-123' },
          source: 'test-suite',
          at: new Date().toISOString()
        })
      });

      // Check vitals
      const vitalsResponse = await fetch(`${API_URL}/students/${STUDENT_ID}/state`);
      const vitals = await vitalsResponse.json();
      
      expect(vitals.opportunities).toBeDefined();
      expect(vitals.opportunities.applied).toBeDefined();
      expect(vitals.opportunities.applied.some(app => app.id === 'test-opp-123')).toBe(true);
    });

    test('should track bombardment outcomes in vitals', async () => {
      // Record bombardment outcome
      await fetch(`${API_URL}/observe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: STUDENT_ID,
          kind: 'BOMBARDMENT',
          subtype: 'OUTCOME',
          value: { 
            episode_id: 'test-episode-123',
            size: 5,
            wins: 2,
            total: 5
          },
          source: 'test-suite',
          at: new Date().toISOString()
        })
      });

      // Check vitals
      const vitalsResponse = await fetch(`${API_URL}/students/${STUDENT_ID}/state`);
      const vitals = await vitalsResponse.json();
      
      expect(vitals.opportunities.bombardment_history).toBeDefined();
      expect(vitals.opportunities.bombardment_win_rate).toBeDefined();
      expect(vitals.opportunities.bombardment_win_rate).toBeLessThanOrEqual(1);
    });
  });

  describe('Score Components', () => {
    test('should score based on academic fit', async () => {
      const response = await fetch(`${API_URL}/students/${STUDENT_ID}/opportunities/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opportunity_id: 'test-high-gpa-req'
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        expect(data.components).toBeDefined();
        expect(data.components.academic_fit).toBeGreaterThanOrEqual(0);
        expect(data.components.academic_fit).toBeLessThanOrEqual(30);
      }
    });

    test('should consider all score components', async () => {
      const response = await fetch(`${API_URL}/students/${STUDENT_ID}/opportunities/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opportunity_id: 'test-opportunity'
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        const components = data.components;
        
        // Verify all components present and in correct ranges
        expect(components.academic_fit).toBeLessThanOrEqual(30);
        expect(components.narrative_fit).toBeLessThanOrEqual(25);
        expect(components.strategic_value).toBeLessThanOrEqual(20);
        expect(components.resource_fit).toBeLessThanOrEqual(15);
        expect(components.timeline_fit).toBeLessThanOrEqual(10);
        
        // Total should equal sum
        const sum = Object.values(components).reduce((a, b) => a + b, 0);
        expect(data.total_score).toBe(sum);
      }
    });
  });
});

// Quick smoke test for CI/CD
describe('Opportunity System Smoke Test', () => {
  test('all opportunity services should be reachable', async () => {
    const endpoints = [
      `${API_URL}/opportunities`,
      `${API_URL}/students/${STUDENT_ID}/opportunities/recommendations`,
      `${API_URL}/students/${STUDENT_ID}/opportunities/discover`
    ];
    
    for (const endpoint of endpoints) {
      const response = await fetch(endpoint);
      expect(response.ok).toBe(true);
    }
  });
});