/**
 * IntelligenceRegistry - Global registry for Intelligence Types
 *
 * Purpose: Centralized management and retrieval of intelligence type instances.
 * Provides global access to all intelligence types by ID.
 *
 * Usage:
 * ```typescript
 * // At app startup
 * IntelligenceRegistry.initialize();
 *
 * // In agents
 * const arbitrage = IntelligenceRegistry.get('TYPE-023');
 * const pipeline = IntelligenceRegistry.get('TYPE-020');
 * ```
 *
 * Created: 2025-10-29
 * Architecture: v3.0 Intelligence Types
 */

import { IntelligenceType } from './types/BaseIntelligenceType.js';
import { GamePlanSynthesis } from './types/TYPE-001-GamePlanSynthesis.js';
import { WeakSpotPrioritization } from './types/TYPE-002-WeakSpotPrioritization.js';
import { TimelineArchitecture as GamePlanTimelineArchitecture } from './types/TYPE-003-TimelineArchitecture.js';
import { MultiPathConvergence } from './types/TYPE-004-MultiPathConvergence.js';
import { QuarterlyAdaptation } from './types/TYPE-006-QuarterlyAdaptation.js';
import { TimeMathematician } from './types/TYPE-007-TimeMathematician.js';
import { AwardArbitrageSystem } from './types/AwardArbitrageSystem.js';
import { OpportunityPipeline } from './types/OpportunityPipeline.js';
import { QuickWinsStrategy } from './types/QuickWinsStrategy.js';
import { ProgramSelectionMatrix } from './types/TYPE-028-ProgramSelectionMatrix.js';
import { ProgramApplicationStrategy } from './types/TYPE-029-ProgramApplicationStrategy.js';
import { CostBenefitIntelligence } from './types/TYPE-030-CostBenefitIntelligence.js';
import { ExecutionLadderNavigation } from './types/TYPE-049-ExecutionLadderNavigation.js';
import { OutcomeEngineering } from './types/TYPE-050-OutcomeEngineering.js';
import { TaskDecomposition } from './types/TYPE-051-TaskDecomposition.js';
import { PortfolioOperatingCadence } from './types/TYPE-052-PortfolioOperatingCadence.js';
import { TimeArchitecture } from './types/TYPE-053-TimeArchitecture.js';
import { MetricLadder } from './types/TYPE-054-MetricLadder.js';
import { BlockingDetection } from './types/TYPE-055-BlockingDetection.js';
import { LoREngineering } from './types/TYPE-056-LoREngineering.js';
import { ProofEngineering } from './types/TYPE-057-ProofEngineering.js';
import { ApplicationMasteryRail } from './types/TYPE-058-ApplicationMasteryRail.js';
import { NarrativeHarmonization } from './types/TYPE-059-NarrativeHarmonization.js';
import { SeasonalEnergyAllocation } from './types/TYPE-060-SeasonalEnergyAllocation.js';
import { MultiAgentDelegation } from './types/TYPE-061-MultiAgentDelegation.js';
import { QualitativeTransformation } from './types/TYPE-062-QualitativeTransformation.js';
import { ProgressVelocity } from './types/TYPE-063-ProgressVelocity.js';
import { ScholarshipSelectionMatrix } from './types/TYPE-031-ScholarshipSelectionMatrix.js';
import { ApplicationTimelineStrategy } from './types/TYPE-032-ApplicationTimelineStrategy.js';
import { FinancialAidIntelligence } from './types/TYPE-033-FinancialAidIntelligence.js';

/**
 * Global registry for intelligence type instances
 */
export class IntelligenceRegistry {
  private static modules: Map<string, IntelligenceType> = new Map();
  private static initialized: boolean = false;

  /**
   * Register a single intelligence type
   */
  static register(module: IntelligenceType): void {
    if (this.modules.has(module.type_id)) {
      console.warn(`Intelligence type ${module.type_id} already registered. Overwriting.`);
    }

    this.modules.set(module.type_id, module);
    console.log(`Registered intelligence type: ${module.type_id} - ${module.name}`);
  }

  /**
   * Get intelligence type by ID
   * @throws Error if type not found
   */
  static get(typeId: string): IntelligenceType {
    const module = this.modules.get(typeId);

    if (!module) {
      throw new Error(
        `Intelligence type ${typeId} not found. ` +
        `Available types: ${Array.from(this.modules.keys()).join(', ')}`
      );
    }

    return module;
  }

  /**
   * Check if intelligence type exists
   */
  static has(typeId: string): boolean {
    return this.modules.has(typeId);
  }

  /**
   * Get all registered intelligence types
   */
  static getAll(): IntelligenceType[] {
    return Array.from(this.modules.values());
  }

  /**
   * Get all intelligence types by category
   */
  static getByCategory(category: 'UNIVERSAL' | 'DOMAIN_SPECIFIC'): IntelligenceType[] {
    return this.getAll().filter(module => module.category === category);
  }

  /**
   * Get count of registered types
   */
  static count(): number {
    return this.modules.size;
  }

