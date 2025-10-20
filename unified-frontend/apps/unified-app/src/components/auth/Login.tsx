import React, { useState } from 'react';
import { cognitoAuthService } from '../../services/auth/cognitoAuthService';
import { PasswordReset } from './PasswordReset';
import useAuth from '../../hooks/useAuthMock';
import { useNavigate } from 'react-router-dom';

interface LoginProps {
  onSuccess?: () => void;
  onRegister?: () => void;
}

export const Login: React.FC<LoginProps> = ({ onSuccess, onRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [challenge, setChallenge] = useState<{
    type: string;
    session: string;
  } | null>(null);
  
  const { login: authLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await authLogin(email, password);
    console.log('Login result:', result);

    if (result.success) {
      console.log('Login successful, checking for onSuccess callback...');
      if (onSuccess) {
        console.log('Calling onSuccess callback');
        onSuccess();
      } else {
        // Redirect based on role
        const user = result.user;
        console.log('🔍 Login redirect debug:', { 
          user, 
          role: user?.role, 
          email: user?.email,
          isAdmin: user?.role === 'admin',
          isCoach: user?.role === 'coach',
          isStudent: user?.role === 'student'
        });
        
        if (user?.role === 'admin') {
          console.log('Redirecting to admin...');
          navigate('/admin');
        } else if (user?.role === 'coach') {
          console.log('Redirecting to coach...');
          navigate('/coach');
        } else {
          console.log('Redirecting to student...');
          navigate('/student');
        }
      }
      // Don't set loading false after redirect
      return;
    } else if (result.challenge) {
      // Handle authentication challenges
      setChallenge({
        type: result.challenge,
        session: result.session || ''
      });
    } else {
      setError(result.message || 'Login failed');
    }

    setLoading(false);
  };

  const handleMFASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challenge) return;

    setLoading(true);
    setError('');

    const result = await cognitoAuthService.respondToChallenge(
      challenge.type,
      challenge.session,
      {
        MFA_CODE: mfaCode
      }
    );

    if (result.success) {
      setChallenge(null);
      if (onSuccess) {
        onSuccess();
      } else {
        // Redirect based on role
        const user = cognitoAuthService.getCurrentUser();
        if (user?.role === 'admin') {
          window.location.href = '/admin';
        } else if (user?.role === 'coach') {
          window.location.href = '/coach';
        } else {
          window.location.href = '/student';
        }
      }
    } else if (result.challenge) {
      // Another challenge
      setChallenge({
        type: result.challenge,
        session: result.session || ''
      });
    } else {
      setError(result.message || 'MFA verification failed');
    }

    setLoading(false);
  };

  if (showPasswordReset) {
    return <PasswordReset onClose={() => setShowPasswordReset(false)} />;
  }

  // MFA Challenge Screen
  if (challenge?.type === 'mfa_required' || challenge?.type === 'SOFTWARE_TOKEN_MFA') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Two-Factor Authentication
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Enter the code from your authenticator app
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleMFASubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="mfa-code" className="sr-only">
                MFA Code
              </label>
              <input
                id="mfa-code"
                type="text"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                required
                maxLength={6}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm text-center text-2xl font-mono"
                placeholder="000000"
              />
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => {
                  setChallenge(null);
                  setMfaCode('');
                  setError('');
                }}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading || mfaCode.length !== 6}
                className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Beautiful Login Form with Unified Auth
  return (
    <div style={{minHeight: '100vh', background: 'linear-gradient(135deg, #FFE5DF, #F5E8E5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px'}}>
      <div style={{maxWidth: '960px', width: '100%', display: 'flex', gap: '48px', alignItems: 'center'}}>
        {/* Left Side - Login Form */}
        <div style={{flex: 1, background: 'white', borderRadius: '16px', padding: '48px', boxShadow: '0 20px 40px rgba(100,20,50,0.1)'}}>
          <div style={{textAlign: 'center', marginBottom: '32px'}}>
            {/* IvylevelFullLogo */}
            <svg style={{width: '92px', height: '27px', margin: '0 auto 24px'}} viewBox="0 0 92 27" fill="none" xmlns="http://www.w3.org/2000/svg">
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
            <h1 style={{fontSize: '2rem', fontWeight: 'bold', color: '#111827', marginBottom: '8px'}}>Welcome Back</h1>
            <p style={{color: '#6b7280'}}>Sign in to your Ivylevel Elite account</p>
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

          <form onSubmit={handleSubmit} style={{marginTop: '32px'}}>
            {error && (
              <div style={{background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '12px 16px', borderRadius: '8px', marginBottom: '24px'}}>
                {error}
              </div>
            )}

            <div style={{marginBottom: '20px'}}>
              <label htmlFor="email-address" style={{display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px'}}>
                Email Address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                placeholder="Enter your email"
                onFocus={(e) => e.target.style.borderColor = '#FE4A22'}
                onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
              />
            </div>

            <div style={{marginBottom: '24px'}}>
              <label htmlFor="password" style={{display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px'}}>
                Password
              </label>
              <div style={{position: 'relative'}}>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    paddingRight: '48px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '16px',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                  placeholder="Enter your password"
                  onFocus={(e) => e.target.style.borderColor = '#FE4A22'}
                  onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
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
                    color: '#9ca3af'
                  }}
                >
                  {showPassword ? (
                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div style={{marginBottom: '32px'}}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '14px 24px',
                  background: 'linear-gradient(135deg, #FE4A22, #FF6B47)',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 12px rgba(254, 74, 34, 0.3)'
                }}
                onMouseEnter={(e) => !loading && (e.target.style.transform = 'translateY(-1px)', e.target.style.boxShadow = '0 6px 16px rgba(254, 74, 34, 0.4)')}
                onMouseLeave={(e) => !loading && (e.target.style.transform = 'translateY(0)', e.target.style.boxShadow = '0 4px 12px rgba(254, 74, 34, 0.3)')}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </div>


          </form>
        </div>

        {/* Right Side - Marketing Content */}
        <div style={{flex: 1, padding: '48px', color: '#641432'}}>
          <h2 style={{fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '16px', lineHeight: '1.2'}}>Ivylevel Elite Portal</h2>
          <p style={{fontSize: '1.125rem', marginBottom: '32px', lineHeight: '1.6'}}>Join the exclusive network helping students achieve their Ivy League dreams.</p>
          
          <div style={{display: 'flex', flexDirection: 'column', gap: '24px'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
              <div style={{width: '48px', height: '48px', background: 'rgba(254, 74, 34, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <h3 style={{fontSize: '1.125rem', fontWeight: '600', marginBottom: '4px'}}>Comprehensive Training</h3>
                <p style={{fontSize: '0.875rem', opacity: 0.8}}>Master the Ivylevel methodology in 48 hours</p>
              </div>
            </div>

            <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
              <div style={{width: '48px', height: '48px', background: 'rgba(254, 74, 34, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <div>
                <h3 style={{fontSize: '1.125rem', fontWeight: '600', marginBottom: '4px'}}>Impact Lives</h3>
                <p style={{fontSize: '0.875rem', opacity: 0.8}}>Guide students to their dream colleges</p>
              </div>
            </div>

            <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
              <div style={{width: '48px', height: '48px', background: 'rgba(254, 74, 34, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div>
                <h3 style={{fontSize: '1.125rem', fontWeight: '600', marginBottom: '4px'}}>Earn $25,000+</h3>
                <p style={{fontSize: '0.875rem', opacity: 0.8}}>Build a rewarding coaching career</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};