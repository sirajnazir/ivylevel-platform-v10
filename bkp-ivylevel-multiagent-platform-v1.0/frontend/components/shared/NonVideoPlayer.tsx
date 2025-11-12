import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Music, FileText, Loader, AlertCircle } from 'lucide-react';
import API_ENDPOINTS from '../../config/api';

const Container = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #0f0f0f;
  color: white;
  position: relative;
`;

const ContentBox = styled.div`
  max-width: 800px;
  width: 90%;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 40px;
  text-align: center;
`;

const IconWrapper = styled.div`
  margin-bottom: 24px;
  color: #4a9eff;
`;

const Title = styled.h2`
  font-size: 24px;
  margin-bottom: 16px;
  font-weight: 600;
`;

const Description = styled.p`
  font-size: 16px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 32px;
  line-height: 1.6;
`;

const AudioPlayer = styled.audio`
  width: 100%;
  margin: 20px 0;
`;

const TranscriptBox = styled.div`
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 24px;
  margin-top: 24px;
  max-height: 400px;
  overflow-y: auto;
  text-align: left;
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.8;
  white-space: pre-wrap;
  color: rgba(255, 255, 255, 0.9);
`;

const InsightsBox = styled(TranscriptBox)`
  background: rgba(74, 158, 255, 0.1);
  border-color: rgba(74, 158, 255, 0.3);
`;

const TabContainer = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  justify-content: center;
`;

const Tab = styled.button<{ $active: boolean }>`
  padding: 10px 20px;
  background: ${props => props.$active ? 'rgba(74, 158, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)'};
  border: 1px solid ${props => props.$active ? 'rgba(74, 158, 255, 0.4)' : 'rgba(255, 255, 255, 0.1)'};
  border-radius: 6px;
  color: ${props => props.$active ? '#4a9eff' : 'rgba(255, 255, 255, 0.7)'};
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;

  &:hover {
    background: ${props => props.$active ? 'rgba(74, 158, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)'};
  }
`;

const LoadingState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 40px;
  color: rgba(255, 255, 255, 0.7);
`;

const ErrorState = styled(LoadingState)`
  color: #ff4444;
`;

interface NonVideoPlayerProps {
  session: {
    id: string;
    title: string;
    session_type?: string;
    has_audio?: boolean;
    has_transcript?: boolean;
    has_insights?: boolean;
    audio_url?: string;
    session_folder?: string;
  };
}

type TabType = 'audio' | 'transcript' | 'insights';

export const NonVideoPlayer: React.FC<NonVideoPlayerProps> = ({ session }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [auxiliaryFiles, setAuxiliaryFiles] = useState<{ transcript?: string; insights?: string }>({});
  const [activeTab, setActiveTab] = useState<TabType>('audio');

  useEffect(() => {
    // Determine initial active tab based on available content
    if (session.has_audio) {
      setActiveTab('audio');
    } else if (session.has_transcript) {
      setActiveTab('transcript');
    } else if (session.has_insights) {
      setActiveTab('insights');
    }
  }, [session]);

  useEffect(() => {
    const fetchAuxiliaryFiles = async () => {
      if (!session.session_folder || (!session.has_transcript && !session.has_insights)) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem('token');
        const response = await fetch(
          `${API_ENDPOINTS.session.auxiliaryFiles}?session_folder=${encodeURIComponent(session.session_folder)}`,
          {
            headers: {
              'Authorization': token || ''
            }
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch auxiliary files');
        }

        const data = await response.json();
        setAuxiliaryFiles(data);
      } catch (err) {
        console.error('Error fetching auxiliary files:', err);
        setError('Failed to load additional content');
      } finally {
        setLoading(false);
      }
    };

    fetchAuxiliaryFiles();
  }, [session.session_folder, session.has_transcript, session.has_insights]);

  const availableTabs: TabType[] = [];
  if (session.has_audio) availableTabs.push('audio');
  if (session.has_transcript) availableTabs.push('transcript');
  if (session.has_insights) availableTabs.push('insights');

  return (
    <Container>
      <ContentBox>
        <IconWrapper>
          {session.has_audio ? <Music size={64} /> : <FileText size={64} />}
        </IconWrapper>
        
        <Title>{session.title}</Title>
        
        <Description>
          {session.has_audio 
            ? 'This session is available as an audio recording. You can listen to the full session below.'
            : 'This session is available as a transcript. You can read the full conversation below.'}
        </Description>

        {availableTabs.length > 1 && (
          <TabContainer>
            {availableTabs.map(tab => (
              <Tab
                key={tab}
                $active={activeTab === tab}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'audio' && 'Audio'}
                {tab === 'transcript' && 'Transcript'}
                {tab === 'insights' && 'Insights'}
              </Tab>
            ))}
          </TabContainer>
        )}

        {activeTab === 'audio' && session.has_audio && session.audio_url && (
          <AudioPlayer controls src={session.audio_url}>
            Your browser does not support the audio element.
          </AudioPlayer>
        )}

        {activeTab === 'transcript' && session.has_transcript && (
          <>
            {loading ? (
              <LoadingState>
                <Loader size={32} className="animate-spin" />
                <span>Loading transcript...</span>
              </LoadingState>
            ) : error ? (
              <ErrorState>
                <AlertCircle size={32} />
                <span>{error}</span>
              </ErrorState>
            ) : auxiliaryFiles.transcript ? (
              <TranscriptBox>
                {auxiliaryFiles.transcript}
              </TranscriptBox>
            ) : (
              <TranscriptBox>
                <em>Transcript content not available</em>
              </TranscriptBox>
            )}
          </>
        )}

        {activeTab === 'insights' && session.has_insights && (
          <>
            {loading ? (
              <LoadingState>
                <Loader size={32} className="animate-spin" />
                <span>Loading insights...</span>
              </LoadingState>
            ) : error ? (
              <ErrorState>
                <AlertCircle size={32} />
                <span>{error}</span>
              </ErrorState>
            ) : auxiliaryFiles.insights ? (
              <InsightsBox>
                {auxiliaryFiles.insights}
              </InsightsBox>
            ) : (
              <InsightsBox>
                <em>Insights content not available</em>
              </InsightsBox>
            )}
          </>
        )}
      </ContentBox>
    </Container>
  );
};