import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, FileText, Headphones, Brain, ChevronRight, Loader, AlertCircle, Download, Copy, Check } from 'lucide-react';
import API_ENDPOINTS from '../../config/api';
import { useTheme } from '../../contexts/ThemeContext';

// Styled Components
const PlayerContainer = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--theme-bg-primary);
  position: relative;
  overflow: hidden;
  animation: fadeIn 0.3s ease-in-out;
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const MediaContainer = styled.div`
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--theme-bg-secondary);
  overflow: hidden;
`;

const VideoElement = styled.video`
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
`;

const AudioContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 32px;
  padding: 48px;
  width: 100%;
  height: 100%;
`;

const AudioVisualizer = styled.div`
  width: 300px;
  height: 300px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  animation: pulse 2s ease-in-out infinite;
  
  @keyframes pulse {
    0% { transform: scale(1); opacity: 0.8; }
    50% { transform: scale(1.05); opacity: 1; }
    100% { transform: scale(1); opacity: 0.8; }
  }
`;

const AudioPlayer = styled.audio`
  width: 100%;
  max-width: 600px;
  height: 54px;
  outline: none;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  
  &::-webkit-media-controls-panel {
    background: rgba(0, 0, 0, 0.8);
  }
  
  &::-webkit-media-controls-play-button,
  &::-webkit-media-controls-current-time-display,
  &::-webkit-media-controls-time-remaining-display {
    color: white;
  }
`;

const ContentTabs = styled.div`
  display: flex;
  background: var(--theme-bg-overlay);
  border-bottom: 1px solid var(--theme-border-glass);
  padding: 0 20px;
  align-items: center;
  min-height: 48px;
  gap: 8px;
  backdrop-filter: var(--ivy-glass-blur);
  position: relative;
  z-index: 10;
  box-shadow: var(--theme-shadow-glass);
`;

const TabButton = styled.button<{ $active: boolean; $available: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 20px;
  background: ${props => props.$active ? 'var(--ivy-glass-primary)' : 'transparent'};
  border: none;
  border-bottom: 2px solid ${props => props.$active ? 'var(--ivy-primary)' : 'transparent'};
  color: ${props => props.$available ? (props.$active ? 'var(--ivy-primary)' : 'var(--theme-text-secondary)') : 'var(--theme-text-disabled)'};
  cursor: ${props => props.$available ? 'pointer' : 'default'};
  transition: all var(--ivy-transition-fast);
  font-size: 14px;
  font-weight: 500;
  position: relative;
  border-radius: var(--ivy-radius-md);
  margin: 4px 2px;
  
  &:hover {
    background: ${props => props.$available && !props.$active ? 'var(--theme-bg-glass-hover)' : props.$active ? 'var(--ivy-glass-primary)' : 'transparent'};
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Badge = styled.span`
  background: var(--ivy-primary);
  color: white;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: var(--ivy-radius-full);
  margin-left: 4px;
  font-weight: 500;
`;

const ContentSummary = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-left: auto;
  padding-right: 20px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  
  span {
    display: flex;
    align-items: center;
    gap: 4px;
  }
`;

const ContentView = styled.div<{ $active: boolean }>`
  display: ${props => props.$active ? 'flex' : 'none'};
  flex: 1;
  overflow: hidden;
  position: relative;
  animation: ${props => props.$active ? 'slideIn 0.3s ease-out' : 'none'};
  
  @keyframes slideIn {
    from { 
      opacity: 0;
      transform: translateY(10px);
    }
    to { 
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const TextContent = styled.div`
  flex: 1;
  padding: 32px;
  overflow-y: auto;
  background: var(--theme-bg-tertiary);
  color: var(--theme-text-primary);
  font-family: var(--ivy-font-family);
  line-height: var(--ivy-leading-relaxed);
  
  h1, h2, h3, h4, h5, h6 {
    margin: 24px 0 16px 0;
    color: var(--theme-text-primary);
  }
  
  h1 { font-size: 28px; }
  h2 { font-size: 24px; }
  h3 { font-size: 20px; }
  
  p {
    margin: 16px 0;
  }
  
  ul, ol {
    margin: 16px 0;
    padding-left: 24px;
  }
  
  li {
    margin: 8px 0;
  }
  
  code {
    background: rgba(74, 158, 255, 0.1);
    padding: 2px 6px;
    border-radius: 4px;
    font-family: 'Monaco', 'Courier New', monospace;
    font-size: 0.9em;
  }
  
  pre {
    background: rgba(0, 0, 0, 0.5);
    padding: 16px;
    border-radius: 8px;
    overflow-x: auto;
    margin: 16px 0;
  }
  
  blockquote {
    border-left: 4px solid var(--ivy-primary);
    padding-left: 16px;
    margin: 16px 0;
    color: rgba(255, 255, 255, 0.8);
  }
`;

const TranscriptContent = styled(TextContent)`
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.8;
  white-space: pre-wrap;
`;

const LoadingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  z-index: 10;
`;

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 48px;
  text-align: center;
