import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  startAfter,
  endBefore,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';

// Knowledge Base Configuration based on the new schema
const KB_CONFIG = {
  version: '1.0',
  rootDriveId: '1dgx7k3J_z0PO7cOVMqKuFOajl_x_Dulg',
  categories: ['Coaching', 'GamePlan', 'MISC', 'Trivial'],
  sources: ['A', 'B', 'C'],
  programTypes: [
    '48-Week Ultimate Prep',
    '24-Week Comprehensive', 
    '10-Week Essay Elevator',
    '3-Week Intensive'
  ],
  fileTypes: {
    video: { extension: '.mp4', availability: 0.809 },
    audio: { extension: '.m4a', availability: 0.781 },
    transcript: { extension: '.vtt', availability: 0.556 },
    insights: { extension: '.md', availability: 1.0 },
    timeline: { extension: '.json', availability: 'variable' },
    chat: { extension: '.txt', availability: 0 },
    summary: { extension: '.json', availability: 'variable' }
  },
  auxiliaryFolders: {
    gamePlans: '/Game Plan Report/',
    executionDocs: '/Execution Doc/'
  }
};

class KnowledgeBaseService {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = 300000; // 5 minutes
  }

  // Parse folder name to extract metadata
  parseFolderName(folderName) {
    // Pattern: [Category]_[Source]_[Coach]_[Student]_[Week/Type]_[Date]_M_[MeetingID]U_[UUID]
    const pattern = /^([^_]+)_([^_]+)_([^_]+)_([^_]+)_([^_]+)_([^_]+)_M_(\d+)U_(.+)$/;
    const match = folderName.match(pattern);
    
    if (!match) {
      console.warn('Folder name does not match expected pattern:', folderName);
      return null;
    }

    const [_, category, source, coach, student, weekOrType, date, meetingId, uuid] = match;
    
    return {
      category,
      source,
      coach,
      student,
      weekOrType,
      week: weekOrType.match(/Wk(\d+)/) ? parseInt(weekOrType.match(/Wk(\d+)/)[1]) : null,
      date,
      meetingId,
      uuid,
      folderName
    };
  }

  // Get all recordings with enhanced metadata
  async getAllRecordings(filters = {}) {
    const cacheKey = `recordings_${JSON.stringify(filters)}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      // Use indexed_videos collection which exists in your Firebase
      let q = collection(db, 'indexed_videos');
      
      // Apply filters
      if (filters.student) {
        q = query(q, where('parsedStudent', '==', filters.student));
      }
      if (filters.coach) {
        q = query(q, where('parsedCoach', '==', filters.coach));
      }
      if (filters.category) {
        q = query(q, where('category', '==', filters.category));
      }
      if (filters.source) {
        q = query(q, where('source', '==', filters.source));
      }
      if (filters.dateFrom) {
        q = query(q, where('uploadDate', '>=', filters.dateFrom));
      }
      if (filters.dateTo) {
        q = query(q, where('uploadDate', '<=', filters.dateTo));
      }
      
      // Add ordering
      q = query(q, orderBy('uploadDate', 'desc'));
      
      // Add pagination
      if (filters.limit) {
        q = query(q, limit(filters.limit));
      }
      if (filters.startAfter) {
        q = query(q, startAfter(filters.startAfter));
      }

      const snapshot = await getDocs(q);
      const recordings = snapshot.docs.map(doc => {
        const data = doc.data();
        
        // Map from indexed_videos structure to our KB structure
        return {
          id: doc.id,
          uuid: data.uuid || doc.id,
          meetingId: data.meetingId || data.id || doc.id,
          topic: data.title || data.topic || 'Untitled Session',
          date: data.date || data.createdAt || new Date(),
          duration: data.duration || 60,
          category: data.category || 'Coaching',
          source: data.source || 'A',
          
          // Map participants
          coach: data.coach || data.coachName || 'Unknown',
          student: data.student || data.studentName || 'Unknown',
          
          // File availability from your structure
          hasVideo: data.hasVideo !== false && (data.url || data.videoUrl || data.driveId),
          hasAudio: data.hasAudio || false,
          hasTranscript: data.hasTranscript || data.transcriptUrl || false,
          hasInsights: data.hasInsights || data.insights || false,
          
          // Additional data
          videoUrl: data.url || data.videoUrl,
          driveId: data.driveId,
          folderId: data.folderId,
          thumbnailUrl: data.thumbnailUrl,
          
          // Keep original data
          ...data
        };
      });

      this.setCache(cacheKey, recordings);
      return recordings;
    } catch (error) {
      console.error('Error fetching recordings:', error);
      return [];
    }
  }

  // Get a single recording with all metadata
  async getRecording(uuid) {
    const cacheKey = `recording_${uuid}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      // Try to find by uuid or id in indexed_videos collection
      let q = query(collection(db, 'indexed_videos'), where('uuid', '==', uuid));
      let snapshot = await getDocs(q);
      
      // If not found by uuid, try by document id
      if (snapshot.empty) {
        q = query(collection(db, 'indexed_videos'), where('id', '==', uuid));
        snapshot = await getDocs(q);
      }
      
      if (snapshot.empty) {
        console.warn('Recording not found:', uuid);
        return null;
      }

      const doc = snapshot.docs[0];
      const data = doc.data();
      
      // Use the same mapping as getAllRecordings
      const recording = {
        id: doc.id,
        uuid: data.uuid || doc.id,
        meetingId: data.meetingId || data.id || doc.id,
        topic: data.title || data.topic || 'Untitled Session',
        date: data.date || data.createdAt || new Date(),
        duration: data.duration || 60,
        category: data.category || 'Coaching',
        source: data.source || 'A',
        
        // Map participants
        coach: data.coach || data.coachName || 'Unknown',
        student: data.student || data.studentName || 'Unknown',
        
        // File availability
        hasVideo: data.hasVideo !== false && (data.url || data.videoUrl || data.driveId),
        hasAudio: data.hasAudio || false,
        hasTranscript: data.hasTranscript || data.transcriptUrl || false,
        hasInsights: data.hasInsights || data.insights || false,
        
        // Additional data
        videoUrl: data.url || data.videoUrl,
        driveId: data.driveId,
        folderId: data.folderId,
        thumbnailUrl: data.thumbnailUrl,
        
        // Get additional data
        insights: await this.getRecordingInsights(data.uuid || doc.id),
        relatedDocs: await this.getRelatedAuxiliaryDocs(data.student || data.studentName, data.date),
        
        // Keep original data
        ...data
      };

      this.setCache(cacheKey, recording);
      return recording;
    } catch (error) {
      console.error('Error fetching recording:', error);
      return null;
    }
  }

  // Get AI insights for a recording
  async getRecordingInsights(uuid) {
    const cacheKey = `insights_${uuid}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      const doc = await getDoc(doc(db, 'insights', uuid));
      if (!doc.exists()) {
        return null;
      }

      const insights = doc.data();
      this.setCache(cacheKey, insights);
      return insights;
    } catch (error) {
      console.error('Error fetching insights:', error);
      return null;
    }
  }

  // Get student's complete journey including auxiliary documents
  async getStudentJourney(studentName) {
    const cacheKey = `journey_${studentName}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      // Get all recordings for the student
      const recordings = await this.getAllRecordings({ student: studentName });
      
      // Get game plans
      const gamePlans = await this.getAuxiliaryDocuments('gamePlan', studentName);
      
      // Get execution documents
      const executionDocs = await this.getAuxiliaryDocuments('executionDoc', studentName);
      
      // Get student profile
      const studentProfile = await this.getStudentProfile(studentName);
      
      // Organize by week/phase
      const journey = {
        student: studentProfile,
        recordings: recordings.sort((a, b) => a.week - b.week),
        gamePlans,
        executionDocs,
        statistics: this.calculateStudentStatistics(recordings),
        progress: this.analyzeStudentProgress(recordings, executionDocs)
      };

      this.setCache(cacheKey, journey);
      return journey;
    } catch (error) {
      console.error('Error fetching student journey:', error);
      return null;
    }
  }

  // Get auxiliary documents (game plans, execution docs)
  async getAuxiliaryDocuments(type, studentName) {
    const collection = type === 'gamePlan' ? 'gamePlans' : 'executionDocs';
    
    try {
      const q = query(
        collection(db, collection),
        where('parsedStudent', '==', studentName),
        orderBy('createdDate', 'desc')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error(`Error fetching ${type} documents:`, error);
      return [];
    }
  }

  // Get related auxiliary documents for a recording
  async getRelatedAuxiliaryDocs(studentName, recordingDate) {
    try {
      // Find game plans created before or around the recording date
      const gamePlans = await this.getAuxiliaryDocuments('gamePlan', studentName);
      const relevantGamePlan = gamePlans.find(gp => {
        const gpDate = new Date(gp.createdDate);
        const recDate = new Date(recordingDate);
        const daysDiff = Math.abs((recDate - gpDate) / (1000 * 60 * 60 * 24));
        return daysDiff <= 30; // Within 30 days
      });

      // Find execution docs around the same timeframe
      const executionDocs = await this.getAuxiliaryDocuments('executionDoc', studentName);
      const relevantExecDocs = executionDocs.filter(ed => {
        const edDate = new Date(ed.createdDate);
        const recDate = new Date(recordingDate);
        const daysDiff = Math.abs((recDate - edDate) / (1000 * 60 * 60 * 24));
        return daysDiff <= 7; // Within a week
      });

      return {
        gamePlan: relevantGamePlan || null,
        executionDocs: relevantExecDocs
      };
    } catch (error) {
      console.error('Error fetching related documents:', error);
      return { gamePlan: null, executionDocs: [] };
    }
  }

  // Get coach's methodology and patterns
  async getCoachMethodology(coachName) {
    const cacheKey = `methodology_${coachName}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      // Get all recordings by the coach
      const recordings = await this.getAllRecordings({ coach: coachName });
      
      // Get coach profile
      const coachProfile = await this.getCoachProfile(coachName);
      
      // Analyze patterns
      const methodology = {
        coach: coachProfile,
        totalSessions: recordings.length,
        students: [...new Set(recordings.map(r => r.student))],
        sessionTypes: this.categorizeSessionTypes(recordings),
        commonTopics: await this.extractCommonTopics(recordings),
        coachingStyle: await this.analyzeCoachingStyle(recordings),
        successPatterns: await this.identifySuccessPatterns(recordings)
      };

      this.setCache(cacheKey, methodology);
      return methodology;
    } catch (error) {
      console.error('Error analyzing coach methodology:', error);
      return null;
    }
  }

  // Search across transcripts and insights
  async searchContent(query, filters = {}) {
    try {
      // This would typically use Elasticsearch or similar
      // For now, we'll do a simple Firebase query
      const recordings = await this.getAllRecordings(filters);
      
      // Filter recordings that might contain the query
      const results = [];
      for (const recording of recordings) {
        if (recording.hasTranscript || recording.hasInsights) {
          const insights = await this.getRecordingInsights(recording.uuid);
          
          // Simple text matching (in production, use proper search)
          const searchableText = `
            ${recording.topic} 
            ${insights?.summary || ''} 
            ${insights?.keyTopics?.join(' ') || ''}
            ${insights?.actionItems?.join(' ') || ''}
          `.toLowerCase();
          
          if (searchableText.includes(query.toLowerCase())) {
            results.push({
              recording,
              insights,
              relevance: this.calculateRelevance(searchableText, query)
            });
          }
        }
      }
      
      // Sort by relevance
      return results.sort((a, b) => b.relevance - a.relevance);
    } catch (error) {
      console.error('Error searching content:', error);
      return [];
    }
  }

  // Find similar recordings using AI patterns
  async findSimilarRecordings(uuid, limit = 10) {
    try {
      const targetRecording = await this.getRecording(uuid);
      if (!targetRecording) return [];

      const targetInsights = targetRecording.insights;
      if (!targetInsights) return [];

      // Get recordings from the same program type
      const candidates = await this.getAllRecordings({
        category: targetRecording.category
      });

      // Calculate similarity scores
      const similarities = [];
      for (const candidate of candidates) {
        if (candidate.uuid === uuid) continue;

        const candidateInsights = await this.getRecordingInsights(candidate.uuid);
        if (!candidateInsights) continue;

        const similarity = this.calculateSimilarity(
          targetInsights,
          candidateInsights,
          targetRecording,
          candidate
        );

        similarities.push({
          recording: candidate,
          insights: candidateInsights,
          similarity
        });
      }

      // Sort by similarity and return top matches
      return similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);
    } catch (error) {
      console.error('Error finding similar recordings:', error);
      return [];
    }
  }

  // Helper methods
  getStudentProfile(studentName) {
    return getDoc(doc(db, 'students', studentName))
      .then(doc => doc.exists() ? doc.data() : null);
  }

  getCoachProfile(coachName) {
    return getDoc(doc(db, 'coaches', coachName))
      .then(doc => doc.exists() ? doc.data() : null);
  }

  calculateStudentStatistics(recordings) {
    return {
      totalSessions: recordings.length,
      totalDuration: recordings.reduce((sum, r) => sum + (r.duration || 0), 0),
      sessionsWithVideo: recordings.filter(r => r.hasVideo).length,
      sessionsWithTranscript: recordings.filter(r => r.hasTranscript).length,
      averageSessionLength: recordings.length > 0 
        ? recordings.reduce((sum, r) => sum + (r.duration || 0), 0) / recordings.length 
        : 0,
      weeksCovered: [...new Set(recordings.map(r => r.week).filter(w => w))].length
    };
  }

  analyzeStudentProgress(recordings, executionDocs) {
    // Analyze progress based on recordings and execution documents
    const weeklyProgress = {};
    
    recordings.forEach(recording => {
      if (recording.week) {
        weeklyProgress[recording.week] = {
          sessionDate: recording.date,
          topics: recording.insights?.keyTopics || [],
          actionItems: recording.insights?.actionItems || [],
          completed: false // Would check execution docs
        };
      }
    });

    return {
      weeklyProgress,
      completionRate: Object.values(weeklyProgress).filter(w => w.completed).length / 
                     Object.keys(weeklyProgress).length,
      currentWeek: Math.max(...Object.keys(weeklyProgress).map(Number))
    };
  }

  categorizeSessionTypes(recordings) {
    const types = {};
    recordings.forEach(r => {
      const type = r.weekOrType || 'Regular';
      types[type] = (types[type] || 0) + 1;
    });
    return types;
  }

  async extractCommonTopics(recordings) {
    const topics = {};
    
    for (const recording of recordings) {
      const insights = await this.getRecordingInsights(recording.uuid);
      if (insights?.keyTopics) {
        insights.keyTopics.forEach(topic => {
          topics[topic] = (topics[topic] || 0) + 1;
        });
      }
    }
    
    // Return top 10 topics
    return Object.entries(topics)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([topic, count]) => ({ topic, count }));
  }

  async analyzeCoachingStyle(recordings) {
    // Analyze coaching patterns
    const patterns = {
      sessionStructure: [],
      commonPhrases: [],
      questionTypes: [],
      feedbackStyle: []
    };

    // This would analyze transcripts and insights
    // For now, return placeholder
    return patterns;
  }

  async identifySuccessPatterns(recordings) {
    // Identify what works well
    const patterns = {
      highEngagementTopics: [],
      effectiveStrategies: [],
      studentImprovement: []
    };

    return patterns;
  }

  calculateRelevance(text, query) {
    // Simple relevance scoring
    const queryWords = query.toLowerCase().split(' ');
    let score = 0;
    
    queryWords.forEach(word => {
      const occurrences = (text.match(new RegExp(word, 'g')) || []).length;
      score += occurrences;
    });
    
    return score;
  }

  calculateSimilarity(insights1, insights2, recording1, recording2) {
    let score = 0;
    
    // Topic similarity
    const topics1 = new Set(insights1.keyTopics || []);
    const topics2 = new Set(insights2.keyTopics || []);
    const topicOverlap = [...topics1].filter(t => topics2.has(t)).length;
    score += topicOverlap * 10;
    
    // Same student or coach
    if (recording1.student === recording2.student) score += 5;
    if (recording1.coach === recording2.coach) score += 5;
    
    // Similar week
    if (Math.abs((recording1.week || 0) - (recording2.week || 0)) <= 2) score += 3;
    
    // Sentiment similarity
    const sentimentDiff = Math.abs(
      (insights1.sentiment?.overall || 0) - 
      (insights2.sentiment?.overall || 0)
    );
    score += Math.max(0, 5 - sentimentDiff * 5);
    
    return score;
  }

  // Cache management
  getCached(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  setCache(key, data) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clearCache() {
    this.cache.clear();
  }
}

// Export singleton instance
export default new KnowledgeBaseService();
export { KB_CONFIG };