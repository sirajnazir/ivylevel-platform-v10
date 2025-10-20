import React, { useState } from 'react';

// Simple inline components to avoid import issues
const AICoachDashboard = ({ coach, student, onLogout }) => (
  <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
    <h2>🧠 AI Coach Dashboard</h2>
    <p>Coach: {coach} | Student: {student}</p>
    <button onClick={onLogout} style={{ marginBottom: '20px' }}>Back</button>
    
    <div style={{ backgroundColor: '#f0f0f0', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
      <h3>🎙️ Voice AI Assistant</h3>
      <button style={{ padding: '10px 20px', fontSize: '18px' }}>🎤 Start Recording</button>
    </div>
    
    <div style={{ backgroundColor: '#f0f0f0', padding: '20px', borderRadius: '8px' }}>
      <h3>📊 Real-time Metrics</h3>
      <p>Engagement: 85% | Clarity: 92% | Progress: 78%</p>
    </div>
  </div>
);

const AdminDashboard = ({ user, onLogout }) => (
  <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
    <h2>👨‍💼 Admin Dashboard</h2>
    <p>Welcome {user.displayName}</p>
    <button onClick={onLogout} style={{ marginBottom: '20px' }}>Back</button>
    
    <div style={{ backgroundColor: '#f0f0f0', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
      <h3>📊 Platform Stats</h3>
      <p>Total Coaches: 12 | Active Students: 48 | Sessions: 156</p>
    </div>
    
    <div style={{ backgroundColor: '#f0f0f0', padding: '20px', borderRadius: '8px' }}>
      <h3>🧠 AI Insights</h3>
      <p>AI recommendations show 23% better student outcomes</p>
    </div>
  </div>
);

const CoachOnboarding = ({ coachName, studentName }) => (
  <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
    <h2>📚 Coach Training Hub</h2>
    <p>Welcome {coachName}! Training for {studentName}</p>
    
    <div style={{ backgroundColor: '#f0f0f0', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
      <h3>📊 Progress: 60%</h3>
      <p>3 of 5 videos completed</p>
    </div>
    
    <div style={{ backgroundColor: '#f0f0f0', padding: '20px', borderRadius: '8px' }}>
      <h3>🎥 Training Videos</h3>
      <ul>
        <li>✅ Introduction to IvyLevel</li>
        <li>✅ Student Psychology</li>
        <li>✅ Essay Coaching</li>
        <li>⏳ Time Management</li>
        <li>⏳ College Applications</li>
      </ul>
    </div>
  </div>
);

function App() {
  const [view, setView] = useState('home');

  if (view === 'ai-coach') {
    return <AICoachDashboard coach="Sarah" student="Michael" onLogout={() => setView('home')} />;
  }

  if (view === 'admin') {
    return <AdminDashboard user={{ displayName: 'Admin' }} onLogout={() => setView('home')} />;
  }

  if (view === 'onboarding') {
    return <CoachOnboarding coachName="New Coach" studentName="Emma" />;
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(to bottom right, #eff6ff, #f3e8ff)',
      padding: '40px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
        <h1 style={{ fontSize: '48px', marginBottom: '40px' }}>🧠 AI Coach Pro ✨</h1>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
          <div 
            onClick={() => setView('admin')}
            style={{ 
              backgroundColor: 'white', 
              padding: '30px', 
              borderRadius: '12px',
              cursor: 'pointer',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>👨‍💼</div>
            <h3>Admin Dashboard</h3>
            <p>Manage coaches and analytics</p>
          </div>
          
          <div 
            onClick={() => setView('ai-coach')}
            style={{ 
              backgroundColor: 'white', 
              padding: '30px', 
              borderRadius: '12px',
              cursor: 'pointer',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>🎯</div>
            <h3>AI Coach Dashboard</h3>
            <p>AI-powered coaching tools</p>
          </div>
          
          <div 
            onClick={() => setView('onboarding')}
            style={{ 
              backgroundColor: 'white', 
              padding: '30px', 
              borderRadius: '12px',
              cursor: 'pointer',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>📚</div>
            <h3>Coach Onboarding</h3>
            <p>Training videos and resources</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;