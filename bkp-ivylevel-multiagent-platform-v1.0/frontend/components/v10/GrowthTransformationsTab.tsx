/**
 * Growth Transformations Tab - v13.1
 * Unified timeline showing college prep journey with:
 * - Applications (submissions + decisions)
 * - Growth events (HGTI breakthroughs)
 * - Phase transitions (Foundation → Build → Application → Decision)
 * - Academic milestones (SAT, GPA)
 * - Awards, programs, projects
 */

import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { v10Api, GrowthTransformationEvent, TimelineStats } from '../../utils/v10ApiService';

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

const Container = styled.div`
  padding: 32px;
  max-width: 1400px;
  margin: 0 auto;
  background: #f8f9fa;
  min-height: 100vh;
`;

const Header = styled.div`
  margin-bottom: 32px;
`;

const Title = styled.h1`
  font-size: 32px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 8px 0;
`;

const Subtitle = styled.p`
  font-size: 16px;
  color: #666;
  margin: 0;
`;

const StatsBar = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 32px;
  flex-wrap: wrap;
`;

const StatCard = styled.div`
  background: white;
  padding: 16px 24px;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
  flex: 1;
  min-width: 200px;
`;

const StatLabel = styled.div`
  font-size: 12px;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
`;

const StatValue = styled.div`
  font-size: 28px;
  font-weight: 700;
  color: #1a1a1a;
`;

const Timeline = styled.div`
  position: relative;
  padding-left: 60px;

  &::before {
    content: '';
    position: absolute;
    left: 30px;
    top: 0;
    bottom: 0;
    width: 3px;
    background: linear-gradient(180deg, #e9ecef 0%, #dee2e6 100%);
  }
`;

const YearGroup = styled.div`
  margin-bottom: 48px;
`;

const YearLabel = styled.div`
  font-size: 20px;
  font-weight: 700;
  color: #495057;
  margin-bottom: 24px;
  padding-left: 20px;
`;

interface EventCardStyledProps {
  $eventType: string;
  $impact?: string;
}

const EventCard = styled.div<EventCardStyledProps>`
  position: relative;
  margin-bottom: 24px;
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  margin-left: 20px;
  border-left: 4px solid ${props => getEventColor(props.$eventType, props.$impact)};
  transition: all 0.2s ease;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
    transform: translateX(4px);
  }

  &::before {
    content: '${props => getEventIcon(props.$eventType)}';
    position: absolute;
    left: -60px;
    top: 24px;
    width: 40px;
    height: 40px;
    background: ${props => getEventColor(props.$eventType, props.$impact)};
    border: 4px solid white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }
`;

const EventHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 12px;
  gap: 16px;
`;

const EventTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  color: #1a1a1a;
  flex: 1;
`;

const EventDate = styled.span`
  font-size: 14px;
  color: #666;
  white-space: nowrap;
  font-weight: 500;
`;

const EventDescription = styled.p`
  margin: 8px 0 0 0;
  color: #495057;
  font-size: 15px;
  line-height: 1.6;
`;

const EventMeta = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 12px;
  flex-wrap: wrap;
`;

const Badge = styled.span<{ $variant?: string }>`
  display: inline-block;
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 600;
  background: ${props => getBadgeColor(props.$variant)};
  color: ${props => getBadgeTextColor(props.$variant)};
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 80px 20px;
  color: #666;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 80px 20px;
  color: #666;

  h3 {
    font-size: 20px;
    margin-bottom: 8px;
    color: #495057;
  }

  p {
    font-size: 15px;
    color: #6c757d;
  }
`;

const ErrorState = styled.div`
  text-align: center;
  padding: 80px 20px;
  color: #dc3545;

  h3 {
    font-size: 20px;
    margin-bottom: 8px;
  }

  p {
    font-size: 15px;
    color: #6c757d;
    margin-bottom: 16px;
  }

  button {
    padding: 10px 20px;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;

    &:hover {
      background: #0056b3;
    }
  }
`;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getEventColor(eventType: string, impact?: string): string {
  if (eventType === 'application') {
    // Application decisions: Green for accepted, Red for rejected, Yellow for waitlisted
    return impact === 'major' ? '#28a745' : impact === 'minor' ? '#dc3545' : '#ffc107';
  }

  const colors: Record<string, string> = {
    growth_event: '#9b59b6',      // Purple
    phase_transition: '#fd7e14',  // Orange
    academic: '#17a2b8',          // Teal
    project: '#6610f2',           // Indigo
    award: '#ffc107',             // Gold
    program: '#e83e8c',           // Pink
  };

  return colors[eventType] || '#6c757d';
}

function getEventIcon(eventType: string): string {
  const icons: Record<string, string> = {
    application: '🎓',
    growth_event: '🌟',
    phase_transition: '🔄',
    academic: '📊',
    project: '🚀',
    award: '🏆',
    program: '🎯',
  };

  return icons[eventType] || '📌';
}

