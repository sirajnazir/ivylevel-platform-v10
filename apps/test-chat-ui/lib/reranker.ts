/**
 * v8.0: Cross-Namespace Reranker
 * Weighted scoring across ASSESSMENT, EXECUTION, OUTCOME phases
 */

export interface RerankResult {
  id: string;
  score: number;
  namespace?: string;
  phase?: 'ASSESSMENT' | 'EXECUTION' | 'OUTCOME';
  content: string;
  metadata?: Record<string, any>;
}

export interface RerankWeights {
  ASSESSMENT: number;
  EXECUTION: number;
  OUTCOME: number;
}

export interface CrossNamespaceLink {
  source_chip_id: string;
  target_chip_id: string;
  relation_type: 'supports' | 'contradicts' | 'elaborates' | 'supersedes' | 'references';
  confidence: number;
}

const DEFAULT_WEIGHTS: RerankWeights = {
  ASSESSMENT: 0.3,
  EXECUTION: 0.4,
  OUTCOME: 0.3,
};

/**
 * Detect phase from namespace or metadata
 */
export function detectPhase(namespace?: string, metadata?: Record<string, any>): 'ASSESSMENT' | 'EXECUTION' | 'OUTCOME' | undefined {
  if (!namespace && !metadata) return undefined;

  const nsLower = namespace?.toLowerCase() || '';
  const family = metadata?.family?.toLowerCase() || '';

  // Assessment phase
  if (nsLower.includes('assessment') || family.includes('assessment')) {
    return 'ASSESSMENT';
  }

  // Execution phase (GamePlan, iMessage, Session)
  if (nsLower.includes('gameplan') || nsLower.includes('imessage') || nsLower.includes('session') ||
      family.includes('gameplan') || family.includes('session')) {
    return 'EXECUTION';
  }

  // Outcome phase (CommonApp, Outcomes)
  if (nsLower.includes('commonapp') || nsLower.includes('outcome') ||
      family.includes('commonapp') || family.includes('outcome')) {
    return 'OUTCOME';
  }

  return undefined;
}

/**
 * Cross-namespace rerank with phase-aware weighted scoring
 */
export function crossNamespaceRerank(
  query: string,
  results: RerankResult[],
  weights: RerankWeights = DEFAULT_WEIGHTS
): RerankResult[] {
  return results
    .map((r) => {
      const phase = r.phase || detectPhase(r.namespace, r.metadata);
      const phaseWeight = phase ? weights[phase] : 1.0;
      const weighted = r.score * phaseWeight;

      return {
        ...r,
        phase,
        score: weighted,
        metadata: {
          ...r.metadata,
          original_score: r.score,
          phase_weight: phaseWeight,
          weighted_score: weighted,
        },
      };
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * Build chain-of-proof blocks spanning Assessment → Execution → Outcome
 */
export function buildChainOfProof(
  results: RerankResult[],
  links: CrossNamespaceLink[]
): {
  chain: RerankResult[][];
  evidence: string[];
} {
  const chainMap = new Map<string, RerankResult[]>();
  const evidence: string[] = [];

  // Group by phase
  const assessmentResults = results.filter((r) => r.phase === 'ASSESSMENT');
  const executionResults = results.filter((r) => r.phase === 'EXECUTION');
  const outcomeResults = results.filter((r) => r.phase === 'OUTCOME');

  // Build chains using cross-namespace links
  for (const link of links) {
    const sourceResult = results.find((r) => r.id === link.source_chip_id);
    const targetResult = results.find((r) => r.id === link.target_chip_id);

    if (sourceResult && targetResult) {
      const chainKey = `${sourceResult.id}->${targetResult.id}`;
      if (!chainMap.has(chainKey)) {
        chainMap.set(chainKey, [sourceResult, targetResult]);
        evidence.push(
          `[${link.relation_type}] ${sourceResult.phase} → ${targetResult.phase} (confidence: ${link.confidence.toFixed(2)})`
        );
      }
    }
  }

  // If no links, create implicit chains
  if (chainMap.size === 0) {
    if (assessmentResults.length > 0 && executionResults.length > 0) {
      chainMap.set('implicit-ae', [assessmentResults[0], executionResults[0]]);
      evidence.push('[implicit] ASSESSMENT → EXECUTION');
    }
    if (executionResults.length > 0 && outcomeResults.length > 0) {
      chainMap.set('implicit-eo', [executionResults[0], outcomeResults[0]]);
      evidence.push('[implicit] EXECUTION → OUTCOME');
    }
  }

  return {
    chain: Array.from(chainMap.values()),
    evidence,
  };
}

/**
 * Enhanced rerank with cross-namespace linking
 */
export function enhancedRerank(
  query: string,
  results: RerankResult[],
  links: CrossNamespaceLink[] = [],
  weights: RerankWeights = DEFAULT_WEIGHTS
): {
  reranked: RerankResult[];
  chainOfProof: { chain: RerankResult[][]; evidence: string[] };
} {
  // Step 1: Phase-aware weighted reranking
  const reranked = crossNamespaceRerank(query, results, weights);

  // Step 2: Build chain-of-proof
  const chainOfProof = buildChainOfProof(reranked, links);

  return {
    reranked,
    chainOfProof,
  };
}

/**
 * Calculate cross-namespace diversity score
 */
export function calculateDiversityScore(results: RerankResult[]): number {
  const namespaces = new Set(results.map((r) => r.namespace).filter(Boolean));
  const phases = new Set(results.map((r) => r.phase).filter(Boolean));

  const namespaceScore = Math.min(namespaces.size / 4, 1.0); // 4 families max
  const phaseScore = phases.size / 3; // 3 phases max

  return (namespaceScore * 0.6 + phaseScore * 0.4);
}

/**
 * Filter results to ensure cross-namespace coverage
 */
export function ensureCrossNamespaceCoverage(
  results: RerankResult[],
  minPerPhase: number = 1
): RerankResult[] {
  const byPhase: Record<string, RerankResult[]> = {
    ASSESSMENT: [],
    EXECUTION: [],
    OUTCOME: [],
  };

  // Group by phase
  for (const result of results) {
    if (result.phase) {
      byPhase[result.phase].push(result);
    }
  }

  // Ensure minimum per phase
  const selected: RerankResult[] = [];
  for (const phase of ['ASSESSMENT', 'EXECUTION', 'OUTCOME'] as const) {
    const phaseResults = byPhase[phase].slice(0, minPerPhase);
    selected.push(...phaseResults);
  }

  // Add remaining high-scoring results
  const remaining = results.filter((r) => !selected.includes(r));
  selected.push(...remaining);

  return selected;
}

/**
 * Create cross-namespace summary
 */
export function createCrossNamespaceSummary(
  results: RerankResult[],
  chainOfProof: { chain: RerankResult[][]; evidence: string[] }
): string {
  const phases = new Set(results.map((r) => r.phase).filter(Boolean));
  const namespaces = new Set(results.map((r) => r.namespace).filter(Boolean));

  const summary = [
    `Retrieved ${results.length} results across ${namespaces.size} namespaces`,
    `Phases covered: ${Array.from(phases).join(', ')}`,
    `Chain-of-proof: ${chainOfProof.evidence.length} connections`,
    chainOfProof.evidence.length > 0 ? `\nEvidence:\n${chainOfProof.evidence.join('\n')}` : '',
  ];

  return summary.filter(Boolean).join('\n');
}
