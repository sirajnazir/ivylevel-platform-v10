/**
 * extract-coaching-intelligence.ts
 *
 * Script to extract coaching intelligence from Old Huda's successful journey
 * and store it in the database for use with new students.
 *
 * Usage:
 *   tsx src/scripts/extract-coaching-intelligence.ts [--student-id huda-2025] [--full]
 *
 * Options:
 *   --student-id <id>  - Student ID to extract from (default: huda-2025)
 *   --full             - Run full extraction pipeline (assessment + week1 + prompts)
 *   --assessment-only  - Extract only assessment intelligence
 *   --week1-only       - Extract only Week 1 framework
 *   --prompts-only     - Generate only interactive prompts from existing extractions
 *
 * Version: v10.2
 * Created: 2025-10-20
 */

import { CoachingIntelligenceExtractor } from '../intelligence/CoachingIntelligenceExtractor';

async function main() {
  const args = process.argv.slice(2);

  const studentId = args.includes('--student-id')
    ? args[args.indexOf('--student-id') + 1]
    : 'huda-2025';

  const fullPipeline = args.includes('--full');
  const assessmentOnly = args.includes('--assessment-only');
  const week1Only = args.includes('--week1-only');
  const promptsOnly = args.includes('--prompts-only');

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('        Coaching Intelligence Extraction Pipeline');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Source Student: ${studentId}`);
  console.log(`Mode: ${fullPipeline ? 'FULL PIPELINE' : assessmentOnly ? 'ASSESSMENT ONLY' : week1Only ? 'WEEK 1 ONLY' : promptsOnly ? 'PROMPTS ONLY' : 'FULL PIPELINE (default)'}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  const extractor = new CoachingIntelligenceExtractor();

  try {
    if (fullPipeline || (!assessmentOnly && !week1Only && !promptsOnly)) {
      // Run full pipeline
      console.log('[Pipeline] Running FULL extraction pipeline...\n');

      const result = await extractor.runFullExtraction(studentId);

      console.log('\n═══════════════════════════════════════════════════════════════');
      console.log('                     ✅ EXTRACTION COMPLETE');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('Assessment Extraction:', result.assessmentExtractionId);
      console.log('Week 1 Extraction:    ', result.week1ExtractionId);
      console.log('Assessment Framework: ', result.assessmentFrameworkId);
      console.log('Week 1 Framework:     ', result.week1FrameworkId);
      console.log('═══════════════════════════════════════════════════════════════\n');
    } else if (assessmentOnly) {
      console.log('[Pipeline] Extracting assessment intelligence only...\n');

      const extractionId = await extractor.extractAssessmentIntelligence(studentId);

      console.log('\n═══════════════════════════════════════════════════════════════');
      console.log('                ✅ ASSESSMENT EXTRACTION COMPLETE');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('Extraction ID:', extractionId);
      console.log('═══════════════════════════════════════════════════════════════\n');
    } else if (week1Only) {
      console.log('[Pipeline] Extracting Week 1 framework only...\n');

      const extractionId = await extractor.extractWeek1Framework(studentId);

      console.log('\n═══════════════════════════════════════════════════════════════');
      console.log('               ✅ WEEK 1 EXTRACTION COMPLETE');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('Extraction ID:', extractionId);
      console.log('═══════════════════════════════════════════════════════════════\n');
    } else if (promptsOnly) {
      console.log('[Pipeline] Generating interactive prompts only...\n');

      const assessmentFrameworkId = await extractor.generateInteractivePrompts('assessment');
      const week1FrameworkId = await extractor.generateInteractivePrompts('week_1_planning');

      console.log('\n═══════════════════════════════════════════════════════════════');
      console.log('              ✅ PROMPT GENERATION COMPLETE');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('Assessment Framework:', assessmentFrameworkId);
      console.log('Week 1 Framework:    ', week1FrameworkId);
      console.log('═══════════════════════════════════════════════════════════════\n');
    }

    console.log('[Pipeline] You can now use these frameworks for interactive/simulated coaching!');
    console.log('[Pipeline] Next step: Run InteractiveSessionManager with new student (huda-2025-new)');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR:', error);
    console.error('\nStack trace:', error instanceof Error ? error.stack : String(error));
    process.exit(1);
  }
}

main();
