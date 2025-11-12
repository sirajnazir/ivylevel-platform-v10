// src/components/SmartResourceRecommender.js
// AI-driven resource recommendation engine that learns from coach behavior

import React, { useState, useEffect } from 'react';
import { 
  Sparkles,
  Brain,
  Play,
  FileText,
  Link,
  Clock,
  TrendingUp,
  Target,
  Filter,
  RefreshCw,
  ChevronRight,
  Star,
  Zap,
  BookOpen,
  Users,
  Calendar,
  AlertTriangle,
  CheckCircle,
  ArrowUpRight,
  Lightbulb
} from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

const SmartResourceRecommender = ({ coach, student, currentContext }) => {
  const [recommendations, setRecommendations] = useState({
    immediate: [],
    upcoming: [],
    skillBuilding: [],
    similar: []
  });
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [learningProfile, setLearningProfile] = useState(null);
  const [confidenceScore, setConfidenceScore] = useState(0);

  useEffect(() => {
    analyzeAndRecommend();
  }, [coach, student, currentContext]);

  const analyzeAndRecommend = async () => {
    setLoading(true);
    
    // Analyze coach learning patterns
    const profile = await analyzeCoachProfile();
    setLearningProfile(profile);
    
    // Generate AI recommendations
    const recs = await generateSmartRecommendations(profile);
    setRecommendations(recs);
    
    // Calculate confidence score
    const confidence = calculateConfidenceScore(recs);
    setConfidenceScore(confidence);
    
    setLoading(false);
  };

  const analyzeCoachProfile = async () => {
    // Simulate AI analysis of coach behavior patterns
    return {
      preferredContentType: 'video',
      averageSessionLength: 45,
      strongAreas: ['engagement', 'motivation'],
      improvementAreas: ['time-management', 'technical-skills'],
      studentProfile: {
        grade: 'sophomore',
        interests: ['biomed', 'research'],
        challenges: ['test-anxiety', 'time-management'],
        learningStyle: 'visual'
      },
      historicalSuccess: {
        gameplanCompletion: true,
        firstSessionSuccess: 0.85,
        studentRetention: 0.92
      }
    };
  };

  const generateSmartRecommendations = async (profile) => {
    // AI-powered recommendation generation
    const immediate = [
      {
        id: 1,
        type: 'critical',
        category: 'video',
        title: `${student}'s Game Plan Deep Dive`,
        description: 'Essential context for your first session - includes family dynamics and hidden motivators',
        duration: '45 min',
        relevance: 98,
        reason: 'Required before first session',
        thumbnail: { type: 'gameplan', color: '#3B82F6' },
        tags: ['required', 'game-plan', 'first-session'],
        aiNote: `Pay special attention to ${student}'s anxiety around standardized tests (minute 23-28)`
      },
      {
        id: 2,
        type: 'critical',
        category: 'video',
        title: '168-Hour Success Framework',
        description: 'Master the transformative first session structure that sets the tone for the entire program',
        duration: '60 min',
        relevance: 95,
        reason: 'Critical for first session success',
        thumbnail: { type: '168-hour', color: '#F59E0B' },
        tags: ['required', '168-hour', 'framework'],
        aiNote: 'Focus on the motivation techniques at 15:30 - highly effective for sophomore students'
      },
      {
        id: 3,
        type: 'recommended',
        category: 'document',
        title: 'Sophomore BioMed Track Blueprint',
        description: 'Curated pathway for students interested in biomedical careers',
        duration: '15 min read',
        relevance: 92,
        reason: `Matches ${student}'s interests perfectly`,
        thumbnail: { type: 'document', color: '#10B981' },
        tags: ['biomed', 'sophomore', 'pathway']
      }
    ];

    const upcoming = [
      {
        id: 4,
        type: 'preparation',
        category: 'video',
        title: 'Handling Test Anxiety - Proven Techniques',
        description: 'Evidence-based strategies for helping students overcome test anxiety',
        duration: '30 min',
        relevance: 88,
        reason: `${student} shows signs of test anxiety`,
        thumbnail: { type: 'skill', color: '#8B5CF6' },
        tags: ['test-prep', 'anxiety', 'mental-health'],
        scheduleSuggestion: 'Watch before Week 3 session'
      },
      {
        id: 5,
        type: 'preparation',
        category: 'case-study',
        title: 'Success Story: Sarah (BioMed → Johns Hopkins)',
        description: 'Similar profile student who overcame identical challenges',
        duration: '20 min',
        relevance: 85,
        reason: 'Inspiring example for motivation',
        thumbnail: { type: 'success', color: '#EC4899' },
        tags: ['case-study', 'biomed', 'motivation']
      }
    ];

    const skillBuilding = [
      {
        id: 6,
        type: 'skill',
        category: 'course',
        title: 'Advanced Time Management for STEM Students',
        description: 'Help high-achieving students optimize their packed schedules',
        duration: '2 hours',
        relevance: 82,
        reason: 'Address identified improvement area',
        thumbnail: { type: 'course', color: '#14B8A6' },
        tags: ['time-management', 'stem', 'efficiency'],
        modules: 5,
        progress: 0
      },
      {
        id: 7,
        type: 'skill',
        category: 'workshop',
        title: 'Parent Communication Strategies',
        description: 'Navigate complex family dynamics in high-pressure households',
        duration: '45 min',
        relevance: 78,
        reason: 'Useful for parent meetings',
        thumbnail: { type: 'workshop', color: '#F97316' },
        tags: ['communication', 'parents', 'relationships']
      }
    ];

    const similar = await findSimilarSuccessPatterns(profile);

    return { immediate, upcoming, skillBuilding, similar };
  };

  const findSimilarSuccessPatterns = async (profile) => {
    // AI finds similar successful coaching patterns
    return [
      {
        id: 8,
        type: 'pattern',
        category: 'insight',
        title: 'What Worked: Iqra (Similar Profile)',
        description: 'Sophomore interested in BioMed who improved from B+ to A student',
        relevance: 90,
        coach: 'Coach Marissa',
        outcome: '15% grade improvement in 8 weeks',
        keyStrategies: ['Weekly lab report reviews', 'Research project mentorship', 'Study group formation']
      },
      {
        id: 9,
        type: 'pattern',
        category: 'insight',
        title: 'Breakthrough Moment: Test Anxiety to Test Master',
        description: 'How Coach Andrew helped a student overcome severe test anxiety',
        relevance: 85,
        coach: 'Coach Andrew',
        outcome: 'SAT score improved by 200 points',
        keyStrategies: ['Breathing exercises', 'Practice test routine', 'Positive visualization']
      }
    ];
  };

  const calculateConfidenceScore = (recs) => {
    // Calculate AI confidence in recommendations
    const avgRelevance = [...recs.immediate, ...recs.upcoming]
      .reduce((sum, rec) => sum + rec.relevance, 0) / 
      (recs.immediate.length + recs.upcoming.length);
    return Math.round(avgRelevance);
  };

  const ResourceCard = ({ resource, size = 'medium' }) => {
    const [isHovered, setIsHovered] = useState(false);

    const getCategoryIcon = () => {
      switch (resource.category) {
        case 'video': return Play;
        case 'document': return FileText;
        case 'course': return BookOpen;
        case 'workshop': return Users;
        case 'case-study': return TrendingUp;
        case 'insight': return Lightbulb;
        default: return FileText;
      }
    };

    const Icon = getCategoryIcon();

    return (
      <div 
        className={`bg-white rounded-lg border border-gray-200 p-4 hover:shadow-lg transition-all cursor-pointer ${
          resource.type === 'critical' ? 'ring-2 ring-red-500' : ''
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3">
            <div 
              className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0`}
              style={{ backgroundColor: resource.thumbnail.color + '20' }}
            >
              <Icon className="w-6 h-6" style={{ color: resource.thumbnail.color }} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 line-clamp-2">{resource.title}</h3>
              {resource.type === 'critical' && (
                <span className="inline-flex items-center gap-1 text-xs text-red-600 font-medium mt-1">
                  <AlertTriangle className="w-3 h-3" />
                  Required before first session
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <Clock className="w-3 h-3" />
            {resource.duration}
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 mb-3">{resource.description}</p>

        {/* AI Insight */}
        {resource.aiNote && isHovered && (
          <div className="mb-3 p-2 bg-purple-50 rounded-lg">
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-purple-700">{resource.aiNote}</p>
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Relevance Score */}
            <div className="flex items-center gap-1">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    className={`w-3 h-3 ${
                      i < Math.floor(resource.relevance / 20) 
                        ? 'text-yellow-500 fill-yellow-500' 
                        : 'text-gray-300'
                    }`} 
                  />
                ))}
              </div>
              <span className="text-xs text-gray-500">{resource.relevance}%</span>
            </div>

            {/* Tags */}
            {resource.tags && (
              <div className="flex gap-1">
                {resource.tags.slice(0, 2).map((tag, idx) => (
                  <span key={idx} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <button className="text-blue-600 hover:text-blue-700">
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        {/* Schedule Suggestion */}
        {resource.scheduleSuggestion && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <Calendar className="w-3 h-3" />
              {resource.scheduleSuggestion}
            </div>
          </div>
        )}
      </div>
    );
  };

  const PatternCard = ({ pattern }) => (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-200">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
            <Lightbulb className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{pattern.title}</h3>
            <p className="text-sm text-gray-600">{pattern.coach}</p>
          </div>
        </div>
      </div>
      
      <p className="text-sm text-gray-700 mb-3">{pattern.description}</p>
      
      <div className="bg-white rounded-lg p-3 mb-3">
        <div className="flex items-center gap-2 text-sm font-medium text-green-700 mb-2">
          <CheckCircle className="w-4 h-4" />
          {pattern.outcome}
        </div>
        <div className="space-y-1">
          {pattern.keyStrategies.map((strategy, idx) => (
            <div key={idx} className="flex items-start gap-2 text-xs text-gray-600">
              <ChevronRight className="w-3 h-3 mt-0.5 flex-shrink-0" />
              {strategy}
            </div>
          ))}
        </div>
      </div>
      
      <button className="text-sm text-purple-600 hover:text-purple-700 font-medium">
        Learn from this pattern →
      </button>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Brain className="w-12 h-12 text-purple-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">AI is analyzing your coaching context...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI Confidence Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
              <Brain className="w-6 h-6" />
              AI-Powered Recommendations
              <Sparkles className="w-5 h-5 text-yellow-300" />
            </h2>
            <p className="text-purple-100">
              Personalized for coaching {student} based on similar successful patterns
            </p>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{confidenceScore}%</div>
            <div className="text-sm text-purple-100">AI Confidence</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {['all', 'immediate', 'upcoming', 'skills', 'patterns'].map(filter => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
              activeFilter === filter
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {filter.charAt(0).toUpperCase() + filter.slice(1)}
          </button>
        ))}
        <button
          onClick={analyzeAndRecommend}
          className="ml-auto p-2 text-gray-600 hover:text-gray-900"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Immediate Actions */}
      {(activeFilter === 'all' || activeFilter === 'immediate') && recommendations.immediate.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-red-600" />
            <h3 className="text-lg font-semibold text-gray-900">Immediate Actions</h3>
            <span className="text-sm text-gray-500">Complete before first session</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendations.immediate.map(resource => (
              <ResourceCard key={resource.id} resource={resource} />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Preparation */}
      {(activeFilter === 'all' || activeFilter === 'upcoming') && recommendations.upcoming.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Upcoming Preparation</h3>
            <span className="text-sm text-gray-500">For future sessions</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendations.upcoming.map(resource => (
              <ResourceCard key={resource.id} resource={resource} />
            ))}
          </div>
        </div>
      )}

      {/* Skill Building */}
      {(activeFilter === 'all' || activeFilter === 'skills') && recommendations.skillBuilding.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">Skill Building</h3>
            <span className="text-sm text-gray-500">Enhance your coaching abilities</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendations.skillBuilding.map(resource => (
              <ResourceCard key={resource.id} resource={resource} />
            ))}
          </div>
        </div>
      )}

      {/* Similar Success Patterns */}
      {(activeFilter === 'all' || activeFilter === 'patterns') && recommendations.similar.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">Learn from Success Patterns</h3>
            <span className="text-sm text-gray-500">What worked for similar students</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recommendations.similar.map(pattern => (
              <PatternCard key={pattern.id} pattern={pattern} />
            ))}
          </div>
        </div>
      )}

      {/* Learning Profile Insights */}
      {learningProfile && (
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Your Coaching Profile Insights</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Strong Areas</h4>
              <div className="space-y-1">
                {learningProfile.strongAreas.map((area, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle className="w-3 h-3" />
                    {area}
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Growth Opportunities</h4>
              <div className="space-y-1">
                {learningProfile.improvementAreas.map((area, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm text-amber-600">
                    <Target className="w-3 h-3" />
                    {area}
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Student Match</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Grade Match</span>
                  <span className="font-medium text-green-600">95%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Interest Alignment</span>
                  <span className="font-medium text-green-600">88%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartResourceRecommender;