import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { Play, Search, Clock, Calendar, Volume2, VolumeX, ChevronLeft, ChevronRight, Loader, X, Music, FileText, Headphones, Brain, Video, Sun, Moon } from 'lucide-react';
import { VideoPlayer } from './VideoPlayer';
import { EnhancedMediaPlayer } from '../shared/EnhancedMediaPlayer';
import { videoPreloadService } from '../../services/videoPreloadService';
import { metadataCacheService, hasCachedMetadata, getCachedMetadata } from '../../services/metadataCacheService';
import API_ENDPOINTS from '../../config/api';
import useAuth from '../../hooks/useAuthMock';
import { useTheme } from '../../contexts/ThemeContext';

// Theme-aware styled components with glassmorphism
const Container = styled.div`
  min-height: 100vh;
  background: var(--ivy-bg-gradient);
  color: var(--theme-text-primary);
  position: relative;
  
  &::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--ivy-bg-gradient);
    z-index: -1;
  }
`;

const Header = styled.div`
  position: sticky;
  top: 0;
  background: var(--theme-bg-glass);
  backdrop-filter: var(--ivy-glass-blur);
  border: 1px solid var(--theme-border-glass);
  border-radius: var(--ivy-radius-xl);
  margin: 20px;
  z-index: 100;
  padding: 20px 40px;
  box-shadow: var(--theme-shadow-glass);
`;

const HeaderContent = styled.div`
  max-width: 1800px;
  margin: 0 auto;
`;

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
`;

const ThemeToggle = styled.button`
  background: var(--theme-bg-glass);
  border: 1px solid var(--theme-border-glass);
  border-radius: var(--ivy-radius-lg);
  padding: 8px 12px;
  color: var(--theme-text-primary);
  cursor: pointer;
  transition: all var(--ivy-transition-fast);
  backdrop-filter: var(--ivy-glass-blur);
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  
  &:hover {
    background: var(--theme-bg-glass-hover);
    border-color: var(--theme-border-hover);
    transform: translateY(-1px);
  }
`;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: 600;
  margin: 0;
`;

const VideoCount = styled.div`
  font-size: 0.875rem;
  opacity: 0.6;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const CacheIndicator = styled.span<{ cached?: boolean }>`
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 12px;
  background: ${props => props.cached ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255, 193, 7, 0.2)'};
  color: ${props => props.cached ? '#4CAF50' : '#FFC107'};
  font-weight: 500;
`;

const FilterRow = styled.div`
  display: flex;
  gap: 16px;
  align-items: center;
`;

const SearchContainer = styled.div`
  position: relative;
  flex: 1;
  max-width: 400px;
`;

const SearchIcon = styled(Search)`
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--theme-text-muted);
  width: 20px;
  height: 20px;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 12px 16px 12px 48px;
  background: var(--theme-bg-primary);
  border: 1px solid var(--theme-border-glass);
  border-radius: var(--ivy-radius-lg);
  color: var(--theme-text-primary);
  font-size: 0.875rem;
  outline: none;
  transition: all var(--ivy-transition-fast);
  
  &::placeholder {
    color: var(--theme-text-muted);
  }
  
  &:focus {
    border-color: var(--ivy-primary);
    box-shadow: 0 0 0 3px rgba(255, 74, 35, 0.1);
    background: var(--theme-bg-primary);
    border-color: var(--ivy-primary);
  }
`;

const Select = styled.select`
  padding: 12px 20px;
  background: var(--theme-bg-primary);
  border: 1px solid var(--theme-border-glass);
  border-radius: var(--ivy-radius-lg);
  color: var(--theme-text-primary);
  font-size: 0.875rem;
  outline: none;
  cursor: pointer;
  transition: all var(--ivy-transition-fast);
  
  &:hover {
    border-color: var(--ivy-primary);
    background: var(--theme-bg-primary);
  }
  
  &:focus {
    border-color: var(--ivy-primary);
    box-shadow: 0 0 0 3px rgba(255, 74, 35, 0.1);
  }
  
  option {
    background: var(--theme-bg-primary);
    color: var(--theme-text-primary);
  }
`;

const VideoGrid = styled.div`
  max-width: 1800px;
  margin: 0 auto;
  padding: 20px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
`;

const SkeletonCard = styled.div`
  background: #1a1a1a;
  border-radius: 8px;
  overflow: hidden;
  animation: pulse 1.5s ease-in-out infinite;
  
  @keyframes pulse {
    0% { opacity: 0.6; }
    50% { opacity: 1; }
    100% { opacity: 0.6; }
  }
`;

const SkeletonThumbnail = styled.div`
  width: 100%;
  padding-top: 56.25%;
  background: linear-gradient(90deg, #1a1a1a 25%, #2a2a2a 50%, #1a1a1a 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  
  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
`;

const SkeletonContent = styled.div`
  padding: 12px;
`;

const SkeletonTitle = styled.div`
  height: 20px;
  background: #2a2a2a;
  border-radius: 4px;
  margin-bottom: 8px;
`;

const SkeletonMeta = styled.div`
  height: 16px;
  width: 60%;
  background: #2a2a2a;
  border-radius: 4px;
`;

const VideoCard = styled.div<{ isHovered: boolean; isLoading?: boolean }>`
  position: relative;
  border-radius: var(--ivy-radius-xl);
  overflow: hidden;
  cursor: pointer;
  transform: ${props => props.isHovered ? 'scale(1.02)' : 'scale(1)'};
  transition: all var(--ivy-transition-normal);
  background: var(--theme-bg-glass);
  backdrop-filter: var(--ivy-glass-blur);
  border: 1px solid var(--theme-border-glass);
  box-shadow: var(--theme-shadow-glass);
  opacity: ${props => props.isLoading ? 0.7 : 1};
  contain: layout style paint;
  isolation: isolate;
  z-index: 1;
  
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: linear-gradient(to right, 
      hsla(0, 0%, 100%, 0.4), 
      hsla(0, 0%, 100%, 0.1), 
      hsla(0, 0%, 100%, 0.4)
    );
    mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    mask-composite: exclude;
    padding: 1px;
    pointer-events: none;
  }
  
  &:hover {
    background: var(--theme-bg-glass-hover);
    border-color: var(--theme-border-hover);
    box-shadow: var(--ivy-glass-shadow-hover);
  }
`;

const VideoThumbnail = styled.div`
  position: relative;
  padding-top: 56.25%;
  background: var(--ivy-bg-gradient);
  overflow: hidden;
  z-index: 0;
  contain: layout style paint;
`;

const LoadingSpinner = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    from { transform: translate(-50%, -50%) rotate(0deg); }
    to { transform: translate(-50%, -50%) rotate(360deg); }
  }
`;

const PreviewLoadingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
`;



const ThumbnailPlaceholder = styled.div<{ category?: string }>`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => 
    props.category === 'Game Plan' 
      ? 'linear-gradient(135deg, var(--ivy-secondary) 0%, var(--ivy-gray-200) 100%)'
      : props.category === 'Check-in'
      ? 'linear-gradient(135deg, var(--ivy-primary) 0%, var(--ivy-gray-200) 100%)'
      : 'linear-gradient(135deg, var(--ivy-gray-300) 0%, var(--ivy-gray-100) 100%)'
  };
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(circle at center, transparent 30%, rgba(255,255,255,0.1) 100%);
  }
