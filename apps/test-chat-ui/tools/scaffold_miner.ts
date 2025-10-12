/**
 * Scaffold Miner - Auto-generate scaffolds from existing chip corpus
 *
 * Strategy:
 * 1. Fetch all vectors from Pinecone (grouped by namespace)
 * 2. Cluster by (chip_type, namespace)
 * 3. For each cluster, generate a scaffold YAML with:
 *    - Smart ID based on type + namespace
 *    - Type-based select rules (preferIdPrefix from most common ID patterns)
 *    - Generic template that defers to type-aware rendering
 * 4. Output to config/scaffolds/_auto/
 */

import { Pinecone } from "@pinecone-database/pinecone";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "yaml";

const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_INDEX = process.env.PINECONE_INDEX || "jenny-v3-3072-093025";

interface ChipMetadata {
  type?: string;
  chip_type?: string;
  category?: string;
  tags?: string[];
  phase?: string;
  week?: string;
  [key: string]: any;
}

interface Vector {
  id: string;
  namespace?: string;
  metadata?: ChipMetadata;
}

interface Cluster {
  type: string;
  namespace: string;
  ids: string[];
  tags: Set<string>;
  phases: Set<string>;
}

const normType = (md?: ChipMetadata) =>
  (md?.type || md?.chip_type || md?.category || "UnknownType").toString();

/**
 * Fetch all vectors from all namespaces
 */
async function fetchAllVectors(): Promise<Vector[]> {
  if (!PINECONE_API_KEY) {
    throw new Error("PINECONE_API_KEY not set");
  }

  const pc = new Pinecone({ apiKey: PINECONE_API_KEY });
  const index = pc.index(PINECONE_INDEX);

  // Get list of namespaces (we'll query each one)
  const namespaces = [
    "KBv6_2025-10-06_v1.0",
    "KBv6_iMessage_2025-10-07_v1.0",
    "KBv6_Assessment_2025-10-07_v1.0"
  ];

  const allVectors: Vector[] = [];

  for (const ns of namespaces) {
    console.log(`[ScaffoldMiner] Fetching from namespace: ${ns}...`);

    // List all IDs in namespace (using pagination if needed)
    const nsIndex = index.namespace(ns);

    try {
      // We'll use a listPaginated approach with a query to get all IDs
      // Note: Pinecone doesn't have direct "list all" - we query with a dummy vector
      // Alternative: maintain a manifest of all IDs

      // For now, we'll use a simple approach: query with topK=10000 and a zero vector
      const dimension = 3072;
      const zeroVector = new Array(dimension).fill(0);

      const queryResult = await nsIndex.query({
        vector: zeroVector,
        topK: 10000,
        includeMetadata: true
      });

      for (const match of queryResult.matches || []) {
        allVectors.push({
          id: match.id,
          namespace: ns,
          metadata: match.metadata as ChipMetadata
        });
      }

      console.log(`[ScaffoldMiner] Found ${queryResult.matches?.length || 0} vectors in ${ns}`);
    } catch (err) {
      console.warn(`[ScaffoldMiner] Failed to fetch from ${ns}:`, err);
    }
  }

  return allVectors;
}

/**
 * Cluster vectors by (type, namespace)
 */
function clusterVectors(vectors: Vector[]): Cluster[] {
  const clusterMap = new Map<string, Cluster>();

  for (const vec of vectors) {
    const type = normType(vec.metadata);
    const namespace = vec.namespace || "default";
    const key = `${type}__${namespace}`;

    if (!clusterMap.has(key)) {
      clusterMap.set(key, {
        type,
        namespace,
        ids: [],
        tags: new Set(),
        phases: new Set()
      });
    }

    const cluster = clusterMap.get(key)!;
    cluster.ids.push(vec.id);

    // Collect tags and phases
    const tags = vec.metadata?.tags || [];
    for (const tag of tags) {
      cluster.tags.add(tag);
    }

    const phase = vec.metadata?.phase;
    if (phase) {
      cluster.phases.add(phase.toString());
    }
  }

  return Array.from(clusterMap.values());
}

/**
 * Extract common ID prefixes (up to first hyphen or underscore)
 */
function extractCommonPrefixes(ids: string[], topN = 5): string[] {
  const prefixCounts = new Map<string, number>();

  for (const id of ids) {
    // Extract prefix before first delimiter
    const parts = id.split(/[-_]/);
    if (parts.length > 0) {
      const prefix = parts[0];
      prefixCounts.set(prefix, (prefixCounts.get(prefix) || 0) + 1);
    }
  }

  // Sort by count and take top N
  const sorted = Array.from(prefixCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([prefix]) => prefix);

  return sorted.slice(0, topN);
}

/**
 * Generate scaffold YAML for a cluster
 */
function generateScaffold(cluster: Cluster): any {
  const typeSlug = cluster.type.replace(/_/g, ".").toLowerCase();
  const nsSlug = cluster.namespace.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();

  const id = `scaffold.auto.${typeSlug}.${nsSlug}`;

  // Extract common prefixes for smart selection
  const prefixes = extractCommonPrefixes(cluster.ids, 3);

  // Infer primary tag (most common)
  const tagList = Array.from(cluster.tags);
  const primaryTag = tagList[0] || typeSlug.split(".")[0];

  return {
    id,
    priority: 50, // Auto-scaffolds have medium priority
    requires: {
      anyTag: tagList.length > 0 ? tagList.slice(0, 3) : [primaryTag],
      anyNamespace: [cluster.namespace]
    },
    select: {
      topChip: {
        preferIdPrefix: prefixes.length > 0 ? prefixes : undefined,
        preferType: cluster.type,
        fallbackTopK: 5
      }
    },
    template: `**${cluster.type}** ({{topChip.id}}):\n\n{{topChip.content}}\n\n*Source*: {{topChip.namespace}}`,
    outputs: {
      chips: ["{{topChip.id}}"]
    },
    meta: {
      generated: true,
      chip_count: cluster.ids.length,
      tags: tagList,
      phases: Array.from(cluster.phases)
    }
  };
}

/**
 * Main miner function
 */
export async function mineScaffolds(outputDir?: string) {
  console.log(`[ScaffoldMiner] Starting scaffold mining...`);
  console.log(`[ScaffoldMiner] Target index: ${PINECONE_INDEX}`);

  // 1. Fetch all vectors
  const vectors = await fetchAllVectors();
  console.log(`[ScaffoldMiner] Total vectors: ${vectors.length}`);

  // 2. Cluster
  const clusters = clusterVectors(vectors);
  console.log(`[ScaffoldMiner] Clusters: ${clusters.length}`);

  // 3. Generate scaffolds
  const scaffolds = clusters.map(c => generateScaffold(c));

  // 4. Write to output directory
  const outDir = outputDir || path.join(process.cwd(), "config", "scaffolds", "_auto");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  for (const scaffold of scaffolds) {
    const filename = `${scaffold.id.replace(/\./g, "_")}.yaml`;
    const filepath = path.join(outDir, filename);
    const content = yaml.stringify(scaffold);

    fs.writeFileSync(filepath, content, "utf-8");
    console.log(`[ScaffoldMiner] Wrote: ${filename} (${scaffold.meta.chip_count} chips)`);
  }

  console.log(`[ScaffoldMiner] ✅ Generated ${scaffolds.length} scaffolds in ${outDir}`);

  return scaffolds;
}

// CLI entry point
if (require.main === module) {
  mineScaffolds()
    .then(() => process.exit(0))
    .catch(err => {
      console.error("[ScaffoldMiner] Error:", err);
      process.exit(1);
    });
}
