// Simple password reset for hudasir4j@gmail.com
const { execSync } = require('child_process');

const email = 'hudasir4j@gmail.com';
const password = 'password123';

// Using bcrypt hash for 'password123' with 10 rounds
const hash = '$2b$10$YQiiz07R8I7RGh9YgH6zJe5R7iKWp8fxVzV6V0yW8xOJxGxK4R8rK';

const sql = `UPDATE students SET password_hash = '${hash}' WHERE email = '${email}';`;

try {
  execSync(`PGPASSWORD=postgres psql -h localhost -U postgres -d ivylevel -c "${sql}"`, { stdio: 'inherit' });
  console.log('\n✅ Password reset complete for', email);
  console.log('   Password: password123');
} catch (error) {
  console.error('❌ Failed to reset password:', error.message);
}
