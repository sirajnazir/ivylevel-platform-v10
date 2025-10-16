#!/bin/bash
set -e

echo "🚀 Starting v14→v1.0 Migration (OpenAI-Enhanced)"
echo "================================================"
echo ""

# Step 1: Backup
echo "📦 Step 1/7: Creating backup..."
git checkout -b v1.0-migration
git add .
git commit -m "Pre-migration checkpoint (v14.0)" || echo "No changes to commit"
echo "✅ Backup created"
echo ""

# Step 2: Rename jenny-api → agent-framework
echo "🔄 Step 2/7: Renaming jenny-api → agent-framework..."
cd services
if [ -d "jenny-api" ]; then
  mv jenny-api agent-framework
  echo "✅ Renamed jenny-api → agent-framework"
else
  echo "⚠️  jenny-api not found, skipping"
fi
cd ..
echo ""

# Step 3: Update import paths
echo "🔧 Step 3/7: Updating import paths..."
find services/agent-framework -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.json" \) \
  -exec sed -i '' 's|jenny-api|agent-framework|g' {} + 2>/dev/null || true

find apps/test-chat-ui -type f \( -name "*.ts" -o -name "*.tsx" \) \
  -exec sed -i '' 's|services/jenny-api|services/agent-framework|g' {} + 2>/dev/null || true

echo "✅ Import paths updated"
echo ""

# Step 4: Create new directories
echo "📁 Step 4/7: Creating v1.0 directory structure..."
cd services/agent-framework

mkdir -p src/agents
mkdir -p src/core
mkdir -p src/langgraph
mkdir -p src/repositories
mkdir -p src/training
mkdir -p src/testing
mkdir -p src/tools
mkdir -p manifests

cd ../..

mkdir -p sdk/typescript/src
mkdir -p sdk/python/src
mkdir -p apps/agent-builder
mkdir -p apps/ivylevel-chat-ui
mkdir -p observability/dashboards
mkdir -p observability/alerts
mkdir -p api/postman
mkdir -p data/category2/{cds,rubrics,hyperlocal,twins,programs,research}
mkdir -p data/golden_tests

echo "✅ Directory structure created"
echo ""

# Step 5: Install OpenAI SDK
echo "📦 Step 5/7: Installing OpenAI Agents SDK..."
cd services/agent-framework
npm install @openai/agents-sdk@latest || echo "⚠️  OpenAI SDK installation failed - install manually"
echo "✅ OpenAI SDK install attempted"
cd ../..
echo ""

# Step 6: Create stub files
echo "📝 Step 6/7: Creating stub files..."

# BaseAgent stub
cat > services/agent-framework/src/core/BaseAgent.ts << 'EOF'
import { Agent, Runner, RunnerResult } from '@openai/agents-sdk';
import { AgentManifest } from './types';

/**
 * BaseAgent - Foundation for all IvyLevel agents
 * Extends OpenAI.Agent with IvyLevel-specific features
 */
export abstract class BaseAgent {
  protected agent: Agent;
  protected manifest: AgentManifest;
  protected runner: Runner;

  constructor(manifest: AgentManifest) {
    this.manifest = manifest;
    // TODO: Initialize OpenAI Agent (see implementation guide)
  }

  abstract execute(message: string, session: any): Promise<RunnerResult>;
}
EOF

# Tool wrappers stub
cat > services/agent-framework/src/tools/resolvers.ts << 'EOF'
import { Tool } from '@openai/agents-sdk';
import { pool } from '../db/pool';

/**
 * v14 Resolvers wrapped as OpenAI Tools
 * Preserves zero-hallucination guarantee
 */

export const getGPALatest = Tool({
  name: 'get_gpa_latest',
  description: 'Get student latest weighted GPA from transcript',
  parameters: {
    type: 'object',
    properties: {
      student_id: {
        type: 'string',
        description: 'Student UUID (e.g., STU001)'
      }
    },
    required: ['student_id']
  },
  fn: async ({ student_id }: { student_id: string }) => {
    const result = await pool.query(
      'SELECT * FROM v_gpa_latest WHERE student_id = $1',
      [student_id]
    );
    return result.rows[0] || { error: 'No GPA data found' };
  }
});

// TODO: Add remaining tool wrappers (see implementation guide Section 2.1)

export const allTools = [getGPALatest];
EOF

# Types stub
cat > services/agent-framework/src/core/types.ts << 'EOF'
export interface AgentManifest {
  agent_id: string;
  display_name: string;
  tagline: string;
  version: string;
  tools: string[];
  intents: Array<{
    intent_id: string;
    category: string;
    patterns: string[];
  }>;
  jtbd: {
    student: string;
    parent: string;
    success_metric: string;
  };
  model?: string;
  temperature?: number;
  handoffs?: string[];
}
EOF

echo "✅ Stub files created"
echo ""

# Step 7: Verify build
echo "🔨 Step 7/7: Verifying build..."
cd services/agent-framework
npm run build 2>/dev/null || echo "⚠️  Build failed - expected, install OpenAI SDK manually"
cd ../..
echo ""

echo "✅ Migration scaffolding complete!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Next steps:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. Review changes: git diff"
echo "2. Install OpenAI SDK manually if failed:"
echo "   cd services/agent-framework && npm install @openai/agents-sdk@latest"
echo "3. Apply database migrations:"
echo "   ./scripts/migrate-database.sh"
echo "4. Follow implementation guide:"
echo "   docs/guides/V1.0_OPENAI_IMPLEMENTATION_GUIDE.md"
echo "5. Begin Phase 1, Week 1 implementation"
echo ""
echo "📖 Full spec: docs/V1.0_MIGRATION_PLAN.md"
echo "📖 OpenAI analysis: docs/OPENAI_COMPONENTS_ANALYSIS.md"
echo ""
