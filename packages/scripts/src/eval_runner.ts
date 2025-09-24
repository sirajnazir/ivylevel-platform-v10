import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import OpenAI from 'openai';
import { child } from '@packages/logger';

const log = child({ svc: 'eval-runner' });

interface EvalResult {
  model: string;
  timestamp: string;
  metrics: {
    indistinguishability: number;
    autonomy: number;
    evidence: number;
    fit: number;
  };
  details: any[];
}

const MODEL = process.env.MODEL || process.env.JENNY_MODEL_ID || 'gpt-4o-mini';
const AGENT_URL = process.env.AGENT_URL || 'http://localhost:4101';

async function runEval(): Promise<EvalResult> {
  log.info({ model: MODEL }, 'Starting evaluation');
  
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  const result: EvalResult = {
    model: MODEL,
    timestamp: new Date().toISOString(),
    metrics: {
      indistinguishability: 0,
      autonomy: 0,
      evidence: 0,
      fit: 0
    },
    details: []
  };

  // Test categories
  const evalFiles = [
    'data/eval/indistinguishability.csv',
    'data/eval/autonomy.csv', 
    'data/eval/evidence.csv',
    'data/eval/fit.csv'
  ];

  // Check if eval files exist, if not create sample ones
  const evalDir = 'data/eval';
  if (!fs.existsSync(evalDir)) {
    fs.mkdirSync(evalDir, { recursive: true });
    createSampleEvalFiles(evalDir);
  }

  // Run each eval
  for (const file of evalFiles) {
    if (!fs.existsSync(file)) {
      log.warn({ file }, 'Eval file not found, skipping');
      continue;
    }

    const category = path.basename(file, '.csv');
    const score = await evaluateCategory(file, category, openai);
    result.metrics[category as keyof typeof result.metrics] = score;
  }

  // Save results
  const reportDir = 'reports/eval';
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);
  const scorecard = generateScorecard(result);
  
  fs.writeFileSync(
    path.join(reportDir, `scorecard_${timestamp}.md`),
    scorecard
  );
  
  fs.writeFileSync(
    path.join(reportDir, `metrics_${timestamp}.json`),
    JSON.stringify(result, null, 2)
  );

  log.info({ result }, 'Evaluation complete');
  return result;
}

async function evaluateCategory(file: string, category: string, openai: OpenAI): Promise<number> {
  const content = fs.readFileSync(file, 'utf-8');
  const rows = parse(content, { columns: true, skip_empty_lines: true }) as any[];
  
  if (rows.length === 0) {
    return 0;
  }

  let scores = 0;
  
  for (const row of rows) {
    const prompt = row.prompt || row.message || row.input;
    const expected = row.expected || row.output || '';
    
    try {
      // Call agent
      const response = await fetch(`${AGENT_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: 'eval-user',
          message: prompt
        })
      });

      if (!response.ok) {
        log.error({ status: response.status }, 'Agent call failed');
        continue;
      }

      const result = await response.json();
      
      // Evaluate based on category
      let score = 0;
      switch (category) {
        case 'evidence':
          // Check if evidence_chips exist
          score = result.evidence_chips && result.evidence_chips.length > 0 ? 1 : 0;
          break;
        
        case 'indistinguishability':
          // Use GPT to judge similarity to expected Jenny response
          score = await judgeIndistinguishability(openai, prompt, result.reply, expected);
          break;
        
        case 'autonomy':
          // Check for proactive planning elements
          score = checkAutonomy(result.reply);
          break;
        
        case 'fit':
          // Check for personalization elements
          score = checkFit(result.reply, row);
          break;
      }
      
      scores += score;
    } catch (error) {
      log.error({ error, row }, 'Evaluation error');
    }
  }
  
  return scores / rows.length;
}

async function judgeIndistinguishability(openai: OpenAI, prompt: string, actual: string, expected: string): Promise<number> {
  const judgePrompt = `Compare these two coaching responses and rate how similar they are in style, tone, and content:

Prompt: ${prompt}

Expected (Jenny's actual response): ${expected}

Actual (AI response): ${actual}

Rate on a scale of 0-1 how well the AI captures Jenny's coaching style (strategic, empathetic, action-oriented, evidence-based).
Return only a number between 0 and 1.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: judgePrompt }],
      temperature: 0
    });
    
    const score = parseFloat(response.choices[0].message.content?.trim() || '0');
    return isNaN(score) ? 0 : Math.min(1, Math.max(0, score));
  } catch (error) {
    log.error({ error }, 'Judge error');
    return 0;
  }
}

