import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { v10Api, WeeklyVitals as WeeklyVitalsType } from '../../utils/v10ApiService';

const Container = styled.div`
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
`;

const Title = styled.h2`
  font-size: 28px;
  color: #333;
  margin-bottom: 24px;
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

interface WeeklyVitalsProps {
  studentId: string;
}

export function WeeklyVitals({ studentId }: WeeklyVitalsProps) {
  const [weeks, setWeeks] = useState<WeeklyVitalsType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVitals();
  }, [studentId]);

  const loadVitals = async () => {
    try {
      setLoading(true);
      const data = await v10Api.getWeeklyVitals(studentId, { limit: 4 });
      setWeeks(data.weeks);
    } catch (error) {
      console.error('Failed to load weekly vitals:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingState>Loading weekly vitals...</LoadingState>;
  }

  return (
    <Container>
      <Title>Weekly Progress</Title>
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

            <VitalsSection>
              <strong style={{ fontSize: '14px', display: 'block', marginBottom: '8px' }}>Academic</strong>
              {week.vitals.academic.gpa_unweighted && (
                <VitalRow>
                  <VitalLabel>GPA (UW/W)</VitalLabel>
                  <VitalValue>
                    {week.vitals.academic.gpa_unweighted?.toFixed(2)} / {week.vitals.academic.gpa_weighted?.toFixed(2)}
                  </VitalValue>
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
          </VitalCard>
        ))}
      </VitalsGrid>
    </Container>
  );
}
