/**
 * Set test password for Huda student account
 * Password: testpass123
 */

import bcrypt from 'bcryptjs';
import pg from 'pg';
const { Client } = pg;

async function setTestPassword() {
  const client = new Client({
    database: 'ivylevel',
    user: 'postgres',
    host: 'localhost',
    port: 5432
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Hash the password: testpass123
    const password = 'testpass123';
    const passwordHash = await bcrypt.hash(password, 10);

    console.log('Generated password hash for: testpass123');

    // Update Huda's password
    const result = await client.query(
      `UPDATE students
       SET password_hash = $1,
           password_updated_at = NOW()
       WHERE student_id = 'huda-2025'
       RETURNING student_id, email`,
      [passwordHash]
    );

    if (result.rows.length > 0) {
      console.log('✅ Password updated successfully for:');
      console.log(`   Student ID: ${result.rows[0].student_id}`);
      console.log(`   Email: ${result.rows[0].email}`);
      console.log(`   Password: testpass123`);
    } else {
      console.log('❌ Student not found');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

setTestPassword();
