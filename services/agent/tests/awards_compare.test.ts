import { respond } from "../src/orchestrator";

describe("Awards Compare Golden Test", () => {
  it("returns planned vs won with APP-DOC + GAMEPLAN chips", async () => {
    const res = await respond({
      message: "Which awards did I plan vs actually win?",
      state: { coachId: "jenny", studentId: "huda", nowWeek: 93, phase: 5, memory: {} }
    });

    // Check reply content
    expect(res.reply).toMatch(/Planned|Originally Planned/i);
    expect(res.reply).toMatch(/Won/i);
    
    // Verify evidence chips
    expect(res.evidence_chips.length).toBeGreaterThanOrEqual(1);
    
    // Check for both APP-DOC and GAMEPLAN chips
    const kinds = new Set(res.evidence_chips.map((c: any) => c.kind));
    expect(kinds.has("APP-DOC")).toBe(true);
    expect(kinds.has("GAMEPLAN")).toBe(true);
    
    // Verify no mixed kinds in same chip
    res.evidence_chips.forEach((chip: any) => {
      expect(["APP-DOC", "GAMEPLAN", "TRANS-INTEL", "EXEC-INTEL"]).toContain(chip.kind);
    });
  });
  
  it("shows awards difference analysis", async () => {
    const res = await respond({
      message: "Which awards did I plan vs actually win?",
      state: { coachId: "jenny", studentId: "huda", nowWeek: 93, phase: 5, memory: {} }
    });
    
    // Check for difference analysis sections
    expect(res.reply).toMatch(/exceeded expectations|still pursuing/i);
    
    // Verify specific awards are mentioned
    expect(res.reply).toMatch(/NCWIT/);
    expect(res.reply).toMatch(/AP Scholar/);
  });
});