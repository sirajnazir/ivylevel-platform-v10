import { pool } from '../db/pool.js';
import { pgQuery } from '../observability/wrappers.js';

// Original fetchVitals for backward compatibility
export async function fetchVitals(studentId: string) {
  const { rows } = await pgQuery(
    pool,
    'fetch_vitals',
    `SELECT kind, value, fact_date, confidence, source_id
     FROM vital_facts WHERE student_id=$1 ORDER BY fact_date DESC LIMIT 500`,
    [studentId]
  );
  return { student_id: studentId, facts: rows };
}

// New canonical fact resolver
export async function resolveFact(studentId: string, kind: string) {
  const { rows } = await pgQuery(
    pool,
    'resolve_canonical_fact',
    `SELECT * FROM select_current_fact($1, $2)`,
    [studentId, kind]
  );
  return rows[0] || null;
}

// Batch resolver for multiple facts
export async function resolveFacts(studentId: string, kinds: string[]) {
  const { rows } = await pgQuery(
    pool,
    'resolve_canonical_facts',
    `SELECT * FROM select_current_facts($1, $2)`,
    [studentId, kinds]
  );
  
  // Return as map for easy lookup
  const factMap: Record<string, any> = {};
  rows.forEach(row => {
    factMap[row.kind] = row;
  });
  return factMap;
}

// Get validation report for a student
export async function getStudentFactValidation(studentId: string) {
  const { rows } = await pgQuery(
    pool,
    'student_fact_validation',
    `SELECT 
       kind,
       COUNT(*) AS total_facts,
       COUNT(*) FILTER (WHERE is_valid = true) AS valid_facts,
       COUNT(*) FILTER (WHERE is_valid = false) AS invalid_facts,
       array_agg(DISTINCT validation_error) FILTER (WHERE validation_error IS NOT NULL) AS errors
     FROM facts_normalized
     WHERE student_id = $1
     GROUP BY kind
     ORDER BY invalid_facts DESC`,
    [studentId]
  );
  return rows;
}

// Detect fact kinds from user message
export function detectFactKinds(message: string): string[] {
  const lowerMessage = message.toLowerCase();
  const detectedKinds: string[] = [];
  
  // Test scores
  if (lowerMessage.match(/\b(sat|sat score|sat total)\b/)) {
    detectedKinds.push('sat_total_score');
  }
  if (lowerMessage.match(/\b(sat math|math score)\b/)) {
    detectedKinds.push('sat_math_score');
  }
  if (lowerMessage.match(/\b(sat (reading|writing|ebrw))\b/)) {
    detectedKinds.push('sat_ebrw_score');
  }
  if (lowerMessage.match(/\b(act|act score|act composite)\b/)) {
    detectedKinds.push('act_composite');
  }
  if (lowerMessage.match(/\b(ap|ap score)\b/)) {
    detectedKinds.push('ap_score');
  }
  if (lowerMessage.match(/\b(psat|psat score)\b/)) {
    detectedKinds.push('psat_total_score');
  }
  
  // GPA
  if (lowerMessage.match(/\b(gpa|grade point)\b/)) {
    if (lowerMessage.includes('weighted')) {
      detectedKinds.push('gpa_weighted');
    } else if (lowerMessage.includes('unweighted')) {
      detectedKinds.push('gpa_unweighted');
    } else {
      // Return both if not specified
      detectedKinds.push('gpa_unweighted', 'gpa_weighted');
    }
  }
  
  // Application status
  if (lowerMessage.match(/\b(uc app|uc application|submit.*uc)\b/)) {
    detectedKinds.push('uc_app_submitted');
  }
  if (lowerMessage.match(/\b(common app|commonapp|submit.*common)\b/)) {
    detectedKinds.push('common_app_submitted');
  }
  if (lowerMessage.match(/\b(css|css profile|financial aid)\b/)) {
    detectedKinds.push('css_profile_submitted');
  }
  if (lowerMessage.match(/\bfafsa\b/)) {
    detectedKinds.push('fafsa_submitted');
  }
  
  return [...new Set(detectedKinds)]; // Remove duplicates
}

// Format fact for human-readable output
export function formatFactAnswer(fact: any): string {
  if (!fact) return '';
  
  const { kind, normalized_value, confidence, fact_date, original_value } = fact;
  
  // Special formatting by kind
  switch (kind) {
    case 'sat_total_score':
      return `Your SAT total score is **${normalized_value}** (recorded ${new Date(fact_date).toLocaleDateString()}, confidence: ${confidence})`;
    
    case 'sat_math_score':
      return `Your SAT Math score is **${normalized_value}**`;
      
    case 'sat_ebrw_score':
      return `Your SAT Evidence-Based Reading and Writing score is **${normalized_value}**`;
      
    case 'act_composite':
      return `Your ACT composite score is **${normalized_value}**`;
      
    case 'gpa_unweighted':
      return `Your unweighted GPA is **${normalized_value}**`;
      
    case 'gpa_weighted':
      return `Your weighted GPA is **${normalized_value}**`;
      
    case 'ap_score':
      return `Your AP score is **${normalized_value}**`;
      
    case 'uc_app_submitted':
    case 'common_app_submitted':
    case 'css_profile_submitted':
    case 'fafsa_submitted':
      const appName = kind.replace(/_submitted$/, '').replace(/_/g, ' ').toUpperCase();
      return normalized_value === 'true' 
        ? `Yes, your ${appName} has been submitted`
        : `No, your ${appName} has not been submitted yet`;
        
    default:
      // Generic format
      const readableKind = kind.replace(/_/g, ' ');
      return `Your ${readableKind} is **${normalized_value}**`;
  }
}