// Use native fetch (Node 18+)
const fs = require('fs');
const path = require('path');

const MODEL = process.env.MODEL || 'ft:gpt-4o-mini-2024-07-18:personal:jenny-v1:CJ6wyeDy';
const AGENT_URL = 'http://localhost:4101';

async function runBasicEval() {
  console.log('Running eval for model:', MODEL);
  
  const tests = [
    {
      name: '168h Planning',
      message: "I have 168 hours. Help me optimize this week for SAT and Synthoria.",
      checks: ['168', 'hour', 'SAT', 'Synthoria']
    },
    {
      name: 'Evidence Recall',
      message: "What was my SAT progression?",
      checks: ['SAT', 'score']
    },
    {
      name: 'Rejection Handling',
      message: "I just got rejected. What now?",
      checks: ['sorry', 'next', 'opportunity']
    }
  ];

  let passed = 0;
  
  for (const test of tests) {
    try {
      const response = await fetch(`${AGENT_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: 'eval-user',
          message: test.message
        })
      });
      
      const result = await response.json();
      const hasEvidence = result.evidence_chips && result.evidence_chips.length > 0;
      const hasKeywords = test.checks.some(k => 
        result.reply.toLowerCase().includes(k.toLowerCase())
      );
      
      const testPassed = hasEvidence && hasKeywords;
      console.log(`\n${test.name}: ${testPassed ? '✅' : '❌'}`);
      console.log(`- Evidence chips: ${hasEvidence ? result.evidence_chips.length : 0}`);
      console.log(`- Keywords found: ${hasKeywords}`);
      
      if (testPassed) passed++;
    } catch (error) {
      console.error(`${test.name}: ❌ Error -`, error.message);
    }
  }
  
  const score = (passed / tests.length * 100).toFixed(1);
  console.log(`\n=== Quick Eval Results ===`);
  console.log(`Model: ${MODEL}`);
  console.log(`Score: ${score}% (${passed}/${tests.length} passed)`);
  
  // Save results
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);
  const reportDir = 'reports/eval';
  
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  const scorecard = `# Quick Eval Scorecard

**Model**: ${MODEL}  
**Date**: ${new Date().toISOString()}  
**Score**: ${score}%

## Test Results

${tests.map((t, i) => `- ${t.name}: ${i < passed ? '✅' : '❌'}`).join('\n')}

## Summary

Basic functionality ${score >= 80 ? 'PASSED' : 'NEEDS IMPROVEMENT'}. 
${score < 80 ? 'Consider expanding the fine-tuning dataset.' : 'Ready for more comprehensive testing.'}`;
  
  fs.writeFileSync(
    path.join(reportDir, `quick_scorecard_${timestamp}.md`),
    scorecard
  );
  
  console.log(`\nScorecard saved to: reports/eval/quick_scorecard_${timestamp}.md`);
}

runBasicEval().catch(console.error);