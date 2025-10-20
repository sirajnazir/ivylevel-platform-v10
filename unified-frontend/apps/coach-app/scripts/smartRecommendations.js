// scripts/smartRecommendations.js
// Smart recommendation system for matching coaches with relevant past sessions

const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

// Initialize Firebase Admin
try {
  const serviceAccount = require('../credentials/firebase-admin.json');
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id
    });
  }
} catch (error) {
  console.error('Firebase admin initialization error:', error.message);
  process.exit(1);
}

const db = admin.firestore();

class SmartRecommendationEngine {
  constructor() {
    this.weights = {
      exactCoachMatch: 0.3,        // Same coach
      similarStudent: 0.25,        // Similar student profile
      sameSessionType: 0.2,        // Same type (168-hour, game plan)
      topicRelevance: 0.15,        // Topic match
      recency: 0.1                 // How recent the session is
    };
  }

  async generateRecommendationsForCoach(coachId) {
    console.log(`\n🤖 Generating recommendations for coach: ${coachId}`);
    
    // Get coach data
    const coachDoc = await db.collection('users').doc(coachId).get();
    if (!coachDoc.exists) {
      console.error('Coach not found');
      return [];
    }
    
    const coach = { id: coachId, ...coachDoc.data() };
    console.log(`Coach: ${coach.name} (${coach.email})`);
    
    // Get assigned students
    const studentsSnapshot = await db.collection('students')
      .where('assignedCoachId', '==', coachId)
      .get();
    
    const students = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log(`Assigned students: ${students.length}`);
    
    // Get all coaching sessions
    const sessionsSnapshot = await db.collection('coaching_sessions')
      .orderBy('sessionInfo.date', 'desc')
      .limit(500)
      .get();
    
    const sessions = sessionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log(`Total sessions in knowledge base: ${sessions.length}`);
    
    // Score each session
    const scoredSessions = sessions.map(session => {
      const score = this.calculateRelevanceScore(session, coach, students);
      return { ...session, relevanceScore: score.total, scoreBreakdown: score };
    });
    
    // Sort by relevance
    scoredSessions.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    // Get top recommendations
    const topRecommendations = scoredSessions.slice(0, 20);
    
    // Categorize recommendations
    const categorized = this.categorizeRecommendations(topRecommendations, coach, students);
    
    return categorized;
  }

  calculateRelevanceScore(session, coach, students) {
    const scores = {
      exactCoachMatch: 0,
      similarStudent: 0,
      sameSessionType: 0,
      topicRelevance: 0,
      recency: 0
    };
    
    // 1. Coach match
    const coachName = coach.name.toLowerCase().split(' ')[0];
    if (session.participants.coach === coachName) {
      scores.exactCoachMatch = 1.0;
    } else if (this.areSimilarCoaches(session.participants.coach, coachName)) {
      scores.exactCoachMatch = 0.5;
    }
    
    // 2. Student similarity
    scores.similarStudent = this.calculateStudentSimilarity(session, students);
    
    // 3. Session type relevance
    scores.sameSessionType = this.calculateSessionTypeRelevance(session, coach, students);
    
    // 4. Topic relevance
    scores.topicRelevance = this.calculateTopicRelevance(session, students);
    
    // 5. Recency (sessions from last 2 years get higher scores)
    const sessionAge = (Date.now() - new Date(session.sessionInfo.date).getTime()) / (1000 * 60 * 60 * 24 * 365);
    scores.recency = Math.max(0, 1 - (sessionAge / 3)); // Linear decay over 3 years
    
    // Calculate weighted total
    const total = Object.entries(scores).reduce((sum, [key, value]) => {
      return sum + (value * this.weights[key]);
    }, 0);
    
    return { ...scores, total };
  }

