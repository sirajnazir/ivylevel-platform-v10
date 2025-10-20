// Data Service for Production Integration
import { collection, query, where, getDocs, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase-config';

console.log('DataService initialized with Firebase');

// Data Service Functions
export const dataService = {
  // Get all coaches with their stats
  async getCoaches() {
    try {
      console.log('Attempting to fetch coaches from Firebase...');
      console.log('Database instance:', db);
      
      const coachesRef = collection(db, 'coaches');
      console.log('Collection reference created');
      
      const snapshot = await getDocs(coachesRef);
      console.log(`Found ${snapshot.size} coaches in database`);
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || doc.id,
          email: data.email || `${doc.id.toLowerCase()}@ivylevel.com`,
          studentCount: data.videoCount || data.assignedStudents?.length || 0,
          rating: data.rating || data.averageRating || 4.5,
          status: data.status || 'active',
          videoCount: data.videoCount || 0
        };
      });
    } catch (error) {
      console.error('Error fetching coaches - Full error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      // If permission denied, return message
      if (error.code === 'permission-denied') {
        console.error('Firebase security rules are blocking access. Update rules to allow read access.');
      }
      
      // Return empty array on error
      return [];
    }
  },

  // Get platform statistics
  async getPlatformStats() {
    try {
      const stats = {};
      
      // Get coach count
      const coachesSnapshot = await getDocs(collection(db, 'coaches'));
      stats.totalCoaches = coachesSnapshot.size;
      
      // Get video count
      const videosSnapshot = await getDocs(collection(db, 'indexed_videos'));
      stats.totalVideos = videosSnapshot.size;
      
      // Get unique students from videos
      const students = new Set();
      videosSnapshot.docs.forEach(doc => {
        const student = doc.data().student || doc.data().parsedStudent;
        if (student) students.add(student);
      });
      stats.activeStudents = students.size;
      
      // Use video count as sessions for now
      stats.completedSessions = videosSnapshot.size;
      
      // Get resources count if exists
      try {
        const resourcesSnapshot = await getDocs(collection(db, 'resources'));
        stats.resourcesShared = resourcesSnapshot.size;
      } catch {
        stats.resourcesShared = 0;
      }
      
      console.log('Platform stats:', stats);
      return stats;
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Return empty stats
      return {
        totalCoaches: 0,
        activeStudents: 0,
        completedSessions: 0,
        resourcesShared: 0
      };
    }
  },

  // Get indexed videos from Google Drive
  async getIndexedVideos() {
    try {
      const videosRef = collection(db, 'indexed_videos');
      // Try without orderBy first in case 'date' field doesn't exist
      let snapshot;
      try {
        const q = query(videosRef, orderBy('uploadDate', 'desc'), limit(100));
        snapshot = await getDocs(q);
      } catch (orderError) {
        console.log('Order by uploadDate failed, trying without order:', orderError);
        const q = query(videosRef, limit(100));
        snapshot = await getDocs(q);
      }
      
      console.log(`Found ${snapshot.size} videos in database`);
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || data.properTitle || data.originalTitle || 'Untitled Video',
          coach: data.parsedCoach || data.coach || 'Unknown Coach',
          student: data.parsedStudent || data.student || 'Unknown Student',
          duration: data.duration || '30:00',
          category: data.category || 'General Coaching',
          date: data.sessionDate || data.date,
          webViewLink: data.webViewLink || data.driveId
        };
      });
    } catch (error) {
      console.error('Error fetching videos:', error);
      // Return empty array on error instead of mock data
      return [];
    }
  },

  // Real-time session metrics
  subscribeToSessionMetrics(sessionId, callback) {
    try {
      const sessionRef = collection(db, 'sessions', sessionId, 'metrics');
      return onSnapshot(sessionRef, (snapshot) => {
        const metrics = {};
        snapshot.docs.forEach(doc => {
          metrics[doc.id] = doc.data().value;
        });
        callback(metrics);
      });
    } catch (error) {
      console.error('Error subscribing to metrics:', error);
      // Return mock real-time data
      callback({
        engagement: 85 + Math.floor(Math.random() * 10),
        clarity: 92 + Math.floor(Math.random() * 5),
        progress: 78 + Math.floor(Math.random() * 10),
        momentum: 88 + Math.floor(Math.random() * 7)
      });
    }
  },

  // Get AI recommendations
  async getAIRecommendations(coachId, studentId) {
    try {
      const recommendationsRef = collection(db, 'ai_recommendations');
      const q = query(
        recommendationsRef,
        where('coachId', '==', coachId),
        where('studentId', '==', studentId),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      // Return mock recommendations
      return [
        {
          id: 1,
          type: 'success',
          title: 'Excellent Progress on Essay Structure',
          description: 'Student has shown 23% improvement in organizing their thoughts',
          icon: '✅'
        },
        {
          id: 2,
          type: 'warning',
          title: 'Focus Area: Time Management',
          description: 'Consider introducing Pomodoro technique for study sessions',
          icon: '⚠️'
        },
        {
          id: 3,
          type: 'info',
          title: 'Smart Resource Suggestion',
          description: 'Video: "Advanced Essay Techniques" matches student\'s current level',
          icon: '💡'
        }
      ];
    }
  },

  // Get training videos for onboarding
  async getTrainingVideos() {
    try {
      // First try training_videos collection
      const trainingRef = collection(db, 'training_videos');
      let snapshot = await getDocs(trainingRef);
      
      if (snapshot.size > 0) {
        console.log(`Found ${snapshot.size} training videos`);
        return snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      }
      
      // If no training videos, use sample indexed videos
      const videosRef = collection(db, 'indexed_videos');
      const q = query(videosRef, limit(10));
      snapshot = await getDocs(q);
      
      console.log(`Using ${snapshot.size} indexed videos for training`);
      
      return snapshot.docs.map((doc, index) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || data.name || 'Training Video',
          duration: data.duration || '30:00',
          category: data.category || 'General Training',
          order: index + 1
        };
      });
    } catch (error) {
      console.error('Error fetching training videos:', error);
      // Return empty array
      return [];
    }
  }
};

export default dataService;