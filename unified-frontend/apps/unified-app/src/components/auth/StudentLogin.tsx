import React, { useState } from 'react';
import useAuth from '../../hooks/useAuthMock';
import { cognitoAuthService } from '../../services/auth/cognitoAuthService';
import { useNavigate } from 'react-router-dom';

interface StudentLoginProps {
  onSuccess?: () => void;
  onRegister?: () => void;
  onBack?: () => void;
}

// Brand Logo Components
const IvylevelFullLogo = ({ style = {} }) => (
  <svg style={{width: '92px', height: '27px', ...style}} viewBox="0 0 92 27" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9.34866 11.2647V15.0609C9.75237 11.7555 12.5671 9.19429 15.9792 9.19429V16.771C15.9792 20.4644 12.9866 23.457 9.29325 23.457V21.2997C4.42835 21.2681 0.493347 17.3173 0.493347 12.4482V2.4093C5.382 2.4093 9.34866 6.37184 9.34866 11.2647Z" fill="#FE4A22"/>
    <path d="M8.34308 3.04325C9.37714 2.4749 10.2275 1.62228 10.7924 0.586304C11.3598 1.62053 12.2135 2.47106 13.2492 3.03571C12.2143 3.60315 11.364 4.45602 10.7999 5.49266C10.232 4.45868 9.3788 3.60753 8.34308 3.04325Z" fill="#FE4A22"/>
    <path d="M51.1788 5.17236H52.6249V21.5033H51.1788V5.17236Z" fill="#641432"/>
    <path d="M24.5442 6.5116H24.4901C24.0476 6.5116 23.6889 6.86935 23.6889 7.31064C23.6889 7.75197 24.0476 8.10972 24.4901 8.10972H24.5442C24.9867 8.10972 25.3454 7.75197 25.3454 7.31064C25.3454 6.86935 24.9867 6.5116 24.5442 6.5116Z" fill="#641432"/>
    <path d="M23.8066 10.2825V21.5041H25.2532V10.2825H23.8066Z" fill="#641432"/>
    <path d="M32.6366 18.448C32.7066 18.277 32.7729 18.0981 32.835 17.9115L35.6113 10.2825H37.1512L32.765 21.5041H31.2018L26.8627 10.2825H28.4725L31.2485 17.9115C31.311 18.067 31.373 18.2264 31.4351 18.3897C31.4976 18.553 31.5597 18.7047 31.6218 18.8446C31.6842 19.0468 31.7501 19.2413 31.8201 19.4279C31.8901 19.6146 31.9563 19.7935 32.0184 19.9647C32.0809 19.8089 32.1467 19.6496 32.2167 19.4862C32.2867 19.3229 32.3529 19.1479 32.415 18.9613C32.4929 18.7902 32.5666 18.6191 32.6366 18.448Z" fill="#641432"/>
    <path d="M44.4157 17.6548C44.3537 17.8103 44.2874 17.9814 44.2174 18.1681C44.1474 18.3547 44.0658 18.5413 43.9724 18.728L43.8325 19.1013C43.7858 19.2257 43.7471 19.3501 43.7158 19.4746C43.3892 18.728 43.1405 18.1292 42.9692 17.6781L40.0062 10.2825H38.3968L42.9459 21.2008L40.8461 26.4269H42.386L48.7319 10.2825H47.1921L44.4157 17.6548Z" fill="#641432"/>
    <path fillRule="evenodd" clipRule="evenodd" d="M63.1106 10.6771C62.364 10.1949 61.462 9.95386 60.4046 9.95386C59.4247 9.95386 58.5382 10.2066 57.7449 10.7121C56.9517 11.2176 56.3255 11.9174 55.8668 12.8118C55.4081 13.7061 55.1785 14.7132 55.1785 15.833C55.1785 17.0929 55.4002 18.1738 55.8434 19.0759C56.2867 19.9781 56.9088 20.6622 57.7099 21.1288C58.5107 21.5954 59.4401 21.8287 60.498 21.8287C61.4466 21.8287 62.2669 21.6654 62.959 21.3388C63.6514 21.0122 64.1917 20.5689 64.5804 20.0093C64.9696 19.4492 65.2183 18.8115 65.327 18.0961H63.8805C63.7405 18.936 63.3714 19.5698 62.7723 19.9977C62.1736 20.4251 61.4233 20.6389 60.5213 20.6389C59.7589 20.6389 59.0864 20.4639 58.5032 20.1143C57.9199 19.7644 57.4649 19.247 57.1383 18.5627C56.8117 17.8783 56.6405 17.0618 56.625 16.113H65.397V15.7864C65.397 14.6199 65.2029 13.5972 64.8138 12.7185C64.425 11.8397 63.8572 11.1592 63.1106 10.6771ZM56.695 14.9932C56.7884 13.8733 57.1696 12.9517 57.8382 12.2285C58.5069 11.5053 59.3622 11.1437 60.4046 11.1437C61.4466 11.1437 62.3173 11.4936 62.9239 12.1935C63.5306 12.8934 63.8418 13.8267 63.8572 14.9932H56.695Z" fill="#641432"/>
    <path d="M72.0414 18.448C72.1114 18.277 72.1777 18.0981 72.2397 17.9115L75.0161 10.2825H76.556L72.1697 21.5041H70.6066L66.2675 10.2825H67.8773L70.6532 17.9115C70.7157 18.067 70.7778 18.2264 70.8399 18.3897C70.9024 18.553 70.9645 18.7047 71.0265 18.8446C71.089 19.0468 71.1549 19.2413 71.2249 19.4279C71.2948 19.6146 71.3611 19.7935 71.4232 19.9647C71.4857 19.8089 71.5515 19.6496 71.6215 19.4862C71.6915 19.3229 71.7577 19.1479 71.8198 18.9613C71.8977 18.7902 71.9714 18.6191 72.0414 18.448Z" fill="#641432"/>
    <path fillRule="evenodd" clipRule="evenodd" d="M85.2609 10.6771C84.5143 10.1949 83.6123 9.95386 82.5545 9.95386C81.5746 9.95386 80.688 10.2066 79.8948 10.7121C79.1015 11.2176 78.4758 11.9174 78.0166 12.8118C77.5579 13.7061 77.3284 14.7132 77.3284 15.833C77.3284 17.0929 77.55 18.1738 77.9933 19.0759C78.4366 19.9781 79.059 20.6622 79.8598 21.1288C80.6609 21.5954 81.59 21.8287 82.6478 21.8287C83.5965 21.8287 84.4168 21.6654 85.1092 21.3388C85.8012 21.0122 86.3416 20.5689 86.7307 20.0093C87.1194 19.4492 87.3681 18.8115 87.4773 18.0961H86.0308C85.8908 18.936 85.5213 19.5698 84.9226 19.9977C84.3235 20.4251 83.5731 20.6389 82.6711 20.6389C81.9091 20.6389 81.2363 20.4639 80.653 20.1143C80.0698 19.7644 79.6148 19.247 79.2882 18.5627C78.9615 17.8783 78.7907 17.0618 78.7749 16.113H87.5473V15.7864C87.5473 14.6199 87.3527 13.5972 86.964 12.7185C86.5749 11.8397 86.0075 11.1592 85.2609 10.6771ZM78.8449 14.9932C78.9382 13.8733 79.3194 12.9517 79.9881 12.2285C80.6568 11.5053 81.5125 11.1437 82.5545 11.1437C83.5965 11.1437 84.4676 11.4936 85.0742 12.1935C85.6808 12.8934 85.9916 13.8267 86.0075 14.9932H78.8449Z" fill="#641432"/>
    <path d="M90.0909 5.17236H91.5374V21.5033H90.0909V5.17236Z" fill="#641432"/>
  </svg>
);

