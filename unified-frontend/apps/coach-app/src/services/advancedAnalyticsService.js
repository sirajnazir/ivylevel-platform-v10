// Advanced Analytics Service
// Correlates sessions, execution docs, and game plans for deep insights

import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import comprehensiveKnowledgeBaseService from './comprehensiveKnowledgeBaseService';

class AdvancedAnalyticsService {
  constructor() {
    this.correlationCache = new Map();
    this.insightPatterns = new Map();
  }

  // Analyze student outcomes based on coaching patterns
  async analyzeStudentOutcomes(studentId) {
    const analysis = {
      profile: {},
      journey: {},
      outcomes: {},
      recommendations: {},
      predictiveInsights: {}
    };

    // 1. Get comprehensive student data
    const studentJourney = await comprehensiveKnowledgeBaseService.getStudentJourney(studentId);
    const gamePlan = await this.getStudentGamePlan(studentId);
    const sessions = await this.getStudentSessions(studentId);

    // 2. Profile Analysis
    analysis.profile = {
      student: studentId,
      startDate: this.getJourneyStartDate(studentJourney),
      totalWeeks: studentJourney?.journeyData?.journey?.length || 0,
      sessionCount: sessions.length,
      completionRate: studentJourney?.metrics?.averageCompletionRate || 0,
      strengthAreas: gamePlan?.profileStrengths || [],
      challengeAreas: gamePlan?.developmentAreas || []
    };

    // 3. Journey Analysis
    analysis.journey = this.analyzeJourneyProgression(studentJourney, sessions);

    // 4. Outcome Correlation
    analysis.outcomes = await this.correlateOutcomes(studentJourney, gamePlan, sessions);

    // 5. Generate Recommendations
    analysis.recommendations = await this.generateDataDrivenRecommendations(analysis);

    // 6. Predictive Insights
    analysis.predictiveInsights = await this.generatePredictiveInsights(analysis);

    return analysis;
  }

  // Analyze journey progression with execution docs
  analyzeJourneyProgression(journey, sessions) {
    if (!journey?.journeyData?.journey) return {};

    const weeklyData = journey.journeyData.journey;
    const progression = {
      phases: this.identifyJourneyPhases(weeklyData),
      momentumShifts: this.findMomentumShifts(weeklyData),
      criticalMoments: this.identifyCriticalMoments(weeklyData, sessions),
      efficiencyTrend: this.calculateEfficiencyTrend(weeklyData)
    };

    // Identify breakthrough moments
    progression.breakthroughs = weeklyData
      .filter(week => week.wins?.length > 2 || week.completed?.length > week.goals?.length * 0.8)
      .map(week => ({
        week: week.week,
        impact: this.assessBreakthroughImpact(week),
        factors: this.identifyBreakthroughFactors(week)
      }));

    // Identify struggle periods
    progression.struggles = weeklyData
      .filter(week => week.challenges?.length > 2 || week.completed?.length < week.goals?.length * 0.5)
      .map(week => ({
        week: week.week,
        severity: this.assessStruggleSeverity(week),
        rootCauses: this.identifyRootCauses(week)
      }));

    return progression;
  }

  // Correlate outcomes across all data sources
  async correlateOutcomes(journey, gamePlan, sessions) {
    const correlations = {
      goalAchievement: {},
      sessionEffectiveness: {},
      strategyAlignment: {},
      timelineAdherence: {}
    };

    // 1. Goal Achievement Correlation
    if (journey?.journeyData?.journey && gamePlan) {
      correlations.goalAchievement = this.correlateGoalsToOutcomes(
        journey.journeyData.journey,
        gamePlan.strategy?.timeline
      );
    }

    // 2. Session Effectiveness
    correlations.sessionEffectiveness = this.analyzeSessionImpact(sessions, journey);

    // 3. Strategy Alignment
    correlations.strategyAlignment = this.measureStrategyAlignment(
      sessions,
      gamePlan?.strategy?.positioning
    );

    // 4. Timeline Adherence
    correlations.timelineAdherence = this.analyzeTimelineAdherence(
      journey?.journeyData?.journey,
      gamePlan?.strategy?.timeline
    );

    return correlations;
  }

  // Generate data-driven recommendations
  async generateDataDrivenRecommendations(analysis) {
    const recommendations = {
      immediate: [],
      shortTerm: [],
      longTerm: [],
      resourceAllocation: {}
    };

    // 1. Immediate actions based on current challenges
    const recentChallenges = this.getRecentChallenges(analysis.journey);
    for (const challenge of recentChallenges) {
      const solution = await this.findProvenSolution(challenge, analysis.profile);
      if (solution) {
        recommendations.immediate.push({
          challenge,
          solution,
          expectedImpact: solution.successRate,
          implementation: solution.steps
        });
      }
    }

    // 2. Short-term optimizations
    const inefficiencies = this.identifyInefficiencies(analysis);
    recommendations.shortTerm = inefficiencies.map(inefficiency => ({
      area: inefficiency.area,
      currentState: inefficiency.current,
      targetState: inefficiency.target,
      actions: this.generateOptimizationActions(inefficiency)
    }));

    // 3. Long-term strategic recommendations
    recommendations.longTerm = await this.generateStrategicRecommendations(analysis);

    // 4. Resource allocation recommendations
    recommendations.resourceAllocation = this.optimizeResourceAllocation(analysis);

    return recommendations;
  }

