import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { v10Api, Project } from '../../utils/v10ApiService';

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

const ProjectGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
`;

const ProjectCard = styled.div`
  background: white;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
`;

const ProjectHeader = styled.div`
  margin-bottom: 16px;
`;

const ProjectTitle = styled.h3`
  font-size: 20px;
  margin: 0 0 8px 0;
  color: #333;
`;

const ProjectStatus = styled.span<{ $status?: string }>`
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  background: ${props => {
    switch (props.$status) {
      case 'completed': return '#28a745';
      case 'active': return '#FF5733';
      case 'planning': return '#ffc107';
      default: return '#6c757d';
    }
  }};
  color: white;
  text-transform: capitalize;
`;

const ProjectDescription = styled.p`
  margin: 12px 0;
  color: #666;
  font-size: 14px;
  line-height: 1.6;
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
  background: #FF5733;
  transition: width 0.3s ease;
`;

const ProjectMeta = styled.div`
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: #666;
  margin-top: 12px;
`;

const Metrics = styled.div`
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e9ecef;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  font-size: 13px;
`;

const MetricItem = styled.div`
  strong {
    display: block;
    color: #333;
    margin-bottom: 4px;
  }
  span {
    color: #666;
  }
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 40px;
  color: #666;
`;

interface ProjectsViewProps {
  studentId: string;
}

export function ProjectsView({ studentId }: ProjectsViewProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, [studentId]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await v10Api.getProjects(studentId);
      setProjects(data.projects);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingState>Loading projects...</LoadingState>;
  }

  return (
    <Container>
      <Title>Projects & Impact Work</Title>
      <ProjectGrid>
        {projects.map(project => (
          <ProjectCard key={project.id}>
            <ProjectHeader>
              <ProjectTitle>{project.title}</ProjectTitle>
              <ProjectStatus $status={project.status}>{project.status}</ProjectStatus>
            </ProjectHeader>
            {project.description && <ProjectDescription>{project.description}</ProjectDescription>}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                <span>Progress</span>
                <span style={{ fontWeight: 600 }}>{project.progress}%</span>
              </div>
              <ProgressBar>
                <ProgressFill $progress={project.progress} />
              </ProgressBar>
            </div>
            <ProjectMeta>
              {project.category && <span>Category: {project.category}</span>}
              {project.used_in_applications && <span>✓ Used in Apps</span>}
            </ProjectMeta>
            {project.metrics && Object.keys(project.metrics).length > 0 && (
              <Metrics>
                {Object.entries(project.metrics).slice(0, 4).map(([key, value]) => (
                  <MetricItem key={key}>
                    <strong>{key.replace(/_/g, ' ')}</strong>
                    <span>{value}</span>
                  </MetricItem>
                ))}
              </Metrics>
            )}
          </ProjectCard>
        ))}
      </ProjectGrid>
    </Container>
  );
}
