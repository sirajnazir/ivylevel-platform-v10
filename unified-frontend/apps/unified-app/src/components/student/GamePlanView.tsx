/**
 * Game Plan View - v12.0
 * Displays student's multi-year precision roadmap
 * Uses real data from v12.0 backend API
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Calendar, Target, CheckCircle, Clock, AlertCircle, TrendingUp, Award, BookOpen, Users } from 'lucide-react';
import { v10Api } from '../../utils/v10ApiService';
import { useAuth } from '../../hooks/useAuth';

const Container = styled.div`
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
`;

const Header = styled.div`
  margin-bottom: 32px;
`;

const Title = styled.h2`
  font-size: 28px;
  font-weight: bold;
  color: #333;
  margin-bottom: 8px;
`;

const Subtitle = styled.p`
  font-size: 16px;
  color: #666;
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 60px;
  font-size: 18px;
  color: #666;
`;

const ErrorState = styled.div`
  text-align: center;
  padding: 60px;
  font-size: 18px;
  color: #dc3545;
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
  margin-bottom: 24px;
`;

const MainColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const SideColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const Card = styled.div`
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
`;

const CardTitle = styled.h3`
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const PhaseHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  color: white;
`;

const PhaseInfo = styled.div`
  flex: 1;
`;

const PhaseName = styled.h2`
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 8px;
`;

const PhaseWeeks = styled.div`
  font-size: 14px;
  opacity: 0.9;
  margin-bottom: 4px;
`;

const PhaseGoal = styled.div`
  font-size: 15px;
  opacity: 0.95;
  margin-top: 12px;
  line-height: 1.5;
`;

const PhaseProgress = styled.div`
  text-align: right;
`;

const ProgressCircle = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: bold;
`;

const ReadinessSection = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 24px;
`;

const ReadinessCard = styled.div`
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  border-radius: 12px;
  padding: 20px;
  color: white;
  text-align: center;
`;

const ReadinessScore = styled.div`
  font-size: 32px;
  font-weight: bold;
  margin-bottom: 8px;
`;

const ReadinessLabel = styled.div`
  font-size: 14px;
  opacity: 0.95;
`;

const MilestonesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const MilestoneItem = styled.div<{ status: string }>`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: ${props =>
    props.status === 'completed' ? '#d4edda' :
    props.status === 'in_progress' ? '#fff3cd' :
    '#f8f9fa'
  };
  border-radius: 8px;
  border-left: 4px solid ${props =>
    props.status === 'completed' ? '#28a745' :
    props.status === 'in_progress' ? '#ffc107' :
    '#6c757d'
  };
`;

const MilestoneIcon = styled.div<{ status: string }>`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${props =>
    props.status === 'completed' ? '#28a745' :
    props.status === 'in_progress' ? '#ffc107' :
    '#6c757d'
  };
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const MilestoneContent = styled.div`
  flex: 1;
`;

const MilestoneTitle = styled.div`
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
`;

const MilestoneDate = styled.div`
  font-size: 13px;
  color: #666;
  display: flex;
  align-items: center;
  gap: 4px;
`;

const OpportunitiesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const OpportunityItem = styled.div<{ priority: string }>`
  padding: 16px;
  background: ${props =>
    props.priority === 'P0' ? '#fff3cd' :
    props.priority === 'P1' ? '#d1ecf1' :
    '#f8f9fa'
  };
  border-radius: 8px;
  border-left: 4px solid ${props =>
    props.priority === 'P0' ? '#ffc107' :
    props.priority === 'P1' ? '#17a2b8' :
    '#6c757d'
  };
`;

const OpportunityHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 8px;
`;

const OpportunityTitle = styled.div`
  font-weight: 600;
  color: #333;
`;

const OpportunityBadge = styled.span<{ category: string }>`
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 4px;
  background: ${props =>
    props.category === 'summer_program' ? '#007bff' :
    props.category === 'competition' ? '#dc3545' :
    props.category === 'award' ? '#ffc107' :
    '#28a745'
  };
  color: white;
  text-transform: uppercase;
`;

const OpportunityDescription = styled.div`
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
`;

const OpportunityDeadline = styled.div`
  font-size: 13px;
  color: #dc3545;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 4px;
`;

const StrengthsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const StrengthItem = styled.div`
  padding: 12px;
  background: #d4edda;
  border-radius: 8px;
  border-left: 4px solid #28a745;
`;

const StrengthTitle = styled.div`
  font-weight: 600;
  color: #155724;
  margin-bottom: 4px;
`;

const StrengthDescription = styled.div`
  font-size: 14px;
  color: #155724;
`;

const WeakSpotsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const WeakSpotItem = styled.div<{ priority: string }>`
  padding: 12px;
  background: ${props => props.priority === 'P0' ? '#f8d7da' : '#fff3cd'};
  border-radius: 8px;
  border-left: 4px solid ${props => props.priority === 'P0' ? '#dc3545' : '#ffc107'};
`;

const WeakSpotTitle = styled.div<{ priority: string }>`
  font-weight: 600;
  color: ${props => props.priority === 'P0' ? '#721c24' : '#856404'};
  margin-bottom: 4px;
`;

const WeakSpotDescription = styled.div<{ priority: string }>`
  font-size: 14px;
  color: ${props => props.priority === 'P0' ? '#721c24' : '#856404'};
`;

const ROIBadge = styled.span`
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  background: #17a2b8;
  color: white;
  margin-left: 8px;
`;

const SpikesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const SpikeItem = styled.div`
  padding: 10px 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 6px;
  color: white;
  font-size: 14px;
  font-weight: 500;
`;

// Section Headers
const SectionHeader = styled.div`
  margin: 32px 0 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid #e0e0e0;
`;

const SectionTitle = styled.h3`
  font-size: 24px;
  font-weight: bold;
  color: #333;
  margin-bottom: 4px;
`;

const SectionSubtitle = styled.p`
  font-size: 14px;
  color: #666;
`;

// Profile Section
const ProfileContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const ProfileName = styled.div`
  font-size: 20px;
  font-weight: bold;
  color: #667eea;
`;

const ProfileNarrative = styled.p`
  font-size: 15px;
  line-height: 1.6;
  color: #444;
`;

// EC List
const ECList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const ECItem = styled.div`
  padding: 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #f9f9f9;
`;

const ECHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

const ECTitle = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: #333;
`;

const ECBadge = styled.span`
  padding: 4px 8px;
  background: #667eea;
  color: white;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
`;

const ECRole = styled.div`
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
`;

const ECDescription = styled.p`
  font-size: 14px;
  line-height: 1.5;
  color: #444;
  margin-bottom: 12px;
`;

const ECMetrics = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
`;

const ECMetric = styled.div`
  font-size: 13px;
  color: #666;
`;

// Schools
const SchoolsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const SchoolItem = styled.div<{ tier: string }>`
  padding: 12px;
  background: ${props =>
    props.tier === 'Reach' ? '#fff3e0' :
    props.tier === 'Target' ? '#e8f5e9' :
    '#e3f2fd'
  };
  border-radius: 6px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const SchoolName = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: #333;
`;

const SchoolTier = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: #666;
`;

// Awards & Programs
const AwardsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const AwardItem = styled.div`
  padding: 12px;
  background: #fef7e0;
  border-radius: 6px;
`;

const AwardTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
`;

const AwardLevel = styled.div`
  font-size: 13px;
  color: #666;
`;

const ProgramsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ProgramItem = styled.div`
  padding: 12px;
  background: #f0f7ff;
  border-radius: 6px;
`;

const ProgramTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
`;

const ProgramDescription = styled.div`
  font-size: 13px;
  color: #666;
`;

// Timeline
const TimelineList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const TimelinePhase = styled.div`
  padding: 10px;
  background: #f5f5f5;
  border-radius: 6px;
`;

// Progress Section
const OpportunityMeta = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
`;

const OpportunityStatus = styled.div<{ status: string }>`
  font-size: 13px;
  font-weight: 600;
  color: ${props =>
    props.status === 'completed' ? '#27ae60' :
    props.status === 'in_progress' ? '#f39c12' :
    '#3498db'
  };
`;

const TimelineProgressList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const TimelineProgressItem = styled.div<{ status: string }>`
  padding: 12px;
  background: #f9f9f9;
  border-radius: 8px;
  border-left: 4px solid ${props =>
    props.status === 'completed' ? '#27ae60' :
    props.status === 'in_progress' ? '#f39c12' :
    '#95a5a6'
  };
`;

const PhaseProgressHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

const PhaseProgressPercent = styled.span`
  font-size: 16px;
  font-weight: bold;
  color: #667eea;
`;

const PhaseProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
`;

const PhaseProgressFill = styled.div<{ percentage: number }>`
  width: ${props => props.percentage}%;
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  transition: width 0.3s ease;
`;

const ECEvolutionList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const ECEvolutionItem = styled.div`
  padding: 10px;
  background: #f5f5f5;
  border-radius: 6px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ECEvolutionTitle = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: #333;
`;

const ECEvolutionStatus = styled.span`
  font-size: 12px;
  color: #666;
`;

export const GamePlanView: React.FC = () => {
  const { user } = useAuth();
  const [gamePlanData, setGamePlanData] = useState<any>(null);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadGamePlan = async () => {
      // Get student_id from either studentId or id property
      const studentId = (user as any)?.studentId || user?.id;

      if (!studentId) {
        setError('Student ID not found');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Load game plan
        const gamePlan = await v10Api.getGamePlan(studentId);
        setGamePlanData(gamePlan);

        // Load opportunities (all opportunities)
        const opps = await v10Api.getOpportunities(studentId);
        setOpportunities(opps.opportunities || []);

        // Load milestones for current phase
        if (gamePlan.current_phase_id) {
          const miles = await v10Api.getMilestones(studentId, {
            phase_id: gamePlan.current_phase_id
          });
          setMilestones(miles.milestones || []);
        }

        setLoading(false);
      } catch (err: any) {
        console.error('Error loading game plan:', err);
        setError(err.message || 'Failed to load game plan');
        setLoading(false);
      }
    };

    loadGamePlan();
  }, [user?.id, (user as any)?.studentId]);

  if (loading) {
    return (
      <Container>
        <LoadingState>Loading your game plan...</LoadingState>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <ErrorState>{error}</ErrorState>
      </Container>
    );
  }

  if (!gamePlanData) {
    return (
      <Container>
        <LoadingState>No game plan data available</LoadingState>
      </Container>
    );
  }

  // Extract current phase from phases array
  const currentPhase = gamePlanData.phases?.find(
    (phase: any) => phase.phase_id === gamePlanData.current_phase_id
  );
  const profileAssessment = gamePlanData.profile_assessment;
  const readinessScore = gamePlanData.readiness_score;

  // Extract data for both sections
  const targetProfile = gamePlanData.target_profile;
  const targetSchools = gamePlanData.target_schools || [];
  const extracurricularActivities = profileAssessment?.extracurricular_activities || [];

  return (
    <Container>
      <Header>
        <Title>Your Precision Roadmap</Title>
        <Subtitle>Multi-year strategic game plan to Ivy+ readiness</Subtitle>
      </Header>

      {/* ========================================================================
          SECTION A: INITIAL GAME PLAN (Baseline from Assessment)
          ======================================================================== */}
      <SectionHeader>
        <SectionTitle>📋 Initial Game Plan</SectionTitle>
        <SectionSubtitle>Baseline strategy defined at assessment</SectionSubtitle>
      </SectionHeader>

      <ContentGrid>
        <MainColumn>
          {/* Target Profile & Narrative */}
          {targetProfile && (
            <Card>
              <CardTitle>
                <Users size={24} />
                Target Profile & Narrative
              </CardTitle>
              <ProfileContent>
                <ProfileName>{targetProfile.profile_name || 'The Digital Storyteller'}</ProfileName>
                <ProfileNarrative>{targetProfile.narrative || gamePlanData.unique_story}</ProfileNarrative>
              </ProfileContent>
            </Card>
          )}

          {/* Initial EC Strategy */}
          {extracurricularActivities.length > 0 && (
            <Card>
              <CardTitle>
                <BookOpen size={24} />
                Planned Extracurricular Strategy ({extracurricularActivities.length} Activities)
              </CardTitle>
              <ECList>
                {extracurricularActivities.map((ec: any, idx: number) => (
                  <ECItem key={idx}>
                    <ECHeader>
                      <ECTitle>{ec.title}</ECTitle>
                      <ECBadge>{ec.category}</ECBadge>
                    </ECHeader>
                    <ECRole>{ec.role} • {ec.leadership}</ECRole>
                    <ECDescription>{ec.description}</ECDescription>
                    <ECMetrics>
                      <ECMetric>📅 {ec.hours_per_week} hrs/wk × {ec.weeks_per_year} wks/yr</ECMetric>
                      <ECMetric>🎯 Impact: {ec.impact}</ECMetric>
                      <ECMetric>📚 Years: {ec.years}</ECMetric>
                    </ECMetrics>
                  </ECItem>
                ))}
              </ECList>
            </Card>
          )}

          {/* Target Schools */}
          {targetSchools.length > 0 && (
            <Card>
              <CardTitle>
                <Target size={24} />
                Target Schools ({targetSchools.length} schools)
              </CardTitle>
              <SchoolsList>
                {targetSchools.length > 0 ? (
                  targetSchools.map((school: any, idx: number) => (
                    <SchoolItem key={idx} tier={school.tier || 'Target'}>
                      <SchoolName>{school.school_name || school.name || 'School Name'}</SchoolName>
                      <SchoolTier>{school.tier || 'Target'}</SchoolTier>
                    </SchoolItem>
                  ))
                ) : (
                  <div style={{ color: '#666', padding: '12px' }}>No target schools defined yet</div>
                )}
              </SchoolsList>
            </Card>
          )}
        </MainColumn>

        <SideColumn>
          {/* Target Awards */}
          <Card>
            <CardTitle>
              <Award size={24} />
              Target Awards & Honors
            </CardTitle>
            <AwardsList>
              {opportunities.filter((o: any) => o.category === 'award').map((award: any) => (
                <AwardItem key={award.opportunity_id}>
                  <AwardTitle>{award.title}</AwardTitle>
                  <AwardLevel>{award.description}</AwardLevel>
                </AwardItem>
              ))}
            </AwardsList>
          </Card>

          {/* Target Summer Programs */}
          <Card>
            <CardTitle>
              <Calendar size={24} />
              Target Summer Programs
            </CardTitle>
            <ProgramsList>
              {opportunities.filter((o: any) => o.category === 'summer_program').map((prog: any) => (
                <ProgramItem key={prog.opportunity_id}>
                  <ProgramTitle>{prog.title}</ProgramTitle>
                  <ProgramDescription>{prog.description}</ProgramDescription>
                </ProgramItem>
              ))}
            </ProgramsList>
          </Card>

          {/* Multi-Year Timeline */}
          {gamePlanData.phases && (
            <Card>
              <CardTitle>
                <Clock size={24} />
                Multi-Year Timeline
              </CardTitle>
              <TimelineList>
                {gamePlanData.phases.map((phase: any) => (
                  <TimelinePhase key={phase.phase_id}>
                    <PhaseName>{phase.phase_name}</PhaseName>
                    <PhaseWeeks>Weeks {phase.start_week}-{phase.end_week}</PhaseWeeks>
                  </TimelinePhase>
                ))}
              </TimelineList>
            </Card>
          )}
        </SideColumn>
      </ContentGrid>

      {/* ========================================================================
          SECTION B: PROGRESS & EVOLUTION (Current Status)
          ======================================================================== */}
      <SectionHeader style={{ marginTop: '48px' }}>
        <SectionTitle>📊 Progress & Evolution</SectionTitle>
        <SectionSubtitle>How the game plan has progressed over time</SectionSubtitle>
      </SectionHeader>

      {/* Current Phase Overview */}
      {currentPhase && (
        <PhaseHeader>
          <PhaseInfo>
            <PhaseName>{currentPhase.phase_name}</PhaseName>
            <PhaseWeeks>
              Week {currentPhase.start_week} - {currentPhase.end_week} • {currentPhase.status.replace('_', ' ')}
            </PhaseWeeks>
            <PhaseGoal>{currentPhase.goal}</PhaseGoal>
          </PhaseInfo>
          <PhaseProgress>
            <ProgressCircle>{currentPhase.completion_percentage}%</ProgressCircle>
          </PhaseProgress>
        </PhaseHeader>
      )}

      <ContentGrid>
        <MainColumn>
          {/* Phase Milestones Progress */}
          <Card>
            <CardTitle>
              <Target size={24} />
              Phase Milestones Progress
            </CardTitle>
            <MilestonesList>
              {milestones.length > 0 ? (
                milestones.map((milestone: any) => (
                  <MilestoneItem key={milestone.milestone_id} status={milestone.status}>
                    <MilestoneIcon status={milestone.status}>
                      {milestone.status === 'completed' ? (
                        <CheckCircle size={18} />
                      ) : milestone.status === 'in_progress' ? (
                        <Clock size={18} />
                      ) : (
                        <Target size={18} />
                      )}
                    </MilestoneIcon>
                    <MilestoneContent>
                      <MilestoneTitle>{milestone.title}</MilestoneTitle>
                      <MilestoneDate>
                        <Calendar size={12} />
                        Target: {new Date(milestone.target_date).toLocaleDateString()}
                      </MilestoneDate>
                    </MilestoneContent>
                  </MilestoneItem>
                ))
              ) : (
                <div style={{ color: '#666', textAlign: 'center', padding: '20px' }}>
                  No milestones for current phase
                </div>
              )}
            </MilestonesList>
          </Card>

          {/* Opportunities Status & Evolution */}
          <Card>
            <CardTitle>
              <Award size={24} />
              Opportunities Status & Evolution
            </CardTitle>
            <OpportunitiesList>
              {opportunities.length > 0 ? (
                opportunities.map((opp: any) => (
                  <OpportunityItem key={opp.opportunity_id} priority={opp.priority}>
                    <OpportunityHeader>
                      <OpportunityTitle>{opp.title}</OpportunityTitle>
                      <OpportunityBadge category={opp.category}>
                        {opp.category.replace('_', ' ')}
                      </OpportunityBadge>
                    </OpportunityHeader>
                    <OpportunityDescription>{opp.description}</OpportunityDescription>
                    <OpportunityMeta>
                      <OpportunityStatus status={opp.status}>
                        {opp.status === 'completed' ? '✅ Completed' :
                         opp.status === 'in_progress' ? '🔄 In Progress' :
                         '📅 Planned'}
                      </OpportunityStatus>
                      <OpportunityDeadline>
                        <AlertCircle size={14} />
                        {new Date(opp.deadline).toLocaleDateString()}
                      </OpportunityDeadline>
                    </OpportunityMeta>
                  </OpportunityItem>
                ))
              ) : (
                <div style={{ color: '#666', textAlign: 'center', padding: '20px' }}>
                  No opportunities tracked
                </div>
              )}
            </OpportunitiesList>
          </Card>
        </MainColumn>

        <SideColumn>
          {/* Timeline Progress Summary */}
          {gamePlanData.phases && (
            <Card>
              <CardTitle>
                <Clock size={24} />
                Timeline Progress
              </CardTitle>
              <TimelineProgressList>
                {gamePlanData.phases.map((phase: any) => (
                  <TimelineProgressItem key={phase.phase_id} status={phase.status}>
                    <PhaseProgressHeader>
                      <PhaseName>{phase.phase_name}</PhaseName>
                      <PhaseProgressPercent>{phase.completion_percentage}%</PhaseProgressPercent>
                    </PhaseProgressHeader>
                    <PhaseProgressBar>
                      <PhaseProgressFill percentage={phase.completion_percentage} />
                    </PhaseProgressBar>
                    <PhaseWeeks>Weeks {phase.start_week}-{phase.end_week}</PhaseWeeks>
                  </TimelineProgressItem>
                ))}
              </TimelineProgressList>
            </Card>
          )}

          {/* EC Evolution Summary */}
          {extracurricularActivities.length > 0 && (
            <Card>
              <CardTitle>
                <BookOpen size={24} />
                EC Evolution Summary
              </CardTitle>
              <ECEvolutionList>
                {extracurricularActivities.slice(0, 4).map((ec: any, idx: number) => (
                  <ECEvolutionItem key={idx}>
                    <ECEvolutionTitle>{ec.title}</ECEvolutionTitle>
                    <ECEvolutionStatus>
                      {ec.years?.includes('12') ? '✅ Active' : `⏸️ Completed (${ec.years})`}
                    </ECEvolutionStatus>
                  </ECEvolutionItem>
                ))}
              </ECEvolutionList>
            </Card>
          )}
        </SideColumn>
      </ContentGrid>
    </Container>
  );
};