  areSimilarCoaches(coach1, coach2) {
    // Define coach similarity (could be based on style, experience, etc.)
    const similarGroups = [
      ['kelvin', 'andrew'],      // Tech-focused coaches
      ['noor', 'marissa'],       // Bio/med-focused coaches
      ['jamie', 'iqra']          // Generalist coaches
    ];
    
    return similarGroups.some(group => 
      group.includes(coach1) && group.includes(coach2)
    );
  }

  calculateStudentSimilarity(session, students) {
    if (students.length === 0) return 0;
    
    let maxSimilarity = 0;
    
    for (const student of students) {
      let similarity = 0;
      let factors = 0;
      
      // Grade match
      if (session.studentProfile.grade === student.grade) {
        similarity += 1;
        factors += 1;
      } else if (this.areAdjacentGrades(session.studentProfile.grade, student.grade)) {
        similarity += 0.5;
        factors += 1;
      } else {
        factors += 1;
      }
      
      // Track match (biomed, cs, business)
      if (session.topics.some(topic => student.interests?.includes(topic))) {
        similarity += 1;
        factors += 1;
      } else {
        factors += 1;
      }
      
      // Profile match (high-achieving, average, struggling)
      if (session.studentProfile.profile === student.academicProfile) {
        similarity += 1;
        factors += 1;
      } else {
        factors += 1;
      }
      
      const studentSimilarity = factors > 0 ? similarity / factors : 0;
      maxSimilarity = Math.max(maxSimilarity, studentSimilarity);
    }
    
    return maxSimilarity;
  }

  areAdjacentGrades(grade1, grade2) {
    const gradeOrder = ['freshman', 'sophomore', 'junior', 'senior'];
    const idx1 = gradeOrder.indexOf(grade1);
    const idx2 = gradeOrder.indexOf(grade2);
    return idx1 >= 0 && idx2 >= 0 && Math.abs(idx1 - idx2) === 1;
  }

  calculateSessionTypeRelevance(session, coach, students) {
    // New coaches need 168-hour and game plan sessions
    if (coach.status === 'training' || coach.currentModule < 3) {
      if (session.sessionInfo.type === '168-hour') return 1.0;
      if (session.sessionInfo.type === 'game-plan') return 0.8;
    }
    
    // Coaches with struggling students need crisis/support sessions
    const hasStrugglingStudents = students.some(s => 
      s.academicProfile === 'struggling' || s.gpa < 3.0
    );
    if (hasStrugglingStudents && session.sessionInfo.type === 'crisis') {
      return 0.9;
    }
    
    // Parent management is always relevant
    if (session.sessionInfo.type === 'parent') {
      return 0.7;
    }
    
    return 0.3; // Base relevance for regular sessions
  }

  calculateTopicRelevance(session, students) {
    if (students.length === 0) return 0.5;
    
    // Collect all student interests and weak spots
    const relevantTopics = new Set();
    students.forEach(student => {
      student.interests?.forEach(interest => relevantTopics.add(interest));
      student.weakSpots?.forEach(weak => relevantTopics.add(weak.toLowerCase()));
    });
    
    // Check how many session topics match
    const matchingTopics = session.topics.filter(topic => 
      Array.from(relevantTopics).some(relevant => 
        topic.includes(relevant) || relevant.includes(topic)
      )
    );
    
    return matchingTopics.length / Math.max(session.topics.length, 1);
  }

  categorizeRecommendations(sessions, coach, students) {
    const categories = {
      mustWatch: [],
      highlyRelevant: [],
      similarCases: [],
      skillBuilding: [],
      parentManagement: []
    };
    
    sessions.forEach(session => {
      // Must watch: 168-hour and game plans for new coaches
      if (coach.status === 'training' && 
          (session.sessionInfo.type === '168-hour' || session.sessionInfo.type === 'game-plan') &&
          session.relevanceScore > 0.7) {
        categories.mustWatch.push(session);
      }
      
      // Highly relevant: High score and recent
      else if (session.relevanceScore > 0.8 && session.scoreBreakdown.recency > 0.7) {
        categories.highlyRelevant.push(session);
      }
      
      // Similar cases: Good student match
      else if (session.scoreBreakdown.similarStudent > 0.7) {
        categories.similarCases.push(session);
      }
      
      // Parent management
      else if (session.sessionInfo.type === 'parent' || session.topics.includes('parent-management')) {
        categories.parentManagement.push(session);
      }
      
      // Skill building: Everything else useful
      else if (session.relevanceScore > 0.5) {
        categories.skillBuilding.push(session);
      }
    });
    
    return categories;
  }

