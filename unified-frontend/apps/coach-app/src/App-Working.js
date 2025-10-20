import React, { useState } from 'react';
// import './App.css';
// import './styles/VideoPlayer.css';

// For now, let's keep it simple without imports to avoid errors

function App() {
  const [selectedView, setSelectedView] = useState(null);

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

  if (selectedView) {
    return (
      <div style={containerStyle}>
        <div style={{maxWidth: '800px', width: '100%'}}>
          <button 
            onClick={() => setSelectedView(null)}
            style={{
              padding: '8px 16px',
              marginBottom: '16px',
              backgroundColor: '#374151',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            ← Back to Demo Selector
          </button>
          <div style={{...cardStyle, padding: '32px'}}>
            <h2 style={{fontSize: '2rem', fontWeight: 'bold', marginBottom: '16px'}}>
              {selectedView} Dashboard
            </h2>
            <p style={{color: '#6b7280', marginBottom: '16px'}}>
              This is where the full {selectedView} interface would load.
            </p>
            <div style={{
              backgroundColor: '#dbeafe',
              border: '1px solid #93c5fd',
              borderRadius: '6px',
              padding: '16px'
            }}>
              <p style={{color: '#1e40af'}}>
                {selectedView === 'Admin' && '🎯 Features: Coach management, analytics, resource provisioning, AI insights'}
                {selectedView === 'AI Coach' && '🎙️ Features: Voice AI assistant, real-time session monitoring, smart recommendations'}
                {selectedView === 'Onboarding' && '📚 Features: YouTube-style videos, personalized learning paths, progress tracking'}
              </p>
            </div>
            <div style={{marginTop: '20px', padding: '20px', backgroundColor: '#fef3c7', borderRadius: '6px'}}>
              <p style={{color: '#92400e'}}>
                <strong>Note:</strong> To see the actual AI components, we need to ensure all dependencies are properly installed and there are no import errors. The components are built and ready but may have dependency issues.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={{maxWidth: '1000px', width: '100%'}}>
        <div style={{textAlign: 'center', marginBottom: '32px'}}>
          <h1 style={{fontSize: '3rem', fontWeight: 'bold', color: '#111827', marginBottom: '16px'}}>
            🧠 AI Coach Pro ✨
          </h1>
          <p style={{fontSize: '1.25rem', color: '#4b5563'}}>
            Choose a role to explore AI-powered coaching features!
          </p>
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

        <div style={{...cardStyle, marginTop: '48px', padding: '24px'}}>
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
      </div>
    </div>
  );
}

// Add spin animation
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);

export default App;