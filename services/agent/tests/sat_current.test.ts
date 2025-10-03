// services/agent/tests/sat_current.test.ts
import { respond } from "../src/orchestrator";
import { Pool } from "pg";
import type { AgentState } from "../../../packages/types/dist";

// Mock dependencies
jest.mock("../src/config", () => ({
  MODEL_CURRENT: "gpt-4o-mini",
  RETRIEVER_URL: "http://localhost:4102",
  DEFAULT_TEMPERATURE: 0.7,
  MAX_TOKENS: 2048
}));

jest.mock("node-fetch");

const pool = new Pool({
  connectionString: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL
});

describe("SAT Current Score Tests", () => {
  beforeEach(async () => {
    // Seed test vitals
    await pool.query(`
      INSERT INTO student_state (student_id, vitals, created_at, updated_at)
      VALUES ($1, $2, NOW(), NOW())
      ON CONFLICT (student_id) DO UPDATE SET
        vitals = $2,
        updated_at = NOW()
    `, [
      "huda",
      {
        academics: {
          sat: {
            current: 1530,
            superscore: 1530,
            timeline: [
              { date: "2023-11-01T00:00:00.000Z", score: 1480, note: "First attempt" },
              { date: "2024-03-04T08:00:00.000Z", score: 1530, note: "Final score" }
            ]
          }
        }
      }
    ]);
  });

  afterAll(async () => {
    await pool.end();
  });

  it("uses vitals current SAT (1530), not first (1480), and returns chips", async () => {
    const state: AgentState = { 
      studentId: "huda", 
      coachId: "jenny",
      nowWeek: 93, 
      phase: 5, 
      memory: {} 
    };

    const res = await respond({ 
      message: "what is my current SAT?", 
      state,
      studentId: "huda"
    });

    // Should return current score (1530)
    expect(res.reply).toMatch(/1530/);
    // Should NOT return first score (1480)
    expect(res.reply).not.toMatch(/1480/);
    // Should include evidence chips
    expect(res.evidence_chips.length).toBeGreaterThan(0);
    // Should not mix kinds
    const kinds = new Set(res.evidence_chips.map(c => c.kind));
    expect(kinds.size).toBe(1); // no mixed kinds
  });

  it("offers to log SAT when no vitals exist", async () => {
    // Clear vitals for test student
    await pool.query("DELETE FROM student_state WHERE student_id = $1", ["test-student"]);

    const state: AgentState = { 
      studentId: "test-student", 
      coachId: "jenny",
      nowWeek: 50, 
      phase: 2, 
      memory: {} 
    };

    const res = await respond({ 
      message: "what is my SAT score?", 
      state,
      studentId: "test-student"
    });

    // Should follow never-blank doctrine
    expect(res.reply).toMatch(/don't see your SAT.*records.*log it/i);
    expect(res.reply).not.toMatch(/don't have access/i);
    expect(res.evidence_chips.length).toBe(0);
  });
});