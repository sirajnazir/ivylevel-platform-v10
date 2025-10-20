import React, { useState, useEffect } from 'react';
import { HERO_COACHES, HERO_SESSIONS, generatePersonalizedInsights, SUCCESS_PATTERNS, COACHING_FRAMEWORKS } from '../services/heroCoachesData';
import knowledgeBaseService from '../services/knowledgeBaseService';
import { 
  StarIcon, UserIcon, VideoIcon, BookIcon, 
  ChartIcon, CalendarIcon, TrophyIcon, TargetIcon,
  DocumentIcon, PlayIcon, ArrowRightIcon, CheckIcon,
  ICON_COLORS 
} from './Icons';

const PersonalizedKnowledgeBase = ({ currentUser }) => {
  // Determine which coach to show based on user role
  const getCoachKey = () => {
    if (currentUser?.role === 'admin') {
      return 'kelvin'; // Admin can see all, default to Kelvin
    }
    // Map user emails to coach keys
    const emailToCoach = {
      'kelvin@ivylevel.com': 'kelvin',
      'noor@ivylevel.com': 'noor',
      'jamie@ivylevel.com': 'jamie'
    };
    return emailToCoach[currentUser?.email] || 'kelvin';
  };

  const [selectedCoach, setSelectedCoach] = useState(getCoachKey());
  const [selectedSession, setSelectedSession] = useState(null);
  const [activeTab, setActiveTab] = useState('sessions');
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [personalizedContent, setPersonalizedContent] = useState(null);
  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    // Load personalized content based on user profile
    if (currentUser) {
      loadPersonalizedContent();
    }
  }, [currentUser, selectedCoach]);

  const loadPersonalizedContent = async () => {
    // Simulate loading personalized insights
    const coach = HERO_COACHES[selectedCoach];
    const sessions = HERO_SESSIONS[selectedCoach];
    const insights = generatePersonalizedInsights(selectedCoach, currentUser?.student, 8);
    
    setPersonalizedContent({
      coach,
      sessions,
      insights,
      patterns: SUCCESS_PATTERNS[selectedCoach],
      frameworks: COACHING_FRAMEWORKS[selectedCoach]
    });
  };

  const CoachCard = ({ coachKey }) => {
    const coach = HERO_COACHES[coachKey];
    const isSelected = selectedCoach === coachKey;
    
    return (
      <div
        onClick={() => setSelectedCoach(coachKey)}
        style={{
          border: `2px solid ${isSelected ? ICON_COLORS.primary : '#f0f0f0'}`,
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '16px',
          cursor: 'pointer',
          background: isSelected ? '#fff5f5' : '#fff',
          transition: 'all 0.3s ease'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${ICON_COLORS.primary}, ${ICON_COLORS.secondary})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '24px',
            fontWeight: 'bold'
          }}>
            {coach.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, color: ICON_COLORS.secondary }}>{coach.name}</h3>
            <p style={{ margin: '4px 0', color: '#666', fontSize: '14px' }}>
              {coach.expertise.slice(0, 2).join(' • ')}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: ICON_COLORS.success }}>
              <TrophyIcon size={16} color={ICON_COLORS.success} />
              <span style={{ fontWeight: 'bold' }}>{coach.acceptanceRate}%</span>
            </div>
            <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>Success Rate</p>
          </div>
        </div>
        
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>{coach.bio}</p>
        
        <div style={{ display: 'flex', gap: '24px', fontSize: '13px', color: '#888' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <UserIcon size={14} color="#888" />
            <span>{coach.studentsHelped} students</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CalendarIcon size={14} color="#888" />
            <span>{coach.yearsExperience} years</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <StarIcon size={14} color="#888" />
            <span>{coach.topSchools[0]}, {coach.topSchools[1]}+</span>
          </div>
        </div>
      </div>
    );
  };

  const SessionCard = ({ session }) => {
    const isSelected = selectedSession?.id === session.id;
    
    return (
      <div
        onClick={() => setSelectedSession(session)}
        style={{
          border: `1px solid ${isSelected ? ICON_COLORS.primary : '#e0e0e0'}`,
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '12px',
          cursor: 'pointer',
          background: isSelected ? '#fff9f7' : '#fff',
          transition: 'all 0.2s ease'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
          <h4 style={{ margin: 0, fontSize: '16px', color: ICON_COLORS.secondary }}>
            {session.title}
          </h4>
          <span style={{
            background: ICON_COLORS.primary,
            color: 'white',
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: 'bold'
          }}>
            Week {session.week}
          </span>
        </div>
        
        <div style={{ display: 'flex', gap: '16px', marginBottom: '8px', fontSize: '13px', color: '#666' }}>
          <span><UserIcon size={12} color="#666" style={{ marginRight: '4px' }} />{session.student}</span>
          <span><CalendarIcon size={12} color="#666" style={{ marginRight: '4px' }} />{new Date(session.date).toLocaleDateString()}</span>
          <span>{session.duration} min</span>
        </div>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
          {session.keyTopics.map((topic, i) => (
            <span key={i} style={{
              background: '#f0f0f0',
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              color: '#666'
            }}>
              {topic}
            </span>
          ))}
        </div>
        
        {session.gameChangingMoment && (
          <div style={{
            background: '#fef3c7',
            padding: '8px',
            borderRadius: '4px',
            fontSize: '12px',
            color: '#92400e',
            marginTop: '8px'
          }}>
            <strong>💡 Game Changer:</strong> {session.gameChangingMoment}
          </div>
        )}
        
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          {session.hasVideo && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowVideoModal(session);
              }}
              style={{
                background: ICON_COLORS.primary,
                color: 'white',
                border: 'none',
                padding: '4px 12px',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <PlayIcon size={12} color="white" />
              Watch Session
            </button>
          )}
          {session.hasTranscript && (
            <span style={{ fontSize: '11px', color: '#666', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <DocumentIcon size={12} color="#666" />
              Transcript
            </span>
          )}
          {session.hasInsights && (
            <span style={{ fontSize: '11px', color: '#666', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ChartIcon size={12} color="#666" />
              AI Insights
            </span>
          )}
        </div>
      </div>
    );
  };

  const InsightsPanel = ({ session }) => {
    if (!session?.insights) return null;
    
    return (
      <div style={{ padding: '20px', background: '#f9f9f9', borderRadius: '8px' }}>
        <h4 style={{ marginTop: 0, color: ICON_COLORS.secondary }}>
          <ChartIcon size={20} color={ICON_COLORS.secondary} style={{ marginRight: '8px' }} />
          Session Insights
        </h4>
        
        <div style={{ marginBottom: '20px' }}>
          <h5 style={{ color: '#666', marginBottom: '8px' }}>Summary</h5>
          <p style={{ fontSize: '14px', lineHeight: '1.6' }}>{session.insights.summary}</p>
        </div>
        
        <div style={{ marginBottom: '20px' }}>
          <h5 style={{ color: '#666', marginBottom: '8px' }}>Action Items</h5>
          {session.insights.actionItems.map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '6px', fontSize: '14px' }}>
              <CheckIcon size={16} color={ICON_COLORS.success} />
              <span>{item}</span>
            </div>
          ))}
        </div>
        
        <div style={{ marginBottom: '20px' }}>
          <h5 style={{ color: '#666', marginBottom: '8px' }}>Coaching Highlights</h5>
          {session.insights.coachingHighlights.map((highlight, i) => (
            <div key={i} style={{
              background: 'white',
              padding: '8px 12px',
              borderLeft: `3px solid ${ICON_COLORS.primary}`,
              marginBottom: '6px',
              fontSize: '13px'
            }}>
              {highlight}
            </div>
          ))}
        </div>
        
        {session.insights.studentProgress && (
          <div>
            <h5 style={{ color: '#666', marginBottom: '8px' }}>Student Progress</h5>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ background: '#e6f7e6', padding: '12px', borderRadius: '6px' }}>
                <h6 style={{ margin: '0 0 6px 0', color: ICON_COLORS.success }}>Strengths</h6>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px' }}>
                  {session.insights.studentProgress.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
              <div style={{ background: '#fff4e6', padding: '12px', borderRadius: '6px' }}>
                <h6 style={{ margin: '0 0 6px 0', color: ICON_COLORS.warning }}>Areas to Improve</h6>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px' }}>
                  {session.insights.studentProgress.improvements.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const FrameworksTab = () => {
    const frameworks = personalizedContent?.frameworks;
    if (!frameworks) return null;
    
    return (
      <div style={{ padding: '20px' }}>
        <h3 style={{ color: ICON_COLORS.secondary, marginBottom: '20px' }}>
          {HERO_COACHES[selectedCoach].name}'s Proven Frameworks
        </h3>
        
        {frameworks.templates.map((template, i) => (
          <div key={i} style={{
            background: 'white',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '16px'
          }}>
            <h4 style={{ marginTop: 0, color: ICON_COLORS.primary }}>{template.name}</h4>
            <div style={{
              background: '#f5f5f5',
              padding: '12px',
              borderRadius: '4px',
              marginBottom: '12px',
              fontFamily: 'monospace',
              fontSize: '14px'
            }}>
              {template.structure}
            </div>
            <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>
              <StarIcon size={14} color={ICON_COLORS.success} style={{ marginRight: '4px' }} />
              {template.example}
            </p>
          </div>
        ))}
        
        <div style={{
          background: '#f0f8ff',
          padding: '16px',
          borderRadius: '8px',
          marginTop: '20px'
        }}>
          <h5 style={{ marginTop: 0, color: ICON_COLORS.secondary }}>Success Timeline</h5>
          {Object.entries(personalizedContent.patterns.typicalTimeline).map(([phase, description]) => (
            <div key={phase} style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '8px',
              fontSize: '14px'
            }}>
              <span style={{
                background: ICON_COLORS.primary,
                color: 'white',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                minWidth: '80px',
                marginRight: '12px'
              }}>
                {phase.replace('weeks', 'Weeks ')}
              </span>
              <span>{description}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <h2 style={{ color: ICON_COLORS.secondary, marginBottom: '24px' }}>
        Personalized Knowledge Base
      </h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: isAdmin ? '350px 1fr' : '1fr', gap: '24px' }}>
        {/* Coach Selection Sidebar - Only show for admins */}
        {isAdmin && (
          <div>
            <h3 style={{ color: '#666', marginBottom: '16px' }}>Select Coach View</h3>
            {Object.keys(HERO_COACHES).map(coachKey => (
              <CoachCard key={coachKey} coachKey={coachKey} />
            ))}
          </div>
        )}
        
        {/* Main Content Area */}
        <div>
          {/* Show student profile for coaches */}
          {!isAdmin && currentUser?.student && (
            <div style={{
              background: 'linear-gradient(135deg, #f0f9ff, #fff)',
              padding: '24px',
              borderRadius: '12px',
              marginBottom: '24px',
              border: '2px solid #e0f2fe'
            }}>
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ margin: 0, color: ICON_COLORS.secondary, marginBottom: '8px' }}>
                  Your Student Profile
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                  <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, ${ICON_COLORS.primary}, ${ICON_COLORS.secondary})`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '32px',
                    fontWeight: 'bold'
                  }}>
                    {currentUser.student.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h2 style={{ margin: 0, color: '#1f2937' }}>
                      {currentUser.student.name}
                    </h2>
                    <p style={{ margin: '4px 0', color: '#6b7280' }}>
                      {currentUser.student.grade} • {currentUser.student.focusArea}
                    </p>
                    <p style={{ margin: '4px 0', color: '#6b7280', fontSize: '14px' }}>
                      {currentUser.student.culturalBackground}
                    </p>
                  </div>
                </div>
              </div>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: '12px',
                padding: '16px',
                background: 'rgba(255, 255, 255, 0.7)',
                borderRadius: '8px'
              }}>
                <div>
                  <span style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>Grade Level</span>
                  <p style={{ margin: '4px 0', fontWeight: '600' }}>{currentUser.student.grade}</p>
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>Focus Area</span>
                  <p style={{ margin: '4px 0', fontWeight: '600' }}>{currentUser.student.focusArea}</p>
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>Background</span>
                  <p style={{ margin: '4px 0', fontWeight: '600' }}>{currentUser.student.culturalBackground}</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '20px' }}>
            {['sessions', 'frameworks', 'insights'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  background: activeTab === tab ? ICON_COLORS.primary : '#f0f0f0',
                  color: activeTab === tab ? 'white' : '#666',
                  border: 'none',
                  padding: '8px 20px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  fontWeight: activeTab === tab ? 'bold' : 'normal'
                }}
              >
                {tab === 'sessions' && <VideoIcon size={16} color={activeTab === tab ? 'white' : '#666'} style={{ marginRight: '6px' }} />}
                {tab === 'frameworks' && <BookIcon size={16} color={activeTab === tab ? 'white' : '#666'} style={{ marginRight: '6px' }} />}
                {tab === 'insights' && <ChartIcon size={16} color={activeTab === tab ? 'white' : '#666'} style={{ marginRight: '6px' }} />}
                {tab}
              </button>
            ))}
          </div>
          
          {/* Tab Content */}
          {activeTab === 'sessions' && (
            <div style={{ display: 'grid', gridTemplateColumns: selectedSession ? '1fr 1fr' : '1fr', gap: '20px' }}>
              <div>
                <h4 style={{ color: '#666', marginBottom: '16px' }}>
                  {isAdmin ? 
                    `Recent Sessions with ${HERO_COACHES[selectedCoach].name}` : 
                    `Your Coaching Sessions${currentUser?.student ? ` with ${currentUser.student.name}` : ''}`
                  }
                </h4>
                {HERO_SESSIONS[selectedCoach]
                  .filter(session => {
                    // For non-admin coaches, only show sessions with their assigned student
                    if (!isAdmin && currentUser?.student) {
                      return session.student === currentUser.student.name;
                    }
                    return true; // Show all for admin
                  })
                  .map(session => (
                    <SessionCard key={session.id} session={session} />
                  ))
                }
                {!isAdmin && HERO_SESSIONS[selectedCoach].filter(s => 
                  currentUser?.student && s.student === currentUser.student.name
                ).length === 0 && (
                  <div style={{
                    padding: '40px',
                    textAlign: 'center',
                    background: '#f9fafb',
                    borderRadius: '8px',
                    color: '#666'
                  }}>
                    <VideoIcon size={48} color="#e5e7eb" style={{ marginBottom: '12px' }} />
                    <p>No sessions found with {currentUser?.student?.name}.</p>
                    <p style={{ fontSize: '14px' }}>Start your first session to see it here!</p>
                  </div>
                )}
              </div>
              
              {selectedSession && (
                <div>
                  <h4 style={{ color: '#666', marginBottom: '16px' }}>Session Details</h4>
                  <InsightsPanel session={selectedSession} />
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'frameworks' && <FrameworksTab />}
          
          {activeTab === 'insights' && personalizedContent && (
            <div style={{ padding: '20px', background: '#f9f9f9', borderRadius: '8px' }}>
              <h3 style={{ color: ICON_COLORS.secondary, marginTop: 0 }}>
                Your Personalized Coaching Approach
              </h3>
              
              <div style={{ marginBottom: '20px' }}>
                <h5 style={{ color: '#666' }}>Coaching Philosophy</h5>
                <p>{personalizedContent.insights.approach}</p>
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <h5 style={{ color: '#666' }}>Current Focus</h5>
                <p>{personalizedContent.insights.currentFocus}</p>
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <h5 style={{ color: '#666' }}>Common Breakthroughs</h5>
                {personalizedContent.patterns.commonBreakthroughs.map((breakthrough, i) => (
                  <div key={i} style={{
                    background: 'white',
                    padding: '8px 12px',
                    borderLeft: `3px solid ${ICON_COLORS.success}`,
                    marginBottom: '6px'
                  }}>
                    {breakthrough}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Video Modal */}
      {showVideoModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '8px',
            padding: '20px',
            maxWidth: '800px',
            width: '90%'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ margin: 0 }}>{showVideoModal.title}</h3>
              <button
                onClick={() => setShowVideoModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer'
                }}
              >
                ×
              </button>
            </div>
            <iframe
              src={showVideoModal.videoUrl?.replace('/view', '/preview')}
              style={{
                width: '100%',
                height: '450px',
                border: 'none',
                borderRadius: '4px'
              }}
              allowFullScreen
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonalizedKnowledgeBase;