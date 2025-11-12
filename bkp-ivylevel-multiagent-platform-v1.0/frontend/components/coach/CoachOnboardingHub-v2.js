// src/components/CoachOnboardingHub-v2.js
// Enhanced YouTube-style coach onboarding hub

import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  User,
  Calendar,
  Target,
  BookOpen,
  Award,
  ChevronDown,
  Filter,
  Search,
  Grid,
  List,
  Download,
  Share2,
  Bookmark,
  ThumbsUp,
  Eye,
  Star,
  TrendingUp,
  FileText,
  MessageSquare,
  BarChart3
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import VideoPlayer from './VideoPlayer';

const CoachOnboardingHub = ({ studentName, coachName }) => {
  const { currentUser } = useAuth();
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [criticalSessions, setCriticalSessions] = useState({
    gamePlan: [],
    '168Hour': [],
    executionExamples: [],
    parentSessions: [],
    milestones: []
  });
  const [viewedSessions, setViewedSessions] = useState(new Set());
  const [checklist, setChecklist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // grid or list
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showTranscript, setShowTranscript] = useState(false);
  const [relatedVideos, setRelatedVideos] = useState([]);

  useEffect(() => {
    loadOnboardingData();
  }, [studentName, coachName]);

  const loadOnboardingData = async () => {
    try {
      setLoading(true);
      await loadCriticalSessions();
      await loadViewHistory();
    } catch (error) {
      console.error('Error loading onboarding data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCriticalSessions = async () => {
    const sessionsQuery = query(
      collection(db, 'coaching_sessions'),
      where('participants.studentNormalized', '==', studentName.toLowerCase())
    );
    const snapshot = await getDocs(sessionsQuery);

    const sessions = {
      gamePlan: [],
      '168Hour': [],
      executionExamples: [],
      parentSessions: [],
      milestones: []
    };

    snapshot.forEach(doc => {
      const session = { id: doc.id, ...doc.data() };
      const type = session.criticalSessionType;

      // Add thumbnail and metadata
      session.thumbnail = generateThumbnail(session);
      session.viewCount = Math.floor(Math.random() * 50) + 10;
      session.rating = 4 + Math.random();
      
      if (type === 'GAME_PLAN') sessions.gamePlan.push(session);
      else if (type === '168_HOUR') sessions['168Hour'].push(session);
      else if (type === 'EXECUTION' && sessions.executionExamples.length < 6) {
        sessions.executionExamples.push(session);
      }
      else if (type === 'PARENT_SESSION') sessions.parentSessions.push(session);
      else if (type === 'MILESTONE') sessions.milestones.push(session);
    });

    setCriticalSessions(sessions);
    
    // Set the first game plan as selected by default
    if (sessions.gamePlan.length > 0) {
      setSelectedVideo(sessions.gamePlan[0]);
      loadRelatedVideos(sessions.gamePlan[0]);
    }
  };

  const loadViewHistory = async () => {
    const viewsQuery = query(
      collection(db, 'session_views'),
      where('coach', '==', coachName)
    );
    const snapshot = await getDocs(viewsQuery);
    const viewed = new Set();
    snapshot.forEach(doc => {
      viewed.add(doc.data().sessionId);
    });
    setViewedSessions(viewed);
  };

  const loadRelatedVideos = (video) => {
    // Load videos from the same coach or similar type
    const allVideos = [
      ...criticalSessions.gamePlan,
      ...criticalSessions['168Hour'],
      ...criticalSessions.executionExamples
    ].filter(v => v.id !== video.id);
    
    const related = allVideos
      .filter(v => 
        v.participants?.coach === video.participants?.coach ||
        v.criticalSessionType === video.criticalSessionType
      )
      .slice(0, 5);
    
    setRelatedVideos(related);
  };

  const generateThumbnail = (session) => {
    const colors = ['#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    return {
      color,
      week: session.sessionInfo?.week || '?',
      type: session.criticalSessionType?.replace(/_/g, ' ') || 'Session'
    };
  };

  const handleVideoSelect = async (video) => {
    setSelectedVideo(video);
    loadRelatedVideos(video);
    
    // Mark as viewed
    if (!viewedSessions.has(video.id)) {
      await addDoc(collection(db, 'session_views'), {
        sessionId: video.id,
        coach: coachName,
        viewedAt: serverTimestamp(),
        context: 'onboarding'
      });
      setViewedSessions(new Set([...viewedSessions, video.id]));
    }
  };

  const handleVideoComplete = async () => {
    // Update checklist based on video type
    if (selectedVideo.criticalSessionType === 'GAME_PLAN') {
      updateChecklistItem('game-plan', true);
    } else if (selectedVideo.criticalSessionType === '168_HOUR') {
      updateChecklistItem('168-hour', true);
    }
  };

  const updateChecklistItem = async (itemId, completed) => {
    // Update checklist logic here
    console.log('Updating checklist:', itemId, completed);
  };

  const formatDuration = (session) => {
    const durations = {
      'GAME_PLAN': '45-60 min',
      '168_HOUR': '60-90 min',
      'EXECUTION': '30-45 min',
      'PARENT_SESSION': '20-30 min',
      'MILESTONE': '15-20 min'
    };
    return durations[session.criticalSessionType] || '30 min';
  };

  const formatDate = (date) => {
    if (!date) return 'No date';
    const d = date.seconds ? new Date(date.seconds * 1000) : new Date(date);
    const now = new Date();
    const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  const VideoCard = ({ video, size = 'medium' }) => {
    const isViewed = viewedSessions.has(video.id);
    const isSelected = selectedVideo?.id === video.id;
    
    return (
      <div 
        className={`cursor-pointer group ${size === 'small' ? 'flex gap-3' : ''} ${
          isSelected ? 'ring-2 ring-blue-500 rounded-lg' : ''
        }`}
        onClick={() => handleVideoSelect(video)}
      >
        {/* Thumbnail */}
        <div className={`relative ${
          size === 'small' ? 'w-40 h-24' : 'w-full aspect-video'
        } rounded-lg overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900`}>
          <div 
            className="absolute inset-0 flex items-center justify-center"
            style={{ backgroundColor: video.thumbnail.color + '20' }}
          >
            <div className="text-center">
              <div className={`font-bold ${size === 'small' ? 'text-2xl' : 'text-4xl'} text-white`}>
                Week {video.thumbnail.week}
              </div>
              <div className={`${size === 'small' ? 'text-xs' : 'text-sm'} text-white/80 mt-1`}>
                {video.thumbnail.type}
              </div>
            </div>
          </div>
          
          {/* Play Icon Overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center">
            <Play className={`${
              size === 'small' ? 'w-8 h-8' : 'w-12 h-12'
            } text-white opacity-0 group-hover:opacity-100 transition-opacity fill-white`} />
          </div>
          
          {/* Duration Badge */}
          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
            {formatDuration(video)}
          </div>
          
          {/* Viewed Indicator */}
          {isViewed && (
            <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Viewed
            </div>
          )}
        </div>
        
        {/* Video Info */}
        <div className={size === 'small' ? 'flex-1' : 'mt-3'}>
          <h3 className={`font-semibold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors ${
            size === 'small' ? 'text-sm' : 'text-base'
          }`}>
            {video.title || `${video.participants?.coach} & ${video.participants?.student}`}
          </h3>
          
          <div className={`text-gray-600 mt-1 ${size === 'small' ? 'text-xs' : 'text-sm'}`}>
            <div className="flex items-center gap-2">
              <span>{video.participants?.coach}</span>
              <span>•</span>
              <span>{video.viewCount} views</span>
              <span>•</span>
              <span>{formatDate(video.sessionInfo?.date)}</span>
            </div>
            
            {size !== 'small' && (
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  <span className="text-sm">{video.rating.toFixed(1)}</span>
                </div>
                {video.sessionInfo?.week && (
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                    Week {video.sessionInfo.week}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading your personalized training content...</p>
        </div>
      </div>
    );
  }

  const allVideos = [
    ...criticalSessions.gamePlan,
    ...criticalSessions['168Hour'],
    ...criticalSessions.executionExamples,
    ...criticalSessions.parentSessions,
    ...criticalSessions.milestones
  ];

  const filteredVideos = allVideos.filter(video => {
    if (filterType !== 'all' && video.criticalSessionType !== filterType) return false;
    if (searchQuery && !JSON.stringify(video).toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="max-w-screen-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Coach Training Hub</h1>
        <div className="flex items-center gap-6 text-gray-600">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4" />
            <span>Coach: {coachName}</span>
          </div>
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            <span>Student: {studentName}</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            <span>{viewedSessions.size} of {allVideos.length} videos watched</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Video Player Section */}
        <div className="lg:col-span-2 space-y-6">
          {selectedVideo ? (
            <>
              {/* Video Player */}
              <div className="bg-black rounded-lg overflow-hidden">
                <VideoPlayer 
                  session={selectedVideo} 
                  onComplete={handleVideoComplete}
                />
              </div>

              {/* Video Info */}
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                  {selectedVideo.title || `${selectedVideo.participants?.coach} & ${selectedVideo.participants?.student} - Week ${selectedVideo.sessionInfo?.week}`}
                </h2>
                
                <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                  <span>{selectedVideo.viewCount} views</span>
                  <span>•</span>
                  <span>{formatDate(selectedVideo.sessionInfo?.date)}</span>
                  <div className="flex items-center gap-1 ml-auto">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span>{selectedVideo.rating.toFixed(1)}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pb-4 border-b">
                  <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    <ThumbsUp className="w-4 h-4" />
                    Like
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                    <Share2 className="w-4 h-4" />
                    Share
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                    <Bookmark className="w-4 h-4" />
                    Save
                  </button>
                </div>

                {/* Description */}
                <div className="mt-4">
                  <h3 className="font-semibold text-gray-900 mb-2">About this session</h3>
                  <p className="text-gray-600">
                    {selectedVideo.description || 'This coaching session covers important topics for student success.'}
                  </p>
                  
                  {/* Key Topics */}
                  <div className="mt-4">
                    <h4 className="font-medium text-gray-900 mb-2">Key Topics Covered:</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedVideo.subjects?.map((subject, idx) => (
                        <span key={idx} className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">
                          {subject}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Session Details */}
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-gray-500">Session Type</span>
                      <p className="font-medium">{selectedVideo.criticalSessionType?.replace(/_/g, ' ')}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Coach</span>
                      <p className="font-medium">{selectedVideo.participants?.coach}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Week</span>
                      <p className="font-medium">{selectedVideo.sessionInfo?.week || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Duration</span>
                      <p className="font-medium">{formatDuration(selectedVideo)}</p>
                    </div>
                  </div>
                </div>

                {/* Transcript Toggle */}
                <button
                  onClick={() => setShowTranscript(!showTranscript)}
                  className="mt-4 flex items-center gap-2 text-blue-600 hover:text-blue-700"
                >
                  <FileText className="w-4 h-4" />
                  {showTranscript ? 'Hide' : 'Show'} Transcript
                  <ChevronDown className={`w-4 h-4 transition-transform ${showTranscript ? 'rotate-180' : ''}`} />
                </button>

                {showTranscript && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <p className="text-gray-600 italic">
                      Transcript will be available here once processed...
                    </p>
                  </div>
                )}
              </div>

              {/* Comments Section */}
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Discussion & Notes
                </h3>
                <textarea
                  placeholder="Add your notes or questions about this session..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                />
                <button className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Add Note
                </button>
              </div>
            </>
          ) : (
            <div className="bg-gray-100 rounded-lg p-12 text-center">
              <Play className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Select a video to start watching</p>
            </div>
          )}
        </div>

        {/* Sidebar - Video List */}
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Training Videos</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search videos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1 rounded-full text-sm ${
                  filterType === 'all' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterType('GAME_PLAN')}
                className={`px-3 py-1 rounded-full text-sm ${
                  filterType === 'GAME_PLAN' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Game Plan
              </button>
              <button
                onClick={() => setFilterType('168_HOUR')}
                className={`px-3 py-1 rounded-full text-sm ${
                  filterType === '168_HOUR' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                168-Hour
              </button>
              <button
                onClick={() => setFilterType('EXECUTION')}
                className={`px-3 py-1 rounded-full text-sm ${
                  filterType === 'EXECUTION' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Execution
              </button>
            </div>
          </div>

          {/* Video List */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-4 border-b">
              <h4 className="font-medium text-gray-900">
                {filterType === 'all' ? 'All Videos' : filterType.replace(/_/g, ' ')} 
                ({filteredVideos.length})
              </h4>
            </div>
            <div className={`p-4 space-y-3 max-h-[600px] overflow-y-auto ${
              viewMode === 'grid' ? 'grid grid-cols-1 gap-4' : ''
            }`}>
              {filteredVideos.map(video => (
                <VideoCard 
                  key={video.id} 
                  video={video} 
                  size="small"
                />
              ))}
            </div>
          </div>

          {/* Progress Stats */}
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Your Progress
            </h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Overall Completion</span>
                  <span className="font-medium">{Math.round((viewedSessions.size / allVideos.length) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(viewedSessions.size / allVideos.length) * 100}%` }}
                  />
                </div>
              </div>
              
              <div className="pt-2 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Videos Watched</span>
                  <span className="font-medium">{viewedSessions.size}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Total Available</span>
                  <span className="font-medium">{allVideos.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Time Invested</span>
                  <span className="font-medium">~{viewedSessions.size * 45} min</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Related Videos Section */}
      {relatedVideos.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Related Training Videos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {relatedVideos.map(video => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CoachOnboardingHub;