  // Generate predictive insights
  async generatePredictiveInsights(analysis) {
    const insights = {
      successProbability: 0,
      riskFactors: [],
      opportunityWindows: [],
      criticalMilestones: []
    };

    // 1. Calculate success probability
    insights.successProbability = await this.calculateSuccessProbability(analysis);

    // 2. Identify risk factors
    insights.riskFactors = this.identifyRiskFactors(analysis);

    // 3. Identify opportunity windows
    insights.opportunityWindows = this.findOpportunityWindows(analysis);

    // 4. Define critical milestones
    insights.criticalMilestones = this.defineCriticalMilestones(analysis);

    return insights;
  }

  // Pattern recognition across students
  async findSuccessPatterns(criteria = {}) {
    const { 
      minSuccessRate = 0.8,
      focusArea = null,
      grade = null,
      challengeType = null
    } = criteria;

    const patterns = {
      commonTraits: [],
      successSequences: [],
      coachingPatterns: [],
      resourcePatterns: []
    };

    // Get all successful student journeys
    const successfulJourneys = await this.getSuccessfulJourneys(minSuccessRate);

    // 1. Common traits analysis
    patterns.commonTraits = this.extractCommonTraits(successfulJourneys, {
      focusArea,
      grade
    });

    // 2. Success sequences - what order of actions led to success
    patterns.successSequences = this.identifySuccessSequences(successfulJourneys);

    // 3. Coaching patterns - what coaching approaches worked
    patterns.coachingPatterns = this.analyzeCoachingPatterns(successfulJourneys);

    // 4. Resource utilization patterns
    patterns.resourcePatterns = this.analyzeResourcePatterns(successfulJourneys);

    return patterns;
  }

  // Cross-student comparison
  async compareStudents(studentIds) {
    const comparisons = {
      students: [],
      metrics: {},
      insights: []
    };

    // Load all student data
    for (const studentId of studentIds) {
      const analysis = await this.analyzeStudentOutcomes(studentId);
      comparisons.students.push(analysis);
    }

    // Compare key metrics
    comparisons.metrics = {
      completionRates: this.compareMetric(comparisons.students, 'completionRate'),
      momentumScores: this.compareMetric(comparisons.students, 'momentumScore'),
      challengeResolution: this.compareMetric(comparisons.students, 'challengeResolutionRate'),
      goalAchievement: this.compareMetric(comparisons.students, 'goalAchievementRate')
    };

    // Generate comparative insights
    comparisons.insights = this.generateComparativeInsights(comparisons);

    return comparisons;
  }

  // Coach effectiveness analysis
  async analyzeCoachEffectiveness(coachId, timeRange = 'all') {
    const effectiveness = {
      coach: coachId,
      metrics: {},
      studentOutcomes: [],
      strengths: [],
      improvementAreas: [],
      bestPractices: []
    };

    // Get all students coached
    const students = await this.getCoachStudents(coachId);
    
    // Analyze each student's journey
    for (const student of students) {
      const outcome = await this.analyzeStudentOutcomes(student.id);
      effectiveness.studentOutcomes.push({
        student: student.id,
        successMetrics: outcome.outcomes,
        duration: outcome.profile.totalWeeks,
        completionRate: outcome.profile.completionRate
      });
    }

    // Calculate aggregate metrics
    effectiveness.metrics = {
      averageCompletionRate: this.calculateAverage(effectiveness.studentOutcomes, 'completionRate'),
      successRate: this.calculateSuccessRate(effectiveness.studentOutcomes),
      averageDuration: this.calculateAverage(effectiveness.studentOutcomes, 'duration'),
      consistencyScore: this.calculateConsistencyScore(effectiveness.studentOutcomes)
    };

    // Identify coaching strengths
    effectiveness.strengths = this.identifyCoachingStrengths(effectiveness.studentOutcomes);

    // Identify improvement areas
    effectiveness.improvementAreas = this.identifyImprovementAreas(effectiveness.studentOutcomes);

    // Extract best practices
    effectiveness.bestPractices = await this.extractBestPractices(coachId, effectiveness.studentOutcomes);

    return effectiveness;
  }

