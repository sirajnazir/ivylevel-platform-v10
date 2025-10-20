// recommendationEngine.js - AI-powered resource recommendation system

import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit,
  doc,
  getDoc,
  updateDoc,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';

class RecommendationEngine {
  constructor() {
    this.db = getFirestore();
    this.weights = {
      // Weights for different matching criteria
      gradeMatch: 0.25,
      subjectMatch: 0.30,
      profileMatch: 0.20,
      tagMatch: 0.15,
      popularityScore: 0.05,
      recencyScore: 0.05
    };
  }

  /**
   * Get personalized recommendations for a coach
   */
  async getRecommendationsForCoach(coachId, options = {}) {
    try {
      // Get coach data
      const coach = await this.getCoachData(coachId);
      if (!coach) throw new Error('Coach not found');

      // Get assigned students
      const students = await this.getAssignedStudents(coachId);
      if (students.length === 0) {
        return this.getDefaultRecommendations();
      }

      // Get all available resources
      const resources = await this.getAllResources();

      // Calculate relevance scores for each resource
      const scoredResources = resources.map(resource => {
        const score = this.calculateRelevanceScore(resource, coach, students);
        return { ...resource, relevanceScore: score };
      });

      // Sort by relevance score
      scoredResources.sort((a, b) => b.relevanceScore - a.relevanceScore);

      // Apply filters if provided
      let filteredResources = scoredResources;
      if (options.type) {
        filteredResources = filteredResources.filter(r => r.type === options.type);
      }
      if (options.limit) {
        filteredResources = filteredResources.slice(0, options.limit);
      }

      // Get already shared resources to avoid duplicates
      const sharedResources = await this.getSharedResources(coachId);
      const sharedIds = new Set(sharedResources.map(r => r.resourceId));

      // Filter out already shared resources unless requested
      if (!options.includeShared) {
        filteredResources = filteredResources.filter(r => !sharedIds.has(r.id));
      }

      // Enhance with usage data
      const enhancedResources = await this.enhanceWithUsageData(filteredResources);

      // Track recommendation event
      await this.trackRecommendation(coachId, enhancedResources);

      return enhancedResources;
    } catch (error) {
      console.error('Error getting recommendations:', error);
      throw error;
    }
  }

  /**
   * Calculate relevance score for a resource
   */
  calculateRelevanceScore(resource, coach, students) {
    let score = 0;

    // Calculate average scores across all students
    const studentScores = students.map(student => {
      let studentScore = 0;

      // Grade matching
      if (resource.grade.includes('all') || resource.grade.includes(student.grade)) {
        studentScore += this.weights.gradeMatch;
      }

      // Subject matching
      const subjectMatch = this.calculateArrayOverlap(
        resource.subject,
        student.interests
      );
      studentScore += subjectMatch * this.weights.subjectMatch;

      // Profile matching
      if (resource.studentProfile.includes('all') || 
          resource.studentProfile.includes(student.academicProfile)) {
        studentScore += this.weights.profileMatch;
      }

      // Tag matching with student needs
      const tagScore = this.calculateTagRelevance(resource.tags, student);
      studentScore += tagScore * this.weights.tagMatch;

      return studentScore;
    });

    // Average student scores
    score = studentScores.reduce((sum, s) => sum + s, 0) / studentScores.length;

    // Add popularity score (based on views and ratings)
    const popularityScore = this.calculatePopularityScore(resource);
    score += popularityScore * this.weights.popularityScore;

    // Add recency score (newer resources get slight boost)
    const recencyScore = this.calculateRecencyScore(resource);
    score += recencyScore * this.weights.recencyScore;

    // Special boosts
    if (resource.isRequired) score *= 1.2;
    if (resource.priority === 'high') score *= 1.15;
    if (coach.currentModule <= 2 && resource.tags.includes('first-session')) score *= 1.3;

    // Normalize to 0-100
    return Math.min(Math.round(score * 100), 100);
  }

  /**
   * Calculate overlap between two arrays
   */
  calculateArrayOverlap(arr1, arr2) {
    if (!arr1 || !arr2 || arr1.length === 0 || arr2.length === 0) return 0;
    
    const set1 = new Set(arr1.map(item => item.toLowerCase()));
    const set2 = new Set(arr2.map(item => item.toLowerCase()));
    
    let overlap = 0;
    for (const item of set1) {
      if (set2.has(item)) overlap++;
    }
    
    return overlap / Math.max(set1.size, set2.size);
  }

