#!/usr/bin/env node

// Run the ETL script with proper module loading
const { execSync } = require('child_process');
const path = require('path');

console.log('Running ETL from kbase...');

try {
  // Change to the script directory
  process.chdir(__dirname);
  
  // Run the TypeScript file with ts-node
  const cmd = `node --require ts-node/register/transpile-only src/etl_kb_from_kbase.ts`;
  
  execSync(cmd, {
    stdio: 'inherit',
    env: {
      ...process.env,
      TS_NODE_TRANSPILE_ONLY: 'true',
      TS_NODE_PROJECT: path.join(__dirname, 'tsconfig.json')
    }
  });
  
} catch (error) {
  console.error('ETL failed:', error.message);
  process.exit(1);
}