  async saveRecommendations(coachId, recommendations) {
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    
    // Save to coach_recommendations collection
    await db.collection('coach_recommendations').doc(coachId).set({
      coachId,
      generatedAt: timestamp,
      recommendations: {
        mustWatch: recommendations.mustWatch.map(s => ({
          sessionId: s.id,
          title: s.title,
          relevanceScore: s.relevanceScore,
          reason: this.explainRecommendation(s)
        })),
        highlyRelevant: recommendations.highlyRelevant.slice(0, 5).map(s => ({
          sessionId: s.id,
          title: s.title,
          relevanceScore: s.relevanceScore
        })),
        similarCases: recommendations.similarCases.slice(0, 5).map(s => ({
          sessionId: s.id,
          title: s.title,
          studentProfile: s.studentProfile
        })),
        parentManagement: recommendations.parentManagement.slice(0, 3).map(s => ({
          sessionId: s.id,
          title: s.title
        }))
      },
      stats: {
        totalSessions: Object.values(recommendations).flat().length,
        lastUpdated: timestamp
      }
    });
    
    console.log(`✅ Saved recommendations for ${coachId}`);
  }

  explainRecommendation(session) {
    const reasons = [];
    
    if (session.sessionInfo.type === '168-hour') {
      reasons.push('Essential 168-hour methodology session');
    }
    if (session.sessionInfo.type === 'game-plan') {
      reasons.push('Game plan creation example');
    }
    if (session.scoreBreakdown.similarStudent > 0.8) {
      reasons.push('Very similar student profile');
    }
    if (session.scoreBreakdown.exactCoachMatch === 1) {
      reasons.push('Your previous successful session');
    }
    
    return reasons.join('. ') || 'Relevant to your coaching needs';
  }
}

// Test the recommendation system
async function testRecommendations() {
  console.log('🧪 Testing Smart Recommendation System\n');
  
  const engine = new SmartRecommendationEngine();
  
  // Get all coaches
  const coachesSnapshot = await db.collection('users')
    .where('role', '==', 'coach')
    .get();
  
  console.log(`Found ${coachesSnapshot.size} coaches\n`);
  
  // Generate recommendations for each coach
  for (const coachDoc of coachesSnapshot.docs) {
    const recommendations = await engine.generateRecommendationsForCoach(coachDoc.id);
    
    console.log(`\n📊 Recommendations Summary for ${coachDoc.data().name}:`);
    console.log(`  Must Watch: ${recommendations.mustWatch.length} sessions`);
    console.log(`  Highly Relevant: ${recommendations.highlyRelevant.length} sessions`);
    console.log(`  Similar Cases: ${recommendations.similarCases.length} sessions`);
    console.log(`  Parent Management: ${recommendations.parentManagement.length} sessions`);
    
    if (recommendations.mustWatch.length > 0) {
      console.log('\n  🎯 Top Must-Watch Sessions:');
      recommendations.mustWatch.slice(0, 3).forEach(session => {
        console.log(`    - ${session.title} (Score: ${session.relevanceScore.toFixed(2)})`);
      });
    }
    
    // Save recommendations
    await engine.saveRecommendations(coachDoc.id, recommendations);
  }
  
  console.log('\n✅ Recommendation generation complete!');
}

// Run if called directly
if (require.main === module) {
  testRecommendations()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Error:', error);
      process.exit(1);
    });
}

module.exports = SmartRecommendationEngine;