function getBadgeColor(variant?: string): string {
  const colors: Record<string, string> = {
    major: '#d4edda',
    moderate: '#fff3cd',
    minor: '#f8d7da',
    accepted: '#d4edda',
    waitlisted: '#fff3cd',
    rejected: '#f8d7da',
  };

  return colors[variant || ''] || '#e9ecef';
}

function getBadgeTextColor(variant?: string): string {
  const colors: Record<string, string> = {
    major: '#155724',
    moderate: '#856404',
    minor: '#721c24',
    accepted: '#155724',
    waitlisted: '#856404',
    rejected: '#721c24',
  };

  return colors[variant || ''] || '#495057';
}

function formatEventType(eventType: string): string {
  return eventType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function groupEventsByYear(events: GrowthTransformationEvent[]): Map<string, GrowthTransformationEvent[]> {
  const grouped = new Map<string, GrowthTransformationEvent[]>();

  events.forEach(event => {
    const year = new Date(event.event_date).getFullYear().toString();
    if (!grouped.has(year)) {
      grouped.set(year, []);
    }
    grouped.get(year)!.push(event);
  });

  // Sort years in descending order (most recent first)
  return new Map([...grouped.entries()].sort((a, b) => parseInt(b[0]) - parseInt(a[0])));
}

// ============================================================================
// COMPONENT
// ============================================================================

interface GrowthTransformationsTabProps {
  studentId: string;
}

export function GrowthTransformationsTab({ studentId }: GrowthTransformationsTabProps) {
  const [events, setEvents] = useState<GrowthTransformationEvent[]>([]);
  const [stats, setStats] = useState<TimelineStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTimeline();
  }, [studentId]);

  const loadTimeline = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await v10Api.getGrowthTransformations(studentId, {
        limit: 100
      });
      setEvents(response.data.timeline);
      setStats(response.data.stats);
    } catch (err: any) {
      console.error('Failed to load growth transformations:', err);
      setError(err.message || 'Failed to load timeline');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container>
        <LoadingState>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔄</div>
          <div style={{ fontSize: '18px', fontWeight: 600 }}>Loading your journey...</div>
        </LoadingState>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <ErrorState>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
          <h3>Failed to Load Timeline</h3>
          <p>{error}</p>
          <button onClick={loadTimeline}>Try Again</button>
        </ErrorState>
      </Container>
    );
  }

  if (events.length === 0) {
    return (
      <Container>
        <EmptyState>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
          <h3>No Timeline Events Yet</h3>
          <p>Your college prep journey will appear here as you make progress</p>
        </EmptyState>
      </Container>
    );
  }

  const groupedEvents = groupEventsByYear(events);

  return (
    <Container>
      <Header>
        <Title>Growth Transformations</Title>
        <Subtitle>
          Your complete college prep journey - applications, breakthroughs, and milestones
        </Subtitle>
      </Header>

      {stats && (
        <StatsBar>
          <StatCard>
            <StatLabel>Total Events</StatLabel>
            <StatValue>{stats.total_events}</StatValue>
          </StatCard>
          <StatCard>
            <StatLabel>Applications</StatLabel>
            <StatValue>{stats.by_type.application || 0}</StatValue>
          </StatCard>
          <StatCard>
            <StatLabel>Breakthroughs</StatLabel>
            <StatValue>{stats.by_type.growth_event || 0}</StatValue>
          </StatCard>
          <StatCard>
            <StatLabel>Journey Start</StatLabel>
            <StatValue style={{ fontSize: '18px', marginTop: '8px' }}>
              {stats.date_range.earliest ?
                new Date(stats.date_range.earliest).toLocaleDateString('en-US', {
                  month: 'short',
                  year: 'numeric'
                }) :
                'N/A'
              }
            </StatValue>
          </StatCard>
        </StatsBar>
      )}

      <Timeline>
        {Array.from(groupedEvents.entries()).map(([year, yearEvents]) => (
          <YearGroup key={year}>
            <YearLabel>{year}</YearLabel>
            {yearEvents.map(event => (
              <EventCard
                key={event.id}
                $eventType={event.event_type}
                $impact={event.impact}
              >
                <EventHeader>
                  <EventTitle>{event.title}</EventTitle>
                  <EventDate>
                    {new Date(event.event_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </EventDate>
                </EventHeader>

                <EventDescription>{event.description}</EventDescription>

                <EventMeta>
                  <Badge>{formatEventType(event.event_type)}</Badge>
                  {event.subtype && (
                    <Badge>{event.subtype}</Badge>
                  )}
                  {event.impact && (
                    <Badge $variant={event.impact}>{event.impact}</Badge>
                  )}
                  {event.metadata?.decision && (
                    <Badge $variant={event.metadata.decision.toLowerCase()}>
                      {event.metadata.decision}
                    </Badge>
                  )}
                  {event.metadata?.college && (
                    <Badge>{event.metadata.college}</Badge>
                  )}
                </EventMeta>
              </EventCard>
            ))}
          </YearGroup>
        ))}
      </Timeline>
    </Container>
  );
}

export default GrowthTransformationsTab;
