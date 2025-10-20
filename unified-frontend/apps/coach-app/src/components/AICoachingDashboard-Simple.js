import React, { useState } from 'react';

function AICoachingDashboard({ coach, student, onLogout }) {
  const [isListening, setIsListening] = useState(false);
  const [metrics] = useState({
    engagement: 85,
    clarity: 92,
    progress: 78,
    momentum: 88
  });

  const toggleListening = () => {
    setIsListening(!isListening);
    if (!isListening) {
      // Simulate voice recognition
      setTimeout(() => {
        console.log('Voice AI: Session analysis complete');
      }, 2000);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '20px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '12px', 
          padding: '24px', 
          marginBottom: '24px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: '0 0 8px 0' }}>
                🧠 AI Coach Dashboard
              </h1>
              <p style={{ color: '#6b7280', margin: 0 }}>
                Coach: {coach} | Student: {student}
              </p>
            </div>
            <button
              onClick={onLogout}
              style={{
                padding: '8px 16px',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Logout
            </button>
          </div>
        </div>

        {/* AI Voice Assistant */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px' }}>
            🎙️ AI Voice Assistant
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={toggleListening}
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                border: 'none',
                backgroundColor: isListening ? '#ef4444' : '#3b82f6',
                color: 'white',
                fontSize: '2rem',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                transform: isListening ? 'scale(1.1)' : 'scale(1)'
              }}
            >
              {isListening ? '⏹️' : '🎤'}
            </button>
            <div>
              <p style={{ fontSize: '1.1rem', fontWeight: '600', margin: '0 0 4px 0' }}>
                {isListening ? 'Listening...' : 'Click to start voice analysis'}
              </p>
              <p style={{ color: '#6b7280', margin: 0 }}>
                {isListening ? 'AI is analyzing your coaching session in real-time' : 'Get instant AI feedback on your coaching'}
              </p>
            </div>
          </div>
        </div>

        {/* Real-time Metrics */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px' }}>
            📊 Real-time Session Metrics
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            {Object.entries(metrics).map(([key, value]) => (
              <div key={key} style={{
                padding: '16px',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#3b82f6' }}>
                  {value}%
                </div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', textTransform: 'capitalize' }}>
                  {key}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Recommendations */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px' }}>
            🎯 AI Recommendations
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{
              padding: '16px',
              backgroundColor: '#ecfdf5',
              border: '1px solid #10b981',
              borderRadius: '8px'
            }}>
              <div style={{ fontWeight: '600', color: '#065f46' }}>
                ✅ Excellent Progress on Essay Structure
              </div>
              <div style={{ color: '#047857', fontSize: '0.875rem' }}>
                {student} has shown 23% improvement in organizing their thoughts
              </div>
            </div>
            <div style={{
              padding: '16px',
              backgroundColor: '#fef3c7',
              border: '1px solid #f59e0b',
              borderRadius: '8px'
            }}>
              <div style={{ fontWeight: '600', color: '#92400e' }}>
                ⚠️ Focus Area: Time Management
              </div>
              <div style={{ color: '#b45309', fontSize: '0.875rem' }}>
                Consider introducing Pomodoro technique for study sessions
              </div>
            </div>
            <div style={{
              padding: '16px',
              backgroundColor: '#dbeafe',
              border: '1px solid #3b82f6',
              borderRadius: '8px'
            }}>
              <div style={{ fontWeight: '600', color: '#1e40af' }}>
                💡 Smart Resource Suggestion
              </div>
              <div style={{ color: '#1d4ed8', fontSize: '0.875rem' }}>
                Video: "Advanced Essay Techniques" matches {student}'s current level
              </div>
            </div>
          </div>
        </div>

        {/* Session Planner */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px' }}>
            📅 AI Session Planner
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            <div style={{
              padding: '16px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px'
            }}>
              <div style={{ fontWeight: '600', marginBottom: '8px' }}>Next Session Plan</div>
              <ul style={{ margin: 0, paddingLeft: '20px', color: '#6b7280' }}>
                <li>Review essay feedback (15 min)</li>
                <li>Practice thesis statements (20 min)</li>
                <li>College application timeline (10 min)</li>
              </ul>
            </div>
            <div style={{
              padding: '16px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px'
            }}>
              <div style={{ fontWeight: '600', marginBottom: '8px' }}>Automated Tasks</div>
              <ul style={{ margin: 0, paddingLeft: '20px', color: '#6b7280' }}>
                <li>📧 Send practice essay prompts</li>
                <li>📅 Schedule follow-up in 3 days</li>
                <li>📊 Generate progress report</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AICoachingDashboard;