import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { X, Play, Pause, Volume2, VolumeX, Maximize2, SkipBack, SkipForward } from 'lucide-react';

const PlayerOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.95);
  z-index: 1000;
  display: flex;
  animation: fadeIn 0.3s ease;
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const PlayerContainer = styled.div`
  display: flex;
  width: 100%;
  height: 100%;
  padding: 20px;
  gap: 20px;
`;

const MainVideoSection = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const VideoWrapper = styled.div`
  position: relative;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Video = styled.video`
  width: 100%;
  height: 100%;
  max-height: calc(100vh - 200px);
  object-fit: contain;
`;

const VideoControls = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.9), transparent);
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 15px;
  opacity: ${props => props.show ? 1 : 0};
  transition: opacity 0.3s ease;
`;

const PlayButton = styled.button`
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background 0.2s;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`;

const ProgressBar = styled.div`
  flex: 1;
  height: 4px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
  cursor: pointer;
  position: relative;
  
  &:hover {
    height: 6px;
  }
`;

const ProgressFill = styled.div`
  height: 100%;
  background: #FF4A23;
  border-radius: 2px;
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    right: -6px;
    top: 50%;
    transform: translateY(-50%);
    width: 12px;
    height: 12px;
    background: #FF4A23;
    border-radius: 50%;
    opacity: 0;
    transition: opacity 0.2s;
  }
  
  ${ProgressBar}:hover &::after {
    opacity: 1;
  }
`;

const TimeDisplay = styled.div`
  color: white;
  font-size: 14px;
  font-family: monospace;
`;

const VolumeControl = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const VolumeSlider = styled.input`
  width: 80px;
  height: 4px;
  background: rgba(255, 255, 255, 0.3);
  outline: none;
  cursor: pointer;
  
  &::-webkit-slider-thumb {
    appearance: none;
    width: 12px;
    height: 12px;
    background: white;
    border-radius: 50%;
  }
`;

const VideoInfo = styled.div`
  padding: 20px 0;
  color: white;
`;

const VideoTitle = styled.h1`
  font-size: 24px;
  margin-bottom: 8px;
`;

const VideoMeta = styled.div`
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  display: flex;
  gap: 16px;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: white;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  backdrop-filter: blur(10px);
  z-index: 10;
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
`;

const SidebarSection = styled.div`
  width: 400px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 20px;
  overflow-y: auto;
  
  @media (max-width: 1200px) {
    display: none;
  }
`;

const SidebarTitle = styled.h3`
  font-size: 18px;
  color: white;
  margin-bottom: 20px;
`;

const RelatedVideoGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const RelatedVideoCard = styled.div`
  display: flex;
  gap: 12px;
  cursor: pointer;
  padding: 8px;
  border-radius: 4px;
  transition: background 0.2s;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`;

const RelatedVideoThumbnail = styled.div`
  width: 120px;
  height: 68px;
  background: #1a1a1a;
  border-radius: 4px;
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
`;

const RelatedVideoPreview = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const RelatedVideoInfo = styled.div`
  flex: 1;
`;

