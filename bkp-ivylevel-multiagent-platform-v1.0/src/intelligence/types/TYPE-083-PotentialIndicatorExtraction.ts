/**
 * TYPE-083: Potential Indicator Extraction Intelligence
 *
 * Purpose: Detect hidden strengths, untapped opportunities, and latent potential
 * signals that aren't immediately obvious from facts.
 *
 * Framework: Signal Detection + Pattern Recognition
 * - Hidden Strengths: Capabilities mentioned in passing but not showcased
 * - Untapped Opportunities: Natural extensions of current activities
 * - Latent Potential: Signals of future growth (curiosity, self-direction, etc.)
 *
 * Core Algorithm:
 * 1. Scan facts for potential indicators (keywords, patterns, anomalies)
 * 2. Identify underutilized strengths (high skill, low application)
 * 3. Detect opportunity gaps (interests without matching activities)
 * 4. Surface latent potential signals (growth mindset, initiative markers)
 * 5. Generate activation recommendations
 *
 * Created: 2025-10-29
 * Version: v23.0 AssessmentAgent Intelligence Types
 */

import { IntelligenceType, IntelligenceResult, AgentQuery, FactSet, FactCategory } from './BaseIntelligenceType.js';

interface PotentialIndicator {
  indicator_type: 'hidden_strength' | 'untapped_opportunity' | 'latent_potential';
  title: string;
  evidence: string[];
  activation_potential: number; // 0-10 (how much this could add if activated)
  activation_actions: string[];
  estimated_weeks_to_activate: number;
}

interface PotentialIndicatorResult {
  student_id: string;
  total_indicators: number;
  hidden_strengths: PotentialIndicator[];
  untapped_opportunities: PotentialIndicator[];
  latent_potential_signals: PotentialIndicator[];
  highest_potential_activations: PotentialIndicator[];
  potential_ivyscore_boost: number; // If all top indicators activated
  next_actions: string[];
}

export class PotentialIndicatorExtraction implements IntelligenceType {
  type_id = 'TYPE-083';
  name = 'Potential Indicator Extraction';
  category: 'UNIVERSAL' | 'DOMAIN_SPECIFIC' = 'DOMAIN_SPECIFIC';
  description = 'Detects hidden strengths, untapped opportunities, and latent potential signals';

  components = {
    framework: {
      name: 'Signal Detection + Pattern Recognition',
      description: 'Identify non-obvious potential from existing data',
      mental_model: 'What\'s there but not yet activated? What could bloom with focus?',
    },
    tactics: [
      {
        name: 'Hidden Strength Detection',
        description: 'Find capabilities mentioned but not showcased',
        steps: ['Scan for skill keywords', 'Check if skills are applied', 'Identify underutilized strengths'],
      },
      {
        name: 'Opportunity Gap Mapping',
        description: 'Match interests to potential activities',
        steps: ['Extract interests/passions', 'Find missing aligned activities', 'Recommend natural extensions'],
      },
    ],
    techniques: [],
    chips: [],
    metrics: {
      success_criteria: ['Hidden strengths surfaced', 'Opportunities identified', 'Activation path clear'],
      validation: 'Activation recommendations lead to profile enhancement',
    },
    triggers: {
      conditions: ['potential', 'hidden', 'untapped', 'opportunities', 'strengths'],
    },
  };

  private readonly STRENGTH_KEYWORDS = [
    'coding', 'programming', 'research', 'writing', 'design', 'leadership',
    'public speaking', 'teaching', 'organizing', 'creative', 'analytical',
  ];

  private readonly GROWTH_SIGNALS = [
    'curious', 'self-taught', 'independent', 'initiative', 'proactive',
    'founded', 'created', 'built', 'taught myself', 'explored',
  ];

  async process(query: AgentQuery, facts: FactSet): Promise<IntelligenceResult> {
    const studentId = query.entity_id;
    const allFacts = facts.getAllFacts();

    // Detect hidden strengths
    const hiddenStrengths = this.detectHiddenStrengths(allFacts);

    // Identify untapped opportunities
    const untappedOpportunities = this.identifyUntappedOpportunities(allFacts);

    // Surface latent potential signals
    const latentPotentialSignals = this.surfaceLatentPotential(allFacts);

    const allIndicators = [...hiddenStrengths, ...untappedOpportunities, ...latentPotentialSignals];

    // Sort by activation potential
    const highestPotentialActivations = allIndicators
      .sort((a, b) => b.activation_potential - a.activation_potential)
      .slice(0, 5);

    // Calculate potential IvyScore boost
    const potentialBoost = highestPotentialActivations.reduce((sum, ind) => sum + ind.activation_potential, 0);

    const nextActions = this.generateNextActions(highestPotentialActivations);

    const result: PotentialIndicatorResult = {
      student_id: studentId,
      total_indicators: allIndicators.length,
      hidden_strengths: hiddenStrengths,
      untapped_opportunities: untappedOpportunities,
      latent_potential_signals: latentPotentialSignals,
      highest_potential_activations: highestPotentialActivations,
      potential_ivyscore_boost: potentialBoost,
      next_actions: nextActions,
    };

    return {
      type_id: this.type_id,
      component: 'potential_indicator_extraction',
      triggered: true,
      confidence: 0.75,
      data: result,
    };
  }

  private detectHiddenStrengths(facts: any[]): PotentialIndicator[] {
    const strengths: PotentialIndicator[] = [];

    // Scan for skill keywords
    for (const keyword of this.STRENGTH_KEYWORDS) {
      const mentions = facts.filter(f => JSON.stringify(f).toLowerCase().includes(keyword));
      if (mentions.length > 0) {
        // Check if strength is applied (activity with same keyword)
        const appliedInActivity = facts.some(f =>
          f.category === 'ACTIVITY_DATA' && JSON.stringify(f).toLowerCase().includes(keyword)
        );

        if (!appliedInActivity) {
          strengths.push({
            indicator_type: 'hidden_strength',
            title: `${keyword} skill mentioned but not showcased`,
            evidence: [`Mentioned: ${JSON.stringify(mentions[0]).substring(0, 100)}`],
            activation_potential: 7,
            activation_actions: [
              `Create project showcasing ${keyword}`,
              `Join activity using ${keyword}`,
              `Enter competition in ${keyword}`,
            ],
            estimated_weeks_to_activate: 8,
          });
        }
      }
    }

    return strengths;
  }

  private identifyUntappedOpportunities(facts: any[]): PotentialIndicator[] {
    const opportunities: PotentialIndicator[] = [];

    // Check for interests without matching activities
    const interestFacts = facts.filter(f =>
      JSON.stringify(f).toLowerCase().includes('interest') ||
      JSON.stringify(f).toLowerCase().includes('passion')
    );

    for (const interestFact of interestFacts) {
      const interestText = JSON.stringify(interestFact).toLowerCase();

      // Extract interest keywords
      if (interestText.includes('cs') || interestText.includes('computer science')) {
        const hasCSActivity = facts.some(f =>
          f.category === 'ACTIVITY_DATA' && JSON.stringify(f).toLowerCase().includes('computer')
        );
        if (!hasCSActivity) {
          opportunities.push({
            indicator_type: 'untapped_opportunity',
            title: 'CS interest without matching activities',
            evidence: ['Mentioned CS interest', 'No CS-related activities'],
            activation_potential: 8,
            activation_actions: [
              'Join CS club or coding team',
              'Start personal coding project',
              'Enter hackathon or CS competition',
            ],
            estimated_weeks_to_activate: 4,
          });
        }
      }
    }

    // Generic opportunity: If <5 activities, opportunity to add
    const activityCount = facts.filter(f => f.category === 'ACTIVITY_DATA').length;
    if (activityCount < 5) {
      opportunities.push({
        indicator_type: 'untapped_opportunity',
        title: 'Room for additional strategic activities',
        evidence: [`Only ${activityCount} activities (target: 5-7)`],
        activation_potential: 6,
        activation_actions: [
          'Identify 2-3 aligned activities to add',
          'Focus on depth over breadth',
          'Ensure activities support narrative',
        ],
        estimated_weeks_to_activate: 12,
      });
    }

    return opportunities;
  }

  private surfaceLatentPotential(facts: any[]): PotentialIndicator[] {
    const signals: PotentialIndicator[] = [];

    // Scan for growth mindset signals
    for (const signal of this.GROWTH_SIGNALS) {
      const mentions = facts.filter(f => JSON.stringify(f).toLowerCase().includes(signal));
      if (mentions.length > 0) {
        signals.push({
          indicator_type: 'latent_potential',
          title: `Growth signal: ${signal}`,
          evidence: [`Evidence: ${JSON.stringify(mentions[0]).substring(0, 100)}`],
          activation_potential: 5,
          activation_actions: [
            'Amplify self-directed initiative',
            'Document learning journey',
            'Showcase independent projects',
          ],
          estimated_weeks_to_activate: 6,
        });
      }
    }

    return signals;
  }

  private generateNextActions(highestPotentialActivations: PotentialIndicator[]): string[] {
    const actions: string[] = [];

    if (highestPotentialActivations.length > 0) {
      const top = highestPotentialActivations[0];
      actions.push(`🚀 Top Activation: ${top.title} (+${top.activation_potential} points potential)`);
      actions.push(`Action: ${top.activation_actions[0]}`);
    }

    const quickActivations = highestPotentialActivations.filter(ind => ind.estimated_weeks_to_activate <= 8);
    if (quickActivations.length > 0) {
      actions.push(`⚡ ${quickActivations.length} quick activations possible (<8 weeks)`);
    }

    return actions;
  }
}
