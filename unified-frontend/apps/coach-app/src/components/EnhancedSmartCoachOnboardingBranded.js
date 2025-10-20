import React, { useState, useEffect } from 'react';
import { newCoachesData } from '../data/newCoachesData';
import knowledgeBaseService from '../services/knowledgeBaseService';
import { 
  CalendarIcon, ClockIcon, UserIcon, VideoIcon, 
  DocumentIcon, ChartIcon, ArrowRightIcon, CloseIcon,
  ServiceIcon, ICON_COLORS 
} from './Icons';

const EnhancedSmartCoachOnboarding = ({ onBack }) => {
  const [selectedCoach, setSelectedCoach] = useState('kelvin');
  const [allRecordings, setAllRecordings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);

  useEffect(() => {
    loadCoachData();
  }, [selectedCoach]);

  const loadCoachData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading data for coach:', selectedCoach);
      
      const coachData = newCoachesData[selectedCoach];
      if (!coachData) {
        throw new Error('Coach data not found');
      }

      // Load recordings from knowledge base
      const recordings = await knowledgeBaseService.getAllRecordings({ 
        coach: coachData.name 
      });
      
      console.log('Loaded recordings:', recordings.length);
      setAllRecordings(recordings);
    } catch (err) {
      console.error('Error loading coach data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVideoClick = (recording) => {
    if (recording.hasVideo && (recording.videoUrl || recording.driveId)) {
      setSelectedVideo(recording);
      setShowVideoPlayer(true);
    }
  };

  const closeVideoPlayer = () => {
    setSelectedVideo(null);
    setShowVideoPlayer(false);
  };

  const getVideoEmbedUrl = (recording) => {
    if (recording.driveId) {
      return `https://drive.google.com/file/d/${recording.driveId}/preview`;
    } else if (recording.videoUrl) {
      // Convert regular Drive URL to embed URL
      const match = recording.videoUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match) {
        return `https://drive.google.com/file/d/${match[1]}/preview`;
      }
    }
    return null;
  };

  const containerStyle = {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '24px',
    backgroundColor: '#f9fafb',
    minHeight: '100vh'
  };

  const headerStyle = {
    marginBottom: '32px',
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  };

  const tabStyle = (isActive) => ({
    padding: '12px 24px',
    border: 'none',
    backgroundColor: isActive ? '#FF4A23' : 'transparent',
    color: isActive ? 'white' : '#6b7280',
    cursor: 'pointer',
    borderRadius: '6px',
    marginRight: '8px',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s ease'
  });

  const selectStyle = {
    padding: '8px 16px',
    border: '1px solid #FFE5DF',
    borderRadius: '6px',
    fontSize: '14px',
    marginBottom: '16px',
    width: '200px',
    outline: 'none',
    transition: 'border-color 0.2s'
  };

  if (error) {
    return (
      <div style={containerStyle}>
        <div style={{ backgroundColor: '#fee2e2', padding: '16px', borderRadius: '8px', color: '#991b1b' }}>
          <h3>Error Loading Data</h3>
          <p>{error}</p>
          <button onClick={loadCoachData} style={{ marginTop: '8px', padding: '8px 16px', backgroundColor: '#FF4A23', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#641432', marginBottom: '8px' }}>
          Enhanced Knowledge Base Platform
        </h1>
        <p style={{ color: '#6b7280', marginBottom: '16px' }}>
          Access 316+ real coaching sessions with enriched data
        </p>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{ marginRight: '8px', fontWeight: '500', color: '#374151' }}>Select Coach:</label>
          <select 
            value={selectedCoach} 
            onChange={(e) => setSelectedCoach(e.target.value)}
            style={selectStyle}
            onFocus={(e) => e.target.style.borderColor = '#FF4A23'}
            onBlur={(e) => e.target.style.borderColor = '#FFE5DF'}
          >
            {Object.entries(newCoachesData).map(([key, coach]) => (
              <option key={key} value={key}>{coach.name}</option>
            ))}
          </select>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px' }}>
          <button 
            onClick={() => setActiveTab('overview')} 
            style={tabStyle(activeTab === 'overview')}
          >
            Overview
          </button>
          <button 
            onClick={() => setActiveTab('sessions')} 
            style={tabStyle(activeTab === 'sessions')}
          >
            Sessions ({allRecordings.length})
          </button>
          <button 
            onClick={() => setActiveTab('journey')} 
            style={tabStyle(activeTab === 'journey')}
          >
            Student Journey
          </button>
          <button 
            onClick={() => setActiveTab('analytics')} 
            style={tabStyle(activeTab === 'analytics')}
          >
            Analytics
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '32px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px' }}>
            <div style={{ fontSize: '1.5rem', color: '#FF4A23' }}>Loading enriched data...</div>
          </div>
        ) : (
          <div>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px', color: '#641432' }}>
                  Coach Profile: {newCoachesData[selectedCoach]?.name}
                </h2>
                <div style={{ backgroundColor: '#FFE5DF', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
                  <h3 style={{ fontWeight: '600', marginBottom: '8px', color: '#641432' }}>Specialization</h3>
                  <p style={{ color: '#374151' }}>{newCoachesData[selectedCoach]?.expertise}</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
                  <div style={{ textAlign: 'center', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #FFE5DF' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#FF4A23' }}>{allRecordings.length}</div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Total Sessions</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #FFE5DF' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#641432' }}>{newCoachesData[selectedCoach]?.totalStudents || 0}</div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Students Coached</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #FFE5DF' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#16a34a' }}>{newCoachesData[selectedCoach]?.successRate || '95%'}</div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Success Rate</div>
                  </div>
                </div>
              </div>
            )}

            {/* Sessions Tab */}
            {activeTab === 'sessions' && (
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px', color: '#641432' }}>
                  Coaching Sessions
                </h2>
                {allRecordings.length === 0 ? (
                  <p style={{ color: '#6b7280' }}>No sessions found for this coach.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {allRecordings.map((recording, index) => (
                      <div key={recording.id || index} style={{ 
                        padding: '16px', 
                        border: '1px solid #FFE5DF', 
                        borderRadius: '8px',
                        backgroundColor: '#f9fafb',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#FF4A23';
                        e.currentTarget.style.backgroundColor = '#FFE5DF';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#FFE5DF';
                        e.currentTarget.style.backgroundColor = '#f9fafb';
                      }}>
                        <h4 style={{ fontWeight: '600', marginBottom: '8px', color: '#641432' }}>{recording.topic}</h4>
                        <div style={{ display: 'flex', gap: '16px', fontSize: '14px', color: '#6b7280', alignItems: 'center' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <CalendarIcon size={16} color={ICON_COLORS.default} />
                            {new Date(recording.date).toLocaleDateString()}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <ClockIcon size={16} color={ICON_COLORS.default} />
                            {recording.duration} mins
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <UserIcon size={16} color={ICON_COLORS.default} />
                            {recording.student}
                          </span>
                          {recording.hasVideo && (
                            <span 
                              onClick={() => handleVideoClick(recording)}
                              style={{ 
                                cursor: 'pointer', 
                                color: '#FF4A23',
                                fontWeight: '600'
                              }}
                              title="Click to watch video"
                            >
                              <VideoIcon size={16} color={ICON_COLORS.primary} style={{ marginRight: '4px' }} />
                              Watch Video
                            </span>
                          )}
                          {recording.hasTranscript && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <DocumentIcon size={16} color={ICON_COLORS.default} />
                              Transcript
                            </span>
                          )}
                          {recording.hasInsights && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <ChartIcon size={16} color={ICON_COLORS.default} />
                              AI Insights
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Journey Tab */}
            {activeTab === 'journey' && (
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px', color: '#641432' }}>
                  Student Journey
                </h2>
                <div style={{ backgroundColor: '#FFE5DF', padding: '24px', borderRadius: '8px', textAlign: 'center' }}>
                  <p style={{ color: '#641432', fontWeight: '600' }}>
                    Visual journey tracking coming soon. This will show the student's progress through their program.
                  </p>
                </div>
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px', color: '#641432' }}>
                  Analytics & Insights
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                  <div style={{ padding: '16px', backgroundColor: '#FFE5DF', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#FF4A23' }}>{allRecordings.length}</div>
                    <div style={{ color: '#641432' }}>Total Sessions</div>
                  </div>
                  <div style={{ padding: '16px', backgroundColor: '#dcfce7', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#16a34a' }}>
                      {allRecordings.filter(r => r.hasVideo).length}
                    </div>
                    <div style={{ color: '#15803d' }}>With Video</div>
                  </div>
                  <div style={{ padding: '16px', backgroundColor: '#fef3c7', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#d97706' }}>
                      {allRecordings.filter(r => r.hasInsights).length}
                    </div>
                    <div style={{ color: '#b45309' }}>AI Insights</div>
                  </div>
                  <div style={{ padding: '16px', backgroundColor: '#F5E8E5', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#641432' }}>
                      {allRecordings.filter(r => r.hasTranscript).length}
                    </div>
                    <div style={{ color: '#641432' }}>Transcripts</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Back Button */}
      <div style={{ marginTop: '24px', textAlign: 'center' }}>
        <button
          onClick={() => onBack ? onBack() : window.location.hash = ''}
          style={{
            padding: '12px 24px',
            backgroundColor: '#641432',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '500',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#4A0F26'}
          onMouseLeave={(e) => e.target.style.backgroundColor = '#641432'}
        >
          Back to Home
        </button>
      </div>

      {/* Video Player Modal */}
      {showVideoPlayer && selectedVideo && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '90%',
            maxHeight: '90%',
            width: '800px',
            height: '600px',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#641432' }}>
                {selectedVideo.topic}
              </h3>
              <button
                onClick={closeVideoPlayer}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6b7280'
                }}
              >
                <CloseIcon size={24} color={ICON_COLORS.default} />
              </button>
            </div>
            
            <div style={{ 
              flex: 1, 
              backgroundColor: '#f3f4f6', 
              borderRadius: '8px',
              overflow: 'hidden'
            }}>
              {getVideoEmbedUrl(selectedVideo) ? (
                <iframe
                  src={getVideoEmbedUrl(selectedVideo)}
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  allow="autoplay; fullscreen"
                  allowFullScreen
                  title={selectedVideo.topic}
                />
              ) : (
                <div style={{
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#6b7280'
                }}>
                  <p>Video URL not available</p>
                </div>
              )}
            </div>

            <div style={{
              marginTop: '16px',
              fontSize: '14px',
              color: '#6b7280',
              display: 'flex',
              gap: '24px'
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CalendarIcon size={16} color={ICON_COLORS.default} />
                {new Date(selectedVideo.date).toLocaleDateString()}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ClockIcon size={16} color={ICON_COLORS.default} />
                {selectedVideo.duration} mins
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <UserIcon size={16} color={ICON_COLORS.default} />
                {selectedVideo.student}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ServiceIcon size={16} color={ICON_COLORS.default} />
                {selectedVideo.coach}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedSmartCoachOnboarding;