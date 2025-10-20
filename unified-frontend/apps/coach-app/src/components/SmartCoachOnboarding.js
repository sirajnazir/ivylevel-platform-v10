import React, { useState, useEffect } from 'react';
import { newCoachesData, trainingPatterns } from '../data/newCoachesData';
import { db } from '../firebase-config';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

const SmartCoachOnboarding = () => {
  const [selectedCoach, setSelectedCoach] = useState('kelvin');
  const [matchedVideos, setMatchedVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [completedItems, setCompletedItems] = useState(new Set());

  // Intelligent video matching algorithm
  const findRelevantVideos = async (coach) => {
    setLoading(true);
    try {
      const videosRef = collection(db, 'indexed_videos');
      const relevantVideos = [];
      
      // Get coach-specific keywords
      const keywords = getCoachKeywords(coach);
      
      // Search for relevant videos
      for (const keyword of keywords) {
        const q = query(
          videosRef,
          orderBy('date', 'desc'),
          limit(20)
        );
        const snapshot = await getDocs(q);
        
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          const title = (data.title || '').toLowerCase();
          const isRelevant = keywords.some(kw => 
            title.includes(kw.toLowerCase()) ||
            (data.coach && data.coach.toLowerCase().includes(kw.toLowerCase())) ||
            (data.student && data.student.toLowerCase().includes(kw.toLowerCase()))
          );
          
          if (isRelevant && !relevantVideos.find(v => v.id === doc.id)) {
            relevantVideos.push({
              id: doc.id,
              ...data,
              relevanceScore: calculateRelevance(data, coach)
            });
          }
        });
      }
      
      // Sort by relevance
      relevantVideos.sort((a, b) => b.relevanceScore - a.relevanceScore);
      setMatchedVideos(relevantVideos.slice(0, 10));
    } catch (error) {
      console.error('Error finding videos:', error);
    }
    setLoading(false);
  };

  const getCoachKeywords = (coachKey) => {
    const coach = newCoachesData[coachKey];
    const keywords = [];
    
    if (coachKey === 'kelvin') {
      keywords.push('computer science', 'CS', 'business', 'andrew', 'aarnav', '168');
    } else if (coachKey === 'jamie') {
      keywords.push('biomed', 'medical', 'average', 'marissa', 'zainab', 'iqra', '168');
    } else if (coachKey === 'noor') {
      keywords.push('sophomore', 'junior', 'marissa', 'erin', 'srinidhi', 'iqra', '168');
    }
    
    // Add common keywords
    keywords.push('first session', 'game plan', 'onboarding', 'training');
    
    return keywords;
  };

  const calculateRelevance = (video, coachKey) => {
    let score = 0;
    const coach = newCoachesData[coachKey];
    
    // Match student type
    if (coachKey === 'kelvin' && video.title?.toLowerCase().includes('cs')) score += 20;
    if (coachKey === 'jamie' && video.title?.toLowerCase().includes('biomed')) score += 20;
    
    // Match training type
    if (video.title?.toLowerCase().includes('168')) score += 15;
    if (video.title?.toLowerCase().includes('first session')) score += 15;
    if (video.title?.toLowerCase().includes('onboarding')) score += 10;
    
    // Match mentioned coaches
    const mentionedCoaches = ['marissa', 'erin', 'andrew', 'aarnav'];
    mentionedCoaches.forEach(name => {
      if (video.coach?.toLowerCase().includes(name) || 
          video.title?.toLowerCase().includes(name)) {
        score += 10;
      }
    });
    
    return score;
  };

  useEffect(() => {
    findRelevantVideos(selectedCoach);
  }, [selectedCoach]);

  const markAsComplete = (itemId) => {
    setCompletedItems(new Set([...completedItems, itemId]));
  };

  const coach = newCoachesData[selectedCoach];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '20px' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', marginBottom: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '16px' }}>
            🎯 Smart Coach Onboarding System
          </h1>
          
          {/* Coach Selector */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
            {Object.entries(newCoachesData).map(([key, data]) => (
              <button
                key={key}
                onClick={() => setSelectedCoach(key)}
                style={{
                  padding: '12px 24px',
                  backgroundColor: selectedCoach === key ? '#3b82f6' : '#e5e7eb',
                  color: selectedCoach === key ? 'white' : '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                {data.name}
                {data.students ? ` (${data.students.length} students)` : ` & ${data.student.name}`}
              </button>
            ))}
          </div>
          
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '16px', borderBottom: '2px solid #e5e7eb' }}>
            {['overview', 'required', 'recommended', 'checklist'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '12px 24px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderBottom: activeTab === tab ? '2px solid #3b82f6' : 'none',
                  color: activeTab === tab ? '#3b82f6' : '#6b7280',
                  cursor: 'pointer',
                  fontWeight: '600',
                  textTransform: 'capitalize'
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* Coach Profile */}
            <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px' }}>
                👤 Coach Profile
              </h2>
              <div style={{ fontSize: '0.95rem', color: '#4b5563' }}>
                <p><strong>Name:</strong> {coach.name}</p>
                <p><strong>Email:</strong> {coach.email}</p>
                <p><strong>Start Date:</strong> {new Date(coach.startDate).toLocaleDateString()}</p>
                {coach.student && (
                  <>
                    <p style={{ marginTop: '12px' }}><strong>Student:</strong> {coach.student.name}</p>
                    <p><strong>Profile:</strong> {coach.student.profile}</p>
                    <p><strong>Focus Areas:</strong></p>
                    <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
                      {coach.student.focusAreas.map((area, i) => (
                        <li key={i}>{area}</li>
                      ))}
                    </ul>
                  </>
                )}
                {coach.students && (
                  <>
                    <p style={{ marginTop: '12px' }}><strong>Students:</strong></p>
                    {coach.students.map((student, i) => (
                      <div key={i} style={{ marginLeft: '20px', marginTop: '8px', padding: '8px', backgroundColor: '#f3f4f6', borderRadius: '6px' }}>
                        <p><strong>{student.name}</strong> - {student.profile}</p>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>

            {/* Training Priority */}
            <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px' }}>
                🎯 Training Priority
              </h2>
              <div style={{ fontSize: '0.95rem', color: '#4b5563' }}>
                <p><strong>Session Type:</strong> {coach.trainingNeeds.sessionType}</p>
                <p><strong>Priority:</strong> {coach.trainingNeeds.priority}</p>
                <p style={{ marginTop: '12px' }}><strong>Student Type:</strong> {coach.trainingNeeds.studentType || 'Multiple'}</p>
                
                <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#fef3c7', borderRadius: '8px' }}>
                  <p style={{ fontWeight: '600', color: '#92400e' }}>⚡ Quick Start Focus:</p>
                  <ul style={{ marginLeft: '20px', marginTop: '8px', color: '#92400e' }}>
                    <li>Complete 168-hour session training first</li>
                    <li>Review student game plan thoroughly</li>
                    <li>Focus on quick wins for first session</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'required' && (
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px' }}>
              📌 Required Training Materials
            </h2>
            
            {/* Primary Training */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '12px', color: '#dc2626' }}>
                🎥 Primary 168-Hour Session Training
              </h3>
              {coach.trainingNeeds.primaryVideo && (
                <div style={{ padding: '16px', backgroundColor: '#fee2e2', borderRadius: '8px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontWeight: '600' }}>{coach.trainingNeeds.primaryVideo}</p>
                      <p style={{ fontSize: '0.875rem', color: '#7f1d1d' }}>Watch this complete session example</p>
                    </div>
                    <button
                      onClick={() => markAsComplete('primary-video')}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: completedItems.has('primary-video') ? '#10b981' : '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      {completedItems.has('primary-video') ? '✓ Completed' : 'Mark Complete'}
                    </button>
                  </div>
                </div>
              )}
              
              {/* For Noor - multiple training videos */}
              {coach.trainingNeeds.sophomoreTraining && (
                <>
                  <div style={{ padding: '16px', backgroundColor: '#fee2e2', borderRadius: '8px', marginBottom: '12px' }}>
                    <p style={{ fontWeight: '600' }}>Sophomore Training: {coach.trainingNeeds.sophomoreTraining.video}</p>
                    <p style={{ fontSize: '0.875rem', color: '#7f1d1d' }}>For underclassman like Hiba</p>
                  </div>
                  <div style={{ padding: '16px', backgroundColor: '#fee2e2', borderRadius: '8px', marginBottom: '12px' }}>
                    <p style={{ fontWeight: '600' }}>Junior Training: {coach.trainingNeeds.juniorTraining.video}</p>
                    <p style={{ fontSize: '0.875rem', color: '#7f1d1d' }}>For upperclassman like Beya</p>
                  </div>
                </>
              )}
            </div>

            {/* Student Materials */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '12px', color: '#dc2626' }}>
                📚 Student-Specific Materials
              </h3>
              {coach.student && (
                <>
                  <div style={{ padding: '16px', backgroundColor: '#fef3c7', borderRadius: '8px', marginBottom: '12px' }}>
                    <p style={{ fontWeight: '600' }}>Game Plan Report: {coach.student.gameplanReport}</p>
                    <p style={{ fontSize: '0.875rem', color: '#78350f' }}>Must review before first session</p>
                  </div>
                  <div style={{ padding: '16px', backgroundColor: '#dbeafe', borderRadius: '8px' }}>
                    <p style={{ fontWeight: '600' }}>Execution Doc: {coach.student.executionDoc}</p>
                    <p style={{ fontSize: '0.875rem', color: '#1e3a8a' }}>Use in every session</p>
                  </div>
                </>
              )}
              {coach.students && coach.students.map((student, i) => (
                <div key={i} style={{ marginBottom: '12px' }}>
                  <div style={{ padding: '16px', backgroundColor: '#fef3c7', borderRadius: '8px', marginBottom: '8px' }}>
                    <p style={{ fontWeight: '600' }}>{student.name}'s Game Plan: {student.gameplanReport}</p>
                  </div>
                  <div style={{ padding: '16px', backgroundColor: '#dbeafe', borderRadius: '8px' }}>
                    <p style={{ fontWeight: '600' }}>{student.name}'s Execution Doc: {student.executionDoc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'recommended' && (
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px' }}>
              🤖 AI-Matched Training Videos
            </h2>
            <p style={{ color: '#6b7280', marginBottom: '16px' }}>
              Based on your student profile and training needs, here are the most relevant videos from our library:
            </p>
            
            {loading ? (
              <p>Loading relevant videos...</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                {matchedVideos.map((video, i) => (
                  <div key={video.id} style={{ 
                    padding: '16px', 
                    border: '1px solid #e5e7eb', 
                    borderRadius: '8px',
                    backgroundColor: i < 3 ? '#f0f9ff' : 'white'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: '600', marginBottom: '4px' }}>{video.title || video.name}</p>
                        <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                          Coach: {video.coach} | Student: {video.student}
                        </p>
                        <p style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                          Relevance Score: {video.relevanceScore}/100
                        </p>
                      </div>
                      {i < 3 && (
                        <span style={{ 
                          padding: '4px 8px', 
                          backgroundColor: '#3b82f6', 
                          color: 'white', 
                          borderRadius: '4px',
                          fontSize: '0.75rem'
                        }}>
                          Highly Relevant
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'checklist' && (
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px' }}>
              ✅ Onboarding Checklist
            </h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
              {/* Before First Session */}
              <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px' }}>
                <h3 style={{ fontWeight: '600', marginBottom: '12px' }}>📋 Before First Session</h3>
                {[
                  'Review student game plan report',
                  'Watch 168-hour session training video',
                  'Set up IvyMentors Zoom account',
                  'Update availability in scheduling doc',
                  'Review execution document template',
                  'Understand payment process'
                ].map((item, i) => (
                  <label key={i} style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      style={{ marginRight: '8px' }}
                      checked={completedItems.has(`before-${i}`)}
                      onChange={() => markAsComplete(`before-${i}`)}
                    />
                    <span style={{ textDecoration: completedItems.has(`before-${i}`) ? 'line-through' : 'none' }}>
                      {item}
                    </span>
                  </label>
                ))}
              </div>

              {/* During Session */}
              <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px' }}>
                <h3 style={{ fontWeight: '600', marginBottom: '12px' }}>🎥 During Session Protocol</h3>
                {[
                  'Use IvyMentors Zoom account',
                  'Start recording immediately',
                  'Share execution doc screen',
                  'Keep both videos ON',
                  'Update notes live',
                  'Track action items'
                ].map((item, i) => (
                  <label key={i} style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      style={{ marginRight: '8px' }}
                      checked={completedItems.has(`during-${i}`)}
                      onChange={() => markAsComplete(`during-${i}`)}
                    />
                    <span style={{ textDecoration: completedItems.has(`during-${i}`) ? 'line-through' : 'none' }}>
                      {item}
                    </span>
                  </label>
                ))}
              </div>

              {/* After Session */}
              <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px' }}>
                <h3 style={{ fontWeight: '600', marginBottom: '12px' }}>📧 After Session Requirements</h3>
                {[
                  'Send recap email within 24 hours',
                  'CC parents and contact@ivymentors.co',
                  'Include action items and next session details',
                  'Link to execution doc',
                  'Submit payout request',
                  'Respond to offline questions (max 2/week)'
                ].map((item, i) => (
                  <label key={i} style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      style={{ marginRight: '8px' }}
                      checked={completedItems.has(`after-${i}`)}
                      onChange={() => markAsComplete(`after-${i}`)}
                    />
                    <span style={{ textDecoration: completedItems.has(`after-${i}`) ? 'line-through' : 'none' }}>
                      {item}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Progress Bar */}
            <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontWeight: '600' }}>Overall Progress</span>
                <span>{completedItems.size}/18 items completed</span>
              </div>
              <div style={{ width: '100%', height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ 
                  width: `${(completedItems.size / 18) * 100}%`, 
                  height: '100%', 
                  backgroundColor: '#10b981',
                  transition: 'width 0.3s ease'
                }}></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SmartCoachOnboarding;