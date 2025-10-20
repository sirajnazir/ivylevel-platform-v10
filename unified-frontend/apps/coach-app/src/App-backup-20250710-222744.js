import React, { useState, useEffect } from 'react';
import dataService from './services/dataService';
import SmartCoachOnboarding from './components/SmartCoachOnboarding';
import EnhancedSmartCoachOnboarding from './components/EnhancedSmartCoachOnboardingSimple';
import EnhancedCoachPlatform from './components/EnhancedCoachPlatform';
import LoginEnhanced from './components/LoginEnhanced';
import { onAuthStateChanged, signOut } from './services/mockAuth';

function App() {
  // Check URL hash for direct navigation
  const getInitialView = () => {
    const hash = window.location.hash;
    if (hash === '#smart-onboarding') return 'smart-onboarding';
    if (hash === '#enhanced-onboarding') return 'enhanced-onboarding';
    if (hash === '#coach-platform') return 'coach-platform';
    return 'home';
  };
  const initialView = getInitialView();
  console.log('URL hash:', window.location.hash, 'Initial view:', initialView);
  const [view, setView] = useState(initialView);
  const [isListening, setIsListening] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [completedVideos, setCompletedVideos] = useState(new Set());
  const [activeTab, setActiveTab] = useState('overview');
  
  // Real data states
  const [coaches, setCoaches] = useState([]);
  const [platformStats, setPlatformStats] = useState({});
  const [indexedVideos, setIndexedVideos] = useState([]);
  const [trainingVideos, setTrainingVideos] = useState([]);
  const [sessionMetrics, setSessionMetrics] = useState({
    engagement: 85,
    clarity: 92,
    progress: 78,
    momentum: 88
  });
  const [aiRecommendations, setAiRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Load real data on mount
  useEffect(() => {
    loadProductionData();
    
    // Handle hash changes
    const handleHashChange = () => {
      const hash = window.location.hash;
      console.log('Hash changed to:', hash);
      if (hash === '#smart-onboarding') {
        setView('smart-onboarding');
      } else if (hash === '#enhanced-onboarding') {
        setView('enhanced-onboarding');
      } else if (hash === '#coach-platform') {
        setView('coach-platform');
      } else if (hash === '#login') {
        setView('login');
      } else if (hash === '' || hash === '#') {
        setView('home');
      }
    };
    
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Monitor auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(null, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
      console.log('Auth state changed:', user?.email);
    });
    return unsubscribe;
  }, []);

  const loadProductionData = async () => {
    try {
      setLoading(true);
      console.log('Starting to load production data...');
      console.log('Current view:', view);
      
      // Load all data in parallel
      const [coachData, stats, videos, training, recommendations] = await Promise.all([
        dataService.getCoaches(),
        dataService.getPlatformStats(),
        dataService.getIndexedVideos(),
        dataService.getTrainingVideos(),
        dataService.getAIRecommendations('coach1', 'student1')
      ]);

      console.log('Data loaded:', {
        coaches: coachData.length,
        stats,
        videos: videos.length,
        training: training.length,
        recommendations: recommendations.length
      });

      setCoaches(coachData);
      setPlatformStats(stats);
      setIndexedVideos(videos);
      setTrainingVideos(training);
      setAiRecommendations(recommendations);
      
      // Subscribe to real-time metrics
      dataService.subscribeToSessionMetrics('current-session', (metrics) => {
        setSessionMetrics(metrics);
      });
      
    } catch (error) {
      console.error('Error loading production data:', error);
      alert('Error loading data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(null);
      setView('home');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' }}>
        <div style={{ fontSize: '1.25rem', color: '#6b7280' }}>Loading...</div>
      </div>
    );
  }

  // Login View
  if (view === 'login') {
    return <LoginEnhanced onViewChange={setView} />;
  }

  // AI Coach Dashboard View with Real Data
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
                  Coach: {coaches[0]?.name || 'Sarah'} | Student: Michael Chen
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

          {/* Real-time Metrics with Live Data */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', marginBottom: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px' }}>
              📊 Real-time Session Metrics (Live)
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              {Object.entries(sessionMetrics).map(([key, value]) => (
                <div key={key} style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#3b82f6' }}>{value}%</div>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280', textTransform: 'capitalize' }}>{key}</div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Recommendations from Production */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px' }}>
              🎯 AI Recommendations (From Database)
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {aiRecommendations.map((rec, index) => (
                <div key={index} style={{
                  padding: '16px',
                  backgroundColor: rec.type === 'success' ? '#ecfdf5' : rec.type === 'warning' ? '#fef3c7' : '#dbeafe',
                  border: `1px solid ${rec.type === 'success' ? '#10b981' : rec.type === 'warning' ? '#f59e0b' : '#3b82f6'}`,
                  borderRadius: '8px'
                }}>
                  <div style={{ fontWeight: '600', color: rec.type === 'success' ? '#065f46' : rec.type === 'warning' ? '#92400e' : '#1e40af' }}>
                    {rec.icon} {rec.title}
                  </div>
                  <div style={{ color: rec.type === 'success' ? '#047857' : rec.type === 'warning' ? '#b45309' : '#1d4ed8', fontSize: '0.875rem' }}>
                    {rec.description}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Admin Dashboard View with Real Data
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
                <p style={{ color: '#9ca3af', fontSize: '0.75rem', marginTop: '4px' }}>
                  Version: Smart Onboarding Enabled
                </p>
              </div>
              <div>
                <button 
                  onClick={() => setView('smart-onboarding')} 
                  style={{ 
                    padding: '8px 16px', 
                    backgroundColor: '#10b981', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '6px', 
                    cursor: 'pointer',
                    marginRight: '12px'
                  }}
                >
                  🎯 Smart Onboarding
                </button>
                <button 
                  onClick={() => setView('home')} 
                  style={{ 
                    padding: '8px 16px', 
                    backgroundColor: '#ef4444', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '6px', 
                    cursor: 'pointer' 
                  }}
                >
                  Back to Home
                </button>
              </div>
            </div>
          </div>

          {/* Smart Onboarding Alert */}
          <div style={{ backgroundColor: '#10b981', color: 'white', borderRadius: '12px', padding: '16px', marginBottom: '24px', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 8px 0' }}>🎯 New Feature Available!</h3>
            <button 
              onClick={() => setView('smart-onboarding')} 
              style={{ 
                padding: '12px 24px', 
                backgroundColor: 'white', 
                color: '#10b981', 
                border: 'none', 
                borderRadius: '6px', 
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Launch Smart Coach Onboarding
            </button>
          </div>

          {/* Tabs */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
              {['overview', 'coaches', 'videos'].map(tab => (
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
                  📊 Platform Overview (Live Data)
                </h2>
                <p style={{ color: '#6b7280', marginBottom: '16px' }}>
                  Data Source: {coaches.length > 0 || indexedVideos.length > 0 ? '🟢 Firebase' : '🟡 Mock Data'}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                  {Object.entries(platformStats).map(([key, value]) => (
                    <div key={key} style={{ padding: '20px', backgroundColor: '#f8fafc', borderRadius: '8px', textAlign: 'center' }}>
                      <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#3b82f6' }}>{value}</div>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280', textTransform: 'capitalize' }}>
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </div>
                    </div>
                  ))}
                </div>
                
              </div>
            )}

            {activeTab === 'coaches' && (
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px' }}>
                  👥 Coach Management (From Database)
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {loading ? (
                    <p>Loading coaches...</p>
                  ) : (
                    coaches.map((coach, i) => (
                      <div key={i} style={{ padding: '16px', border: '1px solid #e5e7eb', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontWeight: '600' }}>{coach.name}</div>
                          <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                            {coach.email} • {coach.studentCount} students • {coach.rating}⭐ rating
                          </div>
                        </div>
                        <div style={{ 
                          padding: '4px 12px', 
                          backgroundColor: coach.status === 'active' ? '#dcfce7' : '#fef3c7', 
                          color: coach.status === 'active' ? '#065f46' : '#92400e', 
                          borderRadius: '20px', 
                          fontSize: '0.75rem',
                          textTransform: 'capitalize'
                        }}>
                          {coach.status}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'videos' && (
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px' }}>
                  🎥 Indexed Videos ({indexedVideos.length} Total)
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto' }}>
                  {indexedVideos.map((video, i) => (
                    <div key={i} style={{ padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                      <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>{video.title}</div>
                      <div style={{ color: '#6b7280', fontSize: '0.8rem', marginTop: '4px' }}>
                        Coach: {video.coach} | Student: {video.student} | Duration: {video.duration}
                      </div>
                      <div style={{ 
                        display: 'inline-block',
                        padding: '2px 8px', 
                        backgroundColor: '#e5e7eb', 
                        borderRadius: '12px', 
                        fontSize: '0.7rem',
                        marginTop: '4px'
                      }}>
                        {video.category}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Smart Coach Onboarding View
  if (view === 'smart-onboarding') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '20px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', textAlign: 'center' }}>
            <h1>🎯 Smart Coach Onboarding Loading...</h1>
            <p>If you see this message, the routing is working!</p>
          </div>
          <SmartCoachOnboarding />
        </div>
      </div>
    );
  }

  // Enhanced Smart Coach Onboarding View with Knowledge Base Integration
  if (view === 'enhanced-onboarding') {
    console.log('Rendering EnhancedSmartCoachOnboarding component');
    try {
      return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
          <EnhancedSmartCoachOnboarding />
        </div>
      );
    } catch (error) {
      console.error('Error rendering EnhancedSmartCoachOnboarding:', error);
      return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '20px' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', backgroundColor: 'white', padding: '24px', borderRadius: '8px' }}>
            <h1 style={{ color: '#ef4444' }}>Error Loading Enhanced KB Platform</h1>
            <p>There was an error loading the Enhanced Knowledge Base. Please check the console for details.</p>
            <p style={{ color: '#6b7280', fontSize: '14px' }}>Error: {error.message}</p>
            <button 
              onClick={() => setView('home')} 
              style={{ 
                marginTop: '16px',
                padding: '8px 16px', 
                backgroundColor: '#3b82f6', 
                color: 'white', 
                border: 'none', 
                borderRadius: '6px', 
                cursor: 'pointer' 
              }}
            >
              Back to Home
            </button>
          </div>
        </div>
      );
    }
  }

  // Coach Training Platform with Quiz and Certification
  if (view === 'coach-platform') {
    return <EnhancedCoachPlatform />;
  }

  // Onboarding View with Real Training Videos
  if (view === 'onboarding') {
    if (selectedVideo) {
      const video = trainingVideos.find(v => v.id === selectedVideo);
      return (
        <div style={{ minHeight: '100vh', backgroundColor: '#000', color: 'white', padding: '20px' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <button onClick={() => setSelectedVideo(null)} style={{ padding: '8px 16px', backgroundColor: '#374151', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', marginBottom: '16px' }}>
              ← Back to Library
            </button>
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '20px' }}>{video?.title}</h1>
            <div style={{ backgroundColor: '#1f2937', borderRadius: '12px', padding: '40px', textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '8rem', marginBottom: '20px' }}>🎥</div>
              <div style={{ fontSize: '4rem', marginBottom: '20px' }}>▶️</div>
              <p style={{ fontSize: '1.25rem' }}>Video Player: {video?.title}</p>
              <p>Duration: {video?.duration}</p>
              <p style={{ color: '#9ca3af', marginTop: '8px' }}>Category: {video?.category}</p>
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
                <div style={{ width: `${(completedVideos.size / trainingVideos.length) * 100}%`, height: '100%', backgroundColor: '#10b981' }}></div>
              </div>
              <span>{Math.round((completedVideos.size / trainingVideos.length) * 100)}% Complete</span>
            </div>
          </div>

          {/* Training Videos from Database */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px' }}>
              🎥 Training Videos (From Database)
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
              {trainingVideos.map(video => (
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
                  <div style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    color: '#6b7280',
                    marginBottom: '8px'
                  }}>
                    {video.category}
                  </div>
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
    <div style={{ minHeight: '100vh', background: 'linear-gradient(to bottom right, #eff6ff, #f3e8ff)' }}>
      {/* User Menu Bar */}
      <div style={{ backgroundColor: 'white', padding: '12px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '1.125rem', fontWeight: '600', color: '#374151' }}>IvyLevel Coach Platform</div>
          <div>
            {currentUser ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ color: '#6b7280' }}>👤 {currentUser.email}</span>
                <button
                  onClick={handleLogout}
                  style={{
                    padding: '6px 16px',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={() => setView('login')}
                style={{
                  padding: '6px 16px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Login
              </button>
            )}
          </div>
        </div>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', minHeight: 'calc(100vh - 60px)' }}>
        <div style={{ maxWidth: '1000px', width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h1 style={{ fontSize: '3rem', fontWeight: 'bold', color: '#111827', marginBottom: '16px' }}>
              🧠 AI Coach Pro ✨
            </h1>
            <p style={{ fontSize: '1.25rem', color: '#4b5563' }}>
              Production Environment - Connected to Real Data
            </p>
            <p style={{ fontSize: '0.875rem', color: '#9ca3af', marginTop: '8px' }}>
              Firebase Project: {process.env.REACT_APP_FIREBASE_PROJECT_ID || 'NOT SET'}
            </p>
            {currentUser && (
              <p style={{ fontSize: '0.875rem', color: '#059669', marginTop: '8px' }}>
                ✓ Logged in as: {currentUser.email}
              </p>
            )}
            {loading && (
              <p style={{ fontSize: '0.875rem', color: '#9ca3af', marginTop: '8px' }}>
                Loading production data...
              </p>
            )}
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
              View real coaches, platform stats, and indexed videos
            </p>
            <div style={{ color: '#9333ea', fontSize: '0.875rem', fontWeight: '500' }}>
              {coaches.length} Coaches • {platformStats.activeStudents} Students
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
              Real-time metrics, AI recommendations from database
            </p>
            <div style={{ color: '#2563eb', fontSize: '0.875rem', fontWeight: '500' }}>
              Live Session Metrics • {aiRecommendations.length} AI Insights
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
              {trainingVideos.length} training videos from your library
            </p>
            <div style={{ color: '#059669', fontSize: '0.875rem', fontWeight: '500' }}>
              Personalized Training Path
            </div>
          </div>
        </div>

        {/* Complete Coach Training Platform - FEATURED! */}
        <div style={{ backgroundColor: '#fde68a', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', padding: '40px', marginTop: '24px', border: '4px solid #f59e0b' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'inline-block', backgroundColor: '#dc2626', color: 'white', padding: '6px 16px', borderRadius: '20px', fontSize: '1rem', fontWeight: '700', marginBottom: '16px' }}>
              🔥 COMPLETE TRAINING PLATFORM
            </div>
            <h3 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '20px', color: '#7c2d12' }}>
              🎓 Full Coach Certification Program
            </h3>
            <p style={{ color: '#92400e', marginBottom: '12px', fontSize: '1.25rem', fontWeight: '600' }}>
              Complete 5-Module Training with Quiz & Certification
            </p>
            <p style={{ color: '#78350f', marginBottom: '24px', fontSize: '1.1rem' }}>
              ✅ Interactive Modules &nbsp; ✅ Knowledge Quiz &nbsp; ✅ Session Simulation &nbsp; ✅ Official Certificate
            </p>
            <button
              onClick={() => setView('coach-platform')}
              style={{
                padding: '20px 40px',
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                fontSize: '1.25rem',
                fontWeight: '700',
                boxShadow: '0 6px 12px rgba(220, 38, 38, 0.4)',
                transform: 'scale(1)',
                transition: 'all 0.3s'
              }}
              onMouseOver={(e) => {
                e.target.style.transform = 'scale(1.08)';
                e.target.style.backgroundColor = '#b91c1c';
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'scale(1)';
                e.target.style.backgroundColor = '#dc2626';
              }}
            >
              Start Coach Training Now 🚀
            </button>
          </div>
        </div>

        {/* Enhanced Knowledge Base Card */}
        <div style={{ backgroundColor: '#c7d2fe', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', padding: '32px', marginTop: '24px', border: '3px solid #6366f1' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'inline-block', backgroundColor: '#ef4444', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '0.875rem', fontWeight: '600', marginBottom: '12px' }}>
              NEW FEATURE
            </div>
            <h3 style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '16px', color: '#4c1d95' }}>
              🚀 Enhanced Knowledge Base Platform
            </h3>
            <p style={{ color: '#4b5563', marginBottom: '8px', fontSize: '1.1rem' }}>
              Access 316+ coaching sessions with AI insights
            </p>
            <p style={{ color: '#6b7280', marginBottom: '20px' }}>
              Comprehensive knowledge base with video recordings, transcripts, and auxiliary documents
            </p>
            <button
              onClick={() => setView('enhanced-onboarding')}
              style={{
                padding: '16px 32px',
                backgroundColor: '#6366f1',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '1.125rem',
                fontWeight: '700',
                boxShadow: '0 4px 6px rgba(99, 102, 241, 0.4)',
                transform: 'scale(1)',
                transition: 'transform 0.2s'
              }}
              onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
              onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
            >
              Launch Enhanced KB Platform 🎯
            </button>
          </div>
        </div>
        </div>

        {/* Smart Onboarding Card */}
        <div style={{ backgroundColor: '#fef3c7', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', padding: '24px', marginTop: '24px', border: '2px solid #f59e0b' }}>
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '12px', color: '#92400e' }}>
              🎯 Smart Coach Onboarding
            </h3>
            <p style={{ color: '#6b7280', marginBottom: '16px' }}>
              Original intelligent resource matching for Noor, Jamie, and Kelvin
            </p>
            <button
              onClick={() => setView('smart-onboarding')}
              style={{
                padding: '12px 24px',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '600'
              }}
            >
              Launch Smart Onboarding System
            </button>
          </div>
        </div>

        <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', padding: '24px', marginTop: '24px' }}>
          <h3 style={{ fontWeight: 'bold', marginBottom: '16px' }}>🔌 Connected Data Sources</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#10b981' }}>✓</span>
              <span>Firebase Firestore</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#10b981' }}>✓</span>
              <span>Google Drive API</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#10b981' }}>✓</span>
              <span>Real-time Metrics</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#10b981' }}>✓</span>
              <span>AI Recommendations</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;