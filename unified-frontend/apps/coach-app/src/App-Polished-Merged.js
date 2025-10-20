import React, { useState, useEffect, createContext, useContext } from 'react';
import knowledgeBaseService from './services/knowledgeBaseService';
import EnhancedSmartCoachOnboarding from './components/EnhancedSmartCoachOnboardingSimple';
import SmartCoachOnboarding from './components/SmartCoachOnboarding';
import dataService from './services/dataService';

// Mock Auth Context - Simulates Firebase Auth
const AuthContext = createContext({});

// Mock database - stores data in memory during session
const mockDatabase = {
  users: {
    'admin-uid': {
      id: 'admin-uid',
      email: 'admin@ivylevel.com',
      name: 'Admin User',
      role: 'admin',
      createdAt: new Date().toISOString()
    },
    'coach1-uid': {
      id: 'coach1-uid',
      email: 'coach1@ivylevel.com',
      name: 'Sarah Johnson',
      role: 'coach',
      status: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      student: {
        name: 'Emma Chen',
        grade: '11th Grade',
        focusArea: 'pre-med',
        culturalBackground: 'Asian-American'
      },
      progress: {
        welcome: { completed: false },
        mastery: { completed: false, score: 0 },
        technical: { completed: false },
        simulation: { completed: false, score: 0 },
        certification: { completed: false }
      }
    },
    'coach2-uid': {
      id: 'coach2-uid',
      email: 'coach2@ivylevel.com',
      name: 'Michael Roberts',
      role: 'coach',
      status: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      student: {
        name: 'Alex Kumar',
        grade: '12th Grade',
        focusArea: 'engineering',
        culturalBackground: 'South Asian'
      },
      progress: {
        welcome: { completed: false },
        mastery: { completed: false, score: 0 },
        technical: { completed: false },
        simulation: { completed: false, score: 0 },
        certification: { completed: false }
      }
    }
  },
  credentials: {
    'admin@ivylevel.com': { password: 'Admin123!', uid: 'admin-uid' },
    'coach1@ivylevel.com': { password: 'Coach123!', uid: 'coach1-uid' },
    'coach2@ivylevel.com': { password: 'Coach123!', uid: 'coach2-uid' }
  }
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const login = async (email, password) => {
    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const creds = mockDatabase.credentials[email];
      if (!creds || creds.password !== password) {
        return { success: false, error: 'Invalid email or password' };
      }
      
      const userInfo = mockDatabase.users[creds.uid];
      setUser({ uid: creds.uid, email: email });
      setUserData(userInfo);
      
      // Update last login
      mockDatabase.users[creds.uid].lastLogin = new Date().toISOString();
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };
  
  const logout = async () => {
    setUser(null);
    setUserData(null);
  };
  
  const createCoach = async (email, password, coachData) => {
    // Generate unique ID
    const uid = `coach-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Add to mock database
    mockDatabase.users[uid] = {
      id: uid,
      email: email,
      name: coachData.name,
      role: 'coach',
      status: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      student: {
        name: coachData.studentName,
        grade: coachData.studentGrade,
        focusArea: coachData.studentFocus,
        culturalBackground: 'To be determined'
      },
      progress: {
        welcome: { completed: false },
        mastery: { completed: false, score: 0 },
        technical: { completed: false },
        simulation: { completed: false, score: 0 },
        certification: { completed: false }
      }
    };
    
    mockDatabase.credentials[email] = { password: password, uid: uid };
    
    return { success: true, uid: uid };
  };
  
  const getAllCoaches = () => {
    return Object.values(mockDatabase.users).filter(u => u.role === 'coach');
  };
  
  return (
    <AuthContext.Provider value={{ 
      user, 
      userData, 
      loading, 
      login, 
      logout, 
      createCoach,
      getAllCoaches 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => useContext(AuthContext);

// Login Page Component - Polished UI
const LoginPage = ({ onLogin }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Test credentials for easy access
  const testCredentials = [
    { email: 'admin@ivylevel.com', password: 'Admin123!', role: 'Admin' },
    { email: 'coach1@ivylevel.com', password: 'Coach123!', role: 'Coach (Sarah)' },
    { email: 'coach2@ivylevel.com', password: 'Coach123!', role: 'Coach (Michael)' }
  ];
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    const result = await login(email, password);
    
    if (result.success) {
      onLogin();
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };
  
  const [showPassword, setShowPassword] = useState(false);
  
  return (
    <div style={{minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa, #c3cfe2)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px'}}>
      <div style={{maxWidth: '960px', width: '100%', display: 'flex', gap: '48px', alignItems: 'center'}}>
        {/* Left Side - Login Form */}
        <div style={{flex: 1, background: 'white', borderRadius: '16px', padding: '48px', boxShadow: '0 20px 40px rgba(0,0,0,0.1)'}}>
          <div style={{textAlign: 'center', marginBottom: '32px'}}>
            <h1 style={{fontSize: '2rem', fontWeight: 'bold', color: '#111827', marginBottom: '8px'}}>Welcome Back</h1>
            <p style={{color: '#6b7280'}}>Sign in to your Ivylevel account</p>
          </div>
          
          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{background: '#fee2e2', color: '#dc2626', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.875rem'}}>
                {error}
              </div>
            )}
            
            <div style={{marginBottom: '20px'}}>
              <label style={{display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151'}}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>
            
            <div style={{marginBottom: '24px'}}>
              <label style={{display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151'}}>
                Password
              </label>
              <div style={{position: 'relative'}}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    paddingRight: '48px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#6b7280'
                  }}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '16px',
                background: loading ? '#9ca3af' : 'linear-gradient(135deg, #2563eb, #7c3aed)',
                color: 'white',
                borderRadius: '8px',
                fontWeight: 'bold',
                fontSize: '1.125rem',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: loading ? 'none' : '0 10px 20px rgba(37, 99, 235, 0.3)'
              }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          
          {/* Test Credentials */}
          <div style={{marginTop: '32px', borderTop: '1px solid #e5e7eb', paddingTop: '24px'}}>
            <p style={{fontSize: '0.875rem', color: '#6b7280', marginBottom: '12px'}}>Demo Accounts:</p>
            <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
              {testCredentials.map((cred, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setEmail(cred.email);
                    setPassword(cred.password);
                  }}
                  style={{
                    padding: '8px 12px',
                    background: '#f3f4f6',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    color: '#4b5563',
                    textAlign: 'left',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#e5e7eb'}
                  onMouseLeave={(e) => e.target.style.background = '#f3f4f6'}
                >
                  <div style={{fontWeight: '600'}}>{cred.role}</div>
                  <div>{cred.email} / {cred.password}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Right Side - Branding */}
        <div style={{flex: 1}}>
          <h2 style={{fontSize: '2.5rem', fontWeight: 'bold', color: '#111827', marginBottom: '16px'}}>
            Ivylevel Elite Coach Portal
          </h2>
          <p style={{fontSize: '1.125rem', color: '#6b7280', lineHeight: '1.6', marginBottom: '32px'}}>
            Join the exclusive network of coaches helping students achieve their Ivy League dreams.
          </p>
          
          <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
              <div style={{width: '48px', height: '48px', background: '#dbeafe', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <svg style={{width: '24px', height: '24px', color: '#2563eb'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <h3 style={{fontWeight: '600', color: '#111827'}}>Comprehensive Training</h3>
                <p style={{fontSize: '0.875rem', color: '#6b7280'}}>Master the Ivylevel methodology in 48 hours</p>
              </div>
            </div>
            
            <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
              <div style={{width: '48px', height: '48px', background: '#e0e7ff', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <svg style={{width: '24px', height: '24px', color: '#7c3aed'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h3 style={{fontWeight: '600', color: '#111827'}}>Impact Lives</h3>
                <p style={{fontSize: '0.875rem', color: '#6b7280'}}>Guide students to their dream colleges</p>
              </div>
            </div>
            
            <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
              <div style={{width: '48px', height: '48px', background: '#fef3c7', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <svg style={{width: '24px', height: '24px', color: '#f59e0b'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 style={{fontWeight: '600', color: '#111827'}}>Earn $25,000+</h3>
                <p style={{fontSize: '0.875rem', color: '#6b7280'}}>Build a rewarding coaching career</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main App Component
function App() {
  const { user, userData, logout } = useAuth();
  const [view, setView] = useState('home');
  const [realData, setRealData] = useState({
    coaches: [],
    videos: [],
    stats: {}
  });

  useEffect(() => {
    loadRealData();
  }, []);

  const loadRealData = async () => {
    try {
      const [coaches, stats, videos] = await Promise.all([
        dataService.getCoaches(),
        dataService.getPlatformStats(),
        dataService.getIndexedVideos()
      ]);
      setRealData({ coaches, videos, stats });
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  if (!user) {
    return <LoginPage onLogin={() => setView('home')} />;
  }

  // Home Dashboard - Enhanced with new features
  if (view === 'home') {
    return (
      <div style={{minHeight: '100vh', background: '#f9fafb'}}>
        {/* Header */}
        <div style={{background: 'white', borderBottom: '1px solid #e5e7eb', padding: '16px 24px'}}>
          <div style={{maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
              <div style={{fontSize: '1.5rem', fontWeight: 'bold', color: '#7c3aed'}}>Ivylevel</div>
              <div style={{fontSize: '0.875rem', color: '#6b7280'}}>Coach Training Platform</div>
            </div>
            <div style={{display: 'flex', alignItems: 'center', gap: '24px'}}>
              <div style={{textAlign: 'right'}}>
                <div style={{fontSize: '0.875rem', color: '#6b7280'}}>Welcome back</div>
                <div style={{fontWeight: '600'}}>{userData.name}</div>
              </div>
              <button
                onClick={() => logout()}
                style={{
                  padding: '8px 16px',
                  background: '#f3f4f6',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div style={{maxWidth: '1200px', margin: '0 auto', padding: '32px 24px'}}>
          <h1 style={{fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '32px', textAlign: 'center'}}>
            Welcome to Ivylevel Elite Coach Portal
          </h1>

          {/* Feature Cards */}
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px'}}>
            {/* Enhanced Knowledge Base */}
            <div
              onClick={() => setView('enhanced-kb')}
              style={{
                background: 'linear-gradient(135deg, #7c3aed, #2563eb)',
                color: 'white',
                borderRadius: '12px',
                padding: '32px',
                cursor: 'pointer',
                transition: 'transform 0.2s',
                boxShadow: '0 20px 40px rgba(124, 58, 237, 0.3)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <div style={{fontSize: '48px', marginBottom: '16px'}}>📚</div>
              <h3 style={{fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '8px'}}>
                Enhanced Knowledge Base
              </h3>
              <p style={{opacity: 0.9}}>
                Access 316+ coaching sessions with AI insights and comprehensive analytics
              </p>
              <div style={{marginTop: '16px', fontSize: '0.875rem', opacity: 0.8}}>
                {realData.videos.length} videos available
              </div>
            </div>

            {/* Coach Training */}
            <div
              onClick={() => setView('training')}
              style={{
                background: 'white',
                borderRadius: '12px',
                padding: '32px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                border: '2px solid #e5e7eb',
                boxShadow: '0 10px 20px rgba(0,0,0,0.05)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#7c3aed';
                e.currentTarget.style.transform = 'scale(1.02)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e5e7eb';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <div style={{fontSize: '48px', marginBottom: '16px'}}>🎓</div>
              <h3 style={{fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '8px', color: '#111827'}}>
                Complete Training Program
              </h3>
              <p style={{color: '#6b7280'}}>
                5-module certification program with quizzes and simulations
              </p>
              <div style={{marginTop: '16px', fontSize: '0.875rem', color: '#7c3aed', fontWeight: '600'}}>
                Start Training →
              </div>
            </div>

            {/* Smart Onboarding */}
            <div
              onClick={() => setView('smart-onboarding')}
              style={{
                background: 'white',
                borderRadius: '12px',
                padding: '32px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                border: '2px solid #e5e7eb',
                boxShadow: '0 10px 20px rgba(0,0,0,0.05)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#f59e0b';
                e.currentTarget.style.transform = 'scale(1.02)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e5e7eb';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <div style={{fontSize: '48px', marginBottom: '16px'}}>🎯</div>
              <h3 style={{fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '8px', color: '#111827'}}>
                Smart Onboarding System
              </h3>
              <p style={{color: '#6b7280'}}>
                AI-powered resource matching for personalized training
              </p>
              <div style={{marginTop: '16px', fontSize: '0.875rem', color: '#f59e0b', fontWeight: '600'}}>
                Explore Resources →
              </div>
            </div>
          </div>

          {/* Stats Section */}
          <div style={{marginTop: '48px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px'}}>
            <div style={{background: 'white', padding: '24px', borderRadius: '8px', textAlign: 'center'}}>
              <div style={{fontSize: '2rem', fontWeight: 'bold', color: '#7c3aed'}}>{realData.coaches.length}</div>
              <div style={{color: '#6b7280', fontSize: '0.875rem'}}>Active Coaches</div>
            </div>
            <div style={{background: 'white', padding: '24px', borderRadius: '8px', textAlign: 'center'}}>
              <div style={{fontSize: '2rem', fontWeight: 'bold', color: '#2563eb'}}>{realData.stats.activeStudents || 0}</div>
              <div style={{color: '#6b7280', fontSize: '0.875rem'}}>Students</div>
            </div>
            <div style={{background: 'white', padding: '24px', borderRadius: '8px', textAlign: 'center'}}>
              <div style={{fontSize: '2rem', fontWeight: 'bold', color: '#16a34a'}}>{realData.videos.length}</div>
              <div style={{color: '#6b7280', fontSize: '0.875rem'}}>Training Videos</div>
            </div>
            <div style={{background: 'white', padding: '24px', borderRadius: '8px', textAlign: 'center'}}>
              <div style={{fontSize: '2rem', fontWeight: 'bold', color: '#f59e0b'}}>95%</div>
              <div style={{color: '#6b7280', fontSize: '0.875rem'}}>Success Rate</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Enhanced Knowledge Base View
  if (view === 'enhanced-kb') {
    return <EnhancedSmartCoachOnboarding onBack={() => setView('home')} />;
  }

  // Smart Onboarding View
  if (view === 'smart-onboarding') {
    return (
      <div>
        <button onClick={() => setView('home')} style={{padding: '8px 16px', margin: '16px'}}>← Back</button>
        <SmartCoachOnboarding />
      </div>
    );
  }

  // Training View (placeholder)
  if (view === 'training') {
    return (
      <div style={{minHeight: '100vh', background: '#f9fafb', padding: '24px'}}>
        <div style={{maxWidth: '800px', margin: '0 auto'}}>
          <button onClick={() => setView('home')} style={{marginBottom: '24px'}}>← Back</button>
          <h1 style={{fontSize: '2rem', fontWeight: 'bold', marginBottom: '24px'}}>Coach Training Program</h1>
          <p>Full training modules will be displayed here...</p>
        </div>
      </div>
    );
  }

  return null;
}

// Wrap App with AuthProvider
export default function AppWithAuth() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}