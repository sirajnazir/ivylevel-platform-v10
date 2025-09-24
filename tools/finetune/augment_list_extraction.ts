#!/usr/bin/env ts-node
/**
 * Fine-tune Data Augmentation for List/Number Extraction
 * Creates training examples from vitals data to improve extraction accuracy
 */

import * as fs from 'fs';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://saadnazir@localhost/ivylevel'
});

interface TrainingExample {
  prompt: string;
  completion: string;
}

async function generateListExtractionExamples(): Promise<TrainingExample[]> {
  const examples: TrainingExample[] = [];
  
  try {
    // Get Huda's vitals
    const result = await pool.query(
      'SELECT vitals FROM student_state WHERE student_id = $1',
      ['huda']
    );
    const vitals = result.rows[0]?.vitals || {};
    
    // 1. EC List Extraction Examples
    if (vitals.ecs && Array.isArray(vitals.ecs)) {
      const ecNames = vitals.ecs.slice(0, 10).map((ec: any) => ec.name);
      
      examples.push({
        prompt: "Extract the list of extracurricular activities from this student's profile.",
        completion: JSON.stringify({
          ecs: ecNames,
          count: ecNames.length
        })
      });
      
      // Variations
      examples.push({
        prompt: "What are the student's top 10 extracurricular activities?",
        completion: JSON.stringify({
          activities: ecNames,
          total: 10
        })
      });
      
      examples.push({
        prompt: "List all ECs for this student.",
        completion: ecNames.join('\n')
      });
    }
    
    // 2. Awards List Extraction Examples  
    if (vitals.awards && Array.isArray(vitals.awards)) {
      const awardNames = vitals.awards.slice(0, 5).map((a: any) => a.name);
      
      examples.push({
        prompt: "Extract the list of awards and honors.",
        completion: JSON.stringify({
          awards: awardNames,
          count: awardNames.length
        })
      });
      
      examples.push({
        prompt: "What are the student's top 5 awards?",
        completion: JSON.stringify({
          top_awards: awardNames,
          total: 5
        })
      });
    }
    
    // 3. College List Extraction Examples
    if (vitals.apps?.collegeList && Array.isArray(vitals.apps.collegeList)) {
      const colleges = vitals.apps.collegeList;
      const acceptedColleges = colleges.filter((c: any) => c.status === 'ACCEPTED').map((c: any) => c.name);
      
      examples.push({
        prompt: "Which colleges accepted this student?",
        completion: JSON.stringify({
          accepted_colleges: acceptedColleges,
          count: acceptedColleges.length
        })
      });
      
      examples.push({
        prompt: "List all colleges the student applied to.",
        completion: JSON.stringify({
          all_colleges: colleges.map((c: any) => c.name),
          total_applications: colleges.length
        })
      });
    }
    
    // 4. Number Extraction Examples
    if (vitals.academics?.sat?.current) {
      examples.push({
        prompt: "What is the student's SAT score?",
        completion: vitals.academics.sat.current.toString()
      });
      
      examples.push({
        prompt: "Extract the current SAT score.",
        completion: JSON.stringify({
          sat_score: vitals.academics.sat.current,
          type: "current"
        })
      });
    }
    
    if (vitals.academics?.gpa) {
      examples.push({
        prompt: "What is the student's GPA?",
        completion: JSON.stringify({
          weighted_gpa: vitals.academics.gpa.weighted,
          unweighted_gpa: vitals.academics.gpa.unweighted
        })
      });
    }
    
    // 5. Opportunity Statistics Examples
    if (vitals.opportunities?.pipeline?.yield) {
      const yield_data = vitals.opportunities.pipeline.yield;
      
      examples.push({
        prompt: "How many opportunities did the student apply to and win?",
        completion: JSON.stringify({
          total_applied: yield_data.total_applied,
          accepted: yield_data.accepted,
          win_rate: yield_data.win_rate
        })
      });
      
      examples.push({
        prompt: "What is the student's opportunity win rate?",
        completion: `${(yield_data.win_rate * 100).toFixed(1)}%`
      });
    }
    
    // 6. Complex List Queries
    if (vitals.gameplan?.targets) {
      examples.push({
        prompt: "What are the target ECs and awards from the GamePlan?",
        completion: JSON.stringify({
          target_ecs: vitals.gameplan.targets.ecs || [],
          target_awards: vitals.gameplan.targets.awards || [],
          ec_count: vitals.gameplan.targets.ecs?.length || 0,
          award_count: vitals.gameplan.targets.awards?.length || 0
        })
      });
    }
    
    // 7. Temporal List Queries
    if (vitals.academics?.sat?.timeline && Array.isArray(vitals.academics.sat.timeline)) {
      const satScores = vitals.academics.sat.timeline.map((t: any) => ({
        date: t.date,
        score: t.score
      }));
      
      examples.push({
        prompt: "Show the SAT score progression over time.",
        completion: JSON.stringify({
          sat_timeline: satScores,
          improvement: satScores[satScores.length - 1].score - satScores[0].score
        })
      });
    }
    
    // 8. Counting Queries
    examples.push({
      prompt: "How many colleges did the student get accepted to?",
      completion: vitals.apps?.collegeList?.filter((c: any) => c.status === 'ACCEPTED').length.toString() || "0"
    });
    
    examples.push({
      prompt: "Count the number of research opportunities.",
      completion: JSON.stringify({
        research_opportunities: Object.keys(vitals.opportunities?.pipeline?.decisions || {})
          .filter(name => name.toLowerCase().includes('research')).length
      })
    });
    
    return examples;
    
  } finally {
    await pool.end();
  }
}

async function generateAugmentedDataset() {
  console.log('Generating fine-tune data augmentation for list/number extraction...\n');
  
  const examples = await generateListExtractionExamples();
  
  // Convert to JSONL format for fine-tuning
  const jsonlData = examples.map(ex => JSON.stringify({
    messages: [
      { role: "system", content: "You are a precise data extraction assistant. Extract lists and numbers accurately from student profiles." },
      { role: "user", content: ex.prompt },
      { role: "assistant", content: ex.completion }
    ]
  })).join('\n');
  
  // Save JSONL file
  const filename = 'list_extraction_finetune.jsonl';
  fs.writeFileSync(filename, jsonlData);
  
  console.log(`Generated ${examples.length} training examples`);
  console.log(`Saved to: ${filename}`);
  
  // Also save human-readable version
  const readableFilename = 'list_extraction_examples.json';
  fs.writeFileSync(readableFilename, JSON.stringify(examples, null, 2));
  console.log(`Human-readable version saved to: ${readableFilename}`);
  
  // Print sample examples
  console.log('\nSample Examples:');
  examples.slice(0, 3).forEach((ex, i) => {
    console.log(`\n--- Example ${i + 1} ---`);
    console.log(`Prompt: ${ex.prompt}`);
    console.log(`Completion: ${ex.completion}`);
  });
}

// Run the augmentation
if (require.main === module) {
  generateAugmentedDataset().catch(console.error);
}