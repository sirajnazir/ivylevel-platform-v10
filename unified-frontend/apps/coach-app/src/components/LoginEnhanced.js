import React, { useState } from 'react';
import { signInWithEmailAndPassword } from '../services/mockAuth';

const LoginEnhanced = ({ onViewChange }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showTestAccounts, setShowTestAccounts] = useState(true);

  // Test accounts for demo purposes
  const testAccounts = [
    { email: 'admin@ivylevel.com', password: 'Admin123!', role: 'Admin', name: 'Admin User' },
    { email: 'coach1@ivylevel.com', password: 'Coach123!', role: 'Coach', name: 'Sarah Johnson', student: 'Emma Chen' },
    { email: 'coach2@ivylevel.com', password: 'Coach123!', role: 'Coach', name: 'Michael Roberts', student: 'Alex Kumar' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signInWithEmailAndPassword(null, email, password);
      // On successful login, the auth state change will handle navigation
      if (onViewChange) {
        onViewChange('home');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTestAccountLogin = (account) => {
    setEmail(account.email);
    setPassword(account.password);
    setError('');
  };

  const containerStyle = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
    padding: '24px'
  };

  const formContainerStyle = {
    maxWidth: '400px',
    width: '100%',
    backgroundColor: 'white',
    padding: '32px',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  };

  const inputStyle = {
    width: '100%',
    padding: '12px',
    marginBottom: '16px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '16px'
  };

  const buttonStyle = {
    width: '100%',
    padding: '12px',
    backgroundColor: loading ? '#9ca3af' : '#4f46e5',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: loading ? 'not-allowed' : 'pointer'
  };

  const testAccountCardStyle = {
    padding: '12px',
    marginBottom: '8px',
    backgroundColor: '#f3f4f6',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  };

  return (
    <div style={containerStyle}>
      <div style={formContainerStyle}>
        {/* Logo/Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>
            🎓 IvyLevel Coach Platform
          </h1>
          <p style={{ color: '#6b7280' }}>Sign in to access your training</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{ 
              padding: '12px', 
              marginBottom: '16px', 
              backgroundColor: '#fee2e2', 
              color: '#991b1b', 
              borderRadius: '6px',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}

          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
              Email address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
              placeholder="Enter your password"
            />
          </div>

          <button type="submit" disabled={loading} style={buttonStyle}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        {/* Test Accounts Section */}
        {showTestAccounts && (
          <div style={{ marginTop: '32px' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              marginBottom: '16px' 
            }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                Demo Accounts (For Testing)
              </h3>
              <button
                onClick={() => setShowTestAccounts(false)}
                style={{ 
                  fontSize: '12px', 
                  color: '#6b7280', 
                  background: 'none', 
                  border: 'none', 
                  cursor: 'pointer' 
                }}
              >
                Hide
              </button>
            </div>

            {testAccounts.map((account, index) => (
              <div
                key={index}
                style={testAccountCardStyle}
                onClick={() => handleTestAccountLogin(account)}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#e5e7eb'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#f3f4f6'}
              >
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                  {account.name} ({account.role})
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  Email: {account.email}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  Password: {account.password}
                </div>
                {account.student && (
                  <div style={{ fontSize: '12px', color: '#059669', marginTop: '4px' }}>
                    Assigned Student: {account.student}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Back to Home Link */}
        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <button
            onClick={() => onViewChange('home')}
            style={{ 
              color: '#6b7280', 
              fontSize: '14px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginEnhanced;