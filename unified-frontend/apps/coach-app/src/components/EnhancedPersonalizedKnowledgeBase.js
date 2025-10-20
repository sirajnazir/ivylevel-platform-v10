import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../App';
import enhancedDataService from '../services/enhancedDataService';
import smartRecommendationEngine from '../services/smartRecommendationEngine';
import comprehensiveKnowledgeBaseService from '../services/comprehensiveKnowledgeBaseService';
import advancedAnalyticsService from '../services/advancedAnalyticsService';
import { 
  VideoIcon, BookIcon, StarIcon, ClockIcon, 
  TargetIcon, ChartIcon, CheckIcon, ArrowRightIcon,
  UserIcon, CalendarIcon, TrophyIcon, DocumentIcon,
  ICON_COLORS 
} from './Icons';

const EnhancedPersonalizedKnowledgeBase = () => {
  const authContext = useContext(AuthContext);
  const currentUser = authContext.user || authContext.userData || authContext.currentUser;
  const [activeTab, setActiveTab] = useState('recommended');
  const [sessions, setSessions] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const [comprehensiveData, setComprehensiveData] = useState(null);
  const [studentJourney, setStudentJourney] = useState(null);
  const [filters, setFilters] = useState({
    category: 'all',
    timeRange: 'month',
    topic: 'all',
    source: 'all' // all, zoom_cloud, gdrive_archive
  });

  useEffect(() => {
    if (currentUser) {
      loadPersonalizedContent();
      
      // Subscribe to real-time updates
      const unsubscribe = enhancedDataService.subscribeToCoachData(
        currentUser.name || currentUser.displayName || currentUser.id,
        (updatedSessions) => {
          setSessions(updatedSessions);
        }
      );

      return () => {
        enhancedDataService.cleanup();
        unsubscribe();
      };
    }
  }, [currentUser, filters]);

  const loadPersonalizedContent = async () => {
    setLoading(true);
    try {
      // Initialize comprehensive knowledge base (700+ sessions)
      await comprehensiveKnowledgeBaseService.initializeComprehensiveData();

      // Load enriched sessions
      const enrichedSessions = await enhancedDataService.getEnrichedSessions({
        coach: currentUser.name || currentUser.displayName || currentUser.id,
        category: filters.category !== 'all' ? filters.category : null,
        dateRange: enhancedDataService.getDateRange(filters.timeRange)
      });
      setSessions(enrichedSessions);

      // Get comprehensive search results including execution docs and game plans
      const studentData = authContext.userData?.student || currentUser?.student;
      if (studentData && studentData.name) {
        try {
          const comprehensiveResults = await comprehensiveKnowledgeBaseService.comprehensiveSearch({
            student: studentData.name,
            coach: authContext.userData?.name || currentUser?.name || currentUser?.displayName || currentUser?.id,
            dateRange: enhancedDataService.getDateRange(filters.timeRange),
            includeExecutionDocs: true,
            includeGamePlans: true,
            limit: 50
          });
          setComprehensiveData(comprehensiveResults);

          // Get student journey analysis
          try {
            const journeyAnalysis = await advancedAnalyticsService.analyzeStudentOutcomes(
              studentData.name
            );
            setStudentJourney(journeyAnalysis);
          } catch (analyticsError) {
            console.log('Analytics not available for student:', studentData.name);
          }

          // Get smart recommendations
          const recommended = await smartRecommendationEngine.getRecommendedSessions(
            studentData,
            authContext.userData?.name || currentUser?.name || currentUser?.displayName || currentUser?.id,
            { limit: 10, minScore: 0.4 }
          );
          setRecommendations(recommended);

          // Get personalized insights
          const personalizedInsights = await smartRecommendationEngine.getPersonalizedInsights(
            studentData,
            enrichedSessions.slice(0, 10)
          );
          setInsights(personalizedInsights);
        } catch (error) {
          console.error('Error loading student-specific data:', error);
        }
      }

      // Load analytics
      const coachAnalytics = await enhancedDataService.getCoachAnalytics(
        currentUser.name || currentUser.displayName || currentUser.id,
        filters.timeRange
      );
      setAnalytics(coachAnalytics);

    } catch (error) {
      console.error('Error loading personalized content:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStudentProfile = () => {
    if (!currentUser?.student) return null;

    const student = currentUser.student;
    return (
      <div style={{
        background: 'linear-gradient(135deg, #f0f9ff, #fff)',
        padding: '24px',
        borderRadius: '12px',
        marginBottom: '24px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ color: ICON_COLORS.secondary, marginBottom: '8px' }}>
              Your Student Profile
            </h3>
            <h2 style={{ margin: '0 0 16px 0', color: ICON_COLORS.primary }}>
              {student.name}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div>
                <span style={{ color: '#6b7280', fontSize: '14px' }}>Grade</span>
                <p style={{ margin: '4px 0', fontWeight: '500' }}>{student.grade}</p>
              </div>
              <div>
                <span style={{ color: '#6b7280', fontSize: '14px' }}>Focus Area</span>
                <p style={{ margin: '4px 0', fontWeight: '500' }}>{student.focusArea}</p>
              </div>
              <div>
                <span style={{ color: '#6b7280', fontSize: '14px' }}>Background</span>
                <p style={{ margin: '4px 0', fontWeight: '500' }}>{student.culturalBackground}</p>
              </div>
            </div>
          </div>
          <div style={{
            background: 'white',
            padding: '16px',
            borderRadius: '8px',
            minWidth: '200px'
          }}>
            <h4 style={{ margin: '0 0 12px 0', color: ICON_COLORS.secondary }}>
              Target Schools
            </h4>
            {student.targetSchools?.map((school, i) => (
              <div key={i} style={{
                background: ICON_COLORS.primary,
                color: 'white',
                padding: '4px 12px',
                borderRadius: '4px',
                fontSize: '14px',
                marginBottom: '4px',
                display: 'inline-block',
                marginRight: '8px'
              }}>
                {school}
              </div>
            ))}
          </div>
        </div>
        
        {/* Quick Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: '12px',
          marginTop: '20px'
        }}>
          <div style={{
            background: 'white',
            padding: '12px',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <VideoIcon size={24} color={ICON_COLORS.primary} />
            <p style={{ margin: '8px 0 0 0', fontSize: '20px', fontWeight: 'bold' }}>
              {sessions.length}
            </p>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
              Sessions
            </p>
          </div>
          <div style={{
            background: 'white',
            padding: '12px',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <ClockIcon size={24} color={ICON_COLORS.success} />
            <p style={{ margin: '8px 0 0 0', fontSize: '20px', fontWeight: 'bold' }}>
              {Math.round((analytics?.totalDuration || 0) / 60)}h
            </p>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
              Total Time
            </p>
          </div>
          <div style={{
            background: 'white',
            padding: '12px',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <StarIcon size={24} color={ICON_COLORS.warning} />
            <p style={{ margin: '8px 0 0 0', fontSize: '20px', fontWeight: 'bold' }}>
              {analytics?.averageQuality || 0}%
            </p>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
              Quality Score
            </p>
          </div>
          <div style={{
            background: 'white',
            padding: '12px',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <TrophyIcon size={24} color={ICON_COLORS.primary} />
            <p style={{ margin: '8px 0 0 0', fontSize: '20px', fontWeight: 'bold' }}>
              {student.completedMilestones?.length || 0}
            </p>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
              Milestones
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderInsights = () => {
    if (!insights.length) return null;

    return (
      <div style={{
        background: '#fef3c7',
        padding: '20px',
        borderRadius: '12px',
        marginBottom: '24px'
      }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#92400e' }}>
          <StarIcon size={20} color="#92400e" style={{ marginRight: '8px' }} />
          Personalized Insights
        </h3>
        <div style={{ display: 'grid', gap: '12px' }}>
          {insights.map((insight, i) => (
            <div key={i} style={{
              background: 'white',
              padding: '16px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'start',
              gap: '12px'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                background: insight.type === 'achievement' ? '#dbeafe' : '#dcfce7',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {insight.type === 'achievement' ? 
                  <TrophyIcon size={20} color="#3730a3" /> : 
                  <ChartIcon size={20} color="#166534" />
                }
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: '0 0 4px 0', color: ICON_COLORS.secondary }}>
                  {insight.title}
                </h4>
                <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#6b7280' }}>
                  {insight.description}
                </p>
                {insight.actionable && (
                  <button style={{
                    background: ICON_COLORS.primary,
                    color: 'white',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    {insight.suggestedAction}
                    <ArrowRightIcon size={12} color="white" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderRecommendedSessions = () => {
    if (!recommendations.length) {
      return (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
          <VideoIcon size={48} color="#e5e7eb" />
          <p style={{ marginTop: '16px' }}>No recommendations available yet.</p>
          <p style={{ fontSize: '14px' }}>Complete more sessions to get personalized recommendations.</p>
        </div>
      );
    }

    return (
      <div style={{ display: 'grid', gap: '16px' }}>
        {recommendations.map((session) => (
          <div key={session.id} style={{
            background: 'white',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            cursor: 'pointer',
            transition: 'transform 0.2s, box-shadow 0.2s',
            position: 'relative'
          }}
          onClick={() => setSelectedSession(session)}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
          }}>
            {/* Match Score Badge */}
            <div style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: session.score >= 0.7 ? '#dcfce7' : '#fef3c7',
              color: session.score >= 0.7 ? '#166534' : '#92400e',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: '600'
            }}>
              {Math.round(session.score * 100)}% Match
            </div>

            <div style={{ display: 'flex', gap: '16px', alignItems: 'start' }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: '#f3f4f6',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <VideoIcon size={24} color={ICON_COLORS.primary} />
              </div>
              
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: '0 0 8px 0', color: ICON_COLORS.secondary, paddingRight: '100px' }}>
                  {session.title || `Session with ${session.student}`}
                </h4>
                
                <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '13px', color: '#6b7280' }}>
                    <CalendarIcon size={14} color="#6b7280" style={{ marginRight: '4px' }} />
                    {new Date(session.date).toLocaleDateString()}
                  </span>
                  <span style={{ fontSize: '13px', color: '#6b7280' }}>
                    <ClockIcon size={14} color="#6b7280" style={{ marginRight: '4px' }} />
                    {session.duration || 50} min
                  </span>
                  <span style={{ fontSize: '13px', color: '#6b7280' }}>
                    <UserIcon size={14} color="#6b7280" style={{ marginRight: '4px' }} />
                    {session.coach}
                  </span>
                </div>

                {/* Match Reasons */}
                <div style={{ marginBottom: '12px' }}>
                  {session.matchReasons?.slice(0, 3).map((reason, i) => (
                    <span key={i} style={{
                      display: 'inline-block',
                      background: '#f3f4f6',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      marginRight: '8px',
                      marginBottom: '4px'
                    }}>
                      {reason}
                    </span>
                  ))}
                </div>

                {/* Key Insights Preview */}
                {session.enrichment?.keyInsights?.length > 0 && (
                  <div style={{
                    background: '#f9fafb',
                    padding: '12px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: '#4b5563'
                  }}>
                    <strong>Key Insight:</strong> {session.enrichment.keyInsights[0]}
                  </div>
                )}

                {/* Available Resources */}
                <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                  {session.videoUrl && (
                    <span style={{ fontSize: '12px', color: ICON_COLORS.success }}>
                      <CheckIcon size={14} color={ICON_COLORS.success} /> Video
                    </span>
                  )}
                  {session.transcriptUrl && (
                    <span style={{ fontSize: '12px', color: ICON_COLORS.success }}>
                      <CheckIcon size={14} color={ICON_COLORS.success} /> Transcript
                    </span>
                  )}
                  {session.insights && (
                    <span style={{ fontSize: '12px', color: ICON_COLORS.success }}>
                      <CheckIcon size={14} color={ICON_COLORS.success} /> Insights
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderAllSessions = () => {
    const filteredSessions = sessions.filter(session => {
      if (filters.topic !== 'all') {
        const topics = session.enrichment?.topics || [];
        if (!topics.includes(filters.topic)) return false;
      }
      return true;
    });

    if (!filteredSessions.length) {
      return (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
          <VideoIcon size={48} color="#e5e7eb" />
          <p style={{ marginTop: '16px' }}>No sessions found with current filters.</p>
        </div>
      );
    }

    return (
      <div style={{ display: 'grid', gap: '16px' }}>
        {filteredSessions.map((session) => (
          <div key={session.id} style={{
            background: 'white',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            cursor: 'pointer'
          }}
          onClick={() => setSelectedSession(session)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: '0 0 8px 0', color: ICON_COLORS.secondary }}>
                  {session.title || `${session.category} Session`}
                </h4>
                <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '13px', color: '#6b7280' }}>
                    {new Date(session.date).toLocaleDateString()}
                  </span>
                  <span style={{ fontSize: '13px', color: '#6b7280' }}>
                    {session.student}
                  </span>
                  <span style={{ fontSize: '13px', color: '#6b7280' }}>
                    Week {session.week || 'N/A'}
                  </span>
                </div>
                
                {/* Topics */}
                <div style={{ marginBottom: '8px' }}>
                  {session.enrichment?.topics?.map((topic, i) => (
                    <span key={i} style={{
                      display: 'inline-block',
                      background: '#e0e7ff',
                      color: '#3730a3',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      marginRight: '8px'
                    }}>
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
              
              {/* Quality Score */}
              <div style={{
                textAlign: 'center',
                minWidth: '80px'
              }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: session.enrichment?.sessionQuality?.score >= 80 ? '#dcfce7' : 
                            session.enrichment?.sessionQuality?.score >= 60 ? '#fef3c7' : '#fee2e2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 4px'
                }}>
                  <span style={{ 
                    fontSize: '18px', 
                    fontWeight: 'bold',
                    color: session.enrichment?.sessionQuality?.score >= 80 ? '#166534' : 
                           session.enrichment?.sessionQuality?.score >= 60 ? '#92400e' : '#dc2626'
                  }}>
                    {session.enrichment?.sessionQuality?.score || 0}
                  </span>
                </div>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>
                  {session.enrichment?.sessionQuality?.label}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderStudentJourney = () => {
    if (!studentJourney || !comprehensiveData) {
      return (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
          <ChartIcon size={48} color="#e5e7eb" />
          <p style={{ marginTop: '16px' }}>Loading comprehensive student journey data...</p>
          <p style={{ fontSize: '14px' }}>Analyzing 700+ sessions and documents...</p>
        </div>
      );
    }

    return (
      <div style={{ display: 'grid', gap: '24px' }}>
        {/* Journey Overview */}
        <div style={{
          background: 'white',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        }}>
          <h3 style={{ margin: '0 0 20px 0', color: ICON_COLORS.secondary }}>
            Comprehensive Student Journey Analysis
          </h3>
          
          {/* Key Metrics */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '24px'
          }}>
            <div style={{
              background: '#f9fafb',
              padding: '16px',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <VideoIcon size={32} color={ICON_COLORS.primary} />
              <p style={{ margin: '8px 0 0 0', fontSize: '24px', fontWeight: 'bold' }}>
                {comprehensiveData.sessions?.length || 0} / 700+
              </p>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
                Total Sessions Available
              </p>
            </div>
            
            <div style={{
              background: '#f9fafb',
              padding: '16px',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <DocumentIcon size={32} color={ICON_COLORS.success} />
              <p style={{ margin: '8px 0 0 0', fontSize: '24px', fontWeight: 'bold' }}>
                {comprehensiveData.executionDocs?.length || 0}
              </p>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
                Execution Docs
              </p>
            </div>
            
            <div style={{
              background: '#f9fafb',
              padding: '16px',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <TargetIcon size={32} color={ICON_COLORS.warning} />
              <p style={{ margin: '8px 0 0 0', fontSize: '24px', fontWeight: 'bold' }}>
                {studentJourney.predictiveInsights?.successProbability 
                  ? Math.round(studentJourney.predictiveInsights.successProbability * 100) + '%'
                  : 'N/A'}
              </p>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
                Success Probability
              </p>
            </div>
          </div>

          {/* Journey Phases */}
          {studentJourney.journey?.phases && (
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ color: ICON_COLORS.secondary, marginBottom: '12px' }}>
                Journey Phases
              </h4>
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
                {studentJourney.journey.phases.map((phase, i) => (
                  <div key={i} style={{
                    minWidth: '150px',
                    padding: '12px',
                    background: phase.type === 'execution' ? '#dcfce7' :
                               phase.type === 'struggle' ? '#fee2e2' :
                               phase.type === 'intensive' ? '#dbeafe' : '#f3f4f6',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <p style={{ margin: 0, fontWeight: '600', textTransform: 'capitalize' }}>
                      {phase.type}
                    </p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
                      Weeks {phase.start + 1}-{phase.start + phase.weeks.length}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Critical Moments */}
          {studentJourney.journey?.criticalMoments?.length > 0 && (
            <div>
              <h4 style={{ color: ICON_COLORS.secondary, marginBottom: '12px' }}>
                Critical Moments
              </h4>
              <div style={{ display: 'grid', gap: '12px' }}>
                {studentJourney.journey.criticalMoments.slice(0, 3).map((moment, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px',
                    background: '#fef3c7',
                    borderRadius: '8px'
                  }}>
                    <TrophyIcon size={20} color="#92400e" />
                    <div>
                      <p style={{ margin: 0, fontWeight: '500' }}>
                        Week {moment.week}: {moment.type}
                      </p>
                      <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#92400e' }}>
                        {moment.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Game Plan Integration */}
        {comprehensiveData.gamePlans?.length > 0 && (
          <div style={{
            background: 'white',
            padding: '24px',
            borderRadius: '12px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}>
            <h3 style={{ margin: '0 0 20px 0', color: ICON_COLORS.secondary }}>
              Game Plan Strategy
            </h3>
            {comprehensiveData.gamePlans[0] && (
              <div style={{ display: 'grid', gap: '16px' }}>
                <div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>
                    Target Schools Strategy
                  </h4>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {comprehensiveData.gamePlans[0].targetSchools?.map((school, i) => (
                      <span key={i} style={{
                        background: ICON_COLORS.primary,
                        color: 'white',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}>
                        {school}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>
                    Unique Positioning
                  </h4>
                  <p style={{ margin: 0, color: '#6b7280' }}>
                    {comprehensiveData.gamePlans[0].uniquePositioning || 'Building authentic narrative...'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Execution Progress */}
        {comprehensiveData.executionDocs?.length > 0 && (
          <div style={{
            background: 'white',
            padding: '24px',
            borderRadius: '12px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}>
            <h3 style={{ margin: '0 0 20px 0', color: ICON_COLORS.secondary }}>
              Weekly Execution Progress
            </h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              {comprehensiveData.executionDocs.slice(-5).reverse().map((week, i) => (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px',
                  background: '#f9fafb',
                  borderRadius: '8px'
                }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: '500' }}>
                      Week {week.week}
                    </p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
                      {week.completed?.length || 0} / {week.goals?.length || 0} goals completed
                    </p>
                  </div>
                  <div style={{
                    width: '100px',
                    height: '8px',
                    background: '#e5e7eb',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${(week.completed?.length / (week.goals?.length || 1)) * 100}%`,
                      height: '100%',
                      background: ICON_COLORS.success
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Journey Insights */}
        {comprehensiveData.journeyInsights?.length > 0 && (
          <div style={{
            background: '#fef3c7',
            padding: '20px',
            borderRadius: '12px'
          }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#92400e' }}>
              <StarIcon size={20} color="#92400e" style={{ marginRight: '8px' }} />
              Data-Driven Journey Insights
            </h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              {comprehensiveData.journeyInsights.map((insight, i) => (
                <div key={i} style={{
                  background: 'white',
                  padding: '16px',
                  borderRadius: '8px'
                }}>
                  <h4 style={{ margin: '0 0 4px 0', color: ICON_COLORS.secondary }}>
                    {insight.title}
                  </h4>
                  <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#6b7280' }}>
                    {insight.description}
                  </p>
                  {insight.recommendation && (
                    <p style={{ 
                      margin: 0, 
                      fontSize: '13px', 
                      color: ICON_COLORS.primary,
                      fontWeight: '500'
                    }}>
                      Recommendation: {insight.recommendation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderAnalytics = () => {
    if (!analytics) return null;

    return (
      <div style={{ display: 'grid', gap: '20px' }}>
        {/* Summary Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px'
        }}>
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#6b7280', fontSize: '14px' }}>
              Total Sessions
            </h4>
            <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold', color: ICON_COLORS.primary }}>
              {analytics.totalSessions}
            </p>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
              {analytics.trends?.sessionFrequency} trend
            </p>
          </div>
          
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#6b7280', fontSize: '14px' }}>
              Average Quality
            </h4>
            <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold', color: ICON_COLORS.success }}>
              {analytics.averageQuality}%
            </p>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
              {analytics.trends?.qualityTrend} trend
            </p>
          </div>
          
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#6b7280', fontSize: '14px' }}>
              Active Students
            </h4>
            <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold', color: ICON_COLORS.primary }}>
              {analytics.studentProgress?.length || 0}
            </p>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
              In past {filters.timeRange}
            </p>
          </div>
        </div>

        {/* Top Topics */}
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        }}>
          <h4 style={{ margin: '0 0 16px 0', color: ICON_COLORS.secondary }}>
            Most Discussed Topics
          </h4>
          <div style={{ display: 'grid', gap: '12px' }}>
            {analytics.topTopics?.map((topic, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <span style={{ fontWeight: '500' }}>{topic.topic}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '100px',
                    height: '8px',
                    background: '#e5e7eb',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${(topic.count / analytics.totalSessions) * 100}%`,
                      height: '100%',
                      background: ICON_COLORS.primary
                    }} />
                  </div>
                  <span style={{ fontSize: '13px', color: '#6b7280', minWidth: '40px' }}>
                    {topic.count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Student Progress */}
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        }}>
          <h4 style={{ margin: '0 0 16px 0', color: ICON_COLORS.secondary }}>
            Student Progress
          </h4>
          <div style={{ display: 'grid', gap: '12px' }}>
            {analytics.studentProgress?.map((student, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px',
                background: '#f9fafb',
                borderRadius: '8px'
              }}>
                <div>
                  <p style={{ margin: 0, fontWeight: '500' }}>{student.name}</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
                    {student.sessionCount} sessions • {Math.round(student.totalDuration / 60)}h total
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>
                    Last session
                  </p>
                  <p style={{ margin: '2px 0 0 0', fontSize: '13px', fontWeight: '500' }}>
                    {new Date(student.lastSession).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid #e5e7eb',
          borderTop: `3px solid ${ICON_COLORS.primary}`,
          borderRadius: '50%',
          margin: '0 auto',
          animation: 'spin 1s linear infinite'
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ marginTop: '16px', color: '#6b7280' }}>Loading personalized content...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      {renderStudentProfile()}
      {renderInsights()}

      {/* Filters and Tabs */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {['recommended', 'all', 'journey', 'analytics'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '8px 16px',
                  background: activeTab === tab ? ICON_COLORS.primary : 'transparent',
                  color: activeTab === tab ? 'white' : '#6b7280',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  textTransform: 'capitalize'
                }}
              >
                {tab === 'recommended' ? 'For You' : 
                 tab === 'journey' ? 'Student Journey' : tab}
              </button>
            ))}
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              style={{
                padding: '8px 12px',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            >
              <option value="all">All Categories</option>
              <option value="Coaching">Coaching</option>
              <option value="GamePlan">Game Plan</option>
              <option value="MISC">Miscellaneous</option>
            </select>

            <select
              value={filters.timeRange}
              onChange={(e) => setFilters({ ...filters, timeRange: e.target.value })}
              style={{
                padding: '8px 12px',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            >
              <option value="week">Past Week</option>
              <option value="month">Past Month</option>
              <option value="quarter">Past Quarter</option>
              <option value="year">Past Year</option>
            </select>

            {activeTab === 'all' && (
              <>
                <select
                  value={filters.source}
                  onChange={(e) => setFilters({ ...filters, source: e.target.value })}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                >
                  <option value="all">All Sources (700+)</option>
                  <option value="zoom_cloud">Zoom Cloud (331)</option>
                  <option value="gdrive_archive">GDrive Archive (395)</option>
                </select>
                
                <select
                  value={filters.topic}
                  onChange={(e) => setFilters({ ...filters, topic: e.target.value })}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                >
                  <option value="all">All Topics</option>
                  <option value="Essay Strategy">Essay Strategy</option>
                  <option value="Academic Planning">Academic Planning</option>
                  <option value="Extracurriculars">Extracurriculars</option>
                  <option value="Test Prep">Test Prep</option>
                  <option value="College Research">College Research</option>
                </select>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'recommended' && renderRecommendedSessions()}
      {activeTab === 'all' && renderAllSessions()}
      {activeTab === 'journey' && renderStudentJourney()}
      {activeTab === 'analytics' && renderAnalytics()}

      {/* Session Detail Modal */}
      {selectedSession && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}
        onClick={() => setSelectedSession(null)}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '32px',
            maxWidth: '800px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}
          onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, color: ICON_COLORS.secondary }}>
                {selectedSession.title || 'Session Details'}
              </h2>
              <button
                onClick={() => setSelectedSession(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6b7280'
                }}
              >
                ×
              </button>
            </div>

            {/* Session Info */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '16px',
              marginBottom: '24px'
            }}>
              <div>
                <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>Date</p>
                <p style={{ margin: '4px 0', fontWeight: '500' }}>
                  {new Date(selectedSession.date).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>Student</p>
                <p style={{ margin: '4px 0', fontWeight: '500' }}>{selectedSession.student}</p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>Duration</p>
                <p style={{ margin: '4px 0', fontWeight: '500' }}>{selectedSession.duration || 50} minutes</p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>Quality Score</p>
                <p style={{ margin: '4px 0', fontWeight: '500' }}>
                  {selectedSession.enrichment?.sessionQuality?.score || 0}%
                </p>
              </div>
            </div>

            {/* Resources */}
            <div style={{
              display: 'flex',
              gap: '12px',
              marginBottom: '24px'
            }}>
              {selectedSession.videoUrl && (
                <a
                  href={selectedSession.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    background: ICON_COLORS.primary,
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                >
                  <VideoIcon size={16} color="white" />
                  Watch Video
                </a>
              )}
              {selectedSession.transcriptUrl && (
                <a
                  href={selectedSession.transcriptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    background: '#f3f4f6',
                    color: ICON_COLORS.secondary,
                    textDecoration: 'none',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                >
                  <DocumentIcon size={16} color={ICON_COLORS.secondary} />
                  View Transcript
                </a>
              )}
            </div>

            {/* Insights */}
            {selectedSession.insights && (
              <div style={{
                background: '#f9fafb',
                padding: '20px',
                borderRadius: '8px',
                marginBottom: '24px'
              }}>
                <h3 style={{ margin: '0 0 12px 0', color: ICON_COLORS.secondary }}>
                  Session Insights
                </h3>
                <p style={{ margin: 0, lineHeight: 1.6 }}>
                  {selectedSession.insights}
                </p>
              </div>
            )}

            {/* Related Resources */}
            {selectedSession.enrichment?.relevantResources?.length > 0 && (
              <div>
                <h3 style={{ margin: '0 0 12px 0', color: ICON_COLORS.secondary }}>
                  Recommended Resources
                </h3>
                <div style={{ display: 'grid', gap: '12px' }}>
                  {selectedSession.enrichment.relevantResources.map((resource, i) => (
                    <div key={i} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px',
                      background: '#f9fafb',
                      borderRadius: '8px'
                    }}>
                      <div>
                        <p style={{ margin: 0, fontWeight: '500' }}>{resource.title}</p>
                        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
                          {resource.type} • {resource.duration || resource.pages + ' pages'}
                        </p>
                      </div>
                      <a
                        href={resource.url}
                        style={{
                          color: ICON_COLORS.primary,
                          textDecoration: 'none',
                          fontSize: '14px'
                        }}
                      >
                        Access →
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedPersonalizedKnowledgeBase;