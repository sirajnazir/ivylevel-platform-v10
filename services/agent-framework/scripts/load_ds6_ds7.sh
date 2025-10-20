#!/usr/bin/env bash
# Load DS6/DS7 real data from extracted coaching intelligence
# Created: 2025-10-16 (Week 14)

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT_DIR="$(dirname "$(dirname "$(dirname "$SCRIPT_DIR")")")"

echo "🚀 Loading DS6/DS7 Real Data from Jenny-Huda Coaching Intelligence"
echo ""

# Load Essay Examples (DS6)
echo "📝 Loading DS6: Essay Examples..."
tsx -e "
import { pool } from './src/db.js';
import { readFileSync } from 'fs';

const sql = readFileSync('$ROOT_DIR/data/migrations/scripts/009a_seed_essay_examples_real.sql', 'utf-8');

pool.query(sql)
  .then(() => {
    console.log('✅ DS6 Essay Examples loaded');
    return pool.query('SELECT COUNT(*) FROM moat_essay_examples');
  })
  .then(result => {
    console.log(\`   Total: \${result.rows[0].count} essay examples\`);
    pool.end();
  })
  .catch(err => {
    console.error('❌ Error loading DS6:', err.message);
    pool.end();
    process.exit(1);
  });
"

echo ""

# Load AO Perspectives (DS7)
echo "🎓 Loading DS7: AO Perspectives..."
tsx -e "
import { pool } from './src/db.js';
import { readFileSync } from 'fs';

const sql = readFileSync('$ROOT_DIR/data/migrations/scripts/009b_seed_ao_perspectives_real.sql', 'utf-8');

pool.query(sql)
  .then(() => {
    console.log('✅ DS7 AO Perspectives loaded');
    return pool.query('SELECT COUNT(*) FROM moat_ao_perspectives');
  })
  .then(result => {
    console.log(\`   Total: \${result.rows[0].count} AO perspectives\`);
    pool.end();
  })
  .catch(err => {
    console.error('❌ Error loading DS7:', err.message);
    pool.end();
    process.exit(1);
  });
"

echo ""
echo "✅ DS6/DS7 Load Complete - Real Jenny-Huda Coaching Data Only!"
