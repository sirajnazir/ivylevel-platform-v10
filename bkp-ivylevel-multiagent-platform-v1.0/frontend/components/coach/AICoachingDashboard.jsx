// src/components/AICoachingDashboard.js
// Ultimate AI-powered coaching dashboard that brings everything together

import React, { useState, useEffect } from 'react';
import { 
  Brain,
  Sparkles,
  Play,
  Calendar,
  Target,
  TrendingUp,
  Clock,
  MessageSquare,
  FileText,
  Users,
  Award,
  Bell,
  Settings,
  ChevronRight,
  ArrowRight,
  Zap,
  AlertCircle,
  CheckCircle,
  Star,
  BarChart3,
  Video,
  Mic,
  Search,
  Filter,
  Grid,
  List,
  Download,
  Share2,
  HelpCircle,
  Lightbulb,
  BookOpen,
  Mail,
  Phone,
  Globe,
  Shield,
  Activity
} from 'lucide-react';
import AICoachingAssistant from './AICoachingAssistant';
import SmartResourceRecommender from './SmartResourceRecommender';
import AISessionPlanner from './AISessionPlanner';
import VideoPlayer from './VideoPlayer';

const AICoachingDashboard = ({ coach, student }) => {
  const [activeView, setActiveView] = useState('dashboard');
  const [selectedSession, setSelectedSession] = useState(null);
  const [stats, setStats] = useState({
    sessionsCompleted: 12,
    totalHours: 18,
    studentProgress: 78,
    coachRating: 4.8,
    upcomingSession: '2024-01-15 3:00 PM',
    actionItemsCompleted: 85
  });
  const [notifications, setNotifications] = useState([]);
  const [aiInsights, setAiInsights] = useState([]);
  const [weekNumber, setWeekNumber] = useState(13);
  const [showAIAssistant, setShowAIAssistant] = useState(true);

  useEffect(() => {
    loadDashboardData();
    generateAIInsights();
  }, [coach, student]);

  const loadDashboardData = async () => {
    // Load comprehensive dashboard data
    const mockNotifications = [
      {
        id: 1,
        type: 'success',
        title: 'Great Progress!',
        message: `${student} completed all action items this week`,
        time: '2 hours ago',
        priority: 'low'
      },
      {
        id: 2,
        type: 'reminder',
        title: 'Session Tomorrow',
        message: 'AP Biology exam prep session scheduled',
        time: '4 hours ago',
        priority: 'high'
      },
      {
        id: 3,
        type: 'ai',
        title: 'AI Insight',
        message: 'Consider adding more test prep resources',
        time: '1 day ago',
        priority: 'medium'
      }
    ];
    setNotifications(mockNotifications);
  };

  const generateAIInsights = async () => {
    const insights = [
      {
        id: 1,
        type: 'opportunity',
        title: 'Engagement Opportunity',
        description: `${student} responds 40% better to visual explanations. Try more diagrams in next session.`,
        confidence: 92,
        actionable: true
      },
      {
        id: 2,
        type: 'pattern',
        title: 'Success Pattern Detected',
        description: 'Sessions starting with wins celebration show 25% higher completion rates',
        confidence: 88,
        actionable: true
      },
      {
        id: 3,
        type: 'prediction',
        title: 'Upcoming Challenge',
        description: 'Based on previous years, test anxiety peaks 2 weeks before exams. Plan intervention.',
        confidence: 85,
        actionable: true
      }
    ];
    setAiInsights(insights);
  };

  const QuickActionCard = ({ icon: Icon, title, description, color, onClick }) => (
    <button
      onClick={onClick}
      className="bg-white rounded-lg p-6 border border-gray-200 hover:shadow-lg transition-all text-left group"
    >
      <div className={`w-12 h-12 ${color} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
      <div className="mt-4 flex items-center text-blue-600 text-sm font-medium">
        <span>Get started</span>
        <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
      </div>
    </button>
  );

  const InsightCard = ({ insight }) => {
    const getIcon = () => {
      switch (insight.type) {
        case 'opportunity': return Lightbulb;
        case 'pattern': return TrendingUp;
        case 'prediction': return Activity;
        default: return Brain;
      }
    };
    
    const Icon = getIcon();
    
    return (
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-200">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
            <Icon className="w-5 h-5 text-purple-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <h4 className="font-semibold text-gray-900">{insight.title}</h4>
              <span className="text-xs text-purple-600 font-medium">{insight.confidence}% confidence</span>
            </div>
            <p className="text-sm text-gray-700">{insight.description}</p>
            {insight.actionable && (
              <button className="mt-2 text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1">
                Take action
                <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderDashboardView = () => (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 text-white">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
              Welcome back, {coach}!
              <Sparkles className="w-8 h-8 text-yellow-300" />
            </h1>
            <p className="text-blue-100 text-lg">
              Ready to make today's session with {student} extraordinary?
            </p>
          </div>
          <div className="flex gap-3">
            <button className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 flex items-center gap-2">
              <Video className="w-5 h-5" />
              Start Session
            </button>
            <button className="bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-800 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Plan Next
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/10 backdrop-blur rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-5 h-5 text-blue-200" />
              <span className="text-2xl font-bold">{stats.sessionsCompleted}</span>
            </div>
            <p className="text-sm text-blue-100">Sessions Completed</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-5 h-5 text-blue-200" />
              <span className="text-2xl font-bold">{stats.studentProgress}%</span>
            </div>
            <p className="text-sm text-blue-100">Student Progress</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <Star className="w-5 h-5 text-blue-200" />
              <span className="text-2xl font-bold">{stats.coachRating}</span>
            </div>
            <p className="text-sm text-blue-100">Coach Rating</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="w-5 h-5 text-blue-200" />
              <span className="text-2xl font-bold">{stats.actionItemsCompleted}%</span>
            </div>
            <p className="text-sm text-blue-100">Tasks Complete</p>
          </div>
        </div>
      </div>

      {/* AI Insights */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Brain className="w-6 h-6 text-purple-600" />
            AI-Powered Insights
          </h2>
          <button className="text-sm text-purple-600 hover:text-purple-700 font-medium">
            View all insights →
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {aiInsights.map(insight => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickActionCard
            icon={Play}
            title="Watch Training"
            description="Continue your onboarding journey"
            color="bg-blue-600"
            onClick={() => setActiveView('training')}
          />
          <QuickActionCard
            icon={Calendar}
            title="Plan Session"
            description="AI-powered session planning"
            color="bg-purple-600"
            onClick={() => setActiveView('planner')}
          />
          <QuickActionCard
            icon={FileText}
            title="Resources"
            description="Personalized recommendations"
            color="bg-green-600"
            onClick={() => setActiveView('resources')}
          />
          <QuickActionCard
            icon={MessageSquare}
            title="Communication"
            description="Templates & automation"
            color="bg-orange-600"
            onClick={() => setActiveView('communication')}
          />
        </div>
      </div>

      {/* Recent Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5 text-gray-600" />
            Recent Notifications
          </h3>
          <div className="space-y-3">
            {notifications.map(notif => (
              <div key={notif.id} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  notif.type === 'success' ? 'bg-green-100 text-green-600' :
                  notif.type === 'reminder' ? 'bg-blue-100 text-blue-600' :
                  'bg-purple-100 text-purple-600'
                }`}>
                  {notif.type === 'success' && <CheckCircle className="w-4 h-4" />}
                  {notif.type === 'reminder' && <Clock className="w-4 h-4" />}
                  {notif.type === 'ai' && <Sparkles className="w-4 h-4" />}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 text-sm">{notif.title}</h4>
                  <p className="text-sm text-gray-600">{notif.message}</p>
                  <p className="text-xs text-gray-500 mt-1">{notif.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Session Preview */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-600" />
            Next Session Preview
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Session with {student}</p>
                <p className="text-sm text-gray-600">Week {weekNumber} - AP Biology Prep</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{stats.upcomingSession}</p>
                <p className="text-xs text-gray-600">In 23 hours</p>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">AI Suggested Agenda:</h4>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                  Review cellular respiration concepts
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                  Practice exam questions (30 min)
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                  Stress management techniques
                </div>
              </div>
            </div>
            <button className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
              View Full Session Plan
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <Brain className="w-8 h-8 text-purple-600" />
                <span className="text-xl font-bold text-gray-900">AI Coach Pro</span>
              </div>
              <nav className="hidden md:flex items-center gap-6">
                <button
                  onClick={() => setActiveView('dashboard')}
                  className={`text-sm font-medium ${
                    activeView === 'dashboard' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setActiveView('training')}
                  className={`text-sm font-medium ${
                    activeView === 'training' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Training
                </button>
                <button
                  onClick={() => setActiveView('planner')}
                  className={`text-sm font-medium ${
                    activeView === 'planner' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Session Planner
                </button>
                <button
                  onClick={() => setActiveView('resources')}
                  className={`text-sm font-medium ${
                    activeView === 'resources' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Resources
                </button>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <button className="p-2 text-gray-600 hover:text-gray-900">
                <Search className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-600 hover:text-gray-900 relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </button>
              <button
                onClick={() => setShowAIAssistant(!showAIAssistant)}
                className="p-2 text-purple-600 hover:text-purple-700"
              >
                <Mic className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                  {coach.charAt(0)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-6">
          {/* Main Content */}
          <div className={`flex-1 ${showAIAssistant ? 'mr-80' : ''}`}>
            {activeView === 'dashboard' && renderDashboardView()}
            {activeView === 'training' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Training Hub</h2>
                {/* Your training content component here */}
                <p className="text-gray-600">YouTube-style training interface would go here</p>
              </div>
            )}
            {activeView === 'planner' && (
              <AISessionPlanner 
                coach={coach} 
                student={student} 
                weekNumber={weekNumber}
                previousSessions={[]} 
              />
            )}
            {activeView === 'resources' && (
              <SmartResourceRecommender 
                coach={coach} 
                student={student}
                currentContext={{ week: weekNumber }} 
              />
            )}
          </div>

          {/* AI Assistant Sidebar */}
          {showAIAssistant && (
            <div className="fixed right-0 top-16 bottom-0 w-80 bg-white shadow-xl border-l border-gray-200 overflow-y-auto">
              <AICoachingAssistant 
                coach={coach}
                student={student}
                sessionContext={{ weekNumber }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AICoachingDashboard;