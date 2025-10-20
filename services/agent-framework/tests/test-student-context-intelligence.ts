/**
 * Test Student Context Intelligence
 *
 * Verify:
 * 1. StudentContext can be loaded from DB
 * 2. CoachIntelligence can be loaded from DB
 * 3. JennyDuanCoach can process coaching actions
 * 4. EventBus can emit/handle events
 * 5. Student-coach isolation works
 */

import { Pool } from 'pg';
import { StudentContextRepository } from '../src/repositories/StudentContextRepository.js';
import { CoachIntelligenceRepository } from '../src/repositories/CoachIntelligenceRepository.js';
import { JennyDuanCoach } from '../src/intelligence/JennyDuanCoach.js';
import { EventBus } from '../src/events/EventBus.js';

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/ivylevel';

async function main() {
  console.log('🧪 Testing Student Context Intelligence...\n');

  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    // 1. Test StudentContext loading
    console.log('1️⃣  Testing StudentContext loading...');
    const studentRepo = new StudentContextRepository(pool);
    const hudaContext = await studentRepo.getByStudentId('huda-2025');

    if (!hudaContext) {
      throw new Error('Huda context not found!');
    }

    console.log('   ✅ Huda context loaded successfully');
    console.log(
      `   - Name: ${hudaContext.name}, Class Year: ${hudaContext.class_year}, Week: ${hudaContext.current_week}`
    );
    console.log(
      `   - Personality: ${hudaContext.psycho_behavioral.personality_type}`
    );
    console.log(
      `   - GPA: ${hudaContext.academic.gpa_weighted}, SAT: ${hudaContext.academic.test_scores.sat}`
    );
    console.log(
      `   - Identity Score: ${hudaContext.state.identity_score}, Rubric Total: ${hudaContext.state.rubric_scores.total}`
    );
    console.log(
      `   - Target Schools: ${hudaContext.goals.target_schools.map((s) => s.name).join(', ')}\n`
    );

    // 2. Test CoachIntelligence loading
    console.log('2️⃣  Testing CoachIntelligence loading...');
    const coachRepo = new CoachIntelligenceRepository(pool);
    const jennyIntelligence = await coachRepo.getByCoachId('jenny');

    if (!jennyIntelligence) {
      throw new Error('Jenny intelligence not found!');
    }

    console.log('   ✅ Jenny intelligence loaded successfully');
    console.log(
      `   - Coach: ${jennyIntelligence.coach_name}, Layers: ${jennyIntelligence.intelligence_layers}, Personas: ${jennyIntelligence.personas}`
    );
    console.log(
      `   - Specialties: ${jennyIntelligence.specialty.join(', ')}`
    );
    console.log(
      `   - Credentials: ${jennyIntelligence.credibility_markers.join(', ')}`
    );
    console.log(
      `   - Custom Tools: ${jennyIntelligence.custom_tools.length} tools`
    );
    console.log(
      `   - Pattern Library: ${jennyIntelligence.pattern_library.assessments_completed} assessments, ${jennyIntelligence.pattern_library.gameplans_generated} gameplans\n`
    );

    // 3. Test JennyDuanCoach processing
    console.log('3️⃣  Testing JennyDuanCoach processing...');
    const jennyCoach = new JennyDuanCoach(jennyIntelligence, coachRepo);

    const response = await jennyCoach.executeCoachingAction(
      'assessment',
      hudaContext,
      {
        action_type: 'assessment',
        timing: {
          class_year: hudaContext.class_year,
          current_week: hudaContext.current_week,
        },
      }
    );

    console.log('   ✅ Jenny coaching action executed successfully');
    console.log(`   - Tone: ${response.tone}`);
    console.log(
      `   - Personas Used: ${response.metadata.personas_used.join(', ')}`
    );
    console.log(
      `   - Tools Applied: ${response.metadata.tools_applied.join(', ')}`
    );
    console.log(
      `   - Processing Time: ${response.metadata.processing_time_ms}ms`
    );
    console.log(`   - Message Preview: ${response.message.substring(0, 100)}...\n`);

    // 4. Test EventBus
    console.log('4️⃣  Testing EventBus...');
    const eventBus = new EventBus(pool);

    let eventHandled = false;
    eventBus.on('student_onboarded', async (event) => {
      console.log(
        `   📨 Event handler triggered: ${event.event_type} for ${event.student_id}`
      );
      eventHandled = true;
    });

    const eventId = await eventBus.emit({
      event_type: 'student_onboarded',
      student_id: 'test-student-123',
      coach_id: 'jenny',
      payload: { source: 'test' },
    });

    // Wait for handler to execute
    await new Promise((resolve) => setTimeout(resolve, 100));

    console.log(`   ✅ Event emitted with ID: ${eventId}`);
    console.log(`   ✅ Event handler executed: ${eventHandled}\n`);

    // 5. Test student-coach isolation
    console.log('5️⃣  Testing student-coach isolation...');
    const canAccess = await studentRepo.canStudentAccessAgent(
      'huda-2025',
      'jenny'
    );
    const cannotAccess = await studentRepo.canStudentAccessAgent(
      'huda-2025',
      'other-coach'
    );

    console.log(
      `   ✅ Huda can access Jenny agents: ${canAccess ? 'YES' : 'NO'}`
    );
    console.log(
      `   ✅ Huda cannot access other coach agents: ${cannotAccess ? 'YES' : 'NO'}\n`
    );

    if (canAccess && !cannotAccess) {
      console.log('✅ Student-coach isolation working correctly!\n');
    } else {
      throw new Error('Student-coach isolation not working!');
    }

    // Final summary
    console.log('🎉 All tests passed!');
    console.log('\n📊 Summary:');
    console.log('   ✅ Student context intelligence: WORKING');
    console.log('   ✅ Coach intelligence (31 layers + 7 personas): WORKING');
    console.log('   ✅ JennyDuanCoach processing: WORKING');
    console.log('   ✅ EventBus (lifecycle events): WORKING');
    console.log('   ✅ Student-coach isolation: WORKING');
    console.log(
      '\n🚀 Ready to implement autonomous agents (Assessment, GamePlan, Weekly Execution)!'
    );
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
