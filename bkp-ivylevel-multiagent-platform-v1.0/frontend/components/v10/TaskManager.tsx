import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { v10Api, Task } from '../../utils/v10ApiService';

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

const TaskList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const TaskCard = styled.div<{ $overdue?: boolean; $completed?: boolean }>`
  background: white;
  padding: 20px;
  border-radius: 8px;
  border-left: 4px solid ${props => props.$overdue ? '#dc3545' : props.$completed ? '#28a745' : '#FF5733'};
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;

const TaskHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 8px;
`;

const TaskTitle = styled.h3<{ $completed?: boolean }>`
  font-size: 18px;
  margin: 0;
  text-decoration: ${props => props.$completed ? 'line-through' : 'none'};
  color: ${props => props.$completed ? '#666' : '#333'};
`;

const Badge = styled.span<{ $variant?: string }>`
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  background: ${props => {
    switch (props.$variant) {
      case 'critical': return '#dc3545';
      case 'high': return '#ffc107';
      case 'medium': return '#17a2b8';
      default: return '#6c757d';
    }
  }};
  color: white;
`;

const TaskDescription = styled.p`
  margin: 8px 0;
  color: #666;
  font-size: 14px;
`;

const TaskFooter = styled.div`
  display: flex;
  gap: 16px;
  margin-top: 12px;
  font-size: 13px;
  color: #666;
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  padding: 6px 16px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-size: 14px;
  background: ${props => props.$variant === 'primary' ? '#FF5733' : '#e9ecef'};
  color: ${props => props.$variant === 'primary' ? 'white' : '#333'};

  &:hover {
    opacity: 0.9;
  }
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 40px;
  color: #666;
`;

const FilterBar = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
`;

const FilterButton = styled.button<{ $active?: boolean }>`
  padding: 8px 16px;
  border-radius: 6px;
  border: 1px solid ${props => props.$active ? '#FF5733' : '#e9ecef'};
  background: ${props => props.$active ? '#FF5733' : 'white'};
  color: ${props => props.$active ? 'white' : '#666'};
  cursor: pointer;
  font-size: 14px;

  &:hover {
    border-color: #FF5733;
  }
`;

interface TaskManagerProps {
  studentId: string;
}

export function TaskManager({ studentId }: TaskManagerProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  useEffect(() => {
    loadTasks();
  }, [studentId, filter]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const params = filter === 'completed' ? { status: 'completed' } :
                     filter === 'active' ? { overdue_only: false } : {};
      const data = await v10Api.getTasks(studentId, params);
      setTasks(data.tasks);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleComplete = async (task: Task) => {
    try {
      const newStatus = task.status === 'completed' ? 'not_started' : 'completed';
      await v10Api.updateTask(studentId, task.id, { status: newStatus });
      loadTasks();
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  if (loading) {
    return <LoadingState>Loading tasks...</LoadingState>;
  }

  const activeTasks = tasks.filter(t => t.status !== 'completed');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  return (
    <Container>
      <Header>
        <Title>Tasks & Action Items</Title>
      </Header>

      <FilterBar>
        <FilterButton $active={filter === 'all'} onClick={() => setFilter('all')}>
          All ({tasks.length})
        </FilterButton>
        <FilterButton $active={filter === 'active'} onClick={() => setFilter('active')}>
          Active ({activeTasks.length})
        </FilterButton>
        <FilterButton $active={filter === 'completed'} onClick={() => setFilter('completed')}>
          Completed ({completedTasks.length})
        </FilterButton>
      </FilterBar>

      <TaskList>
        {tasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            No tasks found
          </div>
        ) : (
          tasks.map(task => (
            <TaskCard key={task.id} $overdue={task.is_overdue} $completed={task.status === 'completed'}>
              <TaskHeader>
                <TaskTitle $completed={task.status === 'completed'}>{task.title}</TaskTitle>
                <Badge $variant={task.priority}>{task.priority}</Badge>
              </TaskHeader>
              {task.description && <TaskDescription>{task.description}</TaskDescription>}
              <TaskFooter>
                {task.due_date && (
                  <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
                )}
                {task.category && <span>Category: {task.category}</span>}
                <Button
                  $variant={task.status === 'completed' ? 'secondary' : 'primary'}
                  onClick={() => handleToggleComplete(task)}
                >
                  {task.status === 'completed' ? 'Mark Incomplete' : 'Mark Complete'}
                </Button>
              </TaskFooter>
            </TaskCard>
          ))
        )}
      </TaskList>
    </Container>
  );
}