`;

const PreviewVideo = styled.video`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 1;
`;

const ThumbnailImage = styled.img`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const HoverControls = styled.div`
  position: absolute;
  bottom: 8px;
  left: 8px;
  display: flex;
  gap: 8px;
`;

const MuteButton = styled.button`
  background: rgba(0, 0, 0, 0.7);
  border: none;
  color: white;
  width: 32px;
  height: 32px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s;
  
  ${VideoCard}:hover & {
    opacity: 1;
  }
`;

const ThumbnailGradient = styled.div<{ isGamePlan?: boolean }>`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: ${props => 
    props.isGamePlan 
      ? 'linear-gradient(135deg, rgba(100, 20, 50, 0.3), transparent)'
      : 'linear-gradient(135deg, rgba(255, 74, 35, 0.2), transparent)'
  };
`;

const PlayButton = styled.div<{ isHovered: boolean }>`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: ${props => props.isHovered ? 'rgba(255, 74, 35, 0.9)' : 'rgba(0, 0, 0, 0.7)'};
  border-radius: 50%;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
`;

const DurationBadge = styled.div`
  position: absolute;
  bottom: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.8);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
`;

const CategoryBadge = styled.div<{ type?: string }>`
  position: absolute;
  top: 8px;
  left: 8px;
  background: ${props => 
    props.type === 'Game Plan' ? 'rgba(100, 20, 50, 0.9)' : 
    props.type === 'Check-in' ? 'rgba(255, 74, 35, 0.9)' :
    'rgba(255, 74, 35, 0.9)'
  };
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const VideoInfo = styled.div`
  padding: 16px;
  background: var(--theme-bg-glass);
  backdrop-filter: var(--ivy-glass-blur);
  border-top: 1px solid var(--theme-border-glass);
`;

const VideoTitle = styled.h3`
  font-size: 0.9rem;
  font-weight: 500;
  margin-bottom: 8px;
  line-height: 1.4;
  color: var(--theme-text-primary);
`;

const VideoMeta = styled.div`
  font-size: 0.75rem;
  color: var(--theme-text-muted);
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
`;

const VideoDetails = styled.div`
  font-size: 0.7rem;
  color: var(--theme-text-muted);
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const WeekBadge = styled.div`
  margin-top: 8px;
  display: inline-block;
  padding: 2px 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  font-size: 0.7rem;
  color: var(--theme-text-secondary);
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 80px 40px;
  color: var(--theme-text-muted);
  
  h3 {
    font-size: 1.5rem;
    margin-bottom: 8px;
  }
`;

// Pagination components
const PaginationContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  padding: 20px;
  margin-top: 20px;
  margin-bottom: 20px;
