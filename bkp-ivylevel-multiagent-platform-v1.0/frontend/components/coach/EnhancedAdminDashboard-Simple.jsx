import React, { useState } from 'react';

function EnhancedAdminDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('overview');
  
  const mockData = {
    totalCoaches: 12,
    activeStudents: 48,
    completedSessions: 156,
    resourcesShared: 89
  };

  const mockCoaches = [
    { name: 'Sarah Chen', students: 8, rating: 4.9, status: 'active' },
    { name: 'Michael Park', students: 6, rating: 4.8, status: 'active' },
    { name: 'Emma Wilson', students: 5, rating: 4.7, status: 'training' },
    { name: 'David Kim', students: 7, rating: 4.9, status: 'active' }
  ];

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
                👨‍💼 Admin Dashboard
              </h1>
              <p style={{ color: '#6b7280', margin: 0 }}>
                Welcome back, {user.displayName}
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

        {/* Tabs */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
            {['overview', 'coaches', 'analytics'].map(tab => (
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
                📊 Platform Overview
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                {Object.entries(mockData).map(([key, value]) => (
                  <div key={key} style={{
                    padding: '20px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#3b82f6' }}>
                      {value}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280', textTransform: 'capitalize' }}>
                      {key.replace(/([A-Z])/g, ' $1')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'coaches' && (
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px' }}>
                👥 Coach Management
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {mockCoaches.map((coach, index) => (
                  <div key={index} style={{
                    padding: '16px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontWeight: '600' }}>{coach.name}</div>
                      <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                        {coach.students} students • {coach.rating}⭐ rating
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
                ))}
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px' }}>
                📈 Analytics & Insights
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                <div style={{
                  padding: '20px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}>
                  <h3 style={{ margin: '0 0 12px 0' }}>Session Success Rate</h3>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981' }}>94%</div>
                  <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>↑ 5% from last month</div>
                </div>
                <div style={{
                  padding: '20px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}>
                  <h3 style={{ margin: '0 0 12px 0' }}>Average Session Rating</h3>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#3b82f6' }}>4.8</div>
                  <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>Consistently high quality</div>
                </div>
                <div style={{
                  padding: '20px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}>
                  <h3 style={{ margin: '0 0 12px 0' }}>AI Recommendations Used</h3>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#8b5cf6' }}>87%</div>
                  <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>High AI adoption rate</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* AI Insights */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px' }}>
            🧠 AI Platform Insights
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{
              padding: '16px',
              backgroundColor: '#ecfdf5',
              border: '1px solid #10b981',
              borderRadius: '8px'
            }}>
              <div style={{ fontWeight: '600', color: '#065f46' }}>
                📊 Resource Optimization Opportunity
              </div>
              <div style={{ color: '#047857', fontSize: '0.875rem' }}>
                Biology tutoring videos have 3x higher engagement than other subjects. Consider expanding this content.
              </div>
            </div>
            <div style={{
              padding: '16px',
              backgroundColor: '#dbeafe',
              border: '1px solid #3b82f6',
              borderRadius: '8px'
            }}>
              <div style={{ fontWeight: '600', color: '#1e40af' }}>
                🎯 Coach Performance Pattern
              </div>
              <div style={{ color: '#1d4ed8', fontSize: '0.875rem' }}>
                Coaches using AI recommendations show 23% better student outcomes on average.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EnhancedAdminDashboard;