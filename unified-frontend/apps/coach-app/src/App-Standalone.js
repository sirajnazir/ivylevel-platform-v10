import React, { useState } from 'react';

// All components in one file - no imports, no lazy loading
function App() {
  const [view, setView] = useState('home');
  const [isListening, setIsListening] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [completedVideos, setCompletedVideos] = useState(new Set());
  const [activeTab, setActiveTab] = useState('overview');

  const videos = [
    { id: 1, title: "Introduction to IvyLevel", duration: "12:34" },
    { id: 2, title: "Student Psychology", duration: "18:45" },
    { id: 3, title: "Essay Coaching", duration: "25:12" },
    { id: 4, title: "Time Management", duration: "15:30" },
    { id: 5, title: "College Applications", duration: "22:18" }
  ];

  // AI Coach Dashboard View
  if (view === 'ai-coach') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '20px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', marginBottom: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: '0 0 8px 0' }}>
                  🧠 AI Coach Dashboard
                </h1>
                <p style={{ color: '#6b7280', margin: 0 }}>
                  Coach: Sarah | Student: Michael Chen
                </p>
              </div>
              <button onClick={() => setView('home')} style={{ padding: '8px 16px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                Back to Home
              </button>
            </div>
          </div>

          {/* Voice Assistant */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', marginBottom: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px' }}>
              🎙️ AI Voice Assistant
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button
                onClick={() => setIsListening(!isListening)}
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  border: 'none',
                  backgroundColor: isListening ? '#ef4444' : '#3b82f6',
                  color: 'white',
                  fontSize: '2rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                {isListening ? '⏹️' : '🎤'}
              </button>
              <div>
                <p style={{ fontSize: '1.1rem', fontWeight: '600' }}>
                  {isListening ? 'Listening...' : 'Click to start voice analysis'}
                </p>
                <p style={{ color: '#6b7280' }}>
                  {isListening ? 'AI is analyzing your coaching session' : 'Get instant AI feedback'}
                </p>
              </div>
            </div>
          </div>

          {/* Metrics */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px' }}>
              📊 Real-time Metrics
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#3b82f6' }}>85%</div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Engagement</div>
              </div>
              <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#3b82f6' }}>92%</div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Clarity</div>
              </div>
              <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#3b82f6' }}>78%</div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Progress</div>
              </div>
              <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#3b82f6' }}>88%</div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Momentum</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Admin Dashboard View
  if (view === 'admin') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '20px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', marginBottom: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: '0 0 8px 0' }}>
                  👨‍💼 Admin Dashboard
                </h1>
                <p style={{ color: '#6b7280', margin: 0 }}>
                  Welcome back, Admin
                </p>
              </div>
              <button onClick={() => setView('home')} style={{ padding: '8px 16px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                Back to Home
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
              {['overview', 'coaches', 'analytics'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: activeTab === tab ? '#3b82f6' : 'transparent',
                    color: activeTab === tab ? 'white' : '#6b7280',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    textTransform: 'capitalize'
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            {activeTab === 'overview' && (
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px' }}>
                  📊 Platform Overview
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                  <div style={{ padding: '20px', backgroundColor: '#f8fafc', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#3b82f6' }}>12</div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Total Coaches</div>
                  </div>
                  <div style={{ padding: '20px', backgroundColor: '#f8fafc', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#3b82f6' }}>48</div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Active Students</div>
                  </div>
                  <div style={{ padding: '20px', backgroundColor: '#f8fafc', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#3b82f6' }}>156</div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Completed Sessions</div>
                  </div>
                  <div style={{ padding: '20px', backgroundColor: '#f8fafc', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#3b82f6' }}>89</div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Resources Shared</div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'coaches' && (
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px' }}>
                  👥 Coach Management
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {['Sarah Chen', 'Michael Park', 'Emma Wilson', 'David Kim'].map((coach, i) => (
                    <div key={i} style={{ padding: '16px', border: '1px solid #e5e7eb', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontWeight: '600' }}>{coach}</div>
                        <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                          {5 + i} students • 4.{8 + i % 2}⭐ rating
                        </div>
                      </div>
                      <div style={{ padding: '4px 12px', backgroundColor: '#dcfce7', color: '#065f46', borderRadius: '20px', fontSize: '0.75rem' }}>
                        Active
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'analytics' && (
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px' }}>
                  📈 Analytics & Insights
                </h2>
                <div style={{ padding: '20px', backgroundColor: '#ecfdf5', border: '1px solid #10b981', borderRadius: '8px' }}>
                  <div style={{ fontWeight: '600', color: '#065f46' }}>
                    🧠 AI Platform Insight
                  </div>
                  <div style={{ color: '#047857', marginTop: '8px' }}>
                    Coaches using AI recommendations show 23% better student outcomes
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Onboarding View
  if (view === 'onboarding') {
    if (selectedVideo) {
      const video = videos.find(v => v.id === selectedVideo);
      return (
        <div style={{ minHeight: '100vh', backgroundColor: '#000', color: 'white', padding: '20px' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <button onClick={() => setSelectedVideo(null)} style={{ padding: '8px 16px', backgroundColor: '#374151', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', marginBottom: '16px' }}>
              ← Back to Library
            </button>
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '20px' }}>{video.title}</h1>
            <div style={{ backgroundColor: '#1f2937', borderRadius: '12px', padding: '40px', textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '8rem', marginBottom: '20px' }}>🎥</div>
              <div style={{ fontSize: '4rem', marginBottom: '20px' }}>▶️</div>
              <p style={{ fontSize: '1.25rem' }}>Video Player: {video.title}</p>
              <p>Duration: {video.duration}</p>
              <button onClick={() => {
                const newCompleted = new Set(completedVideos);
                newCompleted.add(video.id);
                setCompletedVideos(newCompleted);
                setSelectedVideo(null);
              }} style={{ marginTop: '20px', padding: '12px 24px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                Mark as Complete
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '20px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', marginBottom: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: '0 0 8px 0' }}>
                  📚 Coach Training Hub
                </h1>
                <p style={{ color: '#6b7280', margin: 0 }}>
                  Complete your training to start coaching
                </p>
              </div>
              <button onClick={() => setView('home')} style={{ padding: '8px 16px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                Back to Home
              </button>
            </div>
          </div>

          {/* Progress */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', marginBottom: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px' }}>
              📊 Training Progress
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '200px', height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${(completedVideos.size / videos.length) * 100}%`, height: '100%', backgroundColor: '#10b981' }}></div>
              </div>
              <span>{Math.round((completedVideos.size / videos.length) * 100)}% Complete</span>
            </div>
          </div>

          {/* Videos */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px' }}>
              🎥 Training Videos
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
              {videos.map(video => (
                <div
                  key={video.id}
                  onClick={() => setSelectedVideo(video.id)}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '16px',
                    cursor: 'pointer',
                    position: 'relative'
                  }}
                >
                  {completedVideos.has(video.id) && (
                    <div style={{ position: 'absolute', top: '8px', right: '8px', backgroundColor: '#10b981', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      ✓
                    </div>
                  )}
                  <div style={{ fontSize: '3rem', textAlign: 'center', marginBottom: '12px' }}>🎥</div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '600', margin: '0 0 8px 0' }}>{video.title}</h3>
                  <p style={{ color: '#9ca3af', fontSize: '0.75rem' }}>{video.duration}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Home View
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(to bottom right, #eff6ff, #f3e8ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ maxWidth: '1000px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '3rem', fontWeight: 'bold', color: '#111827', marginBottom: '16px' }}>
            🧠 AI Coach Pro ✨
          </h1>
          <p style={{ fontSize: '1.25rem', color: '#4b5563' }}>
            Choose a role to explore AI-powered coaching features
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          <div
            onClick={() => setView('admin')}
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
              padding: '24px',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <div style={{ width: '48px', height: '48px', borderRadius: '8px', backgroundColor: '#f3e8ff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', fontSize: '24px' }}>
              👨‍💼
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '8px' }}>Admin Dashboard</h3>
            <p style={{ color: '#6b7280', marginBottom: '16px' }}>
              Manage coaches, create onboarding packages, view platform analytics
            </p>
            <div style={{ color: '#9333ea', fontSize: '0.875rem', fontWeight: '500' }}>
              Explore Admin Features →
            </div>
          </div>

          <div
            onClick={() => setView('ai-coach')}
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
              padding: '24px',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <div style={{ width: '48px', height: '48px', borderRadius: '8px', backgroundColor: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', fontSize: '24px' }}>
              🎯
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '8px' }}>AI Coach Dashboard</h3>
            <p style={{ color: '#6b7280', marginBottom: '16px' }}>
              Experience real-time AI assistance, smart planning, and automated workflows
            </p>
            <div style={{ color: '#2563eb', fontSize: '0.875rem', fontWeight: '500' }}>
              See AI Features →
            </div>
          </div>

          <div
            onClick={() => setView('onboarding')}
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
              padding: '24px',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <div style={{ width: '48px', height: '48px', borderRadius: '8px', backgroundColor: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', fontSize: '24px' }}>
              📚
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '8px' }}>Coach Onboarding</h3>
            <p style={{ color: '#6b7280', marginBottom: '16px' }}>
              YouTube-style training with personalized learning paths
            </p>
            <div style={{ color: '#059669', fontSize: '0.875rem', fontWeight: '500' }}>
              Start Training →
            </div>
          </div>
        </div>

        <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', padding: '24px', marginTop: '48px' }}>
          <h3 style={{ fontWeight: 'bold', marginBottom: '16px' }}>🚀 AI Features</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            {['🎙️ Voice AI Assistant', '📊 Real-time Analytics', '🎯 Smart Resources', '📅 AI Planning', '🎥 Video Training', '⚡ Automation'].map((feature, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;