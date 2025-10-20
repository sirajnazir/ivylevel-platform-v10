import React, { useState, lazy, Suspense, Component } from 'react';
import './App.css';

// Error Boundary Component
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Component Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          backgroundColor: '#fee',
          borderRadius: '8px',
          margin: '20px'
        }}>
          <h2>Something went wrong loading this component</h2>
          <p>{this.state.error?.message}</p>
          <button 
            onClick={() => this.setState({ hasError: false })}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Loading Component
const LoadingSpinner = () => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    padding: '40px'
  }}>
    <div style={{
      width: '60px',
      height: '60px',
      border: '4px solid #e5e7eb',
      borderTop: '4px solid #3b82f6',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    }}></div>
    <p style={{ marginTop: '20px', color: '#6b7280' }}>Loading AI components...</p>
  </div>
);

// Lazy load simplified components (guaranteed to work)
const AICoachingDashboard = lazy(() => import('./components/AICoachingDashboard-Simple'));
const EnhancedAdminDashboard = lazy(() => import('./components/EnhancedAdminDashboard-Simple'));
const CoachOnboardingHub = lazy(() => import('./components/CoachOnboardingHub-Simple'));

function App() {
  const [selectedView, setSelectedView] = useState(null);
  const [isProduction] = useState(process.env.NODE_ENV === 'production');

  const containerStyle = {
    minHeight: '100vh',
    background: 'linear-gradient(to bottom right, #eff6ff, #f3e8ff)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem'
  };

  const cardStyle = {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
    padding: '24px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    textAlign: 'left'
  };

  const iconBoxStyle = {
    width: '48px',
    height: '48px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '16px',
    fontSize: '24px'
  };

  // Dashboard View
  if (selectedView) {
    return (
      <ErrorBoundary>
        <div style={containerStyle}>
          <div style={{maxWidth: '1200px', width: '100%'}}>
            <button 
              onClick={() => setSelectedView(null)}
              style={{
                position: 'fixed',
                top: '20px',
                left: '20px',
                zIndex: 1000,
                padding: '8px 16px',
                backgroundColor: '#374151',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              ← Back
            </button>
            
            <Suspense fallback={<LoadingSpinner />}>
              <ErrorBoundary>
                {selectedView === 'Admin' && (
                  <EnhancedAdminDashboard 
                    user={{email: 'demo@ivylevel.com', displayName: 'Demo Admin'}}
                    onLogout={() => setSelectedView(null)}
                  />
                )}
                {selectedView === 'AI Coach' && (
                  <AICoachingDashboard 
                    coach="Sarah"
                    student="Michael Chen"
                    onLogout={() => setSelectedView(null)}
                  />
                )}
                {selectedView === 'Onboarding' && (
                  <CoachOnboardingHub 
                    coachName="New Coach"
                    studentName="Emma Wilson"
                  />
                )}
              </ErrorBoundary>
            </Suspense>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  // Main Selection View
  return (
    <div style={containerStyle}>
      <div style={{maxWidth: '1000px', width: '100%'}}>
        <div style={{textAlign: 'center', marginBottom: '32px'}}>
          <h1 style={{fontSize: '3rem', fontWeight: 'bold', color: '#111827', marginBottom: '16px'}}>
            🧠 AI Coach Pro ✨
          </h1>
          <p style={{fontSize: '1.25rem', color: '#4b5563'}}>
            Choose a role to explore AI-powered coaching features
          </p>
          {!isProduction && (
            <p style={{fontSize: '0.875rem', color: '#9ca3af', marginTop: '8px'}}>
              Development Mode - Components load on demand
            </p>
          )}
        </div>

        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px'}}>
          <div 
            style={cardStyle}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            onClick={() => setSelectedView('Admin')}
          >
            <div style={{...iconBoxStyle, backgroundColor: '#f3e8ff'}}>
              <span>👨‍💼</span>
            </div>
            <h3 style={{fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '8px'}}>Admin Dashboard</h3>
            <p style={{color: '#6b7280', marginBottom: '16px'}}>
              Manage coaches, create onboarding packages, view platform analytics
            </p>
            <div style={{color: '#9333ea', fontSize: '0.875rem', fontWeight: '500'}}>
              Explore Admin Features →
            </div>
          </div>

          <div 
            style={cardStyle}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            onClick={() => setSelectedView('AI Coach')}
          >
            <div style={{...iconBoxStyle, backgroundColor: '#dbeafe'}}>
              <span>🎯</span>
            </div>
            <h3 style={{fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '8px'}}>AI Coach Dashboard</h3>
            <p style={{color: '#6b7280', marginBottom: '16px'}}>
              Experience real-time AI assistance, smart planning, and automated workflows
            </p>
            <div style={{color: '#2563eb', fontSize: '0.875rem', fontWeight: '500'}}>
              See AI Features →
            </div>
          </div>

          <div 
            style={cardStyle}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            onClick={() => setSelectedView('Onboarding')}
          >
            <div style={{...iconBoxStyle, backgroundColor: '#d1fae5'}}>
              <span>📚</span>
            </div>
            <h3 style={{fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '8px'}}>Coach Onboarding</h3>
            <p style={{color: '#6b7280', marginBottom: '16px'}}>
              YouTube-style training with personalized learning paths
            </p>
            <div style={{color: '#059669', fontSize: '0.875rem', fontWeight: '500'}}>
              Start Training →
            </div>
          </div>
        </div>

        <div style={{...cardStyle, marginTop: '48px', padding: '24px', cursor: 'default'}}>
          <h3 style={{fontWeight: 'bold', marginBottom: '16px'}}>🚀 AI Features You'll Experience:</h3>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
              <span style={{fontSize: '20px'}}>🎙️</span>
              <span>Voice AI Assistant</span>
            </div>
            <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
              <span style={{fontSize: '20px'}}>📊</span>
              <span>Real-time Analytics</span>
            </div>
            <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
              <span style={{fontSize: '20px'}}>🎯</span>
              <span>Smart Resources</span>
            </div>
            <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
              <span style={{fontSize: '20px'}}>📅</span>
              <span>AI Planning</span>
            </div>
            <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
              <span style={{fontSize: '20px'}}>🎥</span>
              <span>Video Training</span>
            </div>
            <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
              <span style={{fontSize: '20px'}}>⚡</span>
              <span>Automation</span>
            </div>
            <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
              <span style={{fontSize: '20px'}}>💡</span>
              <span>Predictive Insights</span>
            </div>
            <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
              <span style={{fontSize: '20px'}}>📈</span>
              <span>Success Patterns</span>
            </div>
          </div>
        </div>

        {/* System Status */}
        <div style={{
          marginTop: '24px',
          padding: '16px',
          backgroundColor: 'rgba(255,255,255,0.8)',
          borderRadius: '8px',
          textAlign: 'center',
          fontSize: '0.875rem',
          color: '#6b7280'
        }}>
          <span style={{color: '#10b981', marginRight: '8px'}}>●</span>
          System Status: All services operational
        </div>
      </div>
    </div>
  );
}

// Add CSS animation
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  if (!document.head.querySelector('style[data-app-styles]')) {
    style.setAttribute('data-app-styles', 'true');
    document.head.appendChild(style);
  }
}

export default App;