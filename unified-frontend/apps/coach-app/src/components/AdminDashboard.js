import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy, where } from 'firebase/firestore';
import { db } from '../firebase';
import EnhancedCoachProfile from './EnhancedCoachProfile';
import { 
  UserIcon, CheckIcon, ClockIcon, AlertIcon, 
  ChartIcon, DocumentIcon, PlusIcon, TrashIcon,
  EditIcon, SendIcon, AttachmentIcon, StarIcon,
  TargetIcon, TrophyIcon, CloseIcon, ICON_COLORS 
} from './Icons';

const AdminDashboard = ({ onClose }) => {
  const [coaches, setCoaches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCoach, setSelectedCoach] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [recommendation, setRecommendation] = useState('');
  const [attachment, setAttachment] = useState({ title: '', url: '', type: 'document' });
  const [showCoachProfile, setShowCoachProfile] = useState(null);

  useEffect(() => {
    loadCoaches();
  }, []);

  const loadCoaches = async () => {
    try {
      const coachesQuery = query(collection(db, 'coaches'), orderBy('provisionedAt', 'desc'));
      const snapshot = await getDocs(coachesQuery);
      const coachData = [];
      
      for (const doc of snapshot.docs) {
        const coach = { id: doc.id, ...doc.data() };
        
        // Calculate readiness score
        coach.readinessScore = calculateReadiness(coach);
        
        // Get user data for onboarding status
        try {
          const userDoc = await getDocs(query(collection(db, 'users'), where('email', '==', coach.email)));
          if (!userDoc.empty) {
            coach.userData = userDoc.docs[0].data();
          }
        } catch (err) {
          console.error('Error fetching user data:', err);
        }
        
        coachData.push(coach);
      }
      
      setCoaches(coachData);
    } catch (error) {
      console.error('Error loading coaches:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateReadiness = (coach) => {
    let score = 0;
    const factors = {
      profileComplete: 20,
      onboardingStarted: 15,
      onboardingCompleted: 25,
      hasRecommendations: 10,
      hasAttachments: 10,
      experienceLevel: 20
    };
    
    // Profile completeness
    if (coach.name && coach.email && coach.background) score += factors.profileComplete;
    
    // Onboarding progress
    if (coach.onboardingStarted) score += factors.onboardingStarted;
    if (coach.status === 'active') score += factors.onboardingCompleted;
    
    // Recommendations and attachments
    if (coach.adminRecommendations?.length > 0) score += factors.hasRecommendations;
    if (coach.attachments?.length > 0) score += factors.hasAttachments;
    
    // Experience level
    const exp = parseInt(coach.experience) || 0;
    score += Math.min(exp * 4, factors.experienceLevel);
    
    return score;
  };

  const getReadinessColor = (score) => {
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const getStatusBadge = (coach) => {
    if (coach.status === 'active') {
      return { label: 'Active', color: '#22c55e', icon: CheckIcon };
    } else if (coach.onboardingStarted) {
      return { label: 'Onboarding', color: '#3b82f6', icon: ClockIcon };
    } else if (coach.status === 'provisioned') {
      return { label: 'Provisioned', color: '#f59e0b', icon: AlertIcon };
    }
    return { label: 'Pending', color: '#6b7280', icon: ClockIcon };
  };

  const addRecommendation = async () => {
    if (!selectedCoach || !recommendation.trim()) return;
    
    try {
      const newRec = {
        text: recommendation,
        createdAt: new Date().toISOString(),
        createdBy: 'admin'
      };
      
      const coachRef = doc(db, 'coaches', selectedCoach.id);
      const currentRecs = selectedCoach.adminRecommendations || [];
      
      await updateDoc(coachRef, {
        adminRecommendations: [...currentRecs, newRec]
      });
      
      setRecommendation('');
      loadCoaches();
    } catch (error) {
      console.error('Error adding recommendation:', error);
    }
  };

  const addAttachment = async () => {
    if (!selectedCoach || !attachment.title || !attachment.url) return;
    
    try {
      const newAttachment = {
        ...attachment,
        createdAt: new Date().toISOString(),
        createdBy: 'admin'
      };
      
      const coachRef = doc(db, 'coaches', selectedCoach.id);
      const currentAttachments = selectedCoach.attachments || [];
      
      await updateDoc(coachRef, {
        attachments: [...currentAttachments, newAttachment]
      });
      
      setAttachment({ title: '', url: '', type: 'document' });
      loadCoaches();
    } catch (error) {
      console.error('Error adding attachment:', error);
    }
  };

  const removeItem = async (itemType, index) => {
    if (!selectedCoach) return;
    
    try {
      const coachRef = doc(db, 'coaches', selectedCoach.id);
      const items = [...(selectedCoach[itemType] || [])];
      items.splice(index, 1);
      
      await updateDoc(coachRef, {
        [itemType]: items
      });
      
      loadCoaches();
    } catch (error) {
      console.error('Error removing item:', error);
    }
  };

  if (loading) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div style={{
          background: 'white',
          padding: '32px',
          borderRadius: '16px',
          textAlign: 'center'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '3px solid rgba(255, 74, 35, 0.1)',
            borderTopColor: ICON_COLORS.primary,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p>Loading coaches...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
      overflow: 'auto'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '1400px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 32px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '4px' }}>
              Admin Dashboard
            </h2>
            <p style={{ color: '#6b7280' }}>
              Monitor coach readiness and manage resources
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '8px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              borderRadius: '8px'
            }}
          >
            <CloseIcon size={24} color="#6b7280" />
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #e5e7eb',
          padding: '0 32px'
        }}>
          {['overview', 'recommendations', 'resources'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '16px 24px',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab ? `2px solid ${ICON_COLORS.primary}` : 'none',
                color: activeTab === tab ? ICON_COLORS.primary : '#6b7280',
                fontWeight: activeTab === tab ? '600' : '400',
                cursor: 'pointer',
                textTransform: 'capitalize'
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '32px'
        }}>
          {activeTab === 'overview' && (
            <div>
              {/* Summary Stats */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '20px',
                marginBottom: '32px'
              }}>
                <div style={{
                  background: '#f0fdf4',
                  padding: '24px',
                  borderRadius: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <UserIcon size={24} color="#22c55e" />
                    <h3 style={{ fontSize: '1.125rem', fontWeight: '600' }}>Total Coaches</h3>
                  </div>
                  <p style={{ fontSize: '2rem', fontWeight: '700', color: '#22c55e' }}>
                    {coaches.length}
                  </p>
                </div>

                <div style={{
                  background: '#fef3c7',
                  padding: '24px',
                  borderRadius: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <ClockIcon size={24} color="#f59e0b" />
                    <h3 style={{ fontSize: '1.125rem', fontWeight: '600' }}>In Onboarding</h3>
                  </div>
                  <p style={{ fontSize: '2rem', fontWeight: '700', color: '#f59e0b' }}>
                    {coaches.filter(c => c.onboardingStarted && c.status !== 'active').length}
                  </p>
                </div>

                <div style={{
                  background: '#dbeafe',
                  padding: '24px',
                  borderRadius: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <TrophyIcon size={24} color="#3b82f6" />
                    <h3 style={{ fontSize: '1.125rem', fontWeight: '600' }}>Ready to Coach</h3>
                  </div>
                  <p style={{ fontSize: '2rem', fontWeight: '700', color: '#3b82f6' }}>
                    {coaches.filter(c => c.readinessScore >= 80).length}
                  </p>
                </div>
              </div>

              {/* Coach Table */}
              <div style={{
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                overflow: 'hidden'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f9fafb' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600' }}>Coach</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600' }}>Status</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600' }}>Readiness</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600' }}>Experience</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600' }}>Strengths</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coaches.map(coach => {
                      const status = getStatusBadge(coach);
                      const StatusIcon = status.icon;
                      
                      return (
                        <tr key={coach.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                          <td style={{ padding: '16px' }}>
                            <div>
                              <div style={{ fontWeight: '600' }}>{coach.name}</div>
                              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>{coach.email}</div>
                            </div>
                          </td>
                          <td style={{ padding: '16px' }}>
                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '4px 12px',
                              background: `${status.color}20`,
                              borderRadius: '20px'
                            }}>
                              <StatusIcon size={16} color={status.color} />
                              <span style={{ fontSize: '0.875rem', color: status.color, fontWeight: '500' }}>
                                {status.label}
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{
                                width: '100px',
                                height: '8px',
                                background: '#e5e7eb',
                                borderRadius: '4px',
                                overflow: 'hidden'
                              }}>
                                <div style={{
                                  width: `${coach.readinessScore}%`,
                                  height: '100%',
                                  background: getReadinessColor(coach.readinessScore),
                                  transition: 'width 0.3s ease'
                                }} />
                              </div>
                              <span style={{ 
                                fontSize: '0.875rem', 
                                fontWeight: '600',
                                color: getReadinessColor(coach.readinessScore)
                              }}>
                                {coach.readinessScore}%
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: '16px' }}>
                            <div>
                              <div>{coach.experience} years</div>
                              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>{coach.background}</div>
                            </div>
                          </td>
                          <td style={{ padding: '16px' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                              {coach.strengths?.slice(0, 2).map((strength, idx) => (
                                <span key={idx} style={{
                                  fontSize: '0.75rem',
                                  padding: '2px 8px',
                                  background: '#e0f2fe',
                                  color: '#0369a1',
                                  borderRadius: '12px'
                                }}>
                                  {strength}
                                </span>
                              ))}
                              {coach.strengths?.length > 2 && (
                                <span style={{
                                  fontSize: '0.75rem',
                                  padding: '2px 8px',
                                  background: '#f3f4f6',
                                  color: '#6b7280',
                                  borderRadius: '12px'
                                }}>
                                  +{coach.strengths.length - 2}
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '16px' }}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                onClick={() => setShowCoachProfile(coach)}
                                style={{
                                  padding: '6px 12px',
                                  background: '#3b82f6',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '0.875rem'
                                }}
                              >
                                View Profile
                              </button>
                              <button
                                onClick={() => setSelectedCoach(coach)}
                                style={{
                                  padding: '6px 12px',
                                  background: ICON_COLORS.primary,
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '0.875rem'
                                }}
                              >
                                Manage
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'recommendations' && (
            <div>
              {selectedCoach ? (
                <div>
                  <div style={{ marginBottom: '24px' }}>
                    <button
                      onClick={() => setSelectedCoach(null)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 16px',
                        background: '#f3f4f6',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        marginBottom: '16px'
                      }}
                    >
                      ← Back to list
                    </button>
                    
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '8px' }}>
                      Recommendations for {selectedCoach.name}
                    </h3>
                    <p style={{ color: '#6b7280' }}>
                      Add personalized recommendations to guide this coach's development
                    </p>
                  </div>

                  {/* Add Recommendation Form */}
                  <div style={{
                    background: '#f9fafb',
                    padding: '24px',
                    borderRadius: '12px',
                    marginBottom: '24px'
                  }}>
                    <h4 style={{ marginBottom: '16px', fontWeight: '600' }}>Add New Recommendation</h4>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <textarea
                        value={recommendation}
                        onChange={(e) => setRecommendation(e.target.value)}
                        placeholder="Enter your recommendation for this coach..."
                        style={{
                          flex: 1,
                          padding: '12px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          minHeight: '80px',
                          resize: 'vertical'
                        }}
                      />
                      <button
                        onClick={addRecommendation}
                        disabled={!recommendation.trim()}
                        style={{
                          padding: '12px 24px',
                          background: recommendation.trim() ? ICON_COLORS.primary : '#e5e7eb',
                          color: recommendation.trim() ? 'white' : '#9ca3af',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: recommendation.trim() ? 'pointer' : 'not-allowed',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        <SendIcon size={20} color={recommendation.trim() ? 'white' : '#9ca3af'} />
                        Add
                      </button>
                    </div>
                  </div>

                  {/* Existing Recommendations */}
                  <div>
                    <h4 style={{ marginBottom: '16px', fontWeight: '600' }}>Current Recommendations</h4>
                    {selectedCoach.adminRecommendations?.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {selectedCoach.adminRecommendations.map((rec, idx) => (
                          <div key={idx} style={{
                            background: 'white',
                            padding: '16px',
                            borderRadius: '8px',
                            border: '1px solid #e5e7eb',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'start'
                          }}>
                            <div style={{ flex: 1 }}>
                              <p style={{ marginBottom: '8px' }}>{rec.text}</p>
                              <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                Added {new Date(rec.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <button
                              onClick={() => removeItem('adminRecommendations', idx)}
                              style={{
                                padding: '4px',
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                color: '#ef4444'
                              }}
                            >
                              <TrashIcon size={16} color="#ef4444" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ color: '#6b7280', fontStyle: 'italic' }}>
                        No recommendations added yet
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '48px' }}>
                  <UserIcon size={48} color="#e5e7eb" />
                  <p style={{ marginTop: '16px', color: '#6b7280' }}>
                    Select a coach from the Overview tab to manage recommendations
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'resources' && (
            <div>
              {selectedCoach ? (
                <div>
                  <div style={{ marginBottom: '24px' }}>
                    <button
                      onClick={() => setSelectedCoach(null)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 16px',
                        background: '#f3f4f6',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        marginBottom: '16px'
                      }}
                    >
                      ← Back to list
                    </button>
                    
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '8px' }}>
                      Resources for {selectedCoach.name}
                    </h3>
                    <p style={{ color: '#6b7280' }}>
                      Attach documents, videos, and other resources for this coach
                    </p>
                  </div>

                  {/* Add Resource Form */}
                  <div style={{
                    background: '#f9fafb',
                    padding: '24px',
                    borderRadius: '12px',
                    marginBottom: '24px'
                  }}>
                    <h4 style={{ marginBottom: '16px', fontWeight: '600' }}>Add New Resource</h4>
                    <div style={{ display: 'grid', gap: '12px' }}>
                      <input
                        value={attachment.title}
                        onChange={(e) => setAttachment({ ...attachment, title: e.target.value })}
                        placeholder="Resource title"
                        style={{
                          padding: '12px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px'
                        }}
                      />
                      <input
                        value={attachment.url}
                        onChange={(e) => setAttachment({ ...attachment, url: e.target.value })}
                        placeholder="Resource URL (Google Drive, YouTube, etc.)"
                        style={{
                          padding: '12px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px'
                        }}
                      />
                      <select
                        value={attachment.type}
                        onChange={(e) => setAttachment({ ...attachment, type: e.target.value })}
                        style={{
                          padding: '12px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px'
                        }}
                      >
                        <option value="document">Document</option>
                        <option value="video">Video</option>
                        <option value="template">Template</option>
                        <option value="guide">Guide</option>
                      </select>
                      <button
                        onClick={addAttachment}
                        disabled={!attachment.title || !attachment.url}
                        style={{
                          padding: '12px 24px',
                          background: attachment.title && attachment.url ? ICON_COLORS.primary : '#e5e7eb',
                          color: attachment.title && attachment.url ? 'white' : '#9ca3af',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: attachment.title && attachment.url ? 'pointer' : 'not-allowed',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px'
                        }}
                      >
                        <AttachmentIcon size={20} color={attachment.title && attachment.url ? 'white' : '#9ca3af'} />
                        Add Resource
                      </button>
                    </div>
                  </div>

                  {/* Existing Resources */}
                  <div>
                    <h4 style={{ marginBottom: '16px', fontWeight: '600' }}>Current Resources</h4>
                    {selectedCoach.attachments?.length > 0 ? (
                      <div style={{ display: 'grid', gap: '12px' }}>
                        {selectedCoach.attachments.map((att, idx) => (
                          <div key={idx} style={{
                            background: 'white',
                            padding: '16px',
                            borderRadius: '8px',
                            border: '1px solid #e5e7eb',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <DocumentIcon size={24} color="#6b7280" />
                              <div>
                                <a 
                                  href={att.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  style={{ 
                                    fontWeight: '600', 
                                    color: ICON_COLORS.primary,
                                    textDecoration: 'none'
                                  }}
                                >
                                  {att.title}
                                </a>
                                <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                  {att.type} • Added {new Date(att.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => removeItem('attachments', idx)}
                              style={{
                                padding: '4px',
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                color: '#ef4444'
                              }}
                            >
                              <TrashIcon size={16} color="#ef4444" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ color: '#6b7280', fontStyle: 'italic' }}>
                        No resources attached yet
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '48px' }}>
                  <DocumentIcon size={48} color="#e5e7eb" />
                  <p style={{ marginTop: '16px', color: '#6b7280' }}>
                    Select a coach from the Overview tab to manage resources
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      
      {/* Enhanced Coach Profile Modal */}
      {showCoachProfile && (
        <EnhancedCoachProfile 
          coachId={showCoachProfile.id}
          onClose={() => setShowCoachProfile(null)}
        />
      )}
    </div>
  );
};

export default AdminDashboard;