  /**
   * Calculate tag relevance based on student needs
   */
  calculateTagRelevance(resourceTags, student) {
    if (!resourceTags || resourceTags.length === 0) return 0;

    let relevance = 0;
    const tagSet = new Set(resourceTags.map(tag => tag.toLowerCase()));

    // Check for weak spot matches
    if (student.weakSpots) {
      for (const weakSpot of student.weakSpots) {
        const weakSpotLower = weakSpot.toLowerCase();
        if (tagSet.has(weakSpotLower) || 
            [...tagSet].some(tag => tag.includes(weakSpotLower))) {
          relevance += 0.5;
        }
      }
    }

    // Check for quick win matches
    if (student.quickWins) {
      for (const quickWin of student.quickWins) {
        const quickWinLower = quickWin.toLowerCase();
        if (tagSet.has(quickWinLower) || 
            [...tagSet].some(tag => tag.includes(quickWinLower))) {
          relevance += 0.3;
        }
      }
    }

    // Check for priority area matches
    if (student.priorityAreas) {
      for (const priority of student.priorityAreas) {
        const priorityLower = priority.toLowerCase();
        if (tagSet.has(priorityLower) || 
            [...tagSet].some(tag => tag.includes(priorityLower))) {
          relevance += 0.4;
        }
      }
    }

    return Math.min(relevance, 1);
  }

  /**
   * Calculate popularity score based on usage metrics
   */
  calculatePopularityScore(resource) {
    const viewScore = Math.min(resource.viewCount / 100, 1) * 0.3;
    const ratingScore = resource.averageRating ? (resource.averageRating / 5) * 0.7 : 0.5;
    
    return viewScore + ratingScore;
  }

  /**
   * Calculate recency score
   */
  calculateRecencyScore(resource) {
    const now = new Date();
    const created = resource.createdAt.toDate ? resource.createdAt.toDate() : new Date(resource.createdAt);
    const daysSinceCreation = (now - created) / (1000 * 60 * 60 * 24);
    
    // Resources newer than 30 days get full score
    if (daysSinceCreation <= 30) return 1;
    // Linear decay over 180 days
    if (daysSinceCreation <= 180) return 1 - (daysSinceCreation - 30) / 150;
    // Older resources get minimal score
    return 0.2;
  }

  /**
   * Get similar resources based on a given resource
   */
  async getSimilarResources(resourceId, limit = 5) {
    try {
      // Get the reference resource
      const resourceDoc = await getDoc(doc(this.db, 'resources', resourceId));
      if (!resourceDoc.exists()) throw new Error('Resource not found');
      
      const referenceResource = { id: resourceDoc.id, ...resourceDoc.data() };
      
      // Get all resources of the same type
      const resourcesQuery = query(
        collection(this.db, 'resources'),
        where('type', '==', referenceResource.type),
        limit(50)
      );
      
      const snapshot = await getDocs(resourcesQuery);
      const resources = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(r => r.id !== resourceId);

      // Calculate similarity scores
      const scoredResources = resources.map(resource => {
        const similarity = this.calculateSimilarity(referenceResource, resource);
        return { ...resource, similarityScore: similarity };
      });

      // Sort by similarity and return top results
      scoredResources.sort((a, b) => b.similarityScore - a.similarityScore);
      return scoredResources.slice(0, limit);
    } catch (error) {
      console.error('Error getting similar resources:', error);
      throw error;
    }
  }

  /**
   * Calculate similarity between two resources
   */
  calculateSimilarity(resource1, resource2) {
    let similarity = 0;

    // Type match (already filtered, so this is 1)
    similarity += 0.2;

    // Grade overlap
    const gradeOverlap = this.calculateArrayOverlap(resource1.grade, resource2.grade);
    similarity += gradeOverlap * 0.2;

    // Subject overlap
    const subjectOverlap = this.calculateArrayOverlap(resource1.subject, resource2.subject);
    similarity += subjectOverlap * 0.3;

    // Tag overlap
    const tagOverlap = this.calculateArrayOverlap(resource1.tags, resource2.tags);
    similarity += tagOverlap * 0.2;

    // Profile overlap
    const profileOverlap = this.calculateArrayOverlap(
      resource1.studentProfile, 
      resource2.studentProfile
    );
    similarity += profileOverlap * 0.1;

    return similarity;
  }

