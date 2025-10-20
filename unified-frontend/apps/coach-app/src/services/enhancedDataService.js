// Enhanced Data Service for Real-time Google Drive Integration
// Connects to the indexed_videos collection and provides intelligent data access

import { db } from '../firebase';
import { 
  collection, query, where, getDocs, doc, getDoc, 
  orderBy, limit, startAfter, onSnapshot, Timestamp 
} from 'firebase/firestore';
import smartRecommendationEngine from './smartRecommendationEngine';

class EnhancedDataService {
  constructor() {
    this.listeners = new Map();
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
  }

  // Real-time subscription to coach-specific data
  subscribeToCoachData(coachId, callback) {
    const unsubscribe = onSnapshot(
      query(
        collection(db, 'indexed_videos'),
        where('parsedCoach', '==', coachId),
        orderBy('uploadDate', 'desc')
      ),
      (snapshot) => {
        const sessions = [];
        snapshot.forEach(doc => {
          sessions.push({ id: doc.id, ...doc.data() });
        });
        callback(sessions);
      },
      (error) => {
        console.error('Error subscribing to coach data:', error);
      }
    );

    this.listeners.set(`coach_${coachId}`, unsubscribe);
    return unsubscribe;
  }

  // Get enriched session data with smart matching
  async getEnrichedSessions(filters = {}) {
    const { coach, student, category, dateRange, limit: resultLimit = 20 } = filters;
    
    try {
      let q = collection(db, 'indexed_videos');
      const constraints = [];

      if (coach) constraints.push(where('parsedCoach', '==', coach));
      if (student) constraints.push(where('parsedStudent', '==', student));
      if (category) constraints.push(where('category', '==', category));
      
      if (dateRange?.start) {
        constraints.push(where('uploadDate', '>=', Timestamp.fromDate(new Date(dateRange.start))));
      }
      if (dateRange?.end) {
        constraints.push(where('uploadDate', '<=', Timestamp.fromDate(new Date(dateRange.end))));
      }

      constraints.push(orderBy('uploadDate', 'desc'));
      constraints.push(limit(resultLimit));

      q = query(q, ...constraints);
      let snapshot = await getDocs(q);
      
      // If no results for specific coach, get all videos
      if (coach && snapshot.empty) {
        console.log(`No videos found for coach ${coach}, loading all videos instead`);
        const fallbackConstraints = constraints.filter(c => 
          !c.toString().includes('parsedCoach')
        );
        q = query(collection(db, 'indexed_videos'), ...fallbackConstraints);
        snapshot = await getDocs(q);
      }
      
      const sessions = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        sessions.push({
          id: doc.id,
          ...data,
          // Enrich with additional computed fields
          enrichment: this.enrichSessionData(data)
        });
      });

