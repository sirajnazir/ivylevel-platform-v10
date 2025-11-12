import React, { useState, useEffect } from 'react';
import { newCoachesData } from '../data/newCoachesData';
import knowledgeBaseService from '../services/knowledgeBaseService';

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
    backgroundColor: isActive ? '#4f46e5' : 'transparent',
    color: isActive ? 'white' : '#6b7280',
    cursor: 'pointer',
    borderRadius: '6px',
    marginRight: '8px',
    fontSize: '14px',
    fontWeight: '500'
  });

  const selectStyle = {
    padding: '8px 16px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    marginBottom: '16px',
    width: '200px'
  };

  if (error) {
    return (
      <div style={containerStyle}>
        <div style={{ backgroundColor: '#fee2e2', padding: '16px', borderRadius: '8px', color: '#991b1b' }}>
          <h3>Error Loading Data</h3>
          <p>{error}</p>
          <button onClick={loadCoachData} style={{ marginTop: '8px', padding: '8px 16px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
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
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>
          🚀 Enhanced Knowledge Base Platform
        </h1>
        <p style={{ color: '#6b7280', marginBottom: '16px' }}>
          Access 316+ coaching sessions with AI insights, transcripts, and auxiliary documents
        </p>

        {/* Coach Selector */}
        <div>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
            Select Coach
          </label>
          <select
            value={selectedCoach}
            onChange={(e) => setSelectedCoach(e.target.value)}
            style={selectStyle}
          >
            {Object.entries(newCoachesData).map(([key, coach]) => (
              <option key={key} value={key}>
                {coach.name} - {coach.student?.name || coach.students?.[0]?.name || 'Multiple Students'}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ marginBottom: '24px', backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setActiveTab('overview')} style={tabStyle(activeTab === 'overview')}>
            📊 Overview
          </button>
          <button onClick={() => setActiveTab('sessions')} style={tabStyle(activeTab === 'sessions')}>
            🎥 Sessions ({allRecordings.length})
          </button>
          <button onClick={() => setActiveTab('journey')} style={tabStyle(activeTab === 'journey')}>
            📈 Student Journey
          </button>
          <button onClick={() => setActiveTab('analytics')} style={tabStyle(activeTab === 'analytics')}>
            🧠 Analytics
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', minHeight: '400px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px' }}>
            <div style={{ fontSize: '18px', color: '#6b7280' }}>Loading...</div>
          </div>
        ) : (
          <div>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px' }}>
                  Coach Overview: {newCoachesData[selectedCoach]?.name}
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                  <div style={{ padding: '16px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
                    <h3 style={{ fontWeight: '600', marginBottom: '8px' }}>Student</h3>
                    <p>{newCoachesData[selectedCoach]?.student?.name || 'Multiple Students'}</p>
                  </div>
                  <div style={{ padding: '16px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
                    <h3 style={{ fontWeight: '600', marginBottom: '8px' }}>Start Date</h3>
                    <p>{newCoachesData[selectedCoach]?.startDate}</p>
                  </div>
                  <div style={{ padding: '16px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
                    <h3 style={{ fontWeight: '600', marginBottom: '8px' }}>Total Sessions</h3>
                    <p>{allRecordings.length}</p>
                  </div>
                  <div style={{ padding: '16px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
                    <h3 style={{ fontWeight: '600', marginBottom: '8px' }}>Focus Areas</h3>
                    <p>{newCoachesData[selectedCoach]?.student?.focusAreas?.join(', ') || 'N/A'}</p>
                  </div>
                </div>

                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '12px' }}>
                  Training Resources
                </h3>
                <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px' }}>
                  <p style={{ marginBottom: '8px' }}>
                    <strong>Primary Video:</strong> {newCoachesData[selectedCoach]?.trainingNeeds?.primaryVideo}
                  </p>
                  <p style={{ marginBottom: '8px' }}>
                    <strong>Session Type:</strong> {newCoachesData[selectedCoach]?.trainingNeeds?.sessionType}
                  </p>
                  <p>
                    <strong>Priority:</strong> {newCoachesData[selectedCoach]?.trainingNeeds?.priority}
                  </p>
                </div>
              </div>
            )}

            {/* Sessions Tab */}
            {activeTab === 'sessions' && (
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px' }}>
                  Coaching Sessions
                </h2>
                {allRecordings.length === 0 ? (
                  <p style={{ color: '#6b7280' }}>No sessions found for this coach.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {allRecordings.map((recording, index) => (
                      <div key={recording.id || index} style={{ 
                        padding: '16px', 
                        border: '1px solid #e5e7eb', 
                        borderRadius: '8px',
                        backgroundColor: '#f9fafb'
                      }}>
                        <h4 style={{ fontWeight: '600', marginBottom: '8px' }}>{recording.topic}</h4>
                        <div style={{ display: 'flex', gap: '16px', fontSize: '14px', color: '#6b7280' }}>
                          <span>📅 {new Date(recording.date).toLocaleDateString()}</span>
                          <span>⏱️ {recording.duration} mins</span>
                          <span>👤 {recording.student}</span>
                          {recording.hasVideo && (
                            <span 
                              onClick={() => handleVideoClick(recording)}
                              style={{ cursor: 'pointer', textDecoration: 'underline' }}
                              title="Click to watch video"
                            >
                              🎥 Video
                            </span>
                          )}
                          {recording.hasTranscript && <span>📝 Transcript</span>}
                          {recording.hasInsights && <span>🧠 AI Insights</span>}
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
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px' }}>
                  Student Journey
                </h2>
                <p style={{ color: '#6b7280' }}>
                  Visual journey tracking coming soon. This will show the student's progress through their program.
                </p>
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px' }}>
                  Analytics & Insights
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                  <div style={{ padding: '16px', backgroundColor: '#dbeafe', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1e40af' }}>{allRecordings.length}</div>
                    <div style={{ color: '#3730a3' }}>Total Sessions</div>
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
                  <div style={{ padding: '16px', backgroundColor: '#e9d5ff', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#7c3aed' }}>
                      {allRecordings.filter(r => r.hasTranscript).length}
                    </div>
                    <div style={{ color: '#6d28d9' }}>Transcripts</div>
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
            backgroundColor: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
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
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
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
                ✕
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
              <span>📅 {new Date(selectedVideo.date).toLocaleDateString()}</span>
              <span>⏱️ {selectedVideo.duration} mins</span>
              <span>👤 {selectedVideo.student}</span>
              <span>🎯 {selectedVideo.coach}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedSmartCoachOnboarding;