/**
 * Initialize FactStore with all fact sources
 * v18.0: Central initialization for fact-first architecture
 *
 * Called at server startup to register all fact sources
 */

import { Pool } from 'pg';
import { FactStore } from './FactStore.js';
import { FactCategory } from './types.js';
import { PostgresFactSource } from './sources/PostgresFactSource.js';
import { createLogger } from '../../../../packages/observability/dist/unified-logger.js';

const log = createLogger('fact-store-init');

/**
 * Initialize FactStore with all available fact sources
 */
export function initializeFactStore(pool: Pool): FactStore {
  log.event('fact_store.initialize_start', {});

  const factStore = new FactStore();

  // Register internal database sources
  log.event('fact_store.register_postgres_sources', {});

  factStore.registerSource(
    FactCategory.ASSESSMENT_DATA,
    new PostgresFactSource(pool, FactCategory.ASSESSMENT_DATA)
  );

  factStore.registerSource(
    FactCategory.ACTIVITY_DATA,
    new PostgresFactSource(pool, FactCategory.ACTIVITY_DATA)
  );

  factStore.registerSource(
    FactCategory.STUDENT_PROFILE,
    new PostgresFactSource(pool, FactCategory.STUDENT_PROFILE)
  );

  factStore.registerSource(
    FactCategory.ACADEMIC_DATA,
    new PostgresFactSource(pool, FactCategory.ACADEMIC_DATA)
  );

  // TODO: Register external sources when available
  // factStore.registerSource(
  //   FactCategory.COLLEGE_ADMISSIONS,
  //   new CommonDataSetFactSource()
  // );

  const registeredCategories = factStore.getRegisteredCategories();
  log.event('fact_store.initialize_complete', {
    categories_registered: registeredCategories,
    sources_count: registeredCategories.length,
  });

  return factStore;
}
