import React, { useState, useEffect, createContext, useContext } from 'react';
import knowledgeBaseService from './services/knowledgeBaseService';
import EnhancedSmartCoachOnboarding from './components/EnhancedSmartCoachOnboardingBranded';
import SmartCoachOnboarding from './components/SmartCoachOnboarding';
import dataService from './services/dataService';

// Brand Logo Components
const IvylevelLogo = ({ style = {} }) => (
  <svg style={{height: '48px', ...style}} width="16" height="24" viewBox="0 0 16 24" fill="none">
    <path d="M8.76172 11.3337V15.0312C9.15499 11.8118 11.8963 9.31723 15.2198 9.31723V16.6968C15.2198 20.294 12.305 23.2088 8.70775 23.2088V21.1076C3.96925 21.0767 0.136818 17.2289 0.136818 12.4865V2.70879C4.89845 2.70879 8.76172 6.56821 8.76172 11.3337Z" fill="#FF4A23"/>
    <path d="M7.78311 3.32667L8.29085 3.04763C8.9667 2.6762 9.5221 2.11907 9.89143 1.44207L10.1688 0.933643L10.4462 1.43917C10.8178 2.11642 11.3759 2.67289 12.0542 3.04261L12.5618 3.31929L12.057 3.5961C11.3785 3.96814 10.8212 4.52722 10.4513 5.20685L10.1761 5.71233L9.89774 5.20538C9.52591 4.52826 8.96772 3.97196 8.28935 3.60243L7.78311 3.32667Z" fill="#FF4A23"/>
  </svg>
);

const IvylevelLogoSmall = ({ style = {} }) => (
  <svg style={{height: '32px', ...style}} width="16" height="24" viewBox="0 0 16 24" fill="none">
    <path d="M8.76172 11.3337V15.0312C9.15499 11.8118 11.8963 9.31723 15.2198 9.31723V16.6968C15.2198 20.294 12.305 23.2088 8.70775 23.2088V21.1076C3.96925 21.0767 0.136818 17.2289 0.136818 12.4865V2.70879C4.89845 2.70879 8.76172 6.56821 8.76172 11.3337Z" fill="#FF4A23"/>
    <path d="M7.78311 3.32667L8.29085 3.04763C8.9667 2.6762 9.5221 2.11907 9.89143 1.44207L10.1688 0.933643L10.4462 1.43917C10.8178 2.11642 11.3759 2.67289 12.0542 3.04261L12.5618 3.31929L12.057 3.5961C11.3785 3.96814 10.8212 4.52722 10.4513 5.20685L10.1761 5.71233L9.89774 5.20538C9.52591 4.52826 8.96772 3.97196 8.28935 3.60243L7.78311 3.32667Z" fill="#FF4A23"/>
  </svg>
);

