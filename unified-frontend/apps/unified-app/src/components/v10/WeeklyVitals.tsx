import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { v10Api, WeeklyVitals as WeeklyVitalsType, ECDetail, AwardDetail } from '../../utils/v10ApiService';

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
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
`;

const VitalCard = styled.div`
  background: white;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
`;

const VitalHeader = styled.div`
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 2px solid #e9ecef;
`;

const VitalTitle = styled.h3`
  font-size: 18px;
  margin: 0 0 8px 0;
  color: #333;
`;

const WeekInfo = styled.div`
  font-size: 13px;
  color: #666;
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
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'recent' | 'quarter' | 'all'>('recent');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

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
    } catch (error) {
      console.error('Failed to load weekly vitals:', error);
    } finally {
      setLoading(false);
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
            All Weeks ({weeks.length})
          </ViewButton>
        </ViewControls>
      </Header>
      <VitalsGrid>
        {weeks.map(week => (
          <VitalCard key={week.week_number}>
            <VitalHeader>
              <VitalTitle>Week {week.week_number}</VitalTitle>
              <WeekInfo>
                {new Date(week.week_start).toLocaleDateString()} - {new Date(week.week_end).toLocaleDateString()}
              </WeekInfo>
              <div style={{ marginTop: '12px' }}>
                <StatusBadge $status={week.progress_status}>{week.progress_status.replace('_', ' ')}</StatusBadge>
              </div>
            </VitalHeader>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                <span>Completion</span>
                <span style={{ fontWeight: 600 }}>{week.completion_percentage}%</span>
              </div>
              <ProgressBar>
                <ProgressFill $progress={week.completion_percentage} $status={week.progress_status} />
              </ProgressBar>
            </div>

            {/* Academic Profile - v3.0 with complete data */}
            {week.academic_vitals && (
              <CollapsibleSection>
                <SectionHeader onClick={() => toggleSection(week.week_number, 'academic')} $isExpanded={isSectionExpanded(week.week_number, 'academic')}>
                  <SectionTitle>
                    <ExpandIcon $isExpanded={isSectionExpanded(week.week_number, 'academic')}>▶</ExpandIcon>
                    Academic Profile
                  </SectionTitle>
                </SectionHeader>
                <SectionContent $isExpanded={isSectionExpanded(week.week_number, 'academic')}>
                  {/* GPA */}
                  {week.academic_vitals.gpa_weighted && (
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>GPA</div>
                      <div style={{ fontSize: '16px', fontWeight: 600 }}>
                        {week.academic_vitals.gpa_weighted.toFixed(2)} / {week.academic_vitals.gpa_scale || 4.0}
                        {week.academic_vitals.gpa_unweighted && ` (UW: ${week.academic_vitals.gpa_unweighted.toFixed(2)})`}
                      </div>
                      {week.academic_vitals.class_rank && (
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                          Class Rank: {week.academic_vitals.class_rank === 'na' ? 'Unranked' : `${week.academic_vitals.class_rank} / ${week.academic_vitals.class_size}`}
                        </div>
                      )}
                    </div>
                  )}

                  {/* SAT */}
                  {week.academic_vitals.sat && (
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>SAT</div>
                      <div style={{ fontSize: '16px', fontWeight: 600 }}>{week.academic_vitals.sat.total}</div>
                      <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                        EBRW: {week.academic_vitals.sat.ebrw} | Math: {week.academic_vitals.sat.math}
                        {week.academic_vitals.sat.attempts && week.academic_vitals.sat.attempts.length > 1 &&
                          ` (${week.academic_vitals.sat.attempts.length} attempts)`
                        }
                      </div>
                    </div>
                  )}

                  {/* ACT */}
                  {week.academic_vitals.act && (
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>ACT</div>
                      <div style={{ fontSize: '16px', fontWeight: 600 }}>{week.academic_vitals.act.composite}</div>
                      <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                        E: {week.academic_vitals.act.english} | M: {week.academic_vitals.act.math} |
                        R: {week.academic_vitals.act.reading} | S: {week.academic_vitals.act.science}
                      </div>
                    </div>
                  )}

                  {/* AP Exams */}
                  {week.academic_vitals.ap_exams && week.academic_vitals.ap_exams.length > 0 && (
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '13px', color: '#666', marginBottom: '6px' }}>
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
                            {exam.score}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* IB Exams */}
                  {week.academic_vitals.ib_exams && week.academic_vitals.ib_exams.length > 0 && (
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '13px', color: '#666', marginBottom: '6px' }}>
                        IB Exams ({week.academic_vitals.ib_exams.length})
                      </div>
                      {week.academic_vitals.ib_exams.map((exam, idx) => (
                        <div key={idx} style={{
                          fontSize: '12px',
                          padding: '4px 8px',
                          background: '#f8f9fa',
                          borderRadius: '4px',
                          marginBottom: '4px'
                        }}>
                          {exam.subject} ({exam.level}): {exam.final_score || exam.predicted_score}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Current Courses */}
                  {week.academic_vitals.current_courses && week.academic_vitals.current_courses.length > 0 && (
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '13px', color: '#666', marginBottom: '6px' }}>
                        Current Courses (Grade {week.academic_vitals.current_courses[0].year})
                      </div>
                      {week.academic_vitals.current_courses.map((term, termIdx) => (
                        <div key={termIdx} style={{ marginBottom: '8px' }}>
                          <div style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', marginBottom: '4px' }}>
                            {term.semester === 'fall' ? 'Fall Semester' : 'Spring Semester'}
                          </div>
                          {term.courses.map((course, courseIdx) => (
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

                  {/* Academic Rigor Summary */}
                  {week.academic_vitals.total_ap_courses !== undefined && (
                    <div style={{
                      marginTop: '12px',
                      padding: '8px',
                      background: '#e7f3ff',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}>
                      <strong>Course Rigor:</strong> {week.academic_vitals.total_ap_courses} AP/IB courses
                      {week.academic_vitals.total_honors_courses && ` + ${week.academic_vitals.total_honors_courses} Honors`}
                    </div>
                  )}
                </SectionContent>
              </CollapsibleSection>
            )}

            {/* Fallback to old vitals format for backwards compatibility */}
            {!week.academic_vitals && week.vitals?.academic && (
              <VitalsSection>
                <strong style={{ fontSize: '14px', display: 'block', marginBottom: '8px' }}>Academic</strong>
                {week.vitals.academic.gpa_weighted && (
                  <VitalRow>
                    <VitalLabel>GPA (Weighted)</VitalLabel>
                    <VitalValue>{week.vitals.academic.gpa_weighted.toFixed(2)}</VitalValue>
                  </VitalRow>
                )}
                {week.vitals.academic.sat_score && (
                  <VitalRow>
                    <VitalLabel>SAT Score</VitalLabel>
                    <VitalValue>{week.vitals.academic.sat_score}</VitalValue>
                  </VitalRow>
                )}
                {week.vitals.academic.ap_count !== undefined && (
                  <VitalRow>
                    <VitalLabel>AP Courses</VitalLabel>
                    <VitalValue>{week.vitals.academic.ap_count}</VitalValue>
                  </VitalRow>
                )}
              </VitalsSection>
            )}

            <VitalsSection>
              <strong style={{ fontSize: '14px', display: 'block', marginBottom: '8px' }}>Extracurricular</strong>
              {week.vitals.extracurricular.projects_active !== undefined && (
                <VitalRow>
                  <VitalLabel>Active Projects</VitalLabel>
                  <VitalValue>{week.vitals.extracurricular.projects_active}</VitalValue>
                </VitalRow>
              )}
              {week.vitals.extracurricular.leadership_roles !== undefined && (
                <VitalRow>
                  <VitalLabel>Leadership Roles</VitalLabel>
                  <VitalValue>{week.vitals.extracurricular.leadership_roles}</VitalValue>
                </VitalRow>
              )}
              {week.vitals.extracurricular.awards_won !== undefined && (
                <VitalRow>
                  <VitalLabel>Awards Won</VitalLabel>
                  <VitalValue>{week.vitals.extracurricular.awards_won}</VitalValue>
                </VitalRow>
              )}
            </VitalsSection>

            {week.vitals.growth.hgti_score !== undefined && (
              <VitalsSection>
                <strong style={{ fontSize: '14px', display: 'block', marginBottom: '8px' }}>Growth</strong>
                <VitalRow>
                  <VitalLabel>HGTI Score</VitalLabel>
                  <VitalValue>{week.vitals.growth.hgti_score?.toFixed(1)}</VitalValue>
                </VitalRow>
                {week.vitals.growth.breakthroughs !== undefined && (
                  <VitalRow>
                    <VitalLabel>Breakthroughs</VitalLabel>
                    <VitalValue>{week.vitals.growth.breakthroughs}</VitalValue>
                  </VitalRow>
                )}
              </VitalsSection>
            )}

            {week.focus_areas && week.focus_areas.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <strong style={{ fontSize: '14px', display: 'block', marginBottom: '8px' }}>Focus Areas</strong>
                {week.focus_areas.slice(0, 2).map((area, index) => (
                  <FocusArea key={index}>{area.area}</FocusArea>
                ))}
              </div>
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
          </VitalCard>
        ))}
      </VitalsGrid>
    </Container>
  );
}