  // Longitudinal trend analysis
  async analyzeLongitudinalTrends(timeRange = 'year') {
    const trends = {
      overallTrends: {},
      categoryTrends: {},
      coachTrends: {},
      studentTypeTrends: {}
    };

    // 1. Overall platform trends
    trends.overallTrends = {
      sessionVolume: await this.analyzeSessionVolumeTrend(timeRange),
      completionRates: await this.analyzeCompletionRateTrend(timeRange),
      outcomeQuality: await this.analyzeOutcomeQualityTrend(timeRange),
      engagementLevels: await this.analyzeEngagementTrend(timeRange)
    };

    // 2. Category-specific trends
    const categories = ['Essay Writing', 'Test Prep', 'Activity Planning', 'School Research'];
    for (const category of categories) {
      trends.categoryTrends[category] = await this.analyzeCategoryTrend(category, timeRange);
    }

    // 3. Coach performance trends
    const coaches = ['kelvin', 'noor', 'jamie'];
    for (const coach of coaches) {
      trends.coachTrends[coach] = await this.analyzeCoachTrend(coach, timeRange);
    }

    // 4. Student type trends
    const studentTypes = ['STEM', 'Liberal Arts', 'Business', 'Pre-Med'];
    for (const type of studentTypes) {
      trends.studentTypeTrends[type] = await this.analyzeStudentTypeTrend(type, timeRange);
    }

    return trends;
  }

  // Helper methods for complex calculations
  identifyJourneyPhases(weeklyData) {
    const phases = [];
    let currentPhase = { start: 0, type: 'exploration', weeks: [] };

    weeklyData.forEach((week, index) => {
      const phaseType = this.determinePhaseType(week, index, weeklyData);
      
      if (phaseType !== currentPhase.type) {
        if (currentPhase.weeks.length > 0) {
          phases.push(currentPhase);
        }
        currentPhase = { start: index, type: phaseType, weeks: [week] };
      } else {
        currentPhase.weeks.push(week);
      }
    });

    if (currentPhase.weeks.length > 0) {
      phases.push(currentPhase);
    }

    return phases;
  }

  determinePhaseType(week, index, allWeeks) {
    // Early weeks - exploration
    if (index < 4) return 'exploration';
    
    // High goal count - intensive
    if (week.goals?.length > 5) return 'intensive';
    
    // Many completions - execution
    if (week.completed?.length > week.goals?.length * 0.8) return 'execution';
    
    // Many challenges - struggle
    if (week.challenges?.length > 2) return 'struggle';
    
    // Default
    return 'steady';
  }

  calculateSuccessProbability(analysis) {
    let probability = 0.5; // Base probability

    // Adjust based on completion rate
    probability += (analysis.profile.completionRate - 0.5) * 0.3;

    // Adjust based on momentum
    if (analysis.journey.momentumShifts?.length > 0) {
      const latestMomentum = analysis.journey.momentumShifts[analysis.journey.momentumShifts.length - 1];
      probability += latestMomentum.positive ? 0.1 : -0.1;
    }

    // Adjust based on strategy alignment
    if (analysis.outcomes.strategyAlignment?.score > 0.7) {
      probability += 0.15;
    }

    // Ensure probability is between 0 and 1
    return Math.max(0, Math.min(1, probability));
  }

  async getStudentGamePlan(studentId) {
    const q = query(
      collection(db, 'student_game_plans'),
      where('studentId', '==', studentId)
    );
    const snapshot = await getDocs(q);
    return snapshot.empty ? null : snapshot.docs[0].data();
  }

  async getStudentSessions(studentId) {
    const q = query(
      collection(db, 'indexed_videos'),
      where('parsedStudent', '==', studentId),
      orderBy('uploadDate', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  // Additional helper methods
  getJourneyStartDate(journey) {
    if (!journey?.journeyData?.journey?.[0]) return null;
    return journey.journeyData.journey[0].date;
  }

  findMomentumShifts(weeklyData) {
    const shifts = [];
    let previousRate = 0;

    weeklyData.forEach((week, index) => {
      const completionRate = week.completed?.length / (week.goals?.length || 1);
      const change = completionRate - previousRate;
      
      if (Math.abs(change) > 0.3) {
        shifts.push({
          week: week.week,
          positive: change > 0,
          magnitude: Math.abs(change),
          factors: this.identifyShiftFactors(week, weeklyData[index - 1])
        });
      }
      
      previousRate = completionRate;
    });

    return shifts;
  }

  identifyCriticalMoments(weeklyData, sessions) {
    const criticalMoments = [];

    weeklyData.forEach((week, index) => {
      // Check for major milestones
      if (week.milestones?.some(m => m.critical)) {
        criticalMoments.push({
          week: week.week,
          type: 'milestone',
          description: week.milestones.find(m => m.critical).description,
          impact: 'high'
        });
      }

      // Check for turning points
      if (index > 0) {
        const prevWeek = weeklyData[index - 1];
        if (this.isSignificantImprovement(prevWeek, week)) {
          criticalMoments.push({
            week: week.week,
            type: 'breakthrough',
            description: 'Significant improvement in performance',
            impact: 'high'
          });
        }
      }
    });

    return criticalMoments;
  }

  isSignificantImprovement(prevWeek, currentWeek) {
    const prevRate = prevWeek.completed?.length / (prevWeek.goals?.length || 1);
    const currentRate = currentWeek.completed?.length / (currentWeek.goals?.length || 1);
    return currentRate - prevRate > 0.3;
  }

  calculateAverage(items, field) {
    if (!items.length) return 0;
    const sum = items.reduce((acc, item) => acc + (item[field] || 0), 0);
    return sum / items.length;
  }
}

export default new AdvancedAnalyticsService();