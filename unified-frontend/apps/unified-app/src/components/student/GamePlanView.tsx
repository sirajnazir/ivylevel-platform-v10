import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Calendar, Target, CheckCircle, Clock, AlertCircle, TrendingUp } from 'lucide-react';

const Container = styled.div`
  padding: 24px;
  max-width: 1200px;
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

const ProgressSection = styled.div`
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
`;

const ProgressGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-top: 20px;
`;

const ProgressItem = styled.div`
  text-align: center;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
`;

const ProgressValue = styled.div`
  font-size: 32px;
  font-weight: bold;
  color: ${props => props.color || '#FF5733'};
  margin-bottom: 4px;
`;

const ProgressLabel = styled.div`
  font-size: 14px;
  color: #666;
`;

const TaskSection = styled.div`
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
`;

const SectionTitle = styled.h3`
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const TaskList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const TaskItem = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid ${props => props.priority === 'high' ? '#FF5733' : '#28a745'};
  transition: all 0.2s ease;
  
  &:hover {
    background: #e9ecef;
    transform: translateX(4px);
  }
`;

const TaskIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${props => props.completed ? '#28a745' : '#e9ecef'};
  color: ${props => props.completed ? 'white' : '#666'};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const TaskContent = styled.div`
  flex: 1;
`;

const TaskTitle = styled.h4`
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
`;

const TaskDeadline = styled.div`
  font-size: 14px;
  color: #666;
  display: flex;
  align-items: center;
  gap: 4px;
`;

const ChatSection = styled.div`
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
`;

const ChatMessage = styled.div`
  margin-bottom: 16px;
  padding: 12px;
  background: ${props => props.sender === 'Jenny' ? '#FFE5DF' : '#f8f9fa'};
  border-radius: 8px;
`;

const ChatSender = styled.strong`
  color: ${props => props.sender === 'Jenny' ? '#FF5733' : '#333'};
  display: block;
  margin-bottom: 4px;
`;

const mockGamePlanData = {
  current_phase: 'preparation',
  progress: {
    overall: 65,
    academic: 80,
    extracurricular: 70,
    essays: 45,
    recommendations: 60
  },
  tasks: [
    {
      id: 1,
      title: 'Complete SAT Prep Course Module 3',
      deadline: 'March 15, 2025',
      priority: 'high',
      completed: false,
      category: 'academic'
    },
    {
      id: 2,
      title: 'Submit Congressional App Challenge Proposal',
      deadline: 'March 20, 2025',
      priority: 'high',
      completed: false,
      category: 'awards'
    },
    {
      id: 3,
      title: 'Finish Folklift Video Series Episode 2',
      deadline: 'March 25, 2025',
      priority: 'medium',
      completed: false,
      category: 'passion'
    }
  ],
  chatHistory: [
    { sender: 'Awards Agent', text: 'Proposing Congressional App Challenge and NCWIT Award to address Huda\'s awards gap.' },
    { sender: 'Academic Agent', text: 'Adding SAT prep for a 1550+ score by October—critical for Ivy readiness.' },
    { sender: 'Passion Project Agent', text: 'Suggesting Folklift video series completion by December to showcase creativity.' },
    { sender: 'Jenny', text: 'Looks good! Huda, this plan balances your goals—let\'s tweak for your school\'s club politics too.' }
  ]
};

export const GamePlanView: React.FC = () => {
  const [gamePlanData, setGamePlanData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading
    setTimeout(() => {
      setGamePlanData(mockGamePlanData);
      setLoading(false);
    }, 1000);
  }, []);

  if (loading) {
    return (
      <Container>
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <div style={{ fontSize: '18px', color: '#666' }}>Loading your game plan...</div>
        </div>
      </Container>
    );
  }

  if (!gamePlanData) {
    return (
      <Container>
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <div style={{ fontSize: '18px', color: '#666' }}>No game plan data available</div>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>Your Game Plan</Title>
        <Subtitle>Your personalized roadmap to Ivy+ readiness</Subtitle>
      </Header>

      <ProgressSection>
        <SectionTitle>
          <TrendingUp size={24} />
          Overall Progress
        </SectionTitle>
        <ProgressGrid>
          <ProgressItem>
            <ProgressValue color="#FF5733">{gamePlanData.progress.overall}%</ProgressValue>
            <ProgressLabel>Overall</ProgressLabel>
          </ProgressItem>
          <ProgressItem>
            <ProgressValue color="#28a745">{gamePlanData.progress.academic}%</ProgressValue>
            <ProgressLabel>Academic</ProgressLabel>
          </ProgressItem>
          <ProgressItem>
            <ProgressValue color="#007bff">{gamePlanData.progress.extracurricular}%</ProgressValue>
            <ProgressLabel>Extracurricular</ProgressLabel>
          </ProgressItem>
          <ProgressItem>
            <ProgressValue color="#ffc107">{gamePlanData.progress.essays}%</ProgressValue>
            <ProgressLabel>Essays</ProgressLabel>
          </ProgressItem>
        </ProgressGrid>
      </ProgressSection>

      <TaskSection>
        <SectionTitle>
          <Target size={24} />
          Current Tasks
        </SectionTitle>
        <TaskList>
          {gamePlanData.tasks.map((task: any) => (
            <TaskItem key={task.id} priority={task.priority}>
              <TaskIcon completed={task.completed}>
                {task.completed ? <CheckCircle size={20} /> : <Clock size={20} />}
              </TaskIcon>
              <TaskContent>
                <TaskTitle>{task.title}</TaskTitle>
                <TaskDeadline>
                  <Calendar size={14} />
                  {task.deadline}
                </TaskDeadline>
              </TaskContent>
            </TaskItem>
          ))}
        </TaskList>
      </TaskSection>

      <ChatSection>
        <SectionTitle>
          <AlertCircle size={24} />
          Planning Insights
        </SectionTitle>
        {gamePlanData.chatHistory.map((msg: any, idx: number) => (
          <ChatMessage key={idx} sender={msg.sender}>
            <ChatSender sender={msg.sender}>{msg.sender}:</ChatSender>
            {msg.text}
          </ChatMessage>
        ))}
      </ChatSection>
    </Container>
  );
};