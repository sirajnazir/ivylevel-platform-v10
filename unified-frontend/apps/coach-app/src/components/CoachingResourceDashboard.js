// src/components/CoachingResourceDashboard.js
// Comprehensive dashboard for all coaching resources

import React, { useState, useEffect } from 'react';
import { 
  Play,
  Clock,
  CheckCircle,
  TrendingUp,
  Calendar,
  Target,
  Award,
  ChevronRight,
  Filter,
  Search,
  BarChart3,
  Users,
  BookOpen,
  Zap,
  Star,
  ArrowRight,
  Info,
  FileText,
  Video,
  Download,
  Globe,
  Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

const CoachingResourceDashboard = ({ coach, student }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalSessions: 0,
    watchedSessions: 0,
    totalHours: 0,
    weekProgress: 0,
    criticalComplete: false
  });
  const [featuredContent, setFeaturedContent] = useState({
    gamePlan: null,
    next168Hour: null,
    latestExecution: null
  });
  const [learningPath, setLearningPath] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [coach, student]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      // Load stats and featured content
      await Promise.all([
        loadStats(),
        loadFeaturedContent(),
        loadLearningPath(),
        loadAchievements()
      ]);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    // Simulated stats - would query from Firestore
    setStats({
      totalSessions: 48,
      watchedSessions: 12,
      totalHours: 36,
      weekProgress: 25,
      criticalComplete: false
    });
  };

  const loadFeaturedContent = async () => {
    // Query for featured sessions
    const sessionsQuery = query(
      collection(db, 'coaching_sessions'),
      where('participants.studentNormalized', '==', student?.toLowerCase()),
      orderBy('sessionInfo.date', 'desc'),
      limit(10)
    );
    
    const snapshot = await getDocs(sessionsQuery);
    const sessions = [];
    snapshot.forEach(doc => {
      sessions.push({ id: doc.id, ...doc.data() });
    });

    // Categorize sessions
    const featured = {
      gamePlan: sessions.find(s => s.criticalSessionType === 'GAME_PLAN'),
      next168Hour: sessions.find(s => s.criticalSessionType === '168_HOUR'),
      latestExecution: sessions.find(s => s.criticalSessionType === 'EXECUTION')
    };
    
    setFeaturedContent(featured);
  };

  const loadLearningPath = async () => {
    // Define learning path milestones
    const path = [
      {
        id: 1,
        title: 'Orientation & Game Plan',
        description: 'Understand student goals and create strategy',
        status: 'completed',
        sessions: 2,
        icon: Target,
        color: 'blue'
      },
      {
        id: 2,
        title: '168-Hour Session',
        description: 'Conduct your first critical coaching session',
        status: 'in-progress',
        sessions: 1,
        icon: Clock,
        color: 'yellow'
      },
      {
        id: 3,
        title: 'Weekly Execution',
        description: 'Master regular session flow and documentation',
        status: 'upcoming',
        sessions: 3,
        icon: Calendar,
        color: 'green'
      },
      {
        id: 4,
        title: 'Advanced Strategies',
        description: 'Learn crisis management and parent communication',
        status: 'locked',
        sessions: 2,
        icon: Zap,
        color: 'purple'
      }
    ];
    setLearningPath(path);
  };

  const loadAchievements = async () => {
    const achievements = [
      {
        id: 1,
        title: 'Quick Learner',
        description: 'Completed first module in under 2 hours',
        earned: true,
        icon: Zap,
        color: 'yellow'
      },
      {
        id: 2,
        title: 'Dedicated Coach',
        description: 'Watched 5 sessions in first week',
        earned: false,
        progress: 3,
        total: 5,
        icon: Star,
        color: 'blue'
      },
      {
        id: 3,
        title: 'Master Strategist',
        description: 'Complete all Game Plan sessions',
        earned: false,
        progress: 1,
        total: 3,
        icon: Target,
        color: 'green'
      }
    ];
    setAchievements(achievements);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading your coaching dashboard...</p>
        </div>
      </div>
    );
  }

  const progressPercentage = (stats.watchedSessions / stats.totalSessions) * 100;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Welcome back, {coach}!</h1>
            <p className="text-blue-100 text-lg">
              Continue your journey coaching {student}
            </p>
          </div>
          <button 
            onClick={() => navigate('/onboarding')}
            className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors flex items-center gap-2"
          >
            <Play className="w-5 h-5" />
            Resume Training
          </button>
        </div>

        {/* Progress Overview */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white/10 backdrop-blur rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <Video className="w-5 h-5 text-blue-200" />
              <span className="text-blue-100 text-sm">Sessions</span>
            </div>
            <div className="text-2xl font-bold">{stats.watchedSessions}/{stats.totalSessions}</div>
            <div className="text-sm text-blue-200 mt-1">Videos watched</div>
          </div>
          
          <div className="bg-white/10 backdrop-blur rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-5 h-5 text-blue-200" />
              <span className="text-blue-100 text-sm">Time Invested</span>
            </div>
            <div className="text-2xl font-bold">{stats.totalHours}h</div>
            <div className="text-sm text-blue-200 mt-1">Learning hours</div>
          </div>
          
          <div className="bg-white/10 backdrop-blur rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-blue-200" />
              <span className="text-blue-100 text-sm">Progress</span>
            </div>
            <div className="text-2xl font-bold">{Math.round(progressPercentage)}%</div>
            <div className="text-sm text-blue-200 mt-1">Complete</div>
          </div>
          
          <div className="bg-white/10 backdrop-blur rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <Target className="w-5 h-5 text-blue-200" />
              <span className="text-blue-100 text-sm">Current Week</span>
            </div>
            <div className="text-2xl font-bold">Week {stats.weekProgress}</div>
            <div className="text-sm text-blue-200 mt-1">Of program</div>
          </div>
        </div>
      </div>

      {/* Critical Sessions Alert */}
      {!stats.criticalComplete && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8 flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-amber-900">Complete Critical Sessions First</h3>
            <p className="text-amber-700 text-sm mt-1">
              You must watch the Game Plan and 168-Hour sessions before conducting your first session with {student}.
            </p>
          </div>
          <button className="text-amber-600 hover:text-amber-700 font-medium text-sm">
            Start Now →
          </button>
        </div>
      )}

      {/* Featured Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Game Plan */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden group hover:shadow-lg transition-shadow">
          <div className="aspect-video bg-gradient-to-br from-blue-500 to-blue-600 relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <Target className="w-16 h-16 text-white/80" />
            </div>
            <div className="absolute top-4 left-4 bg-red-600 text-white text-xs px-2 py-1 rounded font-medium">
              REQUIRED
            </div>
          </div>
          <div className="p-6">
            <h3 className="font-bold text-lg mb-2">Game Plan Session</h3>
            <p className="text-gray-600 text-sm mb-4">
              Essential overview of {student}'s goals, challenges, and personalized strategy
            </p>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">45-60 min</span>
              <button className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                Watch Now
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* 168-Hour Session */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden group hover:shadow-lg transition-shadow">
          <div className="aspect-video bg-gradient-to-br from-yellow-500 to-orange-500 relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <Clock className="w-16 h-16 text-white/80" />
            </div>
            <div className="absolute top-4 left-4 bg-red-600 text-white text-xs px-2 py-1 rounded font-medium">
              CRITICAL
            </div>
          </div>
          <div className="p-6">
            <h3 className="font-bold text-lg mb-2">168-Hour Session</h3>
            <p className="text-gray-600 text-sm mb-4">
              Learn how to conduct your first transformative session with the student
            </p>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">60-90 min</span>
              <button className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                Watch Now
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Weekly Execution */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden group hover:shadow-lg transition-shadow">
          <div className="aspect-video bg-gradient-to-br from-green-500 to-emerald-500 relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <Calendar className="w-16 h-16 text-white/80" />
            </div>
          </div>
          <div className="p-6">
            <h3 className="font-bold text-lg mb-2">Weekly Sessions</h3>
            <p className="text-gray-600 text-sm mb-4">
              Master the flow of regular coaching sessions and best practices
            </p>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">30-45 min each</span>
              <button className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                Explore
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Learning Path */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Your Learning Path</h2>
          <span className="text-sm text-gray-500">
            {learningPath.filter(p => p.status === 'completed').length} of {learningPath.length} completed
          </span>
        </div>
        
        <div className="relative">
          {/* Progress Line */}
          <div className="absolute left-8 top-8 bottom-8 w-0.5 bg-gray-200"></div>
          <div 
            className="absolute left-8 top-8 w-0.5 bg-blue-600 transition-all duration-500"
            style={{ height: `${(1 / learningPath.length) * 100}%` }}
          ></div>
          
          {/* Milestones */}
          <div className="space-y-6">
            {learningPath.map((milestone, index) => (
              <div key={milestone.id} className="flex gap-4">
                <div className={`
                  w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0
                  ${milestone.status === 'completed' ? 'bg-green-500' : 
                    milestone.status === 'in-progress' ? 'bg-blue-500 animate-pulse' :
                    milestone.status === 'upcoming' ? 'bg-gray-300' : 'bg-gray-200'}
                `}>
                  <milestone.icon className={`w-8 h-8 ${
                    milestone.status === 'locked' ? 'text-gray-400' : 'text-white'
                  }`} />
                </div>
                
                <div className="flex-1 bg-gray-50 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{milestone.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{milestone.description}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-xs text-gray-500">
                          {milestone.sessions} sessions
                        </span>
                        {milestone.status === 'completed' && (
                          <span className="text-xs text-green-600 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Completed
                          </span>
                        )}
                      </div>
                    </div>
                    {milestone.status !== 'locked' && (
                      <button className="text-blue-600 hover:text-blue-700">
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Achievements & Resources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Achievements */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Award className="w-6 h-6 text-yellow-500" />
            Achievements
          </h2>
          
          <div className="space-y-4">
            {achievements.map(achievement => (
              <div 
                key={achievement.id} 
                className={`flex items-center gap-4 p-4 rounded-lg border ${
                  achievement.earned 
                    ? 'bg-yellow-50 border-yellow-200' 
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  achievement.earned ? 'bg-yellow-500' : 'bg-gray-300'
                }`}>
                  <achievement.icon className={`w-6 h-6 ${
                    achievement.earned ? 'text-white' : 'text-gray-500'
                  }`} />
                </div>
                <div className="flex-1">
                  <h3 className={`font-semibold ${
                    achievement.earned ? 'text-gray-900' : 'text-gray-500'
                  }`}>
                    {achievement.title}
                  </h3>
                  <p className="text-sm text-gray-600">{achievement.description}</p>
                  {!achievement.earned && achievement.progress && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                        <span>Progress</span>
                        <span>{achievement.progress}/{achievement.total}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div 
                          className="bg-blue-600 h-1.5 rounded-full transition-all"
                          style={{ width: `${(achievement.progress / achievement.total) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Resources */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-500" />
            Quick Resources
          </h2>
          
          <div className="space-y-3">
            <a href="#" className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-gray-400" />
                <span className="font-medium text-gray-700">Student Execution Doc</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </a>
            
            <a href="#" className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <Download className="w-5 h-5 text-gray-400" />
                <span className="font-medium text-gray-700">Session Notes Template</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </a>
            
            <a href="#" className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-gray-400" />
                <span className="font-medium text-gray-700">Best Practices Guide</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </a>
            
            <a href="#" className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-gray-400" />
                <span className="font-medium text-gray-700">Coach Community</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoachingResourceDashboard;