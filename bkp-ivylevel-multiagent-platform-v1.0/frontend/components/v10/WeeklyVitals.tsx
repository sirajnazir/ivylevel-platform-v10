import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { v10Api, WeeklyVitals as WeeklyVitalsType, ECDetail, AwardDetail, WeeklyActionPlan } from '../../utils/v10ApiService';
import { WeeklyActionPlanCard } from './WeeklyActionPlanCard';

const Container = styled.div`
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`;

const Title = styled.h2`
  font-size: 28px;
  color: #333;
  margin: 0;
`;

const ViewControls = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
`;

const ViewButton = styled.button<{ $active?: boolean }>`
  padding: 8px 16px;
  border-radius: 6px;
  border: 1px solid ${props => props.$active ? '#FF5733' : '#e9ecef'};
  background: ${props => props.$active ? '#FF5733' : 'white'};
  color: ${props => props.$active ? 'white' : '#666'};
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;

  &:hover {
    border-color: #FF5733;
  }
`;

const VitalsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 24px;
  margin-bottom: 30px;
  max-width: 1800px;
  margin: 0 auto 30px auto;

  @media (max-width: 1600px) {
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  }

  @media (max-width: 1200px) {
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const WeekCardContainer = styled.div<{ $isExpanded?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 0;
  background: white;
  border-radius: 12px;
  box-shadow: ${props => props.$isExpanded ? '0 8px 32px rgba(0,0,0,0.15)' : '0 4px 12px rgba(0,0,0,0.08)'};
  border: 1px solid ${props => props.$isExpanded ? '#667eea' : '#e9ecef'};
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: ${props => props.$isExpanded
      ? 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)'
      : 'linear-gradient(90deg, #FF5733 0%, #FFC300 100%)'};
    transition: all 0.3s ease;
  }

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.12);
  }
`;

const VitalCard = styled.div`
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  padding: 20px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
`;

const VitalHeader = styled.div`
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e9ecef;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
`;

const VitalTitle = styled.h3`
  font-size: 16px;
  margin: 0;
  color: #222;
  font-weight: 700;
  letter-spacing: -0.3px;
`;

const WeekInfo = styled.div`
  font-size: 11px;
  color: #888;
  margin-top: 4px;
  font-weight: 500;
`;

const CompactMetrics = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin: 12px 0;
`;

const MetricBox = styled.div`
  background: rgba(255, 87, 51, 0.05);
  padding: 10px;
  border-radius: 8px;
  border: 1px solid rgba(255, 87, 51, 0.1);
`;

const MetricLabel = styled.div`
  font-size: 10px;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
  font-weight: 600;
`;

const MetricValue = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: #FF5733;
`;

const ActionPlanToggle = styled.div<{ $isExpanded: boolean }>`
  background: ${props => props.$isExpanded ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'};
  color: white;
  padding: 12px 16px;
  border-radius: 8px;
  margin-top: 16px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: ${props => props.$isExpanded ? '0 4px 12px rgba(102, 126, 234, 0.3)' : '0 2px 8px rgba(245, 87, 108, 0.2)'};

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${props => props.$isExpanded ? '0 6px 16px rgba(102, 126, 234, 0.4)' : '0 4px 12px rgba(245, 87, 108, 0.3)'};
  }
`;

const ToggleIcon = styled.span<{ $isExpanded: boolean }>`
  transition: transform 0.3s ease;
  transform: ${props => props.$isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'};
  font-size: 16px;
`;

const ExpandedActionPlanSection = styled.div<{ $isExpanded: boolean }>`
  max-height: ${props => props.$isExpanded ? '3000px' : '0'};
  opacity: ${props => props.$isExpanded ? '1' : '0'};
  overflow: hidden;
  transition: max-height 0.5s cubic-bezier(0.4, 0, 0.2, 1),
              opacity 0.4s ease 0.1s;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 20px;
    right: 20px;
    height: 1px;
    background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%);
  }
`;

const ActionPlanContent = styled.div`
  padding: 24px 20px;
  position: relative;
  z-index: 1;

  /* Override WeeklyActionPlanCard styles when embedded */
  > div {
    background: transparent !important;
    padding: 0 !important;
    margin-top: 0 !important;
    box-shadow: none !important;
    border: none !important;
    animation: none !important;
  }
`;

const ProgressBar = styled.div`
  height: 8px;
  background: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
  margin: 16px 0;
`;

const ProgressFill = styled.div<{ $progress: number; $status: string }>`
  height: 100%
;
  width: ${props => props.$progress}%;
  background: ${props => {
    switch (props.$status) {
      case 'ahead': return '#28a745';
      case 'on_track': return '#FF5733';
      case 'behind': return '#dc3545';
      default: return '#6c757d';
    }
  }};
  transition: width 0.3s ease;
`;

const StatusBadge = styled.span<{ $status: string }>`
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  background: ${props => {
    switch (props.$status) {
      case 'ahead': return '#28a745';
      case 'on_track': return '#FF5733';
      case 'behind': return '#dc3545';
      default: return '#6c757d';
    }
  }};
  color: white;
  text-transform: capitalize;
`;

const VitalsSection = styled.div`
  margin-top: 16px;
`;

const VitalRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  font-size: 14px;
  border-bottom: 1px solid #f8f9fa;

  &:last-child {
    border-bottom: none;
  }
`;

const VitalLabel = styled.span`
  color: #666;
`;

const VitalValue = styled.span`
  color: #333;
  font-weight: 600;
`;

const FocusArea = styled.div`
  background: #f8f9fa;
  padding: 12px;
  border-radius: 6px;
  margin-top: 8px;
  font-size: 14px;
  color: #666;
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 40px;
  color: #666;
`;

const CollapsibleSection = styled.div`
  margin-top: 16px;
  border-top: 1px solid #e9ecef;
  padding-top: 12px;
`;

const SectionHeader = styled.div<{ $isExpanded?: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  padding: 8px 0;
  user-select: none;

  &:hover {
    background: #f8f9fa;
  }
`;

const SectionTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #333;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ExpandIcon = styled.span<{ $isExpanded?: boolean }>`
  font-size: 12px;
  transform: ${props => props.$isExpanded ? 'rotate(90deg)' : 'rotate(0deg)'};
  transition: transform 0.2s;
`;

const SectionContent = styled.div<{ $isExpanded?: boolean }>`
  max-height: ${props => props.$isExpanded ? '8000px' : '0'};
  overflow: hidden;
  transition: max-height 0.3s ease;
`;

const ECItem = styled.div`
  background: #f8f9fa;
  padding: 12px;
  border-radius: 6px;
  margin: 8px 0;
  border-left: 3px solid #FF5733;
`;

const ECName = styled.div`
  font-weight: 600;
  color: #333;
  font-size: 14px;
  margin-bottom: 6px;
`;

const ECStatus = styled.span<{ $status: string }>`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
  margin-left: 8px;
  background: ${props => {
    switch (props.$status) {
      case 'in_app': return '#28a745';
      case 'scaling': return '#17a2b8';
      case 'launched': return '#ffc107';
      case 'development': return '#6c757d';
      default: return '#6c757d';
    }
  }};
  color: white;
`;

const ECMetrics = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 8px;
  margin-top: 8px;
`;

const ECMetric = styled.div`
  font-size: 12px;
  color: #666;

  span {
    font-weight: 600;
    color: #333;
  }
`;

const AwardItem = styled.div`
  background: #fff8e1;
  padding: 12px;
  border-radius: 6px;
  margin: 8px 0;
  border-left: 3px solid #ffc107;
`;

const AwardName = styled.div`
  font-weight: 600;
  color: #333;
  font-size: 14px;
  margin-bottom: 6px;
`;

const AwardBadge = styled.span<{ $level: string }>`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
  margin-left: 8px;
  background: ${props => {
    switch (props.$level) {
      case 'international': return '#6f42c1';
      case 'national': return '#dc3545';
      case 'state': return '#fd7e14';
      case 'regional': return '#20c997';
      case 'school': return '#6c757d';
      default: return '#6c757d';
    }
  }};
  color: white;
`;

const AwardStatus = styled.div`
  font-size: 12px;
  color: #666;
  margin-top: 4px;
`;

