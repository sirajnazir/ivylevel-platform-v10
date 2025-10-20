// Smart Recommendation Engine for IvyLevel Coach Training Platform
// This engine analyzes student profiles, coach expertise, and historical data
// to provide personalized resource recommendations

import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

class SmartRecommendationEngine {
  constructor() {
    this.weights = {
      gradeMatch: 0.25,
      majorMatch: 0.30,
      schoolMatch: 0.20,
      challengeMatch: 0.15,
      timelineMatch: 0.10
    };
  }

  // Calculate similarity score between student profiles
  calculateStudentSimilarity(student1, student2) {
    let score = 0;
    
    // Grade similarity (closer grades = higher score)
    const gradeDiff = Math.abs(this.extractGradeNumber(student1.grade) - this.extractGradeNumber(student2.grade));
    score += (1 - gradeDiff / 4) * this.weights.gradeMatch;
    
    // Major/Focus area similarity
    if (this.areMajorsSimilar(student1.focusArea, student2.focusArea)) {
      score += this.weights.majorMatch;
    }
    
    // Target schools overlap
    const schoolOverlap = this.calculateArrayOverlap(
      student1.targetSchools || [], 
      student2.targetSchools || []
    );
    score += schoolOverlap * this.weights.schoolMatch;
    
    // Similar challenges
    const challengeOverlap = this.calculateArrayOverlap(
      student1.challenges || [],
      student2.challenges || []
    );
    score += challengeOverlap * this.weights.challengeMatch;
    
    return score;
  }

  // Extract grade number for comparison
  extractGradeNumber(gradeString) {
    const match = gradeString?.match(/(\d+)/);
    return match ? parseInt(match[1]) : 12;
  }

  // Check if majors/focus areas are similar
  areMajorsSimilar(major1, major2) {
    const stemFields = ['Engineering', 'Computer Science', 'Math', 'Physics', 'Biology', 'Chemistry', 'Pre-Med'];
    const businessFields = ['Business', 'Economics', 'Finance', 'Entrepreneurship'];
    const liberalArts = ['Liberal Arts', 'English', 'History', 'Psychology', 'Political Science'];
    
    const getCategory = (major) => {
      if (stemFields.some(field => major?.includes(field))) return 'STEM';
      if (businessFields.some(field => major?.includes(field))) return 'Business';
      if (liberalArts.some(field => major?.includes(field))) return 'Liberal Arts';
      return 'Other';
    };
    
    return getCategory(major1) === getCategory(major2);
  }

  // Calculate overlap between two arrays
  calculateArrayOverlap(arr1, arr2) {
    if (!arr1.length || !arr2.length) return 0;
    const overlap = arr1.filter(item => arr2.includes(item)).length;
    return overlap / Math.max(arr1.length, arr2.length);
  }

  // Get recommended sessions based on student profile
  async getRecommendedSessions(currentStudent, coachId, options = {}) {
    try {
      const { 
        limit: resultLimit = 10,
        category = null,
        minScore = 0.3
      } = options;

      // Get all sessions from Firebase
      let q = collection(db, 'indexed_videos');
      
      // Filter by coach if specified
      if (coachId) {
        q = query(q, where('parsedCoach', '==', coachId));
      }
      
      // Filter by category if specified
      if (category) {
        q = query(q, where('category', '==', category));
      }
      
      const snapshot = await getDocs(q);
      const sessions = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        sessions.push({
          id: doc.id,
          ...data
        });
      });

      // Score and rank sessions
      const scoredSessions = sessions.map(session => {
        // Parse student info from session
        const sessionStudent = {
          grade: this.extractGradeFromSession(session),
          focusArea: this.extractFocusAreaFromSession(session),
          targetSchools: this.extractSchoolsFromSession(session),
          challenges: this.extractChallengesFromSession(session)
        };
        
        const similarityScore = this.calculateStudentSimilarity(currentStudent, sessionStudent);
        
        // Boost score for specific relevance factors
        let relevanceBoost = 0;
        
        // Recent sessions get a small boost
        if (session.date) {
          const daysAgo = this.getDaysAgo(session.date);
          if (daysAgo < 30) relevanceBoost += 0.1;
          else if (daysAgo < 90) relevanceBoost += 0.05;
        }
        
        // Sessions with insights get a boost
        if (session.insights) relevanceBoost += 0.1;
        
        // Week-appropriate sessions get a boost
        if (this.isWeekAppropriate(session.week, currentStudent)) {
          relevanceBoost += 0.15;
        }
        
        return {
          ...session,
          score: Math.min(similarityScore + relevanceBoost, 1),
          matchReasons: this.generateMatchReasons(currentStudent, sessionStudent, session)
        };
      });

