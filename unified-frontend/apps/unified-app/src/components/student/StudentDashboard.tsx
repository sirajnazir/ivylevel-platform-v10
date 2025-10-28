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
import { v10Api, type AssessmentData } from "../../utils/v10ApiService";

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

// v12.1: Assessment section styled components
const ErrorMessage = styled.div`
  background: #fee;
  border: 1px solid #fcc;
  color: #c33;
  padding: 16px;
  border-radius: 8px;
  margin: 20px 30px;
  font-size: 14px;
`;

const AssessmentSection = styled.div`
  margin: 40px 30px;
  padding: 24px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
`;

const SectionTitle = styled.h3`
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin-bottom: 20px;
`;

const DimensionalGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
`;

const DimensionCard = styled.div`
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
`;

const DimensionName = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: #666;
  margin-bottom: 8px;
`;

const DimensionScore = styled.div<{ $tier: string }>`
  font-size: 24px;
  font-weight: 700;
  color: ${props => {
    const tierColors: Record<string, string> = {
      'Diamond': '#3b82f6',
      'Platinum': '#8b5cf6',
      'Gold': '#f59e0b',
      'Silver': '#6b7280',
      'Bronze': '#92400e'
    };
    return tierColors[props.$tier] || '#333';
  }};
  display: flex;
  align-items: center;
  gap: 8px;
`;

const DimensionTier = styled.span`
  font-size: 12px;
  font-weight: 500;
  padding: 2px 8px;
  background: rgba(0,0,0,0.05);
  border-radius: 4px;
`;

const StrengthsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
`;

const StrengthCard = styled.div`
  padding: 16px;
  background: #f0fdf4;
  border-radius: 8px;
  border: 1px solid #86efac;
`;

const StrengthHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 12px;
`;

const StrengthTitle = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: #166534;
  flex: 1;
`;

const StrengthBadge = styled.span`
  font-size: 11px;
  font-weight: 500;
  padding: 4px 8px;
  background: #dcfce7;
  color: #166534;
  border-radius: 4px;
  white-space: nowrap;
`;

const StrengthDescription = styled.div`
  font-size: 14px;
  color: #065f46;
  margin-bottom: 12px;
  line-height: 1.5;
`;

const StrengthFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ROIScore = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #059669;
`;

const ImpactLabel = styled.div`
  font-size: 12px;
  color: #047857;
`;

const WeakSpotsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
`;

const WeakSpotCard = styled.div<{ $priority: string }>`
  padding: 16px;
  background: ${props => {
    const priorityColors: Record<string, string> = {
      'P0': '#fef3c7',
      'P1': '#fed7aa',
      'P2': '#e0e7ff'
    };
    return priorityColors[props.$priority] || '#f3f4f6';
  }};
  border-radius: 8px;
  border: 1px solid ${props => {
    const borderColors: Record<string, string> = {
      'P0': '#fbbf24',
      'P1': '#fb923c',
      'P2': '#a5b4fc'
    };
    return borderColors[props.$priority] || '#d1d5db';
  }};
`;

const WeakSpotHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 12px;
`;

const WeakSpotTitle = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: #92400e;
  flex: 1;
`;

const WeakSpotStatus = styled.span<{ $status: string }>`
  font-size: 11px;
  font-weight: 600;
  padding: 4px 8px;
  background: ${props => props.$status === 'RESOLVED' ? '#d1fae5' : '#fecaca'};
  color: ${props => props.$status === 'RESOLVED' ? '#065f46' : '#991b1b'};
  border-radius: 4px;
  white-space: nowrap;
`;

const PriorityRow = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
`;

const PriorityBadge = styled.span<{ $priority: string }>`
  font-size: 12px;
  font-weight: 700;
  padding: 4px 8px;
  background: ${props => {
    const bgColors: Record<string, string> = {
      'P0': '#fbbf24',
      'P1': '#fb923c',
      'P2': '#a5b4fc'
    };
    return bgColors[props.$priority] || '#d1d5db';
  }};
  color: ${props => {
    const textColors: Record<string, string> = {
      'P0': '#78350f',
      'P1': '#7c2d12',
      'P2': '#3730a3'
    };
    return textColors[props.$priority] || '#374151';
  }};
  border-radius: 4px;
`;

const TacticalPlan = styled.div`
  font-size: 14px;
  color: #78350f;
  margin-bottom: 8px;
  line-height: 1.5;
`;

const TargetWeeks = styled.div`
  font-size: 12px;
  font-weight: 500;
  color: #92400e;
`;

const AdmissionsRubricCard = styled.div`
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  color: white;
`;

