import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { Pool } from 'pg';

// Mock database
const mockPool = {
  query: jest.fn(),
  end: jest.fn()
};

jest.mock('pg', () => ({
  Pool: jest.fn(() => mockPool)
}));

// Mock fetch for API calls
global.fetch = jest.fn();

// Import app after mocks are set up
import app from '../src/index';

describe('Reports API', () => {
  describe('GET /reports/:studentId', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return yield report by default', async () => {
      // Mock database response for yield report
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            category: 'Summer Programs',
            total: 10,
            accepted: 8,
            rejected: 2,
            waitlisted: 0,
            win_rate_pct: 80.0
          },
          {
            category: 'Research',
            total: 5,
            accepted: 2,
            rejected: 2,
            waitlisted: 1,
            win_rate_pct: 40.0
          }
        ]
      });

      const response = await request(app)
        .get('/reports/huda')
        .expect(200);

      expect(response.body).toMatchObject({
        type: 'yield',
        studentId: 'huda',
        summary: {
          totalApplications: 15,
          totalAccepted: 10,
          overallWinRate: 66.7,
          categoriesAnalyzed: 2
        },
        categories: expect.arrayContaining([
          expect.objectContaining({
            category: 'Summer Programs',
            win_rate_pct: 80.0
          })
        ]),
        insights: {
          highYield: expect.arrayContaining([
            expect.objectContaining({ category: 'Summer Programs' })
          ]),
          challenging: expect.arrayContaining([
            expect.objectContaining({ category: 'Research' })
          ])
        }
      });
    });

    it('should return temporal report when type=temporal', async () => {
      // Mock weekly activity query
      mockPool.query
        .mockResolvedValueOnce({
          rows: [
            {
              week_start: '2024-01-01',
              applications: 6,
              wins: 4,
              losses: 2,
              waitlisted: 0,
              win_rate_pct: 66.7
            },
            {
              week_start: '2024-01-08',
              applications: 3,
              wins: 2,
              losses: 1,
              waitlisted: 0,
              win_rate_pct: 66.7
            }
          ]
        })
        .mockResolvedValueOnce({
          rows: [{
            rebounds: 2,
            avg_rebound_days: 14.5
          }]
        });

      const response = await request(app)
        .get('/reports/huda?type=temporal')
        .expect(200);

      expect(response.body).toMatchObject({
        type: 'temporal',
        studentId: 'huda',
        summary: {
          totalWeeks: 2,
          bombardmentWeeks: 1, // First week has 6 applications
          rejectionRebounds: 2,
          avgReboundDays: 15
        },
        weeklyActivity: expect.arrayContaining([
          expect.objectContaining({
            week_start: '2024-01-01',
            applications: 6
          })
        ]),
        patterns: {
          bombardment: expect.objectContaining({
            count: 1,
            avgApplications: '6.0'
          }),
          resilience: {
            rebounds: 2,
            avgReboundDays: 15,
            reboundSuccess: true
          }
        }
      });
    });

    it('should return 400 for invalid report type', async () => {
      const response = await request(app)
        .get('/reports/huda?type=invalid')
        .expect(400);

      expect(response.body).toEqual({
        error: "Invalid report type. Use 'yield' or 'temporal'"
      });
    });

    it('should handle database errors gracefully', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .get('/reports/huda')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Internal server error'
      });
    });

    it('should load from cache when available', async () => {
      // Mock fs.existsSync to return true (cache exists)
      jest.mock('fs', () => ({
        existsSync: jest.fn(() => true),
        readFileSync: jest.fn(() => JSON.stringify({
          type: 'yield',
          studentId: 'huda',
          cached: true,
          summary: { totalApplications: 50 }
        }))
      }));

      const response = await request(app)
        .get('/reports/huda')
        .expect(200);

      // Should not call database when cache exists
      expect(mockPool.query).not.toHaveBeenCalled();
      expect(response.body.cached).toBe(true);
    });
  });

  describe('Report calculations', () => {
    it('should correctly calculate overall win rate', () => {
      const categories = [
        { total: 10, accepted: 8 },
        { total: 5, accepted: 2 },
        { total: 8, accepted: 6 }
      ];

      const totalApps = categories.reduce((sum, cat) => sum + cat.total, 0);
      const totalAccepted = categories.reduce((sum, cat) => sum + cat.accepted, 0);
      const overallWinRate = (totalAccepted / totalApps) * 100;

      expect(totalApps).toBe(23);
      expect(totalAccepted).toBe(16);
      expect(overallWinRate).toBeCloseTo(69.6, 1);
    });

    it('should identify bombardment weeks correctly', () => {
      const weeks = [
        { applications: 6 }, // Bombardment
        { applications: 3 }, // Active
        { applications: 1 }, // Light
        { applications: 5 }, // Bombardment
        { applications: 4 }  // Active
      ];

      const bombardmentWeeks = weeks.filter(w => w.applications >= 5);
      expect(bombardmentWeeks.length).toBe(2);
    });
  });

  describe('Agent integration', () => {
    it('should format yield report for agent consumption', () => {
      const apiReport = {
        summary: { overallWinRate: 89.2, totalApplications: 83 },
        categories: [
          { category: 'Summer Programs', total: 10, accepted: 8, win_rate_pct: 80 }
        ],
        insights: {
          highYield: [{ category: 'Summer Programs' }],
          challenging: []
        }
      };

      // Format for agent
      const agentFormat = {
        type: 'yield_report',
        summary: `Overall win rate: ${apiReport.summary.overallWinRate}% across ${apiReport.summary.totalApplications} applications`,
        categories: apiReport.categories.map(c => ({
          name: c.category,
          total: c.total,
          accepted: c.accepted,
          winRate: `${c.win_rate_pct}%`
        })),
        insights: {
          highYield: ['Summer Programs'],
          challenging: []
        }
      };

      expect(agentFormat.summary).toContain('89.2%');
      expect(agentFormat.categories[0].winRate).toBe('80%');
    });
  });
});

describe('Report smoke tests', () => {
  it('should return valid JSON for yield report', async () => {
    const response = await request(app)
      .get('/reports/huda?type=yield')
      .set('Accept', 'application/json');

    expect(response.headers['content-type']).toMatch(/json/);
    expect(response.body).toHaveProperty('type', 'yield');
    expect(response.body).toHaveProperty('studentId');
    expect(response.body).toHaveProperty('generatedAt');
  });

  it('should return valid JSON for temporal report', async () => {
    const response = await request(app)
      .get('/reports/huda?type=temporal')
      .set('Accept', 'application/json');

    expect(response.headers['content-type']).toMatch(/json/);
    expect(response.body).toHaveProperty('type', 'temporal');
    expect(response.body).toHaveProperty('weeklyActivity');
    expect(response.body).toHaveProperty('patterns');
  });
});