function checkAutonomy(response: string): number {
  const autonomyKeywords = [
    '168 hours', '168h', 'weekly plan', 'schedule', 'time block',
    'buffer', '3x', 'opportunities', 'pipeline', 'proactive'
  ];
  
  const found = autonomyKeywords.filter(k => 
    response.toLowerCase().includes(k.toLowerCase())
  ).length;
  
  return Math.min(1, found / 3); // Need at least 3 keywords for full score
}

function checkFit(response: string, row: any): number {
  const traits = row.traits || '';
  const fitKeywords = {
    shy: ['one-on-one', 'email', 'written', 'prepare'],
    outgoing: ['group', 'network', 'present', 'lead'],
    overloaded: ['prioritize', '80/20', 'delegate', 'reduce'],
    highCapacity: ['additional', 'stretch', 'advanced', 'accelerate']
  };
  
  let matches = 0;
  let expected = 0;
  
  for (const [trait, keywords] of Object.entries(fitKeywords)) {
    if (traits.toLowerCase().includes(trait)) {
      expected++;
      if (keywords.some(k => response.toLowerCase().includes(k))) {
        matches++;
      }
    }
  }
  
  return expected > 0 ? matches / expected : 0;
}

function generateScorecard(result: EvalResult): string {
  const { metrics, model, timestamp } = result;
  const passed = Object.values(metrics).every(m => m >= 0.8);
  
  return `# Evaluation Scorecard

**Model**: ${model}  
**Date**: ${timestamp}  
**Status**: ${passed ? '✅ PASSED' : '❌ FAILED'}

## Metrics

| Metric | Score | Target | Status |
|--------|-------|--------|--------|
| NSM Indistinguishability | ${(metrics.indistinguishability * 100).toFixed(1)}% | ≥80% | ${metrics.indistinguishability >= 0.8 ? '✅' : '❌'} |
| Autonomy | ${(metrics.autonomy * 100).toFixed(1)}% | ≥80% | ${metrics.autonomy >= 0.8 ? '✅' : '❌'} |
| Evidence Compliance | ${(metrics.evidence * 100).toFixed(1)}% | 100% | ${metrics.evidence === 1 ? '✅' : '❌'} |
| Fit Score | ${(metrics.fit * 100).toFixed(1)}% | ≥80% | ${metrics.fit >= 0.8 ? '✅' : '❌'} |

## Summary

${passed ? 
  'All metrics meet or exceed targets. The model is ready for deployment.' :
  'Some metrics are below target. Consider expanding the fine-tuning dataset with more examples of underperforming areas.'}

## Recommendations

${metrics.indistinguishability < 0.8 ? '- Add more authentic Jenny responses to the training set\n' : ''}${metrics.autonomy < 0.8 ? '- Include more examples of weekly planning and proactive guidance\n' : ''}${metrics.evidence < 1 ? '- Ensure all responses requiring evidence include proper citations\n' : ''}${metrics.fit < 0.8 ? '- Add more examples of personalized responses based on student traits\n' : ''}

---
Generated by IvyLevel Eval Runner v1.0`;
}

function createSampleEvalFiles(dir: string) {
  // Sample indistinguishability
  fs.writeFileSync(path.join(dir, 'indistinguishability.csv'), 
`prompt,expected
"I have 168 hours. Help me optimize this week for SAT and Synthoria.","Let's map out your 168 hours strategically. Sleep 56h, school 37.5h, transport 4.5h leaves us 70h. I recommend: 15h SAT prep (3h daily M-F), 10h Synthoria development, 7h social/family. That gives us 38h buffer for homework and flexibility."
"I feel devastated after this rejection. What do I do?","I hear you, and that disappointment is totally valid. Here's what we're doing: 1) Take 24h to feel it, 2) Then we pivot - I'm introducing 3 new opportunities within 48h that align even better with your profile, 3) Remember, this is data for our narrative. Every 'no' gets us closer to the right 'yes'."`);

  // Sample autonomy  
  fs.writeFileSync(path.join(dir, 'autonomy.csv'),
`prompt
"What should I focus on this week?"
"I'm feeling overwhelmed with everything."
"Help me plan my schedule for next month."`);

  // Sample evidence
  fs.writeFileSync(path.join(dir, 'evidence.csv'),
`prompt,needs_evidence
"What was my SAT progression again?",true
"How did I do with NCWIT?",true
"What summer programs did I get into?",true`);

  // Sample fit
  fs.writeFileSync(path.join(dir, 'fit.csv'),
`prompt,traits
"How should I network for internships?","shy,overloaded"
"I want to take on more leadership roles.","outgoing,highCapacity"
"Help me balance everything I'm doing.","shy,overloaded"`);

  log.info({ dir }, 'Created sample eval files');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runEval().catch(error => {
    log.error({ error }, 'Eval failed');
    process.exit(1);
  });
}

export { runEval, EvalResult };