const RubricRow = styled.div<{ $highlight?: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: ${props => props.$highlight ? '2px solid rgba(255,255,255,0.3)' : '1px solid rgba(255,255,255,0.1)'};
  font-weight: ${props => props.$highlight ? '700' : '500'};
  font-size: ${props => props.$highlight ? '18px' : '15px'};
`;

const RubricLabel = styled.span`
  opacity: 0.95;
`;

const RubricScore = styled.span`
  font-weight: 700;
  font-size: 18px;
`;

const RubricDivider = styled.div`
  height: 2px;
  background: rgba(255,255,255,0.3);
  margin: 12px 0;
`;

const TargetSchools = styled.div`
  margin-top: 16px;
  padding: 12px;
  background: rgba(255,255,255,0.15);
  border-radius: 8px;
  font-size: 14px;
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

  // v12.1: Assessment data from new API
  const [v12AssessmentData, setV12AssessmentData] = React.useState<AssessmentData | null>(null);
  const [assessmentLoading, setAssessmentLoading] = React.useState(false);
  const [assessmentError, setAssessmentError] = React.useState<string | null>(null);

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

  // v12.1: Fetch comprehensive assessment data
  React.useEffect(() => {
    const fetchAssessmentData = async () => {
      if (!studentId) return;

      setAssessmentLoading(true);
      setAssessmentError(null);

      try {
        // Use "huda-2025" as the API expects this format (not "huda_001")
        const apiStudentId = studentId === "huda_001" ? "huda-2025" : studentId;
        const data = await v10Api.getAssessment(apiStudentId);
        setV12AssessmentData(data);
        console.log('✅ v12.1 Assessment data loaded:', data);
      } catch (error) {
        console.error('❌ Error fetching v12 assessment data:', error);
        setAssessmentError(error instanceof Error ? error.message : 'Failed to load assessment data');
      } finally {
        setAssessmentLoading(false);
      }
    };

    fetchAssessmentData();
  }, [studentId]);

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
                  score={v12AssessmentData?.ivyReadyScore.overall || 87}
                  profileImage="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400"
                  pillarScores={v12AssessmentData ? {
                    aptitude: {
                      score: v12AssessmentData.pillars.aptitude.score * 10,
                      label: 'Aptitude',
                      description: v12AssessmentData.pillars.aptitude.evidence
                    },
                    passion: {
                      score: v12AssessmentData.pillars.passion.score * 10,
                      label: 'Passion',
                      description: v12AssessmentData.pillars.passion.evidence
                    },
                    service: {
                      score: v12AssessmentData.pillars.service.score * 10,
                      label: 'Service',
                      description: v12AssessmentData.pillars.service.evidence
                    },
                    identity: {
                      score: v12AssessmentData.pillars.identity.score * 10,
                      label: 'Identity',
                      description: v12AssessmentData.pillars.identity.evidence
                    }
                  } : pillarScores}
                  ivyScoreData={v12AssessmentData ? {
                    overall_score: v12AssessmentData.ivyReadyScore.overall,
                    score_change: v12AssessmentData.ivyReadyScore.changeVs180Days,
                    achievement_level: v12AssessmentData.ivyReadyScore.tier.toUpperCase() as 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND',
                    target_gap: 100 - v12AssessmentData.ivyReadyScore.overall,
                    tier_probability: 0.20  // From overallAdmissionsScore.admitProbability "15-25%"
                  } : undefined}
                  isLoading={assessmentLoading}
                />
              </ScoreRingsSection>
              <IvyScoreCardWrapper>
                <IvyScoreCard
                  score={v12AssessmentData?.ivyReadyScore.overall || 87}
                  ivyScoreData={v12AssessmentData ? {
                    overall_score: v12AssessmentData.ivyReadyScore.overall,
                    score_change: v12AssessmentData.ivyReadyScore.changeVs180Days,
                    achievement_level: v12AssessmentData.ivyReadyScore.tier.toUpperCase() as 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND',
                    target_gap: 100 - v12AssessmentData.ivyReadyScore.overall,
                    tier_probability: 0.20  // From overallAdmissionsScore.admitProbability "15-25%"
                  } : undefined}
                  assessmentData={assessmentData}
                  isLoading={assessmentLoading}
                />
              </IvyScoreCardWrapper>
            </LeftColumn>

            <CardsGrid>
              <LeftCards>
                <AptitudeCard pillarData={v12AssessmentData?.pillars.aptitude} />
                <IdentityCard pillarData={v12AssessmentData?.pillars.identity} />
              </LeftCards>
              <RightCards>
                <ServiceCard pillarData={v12AssessmentData?.pillars.service} />
                <PassionCard pillarData={v12AssessmentData?.pillars.passion} />
              </RightCards>
            </CardsGrid>

            {/* v12.1: Display error if assessment data failed to load */}
            {assessmentError && (
              <ErrorMessage>{assessmentError}</ErrorMessage>
            )}

            {/* v12.1: Dimensional Scores Section */}
            {v12AssessmentData && (
              <AssessmentSection>
                <SectionTitle>📊 Dimensional Breakdown</SectionTitle>
                <DimensionalGrid>
                  {v12AssessmentData.dimensionalScores.map((dim, idx) => (
                    <DimensionCard key={idx}>
                      <DimensionName>{dim.dimension}</DimensionName>
                      <DimensionScore $tier={dim.tier}>
                        {dim.score}%
                        <DimensionTier>{dim.tier}</DimensionTier>
                      </DimensionScore>
                    </DimensionCard>
                  ))}
                </DimensionalGrid>
              </AssessmentSection>
            )}

            {/* v12.1: Strengths Section */}
            {v12AssessmentData && v12AssessmentData.strengths.length > 0 && (
              <AssessmentSection>
                <SectionTitle>⭐ Standout Strengths</SectionTitle>
                <StrengthsGrid>
                  {v12AssessmentData.strengths.map((strength, idx) => (
                    <StrengthCard key={strength.id}>
                      <StrengthHeader>
                        <StrengthTitle>{strength.title}</StrengthTitle>
                        <StrengthBadge>{strength.dimension}</StrengthBadge>
                      </StrengthHeader>
                      <StrengthDescription>{strength.description}</StrengthDescription>
                      <StrengthFooter>
                        <ROIScore>ROI: {strength.roiScore}/10</ROIScore>
                        <ImpactLabel>{strength.impact}</ImpactLabel>
                      </StrengthFooter>
                    </StrengthCard>
                  ))}
                </StrengthsGrid>
              </AssessmentSection>
            )}

            {/* v12.1: Weak Spots Section */}
            {v12AssessmentData && v12AssessmentData.weakSpots.length > 0 && (
              <AssessmentSection>
                <SectionTitle>🎯 Focus Areas</SectionTitle>
                <WeakSpotsGrid>
                  {v12AssessmentData.weakSpots.map((weakSpot, idx) => (
                    <WeakSpotCard key={weakSpot.id} $priority={weakSpot.priority}>
                      <WeakSpotHeader>
                        <WeakSpotTitle>{weakSpot.title}</WeakSpotTitle>
                        <WeakSpotStatus $status={weakSpot.status}>{weakSpot.status}</WeakSpotStatus>
                      </WeakSpotHeader>
                      <PriorityRow>
                        <PriorityBadge $priority={weakSpot.priority}>{weakSpot.priority}</PriorityBadge>
                        <ROIScore>ROI: {weakSpot.roiScore}/10</ROIScore>
                      </PriorityRow>
                      <TacticalPlan>{weakSpot.tacticalPlan}</TacticalPlan>
                      {weakSpot.targetWeeks && (
                        <TargetWeeks>Target: {weakSpot.targetWeeks}</TargetWeeks>
                      )}
                    </WeakSpotCard>
                  ))}
                </WeakSpotsGrid>
              </AssessmentSection>
            )}

            {/* v12.1: Admissions Rubric Correlation Section */}
            {v12AssessmentData && (
              <AssessmentSection>
                <SectionTitle>🎓 Admissions Rubric Correlation</SectionTitle>
                <AdmissionsRubricCard>
                  <RubricRow>
                    <RubricLabel>Academic Index</RubricLabel>
                    <RubricScore>{v12AssessmentData.admissionsRubric.academicIndex.score}</RubricScore>
                  </RubricRow>
                  <RubricRow>
                    <RubricLabel>Extracurricular Rating</RubricLabel>
                    <RubricScore>{v12AssessmentData.admissionsRubric.extracurricularRating.score}</RubricScore>
                  </RubricRow>
                  <RubricRow>
                    <RubricLabel>Personal Qualities</RubricLabel>
                    <RubricScore>{v12AssessmentData.admissionsRubric.personalQualities.score}</RubricScore>
                  </RubricRow>
                  <RubricRow>
                    <RubricLabel>Recommendation Strength</RubricLabel>
                    <RubricScore>{v12AssessmentData.admissionsRubric.recommendationStrength.score}</RubricScore>
                  </RubricRow>
                  <RubricDivider />
                  <RubricRow $highlight>
                    <RubricLabel>Overall Admit Probability</RubricLabel>
                    <RubricScore>{v12AssessmentData.admissionsRubric.overallAdmissionsScore.admitProbability}</RubricScore>
                  </RubricRow>
                  <TargetSchools>
                    <strong>Target Schools:</strong> {v12AssessmentData.admissionsRubric.overallAdmissionsScore.targetSchools.join(', ')}
                  </TargetSchools>
                </AdmissionsRubricCard>
              </AssessmentSection>
            )}
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