const IvylevelFullLogo = ({ style = {} }) => (
  <svg style={{width: '92px', height: '27px', ...style}} viewBox="0 0 92 27" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9.34866 11.2647V15.0609C9.75237 11.7555 12.5671 9.19429 15.9792 9.19429V16.771C15.9792 20.4644 12.9866 23.457 9.29325 23.457V21.2997C4.42835 21.2681 0.493347 17.3173 0.493347 12.4482V2.4093C5.382 2.4093 9.34866 6.37184 9.34866 11.2647Z" fill="#FE4A22"/>
    <path d="M8.34308 3.04325C9.37714 2.4749 10.2275 1.62228 10.7924 0.586304C11.3598 1.62053 12.2135 2.47106 13.2492 3.03571C12.2143 3.60315 11.364 4.45602 10.7999 5.49266C10.232 4.45868 9.3788 3.60753 8.34308 3.04325Z" fill="#FE4A22"/>
    <path d="M51.1788 5.17236H52.6249V21.5033H51.1788V5.17236Z" fill="#641432"/>
    <path d="M24.5442 6.5116H24.4901C24.0476 6.5116 23.6889 6.86935 23.6889 7.31064C23.6889 7.75197 24.0476 8.10972 24.4901 8.10972H24.5442C24.9867 8.10972 25.3454 7.75197 25.3454 7.31064C25.3454 6.86935 24.9867 6.5116 24.5442 6.5116Z" fill="#641432"/>
    <path d="M23.8066 10.2825V21.5041H25.2532V10.2825H23.8066Z" fill="#641432"/>
    <path d="M32.6366 18.448C32.7066 18.277 32.7729 18.0981 32.835 17.9115L35.6113 10.2825H37.1512L32.765 21.5041H31.2018L26.8627 10.2825H28.4725L31.2485 17.9115C31.311 18.067 31.373 18.2264 31.4351 18.3897C31.4976 18.553 31.5597 18.7047 31.6218 18.8446C31.6842 19.0468 31.7501 19.2413 31.8201 19.4279C31.8901 19.6146 31.9563 19.7935 32.0184 19.9647C32.0809 19.8089 32.1467 19.6496 32.2167 19.4862C32.2867 19.3229 32.3529 19.1479 32.415 18.9613C32.4929 18.7902 32.5666 18.6191 32.6366 18.448Z" fill="#641432"/>
    <path d="M44.4157 17.6548C44.3537 17.8103 44.2874 17.9814 44.2174 18.1681C44.1474 18.3547 44.0658 18.5413 43.9724 18.728L43.8325 19.1013C43.7858 19.2257 43.7471 19.3501 43.7158 19.4746C43.3892 18.728 43.1405 18.1292 42.9692 17.6781L40.0062 10.2825H38.3968L42.9459 21.2008L40.8461 26.4269H42.386L48.7319 10.2825H47.1921L44.4157 17.6548Z" fill="#641432"/>
    <path fill-rule="evenodd" clip-rule="evenodd" d="M63.1106 10.6771C62.364 10.1949 61.462 9.95386 60.4046 9.95386C59.4247 9.95386 58.5382 10.2066 57.7449 10.7121C56.9517 11.2176 56.3255 11.9174 55.8668 12.8118C55.4081 13.7061 55.1785 14.7132 55.1785 15.833C55.1785 17.0929 55.4002 18.1738 55.8434 19.0759C56.2867 19.9781 56.9088 20.6622 57.7099 21.1288C58.5107 21.5954 59.4401 21.8287 60.498 21.8287C61.4466 21.8287 62.2669 21.6654 62.959 21.3388C63.6514 21.0122 64.1917 20.5689 64.5804 20.0093C64.9696 19.4492 65.2183 18.8115 65.327 18.0961H63.8805C63.7405 18.936 63.3714 19.5698 62.7723 19.9977C62.1736 20.4251 61.4233 20.6389 60.5213 20.6389C59.7589 20.6389 59.0864 20.4639 58.5032 20.1143C57.9199 19.7644 57.4649 19.247 57.1383 18.5627C56.8117 17.8783 56.6405 17.0618 56.625 16.113H65.397V15.7864C65.397 14.6199 65.2029 13.5972 64.8138 12.7185C64.425 11.8397 63.8572 11.1592 63.1106 10.6771ZM56.695 14.9932C56.7884 13.8733 57.1696 12.9517 57.8382 12.2285C58.5069 11.5053 59.3622 11.1437 60.4046 11.1437C61.4466 11.1437 62.3173 11.4936 62.9239 12.1935C63.5306 12.8934 63.8418 13.8267 63.8572 14.9932H56.695Z" fill="#641432"/>
    <path d="M72.0414 18.448C72.1114 18.277 72.1777 18.0981 72.2397 17.9115L75.0161 10.2825H76.556L72.1697 21.5041H70.6066L66.2675 10.2825H67.8773L70.6532 17.9115C70.7157 18.067 70.7778 18.2264 70.8399 18.3897C70.9024 18.553 70.9645 18.7047 71.0265 18.8446C71.089 19.0468 71.1549 19.2413 71.2249 19.4279C71.2948 19.6146 71.3611 19.7935 71.4232 19.9647C71.4857 19.8089 71.5515 19.6496 71.6215 19.4862C71.6915 19.3229 71.7577 19.1479 71.8198 18.9613C71.8977 18.7902 71.9714 18.6191 72.0414 18.448Z" fill="#641432"/>
    <path fill-rule="evenodd" clip-rule="evenodd" d="M85.2609 10.6771C84.5143 10.1949 83.6123 9.95386 82.5545 9.95386C81.5746 9.95386 80.688 10.2066 79.8948 10.7121C79.1015 11.2176 78.4758 11.9174 78.0166 12.8118C77.5579 13.7061 77.3284 14.7132 77.3284 15.833C77.3284 17.0929 77.55 18.1738 77.9933 19.0759C78.4366 19.9781 79.059 20.6622 79.8598 21.1288C80.6609 21.5954 81.59 21.8287 82.6478 21.8287C83.5965 21.8287 84.4168 21.6654 85.1092 21.3388C85.8012 21.0122 86.3416 20.5689 86.7307 20.0093C87.1194 19.4492 87.3681 18.8115 87.4773 18.0961H86.0308C85.8908 18.936 85.5213 19.5698 84.9226 19.9977C84.3235 20.4251 83.5731 20.6389 82.6711 20.6389C81.9091 20.6389 81.2363 20.4639 80.653 20.1143C80.0698 19.7644 79.6148 19.247 79.2882 18.5627C78.9615 17.8783 78.7907 17.0618 78.7749 16.113H87.5473V15.7864C87.5473 14.6199 87.3527 13.5972 86.964 12.7185C86.5749 11.8397 86.0075 11.1592 85.2609 10.6771ZM78.8449 14.9932C78.9382 13.8733 79.3194 12.9517 79.9881 12.2285C80.6568 11.5053 81.5125 11.1437 82.5545 11.1437C83.5965 11.1437 84.4676 11.4936 85.0742 12.1935C85.6808 12.8934 85.9916 13.8267 86.0075 14.9932H78.8449Z" fill="#641432"/>
    <path d="M90.0909 5.17236H91.5374V21.5033H90.0909V5.17236Z" fill="#641432"/>
  </svg>
);

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
  
  const updateProgress = (moduleId, data) => {
    if (user && userData) {
      mockDatabase.users[user.uid].progress[moduleId] = {
        ...mockDatabase.users[user.uid].progress[moduleId],
        ...data
      };
      setUserData({
        ...userData,
        progress: mockDatabase.users[user.uid].progress
      });
    }
  };
  
  return (
    <AuthContext.Provider value={{ 
      user, 
      userData, 
      loading, 
      login, 
      logout,
      updateProgress
    }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => useContext(AuthContext);

// Login Page Component - Polished UI with Brand Colors
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
    <div style={{minHeight: '100vh', background: 'linear-gradient(135deg, #FFE5DF, #F5E8E5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px'}}>
      <div style={{maxWidth: '960px', width: '100%', display: 'flex', gap: '48px', alignItems: 'center'}}>
        {/* Left Side - Login Form */}
        <div style={{flex: 1, background: 'white', borderRadius: '16px', padding: '48px', boxShadow: '0 20px 40px rgba(100,20,50,0.1)'}}>
          <div style={{textAlign: 'center', marginBottom: '32px'}}>
            <IvylevelFullLogo style={{ margin: '0 auto 24px' }} />
            <h1 style={{fontSize: '2rem', fontWeight: 'bold', color: '#111827', marginBottom: '8px'}}>Welcome Back</h1>
            <p style={{color: '#6b7280'}}>Sign in to your Ivylevel Elite Coach account</p>
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
                onFocus={(e) => e.target.style.borderColor = '#FF4A23'}
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
                  onFocus={(e) => e.target.style.borderColor = '#FF4A23'}
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
                background: loading ? '#9ca3af' : 'linear-gradient(135deg, #FF4A23, #FF6B47)',
                color: 'white',
                borderRadius: '8px',
                fontWeight: 'bold',
                fontSize: '1.125rem',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: loading ? 'none' : '0 10px 20px rgba(255, 74, 35, 0.3)'
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
                    background: '#FFE5DF',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    color: '#641432',
                    textAlign: 'left',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#FFC9BD'}
                  onMouseLeave={(e) => e.target.style.background = '#FFE5DF'}
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
          <h2 style={{fontSize: '2.5rem', fontWeight: 'bold', color: '#641432', marginBottom: '16px'}}>
            Ivylevel Elite Coach Portal
          </h2>
          <p style={{fontSize: '1.125rem', color: '#6b7280', lineHeight: '1.6', marginBottom: '32px'}}>
            Join the exclusive network of coaches helping students achieve their Ivy League dreams.
          </p>
          
          <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
              <div style={{width: '48px', height: '48px', background: '#FFE5DF', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <svg style={{width: '24px', height: '24px', color: '#FF4A23'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <h3 style={{fontWeight: '600', color: '#111827'}}>Comprehensive Training</h3>
                <p style={{fontSize: '0.875rem', color: '#6b7280'}}>Master the Ivylevel methodology in 48 hours</p>
              </div>
            </div>
            
            <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
              <div style={{width: '48px', height: '48px', background: '#FFE5DF', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <svg style={{width: '24px', height: '24px', color: '#FF4A23'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h3 style={{fontWeight: '600', color: '#111827'}}>Impact Lives</h3>
                <p style={{fontSize: '0.875rem', color: '#6b7280'}}>Guide students to their dream colleges</p>
              </div>
            </div>
            
            <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
              <div style={{width: '48px', height: '48px', background: '#FFE5DF', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <svg style={{width: '24px', height: '24px', color: '#FF4A23'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

// Training Module Components
const TrainingModules = ({ userData, onComplete }) => {
  const { updateProgress } = useAuth();
  const [currentModule, setCurrentModule] = useState(0);
  const [moduleData, setModuleData] = useState({});
  
  const modules = [
    { id: 'welcome', name: 'Welcome & Commitment', icon: '🎯' },
    { id: 'mastery', name: 'Student Mastery', icon: '📚' },
    { id: 'technical', name: 'Technical Setup', icon: '💻' },
    { id: 'simulation', name: 'Session Practice', icon: '🎬' },
    { id: 'certification', name: 'Final Certification', icon: '🏆' }
  ];
  
  const handleModuleComplete = (moduleId, data = {}) => {
    updateProgress(moduleId, { completed: true, ...data });
    if (currentModule < modules.length - 1) {
      setCurrentModule(currentModule + 1);
    } else {
      onComplete();
    }
  };
  
  // Sample quiz questions for mastery module
  const masteryQuestions = [
    {
      id: 1,
      question: "What is the primary goal of the IvyLevel coaching methodology?",
      options: [
        "To guarantee admission to Ivy League schools",
        "To help students discover and articulate their unique value proposition",
        "To write essays for students",
        "To increase test scores only"
      ],
      correct: 1
    },
    {
      id: 2,
      question: "When working with a pre-med student, what should be your primary focus?",
      options: [
        "Only improving their science grades",
        "Building a compelling narrative around their healthcare passion and experiences",
        "Telling them to volunteer at any hospital",
        "Focusing solely on MCAT preparation"
      ],
      correct: 1
    },
    {
      id: 3,
      question: "How should you handle cultural differences in coaching sessions?",
      options: [
        "Ignore them and treat all students the same",
        "Actively listen and incorporate cultural perspectives into the student's narrative",
        "Tell students to hide their cultural background",
        "Only focus on American values"
      ],
      correct: 1
    }
  ];
  
  const [quizAnswers, setQuizAnswers] = useState({});
  const [showQuizResults, setShowQuizResults] = useState(false);
  
  const calculateQuizScore = () => {
    let correct = 0;
    masteryQuestions.forEach(q => {
      if (quizAnswers[q.id] === q.correct) correct++;
    });
    return Math.round((correct / masteryQuestions.length) * 100);
  };
  
  const renderModule = () => {
    const module = modules[currentModule];
    
    switch (module.id) {
      case 'welcome':
        return (
          <div>
            <h2 style={{fontSize: '2rem', fontWeight: 'bold', marginBottom: '24px', color: '#641432'}}>
              Welcome to IvyLevel Elite Coaching
            </h2>
            <div style={{background: 'linear-gradient(135deg, #FF4A23, #FF6B47)', borderRadius: '12px', padding: '32px', color: 'white', marginBottom: '24px'}}>
              <p style={{fontSize: '1.125rem', lineHeight: '1.6', marginBottom: '16px'}}>
                You're about to embark on a transformative journey that will impact countless student lives.
              </p>
              <p style={{fontSize: '1.125rem', lineHeight: '1.6'}}>
                Your assigned student, <strong>{userData.student.name}</strong>, is counting on your expertise 
                to guide them to their dream college.
              </p>
            </div>
            <button
              onClick={() => handleModuleComplete('welcome')}
              style={{
                padding: '16px 32px',
                background: 'linear-gradient(135deg, #FF4A23, #FF6B47)',
                color: 'white',
                borderRadius: '8px',
                fontWeight: 'bold',
                fontSize: '1.125rem',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              I'm Ready to Make a Difference
            </button>
          </div>
        );
        
      case 'mastery':
        return (
          <div>
            <h2 style={{fontSize: '2rem', fontWeight: 'bold', marginBottom: '24px', color: '#641432'}}>
              Student Mastery Assessment
            </h2>
            {!showQuizResults ? (
              <div>
                {masteryQuestions.map((q, idx) => (
                  <div key={q.id} style={{marginBottom: '24px', padding: '24px', background: '#f9fafb', borderRadius: '8px'}}>
                    <p style={{fontWeight: '600', marginBottom: '16px'}}>{idx + 1}. {q.question}</p>
                    {q.options.map((option, optIdx) => (
                      <label key={optIdx} style={{display: 'block', marginBottom: '8px', cursor: 'pointer'}}>
                        <input
                          type="radio"
                          name={`question-${q.id}`}
                          value={optIdx}
                          onChange={() => setQuizAnswers({...quizAnswers, [q.id]: optIdx})}
                          style={{marginRight: '8px'}}
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                ))}
                <button
                  onClick={() => {
                    const score = calculateQuizScore();
                    setShowQuizResults(true);
                    handleModuleComplete('mastery', { score });
                  }}
                  disabled={Object.keys(quizAnswers).length < masteryQuestions.length}
                  style={{
                    padding: '16px 32px',
                    background: Object.keys(quizAnswers).length < masteryQuestions.length ? '#9ca3af' : 'linear-gradient(135deg, #FF4A23, #FF6B47)',
                    color: 'white',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    fontSize: '1.125rem',
                    border: 'none',
                    cursor: Object.keys(quizAnswers).length < masteryQuestions.length ? 'not-allowed' : 'pointer'
                  }}
                >
                  Submit Assessment
                </button>
              </div>
            ) : (
              <div style={{textAlign: 'center'}}>
                <div style={{fontSize: '3rem', fontWeight: 'bold', color: calculateQuizScore() >= 80 ? '#FF4A23' : '#dc2626', marginBottom: '16px'}}>
                  {calculateQuizScore()}%
                </div>
                <p style={{fontSize: '1.125rem', marginBottom: '24px'}}>
                  {calculateQuizScore() >= 80 ? 'Excellent work! You understand our methodology.' : 'Please review the materials and try again.'}
                </p>
                <button
                  onClick={() => {
                    if (calculateQuizScore() >= 80) {
                      setCurrentModule(currentModule + 1);
                    } else {
                      setShowQuizResults(false);
                      setQuizAnswers({});
                    }
                  }}
                  style={{
                    padding: '16px 32px',
                    background: 'linear-gradient(135deg, #FF4A23, #FF6B47)',
                    color: 'white',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    fontSize: '1.125rem',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {calculateQuizScore() >= 80 ? 'Continue to Next Module' : 'Try Again'}
                </button>
              </div>
            )}
          </div>
        );
        
      case 'technical':
        return (
          <div>
            <h2 style={{fontSize: '2rem', fontWeight: 'bold', marginBottom: '24px', color: '#641432'}}>
              Technical Setup & Tools
            </h2>
            <div style={{display: 'grid', gap: '16px', marginBottom: '24px'}}>
              <div style={{padding: '24px', background: '#f9fafb', borderRadius: '8px', border: '2px solid #e5e7eb'}}>
                <h3 style={{fontWeight: '600', marginBottom: '8px'}}>✓ Zoom Professional Account</h3>
                <p style={{color: '#6b7280'}}>Required for extended coaching sessions</p>
              </div>
              <div style={{padding: '24px', background: '#f9fafb', borderRadius: '8px', border: '2px solid #e5e7eb'}}>
                <h3 style={{fontWeight: '600', marginBottom: '8px'}}>✓ Google Workspace Access</h3>
                <p style={{color: '#6b7280'}}>For collaborative document editing</p>
              </div>
              <div style={{padding: '24px', background: '#f9fafb', borderRadius: '8px', border: '2px solid #e5e7eb'}}>
                <h3 style={{fontWeight: '600', marginBottom: '8px'}}>✓ IvyLevel Platform Login</h3>
                <p style={{color: '#6b7280'}}>Your coaching dashboard and resources</p>
              </div>
            </div>
            <button
              onClick={() => handleModuleComplete('technical')}
              style={{
                padding: '16px 32px',
                background: 'linear-gradient(135deg, #FF4A23, #FF6B47)',
                color: 'white',
                borderRadius: '8px',
                fontWeight: 'bold',
                fontSize: '1.125rem',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              All Systems Ready
            </button>
          </div>
        );
        
      case 'simulation':
        return (
          <div>
            <h2 style={{fontSize: '2rem', fontWeight: 'bold', marginBottom: '24px', color: '#641432'}}>
              Practice Session Simulation
            </h2>
            <div style={{background: '#FFE5DF', borderRadius: '12px', padding: '24px', marginBottom: '24px'}}>
              <p style={{fontWeight: '600', marginBottom: '16px'}}>Scenario:</p>
              <p style={{lineHeight: '1.6'}}>
                {userData.student.name} feels overwhelmed by the college application process and doesn't know where to start. 
                They have strong academics but struggle to articulate their unique story.
              </p>
            </div>
            <div style={{marginBottom: '24px'}}>
              <p style={{fontWeight: '600', marginBottom: '8px'}}>How would you approach this first session?</p>
              <textarea
                placeholder="Describe your approach..."
                style={{
                  width: '100%',
                  minHeight: '150px',
                  padding: '12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '1rem'
                }}
              />
            </div>
            <button
              onClick={() => handleModuleComplete('simulation', { score: 85 })}
              style={{
                padding: '16px 32px',
                background: 'linear-gradient(135deg, #FF4A23, #FF6B47)',
                color: 'white',
                borderRadius: '8px',
                fontWeight: 'bold',
                fontSize: '1.125rem',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Submit Response
            </button>
          </div>
        );
        
      case 'certification':
        return (
          <div style={{textAlign: 'center'}}>
            <div style={{fontSize: '4rem', marginBottom: '24px'}}>🎉</div>
            <h2 style={{fontSize: '2rem', fontWeight: 'bold', marginBottom: '16px', color: '#641432'}}>
              Congratulations!
            </h2>
            <p style={{fontSize: '1.125rem', marginBottom: '32px', color: '#6b7280'}}>
              You are now a Certified IvyLevel Elite Coach
            </p>
            <div style={{background: 'linear-gradient(135deg, #FF4A23, #FF6B47)', borderRadius: '12px', padding: '32px', color: 'white', marginBottom: '24px', maxWidth: '400px', margin: '0 auto 24px'}}>
              <p style={{fontWeight: '600', marginBottom: '8px'}}>Your First Student:</p>
              <p style={{fontSize: '1.25rem', fontWeight: 'bold'}}>{userData.student.name}</p>
              <p>{userData.student.grade} • {userData.student.focusArea}</p>
            </div>
            <button
              onClick={() => handleModuleComplete('certification')}
              style={{
                padding: '16px 32px',
                background: 'linear-gradient(135deg, #FF4A23, #FF6B47)',
                color: 'white',
                borderRadius: '8px',
                fontWeight: 'bold',
                fontSize: '1.125rem',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Begin Coaching Journey
            </button>
          </div>
        );
        
      default:
        return null;
    }
  };
  
  const completedCount = Object.values(userData.progress || {}).filter(p => p.completed).length;
  const progressPercent = (completedCount / modules.length) * 100;
  
  return (
    <div style={{minHeight: '100vh', background: '#f9fafb', padding: '24px'}}>
      <div style={{maxWidth: '800px', margin: '0 auto'}}>
        {/* Progress Bar */}
        <div style={{marginBottom: '32px'}}>
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px'}}>
            <h3 style={{fontWeight: '600', color: '#374151'}}>Training Progress</h3>
            <span style={{fontSize: '0.875rem', color: '#6b7280'}}>{completedCount} of {modules.length} modules</span>
          </div>
          <div style={{height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden'}}>
            <div style={{
              height: '100%',
              background: 'linear-gradient(135deg, #FF4A23, #FF6B47)',
              width: `${progressPercent}%`,
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>
        
        {/* Module Navigation */}
        <div style={{display: 'flex', gap: '8px', marginBottom: '32px', overflowX: 'auto'}}>
          {modules.map((module, idx) => {
            const isCompleted = userData.progress?.[module.id]?.completed;
            const isCurrent = idx === currentModule;
            
            return (
              <button
                key={module.id}
                onClick={() => isCompleted || isCurrent ? setCurrentModule(idx) : null}
                style={{
                  padding: '8px 16px',
                  background: isCompleted ? '#10b981' : isCurrent ? '#FF4A23' : '#e5e7eb',
                  color: isCompleted || isCurrent ? 'white' : '#6b7280',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: isCompleted || isCurrent ? 'pointer' : 'not-allowed',
                  fontSize: '0.875rem',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span>{module.icon}</span>
                <span>{module.name}</span>
                {isCompleted && <span>✓</span>}
              </button>
            );
          })}
        </div>
        
        {/* Module Content */}
        <div style={{background: 'white', borderRadius: '12px', padding: '32px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)'}}>
          {renderModule()}
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

  // Coach Training View
  if (view === 'training' && userData.role === 'coach') {
    return <TrainingModules userData={userData} onComplete={() => setView('home')} />;
  }

  // Home Dashboard - Enhanced with new features
  if (view === 'home') {
    return (
      <div style={{minHeight: '100vh', background: '#f9fafb'}}>
        {/* Header */}
        <div style={{background: 'white', borderBottom: '1px solid #e5e7eb', padding: '16px 24px'}}>
          <div style={{maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
              <IvylevelLogoSmall />
              <div style={{fontSize: '0.875rem', color: '#6b7280'}}>Elite Coach Training Platform</div>
            </div>
            <div style={{display: 'flex', alignItems: 'center', gap: '24px'}}>
              <div style={{textAlign: 'right'}}>
                <div style={{fontSize: '0.875rem', color: '#6b7280'}}>Welcome back</div>
                <div style={{fontWeight: '600', color: '#641432'}}>{userData.name}</div>
              </div>
              <button
                onClick={() => logout()}
                style={{
                  padding: '8px 16px',
                  background: '#FFE5DF',
                  color: '#641432',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div style={{maxWidth: '1200px', margin: '0 auto', padding: '32px 24px'}}>
          <h1 style={{fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '32px', textAlign: 'center', color: '#641432'}}>
            Welcome to Ivylevel Elite Coach Portal
          </h1>

          {/* Feature Cards */}
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px'}}>
            {/* Enhanced Knowledge Base */}
            <div
              onClick={() => setView('enhanced-kb')}
              style={{
                background: 'linear-gradient(135deg, #FF4A23, #FF6B47)',
                color: 'white',
                borderRadius: '12px',
                padding: '32px',
                cursor: 'pointer',
                transition: 'transform 0.2s',
                boxShadow: '0 20px 40px rgba(255, 74, 35, 0.3)'
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
                border: '2px solid #FFE5DF',
                boxShadow: '0 10px 20px rgba(100,20,50,0.05)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#FF4A23';
                e.currentTarget.style.transform = 'scale(1.02)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#FFE5DF';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <div style={{fontSize: '48px', marginBottom: '16px'}}>🎓</div>
              <h3 style={{fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '8px', color: '#641432'}}>
                Complete Training Program
              </h3>
              <p style={{color: '#6b7280'}}>
                5-module certification program with quizzes and simulations
              </p>
              <div style={{marginTop: '16px', fontSize: '0.875rem', color: '#FF4A23', fontWeight: '600'}}>
                {userData.role === 'coach' ? 'Continue Training →' : 'View Program →'}
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
                border: '2px solid #FFE5DF',
                boxShadow: '0 10px 20px rgba(100,20,50,0.05)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#FF4A23';
                e.currentTarget.style.transform = 'scale(1.02)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#FFE5DF';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <div style={{fontSize: '48px', marginBottom: '16px'}}>🎯</div>
              <h3 style={{fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '8px', color: '#641432'}}>
                Smart Onboarding System
              </h3>
              <p style={{color: '#6b7280'}}>
                AI-powered resource matching for personalized training
              </p>
              <div style={{marginTop: '16px', fontSize: '0.875rem', color: '#FF4A23', fontWeight: '600'}}>
                Explore Resources →
              </div>
            </div>
          </div>

          {/* Stats Section */}
          <div style={{marginTop: '48px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px'}}>
            <div style={{background: 'white', padding: '24px', borderRadius: '8px', textAlign: 'center', border: '1px solid #FFE5DF'}}>
              <div style={{fontSize: '2rem', fontWeight: 'bold', color: '#FF4A23'}}>{realData.coaches.length}</div>
              <div style={{color: '#6b7280', fontSize: '0.875rem'}}>Active Coaches</div>
            </div>
            <div style={{background: 'white', padding: '24px', borderRadius: '8px', textAlign: 'center', border: '1px solid #FFE5DF'}}>
              <div style={{fontSize: '2rem', fontWeight: 'bold', color: '#641432'}}>{realData.stats.activeStudents || 0}</div>
              <div style={{color: '#6b7280', fontSize: '0.875rem'}}>Students</div>
            </div>
            <div style={{background: 'white', padding: '24px', borderRadius: '8px', textAlign: 'center', border: '1px solid #FFE5DF'}}>
              <div style={{fontSize: '2rem', fontWeight: 'bold', color: '#16a34a'}}>{realData.videos.length}</div>
              <div style={{color: '#6b7280', fontSize: '0.875rem'}}>Training Videos</div>
            </div>
            <div style={{background: 'white', padding: '24px', borderRadius: '8px', textAlign: 'center', border: '1px solid #FFE5DF'}}>
              <div style={{fontSize: '2rem', fontWeight: 'bold', color: '#FF4A23'}}>95%</div>
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
        <button 
          onClick={() => setView('home')} 
          style={{
            padding: '8px 16px', 
            margin: '16px',
            background: '#FFE5DF',
            color: '#641432',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          ← Back
        </button>
        <SmartCoachOnboarding />
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