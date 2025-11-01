import React, { useState } from 'react';
import styled from 'styled-components';
import {
  WeeklyActionPlan,
  Outcome,
  ExecutionItem,
  TaskItem,
  v10Api
} from '../../utils/v10ApiService';

// ============================================================================
// STYLED COMPONENTS (matching WeeklyVitals.tsx)
// ============================================================================

const ActionPlanCard = styled.div`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.3);
  margin-top: 16px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  animation: slideDown 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
    animation: shimmer 3s infinite;
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes shimmer {
    0% {
      transform: translate(-50%, -50%) rotate(0deg);
    }
    100% {
      transform: translate(-50%, -50%) rotate(360deg);
    }
  }
`;

const CardHeader = styled.div`
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 2px solid rgba(255, 255, 255, 0.2);
  position: relative;
  z-index: 1;
`;

const CardTitle = styled.h3`
  font-size: 18px;
  margin: 0 0 8px 0;
  color: white;
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;

const WeekInfo = styled.div`
  font-size: 13px;
  color: rgba(255, 255, 255, 0.9);
`;

const ProgressBar = styled.div`
  height: 8px;
  background: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
  margin: 16px 0;
`;

const ProgressFill = styled.div<{ $progress: number }>`
  height: 100%;
  width: ${props => props.$progress}%;
  background: linear-gradient(90deg, #FF5733 0%, #FFC300 100%);
  transition: width 0.3s ease;
`;

const StatsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin: 16px 0;
`;

const StatBox = styled.div`
  background: #f8f9fa;
  padding: 12px;
  border-radius: 6px;
  text-align: center;
`;

const StatLabel = styled.div`
  font-size: 11px;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
`;

const StatValue = styled.div`
  font-size: 20px;
  font-weight: 600;
  color: #333;
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
  display: ${props => props.$isExpanded ? 'block' : 'none'};
  padding-top: ${props => props.$isExpanded ? '12px' : '0'};
  animation: ${props => props.$isExpanded ? 'fadeIn 0.3s ease-in' : 'none'};

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const OutcomeItem = styled.div`
  background: #f0f8ff;
  padding: 12px;
  border-radius: 6px;
  margin: 8px 0;
  border-left: 3px solid #007bff;
`;

const OutcomeHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
`;

const OutcomeTitle = styled.div`
  font-weight: 600;
  color: #333;
  font-size: 14px;
  flex: 1;
`;

const PriorityBadge = styled.span<{ $priority: string }>`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
  background: ${props => {
    switch (props.$priority) {
      case 'P0': return '#dc3545';
      case 'P1': return '#ffc107';
      case 'P2': return '#17a2b8';
      case 'P3': return '#6c757d';
      default: return '#6c757d';
    }
  }};
  color: white;
`;

const OutcomeDescription = styled.div`
  font-size: 12px;
  color: #666;
  margin: 4px 0;
  font-style: italic;
`;

const OutcomeProgress = styled.div`
  margin-top: 8px;
`;

const OutcomeProgressBar = styled.div`
  height: 6px;
  background: #e9ecef;
  border-radius: 3px;
  overflow: hidden;
  margin-top: 4px;
`;

const OutcomeProgressFill = styled.div<{ $progress: number; $state: string }>`
  height: 100%;
  width: ${props => props.$progress}%;
  background: ${props => {
    switch (props.$state) {
      case 'completed': return '#28a745';
      case 'in_progress': return '#007bff';
      case 'blocked': return '#dc3545';
      default: return '#6c757d';
    }
  }};
  transition: width 0.3s ease;
`;

const DomainBadge = styled.span<{ $domain: string }>`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 500;
  margin-right: 6px;
  background: ${props => {
    switch (props.$domain) {
      case 'academic': return '#6f42c1';
      case 'test_preparation': return '#fd7e14';
      case 'extracurricular': return '#20c997';
      case 'application': return '#e83e8c';
      case 'creative_project': return '#17a2b8';
      default: return '#6c757d';
    }
  }};
  color: white;
`;

const ExecutionItemWrapper = styled.div`
  background: #fff8e1;
  padding: 10px;
  border-radius: 6px;
  margin: 6px 0 6px 20px;
  border-left: 3px solid #ffc107;
`;

const ExecutionItemTitle = styled.div`
  font-weight: 600;
  font-size: 13px;
  color: #333;
  margin-bottom: 6px;
`;

const FiveWs = styled.div`
  font-size: 11px;
  color: #666;
  margin: 4px 0;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 4px 8px;
`;

const WLabel = styled.span`
  font-weight: 600;
  color: #333;
`;

const TaskItemWrapper = styled.div`
  background: #f0fff4;
  padding: 8px;
  border-radius: 4px;
  margin: 4px 0 4px 40px;
  border-left: 2px solid #28a745;
  font-size: 12px;
`;

const TaskHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const TaskTitle = styled.span`
  font-weight: 600;
  color: #333;
`;

const CompletionBadge = styled.span<{ $state: string }>`
  display: inline-block;
  padding: 2px 6px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 500;
  background: ${props => {
    switch (props.$state) {
      case 'completed': return '#28a745';
      case 'in_progress': return '#007bff';
      case 'not_started': return '#6c757d';
      case 'blocked': return '#dc3545';
      default: return '#6c757d';
    }
  }};
  color: white;
`;

const TimeAllocationGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin: 12px 0;
`;

const TimeBlock = styled.div`
  background: #f8f9fa;
  padding: 10px;
  border-radius: 6px;
`;

const TimeLabel = styled.div`
  font-size: 11px;
  color: #666;
  text-transform: uppercase;
  margin-bottom: 4px;
`;

const TimeValue = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: #333;
`;

const EmptyState = styled.div`
  padding: 24px;
  text-align: center;
  color: #999;
  font-size: 13px;
  font-style: italic;
  background: #f8f9fa;
  border-radius: 6px;
`;

const LinkIndicator = styled.div`
  font-size: 12px;
  color: #FF5733;
  margin-top: 8px;
  padding: 8px;
  background: #fff5f5;
  border-radius: 4px;
  border-left: 3px solid #FF5733;
`;

// ============================================================================
// COMPONENT
// ============================================================================

interface WeeklyActionPlanCardProps {
  studentId: string;
  weekNumber: number;
  weekStart: string;
  weekEnd: string;
  actionPlan?: WeeklyActionPlan | null;
  onRefresh?: () => void;
}

export function WeeklyActionPlanCard({
  studentId,
  weekNumber,
  weekStart,
  weekEnd,
  actionPlan,
  onRefresh
}: WeeklyActionPlanCardProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    execution: false, // Start collapsed
    outcomes: false,
    time: false,
    frameworks: false
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const isSectionExpanded = (section: string) => {
    return expandedSections[section] ?? false;
  };

  // Helper to get execution items for an outcome
  const getExecutionItemsForOutcome = (outcomeId: string): ExecutionItem[] => {
    if (!actionPlan) return [];
    return actionPlan.execution_items.filter(
      item => item.parent_outcome_id === outcomeId
    );
  };

  // Helper to get tasks for an execution item
  const getTasksForExecutionItem = (executionItemId: string): TaskItem[] => {
    if (!actionPlan) return [];
    return actionPlan.tasks.filter(
      task => task.parent_execution_item_id === executionItemId
    );
  };

  // Render empty state if no action plan
  if (!actionPlan) {
    return (
      <ActionPlanCard>
        <CardHeader>
          <CardTitle>
            📋 Weekly Action Plan - Week {weekNumber}
          </CardTitle>
          <WeekInfo>
            {new Date(weekStart).toLocaleDateString()} - {new Date(weekEnd).toLocaleDateString()}
          </WeekInfo>
        </CardHeader>
        <EmptyState>
          No action plan for this week yet.
        </EmptyState>
        <LinkIndicator>
          ↑ Linked to Weekly Progress Card above
        </LinkIndicator>
      </ActionPlanCard>
    );
  }

  const { progress_tracking, resource_allocation } = actionPlan;
  const completion = progress_tracking.completion_metrics;

  return (
    <ActionPlanCard>
      <CardHeader>
        <CardTitle>
          📋 Weekly Action Plan - Week {weekNumber}
        </CardTitle>
        <WeekInfo>
          {new Date(weekStart).toLocaleDateString()} - {new Date(weekEnd).toLocaleDateString()}
        </WeekInfo>
        <div style={{ marginTop: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
            <span>Overall Completion</span>
            <span style={{ fontWeight: 600 }}>{completion.overall_completion_percentage.toFixed(0)}%</span>
          </div>
          <ProgressBar>
            <ProgressFill $progress={completion.overall_completion_percentage} />
          </ProgressBar>
        </div>
      </CardHeader>

      {/* Stats Summary */}
      <StatsRow>
        <StatBox>
          <StatLabel>Outcomes</StatLabel>
          <StatValue>
            {completion.completed_outcomes}/{completion.total_outcomes}
          </StatValue>
        </StatBox>
        <StatBox>
          <StatLabel>Actions</StatLabel>
          <StatValue>
            {completion.completed_execution_items}/{completion.total_execution_items}
          </StatValue>
        </StatBox>
        <StatBox>
          <StatLabel>Tasks</StatLabel>
          <StatValue>
            {completion.completed_tasks}/{completion.total_tasks}
          </StatValue>
        </StatBox>
      </StatsRow>

      {/* Outcomes Section */}
      {actionPlan.outcomes.length > 0 && (
        <CollapsibleSection>
          <SectionHeader
            onClick={() => toggleSection('outcomes')}
            $isExpanded={isSectionExpanded('outcomes')}
          >
            <SectionTitle>
              <ExpandIcon $isExpanded={isSectionExpanded('outcomes')}>▶</ExpandIcon>
              Outcomes ({actionPlan.outcomes.length})
            </SectionTitle>
          </SectionHeader>
          <SectionContent $isExpanded={isSectionExpanded('outcomes')}>
            {actionPlan.outcomes.map(outcome => (
              <OutcomeItem key={outcome.outcome_id}>
                <OutcomeHeader>
                  <OutcomeTitle>{outcome.title}</OutcomeTitle>
                  <PriorityBadge $priority={outcome.priority_level}>
                    {outcome.priority_level}
                  </PriorityBadge>
                </OutcomeHeader>

                <div style={{ marginBottom: '8px' }}>
                  <DomainBadge $domain={outcome.outcome_domain}>
                    {outcome.outcome_domain.replace(/_/g, ' ')}
                  </DomainBadge>
                  <CompletionBadge $state={outcome.completion_state}>
                    {outcome.completion_state.replace(/_/g, ' ')}
                  </CompletionBadge>
                </div>

                {outcome.description && (
                  <OutcomeDescription>{outcome.description}</OutcomeDescription>
                )}

                <OutcomeProgress>
                  <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>
                    Progress: {outcome.completion_percentage}%
                  </div>
                  <OutcomeProgressBar>
                    <OutcomeProgressFill
                      $progress={outcome.completion_percentage}
                      $state={outcome.completion_state}
                    />
                  </OutcomeProgressBar>
                </OutcomeProgress>

                {/* Execution Items under this outcome */}
                {getExecutionItemsForOutcome(outcome.outcome_id).map(execItem => (
                  <ExecutionItemWrapper key={execItem.execution_item_id}>
                    <ExecutionItemTitle>
                      {execItem.title}
                      <PriorityBadge $priority={execItem.priority_level} style={{ marginLeft: '8px' }}>
                        {execItem.priority_level}
                      </PriorityBadge>
                      <CompletionBadge $state={execItem.completion_state} style={{ marginLeft: '8px' }}>
                        {execItem.completion_state.replace(/_/g, ' ')}
                      </CompletionBadge>
                    </ExecutionItemTitle>

                    <FiveWs>
                      <WLabel>Why:</WLabel> <span>{execItem.why}</span>
                      <WLabel>What:</WLabel> <span>{execItem.what}</span>
                      <WLabel>When:</WLabel> <span>{execItem.when}</span>
                    </FiveWs>

                    {/* Tasks under this execution item */}
                    {getTasksForExecutionItem(execItem.execution_item_id).map(task => (
                      <TaskItemWrapper key={task.task_id}>
                        <TaskHeader>
                          <TaskTitle>{task.task_title}</TaskTitle>
                          <CompletionBadge $state={task.completion_state}>
                            {task.completion_state.replace(/_/g, ' ')}
                          </CompletionBadge>
                        </TaskHeader>
                        {task.deadline && (
                          <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                            Due: {new Date(task.deadline).toLocaleDateString()}
                          </div>
                        )}
                      </TaskItemWrapper>
                    ))}
                  </ExecutionItemWrapper>
                ))}
              </OutcomeItem>
            ))}
          </SectionContent>
        </CollapsibleSection>
      )}

      {/* Execution Items Section (standalone items without outcomes) */}
      {actionPlan.outcomes.length === 0 && actionPlan.execution_items.length > 0 && (
        <CollapsibleSection>
          <SectionHeader
            onClick={() => toggleSection('execution')}
            $isExpanded={isSectionExpanded('execution')}
          >
            <SectionTitle>
              <ExpandIcon $isExpanded={isSectionExpanded('execution')}>▶</ExpandIcon>
              Execution Items ({actionPlan.execution_items.length})
            </SectionTitle>
          </SectionHeader>
          <SectionContent $isExpanded={isSectionExpanded('execution')}>
            {actionPlan.execution_items.map(execItem => (
              <ExecutionItemWrapper key={execItem.execution_item_id}>
                <ExecutionItemTitle>
                  {execItem.title}
                  <PriorityBadge $priority={execItem.priority_level} style={{ marginLeft: '8px' }}>
                    {execItem.priority_level}
                  </PriorityBadge>
                  <CompletionBadge $state={execItem.completion_state} style={{ marginLeft: '8px' }}>
                    {execItem.completion_state.replace(/_/g, ' ')}
                  </CompletionBadge>
                </ExecutionItemTitle>

                <FiveWs>
                  <WLabel>Why:</WLabel> <span>{execItem.why}</span>
                  <WLabel>What:</WLabel> <span>{execItem.what}</span>
                  <WLabel>When:</WLabel> <span>{execItem.when}</span>
                </FiveWs>

                {/* Tasks under this execution item */}
                {getTasksForExecutionItem(execItem.execution_item_id).map(task => (
                  <TaskItemWrapper key={task.task_id}>
                    <TaskHeader>
                      <TaskTitle>{task.task_title}</TaskTitle>
                      <CompletionBadge $state={task.completion_state}>
                        {task.completion_state.replace(/_/g, ' ')}
                      </CompletionBadge>
                    </TaskHeader>
                    {task.deadline && (
                      <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                        Due: {new Date(task.deadline).toLocaleDateString()}
                      </div>
                    )}
                  </TaskItemWrapper>
                ))}
              </ExecutionItemWrapper>
            ))}
          </SectionContent>
        </CollapsibleSection>
      )}

      {/* Time Allocation Section */}
      {resource_allocation?.time_allocation && (
        <CollapsibleSection>
          <SectionHeader
            onClick={() => toggleSection('time')}
            $isExpanded={isSectionExpanded('time')}
          >
            <SectionTitle>
              <ExpandIcon $isExpanded={isSectionExpanded('time')}>▶</ExpandIcon>
              Time Allocation (168-Hour Framework)
            </SectionTitle>
          </SectionHeader>
          <SectionContent $isExpanded={isSectionExpanded('time')}>
            <TimeAllocationGrid>
              <TimeBlock>
                <TimeLabel>Total Hours</TimeLabel>
                <TimeValue>{resource_allocation.time_allocation.total_hours_in_period}h</TimeValue>
              </TimeBlock>
              <TimeBlock>
                <TimeLabel>Fixed Commitments</TimeLabel>
                <TimeValue>{resource_allocation.time_allocation.total_fixed_hours}h</TimeValue>
              </TimeBlock>
              <TimeBlock>
                <TimeLabel>Available Hours</TimeLabel>
                <TimeValue>{resource_allocation.time_allocation.available_hours}h</TimeValue>
              </TimeBlock>
              <TimeBlock>
                <TimeLabel>Utilization</TimeLabel>
                <TimeValue>
                  {((resource_allocation.time_allocation.total_fixed_hours /
                     resource_allocation.time_allocation.total_hours_in_period) * 100).toFixed(0)}%
                </TimeValue>
              </TimeBlock>
            </TimeAllocationGrid>

            {resource_allocation.time_allocation.fixed_commitments.length > 0 && (
              <div style={{ marginTop: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: '#666' }}>
                  Fixed Commitments:
                </div>
                {resource_allocation.time_allocation.fixed_commitments.map((commitment, idx) => (
                  <div key={idx} style={{
                    fontSize: '11px',
                    padding: '4px 8px',
                    background: '#f8f9fa',
                    borderRadius: '4px',
                    marginBottom: '4px',
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}>
                    <span style={{ textTransform: 'capitalize' }}>{commitment.block_type}</span>
                    <span style={{ fontWeight: 600 }}>{commitment.hours_per_week}h/week</span>
                  </div>
                ))}
              </div>
            )}
          </SectionContent>
        </CollapsibleSection>
      )}

      {/* Framework Applications Section */}
      {actionPlan.framework_applications && actionPlan.framework_applications.length > 0 && (
        <CollapsibleSection>
          <SectionHeader
            onClick={() => toggleSection('frameworks')}
            $isExpanded={isSectionExpanded('frameworks')}
          >
            <SectionTitle>
              <ExpandIcon $isExpanded={isSectionExpanded('frameworks')}>▶</ExpandIcon>
              Frameworks Applied ({actionPlan.framework_applications.length})
            </SectionTitle>
          </SectionHeader>
          <SectionContent $isExpanded={isSectionExpanded('frameworks')}>
            {actionPlan.framework_applications.map((framework: any, idx: number) => (
              <div key={idx} style={{
                fontSize: '12px',
                padding: '6px 10px',
                background: '#e7f3ff',
                borderRadius: '4px',
                marginBottom: '6px',
                borderLeft: '3px solid #007bff'
              }}>
                <div style={{ fontWeight: 600, color: '#333' }}>{framework.framework_name}</div>
                {framework.application_context && (
                  <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                    {framework.application_context}
                  </div>
                )}
              </div>
            ))}
          </SectionContent>
        </CollapsibleSection>
      )}

      {/* Link Indicator */}
      <LinkIndicator>
        ↑ Linked to Weekly Progress Card above - Outcomes align with Focus Areas
      </LinkIndicator>
    </ActionPlanCard>
  );
}
