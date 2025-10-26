import React, { useEffect } from "react";
import styled from "styled-components";
import { Header } from "./Header";
import { CircularProgress } from "./CircularProgress";
import { AptitudeCard } from "./AptitudeCard";
import { ServiceCard } from "./ServiceCard";
import { IdentityCard } from "./IdentityCard";
import { PassionCard } from "./PassionCard";
import { IvyScoreCard } from "./IvyScoreCard";
import { GamePlanView } from "./GamePlanView";
import { SessionsView } from "./SessionsViewOptimal";
import { AIChat } from "./AIChat";
import { useDashboardData } from "../../hooks/useDashboardData";
import { API_ENDPOINTS } from "../../config/api";
import { videoPrefetchService } from "../../services/videoPrefetchService";
import useAuth from "../../hooks/useAuthMock";
import { EvidencePanel } from "../v3.2/EvidencePanel";
import { HGTIScoreCard } from "../v3.2/HGTIScoreCard";
import { MissingEvidenceCard } from "../v3.2/MissingEvidenceCard";
import { useFeatureFlag } from "../../utils/featureFlags";
import { TaskManager } from "../v10/TaskManager";
import { TimelineView } from "../v10/TimelineView";
import { ProjectsView } from "../v10/ProjectsView";
import { WeeklyVitals } from "../v10/WeeklyVitals";

const Container = styled.div`
  min-height: 100vh;
  background: #FAFAFA;
`;

const MainContent = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 40px;
`;

const Title = styled.h1`
  font-size: 32px;
  color: #333;
  margin-bottom: 60px;
  padding-left: 30px;
  text-align: left;
  
  span {
    color: #FF5733;
  }
`;

const ContentLayout = styled.div`
  display: grid;
  grid-template-columns: minmax(600px, 1fr) minmax(625px, 1fr);
  gap: 5px;
  align-items: start;
  justify-content: center;
  max-width: 1400px;
  margin: 0 auto;
  padding-left: 5px;
  position: relative;
  left: -30px;
`;

const LeftColumn = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  position: relative;
  left: -5px;
`;

const ScoreRingsSection = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  position: relative;
  left: -5px;
`;

const IvyScoreCardWrapper = styled.div`
  position: relative;
  left: -20px;
`;

const CardsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px 3.75px;
  transform: scale(1.25);
  transform-origin: top left;
  margin-top: 40px;
  position: relative;
`;

const LeftCards = styled.div`
  position: relative;
  left: -5px;
  display: flex;
  flex-direction: column;
  gap: 30px;
`;

const RightCards = styled.div`
  position: relative;
  left: -40px;
  display: flex;
  flex-direction: column;
  gap: 30px;
`;

const V32Section = styled.div`
  margin-top: 40px;
  padding: 0 30px;
`;

const V32Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-top: 20px;
`;

const V32Title = styled.h2`
  font-size: 24px;
  font-weight: 600;
  color: #333;
  margin-bottom: 16px;