      // Filter by minimum score and sort by score
      return scoredSessions
        .filter(session => session.score >= minScore)
        .sort((a, b) => b.score - a.score)
        .slice(0, resultLimit);
        
    } catch (error) {
      console.error('Error getting recommended sessions:', error);
      return [];
    }
  }

  // Extract student grade from session data
  extractGradeFromSession(session) {
    // Try to extract from folder name or metadata
    const gradeMatch = session.folderName?.match(/(\d+)th/);
    if (gradeMatch) return `${gradeMatch[1]}th Grade`;
    
    // Check insights for grade mentions
    if (session.insights) {
      const insightGrade = session.insights.match(/(\d+)th\s+grade/i);
      if (insightGrade) return `${insightGrade[1]}th Grade`;
    }
    
    return '11th Grade'; // Default
  }

  // Extract focus area from session
  extractFocusAreaFromSession(session) {
    const focusKeywords = {
      'STEM': ['engineering', 'computer', 'science', 'math', 'physics', 'robotics'],
      'Business': ['business', 'entrepreneur', 'economics', 'finance', 'startup'],
      'Liberal Arts': ['english', 'history', 'writing', 'literature', 'arts'],
      'Pre-Med': ['medical', 'biology', 'chemistry', 'pre-med', 'doctor']
    };
    
    const content = `${session.title || ''} ${session.insights || ''}`.toLowerCase();
    
    for (const [area, keywords] of Object.entries(focusKeywords)) {
      if (keywords.some(keyword => content.includes(keyword))) {
        return area;
      }
    }
    
    return 'General';
  }

  // Extract mentioned schools from session
  extractSchoolsFromSession(session) {
    const topSchools = ['MIT', 'Stanford', 'Harvard', 'Yale', 'Princeton', 'Columbia', 'UChicago', 'Berkeley'];
    const mentioned = [];
    
    const content = `${session.title || ''} ${session.insights || ''}`;
    
    topSchools.forEach(school => {
      if (content.includes(school)) {
        mentioned.push(school);
      }
    });
    
    return mentioned;
  }

  // Extract challenges from session insights
  extractChallengesFromSession(session) {
    const challengeKeywords = {
      'Essay writing': ['essay', 'writing', 'personal statement'],
      'Time management': ['time', 'deadline', 'schedule', 'planning'],
      'Test scores': ['SAT', 'ACT', 'test', 'score'],
      'Extracurriculars': ['activities', 'extracurricular', 'leadership']
    };
    
    const challenges = [];
    const content = (session.insights || '').toLowerCase();
    
    for (const [challenge, keywords] of Object.entries(challengeKeywords)) {
      if (keywords.some(keyword => content.includes(keyword))) {
        challenges.push(challenge);
      }
    }
    
    return challenges;
  }

  // Calculate days between date and now
  getDaysAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    return Math.floor((now - date) / (1000 * 60 * 60 * 24));
  }

  // Check if session week is appropriate for student
  isWeekAppropriate(sessionWeek, student) {
    if (!sessionWeek || !student.currentWeek) return true;
    
    // Sessions within 2 weeks are most relevant
    const weekDiff = Math.abs(sessionWeek - student.currentWeek);
    return weekDiff <= 2;
  }

  // Generate human-readable match reasons
  generateMatchReasons(currentStudent, sessionStudent, session) {
    const reasons = [];
    
    if (currentStudent.grade === sessionStudent.grade) {
      reasons.push(`Same grade level (${currentStudent.grade})`);
    }
    
    if (this.areMajorsSimilar(currentStudent.focusArea, sessionStudent.focusArea)) {
      reasons.push(`Similar focus area: ${sessionStudent.focusArea}`);
    }
    
    const schoolOverlap = currentStudent.targetSchools?.filter(
      school => sessionStudent.targetSchools?.includes(school)
    );
    if (schoolOverlap?.length > 0) {
      reasons.push(`Discusses ${schoolOverlap.join(', ')}`);
    }
    
    const challengeOverlap = currentStudent.challenges?.filter(
      challenge => sessionStudent.challenges?.includes(challenge)
    );
    if (challengeOverlap?.length > 0) {
      reasons.push(`Addresses: ${challengeOverlap.join(', ')}`);
    }
    
    if (session.insights) {
      reasons.push('Contains detailed insights');
    }
    
    return reasons;
  }

  // Get resource recommendations beyond sessions
  async getResourceRecommendations(student, coach, options = {}) {
    const recommendations = {
      immediate: [],
      thisWeek: [],
      upcoming: []
    };

    // Immediate resources based on current challenges
    if (student.challenges?.includes('Essay writing')) {
      recommendations.immediate.push({
        type: 'document',
        title: 'Essay Excellence Framework',
        description: 'Comprehensive guide to crafting compelling personal statements',
        url: '/resources/essay-framework',
        priority: 'high',
        estimatedTime: '2 hours'
      });
    }

    if (student.challenges?.includes('Time management')) {
      recommendations.immediate.push({
        type: 'tool',
        title: 'Application Timeline Planner',
        description: 'Interactive tool to plan your application schedule',
        url: '/tools/timeline-planner',
        priority: 'high',
        estimatedTime: '30 minutes'
      });
    }

    // This week's recommendations based on progress
    const weekNumber = student.currentWeek || 1;
    
    if (weekNumber <= 4) {
      recommendations.thisWeek.push({
        type: 'video',
        title: 'Building Your Activity List',
        description: 'Strategic approach to showcasing extracurriculars',
        url: '/videos/activity-list-strategy',
        priority: 'medium',
        estimatedTime: '45 minutes'
      });
    }

    // Upcoming based on application timeline
    const monthsUntilDeadline = this.getMonthsUntilDeadline(student);
    
    if (monthsUntilDeadline <= 6) {
      recommendations.upcoming.push({
        type: 'workshop',
        title: 'Interview Preparation Workshop',
        description: 'Practice common interview questions with AI feedback',
        url: '/workshops/interview-prep',
        priority: 'medium',
        estimatedTime: '1.5 hours',
        scheduledFor: 'Next month'
      });
    }

    return recommendations;
  }

  // Calculate months until application deadline
  getMonthsUntilDeadline(student) {
    const grade = this.extractGradeNumber(student.grade);
    const now = new Date();
    const currentMonth = now.getMonth();
    
    // Assume deadlines are in January for regular decision
    if (grade === 12) {
      if (currentMonth >= 8) { // August or later
        return 5 - (currentMonth - 8);
      }
    }
    
    return 12; // Default to plenty of time
  }

  // Get personalized insights based on patterns
  async getPersonalizedInsights(student, recentSessions) {
    const insights = [];

    // Analyze session patterns
    const sessionTopics = recentSessions.map(s => this.extractFocusAreaFromSession(s));
    const topicCounts = this.countOccurrences(sessionTopics);
    
    // Generate insights based on patterns
    if (topicCounts['STEM'] > topicCounts['Liberal Arts']) {
      insights.push({
        type: 'strength',
        title: 'Strong STEM Focus',
        description: 'Your sessions show strong engagement with STEM topics. Consider highlighting interdisciplinary connections in your applications.',
        actionable: true,
        suggestedAction: 'Review STEM + Liberal Arts integration examples'
      });
    }

    // Time-based insights
    const avgSessionDuration = this.calculateAvgDuration(recentSessions);
    if (avgSessionDuration > 60) {
      insights.push({
        type: 'positive',
        title: 'Deep Engagement',
        description: 'Your longer session durations indicate thorough exploration of topics.',
        actionable: false
      });
    }

    // Progress insights
    if (student.completedMilestones?.length > 0) {
      const recentMilestone = student.completedMilestones[student.completedMilestones.length - 1];
      insights.push({
        type: 'achievement',
        title: 'Recent Progress',
        description: `Congratulations on completing ${recentMilestone}! This puts you ahead of schedule.`,
        actionable: true,
        suggestedAction: 'Share this achievement in your next session'
      });
    }

    return insights;
  }

  // Helper to count occurrences
  countOccurrences(arr) {
    return arr.reduce((acc, val) => {
      acc[val] = (acc[val] || 0) + 1;
      return acc;
    }, {});
  }

  // Calculate average session duration
  calculateAvgDuration(sessions) {
    if (!sessions.length) return 0;
    const total = sessions.reduce((sum, session) => sum + (session.duration || 50), 0);
    return total / sessions.length;
  }
}

export default new SmartRecommendationEngine();