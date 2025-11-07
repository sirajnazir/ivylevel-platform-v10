/**
 * Check LangSmith Projects
 * Lists all projects in your LangSmith account
 */

import { Client } from "langsmith";
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function checkProjects() {
  console.log('🔍 Checking LangSmith Projects...\n');

  try {
    const client = new Client({
      apiKey: process.env.LANGCHAIN_API_KEY!
    });

    console.log('📋 Fetching your projects from LangSmith...\n');

    // List all projects
    const projects = await client.listProjects();
    
    console.log(`✅ Found ${projects.length} project(s):\n`);
    
    for (const project of projects) {
      console.log(`   📁 ${project.name}`);
      if (project.description) {
        console.log(`      Description: ${project.description}`);
      }
      console.log(`      ID: ${project.id}`);
      console.log(`      Created: ${project.created_at}`);
      console.log('');
    }

    console.log('💡 Current LANGCHAIN_PROJECT setting:', process.env.LANGCHAIN_PROJECT);
    console.log('\n📝 To use a different project, update LANGCHAIN_PROJECT in .env\n');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkProjects();
