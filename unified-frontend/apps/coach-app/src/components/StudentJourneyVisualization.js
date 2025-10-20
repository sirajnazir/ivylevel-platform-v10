import React, { useState, useEffect } from 'react';
import knowledgeBaseService from '../services/knowledgeBaseService';
import {
  Calendar,
  Clock,
  Video,
  FileText,
  Brain,
  Target,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  User,
  BookOpen,
  Award,
  Activity,
  BarChart3,
  Briefcase,
  FileCheck
} from 'lucide-react';

const StudentJourneyVisualization = ({ studentName, onSessionSelect }) => {
  const [journey, setJourney] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [viewMode, setViewMode] = useState('timeline'); // timeline, grid, analytics

  useEffect(() => {
    if (studentName) {
      loadStudentJourney();
    }
  }, [studentName]);

  const loadStudentJourney = async () => {
    setLoading(true);
    try {
      const journeyData = await knowledgeBaseService.getStudentJourney(studentName);
      setJourney(journeyData);
      
      // Select current week by default
      if (journeyData?.progress?.currentWeek) {
        setSelectedWeek(journeyData.progress.currentWeek);
      }
    } catch (error) {
      console.error('Error loading student journey:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWeekStatus = (weekNumber) => {
    if (!journey) return 'future';
    
    const weekRecording = journey.recordings.find(r => r.week === weekNumber);
    if (!weekRecording) return 'future';
    
    const hasAllFiles = weekRecording.hasVideo && weekRecording.hasTranscript && weekRecording.hasInsights;
    if (hasAllFiles) return 'complete';
    if (weekRecording.hasVideo || weekRecording.hasTranscript) return 'partial';
    return 'scheduled';
  };

  const getPhaseForWeek = (weekNumber) => {
    if (weekNumber <= 4) return { name: 'Foundation', color: 'blue' };
    if (weekNumber <= 12) return { name: 'Development', color: 'purple' };
    if (weekNumber <= 20) return { name: 'Refinement', color: 'indigo' };
    return { name: 'Mastery', color: 'green' };
  };

  const renderTimelineView = () => {
    const totalWeeks = 24; // Assuming 24-week program
    const phases = [
      { name: 'Foundation', start: 1, end: 4, color: 'blue' },
      { name: 'Development', start: 5, end: 12, color: 'purple' },
      { name: 'Refinement', start: 13, end: 20, color: 'indigo' },
      { name: 'Mastery', start: 21, end: 24, color: 'green' }
    ];

    return (
      <div className="space-y-6">
        {/* Progress Overview */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Journey Progress</h3>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Week</span>
              <span className="text-2xl font-bold text-indigo-600">
                {journey?.progress?.currentWeek || 1}
              </span>
              <span className="text-sm text-gray-600">of {totalWeeks}</span>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="relative">
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${((journey?.progress?.currentWeek || 0) / totalWeeks) * 100}%` }}
              />
            </div>
            
            {/* Phase Markers */}
            <div className="absolute inset-0 flex">
              {phases.map((phase, idx) => (
                <div 
                  key={idx} 
                  className="flex-1 text-center"
                  style={{ width: `${((phase.end - phase.start + 1) / totalWeeks) * 100}%` }}
                >
                  <div className="text-xs text-gray-600 mt-2">{phase.name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Session Timeline</h3>
          
          <div className="relative">
            {/* Vertical Line */}
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200" />
            
            {/* Sessions */}
            <div className="space-y-6">
              {Array.from({ length: totalWeeks }, (_, i) => i + 1).map((weekNum) => {
                const recording = journey?.recordings.find(r => r.week === weekNum);
                const phase = getPhaseForWeek(weekNum);
                const status = getWeekStatus(weekNum);
                const isSelected = selectedWeek === weekNum;
                
                return (
                  <div 
                    key={weekNum}
                    className={`relative flex gap-4 cursor-pointer transition-all ${
                      isSelected ? 'transform scale-105' : ''
                    }`}
                    onClick={() => {
                      setSelectedWeek(weekNum);
                      if (recording && onSessionSelect) {
                        onSessionSelect(recording);
                      }
                    }}
                  >
                    {/* Week Node */}
                    <div className={`
                      relative z-10 w-16 h-16 rounded-full flex items-center justify-center font-bold
                      ${status === 'complete' ? `bg-${phase.color}-100 text-${phase.color}-700 ring-4 ring-${phase.color}-200` :
                        status === 'partial' ? 'bg-yellow-100 text-yellow-700 ring-4 ring-yellow-200' :
                        status === 'scheduled' ? 'bg-gray-100 text-gray-700 ring-4 ring-gray-200' :
                        'bg-gray-50 text-gray-400'
                      }
                      ${isSelected ? 'ring-offset-2' : ''}
                    `}>
                      {weekNum}
                    </div>
                    
                    {/* Content */}
                    <div className={`
                      flex-1 bg-gray-50 rounded-lg p-4 
                      ${isSelected ? 'ring-2 ring-indigo-500 bg-indigo-50' : ''}
                      ${status === 'future' ? 'opacity-50' : ''}
                    `}>
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            Week {weekNum}: {recording?.topic || `${phase.name} Phase`}
                          </h4>
                          {recording && (
                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {new Date(recording.date).toLocaleDateString()}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {recording.duration} min
                              </span>
                            </div>
                          )}
                          {recording?.insights?.keyTopics && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {recording.insights.keyTopics.slice(0, 3).map((topic, idx) => (
                                <span key={idx} className="text-xs bg-white px-2 py-1 rounded-full text-gray-600">
                                  {topic}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        {/* File Indicators */}
                        {recording && (
                          <div className="flex gap-1">
                            {recording.hasVideo && <Video className="w-4 h-4 text-blue-500" />}
                            {recording.hasTranscript && <FileText className="w-4 h-4 text-green-500" />}
                            {recording.hasInsights && <Brain className="w-4 h-4 text-purple-500" />}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderGridView = () => {
    const phases = [
      { name: 'Foundation', weeks: [1, 2, 3, 4], color: 'blue' },
      { name: 'Development', weeks: [5, 6, 7, 8, 9, 10, 11, 12], color: 'purple' },
      { name: 'Refinement', weeks: [13, 14, 15, 16, 17, 18, 19, 20], color: 'indigo' },
      { name: 'Mastery', weeks: [21, 22, 23, 24], color: 'green' }
    ];

    return (
      <div className="space-y-8">
        {phases.map((phase, phaseIdx) => (
          <div key={phaseIdx} className="bg-white rounded-lg shadow-sm p-6">
            <h3 className={`text-lg font-semibold text-${phase.color}-700 mb-4`}>
              {phase.name} Phase
            </h3>
            <div className="grid grid-cols-4 gap-4">
              {phase.weeks.map((weekNum) => {
                const recording = journey?.recordings.find(r => r.week === weekNum);
                const status = getWeekStatus(weekNum);
                const isSelected = selectedWeek === weekNum;
                
                return (
                  <div
                    key={weekNum}
                    onClick={() => {
                      setSelectedWeek(weekNum);
                      if (recording && onSessionSelect) {
                        onSessionSelect(recording);
                      }
                    }}
                    className={`
                      relative p-4 rounded-lg border-2 cursor-pointer transition-all
                      ${status === 'complete' ? `border-${phase.color}-300 bg-${phase.color}-50` :
                        status === 'partial' ? 'border-yellow-300 bg-yellow-50' :
                        status === 'scheduled' ? 'border-gray-300 bg-gray-50' :
                        'border-gray-200 bg-white'
                      }
                      ${isSelected ? 'ring-2 ring-indigo-500 transform scale-105' : ''}
                      hover:shadow-md
                    `}
                  >
                    <div className="text-center">
                      <div className={`text-2xl font-bold mb-2 ${
                        status === 'complete' ? `text-${phase.color}-700` :
                        status === 'partial' ? 'text-yellow-700' :
                        status === 'scheduled' ? 'text-gray-700' :
                        'text-gray-400'
                      }`}>
                        W{weekNum}
                      </div>
                      
                      {recording && (
                        <>
                          <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                            {recording.topic}
                          </p>
                          <div className="flex justify-center gap-1">
                            {recording.hasVideo && <Video className="w-3 h-3 text-blue-500" />}
                            {recording.hasTranscript && <FileText className="w-3 h-3 text-green-500" />}
                            {recording.hasInsights && <Brain className="w-3 h-3 text-purple-500" />}
                          </div>
                        </>
                      )}
                      
                      {status === 'complete' && (
                        <CheckCircle className="w-5 h-5 text-green-600 mx-auto mt-2" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderAnalyticsView = () => {
    const stats = journey?.statistics || {};
    const progress = journey?.progress || {};
    
    return (
      <div className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <Target className="w-8 h-8 text-indigo-600" />
              <span className="text-2xl font-bold text-gray-900">
                {progress.completionRate ? `${Math.round(progress.completionRate * 100)}%` : '0%'}
              </span>
            </div>
            <p className="text-sm text-gray-600">Completion Rate</p>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-8 h-8 text-green-600" />
              <span className="text-2xl font-bold text-gray-900">
                {stats.totalSessions || 0}
              </span>
            </div>
            <p className="text-sm text-gray-600">Total Sessions</p>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-8 h-8 text-blue-600" />
              <span className="text-2xl font-bold text-gray-900">
                {Math.round((stats.totalDuration || 0) / 60)}h
              </span>
            </div>
            <p className="text-sm text-gray-600">Total Time</p>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <Award className="w-8 h-8 text-purple-600" />
              <span className="text-2xl font-bold text-gray-900">
                {stats.weeksCovered || 0}
              </span>
            </div>
            <p className="text-sm text-gray-600">Weeks Covered</p>
          </div>
        </div>

        {/* Content Availability */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Content Availability</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-gray-700">
                <Video className="w-5 h-5 text-blue-500" />
                Video Recordings
              </span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${(stats.sessionsWithVideo / stats.totalSessions) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {stats.sessionsWithVideo}/{stats.totalSessions}
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-gray-700">
                <FileText className="w-5 h-5 text-green-500" />
                Transcripts
              </span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${(stats.sessionsWithTranscript / stats.totalSessions) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {stats.sessionsWithTranscript}/{stats.totalSessions}
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-gray-700">
                <Brain className="w-5 h-5 text-purple-500" />
                AI Insights
              </span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-purple-500 h-2 rounded-full"
                    style={{ width: '100%' }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {stats.totalSessions}/{stats.totalSessions}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Auxiliary Documents */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <Briefcase className="w-5 h-5 text-indigo-600" />
              <h3 className="text-lg font-semibold text-gray-900">Game Plans</h3>
            </div>
            <div className="text-center py-8">
              <div className="text-4xl font-bold text-indigo-600">
                {journey?.gamePlans?.length || 0}
              </div>
              <p className="text-sm text-gray-600 mt-2">Strategic Documents</p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileCheck className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">Execution Docs</h3>
            </div>
            <div className="text-center py-8">
              <div className="text-4xl font-bold text-green-600">
                {journey?.executionDocs?.length || 0}
              </div>
              <p className="text-sm text-gray-600 mt-2">Progress Tracking</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!journey) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">No journey data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold">
              {journey.student?.fullName || studentName}'s Learning Journey
            </h2>
            <p className="mt-1 opacity-90">
              {journey.student?.programType || 'Program'} • Started {
                journey.student?.startDate ? 
                new Date(journey.student.startDate).toLocaleDateString() : 
                'Recently'
              }
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">
              {journey.progress?.currentWeek || 0}
            </div>
            <div className="text-sm opacity-90">Current Week</div>
          </div>
        </div>
      </div>

      {/* View Mode Selector */}
      <div className="flex gap-2">
        {['timeline', 'grid', 'analytics'].map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`
              px-4 py-2 rounded-lg font-medium transition-colors capitalize
              ${viewMode === mode 
                ? 'bg-indigo-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
            `}
          >
            {mode === 'timeline' && <BarChart3 className="w-4 h-4 inline mr-2" />}
            {mode === 'grid' && <BookOpen className="w-4 h-4 inline mr-2" />}
            {mode === 'analytics' && <TrendingUp className="w-4 h-4 inline mr-2" />}
            {mode} View
          </button>
        ))}
      </div>

      {/* Content */}
      {viewMode === 'timeline' && renderTimelineView()}
      {viewMode === 'grid' && renderGridView()}
      {viewMode === 'analytics' && renderAnalyticsView()}
    </div>
  );
};

export default StudentJourneyVisualization;