const EmptyState = styled.div`
  padding: 12px;
  text-align: center;
  color: #999;
  font-size: 13px;
  font-style: italic;
`;

interface WeeklyVitalsProps {
  studentId: string;
}

export function WeeklyVitals({ studentId }: WeeklyVitalsProps) {
  const [weeks, setWeeks] = useState<WeeklyVitalsType[]>([]);
  const [totalWeeksCount, setTotalWeeksCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'recent' | 'quarter' | 'all'>('recent');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [actionPlans, setActionPlans] = useState<Record<number, WeeklyActionPlan | null>>({});
  const [loadingActionPlans, setLoadingActionPlans] = useState(false);
  const [expandedActionPlans, setExpandedActionPlans] = useState<Record<number, boolean>>({});

  // Load total weeks count once on mount
  useEffect(() => {
    const loadTotalCount = async () => {
      try {
        const data = await v10Api.getWeeklyVitals(studentId, { limit: 100 });
        setTotalWeeksCount(data.weeks.length);
      } catch (error) {
        console.error('Failed to load total weeks count:', error);
      }
    };
    loadTotalCount();
  }, [studentId]);

  useEffect(() => {
    loadVitals();
  }, [studentId, viewMode]);

  const loadVitals = async () => {
    try {
      setLoading(true);
      // Recent: last 4 weeks, Quarter: last 12 weeks (3 months), All: all weeks
      const limit = viewMode === 'recent' ? 4 : viewMode === 'quarter' ? 12 : 100;
      const data = await v10Api.getWeeklyVitals(studentId, { limit });
      setWeeks(data.weeks);

      // Load action plans for all weeks
      await loadActionPlans(data.weeks);
    } catch (error) {
      console.error('Failed to load weekly vitals:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadActionPlans = async (weeksData: WeeklyVitalsType[]) => {
    try {
      setLoadingActionPlans(true);
      const plans: Record<number, WeeklyActionPlan | null> = {};

      // Load action plans in parallel for all weeks
      await Promise.all(
        weeksData.map(async (week) => {
          try {
            const result = await v10Api.getActionPlan(studentId, week.week_number);
            plans[week.week_number] = result.action_plan;
          } catch (error) {
            console.error(`Failed to load action plan for week ${week.week_number}:`, error);
            plans[week.week_number] = null;
          }
        })
      );

      setActionPlans(plans);
    } catch (error) {
      console.error('Failed to load action plans:', error);
    } finally {
      setLoadingActionPlans(false);
    }
  };

  const toggleSection = (weekNumber: number, section: string) => {
    const key = `${weekNumber}-${section}`;
    setExpandedSections(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const isSectionExpanded = (weekNumber: number, section: string) => {
    const key = `${weekNumber}-${section}`;
    return expandedSections[key] || false;
  };

  const toggleActionPlan = (weekNumber: number) => {
    setExpandedActionPlans(prev => ({
      ...prev,
      [weekNumber]: !prev[weekNumber]
    }));
  };

  const isActionPlanExpanded = (weekNumber: number) => {
    return expandedActionPlans[weekNumber] || false;
  };

  const formatMetric = (key: string, value: number) => {
    switch (key) {
      // v2.0 Scale metrics
      case 'participants_reached':
        return `${value} participants reached`;
      case 'locations_reached':
        return `${value} locations`;
      case 'audience_size':
        return `${value >= 1000 ? (value / 1000).toFixed(1) + 'K' : value} audience`;
      case 'organizational_size':
        return `${value} team members`;

      // v2.0 Impact metrics
      case 'funding_raised':
        return `$${(value / 1000).toFixed(0)}K raised`;
      case 'publications':
        return `${value} publications`;
      case 'events_organized':
        return `${value} events`;
      case 'resources_created':
        return `${value} resources created`;
      case 'partnerships':
        return `${value} partnerships`;

      // v2.0 Recognition metrics
      case 'press_mentions':
        return `${value} press mentions`;
      case 'speaking_engagements':
        return `${value} speaking engagements`;
      case 'growth_rate':
        return `${value}% growth`;

      // v1.0 backwards compatibility
      case 'participants':
        return `${value} participants`;
      case 'cities_reached':
        return `${value} cities`;
      case 'users':
        return `${(value / 1000).toFixed(1)}K users`;
      case 'classes':
        return `${value} classes`;
      case 'members':
        return `${value} members`;
      case 'growth_percentage':
        return `${value}% growth`;
      case 'hours_per_week':
        return `${value} hrs/week`;
      case 'writers':
        return `${value} writers`;
      case 'articles':
        return `${value} articles`;

      default:
        return `${key.replace(/_/g, ' ')}: ${value}`;
    }
  };

  const renderEC = (ec: ECDetail) => {
    // Collect all metrics from v2.0 organized structure or v1.0 flat structure
    const allMetrics: Record<string, number> = {};

    // v2.0: Extract from scale, impact, recognition
    if (ec.scale) Object.entries(ec.scale).forEach(([k, v]) => { if (v !== undefined) allMetrics[k] = v; });
    if (ec.impact) Object.entries(ec.impact).forEach(([k, v]) => { if (v !== undefined) allMetrics[k] = v; });
    if (ec.recognition) {
      Object.entries(ec.recognition).forEach(([k, v]) => {
        if (k === 'awards') return; // Skip array
        if (v !== undefined && typeof v === 'number') allMetrics[k] = v;
      });
    }

    // v1.0: Fall back to flat metrics if v2.0 not present
    if (Object.keys(allMetrics).length === 0 && ec.metrics) {
      Object.entries(ec.metrics).forEach(([k, v]) => { if (v !== undefined && typeof v === 'number') allMetrics[k] = v; });
    }

    // Add hours_per_week and weeks_per_year if present
    if (ec.hours_per_week) allMetrics['hours_per_week'] = ec.hours_per_week;
    if (ec.weeks_per_year) allMetrics['weeks_per_year'] = ec.weeks_per_year;

    return (
      <ECItem key={ec.name}>
        <ECName>
          {ec.name}
          {ec.position && <span style={{ fontSize: '12px', color: '#666', marginLeft: '8px' }}>({ec.position})</span>}
          <ECStatus $status={ec.status}>
            {ec.status.replace('_', ' ')}
          </ECStatus>
        </ECName>
        {ec.description && (
          <div style={{ fontSize: '12px', color: '#666', marginTop: '4px', fontStyle: 'italic' }}>
            {ec.description}
          </div>
        )}
        <ECMetrics>
          {Object.entries(allMetrics).map(([key, value]) => (
            <ECMetric key={key}>
              {formatMetric(key, value as number)}
            </ECMetric>
          ))}
        </ECMetrics>
        {ec.recognition?.awards && ec.recognition.awards.length > 0 && (
          <div style={{ marginTop: '8px', fontSize: '11px', color: '#28a745' }}>
            🏆 {ec.recognition.awards.join(', ')}
          </div>
        )}
      </ECItem>
    );
  };

  const renderAward = (award: AwardDetail) => (
    <AwardItem key={award.name}>
      <AwardName>
        {award.name}
        <AwardBadge $level={award.level}>
          {award.level}
        </AwardBadge>
      </AwardName>
      <AwardStatus>
        Status: {award.status.replace('_', ' ')}
        {award.won_week && ` • Won in Week ${award.won_week}`}
      </AwardStatus>
    </AwardItem>
  );

  if (loading) {
    return <LoadingState>Loading weekly vitals...</LoadingState>;
  }

  return (
    <Container>
      <Header>
        <Title>Weekly Progress</Title>
        <ViewControls>
          <ViewButton
            $active={viewMode === 'recent'}
            onClick={() => setViewMode('recent')}
          >
            Recent (4 weeks)
          </ViewButton>
          <ViewButton
            $active={viewMode === 'quarter'}
            onClick={() => setViewMode('quarter')}
          >
            Last Quarter (12 weeks)
          </ViewButton>
          <ViewButton
            $active={viewMode === 'all'}
            onClick={() => setViewMode('all')}
          >
            All Weeks ({totalWeeksCount})
          </ViewButton>
        </ViewControls>
      </Header>
      <VitalsGrid>
        {weeks.map(week => (
          <WeekCardContainer key={week.week_number} $isExpanded={isActionPlanExpanded(week.week_number)}>
            {/* Main Vital Card */}
            <VitalCard>
              <VitalHeader>
                <div>
                  <VitalTitle>Week {week.week_number}</VitalTitle>
                  <WeekInfo>
                    {new Date(week.week_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(week.week_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </WeekInfo>
                </div>
                <StatusBadge $status={week.progress_status}>
                  {week.progress_status.replace('_', ' ')}
                </StatusBadge>
              </VitalHeader>

              <CompactMetrics>
                <MetricBox>
                  <MetricLabel>Completion</MetricLabel>
                  <MetricValue>{week.completion_percentage}%</MetricValue>
                </MetricBox>
                <MetricBox>
                  <MetricLabel>Projects</MetricLabel>
                  <MetricValue>{week.vitals?.extracurricular?.projects_active || week.ec_details?.length || 0}</MetricValue>
                </MetricBox>
                <MetricBox>
                  <MetricLabel>GPA</MetricLabel>
                  <MetricValue>{week.academic_vitals?.gpa_weighted?.toFixed(2) || week.vitals?.academic?.gpa_weighted?.toFixed(2) || 'N/A'}</MetricValue>
                </MetricBox>
                <MetricBox>
                  <MetricLabel>Awards</MetricLabel>
                  <MetricValue>{week.vitals?.extracurricular?.awards_won || week.award_details?.length || 0}</MetricValue>
                </MetricBox>
              </CompactMetrics>

              <div style={{ fontSize: '11px', color: '#666', marginTop: '8px' }}>
                {week.focus_areas && week.focus_areas.length > 0 && (
                  <div style={{ background: '#f8f9fa', padding: '8px', borderRadius: '6px', fontStyle: 'italic' }}>
                    📌 {week.focus_areas[0].area}
                  </div>
                )}
              </div>

              {/* Academic Profile */}
              {week.academic_vitals && (
                <CollapsibleSection>
                  <SectionHeader onClick={() => toggleSection(week.week_number, 'academic')} $isExpanded={isSectionExpanded(week.week_number, 'academic')}>
                    <SectionTitle>
                      <ExpandIcon $isExpanded={isSectionExpanded(week.week_number, 'academic')}>▶</ExpandIcon>
                      Academic Profile
                    </SectionTitle>
                  </SectionHeader>
                  <SectionContent $isExpanded={isSectionExpanded(week.week_number, 'academic')}>
                    {week.academic_vitals.gpa_weighted && (
                      <VitalRow>
                        <VitalLabel>GPA (Weighted)</VitalLabel>
                        <VitalValue>{week.academic_vitals.gpa_weighted.toFixed(2)} / {week.academic_vitals.gpa_scale || 4.0}</VitalValue>
                      </VitalRow>
                    )}
                    {week.academic_vitals.sat && (
                      <VitalRow>
                        <VitalLabel>SAT Score</VitalLabel>
                        <VitalValue>{week.academic_vitals.sat.total} (EBRW: {week.academic_vitals.sat.ebrw}, Math: {week.academic_vitals.sat.math})</VitalValue>
                      </VitalRow>
                    )}
                    {week.academic_vitals.ap_exams && week.academic_vitals.ap_exams.length > 0 && (
                      <div style={{ marginTop: '12px' }}>
                        <div style={{ fontSize: '13px', color: '#666', marginBottom: '6px', fontWeight: 600 }}>
                          AP Exams ({week.academic_vitals.ap_exams.length})
                        </div>
                        {week.academic_vitals.ap_exams.map((exam, idx) => (
                          <div key={idx} style={{
                            fontSize: '12px',
                            padding: '4px 8px',
                            background: '#f8f9fa',
                            borderRadius: '4px',
                            marginBottom: '4px',
                            display: 'flex',
                            justifyContent: 'space-between'
                          }}>
                            <span>{exam.subject}</span>
                            <span style={{
                              fontWeight: 600,
                              color: exam.score === 5 ? '#28a745' : exam.score >= 4 ? '#FF5733' : '#6c757d'
                            }}>
                              Score: {exam.score}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    {week.academic_vitals.current_courses && week.academic_vitals.current_courses.length > 0 && (
                      <div style={{ marginTop: '12px' }}>
                        <div style={{ fontSize: '13px', color: '#666', marginBottom: '6px', fontWeight: 600 }}>
                          Current Courses (Grade {week.academic_vitals.current_courses[0].year})
                        </div>
                        {week.academic_vitals.current_courses.map((term, termIdx) => (
                          <div key={termIdx} style={{ marginBottom: '8px' }}>
                            {term.courses.slice(0, 5).map((course, courseIdx) => (
                              <div key={courseIdx} style={{
                                fontSize: '11px',
                                padding: '3px 6px',
                                background: course.level === 'AP' || course.level === 'IB' ? '#fff3cd' : '#f8f9fa',
                                borderRadius: '3px',
                                marginBottom: '2px',
                                display: 'flex',
                                justifyContent: 'space-between'
                              }}>
                                <span>{course.title}</span>
                                <span style={{
                                  fontWeight: 600,
                                  color: course.level === 'AP' || course.level === 'IB' ? '#FF5733' : '#6c757d',
                                  fontSize: '10px'
                                }}>
                                  {course.level}
                                </span>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </SectionContent>
                </CollapsibleSection>
              )}

              {/* Extracurriculars Section */}
              {week.ec_details && week.ec_details.length > 0 && (
                <CollapsibleSection>
                  <SectionHeader onClick={() => toggleSection(week.week_number, 'ecs')} $isExpanded={isSectionExpanded(week.week_number, 'ecs')}>
                    <SectionTitle>
                      <ExpandIcon $isExpanded={isSectionExpanded(week.week_number, 'ecs')}>▶</ExpandIcon>
                      Extracurriculars ({week.ec_details.length})
                    </SectionTitle>
                  </SectionHeader>
                  <SectionContent $isExpanded={isSectionExpanded(week.week_number, 'ecs')}>
                    {week.ec_details.map(renderEC)}
                  </SectionContent>
                </CollapsibleSection>
              )}

              {/* Awards Section */}
              {week.award_details && week.award_details.length > 0 && (
                <CollapsibleSection>
                  <SectionHeader onClick={() => toggleSection(week.week_number, 'awards')} $isExpanded={isSectionExpanded(week.week_number, 'awards')}>
                    <SectionTitle>
                      <ExpandIcon $isExpanded={isSectionExpanded(week.week_number, 'awards')}>▶</ExpandIcon>
                      Awards ({week.award_details.length})
                    </SectionTitle>
                  </SectionHeader>
                  <SectionContent $isExpanded={isSectionExpanded(week.week_number, 'awards')}>
                    {week.award_details.map(renderAward)}
                  </SectionContent>
                </CollapsibleSection>
              )}

              <ActionPlanToggle
                $isExpanded={isActionPlanExpanded(week.week_number)}
                onClick={() => toggleActionPlan(week.week_number)}
              >
                <span>
                  {isActionPlanExpanded(week.week_number) ? '📋 Hide Action Plan' : '📋 View Action Plan'}
                  {actionPlans[week.week_number] && ` (${actionPlans[week.week_number]?.execution_items?.length || 0} items)`}
                </span>
                <ToggleIcon $isExpanded={isActionPlanExpanded(week.week_number)}>▼</ToggleIcon>
              </ActionPlanToggle>
            </VitalCard>

            {/* Expandable Action Plan Section - Seamlessly connected */}
            <ExpandedActionPlanSection $isExpanded={isActionPlanExpanded(week.week_number)}>
              <ActionPlanContent>
                <WeeklyActionPlanCard
                  studentId={studentId}
                  weekNumber={week.week_number}
                  weekStart={week.week_start}
                  weekEnd={week.week_end}
                  actionPlan={actionPlans[week.week_number] || null}
                  onRefresh={() => loadActionPlans([week])}
                />
              </ActionPlanContent>
            </ExpandedActionPlanSection>
          </WeekCardContainer>
        ))}
      </VitalsGrid>
    </Container>
  );
}