`;

const ToolBar = styled.div`
  position: absolute;
  top: 20px;
  right: 20px;
  display: flex;
  gap: 8px;
  z-index: 20;
`;

const ToolButton = styled.button`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: rgba(0, 0, 0, 0.8);
    border-color: rgba(255, 255, 255, 0.4);
  }
`;

const StatusBar = styled.div`
  position: absolute;
  bottom: 20px;
  left: 20px;
  background: rgba(0, 0, 0, 0.8);
  padding: 8px 16px;
  border-radius: 20px;
  color: var(--ivy-primary);
  font-size: 12px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const SessionInfo = styled.div`
  position: absolute;
  top: 20px;
  left: 20px;
  background: rgba(0, 0, 0, 0.8);
  padding: 12px 20px;
  border-radius: 12px;
  backdrop-filter: blur(10px);
  max-width: 400px;
  z-index: 10;
  
  h3 {
    margin: 0 0 4px 0;
    font-size: 16px;
    font-weight: 600;
    color: white;
  }
  
  p {
    margin: 0;
    font-size: 14px;
    color: rgba(255, 255, 255, 0.7);
  }
`;

// Types
interface Session {
  id: string;
  title: string;
  session_type?: string;
  has_video?: boolean;
  has_audio?: boolean;
  has_transcript?: boolean;
  has_insights?: boolean;
  video_url?: string;
  audio_url?: string;
  session_folder?: string;
  smart_start_time?: number;
  date?: string;
  student?: string;
  category?: string;
  week?: number;
}

interface EnhancedMediaPlayerProps {
  session: Session;
  onClose?: () => void;
}

type ContentType = 'video' | 'audio' | 'transcript' | 'insights';

interface AuxiliaryContent {
  transcript?: string;
  insights?: string;
}