      return sessions;
    } catch (error) {
      console.error('Error getting enriched sessions:', error);
      return [];
    }
  }

  // Enrich session data with computed insights
  enrichSessionData(sessionData) {
    const enrichment = {
      topics: this.extractTopics(sessionData),
      keyInsights: this.extractKeyInsights(sessionData),
      actionItems: this.extractActionItems(sessionData),
      relevantResources: this.findRelevantResources(sessionData),
      sessionQuality: this.assessSessionQuality(sessionData),
      studentProgress: this.analyzeProgress(sessionData)
    };

    return enrichment;
  }

  // Extract topics from session data
  extractTopics(session) {
    const topics = [];
    const content = `${session.title || ''} ${session.insights || ''} ${session.description || ''}`;
    
    // Topic patterns
    const topicPatterns = {
      'Essay Strategy': /essay|personal statement|writing|narrative/i,
      'Academic Planning': /course|schedule|academic|GPA/i,
      'Extracurriculars': /activity|club|leadership|volunteer/i,
      'Test Prep': /SAT|ACT|test|score|exam/i,
      'College Research': /school|university|college|research|fit/i,
      'Application Strategy': /strategy|position|brand|theme/i,
      'Interview Prep': /interview|question|practice|prepare/i,
      'Financial Aid': /financial|scholarship|aid|FAFSA/i
    };

    for (const [topic, pattern] of Object.entries(topicPatterns)) {
      if (pattern.test(content)) {
        topics.push(topic);
      }
    }

    return topics;
  }

  // Extract key insights from session
  extractKeyInsights(session) {
    if (!session.insights) return [];
    
    // Split insights into meaningful chunks
    const insights = session.insights
      .split(/[.!?]+/)
      .filter(s => s.trim().length > 20)
      .map(s => s.trim())
      .slice(0, 3); // Top 3 insights

    return insights;
  }

  // Extract action items from session
  extractActionItems(session) {
    const actionItems = [];
    const content = session.insights || '';
    
    // Look for action-oriented phrases
    const actionPatterns = [
      /should\s+(\w+\s+){1,5}/gi,
      /need\s+to\s+(\w+\s+){1,5}/gi,
      /will\s+(\w+\s+){1,5}/gi,
      /plan\s+to\s+(\w+\s+){1,5}/gi,
      /next\s+step[s]?\s+(\w+\s+){1,5}/gi
    ];

    actionPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        actionItems.push(...matches.map(m => m.trim()));
      }
    });

    return [...new Set(actionItems)].slice(0, 5); // Unique, max 5
  }

  // Find relevant resources based on session content
  findRelevantResources(session) {
    const resources = [];
    const topics = this.extractTopics(session);

    // Map topics to resources
    const resourceMap = {
      'Essay Strategy': {
        title: 'Essay Writing Masterclass',
        type: 'video',
        url: '/resources/essay-masterclass',
        duration: '45 min'
      },
      'Test Prep': {
        title: 'SAT/ACT Strategy Guide',
        type: 'document',
        url: '/resources/test-prep-guide',
        pages: 25
      },
      'College Research': {
        title: 'College Fit Assessment Tool',
        type: 'interactive',
        url: '/tools/college-fit',
        duration: '20 min'
      },
      'Interview Prep': {
        title: 'Mock Interview Simulator',
        type: 'tool',
        url: '/tools/interview-simulator',
        duration: '30 min'
      }
    };

    topics.forEach(topic => {
      if (resourceMap[topic]) {
        resources.push(resourceMap[topic]);
      }
    });

    return resources;
  }

  // Assess session quality based on multiple factors
  assessSessionQuality(session) {
    let score = 0;
    const factors = {
      hasVideo: 20,
      hasTranscript: 15,
      hasInsights: 25,
      duration: 0, // Will calculate based on duration
      recency: 0, // Will calculate based on date
      hasActionItems: 20
    };

    // Check for media files
    if (session.videoUrl) score += factors.hasVideo;
    if (session.transcriptUrl) score += factors.hasTranscript;
    if (session.insights) score += factors.hasInsights;
    
    // Duration scoring (50-70 minutes is ideal)
    if (session.duration) {
      if (session.duration >= 50 && session.duration <= 70) {
        score += 20;
      } else if (session.duration >= 40 && session.duration <= 80) {
        score += 10;
      }
    }

    // Recency scoring
    if (session.date) {
      const daysOld = Math.floor((Date.now() - new Date(session.date)) / (1000 * 60 * 60 * 24));
      if (daysOld < 7) score += 20;
      else if (daysOld < 30) score += 10;
      else if (daysOld < 90) score += 5;
    }

    return {
      score: Math.min(score, 100),
      label: score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : 'Fair',
      factors: this.getQualityFactors(session)
    };
  }

  // Get quality factors for a session
  getQualityFactors(session) {
    const factors = [];
    
    if (session.videoUrl) factors.push('Has video recording');
    if (session.insights) factors.push('Contains insights');
    if (session.duration >= 50) factors.push('Full-length session');
    if (session.transcriptUrl) factors.push('Searchable transcript');
    
    return factors;
  }

  // Analyze student progress from session data
  analyzeProgress(session) {
    const progress = {
      milestones: [],
      improvements: [],
      nextSteps: []
    };

    // Look for milestone indicators
    const content = (session.insights || '').toLowerCase();
    
    if (content.includes('completed') || content.includes('finished')) {
      progress.milestones.push('Task completion mentioned');
    }
    
    if (content.includes('improved') || content.includes('better')) {
      progress.improvements.push('Improvement noted');
    }
    
    if (content.includes('next week') || content.includes('next session')) {
      progress.nextSteps.push('Future planning discussed');
    }

    return progress;
  }

  // Get coach-specific analytics
  async getCoachAnalytics(coachId, timeRange = 'month') {
    const sessions = await this.getEnrichedSessions({ 
      coach: coachId,
      dateRange: this.getDateRange(timeRange)
    });

    const analytics = {
      totalSessions: sessions.length,
      totalDuration: sessions.reduce((sum, s) => sum + (s.duration || 0), 0),
      averageQuality: this.calculateAverageQuality(sessions),
      topTopics: this.getTopTopics(sessions),
      studentProgress: this.aggregateStudentProgress(sessions),
      resourceUsage: this.analyzeResourceUsage(sessions),
      trends: this.analyzeTrends(sessions)
    };

    return analytics;
  }

  // Get date range based on time period
  getDateRange(timeRange) {
    if (!timeRange || timeRange === 'all') return null;
    
    const end = new Date();
    const start = new Date();
    
    switch(timeRange) {
      case 'week':
        start.setDate(start.getDate() - 7);
        break;
      case 'month':
        start.setMonth(start.getMonth() - 1);
        break;
      case 'quarter':
        start.setMonth(start.getMonth() - 3);
        break;
      case 'year':
        start.setFullYear(start.getFullYear() - 1);
        break;
      default:
        start.setMonth(start.getMonth() - 1);
    }

    return { start: start.toISOString(), end: end.toISOString() };
  }

  // Calculate average session quality
  calculateAverageQuality(sessions) {
    if (!sessions.length) return 0;
    
    const totalQuality = sessions.reduce((sum, session) => {
      const quality = this.assessSessionQuality(session);
      return sum + quality.score;
    }, 0);

    return Math.round(totalQuality / sessions.length);
  }

  // Get most discussed topics
  getTopTopics(sessions) {
    const topicCounts = {};
    
    sessions.forEach(session => {
      const topics = session.enrichment?.topics || [];
      topics.forEach(topic => {
        topicCounts[topic] = (topicCounts[topic] || 0) + 1;
      });
    });

    return Object.entries(topicCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([topic, count]) => ({ topic, count }));
  }

  // Aggregate student progress across sessions
  aggregateStudentProgress(sessions) {
    const students = {};
    
    sessions.forEach(session => {
      const student = session.student;
      if (!students[student]) {
        students[student] = {
          name: student,
          sessionCount: 0,
          totalDuration: 0,
          lastSession: null,
          topics: new Set()
        };
      }
      
      students[student].sessionCount++;
      students[student].totalDuration += session.duration || 0;
      students[student].lastSession = session.date;
      
      const topics = session.enrichment?.topics || [];
      topics.forEach(topic => students[student].topics.add(topic));
    });

    return Object.values(students).map(student => ({
      ...student,
      topics: Array.from(student.topics)
    }));
  }

  // Analyze resource usage patterns
  analyzeResourceUsage(sessions) {
    const usage = {
      videoViews: 0,
      transcriptAccess: 0,
      insightReads: 0,
      resourceClicks: 0
    };

    sessions.forEach(session => {
      if (session.videoUrl) usage.videoViews++;
      if (session.transcriptUrl) usage.transcriptAccess++;
      if (session.insights) usage.insightReads++;
      if (session.enrichment?.relevantResources?.length > 0) {
        usage.resourceClicks += session.enrichment.relevantResources.length;
      }
    });

    return usage;
  }

  // Analyze trends over time
  analyzeTrends(sessions) {
    // Sort sessions by date
    const sortedSessions = sessions.sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );

    const trends = {
      sessionFrequency: this.calculateFrequencyTrend(sortedSessions),
      qualityTrend: this.calculateQualityTrend(sortedSessions),
      topicEvolution: this.calculateTopicEvolution(sortedSessions)
    };

    return trends;
  }

  // Calculate session frequency trend
  calculateFrequencyTrend(sessions) {
    if (sessions.length < 2) return 'stable';
    
    const firstHalf = sessions.slice(0, Math.floor(sessions.length / 2));
    const secondHalf = sessions.slice(Math.floor(sessions.length / 2));
    
    const firstHalfFreq = firstHalf.length / this.getDateRangeDays(firstHalf);
    const secondHalfFreq = secondHalf.length / this.getDateRangeDays(secondHalf);
    
    if (secondHalfFreq > firstHalfFreq * 1.2) return 'increasing';
    if (secondHalfFreq < firstHalfFreq * 0.8) return 'decreasing';
    return 'stable';
  }

  // Get date range in days for a set of sessions
  getDateRangeDays(sessions) {
    if (!sessions.length) return 1;
    
    const dates = sessions.map(s => new Date(s.date));
    const min = Math.min(...dates);
    const max = Math.max(...dates);
    
    return Math.max(1, Math.floor((max - min) / (1000 * 60 * 60 * 24)));
  }

  // Calculate quality trend
  calculateQualityTrend(sessions) {
    if (sessions.length < 2) return 'stable';
    
    const qualities = sessions.map(s => this.assessSessionQuality(s).score);
    const firstHalfAvg = qualities.slice(0, Math.floor(qualities.length / 2))
      .reduce((a, b) => a + b, 0) / Math.floor(qualities.length / 2);
    const secondHalfAvg = qualities.slice(Math.floor(qualities.length / 2))
      .reduce((a, b) => a + b, 0) / (qualities.length - Math.floor(qualities.length / 2));
    
    if (secondHalfAvg > firstHalfAvg + 5) return 'improving';
    if (secondHalfAvg < firstHalfAvg - 5) return 'declining';
    return 'stable';
  }

  // Calculate topic evolution
  calculateTopicEvolution(sessions) {
    const evolution = [];
    const windowSize = Math.max(1, Math.floor(sessions.length / 4));
    
    for (let i = 0; i < sessions.length; i += windowSize) {
      const window = sessions.slice(i, i + windowSize);
      const topics = {};
      
      window.forEach(session => {
        const sessionTopics = session.enrichment?.topics || [];
        sessionTopics.forEach(topic => {
          topics[topic] = (topics[topic] || 0) + 1;
        });
      });
      
      evolution.push({
        period: `Period ${Math.floor(i / windowSize) + 1}`,
        topTopics: Object.entries(topics)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 3)
          .map(([topic]) => topic)
      });
    }
    
    return evolution;
  }

  // Clean up listeners
  cleanup() {
    this.listeners.forEach(unsubscribe => unsubscribe());
    this.listeners.clear();
    this.cache.clear();
  }
}

export default new EnhancedDataService();