const RelatedVideoTitle = styled.div`
  font-size: 14px;
  color: white;
  margin-bottom: 4px;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const RelatedVideoMeta = styled.div`
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
`;

interface VideoPlayerProps {
  video: any;
  videos: any[];
  onClose: () => void;
  onVideoChange: (video: any) => void;
}

interface RelatedVideo {
  id: string;
  title: string;
  coach: string;
  date: string;
  video_url: string;
  smart_start_time?: number;
  thumbnail?: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ video, videos, onClose, onVideoChange }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [hoveredRelatedVideo, setHoveredRelatedVideo] = useState<string | null>(null);
  const controlsTimeout = useRef<NodeJS.Timeout>();
  const relatedVideoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});

  useEffect(() => {
    if (videoRef.current) {
      // Start from the beginning when playing full video
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(e => console.log('Autoplay failed:', e));
    }
  }, [video]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      switch(e.key) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'Escape':
          onClose();
          break;
        case 'ArrowRight':
          skip(10);
          break;
        case 'ArrowLeft':
          skip(-10);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (videoRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = x / rect.width;
      const newTime = percentage * duration;
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    if (videoRef.current) {
      if (isMuted) {
        videoRef.current.volume = volume;
        setIsMuted(false);
      } else {
        videoRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  };

  const skip = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime += seconds;
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeout.current) {
      clearTimeout(controlsTimeout.current);
    }
    controlsTimeout.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  };

  const relatedVideos: RelatedVideo[] = videos.filter(v => v.id !== video.id).slice(0, 10);
  
  const handleRelatedVideoHover = (videoId: string) => {
    setHoveredRelatedVideo(videoId);
    const relatedVideo = relatedVideos.find(v => v.id === videoId);
    if (relatedVideo?.smart_start_time) {
      setTimeout(() => {
        const video = relatedVideoRefs.current[videoId];
        if (video && video.readyState >= 2) {
          video.currentTime = relatedVideo.smart_start_time || 0;
        }
      }, 100);
    }
  };
  
  const handleRelatedVideoLeave = () => {
    setHoveredRelatedVideo(null);
  };

  return (
    <PlayerOverlay onClick={onClose}>
      <PlayerContainer onClick={e => e.stopPropagation()}>
        <MainVideoSection>
          <VideoWrapper onMouseMove={handleMouseMove} onMouseLeave={() => isPlaying && setShowControls(false)}>
            <CloseButton onClick={onClose}>
              <X size={20} />
            </CloseButton>
            
            <Video
              ref={videoRef}
              src={video.video_url}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onClick={togglePlay}
            />
            
            <VideoControls show={showControls}>
              <PlayButton onClick={togglePlay}>
                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
              </PlayButton>
              
              <PlayButton onClick={() => skip(-10)}>
                <SkipBack size={16} />
              </PlayButton>
              
              <ProgressBar onClick={handleProgressClick}>
                <ProgressFill style={{ width: `${(currentTime / duration) * 100}%` }} />
              </ProgressBar>
              
              <PlayButton onClick={() => skip(10)}>
                <SkipForward size={16} />
              </PlayButton>
              
              <TimeDisplay>
                {formatTime(currentTime)} / {formatTime(duration)}
              </TimeDisplay>
              
              <VolumeControl>
                <PlayButton onClick={toggleMute}>
                  {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </PlayButton>
                <VolumeSlider
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                />
              </VolumeControl>
              
              <PlayButton onClick={() => videoRef.current?.requestFullscreen()}>
                <Maximize2 size={20} />
              </PlayButton>
            </VideoControls>
          </VideoWrapper>
          
          <VideoInfo>
            <VideoTitle>{video.title}</VideoTitle>
            <VideoMeta>
              <span>{video.coach} • {video.student || 'Huda'}</span>
              <span>•</span>
              <span>{new Date(video.date).toLocaleDateString()}</span>
              <span>•</span>
              <span>{video.category}</span>
            </VideoMeta>
          </VideoInfo>
        </MainVideoSection>
        
        <SidebarSection>
          <SidebarTitle>More Sessions</SidebarTitle>
          <RelatedVideoGrid>
            {relatedVideos.map(relatedVideo => {
              const isHoveredRelated = hoveredRelatedVideo === relatedVideo.id;
              
              return (
                <RelatedVideoCard 
                  key={relatedVideo.id} 
                  onClick={() => onVideoChange(relatedVideo)}
                  onMouseEnter={() => handleRelatedVideoHover(relatedVideo.id)}
                  onMouseLeave={handleRelatedVideoLeave}
                >
                  <RelatedVideoThumbnail>
                    {isHoveredRelated ? (
                      <RelatedVideoPreview
                        ref={el => relatedVideoRefs.current[relatedVideo.id] = el}
                        src={relatedVideo.video_url}
                        muted
                        loop
                        playsInline
                        autoPlay
                        onLoadedMetadata={(e) => {
                          const video = e.currentTarget;
                          if (relatedVideo.smart_start_time && video.duration > relatedVideo.smart_start_time) {
                            video.currentTime = relatedVideo.smart_start_time;
                          }
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '100%',
                        height: '100%',
                        background: relatedVideo.thumbnail 
                          ? `url(${relatedVideo.thumbnail}) center/cover`
                          : 'linear-gradient(45deg, #1a1a1a, #2a2a2a)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {!relatedVideo.thumbnail && <Play size={24} color="rgba(255,255,255,0.5)" />}
                      </div>
                    )}
                  </RelatedVideoThumbnail>
                  <RelatedVideoInfo>
                    <RelatedVideoTitle>{relatedVideo.title}</RelatedVideoTitle>
                    <RelatedVideoMeta>
                      {relatedVideo.coach} • {new Date(relatedVideo.date).toLocaleDateString()}
                    </RelatedVideoMeta>
                  </RelatedVideoInfo>
                </RelatedVideoCard>
              );
            })}
          </RelatedVideoGrid>
        </SidebarSection>
      </PlayerContainer>
    </PlayerOverlay>
  );
};