export const StudentLogin: React.FC<StudentLoginProps> = ({ onSuccess, onRegister, onBack }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login: authLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Use authLogin which tries Agent Framework JWT first, then falls back to other methods
      const result = await authLogin(email, password);
      console.log('Login result:', result);

      if (result.success) {
        console.log('Login successful, user:', result.user);

        if (onSuccess) {
          console.log('Calling onSuccess callback');
          onSuccess();
        } else {
          const user = result.user;
          console.log('No onSuccess callback, navigating based on role:', user?.role);
          // Use window.location for a full page reload to ensure auth state is recognized
          if (user?.role === 'admin') {
            console.log('Navigating to /admin');
            window.location.href = '/admin';
          } else if (user?.role === 'coach') {
            console.log('Navigating to /coach');
            window.location.href = '/coach';
          } else {
            console.log('Navigating to /student');
            window.location.href = '/student';
          }
        }
      } else {
        console.log('Login failed:', result.message);
        setError(result.message || 'Invalid email or password');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred during login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Responsive container styles
  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #FFE5DF, #F5E8E5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    boxSizing: 'border-box'
  };

  const mainContainerStyle: React.CSSProperties = {
    maxWidth: '1200px',
    width: '100%',
    display: 'flex',
    gap: '48px',
    alignItems: 'center',
    boxSizing: 'border-box'
  };

  const loginSectionStyle: React.CSSProperties = {
    flex: '0 0 450px',
    minWidth: '400px',
    background: 'white',
    borderRadius: '16px',
    padding: '48px',
    boxShadow: '0 20px 40px rgba(100,20,50,0.1)',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    position: 'relative'
  };

  const marketingSectionStyle: React.CSSProperties = {
    flex: '1',
    minWidth: '400px',
    boxSizing: 'border-box'
  };

  // Mobile responsive styles
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  
  if (isMobile) {
    mainContainerStyle.flexDirection = 'column';
    mainContainerStyle.gap = '32px';
    mainContainerStyle.maxWidth = '100%';
    loginSectionStyle.flex = 'none';
    loginSectionStyle.width = '100%';
    loginSectionStyle.minWidth = 'unset';
    loginSectionStyle.padding = '32px 24px';
    marketingSectionStyle.flex = 'none';
    marketingSectionStyle.minWidth = 'unset';
  }

  return (
    <div style={containerStyle}>
      <div style={mainContainerStyle}>
        {/* Left Side - Login Form */}
        <div style={loginSectionStyle}>
          <div style={{textAlign: 'center', marginBottom: '32px'}}>
            {onBack && (
              <button
                onClick={onBack}
                style={{
                  position: 'absolute',
                  top: '16px',
                  left: '16px',
                  background: 'none',
                  border: 'none',
                  color: '#6b7280',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '8px',
                  borderRadius: '6px',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => (e.target as HTMLElement).style.background = 'rgba(0,0,0,0.05)'}
                onMouseLeave={(e) => (e.target as HTMLElement).style.background = 'none'}
              >
                ← Change role
              </button>
            )}
            <IvylevelFullLogo style={{ margin: '0 auto 24px' }} />
            <h1 style={{fontSize: '2rem', fontWeight: 'bold', color: '#111827', marginBottom: '8px'}}>Student Login</h1>
            <p style={{color: '#6b7280'}}>Sign in to your Ivylevel student account</p>
            {onRegister && (
              <p style={{fontSize: '0.875rem', color: '#6b7280', marginTop: '8px'}}>
                Don't have an account?{' '}
                <button
                  onClick={onRegister}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#FE4A22',
                    cursor: 'pointer',
                    fontWeight: '600',
                    textDecoration: 'underline'
                  }}
                >
                  Create one here
                </button>
              </p>
            )}
          </div>
          
          <form onSubmit={handleSubmit} style={{width: '100%'}}>
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
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = '#FF4A23'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                placeholder="Enter your email"
              />
            </div>
            
            <div style={{marginBottom: '24px'}}>
              <label style={{display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151'}}>
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = '#FF4A23'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                placeholder="Enter your password"
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '16px',
                background: 'linear-gradient(135deg, #FF4A23, #FF6B47)',
                color: 'white',
                borderRadius: '8px',
                fontWeight: 'bold',
                fontSize: '1.125rem',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 10px 20px rgba(255, 74, 35, 0.3)',
                opacity: loading ? 0.7 : 1,
                boxSizing: 'border-box'
              }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
        
        {/* Right Side - Student-Specific Marketing */}
        <div style={marketingSectionStyle}>
          <h2 style={{fontSize: '2.5rem', fontWeight: 'bold', color: '#641432', marginBottom: '16px'}}>
            Ivylevel Student Portal
          </h2>
          <p style={{fontSize: '1.125rem', color: '#6b7280', lineHeight: '1.6', marginBottom: '32px'}}>
            Your data-driven path to Ivy+ acceptance.
          </p>
          
          <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
              <div style={{width: '48px', height: '48px', background: '#FFE5DF', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 22H21" stroke="#FF4A23" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M5.6 8.4V17H8.4V8.4C8.4 7.1 8 6.7 6.7 6.7H7.3C6 6.7 5.6 7.1 5.6 8.4Z" stroke="#FF4A23" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M10.6 12.8V17H13.4V12.8C13.4 11.5 13 11.1 11.7 11.1H12.3C11 11.1 10.6 11.5 10.6 12.8Z" stroke="#FF4A23" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M15.6 5V17H18.4V5C18.4 3.7 18 3.3 16.7 3.3H17.3C16 3.3 15.6 3.7 15.6 5Z" stroke="#FF4A23" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <h3 style={{fontWeight: '600', color: '#111827'}}>Ivy+ Score</h3>
                <p style={{fontSize: '0.875rem', color: '#6b7280'}}>Know your real-time readiness for top colleges</p>
              </div>
            </div>
            
            <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
              <div style={{width: '48px', height: '48px', background: '#FFE5DF', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 22C17.5 22 22 17.5 22 12C22 6.5 17.5 2 12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22Z" stroke="#FF4A23" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 18C15.3 18 18 15.3 18 12C18 8.7 15.3 6 12 6C8.7 6 6 8.7 6 12C6 15.3 8.7 18 12 18Z" stroke="#FF4A23" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 14C13.1 14 14 13.1 14 12C14 10.9 13.1 10 12 10C10.9 10 10 10.9 10 12C10 13.1 10.9 14 12 14Z" stroke="#FF4A23" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <h3 style={{fontWeight: '600', color: '#111827'}}>Precision Game Plan</h3>
                <p style={{fontSize: '0.875rem', color: '#6b7280'}}>Dynamic strategy that adapts to your progress</p>
              </div>
            </div>
            
            <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
              <div style={{width: '48px', height: '48px', background: '#FFE5DF', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 5H4C2.9 5 2 5.9 2 7V15C2 16.1 2.9 17 4 17H20C21.1 17 22 16.1 22 15V7C22 5.9 21.1 5 20 5Z" stroke="#FF4A23" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M8 20H16" stroke="#FF4A23" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 17V20" stroke="#FF4A23" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <h3 style={{fontWeight: '600', color: '#111827'}}>Smart Opportunities</h3>
                <p style={{fontSize: '0.875rem', color: '#6b7280'}}>AI-powered engine maximizes your win probability</p>
              </div>
            </div>
            
            <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
              <div style={{width: '48px', height: '48px', background: '#FFE5DF', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 6L9 17L4 12" stroke="#FF4A23" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <h3 style={{fontWeight: '600', color: '#111827'}}>Weekly Execution</h3>
                <p style={{fontSize: '0.875rem', color: '#6b7280'}}>Hyper-specific, actionable plans that deliver results</p>
              </div>
            </div>
          </div>

          {/* Social Proof Section */}
          <div style={{background: 'white', borderRadius: '12px', padding: '24px', marginTop: '32px', boxShadow: '0 10px 20px rgba(100,20,50,0.1)'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px'}}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 15C15.3 15 18 12.3 18 9V4H6V9C6 12.3 8.7 15 12 15Z" stroke="#FF4A23" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 15V19" stroke="#FF4A23" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8 19H16" stroke="#FF4A23" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M18 7H20C21.1 7 22 7.9 22 9C22 10.1 21.1 11 20 11H18.5" stroke="#FF4A23" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M6 7H4C2.9 7 2 7.9 2 9C2 10.1 2.9 11 4 11H5.5" stroke="#FF4A23" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span style={{fontSize: '18px', fontWeight: '600', color: '#641432'}}>Join 3,247 Students Already Accepted to Top 20 Schools</span>
            </div>
            
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px'}}>
              <div style={{textAlign: 'center'}}>
                <div style={{fontSize: '18px', fontWeight: '700', color: '#FF4A23'}}>92%</div>
                <div style={{fontSize: '12px', color: '#6b7280', marginTop: '4px'}}>Success Rate</div>
              </div>
              <div style={{textAlign: 'center'}}>
                <div style={{fontSize: '18px', fontWeight: '700', color: '#FF4A23'}}>$2.3M+</div>
                <div style={{fontSize: '12px', color: '#6b7280', marginTop: '4px'}}>Scholarships Earned</div>
              </div>
              <div style={{textAlign: 'center'}}>
                <div style={{fontSize: '18px', fontWeight: '700', color: '#FF4A23'}}>847</div>
                <div style={{fontSize: '12px', color: '#6b7280', marginTop: '4px'}}>Ivy+ Acceptances</div>
              </div>
            </div>
            
            <div style={{fontStyle: 'italic', color: '#6b7280', marginBottom: '16px', lineHeight: '1.5', fontSize: '14px'}}>
              "Without Ivylevel, I'd still be guessing. Now I'm heading to Stanford." - Sarah M., Class of 2024
            </div>
            
            <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e5e7eb'}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="12" y1="9" x2="12" y2="13" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="12" y1="17" x2="12.01" y2="17" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span style={{fontSize: '14px', fontWeight: '500', color: '#dc2626'}}>Limited Spots Available - Only 200 new students accepted this month</span>
            </div>
            
            <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px'}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 22C17.5 22 22 17.5 22 12C22 6.5 17.5 2 12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22Z" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 18C15.3 18 18 15.3 18 12C18 8.7 15.3 6 12 6C8.7 6 6 8.7 6 12C6 15.3 8.7 18 12 18Z" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 14C13.1 14 14 13.1 14 12C14 10.9 13.1 10 12 10C10.9 10 10 10.9 10 12C10 13.1 10.9 14 12 14Z" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span style={{fontSize: '14px', fontWeight: '500', color: '#059669'}}>Your Competition is Already Here - Don't let others take your dream school spot</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
