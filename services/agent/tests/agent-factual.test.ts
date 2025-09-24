import { respond } from '../src/orchestrator';
import { Pool } from 'pg';

jest.mock('pg');
jest.mock('openai');

describe('Agent Factual Responses', () => {
  let mockPool: any;
  
  beforeEach(() => {
    mockPool = {
      query: jest.fn()
    };
    (Pool as any).mockReturnValue(mockPool);
    
    process.env.OPENAI_API_KEY = 'test-key';
    process.env.MODEL_CURRENT = 'gpt-4';
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  it('should respond with exact SAT score from vitals when asked', async () => {
    const vitals = {
      academics: {
        sat: {
          current: 1530,
          superscore: 1530,
          timeline: [
            { date: '2023-08-05', score: 1360, note: 'baseline' },
            { date: '2025-02-11', score: 1530, note: 'final' }
          ]
        }
      }
    };
    
    mockPool.query.mockResolvedValue({
      rows: [{ vitals }]
    });
    
    const mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{
              message: {
                content: "Your final SAT score is 1530 (from your vitals)."
              }
            }]
          })
        }
      }
    };
    
    jest.mock('openai', () => ({
      OpenAI: jest.fn(() => mockOpenAI)
    }));
    
    const result = await respond({
      message: "What's my final SAT score?",
      studentId: 'huda',
      nowWeek: 26
    });
    
    expect(mockPool.query).toHaveBeenCalledWith(
      'SELECT vitals FROM student_state WHERE student_id = $1',
      ['huda']
    );
    
    expect(result.reply).toContain('1530');
    expect(result.reply.toLowerCase()).toMatch(/vitals|records/);
  });
  
  it('should offer to check documents when vital information is missing', async () => {
    mockPool.query.mockResolvedValue({
      rows: []
    });
    
    const mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{
              message: {
                content: "I don't see your SAT score in your vitals. Shall I check your application PDFs or add it to your records now?"
              }
            }]
          })
        }
      }
    };
    
    jest.mock('openai', () => ({
      OpenAI: jest.fn(() => mockOpenAI)
    }));
    
    const result = await respond({
      message: "What's my SAT score?",
      studentId: 'huda',
      nowWeek: 26
    });
    
    expect(result.reply).toMatch(/check.*PDF|add.*records/);
    expect(result.reply).not.toMatch(/don't have access/i);
  });
});