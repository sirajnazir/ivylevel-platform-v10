import React, { useState, useEffect, useCallback } from 'react';
import { newCoachesData, trainingPatterns } from '../data/newCoachesData';
import knowledgeBaseService, { KB_CONFIG } from '../services/knowledgeBaseService';
import StudentJourneyVisualization from './StudentJourneyVisualization';
import CoachMethodologyAnalysis from './CoachMethodologyAnalysis';
import AIInsightsViewer from './AIInsightsViewer';
import AuxiliaryDocumentsViewer from './AuxiliaryDocumentsViewer';
import GoogleDriveVideoPlayer, { VideoPlayerModal } from './GoogleDriveVideoPlayer';
import { 
  ChevronDown, 
  ChevronRight, 
  Video, 
  FileText, 
  Mic, 
  MessageSquare,
  Calendar,
  Clock,
  User,
  Target,
  TrendingUp,
  BookOpen,
  CheckCircle,
  Circle,
  Search,
  Filter,
  Download,
  Share2,
  Brain,
  BarChart3,
  Users,
  Briefcase,
  FileCheck,
  AlertCircle,
  X
} from 'lucide-react';

const EnhancedSmartCoachOnboarding = () => {
  const [selectedCoach, setSelectedCoach] = useState('kelvin');
  const [studentJourney, setStudentJourney] = useState(null);
  const [allRecordings, setAllRecordings] = useState([]);
  const [filteredRecordings, setFilteredRecordings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedSessions, setExpandedSessions] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    category: 'all',
    hasVideo: false,
    hasTranscript: false,
    hasInsights: false,
    weekRange: [1, 24]
  });
  const [selectedRecording, setSelectedRecording] = useState(null);
  const [coachMethodology, setCoachMethodology] = useState(null);
  const [videoModalRecording, setVideoModalRecording] = useState(null);

  // Load initial data
  useEffect(() => {
    loadCoachData();
  }, [selectedCoach]);

  const loadCoachData = async () => {
    setLoading(true);
    try {
      // Get all recordings for the selected coach's students
      const coach = newCoachesData[selectedCoach];
      if (!coach) return;

      // Load student journey for primary student
      const primaryStudent = coach.expertise.find(e => e.focus)?.students[0];
      if (primaryStudent) {
        const journey = await knowledgeBaseService.getStudentJourney(primaryStudent);
        setStudentJourney(journey);
      }

      // Load coach methodology
      const methodology = await knowledgeBaseService.getCoachMethodology(coach.name);
      setCoachMethodology(methodology);

      // Load all relevant recordings
      const recordings = await knowledgeBaseService.getAllRecordings({
        coach: coach.name,
        limit: 50
      });
      setAllRecordings(recordings);
      setFilteredRecordings(recordings);
    } catch (error) {
      console.error('Error loading coach data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Apply filters and search
  useEffect(() => {
    let filtered = [...allRecordings];

    // Apply search
    if (searchQuery) {
      filtered = filtered.filter(r => 
        r.topic?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.student?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.coach?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply category filter
    if (filters.category !== 'all') {
      filtered = filtered.filter(r => r.category === filters.category);
    }

    // Apply file availability filters
    if (filters.hasVideo) {
      filtered = filtered.filter(r => r.hasVideo);
    }
    if (filters.hasTranscript) {
      filtered = filtered.filter(r => r.hasTranscript);
    }
    if (filters.hasInsights) {
      filtered = filtered.filter(r => r.hasInsights);
    }

    // Apply week range filter
    filtered = filtered.filter(r => {
      if (!r.week) return true;
      return r.week >= filters.weekRange[0] && r.week <= filters.weekRange[1];
    });

    setFilteredRecordings(filtered);
  }, [searchQuery, filters, allRecordings]);

  const toggleSessionExpanded = (sessionId) => {
    const newExpanded = new Set(expandedSessions);
    if (newExpanded.has(sessionId)) {
      newExpanded.delete(sessionId);
    } else {
      newExpanded.add(sessionId);
    }
    setExpandedSessions(newExpanded);
  };

  const loadRecordingDetails = async (recording) => {
    setLoading(true);
    try {
      const fullRecording = await knowledgeBaseService.getRecording(recording.uuid);
      setSelectedRecording(fullRecording);
    } catch (error) {
      console.error('Error loading recording details:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderOverviewTab = () => {
    const coach = newCoachesData[selectedCoach];
    if (!coach) return null;

    return (
      <div className="space-y-6">
        {/* Coach Profile Card */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">{coach.name}</h3>
              <p className="text-gray-600 mt-1">{coach.role}</p>
              <div className="flex items-center gap-4 mt-4">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
                  <Target className="w-4 h-4 mr-1" />
                  {coach.onboardingStage}
                </span>
                <span className="text-sm text-gray-500">
                  Joined {new Date(coach.startDate).toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-indigo-600">
                {coachMethodology?.totalSessions || 0}
              </div>
              <div className="text-sm text-gray-600">Total Sessions</div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="bg-white/70 rounded-lg p-3">
              <div className="text-2xl font-bold text-gray-900">
                {coachMethodology?.students?.length || 0}
              </div>
              <div className="text-xs text-gray-600">Students</div>
            </div>
            <div className="bg-white/70 rounded-lg p-3">
              <div className="text-2xl font-bold text-gray-900">
                {allRecordings.filter(r => r.hasVideo).length}
              </div>
              <div className="text-xs text-gray-600">Videos</div>
            </div>
            <div className="bg-white/70 rounded-lg p-3">
              <div className="text-2xl font-bold text-gray-900">
                {allRecordings.filter(r => r.hasTranscript).length}
              </div>
              <div className="text-xs text-gray-600">Transcripts</div>
            </div>
            <div className="bg-white/70 rounded-lg p-3">
              <div className="text-2xl font-bold text-gray-900">
                {allRecordings.filter(r => r.hasInsights).length}
              </div>
              <div className="text-xs text-gray-600">AI Insights</div>
            </div>
          </div>
        </div>

        {/* Expertise Areas */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Expertise Areas</h4>
          <div className="space-y-4">
            {coach.expertise.map((area, idx) => (
              <div key={idx} className="border-l-4 border-indigo-500 pl-4">
                <div className="flex items-center justify-between">
                  <h5 className="font-medium text-gray-900">{area.area}</h5>
                  {area.focus && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      Primary Focus
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Working with: {area.students.join(', ')}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Common Topics */}
        {coachMethodology?.commonTopics && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Common Topics</h4>
            <div className="flex flex-wrap gap-2">
              {coachMethodology.commonTopics.map((topic, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                >
                  {topic.topic} ({topic.count})
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSessionsTab = () => {
    return (
      <div className="space-y-6">
        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search sessions by topic, student, or coach..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters
            </button>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                checked={filters.hasVideo}
                onChange={(e) => setFilters({...filters, hasVideo: e.target.checked})}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="ml-2 text-sm text-gray-700">Has Video</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                checked={filters.hasTranscript}
                onChange={(e) => setFilters({...filters, hasTranscript: e.target.checked})}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="ml-2 text-sm text-gray-700">Has Transcript</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                checked={filters.hasInsights}
                onChange={(e) => setFilters({...filters, hasInsights: e.target.checked})}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="ml-2 text-sm text-gray-700">Has AI Insights</span>
            </label>
          </div>
        </div>

        {/* Sessions List */}
        <div className="space-y-4">
          {filteredRecordings.map((recording) => (
            <RecordingCard
              key={recording.uuid}
              recording={recording}
              isExpanded={expandedSessions.has(recording.uuid)}
              onToggleExpand={() => toggleSessionExpanded(recording.uuid)}
              onViewDetails={() => loadRecordingDetails(recording)}
              onWatchVideo={(rec) => setVideoModalRecording(rec)}
            />
          ))}
        </div>

        {filteredRecordings.length === 0 && (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No sessions found matching your criteria</p>
          </div>
        )}
      </div>
    );
  };

  const renderStudentJourneyTab = () => {
    const coach = newCoachesData[selectedCoach];
    const primaryStudent = coach?.expertise.find(e => e.focus)?.students[0];
    
    if (!primaryStudent) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-600">No primary student selected</p>
        </div>
      );
    }

    return (
      <StudentJourneyVisualization 
        studentName={primaryStudent}
        onSessionSelect={(recording) => loadRecordingDetails(recording)}
      />
    );
  };

  const renderStudentJourneyTabOld = () => {
    if (!studentJourney) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-600">Select a student to view their journey</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Student Profile */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">
                {studentJourney.student?.fullName || 'Student Journey'}
              </h3>
              <p className="text-gray-600 mt-1">
                {studentJourney.student?.programType || 'Program Type'}
              </p>
              <div className="flex items-center gap-4 mt-4">
                <span className="text-sm text-gray-600">
                  Week {studentJourney.progress?.currentWeek || 0} of 24
                </span>
                <div className="flex-1 max-w-xs">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${((studentJourney.progress?.currentWeek || 0) / 24) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-indigo-600">
                {studentJourney.statistics?.totalSessions || 0}
              </div>
              <div className="text-sm text-gray-600">Total Sessions</div>
            </div>
          </div>
        </div>

        {/* Journey Timeline */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Session Timeline</h4>
          <div className="space-y-4">
            {studentJourney.recordings?.map((recording, idx) => (
              <div key={recording.uuid} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    recording.hasInsights ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {recording.week || idx + 1}
                  </div>
                  {idx < studentJourney.recordings.length - 1 && (
                    <div className="w-0.5 h-16 bg-gray-200 mt-2" />
                  )}
                </div>
                <div className="flex-1 pb-8">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h5 className="font-medium text-gray-900">{recording.topic}</h5>
                        <p className="text-sm text-gray-600 mt-1">
                          {new Date(recording.date).toLocaleDateString()} • {recording.duration} minutes
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {recording.hasVideo && <Video className="w-4 h-4 text-gray-400" />}
                        {recording.hasTranscript && <FileText className="w-4 h-4 text-gray-400" />}
                        {recording.hasInsights && <Brain className="w-4 h-4 text-indigo-600" />}
                      </div>
                    </div>
                    {recording.insights?.keyTopics && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {recording.insights.keyTopics.slice(0, 3).map((topic, topicIdx) => (
                          <span key={topicIdx} className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded">
                            {topic}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Auxiliary Documents */}
        <div className="grid grid-cols-2 gap-4">
          {/* Game Plans */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-indigo-600" />
              Game Plans
            </h4>
            {studentJourney.gamePlans?.length > 0 ? (
              <div className="space-y-2">
                {studentJourney.gamePlans.map((plan, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{plan.fileName}</p>
                      <p className="text-xs text-gray-600">
                        {new Date(plan.createdDate).toLocaleDateString()}
                      </p>
                    </div>
                    <button className="text-indigo-600 hover:text-indigo-700">
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No game plans available</p>
            )}
          </div>

          {/* Execution Documents */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-green-600" />
              Execution Documents
            </h4>
            {studentJourney.executionDocs?.length > 0 ? (
              <div className="space-y-2">
                {studentJourney.executionDocs.map((doc, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{doc.fileName}</p>
                      <p className="text-xs text-gray-600">
                        {new Date(doc.createdDate).toLocaleDateString()}
                      </p>
                    </div>
                    <button className="text-green-600 hover:text-green-700">
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No execution documents available</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderAnalyticsTab = () => {
    return (
      <CoachMethodologyAnalysis 
        methodology={coachMethodology}
        recordings={allRecordings}
      />
    );
  };

  const renderAnalyticsTabOld = () => {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-6">
          {/* Session Distribution */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Session Distribution</h4>
            <div className="space-y-3">
              {Object.entries(coachMethodology?.sessionTypes || {}).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{type}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-indigo-600 h-2 rounded-full"
                        style={{ width: `${(count / allRecordings.length) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* File Availability */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Content Availability</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 flex items-center gap-2">
                  <Video className="w-4 h-4" /> Videos
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {Math.round((allRecordings.filter(r => r.hasVideo).length / allRecordings.length) * 100)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Transcripts
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {Math.round((allRecordings.filter(r => r.hasTranscript).length / allRecordings.length) * 100)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 flex items-center gap-2">
                  <Brain className="w-4 h-4" /> AI Insights
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {Math.round((allRecordings.filter(r => r.hasInsights).length / allRecordings.length) * 100)}%
                </span>
              </div>
            </div>
          </div>

          {/* Student Progress */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Student Progress</h4>
            <div className="space-y-3">
              {coachMethodology?.students?.slice(0, 5).map((student) => (
                <div key={student} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{student}</span>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-gray-900">Active</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Enhanced Smart Coach Onboarding</h1>
        <p className="text-gray-600 mt-2">
          Comprehensive knowledge base integration with AI insights and student journey tracking
        </p>
      </div>

      {/* Coach Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Coach
        </label>
        <select
          value={selectedCoach}
          onChange={(e) => setSelectedCoach(e.target.value)}
          className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        >
          {Object.entries(newCoachesData).map(([key, coach]) => (
            <option key={key} value={key}>
              {coach.name} - {coach.role}
            </option>
          ))}
        </select>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'sessions', label: 'Sessions', icon: Video },
            { id: 'journey', label: 'Student Journey', icon: TrendingUp },
            { id: 'analytics', label: 'Analytics', icon: Brain }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors
                ${activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <div className="min-h-[600px]">
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'sessions' && renderSessionsTab()}
          {activeTab === 'journey' && renderStudentJourneyTab()}
          {activeTab === 'analytics' && renderAnalyticsTab()}
        </div>
      )}

      {/* Recording Details Modal */}
      {selectedRecording && (
        <RecordingDetailsModal
          recording={selectedRecording}
          onClose={() => setSelectedRecording(null)}
        />
      )}

      {/* Video Player Modal */}
      {videoModalRecording && (
        <VideoPlayerModal
          recording={videoModalRecording}
          onClose={() => setVideoModalRecording(null)}
        />
      )}
    </div>
  );
};

// Recording Card Component
const RecordingCard = ({ recording, isExpanded, onToggleExpand, onViewDetails, onWatchVideo }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div 
        className="p-4 cursor-pointer hover:bg-gray-50"
        onClick={onToggleExpand}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-400" />
              )}
              <h4 className="font-medium text-gray-900">{recording.topic}</h4>
              {recording.week && (
                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded">
                  Week {recording.week}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 mt-2 ml-6 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(recording.date).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {recording.duration} min
              </span>
              <span className="flex items-center gap-1">
                <User className="w-4 h-4" />
                {recording.student}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {recording.hasVideo && (
              <span className="p-1.5 bg-blue-100 text-blue-600 rounded">
                <Video className="w-4 h-4" />
              </span>
            )}
            {recording.hasTranscript && (
              <span className="p-1.5 bg-green-100 text-green-600 rounded">
                <FileText className="w-4 h-4" />
              </span>
            )}
            {recording.hasInsights && (
              <span className="p-1.5 bg-purple-100 text-purple-600 rounded">
                <Brain className="w-4 h-4" />
              </span>
            )}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-100 p-4 bg-gray-50">
          {recording.insights && (
            <div className="space-y-3">
              {recording.insights.summary && (
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-1">Summary</h5>
                  <p className="text-sm text-gray-600">{recording.insights.summary}</p>
                </div>
              )}
              {recording.insights.keyTopics && (
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-1">Key Topics</h5>
                  <div className="flex flex-wrap gap-1">
                    {recording.insights.keyTopics.map((topic, idx) => (
                      <span key={idx} className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="flex gap-2 mt-4">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails();
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
            >
              View Details
            </button>
            {recording.hasVideo && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onWatchVideo(recording);
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm flex items-center gap-2"
              >
                <Video className="w-4 h-4" />
                Watch Video
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Recording Details Modal Component
const RecordingDetailsModal = ({ recording, onClose }) => {
  if (!recording) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-900">{recording.topic}</h3>
              <p className="text-gray-600 mt-1">
                {recording.student} • {new Date(recording.date).toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* File Availability */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Available Content</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(recording.files || {}).map(([type, available]) => (
                <div
                  key={type}
                  className={`p-3 rounded-lg border ${
                    available
                      ? 'border-green-200 bg-green-50'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {available ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <Circle className="w-4 h-4 text-gray-400" />
                    )}
                    <span className="text-sm font-medium capitalize">{type}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Insights */}
          {recording.insights && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">AI Analysis & Insights</h4>
              <AIInsightsViewer insights={recording.insights} recording={recording} />
            </div>
          )}

          {/* Auxiliary Documents */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Related Documents</h4>
            <AuxiliaryDocumentsViewer 
              studentName={recording.student}
              recordingDate={recording.date}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedSmartCoachOnboarding;