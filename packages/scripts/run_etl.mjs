#!/usr/bin/env node

// Simple ETL runner that directly executes the kbase ETL
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('Starting ETL process...');

// Run with ts-node in CJS mode
const tsNode = spawn('npx', [
  'ts-node',
  '--transpile-only',
  '--compiler-options', '{"module":"commonjs"}',
  join(__dirname, 'src/etl_kb_from_kbase.ts')
], {
  stdio: 'inherit',
  cwd: __dirname,
  env: {
    ...process.env,
    NODE_ENV: 'development'
  }
});

tsNode.on('close', (code) => {
  if (code !== 0) {
    console.error(`ETL process exited with code ${code}`);
    process.exit(code);
  }
});