  /**
   * Initialize registry with all intelligence types
   * Call this at application startup
   */
  static initialize(): void {
    if (this.initialized) {
      console.warn('IntelligenceRegistry already initialized. Skipping.');
      return;
    }

    console.log('Initializing IntelligenceRegistry...');

    // Register UNIVERSAL intelligence types
    // TODO: Add TYPE-005, TYPE-010, TYPE-011, TYPE-012, TYPE-018, TYPE-021
    this.register(new OpportunityPipeline());  // TYPE-020

    // Register DOMAIN-SPECIFIC intelligence types (GamePlanAgent) - v18.0
    this.register(new GamePlanSynthesis());             // TYPE-001 ✅ Complete (v18.0)
    this.register(new WeakSpotPrioritization());        // TYPE-002 ✅ Complete (v18.0)
    this.register(new GamePlanTimelineArchitecture());  // TYPE-003 ✅ Complete (v18.0)
    this.register(new MultiPathConvergence());          // TYPE-004 ✅ Complete (v18.0)
    this.register(new QuarterlyAdaptation());           // TYPE-006 ✅ Complete (v18.0)
    this.register(new TimeMathematician());             // TYPE-007 ✅ Complete (v18.0)

    // Register DOMAIN-SPECIFIC intelligence types (Awards Agent)
    this.register(new AwardArbitrageSystem()); // TYPE-023
    this.register(new QuickWinsStrategy());    // TYPE-027

    // Register DOMAIN-SPECIFIC intelligence types (Summer Programs Agent) - v19.0
    this.register(new ProgramSelectionMatrix());    // TYPE-028
    this.register(new ProgramApplicationStrategy()); // TYPE-029
    this.register(new CostBenefitIntelligence());    // TYPE-030

    // Register DOMAIN-SPECIFIC intelligence types (ScholarshipsAgent) - v21.0
    this.register(new ScholarshipSelectionMatrix());  // TYPE-031
    this.register(new ApplicationTimelineStrategy()); // TYPE-032
    this.register(new FinancialAidIntelligence());    // TYPE-033

    // Register DOMAIN-SPECIFIC intelligence types (ExecutionAgent) - v20.0-v20.5
    this.register(new ExecutionLadderNavigation());  // TYPE-049 ✅ Complete (v20.0)
    this.register(new OutcomeEngineering());         // TYPE-050 ✅ Complete (v20.0)
    this.register(new TaskDecomposition());          // TYPE-051 ✅ Complete (v20.1)
    this.register(new PortfolioOperatingCadence());  // TYPE-052 ✅ Complete (v20.1)
    this.register(new TimeArchitecture());           // TYPE-053 ✅ Complete (v20.2)
    this.register(new MetricLadder());               // TYPE-054 ✅ Complete (v20.2)
    this.register(new BlockingDetection());          // TYPE-055 ✅ Complete (v20.3)
    this.register(new LoREngineering());             // TYPE-056 ✅ Complete (v20.3)
    this.register(new ProofEngineering());           // TYPE-057 ✅ Complete (v20.4)
    this.register(new ApplicationMasteryRail());     // TYPE-058 ✅ Complete (v20.4)
    this.register(new NarrativeHarmonization());     // TYPE-059 ✅ Complete (v20.5)
    this.register(new SeasonalEnergyAllocation());   // TYPE-060 ✅ Complete (v20.5)
    this.register(new MultiAgentDelegation());       // TYPE-061 ✅ Complete (v20.1)
    this.register(new QualitativeTransformation());  // TYPE-062 ✅ Complete (v20.5)
    this.register(new ProgressVelocity());           // TYPE-063 ✅ Complete (v20.1)

    this.initialized = true;

    console.log(`IntelligenceRegistry initialized with ${this.count()} intelligence types`);
    console.log(`  Universal: ${this.getByCategory('UNIVERSAL').length}`);
    console.log(`  Domain-Specific: ${this.getByCategory('DOMAIN_SPECIFIC').length}`);
  }

  /**
   * Reset registry (for testing)
   */
  static reset(): void {
    this.modules.clear();
    this.initialized = false;
    console.log('IntelligenceRegistry reset');
  }

  /**
   * List all registered intelligence types (debug)
   */
  static list(): void {
    console.log('\n=== Intelligence Registry ===');
    console.log(`Total: ${this.count()} intelligence types\n`);

    const universal = this.getByCategory('UNIVERSAL');
    const domainSpecific = this.getByCategory('DOMAIN_SPECIFIC');

    if (universal.length > 0) {
      console.log('UNIVERSAL Intelligence Types:');
      universal.forEach(module => {
        console.log(`  - ${module.type_id}: ${module.name}`);
      });
      console.log('');
    }

    if (domainSpecific.length > 0) {
      console.log('DOMAIN-SPECIFIC Intelligence Types:');
      domainSpecific.forEach(module => {
        console.log(`  - ${module.type_id}: ${module.name}`);
      });
      console.log('');
    }
  }
}