`;

const PageButton = styled.button<{ isActive?: boolean }>`
  padding: 8px 16px;
  background: ${props => props.isActive ? 'var(--ivy-primary)' : 'var(--theme-bg-glass)'};
  border: 1px solid ${props => props.isActive ? 'var(--ivy-primary)' : 'var(--theme-border-glass)'};
  color: ${props => props.isActive ? 'white' : 'var(--theme-text-primary)'};
  border-radius: var(--ivy-radius-lg);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all var(--ivy-transition-fast);
  backdrop-filter: var(--ivy-glass-blur);
  font-weight: ${props => props.isActive ? '600' : '500'};
  
  &:hover:not(:disabled) {
    background: ${props => props.isActive ? 'var(--ivy-primary-dark)' : 'var(--theme-bg-glass-hover)'};
    border-color: var(--ivy-primary);
    transform: translateY(-1px);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const PageInfo = styled.span`
  margin: 0 16px;
  color: var(--theme-text-secondary);
  font-size: 0.875rem;
`;

// YouTube-style player layout components
const PlayerLayout = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #000;
  z-index: 1000;
  display: flex;
  animation: fadeIn 0.3s ease;
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const MainVideoSection = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #000;
`;

const VideoContainer = styled.div`
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
`;

const MainVideo = styled.video`
  width: 100%;
  height: 100%;
  max-height: calc(100vh - 120px);
  object-fit: contain;
`;

const VideoControls = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20px;
  background: linear-gradient(transparent, rgba(0,0,0,0.9));
  display: flex;
  align-items: center;
  gap: 15px;
  transition: opacity 0.3s;
`;

const VideoInfoSection = styled.div`
  padding: 20px;
  background: var(--theme-bg-glass);
  backdrop-filter: var(--ivy-glass-blur);
  border-top: 1px solid var(--theme-border-glass);
`;

const MainVideoTitle = styled.h2`
  font-size: 1.25rem;
  margin-bottom: 8px;
  color: var(--theme-text-primary);
  font-weight: 600;
`;

const MainVideoMeta = styled.div`
  color: var(--theme-text-secondary);
  font-size: 0.9rem;
`;

const Sidebar = styled.div`
  width: 400px;
  background: var(--theme-bg-glass);
  backdrop-filter: var(--ivy-glass-blur);
  border-left: 1px solid var(--theme-border-glass);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  box-shadow: var(--theme-shadow-glass);
`;

const SidebarHeader = styled.div`
  padding: 20px;
  border-bottom: 1px solid var(--theme-border-glass);
  background: var(--theme-bg-glass);
  backdrop-filter: var(--ivy-glass-blur);
  
  h3 {
    font-size: 1.1rem;
    color: var(--ivy-primary);
    margin: 0;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
`;

const SidebarVideos = styled.div`
  flex: 1;
  overflow-y: auto;
`;

const SidebarVideoCard = styled.div<{ isActive?: boolean }>`
  display: flex;
  gap: 12px;
  padding: 12px;
  cursor: pointer;
  background: ${props => props.isActive ? 'var(--ivy-glass-primary)' : 'var(--theme-bg-glass)'};
  border: 1px solid ${props => props.isActive ? 'var(--ivy-glass-primary-border)' : 'var(--theme-border-glass)'};
  border-left: 3px solid ${props => props.isActive ? 'var(--ivy-primary)' : 'transparent'};
  border-radius: var(--ivy-radius-lg);
  margin: 8px 12px;
  transition: all var(--ivy-transition-normal);
  backdrop-filter: var(--ivy-glass-blur);
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, 
      transparent 0%, 
      rgba(255, 74, 35, 0.05) 100%
    );
    opacity: 0;
    transition: opacity var(--ivy-transition-fast);
  }
  
  &:hover {
    background: ${props => props.isActive ? 'var(--ivy-glass-primary)' : 'var(--theme-bg-glass-hover)'};
    border-color: var(--ivy-primary);
    transform: translateX(4px);
    box-shadow: var(--theme-shadow-glass);
    
    &::before {
      opacity: 1;
    }
  }
`;

const SidebarThumbnail = styled.div`
  width: 120px;
  height: 68px;
  background: var(--ivy-bg-gradient);
  border-radius: var(--ivy-radius-md);
  overflow: hidden;
  position: relative;
  flex-shrink: 0;
  border: 1px solid var(--theme-border-glass);
`;

const SidebarVideoInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
`;

const SidebarVideoTitle = styled.div`
  font-size: 0.85rem;
  color: var(--theme-text-primary);
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-weight: 500;
`;

const SidebarVideoMeta = styled.div`
  font-size: 0.75rem;
  color: var(--theme-text-muted);
`;

const CloseButton = styled.button`
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(0,0,0,0.5);
  border: none;
  color: white;
  padding: 10px;
  border-radius: 50%;
  cursor: pointer;
  z-index: 10;
  transition: background 0.2s;
  
  &:hover {
    background: rgba(0,0,0,0.7);
  }
`;

const LoadingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.8);
  z-index: 5;
`;

const FileIndicators = styled.div`
  display: flex;
  gap: 4px;
  margin-top: 8px;
  flex-wrap: wrap;
`;

const FileIndicator = styled.div<{ $available: boolean }>`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: ${props => props.$available ? 'var(--ivy-glass-primary)' : 'var(--theme-bg-glass)'};
  border: 1px solid ${props => props.$available ? 'var(--ivy-glass-primary-border)' : 'var(--theme-border-glass)'};
  border-radius: var(--ivy-radius-sm);
  font-size: 11px;
  color: ${props => props.$available ? 'var(--ivy-primary)' : 'var(--theme-text-disabled)'};
  
  svg {
    width: 12px;
    height: 12px;
  }
`;

// Enhanced media player modal components
const PlayerModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: var(--theme-bg-primary);
  z-index: 1000;
  display: flex;
`;

const PlayerContent = styled.div`
  flex: 1;
  display: flex;
  height: 100vh;
`;

const EnhancedVideoContainer = styled.div`
  flex: 1;
  background: var(--theme-bg-secondary);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  
  /* Ensure EnhancedMediaPlayer doesn't cover the close button */
  & > div:not(button) {
    width: 100%;
    height: 100%;
  }
`;

// Additional styled components for video description
const VideoDescription = styled.div`
  color: var(--theme-text-primary);
  font-size: 0.875rem;
  line-height: 1.5;
`;

// Additional sidebar styled components
const SidebarTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 8px 0;
`;

const SidebarThumbnailContainer = styled.div`
  position: relative;
  width: 120px;
  height: 67px;
  background: #000;
  border-radius: 4px;
  overflow: hidden;
  flex-shrink: 0;
`;


const CloseButtonStyled = styled.button`
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 1000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  
  &:hover {
    background: rgba(0, 0, 0, 0.9);
    transform: scale(1.05);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  }
  
  svg {
    width: 20px;
    height: 20px;
  }
`;

interface Session {
  id: string;
  title: string;
  coach: string;
  date: string;
  duration: string;
  category: string;
  thumbnail: string;
  video_url: string;
  notes: string;
  file_name?: string;
  file_size?: string;
  student?: string;
  week?: number;
  session_id?: string;
  smart_start_time?: number;
  thumbnail_time?: number;
  session_type?: string;
  has_video?: boolean;
  has_audio?: boolean;
  has_transcript?: boolean;
  has_insights?: boolean;
  audio_url?: string;
  session_folder?: string;
  preview_url?: string;
  file_key?: string;
}

// Use the metadata cache service for persistence across HMR and remounts
console.log('🔧 SessionsViewOptimal module loaded');

// Cache for preview URLs (short clips)
const previewUrlCache = new Map<string, string>();
const PREVIEW_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

// Cache for full video URLs
const fullVideoUrlCache = new Map<string, string>();
const VIDEO_CACHE_DURATION = 55 * 60 * 1000; // 55 minutes


export const SessionsView: React.FC = () => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [lastUserId, setLastUserId] = useState<string | null>(null);
  
  // Initialize state from cache if available
  const initializeFromCache = () => {
    const token = localStorage.getItem('token') || '';
    const userId = user?.id || token.split('_')[2] || 'unknown';
    const cacheKey = `student_metadata_${userId}`;
    
    const cacheEntry = metadataCacheService.get(cacheKey);
    console.log('🔍 Cache lookup result:', { 
      cacheKey, 
      found: !!cacheEntry,
      hasData: !!cacheEntry?.data,
      timestamp: cacheEntry?.timestamp ? new Date(cacheEntry.timestamp).toLocaleTimeString() : 'N/A'
    });
    
    // The cache service returns {data, timestamp}, we need to access the data property
    const cachedData = cacheEntry?.data;
    
    if (cachedData && cachedData.sessions) {
      console.log('✅ Loading student sessions from cache for user:', userId);
      const { sessions, coaches, categories, total } = cachedData;
      console.log('🚀 Initializing from cache - sessions:', sessions?.length);
      return {
        sessions: sessions || [],
        coaches: coaches || [],
        categories: categories || [],
        total: total || 0,
        totalPages: Math.ceil((total || 0) / 20),
        hasCache: true
      };
    }
    
    console.log('❌ No cache found for user:', userId);
    return {
      sessions: [],
      coaches: [],
      categories: [],
      total: 0,
      totalPages: 1,
      hasCache: false
    };
  };

  // Check if user has changed
  const currentUserId = user?.id || null;
  const userChanged = lastUserId !== null && lastUserId !== currentUserId;
  
  // If user changed, clear cache and don't use cached data
  if (userChanged) {
    console.log('👤 User changed from', lastUserId, 'to', currentUserId, '- clearing cache');
    metadataCacheService.clear();
  }

  const cachedData = userChanged ? { sessions: [], coaches: [], categories: [], total: 0, hasCache: false } : initializeFromCache();
  
  // State for all sessions data
  const [allSessions, setAllSessions] = useState<Session[]>(cachedData.sessions || []);
  const [displayedSessions, setDisplayedSessions] = useState<Session[]>([]);
  const [coaches, setCoaches] = useState<string[]>(cachedData.coaches || []);
  const [categories, setCategories] = useState<string[]>(cachedData.categories || []);
  
  // Loading state - start with false if we have cached data
  const [loading, setLoading] = useState(!cachedData.hasCache);
  const [dataLoaded, setDataLoaded] = useState(cachedData.hasCache);
  const [showSkeleton, setShowSkeleton] = useState(!cachedData.hasCache && !dataLoaded);
  const [loadedFromCache, setLoadedFromCache] = useState(cachedData.hasCache);
  const [isMetadataCached, setIsMetadataCached] = useState(cachedData.hasCache);
  const [error, setError] = useState<string | null>(null);
  
  // Track user changes
  useEffect(() => {
    if (currentUserId !== lastUserId) {
      setLastUserId(currentUserId);
      if (userChanged) {
        // Force reload data for new user
        setAllSessions([]);
        setCoaches([]);
        setCategories([]);
        setDataLoaded(false);
        setLoading(true);
        setLoadedFromCache(false);
        // Force reload will happen in the next effect
      }
    }
  }, [currentUserId]);
  
  // Initial load or reload on user change
  useEffect(() => {
    if (!dataLoaded || (userChanged && lastUserId === currentUserId)) {
      // Clear cache for non-Huda users to ensure fresh data
      const isHuda = user?.email?.toLowerCase() === 'hudasir4j@gmail.com' || user?.id === 'student_007';
      if (!isHuda) {
        metadataCacheService.clear();
        console.log('🧹 Cleared cache for non-Huda user:', user?.email);
      }
      
      // Reinitialize cache for current user
      metadataCacheService.reinitializeForUser();
      loadAllMetadata(false);
    }
  }, [dataLoaded, lastUserId, currentUserId]);
  
  
  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCoach, setSelectedCoach] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(cachedData.total || 0);
  
  // UI state
  const [hoveredVideo, setHoveredVideo] = useState<string | null>(null);
  const [playingVideo, setPlayingVideo] = useState<Session | null>(null);
  const [mutedVideos, setMutedVideos] = useState<Set<string>>(new Set());
  
  // YouTube-style player state
  const [playerMode, setPlayerMode] = useState(false);
  const [currentVideo, setCurrentVideo] = useState<Session | null>(null);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const mainVideoRef = useRef<HTMLVideoElement>(null);
  
  // Video preview state
  const [previewUrls, setPreviewUrls] = useState<Map<string, string>>(new Map());
  const [loadingPreviews, setLoadingPreviews] = useState<Set<string>>(new Set());
  const [visibleSessions, setVisibleSessions] = useState<Set<string>>(new Set());
  const [previewsReady, setPreviewsReady] = useState<Map<string, boolean>>(new Map());
  const [sessionUrls, setSessionUrls] = useState<{ [key: string]: { url?: string; audio_url?: string } }>({});
  const [loadingUrls, setLoadingUrls] = useState<Set<string>>(new Set());
  
  // Refs
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});
  const previewQueueRef = useRef<string[]>([]);
  const isLoadingPreviewsRef = useRef(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const cardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const ITEMS_PER_PAGE = 20;

  // Set up intersection observer
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const updates = new Set(visibleSessions);
        
        entries.forEach(entry => {
          const sessionId = entry.target.getAttribute('data-session-id');
          if (!sessionId) return;
          
          if (entry.isIntersecting) {
            updates.add(sessionId);
          } else {
            updates.delete(sessionId);
          }
        });
        
        setVisibleSessions(updates);
      },
      {
        root: null,
        rootMargin: '50px',
        threshold: 0.01
      }
    );

    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  // Load all metadata on mount - but skip if we already have fresh cache
  useEffect(() => {
    console.log('🎬 SessionsView component mounted');
    console.log('🔍 Cache status:', isMetadataCached);
    console.log('📊 All sessions length:', allSessions?.length || 0);
    console.log('📊 Data loaded:', dataLoaded);
    
    if (!isMetadataCached && !dataLoaded && !loading) {
      console.log('❌ No cache found, fetching fresh data');
      loadAllMetadata();
    } else if (isMetadataCached && allSessions && allSessions.length > 0) {
      console.log('🚀 CACHE HIT! Using cached session data - instant load!');
      // Apply filters immediately with cached data
      applyFilters();
      
      // Refresh in background after 10 seconds
      setTimeout(() => {
        console.log('📊 Background refresh of session data');
        loadAllMetadata(true); // silent refresh
      }, 10000);
    }
    
    return () => {
      console.log('🛑 SessionsView component unmounting');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMetadataCached, dataLoaded, loading]);

  // Apply filters when they change
  useEffect(() => {
    if (dataLoaded || isMetadataCached) {
      applyFilters();
    }
  }, [selectedCoach, selectedCategory, searchTerm, currentPage, allSessions, dataLoaded, isMetadataCached]);

  // Load preview URLs for visible sessions
  useEffect(() => {
    if (visibleSessions.size > 0 && displayedSessions.length > 0) {
      const sessionsToLoad = Array.from(visibleSessions)
        .filter(id => !previewUrls.has(id) && !loadingPreviews.has(id))
        .slice(0, 5); // Load up to 5 at a time
      
      if (sessionsToLoad.length > 0) {
        loadPreviews(sessionsToLoad);
      }
      
      // Also load full URLs for visible sessions (progressive loading)
      const urlsToLoad = Array.from(visibleSessions)
        .filter(id => !sessionUrls[id] && !loadingUrls.has(id))
        .slice(0, 3); // Load up to 3 at a time
      
      if (urlsToLoad.length > 0) {
        loadSessionUrlsBatch(urlsToLoad);
      }
      
      // Prefetch adjacent videos
      const visibleArray = Array.from(visibleSessions);
      visibleArray.forEach(sessionId => {
        const allIds = displayedSessions.map(s => s.id);
        videoPreloadService.prefetchAdjacentVideos(sessionId, allIds);
      });
    }
  }, [visibleSessions, displayedSessions]);

  // Observe video cards
  useEffect(() => {
    const observer = observerRef.current;
    if (!observer) return;

    // Observe all current cards
    Object.entries(cardRefs.current).forEach(([id, element]) => {
      if (element) {
        element.setAttribute('data-session-id', id);
        observer.observe(element);
      }
    });

    // Cleanup
    return () => {
      Object.values(cardRefs.current).forEach(element => {
        if (element) observer.unobserve(element);
      });
    };
  }, [displayedSessions]);

  const loadAllMetadata = async (silentRefresh = false) => {
    // Check cache first
    const token = localStorage.getItem('token') || '';
    const userId = user?.id || token.split('_')[2] || 'unknown';
    const cacheKey = `student_metadata_${userId}`;
    const cacheEntry = metadataCacheService.get(cacheKey);
    
    // The cache service returns {data, timestamp}, we need to access the data property
    const cachedData = cacheEntry?.data;
    
    if (cachedData && !silentRefresh) {
      console.log('✅ Using cached session data from service for user:', userId);
      const { sessions, coaches, categories, total } = cachedData;
      setAllSessions(sessions || []);
      setCoaches(coaches || []);
      setCategories(categories || []);
      setTotalCount(total || 0);
      setTotalPages(cachedData.totalPages || Math.ceil((total || 0) / 20));
      setDataLoaded(true);
      setShowSkeleton(false);
      setLoading(false); // Make sure loading is false
      setLoadedFromCache(true);
      setIsMetadataCached(true);
      
      // Apply filters immediately with cached data
      setTimeout(() => applyFilters(), 0);
      return;
    }

    if (!silentRefresh) {
      console.log('📡 Fetching fresh session data from server');
      setLoading(true);
    } else {
      console.log('🔄 Silent background refresh');
    }
    try {
      const token = localStorage.getItem('token');
      console.log('🔑 Token exists:', !!token);
      
      if (!token) {
        console.error('❌ No authentication token found');
        setLoading(false);
        return;
      }
      
      // Fetch with a high limit to get all metadata at once
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4101';
      const url = `${apiUrl}/api/student/sessions?page=1&limit=200&metadata_only=true`;
      console.log('📍 Fetching from URL:', url);
      console.log('⏱️ Starting metadata fetch at:', new Date().toLocaleTimeString());
      
      const startTime = Date.now();
      
      // Add timeout to fetch request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      console.log('⏱️ Fetch completed in:', Date.now() - startTime, 'ms');

      console.log('Session API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Received sessions:', data.sessions?.length || 0);
        const sessions = data.sessions || [];
        const uniqueCoaches = data.coaches || [];
        const uniqueCategories = data.categories || [];
        const total = data.total_sessions || sessions.length;
        
        // Sort by week number descending
        sessions.sort((a: Session, b: Session) => {
          const weekA = a.week || 0;
          const weekB = b.week || 0;
          return weekB - weekA;
        });
        
        // Cache the metadata for all users with user-specific keys
        const token = localStorage.getItem('token') || '';
        const userId = user?.id || token.split('_')[2] || 'unknown';
        const cacheKey = `student_metadata_${userId}`;
        
        console.log('📊 Caching metadata for user:', userId, '- sessions count:', sessions.length);
        metadataCacheService.set(cacheKey, { 
          sessions, 
          coaches: uniqueCoaches, 
          categories: uniqueCategories, 
          total,
          totalPages: Math.ceil(total / 20)
        });
        console.log('✅ Metadata cached successfully with key:', cacheKey);
        
        setAllSessions(sessions);
        setCoaches(uniqueCoaches);
        setCategories(uniqueCategories);
        setTotalCount(total);
        setDataLoaded(true);
        setShowSkeleton(false);
        if (!silentRefresh) {
          setLoadedFromCache(false);
        }
        
        // Apply filters immediately after setting data
        setTimeout(() => {
          const filtered = [...sessions];
          setTotalPages(Math.ceil(filtered.length / ITEMS_PER_PAGE));
          const displayed = filtered.slice(0, ITEMS_PER_PAGE);
          setDisplayedSessions(displayed);
          console.log('✅ Initial display set:', displayed.length, 'sessions');
        }, 0);
      } else {
        console.error('❌ Failed to load sessions:', response.status, response.statusText);
        // Try to parse error message
        try {
          const errorData = await response.json();
          console.error('❌ Error details:', errorData);
        } catch (e) {
          console.error('❌ Could not parse error response:', e);
        }
        
        // If 401, token might be invalid
        if (response.status === 401) {
          console.log('🔒 Authentication failed, redirecting to login...');
          window.location.href = '/login';
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error('❌ Request timed out after 30 seconds');
        setError('Request timed out. Please try refreshing the page.');
      } else {
        console.error('Error loading metadata:', error);
        setError('Failed to load sessions. Please try again.');
      }
    } finally {
      if (!silentRefresh) {
        setLoading(false);
        console.log('🏁 Loading complete, dataLoaded:', dataLoaded);
      }
    }
  };

  const applyFilters = () => {
    // Add null safety check
    if (!allSessions || !Array.isArray(allSessions)) {
      console.warn('⚠️ allSessions is not ready yet:', allSessions);
      setDisplayedSessions([]);
      setTotalPages(1);
      return;
    }
    
    console.log('🔍 Applying filters:', {
      allSessionsCount: allSessions.length,
      selectedCoach,
      selectedCategory,
      searchTerm,
      currentPage
    });
    
    let filtered = [...allSessions];
    
    // Apply filters
    if (selectedCoach !== 'all') {
      filtered = filtered.filter(s => s.coach === selectedCoach);
      console.log(`🏃‍♂️ After coach filter (${selectedCoach}):`, filtered.length);
    }
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(s => s.category === selectedCategory);
      console.log(`📂 After category filter (${selectedCategory}):`, filtered.length);
    }
    
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(s =>
        s.title.toLowerCase().includes(searchLower) ||
        s.notes.toLowerCase().includes(searchLower) ||
        s.file_name?.toLowerCase().includes(searchLower)
      );
      console.log(`🔎 After search filter (${searchTerm}):`, filtered.length);
    }
    
    // Update total count and pages
    setTotalCount(filtered.length);
    setTotalPages(Math.ceil(filtered.length / ITEMS_PER_PAGE));
    
    // Get current page items
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const displayed = filtered.slice(start, end);
    
    console.log(`📄 Page ${currentPage}: showing ${displayed.length} of ${filtered.length} total`);
    setDisplayedSessions(displayed);
  };

  // Optimized preview loading
  const loadPreviews = async (sessionIds: string[]) => {
    setLoadingPreviews(prev => {
      const newSet = new Set(prev);
      sessionIds.forEach(id => newSet.add(id));
      return newSet;
    });

    await Promise.all(
      sessionIds.map(async (sessionId) => {
        try {
          // First get the session data
          const session = displayedSessions.find(s => s.id === sessionId);
          if (!session) return;

          // Use videoPreloadService to get preview URL (not blob)
          const previewUrl = await videoPreloadService.getVideoPreview(
            sessionId,
            session.video_url,
            session.smart_start_time || 0
          );

          if (previewUrl) {
            setPreviewUrls(prev => {
              const newMap = new Map(prev);
              newMap.set(sessionId, previewUrl);
              return newMap;
            });
            setPreviewsReady(prev => {
              const newMap = new Map(prev);
              newMap.set(sessionId, true);
              return newMap;
            });
          }
        } catch (error) {
          console.error(`Failed to load preview for ${sessionId}:`, error);
        } finally {
          setLoadingPreviews(prev => {
            const newSet = new Set(prev);
            newSet.delete(sessionId);
            return newSet;
          });
        }
      })
    );
  };

  const loadFullVideoUrl = async (sessionId: string): Promise<string | null> => {
    // Check cache first
    const cached = fullVideoUrlCache.get(sessionId);
    if (cached) return cached;
    
    try {
      const response = await fetch('/api/student/sessions/urls', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          session_ids: [sessionId],
          full_video: true
        }),
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        const url = data.urls[sessionId];
        if (url) {
          fullVideoUrlCache.set(sessionId, url);
          return url;
        }
      }
    } catch (error) {
      console.error('Error loading full video URL:', error);
    }
    return null;
  };

  // Load session URLs (video and audio)
  const loadSessionUrls = async (sessionId: string): Promise<{ video_url?: string; audio_url?: string } | null> => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4101';
      // Find the session data to pass along
      const session = displayedSessions.find(s => s.id === sessionId);
      const response = await fetch(`${apiUrl}/api/student/sessions/urls`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          sessionIds: [sessionId],
          sessions: session ? [session] : []
        }),
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.urls?.[sessionId] || null;
      }
    } catch (error) {
      console.error('Error loading session URLs:', error);
    }
    return null;
  };

  // Load session URLs in batch
  const loadSessionUrlsBatch = async (sessionIds: string[]) => {
    // Skip if already loading
    const toLoad = sessionIds.filter(id => !loadingUrls.has(id) && !sessionUrls[id]);
    if (toLoad.length === 0) return;
    
    console.log('Loading URLs for sessions:', toLoad);
    
    try {
      // Mark sessions as loading
      setLoadingUrls(prev => new Set([...prev, ...toLoad]));

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4101';
      // Get session data for the sessions we're loading
      const sessionsToLoad = displayedSessions.filter(s => toLoad.includes(s.id));
      const response = await fetch(`${apiUrl}/api/student/sessions/urls`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          sessionIds: toLoad,
          sessions: sessionsToLoad
        }),
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Process URLs to include audio URLs
        const processedUrls: { [key: string]: { url?: string; audio_url?: string; expiresAt?: string } } = {};
        
        Object.entries(data.urls).forEach(([sessionId, urlData]: [string, any]) => {
          processedUrls[sessionId] = {
            url: urlData.url || urlData.video_url,
            audio_url: urlData.audio_url,
            expiresAt: urlData.expiresAt
          };
        });
        
        // Update URLs state
        setSessionUrls(prev => ({
          ...prev,
          ...processedUrls
        }));
        
        // Update displayed sessions with URLs
        setDisplayedSessions(prevSessions => 
          prevSessions.map(session => {
            const urlData = data.urls[session.id];
            if (urlData) {
              return {
                ...session,
                video_url: urlData.url || session.video_url,
                audio_url: urlData.audio_url || session.audio_url
              };
            }
            return session;
          })
        );
      }
    } catch (error) {
      console.error('Error fetching session URLs:', error);
    } finally {
      // Remove from loading set
      setLoadingUrls(prev => {
        const newSet = new Set(prev);
        toLoad.forEach(id => newSet.delete(id));
        return newSet;
      });
    }
  };

  // Optimized video click handler for YouTube-style player
  const handleVideoClick = useCallback(async (session: Session) => {
    setIsVideoLoading(true);
    setVideoError(null);
    
    // Create a copy of the session with potential URL updates
    let updatedSession = { ...session };
    
    try {
      // Check if we need to load URLs
      const needsUrlLoading = (!session.video_url && session.has_video !== false) || 
                             (!session.audio_url && (session.has_audio || session.session_type === 'audio'));
      
      if (needsUrlLoading) {
        // Load URLs from the backend
        const urls = await loadSessionUrls(session.id);
        
        if (urls) {
          updatedSession = {
            ...session,
            video_url: urls.url || urls.video_url || session.video_url,
            audio_url: urls.audio_url || session.audio_url
          };
          
          // Update the session with audio URL in state
          setDisplayedSessions(prevSessions => 
            prevSessions.map(s => 
              s.id === session.id ? { ...s, audio_url: updatedSession.audio_url } : s
            )
          );
        }
      }
      
      // Set the updated session as current
      setCurrentVideo(updatedSession);
      setPlayingVideo(updatedSession);
      setPlayerMode(true);
      setIsVideoLoading(false);
      
      // If it's a video session, start playing after a short delay
      if (updatedSession.video_url && updatedSession.has_video !== false) {
      }
    } catch (error) {
      console.error('Error loading video:', error);
      setVideoError('Failed to load video. Please try again.');
      setIsVideoLoading(false);
    }
  }, []);

  // Optimized hover handler with debouncing
  const hoverTimeoutRef = useRef<NodeJS.Timeout>();
  
  const handleVideoHover = useCallback((sessionId: string) => {
    setHoveredVideo(sessionId);
    
    // Debounce preview loading
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    
    hoverTimeoutRef.current = setTimeout(() => {
      if (!previewUrls.has(sessionId) && !loadingPreviews.has(sessionId)) {
        loadPreviews([sessionId]);
      }
    }, 200); // 200ms delay before loading preview
    
    // Set video to smart start time
    const session = displayedSessions.find(s => s.id === sessionId);
    if (session?.smart_start_time && previewUrls.has(sessionId)) {
      const video = videoRefs.current[sessionId];
      if (video && video.readyState >= 2) {
        video.currentTime = session.smart_start_time || 0;
      }
    }
  }, [displayedSessions, previewUrls, loadingPreviews]);
  
  const handleVideoLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setHoveredVideo(null);
  }, []);
  
  // Prefetch adjacent videos when one is selected
  useEffect(() => {
    if (currentVideo && displayedSessions.length > 0) {
      const currentIndex = displayedSessions.findIndex(s => s.id === currentVideo.id);
      const adjacentIds = [
        ...displayedSessions.slice(Math.max(0, currentIndex - 2), currentIndex),
        ...displayedSessions.slice(currentIndex + 1, Math.min(displayedSessions.length, currentIndex + 3))
      ].map(s => s.id);
      
      videoPreloadService.prefetchVideos(adjacentIds);
    }
  }, [currentVideo, displayedSessions]);

  const toggleMute = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    setMutedVideos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId);
      } else {
        newSet.add(sessionId);
      }
      return newSet;
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const formatDuration = (duration: string) => {
    const [minutes] = duration.split(':');
    const mins = parseInt(minutes);
    if (mins >= 60) {
      const hours = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      return `${hours}h ${remainingMins}m`;
    }
    return `${mins}m`;
  };

  // Render YouTube-style player
  const renderPlayer = () => {
    if (!playerMode || !currentVideo) return null;
    
    return (
      <PlayerLayout>
        <MainVideoSection>
          <VideoContainer>
            <CloseButton onClick={() => {
              setPlayerMode(false);
              setCurrentVideo(null);
              if (mainVideoRef.current) {
                mainVideoRef.current.pause();
              }
            }}>
              <X size={24} />
            </CloseButton>
            
            {isVideoLoading && (
              <LoadingOverlay>
                <Loader size={48} color="#FF5733" className="spinning" />
              </LoadingOverlay>
            )}
            
            {videoError && (
              <LoadingOverlay>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ color: '#fff', marginBottom: '20px' }}>{videoError}</p>
                  <button 
                    onClick={() => handleVideoClick(currentVideo)}
                    style={{
                      padding: '10px 20px',
                      background: '#FF5733',
                      border: 'none',
                      borderRadius: '4px',
                      color: '#fff',
                      cursor: 'pointer'
                    }}
                  >
                    Retry
                  </button>
                </div>
              </LoadingOverlay>
            )}
            
            <MainVideo
              ref={mainVideoRef}
              src={currentVideo.video_url}
              controls
              autoPlay
              onError={() => setVideoError('Video playback error')}
              onLoadedData={() => {
                setIsVideoLoading(false);
                setVideoError(null); // Clear any previous errors
              }}
              onCanPlay={() => {
                setIsVideoLoading(false);
                setVideoError(null); // Clear any previous errors
              }}
              onLoadedMetadata={(e) => {
                const video = e.currentTarget;
                if (currentVideo.smart_start_time) {
                  video.currentTime = currentVideo.smart_start_time;
                }
              }}
            />
          </VideoContainer>
          
          <VideoInfoSection>
            <MainVideoTitle>{currentVideo.title}</MainVideoTitle>
            <MainVideoMeta>
              {currentVideo.coach} • {currentVideo.date} • Week {currentVideo.week}
            </MainVideoMeta>
          </VideoInfoSection>
        </MainVideoSection>
        
        <Sidebar>
          <SidebarHeader>
            <h3>Other Sessions</h3>
          </SidebarHeader>
          
          <SidebarVideos>
            {(displayedSessions || []).map(session => (
              <SidebarVideoCard
                key={session.id}
                isActive={session.id === currentVideo.id}
                onClick={() => handleVideoClick(session)}
                onMouseEnter={() => handleVideoHover(session.id)}
                onMouseLeave={handleVideoLeave}
              >
                <SidebarThumbnail>
                  {/* Show video preview on hover */}
                  {hoveredVideo === session.id && session.video_url ? (
                    <video
                      src={session.video_url}
                      muted
                      autoPlay
                      loop
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onLoadedMetadata={(e) => {
                        const video = e.currentTarget;
                        if (session.smart_start_time) {
                          video.currentTime = session.smart_start_time;
                        }
                      }}
                    />
                  ) : session.thumbnail ? (
                    <img 
                      src={session.thumbnail} 
                      alt={session.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ 
                      width: '100%', 
                      height: '100%', 
                      background: 'linear-gradient(135deg, #1a1a1a, #2a2a2a)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Play size={24} color="rgba(255,255,255,0.3)" />
                    </div>
                  )}
                </SidebarThumbnail>
                
                <SidebarVideoInfo>
                  <SidebarVideoTitle>{session.title}</SidebarVideoTitle>
                  <SidebarVideoMeta>
                    {session.coach} • Week {session.week}
                  </SidebarVideoMeta>
                </SidebarVideoInfo>
              </SidebarVideoCard>
            ))}
          </SidebarVideos>
        </Sidebar>
      </PlayerLayout>
    );
  };

  const renderPagination = () => {
    const pages = [];
    const maxVisible = 7;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    
    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(
        <PageButton
          key={i}
          isActive={i === currentPage}
          onClick={() => {
            setCurrentPage(i);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          {i}
        </PageButton>
      );
    }
    
    return (
      <PaginationContainer>
        <PageButton
          onClick={() => {
            setCurrentPage(prev => Math.max(1, prev - 1));
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          disabled={currentPage === 1}
        >
          <ChevronLeft size={16} />
        </PageButton>
        
        {start > 1 && (
          <>
            <PageButton onClick={() => setCurrentPage(1)}>1</PageButton>
            {start > 2 && <span style={{ color: 'var(--theme-text-muted)' }}>...</span>}
          </>
        )}
        
        {pages}
        
        {end < totalPages && (
          <>
            {end < totalPages - 1 && <span style={{ color: 'var(--theme-text-muted)' }}>...</span>}
            <PageButton onClick={() => setCurrentPage(totalPages)}>{totalPages}</PageButton>
          </>
        )}
        
        <PageButton
          onClick={() => {
            setCurrentPage(prev => Math.min(totalPages, prev + 1));
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          disabled={currentPage === totalPages}
        >
          <ChevronRight size={16} />
        </PageButton>
        
        <PageInfo>
          Page {currentPage} of {totalPages} | {totalCount} videos
        </PageInfo>
      </PaginationContainer>
    );
  };

  return (
    <>
      <Container>
      <Header>
        <HeaderContent>
          <TitleRow>
            <Title>My Coaching Sessions</Title>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <ThemeToggle onClick={toggleTheme}>
                {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
                {theme === 'light' ? 'Dark' : 'Light'} Mode
              </ThemeToggle>
              <VideoCount>
              {dataLoaded && (
                <>
                  <span>{totalCount} total videos</span>
                  {loadedFromCache && (
                    <CacheIndicator cached>
                      ⚡ Cached
                    </CacheIndicator>
                  )}
                  {process.env.NODE_ENV === 'development' && (
                    <>
                      <span style={{ fontSize: '0.7rem', opacity: 0.6, marginLeft: '8px' }}>
                        | Cache: {hasCachedMetadata() ? 'Yes' : 'No'}
                      </span>
                      <button
                        onClick={() => {
                          console.log('🔍 Cache debug:', {
                            hasCache: hasCachedMetadata(),
                            cachedData: getCachedMetadata(),
                            localStorage: localStorage.getItem('ivy_sessions_metadata_cache')
                          });
                        }}
                        style={{
                          marginLeft: '8px',
                          padding: '2px 8px',
                          fontSize: '0.7rem',
                          background: 'rgba(255, 255, 255, 0.1)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '4px',
                          color: 'white',
                          cursor: 'pointer'
                        }}
                      >
                        Debug Cache
                      </button>
                      <button
                        onClick={() => {
                          console.log('🔄 Manual reload triggered');
                          loadAllMetadata();
                        }}
                        style={{
                          marginLeft: '8px',
                          padding: '2px 8px',
                          fontSize: '0.7rem',
                          background: 'rgba(255, 74, 35, 0.2)',
                          border: '1px solid rgba(255, 74, 35, 0.4)',
                          borderRadius: '4px',
                          color: 'white',
                          cursor: 'pointer'
                        }}
                      >
                        Force Reload
                      </button>
                      <button
                        onClick={() => {
                          console.log('🐛 Debug state:', {
                            loading,
                            dataLoaded,
                            hasCache: cachedData.hasCache,
                            allSessions: allSessions.length,
                            displayedSessions: displayedSessions.length,
                            totalCount
                          });
                        }}
                        style={{
                          marginLeft: '8px',
                          padding: '2px 8px',
                          fontSize: '0.7rem',
                          background: 'rgba(0, 255, 0, 0.2)',
                          border: '1px solid rgba(0, 255, 0, 0.4)',
                          borderRadius: '4px',
                          color: 'white',
                          cursor: 'pointer'
                        }}
                      >
                        Debug State
                      </button>
                    </>
                  )}
                </>
              )}
              </VideoCount>
            </div>
          </TitleRow>
          
          <FilterRow>
            <SearchContainer>
              <SearchIcon />
              <SearchInput
                type="text"
                placeholder="Search sessions..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </SearchContainer>
            
            <Select 
              value={selectedCategory} 
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">All Types</option>
              {(categories || []).map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </Select>
            
            <Select 
              value={selectedCoach} 
              onChange={(e) => {
                setSelectedCoach(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">All Coaches</option>
              {(coaches || []).map(coach => (
                <option key={coach} value={coach}>{coach}</option>
              ))}
            </Select>
          </FilterRow>
        </HeaderContent>
      </Header>

      {loading && !isMetadataCached && displayedSessions.length === 0 && (
        <VideoGrid>
          {[...Array(8)].map((_, index) => (
            <SkeletonCard key={`skeleton-${index}`}>
              <SkeletonThumbnail />
              <SkeletonContent>
                <SkeletonTitle />
                <SkeletonMeta />
              </SkeletonContent>
            </SkeletonCard>
          ))}
        </VideoGrid>
      )}

      {!loading && !dataLoaded && (
        <EmptyState>
          <h3>Failed to load sessions</h3>
          <p>Please check your connection and refresh the page</p>
        </EmptyState>
      )}

      {/* Show skeleton loader while loading */}
      {showSkeleton && !dataLoaded && (
        <VideoGrid>
          {Array.from({ length: 12 }).map((_, index) => (
            <SkeletonCard key={`skeleton-${index}`}>
              <SkeletonThumbnail />
              <SkeletonContent>
                <SkeletonTitle />
                <SkeletonMeta />
              </SkeletonContent>
            </SkeletonCard>
          ))}
        </VideoGrid>
      )}
      
      {/* Show actual content when loaded */}
      {(dataLoaded || isMetadataCached) && displayedSessions && displayedSessions.length > 0 && (
      <VideoGrid>
        {displayedSessions.map(session => {
          const isHovered = hoveredVideo === session.id;
          const previewUrl = previewUrls.get(session.id) || previewUrlCache.get(session.id);
          
          return (
            <VideoCard
              key={session.id}
              ref={(el) => { cardRefs.current[session.id] = el; }}
              isHovered={isHovered}
              isLoading={loadingPreviews.has(session.id)}
              onMouseEnter={() => handleVideoHover(session.id)}
              onMouseLeave={handleVideoLeave}
              onClick={() => handleVideoClick(session)}
            >
              <VideoThumbnail>
                <ThumbnailGradient isGamePlan={session.category === 'Game Plan'} />
                
                {session.thumbnail ? (
                  <ThumbnailImage src={session.thumbnail} alt={session.title} />
                ) : (
                  <ThumbnailPlaceholder category={session.category} />
                )}
                
                {isHovered && loadingPreviews.has(session.id) && (
                  <PreviewLoadingOverlay>
                    <LoadingSpinner>
                      <Loader size={32} color="rgba(255, 255, 255, 0.8)" />
                    </LoadingSpinner>
                  </PreviewLoadingOverlay>
                )}
                
                {isHovered && previewUrl && previewsReady.get(session.id) && (
                  <PreviewVideo
                    ref={el => videoRefs.current[session.id] = el}
                    src={previewUrl}
                    muted={!mutedVideos.has(session.id)}
                    loop
                    playsInline
                    autoPlay
                    onLoadedMetadata={(e) => {
                      const video = e.currentTarget;
                      if (session.smart_start_time) {
                        video.currentTime = session.smart_start_time;
                      }
                    }}
                    onError={(e) => {
                      console.error('Video preview error:', e);
                      // Remove failed preview from ready state
                      setPreviewsReady(prev => {
                        const newMap = new Map(prev);
                        newMap.delete(session.id);
                        return newMap;
                      });
                    }}
                  />
                )}
                
                <PlayButton isHovered={isHovered}>
                  <Play size={24} color="#fff" fill="#fff" />
                </PlayButton>
                
                <DurationBadge>
                  {formatDuration(session.duration)}
                </DurationBadge>
                
                {isHovered && previewUrl && (
                  <HoverControls>
                    <MuteButton onClick={(e) => toggleMute(e, session.id)}>
                      {mutedVideos.has(session.id) ? <Volume2 size={16} /> : <VolumeX size={16} />}
                    </MuteButton>
                  </HoverControls>
                )}
                
                {(session.category === 'Check-in' || session.category === 'Game Plan') && (
                  <CategoryBadge type={session.category}>
                    {session.category === 'Check-in' ? '168 Hour' : session.category}
                  </CategoryBadge>
                )}
              </VideoThumbnail>
              
              <VideoInfo>
                <VideoTitle>{session.title || 'No Title'}</VideoTitle>
                <VideoMeta>
                  <span>{session.coach || 'Unknown Coach'} • {session.student || 'Huda'}</span>
                  <span>•</span>
                  <span>{session.date ? formatDate(session.date) : 'No Date'}</span>
                </VideoMeta>
                
                {/* File type indicators */}
                <FileIndicators>
                  <FileIndicator $available={session.has_video !== false}>
                    <Video />
                    Video
                  </FileIndicator>
                  <FileIndicator $available={!!session.has_audio}>
                    <Headphones />
                    Audio
                  </FileIndicator>
                  <FileIndicator $available={!!session.has_transcript}>
                    <FileText />
                    Transcript
                  </FileIndicator>
                  <FileIndicator $available={!!session.has_insights}>
                    <Brain />
                    Insights
                  </FileIndicator>
                </FileIndicators>
                
                {session.week && (
                  <WeekBadge>Week {session.week}</WeekBadge>
                )}
                {session.file_size && (
                  <VideoDetails>
                    <span>{session.file_size}</span>
                    {session.session_id && (
                      <>
                        <span>•</span>
                        <span style={{ opacity: 0.5, fontSize: '0.65rem' }}>
                          ID: {session.session_id}
                        </span>
                      </>
                    )}
                  </VideoDetails>
                )}
                {/* Debug info */}
                {process.env.NODE_ENV === 'development' && (
                  <div style={{ fontSize: '0.6rem', opacity: 0.6, marginTop: '4px' }}>
                    DEBUG: {session.coach} | {session.date} | Week {session.week}
                  </div>
                )}
              </VideoInfo>
            </VideoCard>
          );
        })}
      </VideoGrid>
      )}

      {totalPages > 1 && renderPagination()}

      {displayedSessions.length === 0 && (dataLoaded || isMetadataCached) && (
        <EmptyState>
          <h3>No videos found</h3>
          <p>Try adjusting your search or filters</p>
        </EmptyState>
      )}
      
    </Container>
    
    {/* Enhanced Media Player Modal */}
    {(playingVideo || currentVideo) && (
      <PlayerModal>
        <PlayerContent>
          <MainVideoSection>
            <EnhancedVideoContainer>
              <CloseButtonStyled onClick={() => {
                setPlayingVideo(null);
                setCurrentVideo(null);
                setPlayerMode(false);
              }}>
                <X />
              </CloseButtonStyled>
              <EnhancedMediaPlayer 
                session={currentVideo || playingVideo} 
                onClose={() => {
                  setPlayingVideo(null);
                  setCurrentVideo(null);
                  setPlayerMode(false);
                }}
              />
            </EnhancedVideoContainer>
            <VideoInfoSection>
              <MainVideoTitle>{(currentVideo || playingVideo)?.title}</MainVideoTitle>
              <MainVideoMeta>
                {(currentVideo || playingVideo)?.coach && `${(currentVideo || playingVideo)?.coach} • `}
                {(currentVideo || playingVideo)?.category} • {(currentVideo || playingVideo)?.date && new Date((currentVideo || playingVideo).date).toLocaleDateString()}
              </MainVideoMeta>
              <VideoDescription>
                <div style={{ marginBottom: '8px' }}>
                  <strong>Description:</strong> {(currentVideo || playingVideo)?.description}
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <strong>Duration:</strong> {(currentVideo || playingVideo)?.duration}
                </div>
                {(currentVideo || playingVideo)?.week && (
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Week:</strong> {(currentVideo || playingVideo)?.week}
                  </div>
                )}
                {(currentVideo || playingVideo)?.progress !== undefined && (
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Progress:</strong> {(currentVideo || playingVideo)?.progress}% watched
                  </div>
                )}
              </VideoDescription>
            </VideoInfoSection>
          </MainVideoSection>
          
          <Sidebar>
            <SidebarHeader>
              <h3>Other Sessions</h3>
            </SidebarHeader>
            
            <SidebarVideos>
              {displayedSessions.filter(session => session.id !== (currentVideo || playingVideo)?.id).map((session) => (
                <SidebarVideoCard
                  key={session.id}
                  isActive={session.id === (currentVideo || playingVideo)?.id}
                  onClick={() => {
                    setCurrentVideo(session);
                    setPlayingVideo(session);
                  }}
                >
                  <SidebarThumbnailContainer>
                    <img 
                      src={session.thumbnail || '/api/placeholder/120/67'} 
                      alt={session.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </SidebarThumbnailContainer>
                  <SidebarVideoInfo>
                    <SidebarVideoTitle>{session.title}</SidebarVideoTitle>
                    <SidebarVideoMeta>
                      {session.coach && `${session.coach} • `}{session.duration}
                    </SidebarVideoMeta>
                  </SidebarVideoInfo>
                </SidebarVideoCard>
              ))}
            </SidebarVideos>
          </Sidebar>
        </PlayerContent>
      </PlayerModal>
    )}
  </>
  );
};