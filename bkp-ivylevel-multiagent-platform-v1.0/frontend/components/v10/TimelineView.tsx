import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { v10Api, TimelineEvent } from '../../utils/v10ApiService';

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

const Timeline = styled.div`
  position: relative;
  padding-left: 40px;

  &::before {
    content: '';
    position: absolute;
    left: 20px;
    top: 0;
    bottom: 0;
    width: 2px;
    background: #e9ecef;
  }
`;

const EventCard = styled.div<{ $icon?: string; $color?: string }>`
  position: relative;
  margin-bottom: 24px;
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  margin-left: 20px;

  &::before {
    content: '${props => props.$icon || '📌'}';
    position: absolute;
    left: -50px;
    top: 20px;
    width: 32px;
    height: 32px;
    background: white;
    border: 3px solid ${props => props.$color || '#FF5733'};
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
  }
`;

const EventHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 8px;
`;

const EventTitle = styled.h3`
  font-size: 18px;
  margin: 0;
  color: #333;
`;

const EventDate = styled.span`
  font-size: 14px;
  color: #666;
`;

const EventDescription = styled.p`
  margin: 8px 0 0 0;
  color: #666;
  font-size: 14px;
  line-height: 1.6;
`;

const EventBadge = styled.span`
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  background: #f8f9fa;
  color: #666;
  margin-top: 8px;
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 40px;
  color: #666;
`;

interface TimelineViewProps {
  studentId: string;
}

export function TimelineView({ studentId }: TimelineViewProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTimeline();
  }, [studentId]);

  const loadTimeline = async () => {
    try {
      setLoading(true);
      const data = await v10Api.getTimeline(studentId, { limit: 50 });
      setEvents(data.events);
    } catch (error) {
      console.error('Failed to load timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingState>Loading timeline...</LoadingState>;
  }

  return (
    <Container>
      <Title>Your Journey Timeline</Title>
      <Timeline>
        {events.map(event => (
          <EventCard key={event.id} $icon={event.icon} $color={event.color}>
            <EventHeader>
              <EventTitle>{event.title}</EventTitle>
              <EventDate>{new Date(event.event_date).toLocaleDateString()}</EventDate>
            </EventHeader>
            {event.description && <EventDescription>{event.description}</EventDescription>}
            <EventBadge>{event.event_type.replace('_', ' ')}</EventBadge>
          </EventCard>
        ))}
      </Timeline>
    </Container>
  );
}
