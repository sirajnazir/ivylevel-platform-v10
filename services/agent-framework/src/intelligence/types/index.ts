/**
 * Intelligence Types - Export all intelligence type implementations
 *
 * Purpose: Central export point for all intelligence types
 *
 * Created: 2025-10-29
 * Architecture: v3.0 Intelligence Types
 */

// Base interface and abstract class
export {
  IntelligenceType,
  BaseIntelligenceType,
  AgentQuery,
  IntelligenceResult,
  IntelligenceComponents,
  ConceptualModel,
  Tactic,
  Technique,
  Chip,
  SuccessCriteria,
  ActivationCondition
} from './BaseIntelligenceType.js';

// UNIVERSAL Intelligence Types
export { OpportunityPipeline, Opportunity } from './OpportunityPipeline.js';

// DOMAIN-SPECIFIC Intelligence Types (Awards Agent)
export { AwardArbitrageSystem } from './AwardArbitrageSystem.js';
export { QuickWinsStrategy, QuickWin, MomentumPlan } from './QuickWinsStrategy.js';

// TODO: Add more intelligence types as implemented
// - TYPE-005: 3R Rejection Protocol
// - TYPE-010: Permission Field
// - TYPE-011: Celebration Science
// - TYPE-012: Rejection Alchemy
// - TYPE-018: Strategic Pivot Protocol
// - TYPE-021: Parent Navigation Matrix