`;

export function StudentDashboard() {
  const { user } = useAuth();
  console.log('🎯 StudentDashboard rendered, user:', user);
  console.log('📍 Current URL:', window.location.pathname);

  const [activeTab, setActiveTab] = React.useState('assessment');
  const [gamePlanData, setGamePlanData] = React.useState(null);
  const [preparationData, setPreparationData] = React.useState(null);
  const [applicationData, setApplicationData] = React.useState(null);
  const [loadingTab, setLoadingTab] = React.useState(false);

  // v3.2 Feature flags
  const showEvidence = useFeatureFlag('evidencePanel');
  const showHGTI = useFeatureFlag('hgtiGraph');
  const show412 = useFeatureFlag('missingEvidence');

  // Get student ID from user (must be authenticated to view dashboard)
  const studentId = user?.studentId || user?.id;

  if (!studentId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600">Please log in to view your dashboard.</p>
        </div>
      </div>
    );
  }
  
  // Start prefetching video sessions on mount
  React.useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      videoPrefetchService.prefetchSessions(token);
    }
  }, []);

  // Use the new dashboard data service
  const {
    studentProfile,
    assessmentData,
    pillarScores,
    mobilityData,
    isLoading,
    error,
    lastUpdated,
    refreshData,
    retryFailedRequests,
    isDataStale,
    hasValidData
  } = useDashboardData("huda_001"); // Using Huda's real student ID

  // Function to load tab data
  const loadTabData = async (tabName) => {
    setLoadingTab(true);
    try {
      switch (tabName) {
        case 'gameplan':
          const gamePlanResponse = await fetch(API_ENDPOINTS.student.gameplan);
          const gamePlanData = await gamePlanResponse.json();
          setGamePlanData(gamePlanData);
          break;
        case 'preparation':
          const prepResponse = await fetch(`${API_ENDPOINTS.student.gameplan.replace('gameplan', 'preparation')}`);
          const prepData = await prepResponse.json();
          setPreparationData(prepData);
          break;
        case 'application':
          const appResponse = await fetch(`${API_ENDPOINTS.student.gameplan.replace('gameplan', 'application')}`);
          const appData = await appResponse.json();
          setApplicationData(appData);
          break;
      }
    } catch (error) {
      console.error(`Error loading ${tabName} data:`, error);
    } finally {
      setLoadingTab(false);
    }
  };

  // Load tab data when tab changes
  React.useEffect(() => {
    if (activeTab !== 'assessment') {
      loadTabData(activeTab);
    }
  }, [activeTab]);

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'assessment':
        return (
          <ContentLayout>
            <LeftColumn>
              <ScoreRingsSection>
                <CircularProgress
                  score={87}
                  profileImage="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400"
                  pillarScores={pillarScores}
                  ivyScoreData={assessmentData ? {
                    overall_score: Math.round((pillarScores?.aptitude.score || 87 +
                                             pillarScores?.passion.score || 87 +
                                             pillarScores?.service.score || 87 +
                                             pillarScores?.identity.score || 87) / 4),
                    score_change: 0,
                    achievement_level: 'GOLD' as const,
                    target_gap: assessmentData.admission_probabilities?.tier_1 ?
                      Math.round((1 - assessmentData.admission_probabilities.tier_1) * 100) : 5,
                    tier_probability: assessmentData.admission_probabilities?.tier_1 || 0.15
                  } : undefined}
                  isLoading={isLoading}
                />
              </ScoreRingsSection>
              <IvyScoreCardWrapper>
                <IvyScoreCard
                  score={87}
                  ivyScoreData={assessmentData ? {
                    overall_score: Math.round((pillarScores?.aptitude.score || 87 +
                                             pillarScores?.passion.score || 87 +
                                             pillarScores?.service.score || 87 +
                                             pillarScores?.identity.score || 87) / 4),
                    score_change: 0,
                    achievement_level: 'GOLD' as const,
                    target_gap: assessmentData.admission_probabilities?.tier_1 ?
                      Math.round((1 - assessmentData.admission_probabilities.tier_1) * 100) : 5,
                    tier_probability: assessmentData.admission_probabilities?.tier_1 || 0.15
                  } : undefined}
                  assessmentData={assessmentData}
                  isLoading={isLoading}
                />
              </IvyScoreCardWrapper>
            </LeftColumn>

            <CardsGrid>
              <LeftCards>
                <AptitudeCard />
                <IdentityCard />
              </LeftCards>
              <RightCards>
                <ServiceCard />
                <PassionCard />
              </RightCards>
            </CardsGrid>
          </ContentLayout>
        );

      case 'gameplan':
        return <GamePlanView />;

      case 'preparation':
        // v10.4: Preparation tab with Weekly Vitals, Tasks, and Projects
        if (!studentId) {
          return (
            <div style={{ padding: '20px', color: '#666', textAlign: 'center' }}>
              Loading student data...
            </div>
          );
        }
        return (
          <div>
            {/* Weekly Progress - Weekly action plan and vitals */}
            <WeeklyVitals studentId={studentId} />

            {/* Tasks - Action items and deadlines */}
            <div style={{ marginTop: '30px' }}>
              <TaskManager studentId={studentId} />
            </div>
          </div>
        );

      case 'preparation_old':
        return (
          <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '28px', marginBottom: '20px', color: '#333' }}>Preparation</h2>
            {loadingTab ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>Loading preparation data...</div>
            ) : preparationData ? (
              <div>
                <div style={{ background: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '20px', marginBottom: '15px' }}>Academic Preparation</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                    <div>
                      <h4 style={{ fontSize: '16px', marginBottom: '10px' }}>GPA Trend</h4>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        {preparationData?.academic?.gpa_trend?.map((gpa, index) => (
                          <div key={index} style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#FF5733' }}>{gpa}</div>
                            <div style={{ fontSize: '12px', color: '#666' }}>Year {index + 1}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 style={{ fontSize: '16px', marginBottom: '10px' }}>Course Rigor</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                        <div style={{ textAlign: 'center', padding: '10px', background: '#f8f9fa', borderRadius: '6px' }}>
                          <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{preparationData?.academic?.course_rigor?.ap_courses || 0}</div>
                          <div style={{ fontSize: '12px', color: '#666' }}>AP Courses</div>
                        </div>
                        <div style={{ textAlign: 'center', padding: '10px', background: '#f8f9fa', borderRadius: '6px' }}>
                          <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{preparationData?.academic?.course_rigor?.honors_courses || 0}</div>
                          <div style={{ fontSize: '12px', color: '#666' }}>Honors</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ background: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '20px', marginBottom: '15px' }}>Test Preparation</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                    <div>
                      <h4 style={{ fontSize: '16px', marginBottom: '10px' }}>SAT Progress</h4>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span>Current Score: {preparationData?.academic?.test_preparation?.sat_score || 0}</span>
                        <span style={{ color: '#666' }}>Target: {preparationData?.academic?.test_preparation?.target_score || 1600}</span>
                      </div>
                      <div style={{ background: '#e9ecef', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ 
                          width: `${((preparationData?.academic?.test_preparation?.sat_score || 0) / (preparationData?.academic?.test_preparation?.target_score || 1600)) * 100}%`, 
                          height: '100%', 
                          background: '#FF5733' 
                        }}></div>
                      </div>
                    </div>
                    <div>
                      <h4 style={{ fontSize: '16px', marginBottom: '10px' }}>Weak Areas</h4>
                      <ul style={{ listStyle: 'none', padding: 0 }}>
                        {preparationData?.academic?.test_preparation?.weak_areas?.map((area, index) => (
                          <li key={index} style={{ padding: '5px 0', color: '#666' }}>• {area}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <div style={{ background: 'white', padding: '20px', borderRadius: '8px' }}>
                  <h3 style={{ fontSize: '20px', marginBottom: '15px' }}>Extracurricular Activities</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                    {preparationData?.extracurricular?.current_activities?.map((activity, index) => (
                      <div key={index} style={{ padding: '15px', border: '1px solid #e9ecef', borderRadius: '6px' }}>
                        <h4 style={{ fontSize: '16px', marginBottom: '8px' }}>{activity.name}</h4>
                        <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>Role: {activity.role}</div>
                        <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>Hours: {activity.hours}</div>
                        <div style={{ fontSize: '14px', color: '#666' }}>Impact: {activity.impact}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: '20px' }}>
                <div style={{ background: 'white', padding: '40px', borderRadius: '12px', textAlign: 'center' }}>
                  <h3 style={{ fontSize: '24px', marginBottom: '20px', color: '#333' }}>Preparation Module Coming Soon</h3>
                  <p style={{ fontSize: '16px', color: '#666', marginBottom: '20px' }}>
                    Your comprehensive test prep and academic planning hub will include:
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', maxWidth: '800px', margin: '0 auto' }}>
                    <div style={{ padding: '20px', background: '#f8f9fa', borderRadius: '8px' }}>
                      <h4 style={{ fontSize: '18px', marginBottom: '10px', color: '#FF5733' }}>📚 Test Prep</h4>
                      <p style={{ fontSize: '14px', color: '#666' }}>SAT/ACT strategies and practice tracking</p>
                    </div>
                    <div style={{ padding: '20px', background: '#f8f9fa', borderRadius: '8px' }}>
                      <h4 style={{ fontSize: '18px', marginBottom: '10px', color: '#FF5733' }}>📈 Academic Planning</h4>
                      <p style={{ fontSize: '14px', color: '#666' }}>Course selection and GPA optimization</p>
                    </div>
                    <div style={{ padding: '20px', background: '#f8f9fa', borderRadius: '8px' }}>
                      <h4 style={{ fontSize: '18px', marginBottom: '10px', color: '#FF5733' }}>🏆 Extracurriculars</h4>
                      <p style={{ fontSize: '14px', color: '#666' }}>Activity planning and leadership development</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'sessions':
        // SessionsView is handled separately to keep it mounted
        return null;

      case 'application':
        // Enable ProjectsView and TimelineView components
        if (!studentId) {
          return (
            <div style={{ padding: '20px', color: '#666', textAlign: 'center' }}>
              Loading student data...
            </div>
          );
        }
        return (
          <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '28px', marginBottom: '20px', color: '#333' }}>Application</h2>
            <ProjectsView studentId={studentId} />
            <div style={{ marginTop: '30px' }}>
              <TimelineView studentId={studentId} />
            </div>
          </div>
        );

      case 'application_old':
        return (
          <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '28px', marginBottom: '20px', color: '#333' }}>Application</h2>
            {loadingTab ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>Loading application data...</div>
            ) : applicationData ? (
              <div>
                <div style={{ background: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '20px', marginBottom: '15px' }}>Essays</h3>
                  {applicationData?.essays?.common_app_essay && (
                    <div style={{ marginBottom: '20px' }}>
                      <h4 style={{ fontSize: '16px', marginBottom: '10px' }}>Common App Essay</h4>
                      <div style={{ padding: '15px', background: '#f8f9fa', borderRadius: '6px' }}>
                        <div style={{ marginBottom: '10px' }}>
                          <strong>Topic:</strong> {applicationData?.essays?.common_app_essay?.topic || 'Not started'}
                        </div>
                        <div style={{ marginBottom: '10px' }}>
                          <strong>Status:</strong> <span style={{ 
                            color: applicationData?.essays?.common_app_essay?.status === 'draft' ? '#ffc107' : '#28a745',
                            textTransform: 'capitalize'
                          }}>{applicationData?.essays?.common_app_essay?.status || 'Not started'}</span>
                        </div>
                        <div style={{ marginBottom: '10px' }}>
                          <strong>Word Count:</strong> {applicationData?.essays?.common_app_essay?.word_count || 0}
                        </div>
                        <div>
                          <strong>AI Analysis:</strong>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '10px' }}>
                            <div style={{ textAlign: 'center', padding: '10px', background: 'white', borderRadius: '4px' }}>
                              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#28a745' }}>{applicationData?.essays?.common_app_essay?.ai_analysis?.authenticity_score || 0}</div>
                              <div style={{ fontSize: '12px', color: '#666' }}>Authenticity</div>
                            </div>
                            <div style={{ textAlign: 'center', padding: '10px', background: 'white', borderRadius: '4px' }}>
                              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#007bff' }}>{applicationData?.essays?.common_app_essay?.ai_analysis?.uniqueness_score || 0}</div>
                              <div style={{ fontSize: '12px', color: '#666' }}>Uniqueness</div>
                            </div>
                            <div style={{ textAlign: 'center', padding: '10px', background: 'white', borderRadius: '4px' }}>
                              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#FF5733' }}>{applicationData?.essays?.common_app_essay?.ai_analysis?.impact_score || 0}</div>
                              <div style={{ fontSize: '12px', color: '#666' }}>Impact</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ background: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '20px', marginBottom: '15px' }}>Target Colleges</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px' }}>
                    {applicationData?.colleges?.target_colleges?.map((college, index) => (
                      <div key={index} style={{ padding: '15px', border: '1px solid #e9ecef', borderRadius: '6px' }}>
                        <h4 style={{ fontSize: '18px', marginBottom: '8px' }}>{college.name}</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', fontSize: '14px' }}>
                          <div>
                            <strong>Type:</strong> <span style={{ 
                              color: college.type === 'reach' ? '#dc3545' : '#28a745',
                              textTransform: 'capitalize'
                            }}>{college.type}</span>
                          </div>
                          <div>
                            <strong>Admission Rate:</strong> {college.admission_rate}%
                          </div>
                          <div>
                            <strong>SAT Range:</strong> {college.sat_range}
                          </div>
                          <div>
                            <strong>Fit Score:</strong> {college.fit_score}%
                          </div>
                        </div>
                        <div style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
                          <strong>Deadline:</strong> {college.deadline}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: '20px' }}>
                <div style={{ background: 'white', padding: '40px', borderRadius: '12px', textAlign: 'center' }}>
                  <h3 style={{ fontSize: '24px', marginBottom: '20px', color: '#333' }}>Application Center Coming Soon</h3>
                  <p style={{ fontSize: '16px', color: '#666', marginBottom: '20px' }}>
                    Your college application command center will include:
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', maxWidth: '800px', margin: '0 auto' }}>
                    <div style={{ padding: '20px', background: '#f8f9fa', borderRadius: '8px' }}>
                      <h4 style={{ fontSize: '18px', marginBottom: '10px', color: '#FF5733' }}>🎓 College List</h4>
                      <p style={{ fontSize: '14px', color: '#666' }}>Target, reach, and safety school management</p>
                    </div>
                    <div style={{ padding: '20px', background: '#f8f9fa', borderRadius: '8px' }}>
                      <h4 style={{ fontSize: '18px', marginBottom: '10px', color: '#FF5733' }}>✍️ Essay Tracking</h4>
                      <p style={{ fontSize: '14px', color: '#666' }}>Essay prompts, drafts, and deadlines</p>
                    </div>
                    <div style={{ padding: '20px', background: '#f8f9fa', borderRadius: '8px' }}>
                      <h4 style={{ fontSize: '18px', marginBottom: '10px', color: '#FF5733' }}>📅 Deadlines</h4>
                      <p style={{ fontSize: '14px', color: '#666' }}>Application timeline and task management</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'evidence':
        return (
          <div style={{ padding: '40px', maxWidth: '1400px', margin: '0 auto' }}>
            <V32Section>
              <V32Title>Growth & Evidence Tracking (v3.2)</V32Title>
              <V32Grid>
                {showHGTI && (
                  <HGTIScoreCard studentId={studentId} mode="cached" />
                )}
                {showEvidence && (
                  <EvidencePanel studentId={studentId} />
                )}
              </V32Grid>
            </V32Section>
          </div>
        );

      case 'aichat':
        return (
          <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
            <AIChat />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Container>
      <Header activeTab={activeTab} onTabChange={setActiveTab} />
      <MainContent>
        {activeTab === 'assessment' && (
          <Title>How <span>Ivy+ Ready</span> are you today?</Title>
        )}
        
        {/* Always render SessionsView but only show when sessions tab is active */}
        <div style={{ display: activeTab === 'sessions' ? 'block' : 'none' }}>
          <SessionsView />
        </div>
        
        {/* Render other tabs conditionally - sessions is handled above */}
        {activeTab !== 'sessions' && renderTabContent()}
      </MainContent>
    </Container>
  );
}