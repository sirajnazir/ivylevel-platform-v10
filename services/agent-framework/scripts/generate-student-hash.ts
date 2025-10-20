/**
 * Generate password hash for student account
 */

import bcrypt from 'bcryptjs';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function generateAndUpdateHash() {
  try {
    console.log('Generating bcrypt hash for password123...');

    // Generate hash
    const hash = await bcrypt.hash('password123', 10);
    console.log('Generated hash:', hash);

    // Update student record
    const result = await pool.query(
      `UPDATE students
       SET password_hash = $1,
           password_updated_at = NOW()
       WHERE student_id = 'huda-2025'
       RETURNING student_id, email, full_name`,
      [hash]
    );

    if (result.rows.length > 0) {
      console.log('✅ Student updated successfully:');
      console.log(result.rows[0]);
    } else {
      console.log('❌ Student not found');
    }

    // Test the hash
    const isValid = await bcrypt.compare('password123', hash);
    console.log('\n✅ Hash validation test:', isValid ? 'PASSED' : 'FAILED');

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

generateAndUpdateHash();
