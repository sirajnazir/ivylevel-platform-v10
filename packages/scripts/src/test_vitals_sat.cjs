const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ivylevel'
});

async function testVitalsSat() {
  console.log('Testing Vitals SAT Retrieval...\n');
  
  try {
    // 1. Check vitals
    const vitalsResult = await pool.query(
      "SELECT vitals->'academics'->'sat' as sat_data FROM student_state WHERE student_id='huda-2025'"
    );
    
    const satData = vitalsResult.rows[0]?.sat_data;
    console.log('✅ SAT Data in Vitals:');
    console.log(JSON.stringify(satData, null, 2));
    
    // 2. Verify SAT score
    if (satData && satData.current === 1530) {
      console.log('\n✅ SUCCESS: SAT score 1530 is correctly stored in vitals!');
      console.log('   - Current: ' + satData.current);
      console.log('   - Superscore: ' + satData.superscore);
      console.log('   - Timeline entries: ' + satData.timeline.length);
    } else {
      console.log('\n❌ FAILURE: SAT score not found or incorrect!');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

testVitalsSat();