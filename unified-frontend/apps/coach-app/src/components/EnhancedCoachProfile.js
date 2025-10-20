import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, arrayUnion, increment } from 'firebase/firestore';
import { db } from '../firebase';
import emailService from '../services/emailService';
import { 
  UserIcon, StarIcon, ClockIcon, CheckIcon, TrophyIcon,
  BookIcon, VideoIcon, CalendarIcon, ChartIcon, TargetIcon,
  ICON_COLORS 
} from './Icons';

const EnhancedCoachProfile = ({ coachId, onClose }) => {
  const [coachData, setCoachData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [newActivity, setNewActivity] = useState('');

  useEffect(() => {
    loadCoachProfile();
  }, [coachId]);

  const loadCoachProfile = async () => {
    try {
      const coachDoc = await getDoc(doc(db, 'coaches', coachId));
      if (coachDoc.exists()) {
        const data = { id: coachDoc.id, ...coachDoc.data() };
        
        // Initialize tracking fields if they don't exist
        if (!data.activityLog) data.activityLog = [];
        if (!data.videosWatched) data.videosWatched = [];
        if (!data.milestones) data.milestones = [];
        if (!data.performanceMetrics) {
          data.performanceMetrics = {
            videoCompletionRate: 0,
            assessmentScore: 0,
            practiceSessionsCompleted: 0,
            studentInteractions: 0,
            parentFeedbackScore: 0
          };
        }
        if (!data.learningPath) {
          data.learningPath = {
            currentModule: 'Fundamentals',
            completedModules: [],
            nextMilestone: 'Complete Onboarding',
            estimatedCompletion: '2 weeks'
          };
        }
        
        setCoachData(data);
      }
    } catch (error) {
      console.error('Error loading coach profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const trackActivity = async (activity) => {
    try {
      const activityEntry = {
        type: activity.type,
        description: activity.description,
        timestamp: new Date().toISOString(),
        points: activity.points || 0
      };

      const coachRef = doc(db, 'coaches', coachId);
      await updateDoc(coachRef, {
        activityLog: arrayUnion(activityEntry),
        'performanceMetrics.totalPoints': increment(activity.points || 0)
      });

      // Check for milestone achievements
      await checkMilestones();
      
      loadCoachProfile();
    } catch (error) {
      console.error('Error tracking activity:', error);
    }
  };

  const checkMilestones = async () => {
    const milestones = [
      { id: 'first_video', name: 'First Video Watched', requirement: 1, type: 'videos' },
      { id: 'five_videos', name: 'Knowledge Seeker', requirement: 5, type: 'videos' },
      { id: 'ten_videos', name: 'Dedicated Learner', requirement: 10, type: 'videos' },
      { id: 'first_week', name: 'Week 1 Complete', requirement: 7, type: 'days' },
      { id: 'assessment_pass', name: 'Assessment Passed', requirement: 80, type: 'score' }
    ];

    // Check each milestone
    for (const milestone of milestones) {
      if (!coachData.milestones?.find(m => m.id === milestone.id)) {
        let achieved = false;
        
        switch (milestone.type) {
          case 'videos':
            achieved = coachData.videosWatched?.length >= milestone.requirement;
            break;
          case 'days':
            const daysSinceStart = Math.floor(
              (new Date() - new Date(coachData.provisionedAt)) / (1000 * 60 * 60 * 24)
            );
            achieved = daysSinceStart >= milestone.requirement;
            break;
          case 'score':
            achieved = coachData.performanceMetrics?.assessmentScore >= milestone.requirement;
            break;
        }

        if (achieved) {
          await awardMilestone(milestone);
        }
      }
    }
  };

  const awardMilestone = async (milestone) => {
    try {
      const milestoneEntry = {
        ...milestone,
        achievedAt: new Date().toISOString(),
        points: 50
      };

      const coachRef = doc(db, 'coaches', coachId);
      await updateDoc(coachRef, {
        milestones: arrayUnion(milestoneEntry),
        'performanceMetrics.totalPoints': increment(50)
      });

      // Show achievement notification (you can enhance this)
      alert(`🎉 Milestone Achieved: ${milestone.name}!`);
      
      // Send milestone email
      await emailService.triggerMilestoneEmail(coachData.email, {
        coachName: coachData.name,
        milestoneName: milestone.name,
        points: 50,
        totalPoints: (coachData.performanceMetrics?.totalPoints || 0) + 50,
        nextMilestone: 'Complete next module'
      });
    } catch (error) {
      console.error('Error awarding milestone:', error);
    }
  };

  const recordVideoWatch = async (videoId, videoTitle) => {
    const videoEntry = {
      id: videoId,
      title: videoTitle,
      watchedAt: new Date().toISOString(),
      duration: Math.floor(Math.random() * 30) + 10 // Simulated duration
    };

    await trackActivity({
      type: 'video_watched',
      description: `Watched: ${videoTitle}`,
      points: 10
    });

    const coachRef = doc(db, 'coaches', coachId);
    await updateDoc(coachRef, {
      videosWatched: arrayUnion(videoEntry)
    });
  };

  // Calculate progress metrics
  const calculateProgress = () => {
    if (!coachData) return { overall: 0, modules: 0, videos: 0 };
    
    const totalVideos = 20; // Total videos in curriculum
    const totalModules = 5; // Total modules
    
    const videosWatched = coachData.videosWatched?.length || 0;
    const modulesCompleted = coachData.learningPath?.completedModules?.length || 0;
    
    return {
      overall: Math.round(((videosWatched / totalVideos) + (modulesCompleted / totalModules)) * 50),
      modules: Math.round((modulesCompleted / totalModules) * 100),
      videos: Math.round((videosWatched / totalVideos) * 100)
    };
  };

  const progress = calculateProgress();

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
          Loading coach profile...
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
        maxWidth: '1200px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 32px',
          borderBottom: '1px solid #e5e7eb',
          background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              <div style={{
                width: '80px',
                height: '80px',
                background: '#3b82f6',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <UserIcon size={40} color="white" />
              </div>
              <div>
                <h2 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '4px' }}>
                  {coachData?.name}
                </h2>
                <p style={{ color: '#6b7280', marginBottom: '8px' }}>{coachData?.email}</p>
                <div style={{ display: 'flex', gap: '16px', fontSize: '0.875rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CalendarIcon size={16} color="#6b7280" />
                    Joined {new Date(coachData?.provisionedAt).toLocaleDateString()}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <TrophyIcon size={16} color="#6b7280" />
                    {coachData?.performanceMetrics?.totalPoints || 0} points
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <StarIcon size={16} color="#6b7280" />
                    {coachData?.milestones?.length || 0} milestones
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                padding: '8px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1.5rem'
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Progress Overview */}
        <div style={{
          padding: '24px 32px',
          background: '#f9fafb',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Overall Progress</span>
                <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>{progress.overall}%</span>
              </div>
              <div style={{ height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{
                  width: `${progress.overall}%`,
                  height: '100%',
                  background: ICON_COLORS.primary,
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>
            
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Modules Completed</span>
                <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>{progress.modules}%</span>
              </div>
              <div style={{ height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{
                  width: `${progress.modules}%`,
                  height: '100%',
                  background: '#3b82f6',
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>
            
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Videos Watched</span>
                <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>{progress.videos}%</span>
              </div>
              <div style={{ height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{
                  width: `${progress.videos}%`,
                  height: '100%',
                  background: '#22c55e',
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #e5e7eb',
          padding: '0 32px'
        }}>
          {['overview', 'activity', 'milestones', 'performance'].map(tab => (
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              {/* Learning Path */}
              <div style={{
                background: 'white',
                padding: '24px',
                borderRadius: '12px',
                border: '1px solid #e5e7eb'
              }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TargetIcon size={20} color={ICON_COLORS.primary} />
                  Learning Path
                </h3>
                <div style={{ marginBottom: '16px' }}>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '4px' }}>Current Module</p>
                  <p style={{ fontSize: '1.125rem', fontWeight: '600' }}>{coachData?.learningPath?.currentModule}</p>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '4px' }}>Next Milestone</p>
                  <p style={{ fontSize: '1rem' }}>{coachData?.learningPath?.nextMilestone}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '4px' }}>Estimated Completion</p>
                  <p style={{ fontSize: '1rem' }}>{coachData?.learningPath?.estimatedCompletion}</p>
                </div>
              </div>

              {/* Recent Activity */}
              <div style={{
                background: 'white',
                padding: '24px',
                borderRadius: '12px',
                border: '1px solid #e5e7eb'
              }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ClockIcon size={20} color={ICON_COLORS.primary} />
                  Recent Activity
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {coachData?.activityLog?.slice(-5).reverse().map((activity, idx) => (
                    <div key={idx} style={{
                      padding: '12px',
                      background: '#f9fafb',
                      borderRadius: '8px',
                      fontSize: '0.875rem'
                    }}>
                      <p style={{ marginBottom: '4px' }}>{activity.description}</p>
                      <p style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                        {new Date(activity.timestamp).toLocaleDateString()} at {new Date(activity.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  ))}
                  {(!coachData?.activityLog || coachData.activityLog.length === 0) && (
                    <p style={{ color: '#6b7280', fontStyle: 'italic' }}>No recent activity</p>
                  )}
                </div>
              </div>

              {/* Performance Summary */}
              <div style={{
                background: 'white',
                padding: '24px',
                borderRadius: '12px',
                border: '1px solid #e5e7eb'
              }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ChartIcon size={20} color={ICON_COLORS.primary} />
                  Performance Metrics
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '4px' }}>Videos Completed</p>
                    <p style={{ fontSize: '1.5rem', fontWeight: '700' }}>{coachData?.videosWatched?.length || 0}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '4px' }}>Practice Sessions</p>
                    <p style={{ fontSize: '1.5rem', fontWeight: '700' }}>{coachData?.performanceMetrics?.practiceSessionsCompleted || 0}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '4px' }}>Assessment Score</p>
                    <p style={{ fontSize: '1.5rem', fontWeight: '700' }}>{coachData?.performanceMetrics?.assessmentScore || 0}%</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '4px' }}>Total Points</p>
                    <p style={{ fontSize: '1.5rem', fontWeight: '700' }}>{coachData?.performanceMetrics?.totalPoints || 0}</p>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div style={{
                background: 'white',
                padding: '24px',
                borderRadius: '12px',
                border: '1px solid #e5e7eb'
              }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '16px' }}>Quick Actions</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <button
                    onClick={() => recordVideoWatch('demo-video', 'Advanced SAT Strategies')}
                    style={{
                      padding: '12px',
                      background: ICON_COLORS.primary,
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <VideoIcon size={20} color="white" />
                    Simulate Video Watch
                  </button>
                  <button
                    onClick={() => trackActivity({
                      type: 'practice_session',
                      description: 'Completed mock coaching session',
                      points: 25
                    })}
                    style={{
                      padding: '12px',
                      background: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <BookIcon size={20} color="white" />
                    Log Practice Session
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div>
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '16px' }}>Activity Timeline</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {coachData?.activityLog?.slice().reverse().map((activity, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      gap: '16px',
                      padding: '16px',
                      background: 'white',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb'
                    }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        background: '#e0f2fe',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {activity.type === 'video_watched' ? <VideoIcon size={24} color="#3b82f6" /> : <CheckIcon size={24} color="#3b82f6" />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: '600', marginBottom: '4px' }}>{activity.description}</p>
                        <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                          {new Date(activity.timestamp).toLocaleDateString()} at {new Date(activity.timestamp).toLocaleTimeString()}
                        </p>
                        {activity.points > 0 && (
                          <span style={{
                            display: 'inline-block',
                            marginTop: '8px',
                            padding: '2px 8px',
                            background: '#fef3c7',
                            color: '#f59e0b',
                            borderRadius: '12px',
                            fontSize: '0.75rem'
                          }}>
                            +{activity.points} points
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {(!coachData?.activityLog || coachData.activityLog.length === 0) && (
                    <p style={{ color: '#6b7280', fontStyle: 'italic', textAlign: 'center', padding: '48px' }}>
                      No activity recorded yet
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'milestones' && (
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '24px' }}>Achievements & Milestones</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                {coachData?.milestones?.map((milestone, idx) => (
                  <div key={idx} style={{
                    padding: '20px',
                    background: 'linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%)',
                    borderRadius: '12px',
                    border: '1px solid #fbbf24'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <TrophyIcon size={32} color="#f59e0b" />
                      <div>
                        <h4 style={{ fontWeight: '600', marginBottom: '4px' }}>{milestone.name}</h4>
                        <p style={{ fontSize: '0.875rem', color: '#92400e' }}>
                          Achieved on {new Date(milestone.achievedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <p style={{ fontSize: '0.875rem', color: '#78350f' }}>
                      +{milestone.points} points earned
                    </p>
                  </div>
                ))}
                {(!coachData?.milestones || coachData.milestones.length === 0) && (
                  <p style={{ color: '#6b7280', fontStyle: 'italic', gridColumn: '1 / -1', textAlign: 'center', padding: '48px' }}>
                    No milestones achieved yet. Keep learning!
                  </p>
                )}
              </div>

              {/* Upcoming Milestones */}
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginTop: '48px', marginBottom: '24px' }}>
                Upcoming Milestones
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                <div style={{
                  padding: '20px',
                  background: '#f3f4f6',
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb'
                }}>
                  <h4 style={{ fontWeight: '600', marginBottom: '8px' }}>Complete 10 Videos</h4>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '8px' }}>
                    Watch 10 training videos to unlock this achievement
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ flex: 1, height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${(coachData?.videosWatched?.length || 0) * 10}%`,
                        height: '100%',
                        background: '#3b82f6'
                      }} />
                    </div>
                    <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                      {coachData?.videosWatched?.length || 0}/10
                    </span>
                  </div>
                </div>

                <div style={{
                  padding: '20px',
                  background: '#f3f4f6',
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb'
                }}>
                  <h4 style={{ fontWeight: '600', marginBottom: '8px' }}>Pass Assessment</h4>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '8px' }}>
                    Score 80% or higher on the certification assessment
                  </p>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    Status: Not attempted
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'performance' && (
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '24px' }}>Detailed Performance Metrics</h3>
              
              {/* Metric Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                <div style={{
                  background: 'white',
                  padding: '24px',
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <h4 style={{ fontSize: '1rem', color: '#6b7280' }}>Video Completion Rate</h4>
                    <VideoIcon size={24} color="#3b82f6" />
                  </div>
                  <p style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '4px' }}>
                    {Math.round((coachData?.videosWatched?.length || 0) / 20 * 100)}%
                  </p>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    {coachData?.videosWatched?.length || 0} of 20 videos completed
                  </p>
                </div>

                <div style={{
                  background: 'white',
                  padding: '24px',
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <h4 style={{ fontSize: '1rem', color: '#6b7280' }}>Practice Sessions</h4>
                    <BookIcon size={24} color="#22c55e" />
                  </div>
                  <p style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '4px' }}>
                    {coachData?.performanceMetrics?.practiceSessionsCompleted || 0}
                  </p>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    Target: 10 sessions
                  </p>
                </div>

                <div style={{
                  background: 'white',
                  padding: '24px',
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <h4 style={{ fontSize: '1rem', color: '#6b7280' }}>Learning Streak</h4>
                    <StarIcon size={24} color="#f59e0b" />
                  </div>
                  <p style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '4px' }}>
                    {Math.floor(Math.random() * 7) + 1} days
                  </p>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    Keep it up!
                  </p>
                </div>
              </div>

              {/* Performance Recommendations */}
              <div style={{
                background: '#f0f9ff',
                padding: '24px',
                borderRadius: '12px',
                border: '1px solid #bfdbfe'
              }}>
                <h4 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TargetIcon size={20} color="#3b82f6" />
                  Personalized Recommendations
                </h4>
                <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <li>Complete 3 more videos this week to maintain your learning momentum</li>
                  <li>Schedule your first practice coaching session with a mentor</li>
                  <li>Review the SAT Strategy module based on your identified gaps</li>
                  <li>Join the next group coaching call on Thursday at 3 PM</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedCoachProfile;