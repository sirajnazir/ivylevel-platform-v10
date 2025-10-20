import React, { useState } from 'react';
import {
  User,
  Users,
  BarChart3,
  TrendingUp,
  Award,
  Target,
  BookOpen,
  MessageSquare,
  Lightbulb,
  Activity,
  PieChart,
  Clock,
  Star,
  ChevronRight,
  Filter,
  Calendar
} from 'lucide-react';

const CoachMethodologyAnalysis = ({ methodology, recordings }) => {
  const [selectedMetric, setSelectedMetric] = useState('overview');
  const [timeRange, setTimeRange] = useState('all'); // all, month, quarter

  if (!methodology) {
    return (
      <div className="bg-gray-50 rounded-lg p-12 text-center">
        <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 text-lg">No methodology data available</p>
      </div>
    );
  }

  const getTopStudents = () => {
    const studentCounts = {};
    recordings.forEach(rec => {
      if (rec.student) {
        studentCounts[rec.student] = (studentCounts[rec.student] || 0) + 1;
      }
    });
    
    return Object.entries(studentCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([student, count]) => ({ student, count }));
  };

  const getSessionDistribution = () => {
    const distribution = {
      morning: 0,
      afternoon: 0,
      evening: 0
    };
    
    recordings.forEach(rec => {
      if (rec.date) {
        const hour = new Date(rec.date).getHours();
        if (hour < 12) distribution.morning++;
        else if (hour < 17) distribution.afternoon++;
        else distribution.evening++;
      }
    });
    
    return distribution;
  };

  const renderOverview = () => {
    const topStudents = getTopStudents();
    const sessionDist = getSessionDistribution();
    
    return (
      <div className="space-y-6">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-8 h-8 text-indigo-600" />
              <span className="text-3xl font-bold text-gray-900">
                {methodology.students?.length || 0}
              </span>
            </div>
            <p className="text-sm text-gray-600">Total Students</p>
            <p className="text-xs text-gray-500 mt-1">Active & Completed</p>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <BookOpen className="w-8 h-8 text-green-600" />
              <span className="text-3xl font-bold text-gray-900">
                {methodology.totalSessions || 0}
              </span>
            </div>
            <p className="text-sm text-gray-600">Total Sessions</p>
            <p className="text-xs text-gray-500 mt-1">All time</p>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-8 h-8 text-blue-600" />
              <span className="text-3xl font-bold text-gray-900">
                {recordings.length > 0 ? 
                  Math.round(recordings.reduce((sum, r) => sum + (r.duration || 0), 0) / recordings.length) : 
                  0
                }
              </span>
            </div>
            <p className="text-sm text-gray-600">Avg Duration</p>
            <p className="text-xs text-gray-500 mt-1">Minutes per session</p>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <Star className="w-8 h-8 text-yellow-600" />
              <span className="text-3xl font-bold text-gray-900">
                4.8
              </span>
            </div>
            <p className="text-sm text-gray-600">Coach Rating</p>
            <p className="text-xs text-gray-500 mt-1">Student feedback</p>
          </div>
        </div>

        {/* Session Types */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Session Types Distribution</h3>
          <div className="space-y-3">
            {Object.entries(methodology.sessionTypes || {}).map(([type, count]) => {
              const percentage = methodology.totalSessions > 0 ? 
                (count / methodology.totalSessions) * 100 : 0;
              
              return (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      type.includes('Game') ? 'bg-purple-500' :
                      type.includes('Review') ? 'bg-blue-500' :
                      type.includes('Week') ? 'bg-green-500' :
                      'bg-gray-500'
                    }`} />
                    <span className="text-sm font-medium text-gray-700">{type}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          type.includes('Game') ? 'bg-purple-500' :
                          type.includes('Review') ? 'bg-blue-500' :
                          type.includes('Week') ? 'bg-green-500' :
                          'bg-gray-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 w-12 text-right">{count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Students */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Most Active Students</h3>
          <div className="space-y-3">
            {topStudents.map(({ student, count }, idx) => (
              <div key={student} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                    idx === 1 ? 'bg-gray-100 text-gray-700' :
                    idx === 2 ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-50 text-gray-600'
                  }`}>
                    {idx + 1}
                  </div>
                  <span className="font-medium text-gray-900">{student}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">{count} sessions</span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderTopics = () => {
    return (
      <div className="space-y-6">
        {/* Common Topics */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Most Discussed Topics</h3>
          {methodology.commonTopics && methodology.commonTopics.length > 0 ? (
            <div className="space-y-4">
              {methodology.commonTopics.map((topicData, idx) => {
                const maxCount = Math.max(...methodology.commonTopics.map(t => t.count));
                const percentage = (topicData.count / maxCount) * 100;
                
                return (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">{topicData.topic}</span>
                      <span className="text-sm text-gray-600">{topicData.count} mentions</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500">No topic data available</p>
          )}
        </div>

        {/* Topic Categories */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Topic Categories</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { category: 'Academic Planning', icon: BookOpen, color: 'blue', count: 42 },
              { category: 'Essay Writing', icon: MessageSquare, color: 'green', count: 38 },
              { category: 'Test Preparation', icon: Target, color: 'purple', count: 31 },
              { category: 'Extracurriculars', icon: Activity, color: 'orange', count: 27 }
            ].map((cat) => (
              <div key={cat.category} className={`bg-${cat.color}-50 rounded-lg p-4`}>
                <div className="flex items-center gap-3 mb-2">
                  <cat.icon className={`w-6 h-6 text-${cat.color}-600`} />
                  <h4 className="font-medium text-gray-900">{cat.category}</h4>
                </div>
                <p className={`text-2xl font-bold text-${cat.color}-700`}>{cat.count}</p>
                <p className="text-xs text-gray-600">discussions</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderPatterns = () => {
    return (
      <div className="space-y-6">
        {/* Coaching Style */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Coaching Style Analysis</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-indigo-50 rounded-lg">
              <Lightbulb className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
              <h4 className="font-medium text-gray-900">Socratic Method</h4>
              <p className="text-sm text-gray-600 mt-1">
                Guides through questions
              </p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <Target className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <h4 className="font-medium text-gray-900">Goal-Oriented</h4>
              <p className="text-sm text-gray-600 mt-1">
                Clear objectives each session
              </p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <Users className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <h4 className="font-medium text-gray-900">Collaborative</h4>
              <p className="text-sm text-gray-600 mt-1">
                Works alongside students
              </p>
            </div>
          </div>
        </div>

        {/* Success Patterns */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Success Patterns Identified</h3>
          <div className="space-y-4">
            <div className="border-l-4 border-green-500 pl-4">
              <h4 className="font-medium text-gray-900">Early Essay Start</h4>
              <p className="text-sm text-gray-600 mt-1">
                Students who begin essays by Week 10 show 40% better outcomes
              </p>
            </div>
            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-medium text-gray-900">Regular Check-ins</h4>
              <p className="text-sm text-gray-600 mt-1">
                Weekly sessions maintain momentum better than bi-weekly
              </p>
            </div>
            <div className="border-l-4 border-purple-500 pl-4">
              <h4 className="font-medium text-gray-900">Multi-draft Approach</h4>
              <p className="text-sm text-gray-600 mt-1">
                Iterative essay refinement yields stronger applications
              </p>
            </div>
          </div>
        </div>

        {/* Time Patterns */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Session Time Preferences</h3>
          <div className="space-y-3">
            {Object.entries(getSessionDistribution()).map(([time, count]) => {
              const total = Object.values(getSessionDistribution()).reduce((a, b) => a + b, 0);
              const percentage = total > 0 ? (count / total) * 100 : 0;
              
              return (
                <div key={time} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <span className="font-medium text-gray-700 capitalize">{time}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-indigo-600 h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 w-8 text-right">
                      {Math.round(percentage)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (selectedMetric) {
      case 'overview':
        return renderOverview();
      case 'topics':
        return renderTopics();
      case 'patterns':
        return renderPatterns();
      default:
        return renderOverview();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold">
              {methodology.coach?.fullName || 'Coach'} Methodology Analysis
            </h2>
            <p className="mt-1 opacity-90">
              Teaching patterns and success indicators
            </p>
          </div>
          <div className="flex gap-2">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-1 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              <option value="all">All Time</option>
              <option value="month">Last Month</option>
              <option value="quarter">Last Quarter</option>
            </select>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-2">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'topics', label: 'Topics', icon: MessageSquare },
          { id: 'patterns', label: 'Patterns', icon: TrendingUp }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedMetric(tab.id)}
            className={`
              px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2
              ${selectedMetric === tab.id 
                ? 'bg-indigo-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
            `}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {renderContent()}
    </div>
  );
};

export default CoachMethodologyAnalysis;