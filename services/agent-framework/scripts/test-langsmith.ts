/**
 * LangSmith Connection Test Script
 *
 * Purpose: Verify LangSmith API key and tracing configuration
 * Run: npx tsx scripts/test-langsmith.ts
 */

import { Client } from "langsmith";
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from root .env file
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function testLangSmith() {
  console.log('🔍 Testing LangSmith Connection...\n');

  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log(`   LANGCHAIN_TRACING_V2: ${process.env.LANGCHAIN_TRACING_V2}`);
  console.log(`   LANGCHAIN_ENDPOINT: ${process.env.LANGCHAIN_ENDPOINT}`);
  console.log(`   LANGCHAIN_API_KEY: ${process.env.LANGCHAIN_API_KEY ? '✅ Set (hidden)' : '❌ Not set'}`);
  console.log(`   LANGCHAIN_PROJECT: ${process.env.LANGCHAIN_PROJECT}\n`);

  if (!process.env.LANGCHAIN_API_KEY) {
    console.error('❌ ERROR: LANGCHAIN_API_KEY not set in .env file');
    process.exit(1);
  }

  try {
    // Initialize LangSmith client
    const client = new Client({
      apiKey: process.env.LANGCHAIN_API_KEY,
      apiUrl: process.env.LANGCHAIN_ENDPOINT || 'https://api.smith.langchain.com'
    });

    console.log('🔗 Connecting to LangSmith...');

    // Create a test run
    const testRun = await client.createRun({
      name: 'test-connection',
      run_type: 'chain',
      inputs: { test: 'hello from ivylevel v31' },
      project_name: process.env.LANGCHAIN_PROJECT || 'default'
    });

    console.log('✅ LangSmith connection successful!\n');

    if (testRun && testRun.id) {
      console.log('📊 Test Run Created:');
      console.log(`   Run ID: ${testRun.id}`);
      console.log(`   Project: ${process.env.LANGCHAIN_PROJECT}`);
      console.log(`   View at: https://smith.langchain.com/projects/${encodeURIComponent(process.env.LANGCHAIN_PROJECT!)}\n`);

      // End the test run
      await client.updateRun(testRun.id, {
        outputs: { success: true, message: 'LangSmith connection verified' },
        end_time: new Date().toISOString()
      });
    }

    console.log('✅ Test trace saved to LangSmith dashboard');
    console.log('🎉 You can now view traces in the LangSmith UI!\n');

    // Instructions
    console.log('📝 Next Steps:');
    console.log('   1. Open: https://smith.langchain.com');
    console.log('   2. Navigate to project: ivylevel-v31-hybrid');
    console.log('   3. You should see the "test-connection" trace');
    console.log('   4. Phase 1 setup is COMPLETE! ✅\n');

  } catch (error) {
    console.error('❌ ERROR connecting to LangSmith:');
    console.error(`   ${error}\n`);

    if (error instanceof Error && error.message.includes('401')) {
      console.error('💡 Troubleshooting:');
      console.error('   - Check that your LANGCHAIN_API_KEY is correct');
      console.error('   - Verify the key starts with: lsv2_pt_');
      console.error('   - Make sure you copied the full key from LangSmith');
    } else if (error instanceof Error && error.message.includes('404')) {
      console.error('💡 Troubleshooting:');
      console.error('   - The project "ivylevel-v31-hybrid" might not exist');
      console.error('   - Create it in LangSmith dashboard first');
    }

    process.exit(1);
  }
}

// Run test
testLangSmith().catch(console.error);