// Main Component
export const EnhancedMediaPlayer: React.FC<EnhancedMediaPlayerProps> = ({ session, onClose }) => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<ContentType>('video');
  const [auxiliaryContent, setAuxiliaryContent] = useState<AuxiliaryContent>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Determine initial tab based on available content
  useEffect(() => {
    if (session.has_video !== false) {
      setActiveTab('video');
    } else if (session.has_audio || session.audio_url) {
      setActiveTab('audio');
    } else if (session.has_transcript) {
      setActiveTab('transcript');
    } else if (session.has_insights) {
      setActiveTab('insights');
    }
  }, [session]);

  // Load auxiliary files
  useEffect(() => {
    const loadAuxiliaryFiles = async () => {
      if (!session.session_folder) return;

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
        setAuxiliaryContent(data);
      } catch (err) {
        console.error('Error fetching auxiliary files:', err);
        // Don't show error for auxiliary files, they're optional
      } finally {
        setLoading(false);
      }
    };

    loadAuxiliaryFiles();
  }, [session.session_folder]);

  // Apply smart start time for video
  useEffect(() => {
    if (videoRef.current && session.smart_start_time && activeTab === 'video') {
      videoRef.current.currentTime = session.smart_start_time;
    }
  }, [session.smart_start_time, activeTab]);

  const handleCopyTranscript = () => {
    if (auxiliaryContent.transcript) {
      navigator.clipboard.writeText(auxiliaryContent.transcript);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const availableTabs: ContentType[] = [];
  if (session.has_video !== false) availableTabs.push('video');
  if (session.has_audio || session.audio_url) availableTabs.push('audio');
  if (session.has_transcript || auxiliaryContent.transcript) availableTabs.push('transcript');
  if (session.has_insights || auxiliaryContent.insights) availableTabs.push('insights');

  // If no video but has audio URL, ensure audio is available
  if (!session.has_video && session.audio_url && !availableTabs.includes('audio')) {
    availableTabs.push('audio');
  }

  return (
    <PlayerContainer>
      <ContentTabs>
        {session.has_video !== false && (
          <TabButton
            $active={activeTab === 'video'}
            $available={true}
            onClick={() => setActiveTab('video')}
          >
            <Play size={16} />
            Video
            {session.has_video && <Badge>HD</Badge>}
          </TabButton>
        )}
        
        {(session.has_audio || session.audio_url) && (
          <TabButton
            $active={activeTab === 'audio'}
            $available={true}
            onClick={() => setActiveTab('audio')}
          >
            <Headphones size={16} />
            Audio
          </TabButton>
        )}
        
        <TabButton
          $active={activeTab === 'transcript'}
          $available={session.has_transcript || !!auxiliaryContent.transcript}
          onClick={() => (session.has_transcript || auxiliaryContent.transcript) && setActiveTab('transcript')}
        >
          <FileText size={16} />
          Transcript
          {!session.has_transcript && !auxiliaryContent.transcript && <Badge>N/A</Badge>}
        </TabButton>
        
        <TabButton
          $active={activeTab === 'insights'}
          $available={session.has_insights || !!auxiliaryContent.insights}
          onClick={() => (session.has_insights || auxiliaryContent.insights) && setActiveTab('insights')}
        >
          <Brain size={16} />
          Insights
          {!session.has_insights && !auxiliaryContent.insights && <Badge>N/A</Badge>}
        </TabButton>
        
        <ContentSummary>
          <span>Available:</span>
          {(session.has_video !== false || session.video_url) && <span><Play size={12} /> Video</span>}
          {(session.has_audio || session.audio_url) && <span><Headphones size={12} /> Audio</span>}
          {(session.has_transcript || auxiliaryContent.transcript) && <span><FileText size={12} /> Transcript</span>}
          {(session.has_insights || auxiliaryContent.insights) && <span><Brain size={12} /> Insights</span>}
        </ContentSummary>
      </ContentTabs>

      <MediaContainer>
        {/* Video View */}
        <ContentView $active={activeTab === 'video'}>
          {session.video_url ? (
            <VideoElement
              ref={videoRef}
              src={session.video_url}
              controls
              autoPlay
            />
          ) : session.has_video !== false ? (
            <LoadingOverlay>
              <Loader size={48} className="animate-spin" />
              <span>Loading video...</span>
            </LoadingOverlay>
          ) : (
            <ErrorContainer>
              <AlertCircle size={48} />
              <h3>No Video Available</h3>
              <p>This session doesn't have a video recording.</p>
            </ErrorContainer>
          )}
        </ContentView>

        {/* Audio View */}
        <ContentView $active={activeTab === 'audio'}>
          <AudioContainer>
            <AudioVisualizer>
              <Headphones size={80} color="white" />
            </AudioVisualizer>
            {session.audio_url ? (
              <>
                <AudioPlayer
                  ref={audioRef}
                  controls
                  src={session.audio_url}
                  autoPlay={activeTab === 'audio'}
                >
                  Your browser does not support the audio element.
                </AudioPlayer>
              </>
            ) : (
              <ErrorContainer>
                <AlertCircle size={48} />
                <p>Audio not available</p>
              </ErrorContainer>
            )}
          </AudioContainer>
        </ContentView>

        {/* Transcript View */}
        <ContentView $active={activeTab === 'transcript'}>
          {loading && !auxiliaryContent.transcript ? (
            <LoadingOverlay>
              <Loader size={32} className="animate-spin" />
              <span>Loading transcript...</span>
            </LoadingOverlay>
          ) : auxiliaryContent.transcript ? (
            <>
              <TranscriptContent>
                {auxiliaryContent.transcript}
              </TranscriptContent>
              <ToolBar>
                <ToolButton
                  onClick={handleCopyTranscript}
                  title="Copy transcript"
                >
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                </ToolButton>
                <ToolButton
                  onClick={() => handleDownload(auxiliaryContent.transcript!, `${session.title}-transcript.txt`)}
                  title="Download transcript"
                >
                  <Download size={18} />
                </ToolButton>
              </ToolBar>
            </>
          ) : (
            <ErrorContainer>
              <FileText size={48} />
              <h3>No Transcript Available</h3>
              <p>This session doesn't have a transcript.</p>
            </ErrorContainer>
          )}
        </ContentView>

        {/* Insights View */}
        <ContentView $active={activeTab === 'insights'}>
          {loading && !auxiliaryContent.insights ? (
            <LoadingOverlay>
              <Loader size={32} className="animate-spin" />
              <span>Loading insights...</span>
            </LoadingOverlay>
          ) : auxiliaryContent.insights ? (
            <>
              <TextContent dangerouslySetInnerHTML={{ __html: parseMarkdown(auxiliaryContent.insights) }} />
              <ToolBar>
                <ToolButton
                  onClick={() => handleDownload(auxiliaryContent.insights!, `${session.title}-insights.md`)}
                  title="Download insights"
                >
                  <Download size={18} />
                </ToolButton>
              </ToolBar>
            </>
          ) : (
            <ErrorContainer>
              <Brain size={48} />
              <h3>No Insights Available</h3>
              <p>This session doesn't have insights yet.</p>
            </ErrorContainer>
          )}
        </ContentView>

        {/* Status indicator */}
        {activeTab === 'video' && session.has_video && (
          <StatusBar>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--ivy-primary)' }} />
            HD Quality
          </StatusBar>
        )}
        
        {/* Session info overlay */}
        {activeTab === 'video' && (
          <SessionInfo>
            <h3>{session.title}</h3>
            <p>
              {session.student && `${session.student} • `}
              {session.category && `${session.category} • `}
              {session.date && new Date(session.date).toLocaleDateString()}
            </p>
          </SessionInfo>
        )}
      </MediaContainer>
    </PlayerContainer>
  );
};

// Utility function to parse markdown
function parseMarkdown(markdown: string): string {
  // Simple markdown parser
  let html = markdown
    // Headers
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.+)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+)\*/g, '<em>$1</em>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
    // Line breaks
    .replace(/\n\n/g, '</p><p>')
    // Lists
    .replace(/^\* (.+)$/gim, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    // Code blocks
    .replace(/```([^`]+)```/g, '<pre><code>$1</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>');
  
  return `<p>${html}</p>`;
}