  /**
   * Get trending resources based on recent activity
   */
  async getTrendingResources(days = 7, limit = 10) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get recent coach-resource interactions
      const interactionsQuery = query(
        collection(this.db, 'coachResources'),
        where('lastAccessedAt', '>=', startDate),
        orderBy('lastAccessedAt', 'desc')
      );

      const snapshot = await getDocs(interactionsQuery);
      const resourceCounts = {};

      // Count accesses per resource
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        resourceCounts[data.resourceId] = (resourceCounts[data.resourceId] || 0) + 1;
      });

      // Get resource details for top trending
      const trendingIds = Object.entries(resourceCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, limit)
        .map(([id]) => id);

      const trendingResources = [];
      for (const resourceId of trendingIds) {
        const resourceDoc = await getDoc(doc(this.db, 'resources', resourceId));
        if (resourceDoc.exists()) {
          trendingResources.push({
            id: resourceDoc.id,
            ...resourceDoc.data(),
            trendingScore: resourceCounts[resourceId]
          });
        }
      }

      return trendingResources;
    } catch (error) {
      console.error('Error getting trending resources:', error);
      throw error;
    }
  }

  /**
   * Machine learning-based recommendation (simplified collaborative filtering)
   */
  async getCollaborativeRecommendations(coachId, limit = 10) {
    try {
      // Get coaches with similar student profiles
      const similarCoaches = await this.findSimilarCoaches(coachId);
      
      // Get resources that similar coaches found helpful
      const resourceScores = {};
      
      for (const similarCoach of similarCoaches) {
        const coachResourcesQuery = query(
          collection(this.db, 'coachResources'),
          where('coachId', '==', similarCoach.id),
          where('rating', '>=', 4),
          orderBy('rating', 'desc')
        );
        
        const snapshot = await getDocs(coachResourcesQuery);
        
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          const weight = similarCoach.similarity * (data.rating / 5);
          resourceScores[data.resourceId] = (resourceScores[data.resourceId] || 0) + weight;
        });
      }

      // Sort by score and get top resources
      const topResourceIds = Object.entries(resourceScores)
        .sort(([, a], [, b]) => b - a)
        .slice(0, limit)
        .map(([id]) => id);

      // Fetch resource details
      const recommendations = [];
      for (const resourceId of topResourceIds) {
        const resourceDoc = await getDoc(doc(this.db, 'resources', resourceId));
        if (resourceDoc.exists()) {
          recommendations.push({
            id: resourceDoc.id,
            ...resourceDoc.data(),
            collaborativeScore: resourceScores[resourceId]
          });
        }
      }

      return recommendations;
    } catch (error) {
      console.error('Error getting collaborative recommendations:', error);
      throw error;
    }
  }

  /**
   * Find coaches with similar student profiles
   */
  async findSimilarCoaches(coachId, limit = 5) {
    try {
      const targetCoach = await this.getCoachData(coachId);
      const targetStudents = await this.getAssignedStudents(coachId);
      
      if (!targetCoach || targetStudents.length === 0) return [];

      // Get all other coaches
      const coachesQuery = query(
        collection(this.db, 'users'),
        where('role', '==', 'coach'),
        where('__name__', '!=', coachId)
      );
      
      const snapshot = await getDocs(coachesQuery);
      const similarCoaches = [];

      for (const coachDoc of snapshot.docs) {
        const coach = { id: coachDoc.id, ...coachDoc.data() };
        const coachStudents = await this.getAssignedStudents(coach.id);
        
        if (coachStudents.length > 0) {
          const similarity = this.calculateCoachSimilarity(
            targetStudents, 
            coachStudents
          );
          
          if (similarity > 0.3) { // Threshold for similarity
            similarCoaches.push({ ...coach, similarity });
          }
        }
      }

      // Sort by similarity and return top matches
      similarCoaches.sort((a, b) => b.similarity - a.similarity);
      return similarCoaches.slice(0, limit);
    } catch (error) {
      console.error('Error finding similar coaches:', error);
      return [];
    }
  }

  /**
   * Calculate similarity between two coaches based on their students
   */
  calculateCoachSimilarity(students1, students2) {
    let totalSimilarity = 0;
    let comparisons = 0;

    for (const s1 of students1) {
      for (const s2 of students2) {
        let similarity = 0;
        
        // Grade similarity
        if (s1.grade === s2.grade) similarity += 0.3;
        
        // Interest overlap
        const interestOverlap = this.calculateArrayOverlap(s1.interests, s2.interests);
        similarity += interestOverlap * 0.4;
        
        // Profile similarity
        if (s1.academicProfile === s2.academicProfile) similarity += 0.3;
        
        totalSimilarity += similarity;
        comparisons++;
      }
    }

    return comparisons > 0 ? totalSimilarity / comparisons : 0;
  }

  /**
   * Helper: Get coach data
   */
  async getCoachData(coachId) {
    const coachDoc = await getDoc(doc(this.db, 'users', coachId));
    return coachDoc.exists() ? { id: coachDoc.id, ...coachDoc.data() } : null;
  }

  /**
   * Helper: Get assigned students for a coach
   */
  async getAssignedStudents(coachId) {
    const studentsQuery = query(
      collection(this.db, 'students'),
      where('assignedCoachId', '==', coachId),
      where('status', '==', 'active')
    );
    
    const snapshot = await getDocs(studentsQuery);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  /**
   * Helper: Get all resources
   */
  async getAllResources() {
    const resourcesQuery = query(
      collection(this.db, 'resources'),
      orderBy('createdAt', 'desc'),
      limit(500) // Reasonable limit for performance
    );
    
    const snapshot = await getDocs(resourcesQuery);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  /**
   * Helper: Get shared resources for a coach
   */
  async getSharedResources(coachId) {
    const sharedQuery = query(
      collection(this.db, 'coachResources'),
      where('coachId', '==', coachId)
    );
    
    const snapshot = await getDocs(sharedQuery);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  /**
   * Helper: Enhance resources with usage data
   */
  async enhanceWithUsageData(resources) {
    const enhanced = [];
    
    for (const resource of resources) {
      // Get usage stats
      const usageQuery = query(
        collection(this.db, 'coachResources'),
        where('resourceId', '==', resource.id),
        where('rating', '>', 0)
      );
      
      const snapshot = await getDocs(usageQuery);
      const ratings = snapshot.docs.map(doc => doc.data().rating);
      
      enhanced.push({
        ...resource,
        totalUses: snapshot.size,
        averageRating: ratings.length > 0 
          ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length 
          : null
      });
    }
    
    return enhanced;
  }

  /**
   * Track recommendation event for analytics
   */
  async trackRecommendation(coachId, resources) {
    try {
      await addDoc(collection(this.db, 'analytics'), {
        eventType: 'recommendation_generated',
        userId: coachId,
        userRole: 'coach',
        eventData: {
          resourceCount: resources.length,
          resourceIds: resources.map(r => r.id),
          topRelevanceScore: resources[0]?.relevanceScore || 0
        },
        timestamp: serverTimestamp(),
        platform: 'web'
      });
    } catch (error) {
      console.error('Error tracking recommendation:', error);
    }
  }

  /**
   * Get default recommendations for coaches without students
   */
  async getDefaultRecommendations() {
    const defaultQuery = query(
      collection(this.db, 'resources'),
      where('tags', 'array-contains', 'new-coach'),
      orderBy('priority', 'desc'),
      limit(10)
    );
    
    const snapshot = await getDocs(defaultQuery);
    return snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data(),
      relevanceScore: 80 // Default high score for new coach resources
    }));
  }
}

// Export singleton instance
const recommendationEngine = new RecommendationEngine();
export default recommendationEngine;

// Usage examples:
export const getCoachRecommendations = async (coachId) => {
  return await recommendationEngine.getRecommendationsForCoach(coachId, {
    limit: 20,
    includeShared: false
  });
};

export const getSimilarResources = async (resourceId) => {
  return await recommendationEngine.getSimilarResources(resourceId, 5);
};

export const getTrendingResources = async () => {
  return await recommendationEngine.getTrendingResources(7, 10);
};

export const getCollaborativeRecommendations = async (coachId) => {
  return await recommendationEngine.getCollaborativeRecommendations(coachId, 10);
};