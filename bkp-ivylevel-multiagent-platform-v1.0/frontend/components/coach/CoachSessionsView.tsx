import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { Play, Search, Clock, Calendar, Users, ChevronLeft, ChevronRight, Loader, X, Music, FileText, Headphones, Brain, Video, Sun, Moon, RefreshCw } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { VideoPlayer } from '../student/VideoPlayer';
import { NonVideoPlayer } from '../shared/NonVideoPlayer';
import { EnhancedMediaPlayer } from '../shared/EnhancedMediaPlayer';
import { videoPreloadService } from '../../services/videoPreloadService';
import { metadataCacheService, hasCachedMetadata, getCachedMetadata } from '../../services/metadataCacheService';
import API_ENDPOINTS from '../../config/api';

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
  background: var(--theme-bg-glass);
  backdrop-filter: var(--ivy-glass-blur);
  border: 1px solid var(--theme-border-glass);
  border-radius: var(--ivy-radius-xl);
  margin: 20px;
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
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: var(--theme-bg-glass);
  backdrop-filter: var(--ivy-glass-blur);
  border: 1px solid var(--theme-border-glass);
  border-radius: var(--ivy-radius-lg);
  color: var(--theme-text-primary);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--ivy-transition-fast);
  
  &:hover {
    background: var(--theme-bg-glass-hover);
    border-color: var(--theme-border-hover);
    transform: translateY(-1px);
  }
  
  svg {
    width: 16px;
    height: 16px;
  }
`;

const RefreshButton = styled.button<{ $loading?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: var(--theme-bg-glass);
  backdrop-filter: var(--ivy-glass-blur);
  border: 1px solid var(--theme-border-glass);
  border-radius: var(--ivy-radius-lg);
  color: var(--theme-text-primary);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--ivy-transition-fast);
  
  &:hover {
    background: var(--theme-bg-glass-hover);
    border-color: var(--theme-border-hover);
    transform: translateY(-1px);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  svg {
    width: 16px;
    height: 16px;
    animation: ${props => props.$loading ? 'spin 1s linear infinite' : 'none'};
  }
  
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
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

const CacheIndicator = styled.span<{ $cached?: boolean }>`
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 12px;
  background: ${props => props.$cached ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255, 193, 7, 0.2)'};
  color: ${props => props.$cached ? '#4CAF50' : '#FFC107'};
  font-weight: 500;
  cursor: pointer;
  transition: all var(--ivy-transition-fast);
  
  &:hover {
    background: ${props => props.$cached ? 'rgba(76, 175, 80, 0.3)' : 'rgba(255, 193, 7, 0.3)'};
    transform: scale(1.05);
  }
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
  }
`;

const FilterSelect = styled.select`
  padding: 12px 20px;
  background: var(--theme-bg-primary);
  border: 1px solid var(--theme-border-glass);
  border-radius: var(--ivy-radius-lg);
  color: var(--theme-text-primary);
  font-size: 0.875rem;
  outline: none;
  cursor: pointer;
  min-width: 150px;
  transition: all var(--ivy-transition-fast);
  
  &:hover {
    border-color: var(--ivy-primary);
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

const SessionsGrid = styled.div`
  padding: 20px;
  max-width: 1800px;
  margin: 0 auto;
`;

const GridContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
  
  @media (min-width: 640px) {
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  }
  
  @media (min-width: 1280px) {
    grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  }
`;

const SessionCard = styled.div`
  position: relative;
  background: var(--theme-bg-glass);
  backdrop-filter: var(--ivy-glass-blur);
  border: 1px solid var(--theme-border-glass);
  border-radius: var(--ivy-radius-xl);
  overflow: hidden;
  cursor: pointer;
  transition: all var(--ivy-transition-normal);
  will-change: transform;
  contain: layout style paint;
  box-shadow: var(--theme-shadow-glass);
  
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
    transform: translateY(-4px) scale(1.02);
    background: var(--theme-bg-glass-hover);
    border-color: var(--theme-border-hover);
    box-shadow: var(--ivy-glass-shadow-hover);
    z-index: 10;
  }
`;

const ThumbnailContainer = styled.div`
  position: relative;
  width: 100%;
  padding-bottom: 56.25%; // 16:9 aspect ratio
  background: var(--ivy-bg-gradient);
  overflow: hidden;
`;

const Thumbnail = styled.img`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const PreviewVideo = styled.video`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const PlayOverlay = styled.div<{ $visible: boolean }>`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: ${props => props.$visible ? 1 : 0};
  transition: opacity 0.3s ease;
`;

const PlayButton = styled.div`
  width: 60px;
  height: 60px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 1);
  }
  
  svg {
    width: 24px;
    height: 24px;
    color: #000;
    margin-left: 4px;
  }
`;

const SessionContent = styled.div`
  padding: 16px;
  background: var(--theme-bg-glass);
  backdrop-filter: var(--ivy-glass-blur);
`;

const SessionTitle = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: var(--theme-text-primary);
`;

const SessionMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  font-size: 0.875rem;
  color: var(--theme-text-secondary);
`;

const MetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  
  svg {
    width: 16px;
    height: 16px;
  }
`;

const FileIndicators = styled.div`
  display: flex;
  gap: 6px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--theme-border-glass);
`;

const FileIndicator = styled.div<{ $available: boolean }>`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: ${props => props.$available ? 'var(--ivy-glass-primary)' : 'var(--theme-bg-glass)'};
  border: 1px solid ${props => props.$available ? 'var(--ivy-glass-primary-border)' : 'var(--theme-border-glass)'};
  border-radius: var(--ivy-radius-full);
  font-size: 11px;
  color: ${props => props.$available ? 'var(--ivy-primary)' : 'var(--theme-text-disabled)'};
  font-weight: 500;
  
  svg {
    width: 12px;
    height: 12px;
  }
`;

const StudentBadge = styled.span`
  background: var(--ivy-glass-secondary);
  color: var(--ivy-secondary);
  padding: 2px 8px;
  border-radius: var(--ivy-radius-sm);
  font-size: 0.75rem;
  font-weight: 500;
`;

const CategoryBadge = styled.span`
  background: var(--ivy-glass-primary);
  color: var(--ivy-primary);
  padding: 2px 8px;
  border-radius: var(--ivy-radius-sm);
  font-size: 0.75rem;
  font-weight: 500;
`;

const SkeletonCard = styled.div`
  background: var(--theme-bg-glass);
  backdrop-filter: var(--ivy-glass-blur);
  border: 1px solid var(--theme-border-glass);
  border-radius: var(--ivy-radius-xl);
  overflow: hidden;
  animation: fadeIn 0.3s ease-out;
  
  @keyframes fadeIn {
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

const SkeletonThumbnail = styled.div`
  width: 100%;
  padding-bottom: 56.25%;
  background: var(--theme-skeleton-gradient);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  
  @keyframes shimmer {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }
`;

const SkeletonContent = styled.div`
  padding: 16px;
`;

const SkeletonText = styled.div<{ width?: string }>`
  height: 16px;
  background: var(--theme-skeleton-gradient);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
  width: ${props => props.width || '100%'};
  
  & + & {
    margin-top: 8px;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 80px 20px;
  color: var(--theme-text-secondary);
`;

const CacheWarning = styled.div`
  background: rgba(255, 193, 7, 0.1);
  border: 1px solid rgba(255, 193, 7, 0.3);
  border-radius: var(--ivy-radius-lg);
  padding: 12px 20px;
  margin: 0 20px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  color: var(--theme-text-primary);
  font-size: 0.875rem;
  animation: slideIn 0.3s ease-out;
  backdrop-filter: var(--ivy-glass-blur);
  
  @keyframes slideIn {
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

const LoadingOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--theme-overlay-heavy);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const LoadingSpinner = styled(Loader)`
  width: 48px;
  height: 48px;
  color: var(--theme-text-primary);
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;

const Pagination = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  padding: 20px 0;
  margin-bottom: 20px;
`;

const PageButton = styled.button<{ disabled?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  background: var(--theme-bg-glass);
  backdrop-filter: var(--ivy-glass-blur);
  border: 1px solid var(--theme-border-glass);
  border-radius: var(--ivy-radius-lg);
  color: ${props => props.disabled ? 'var(--theme-text-disabled)' : 'var(--theme-text-primary)'};
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: all var(--ivy-transition-fast);
  
  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.3);
  }
  
  svg {
    width: 20px;
    height: 20px;
  }
`;

const PageInfo = styled.span`
  color: var(--theme-text-secondary);
  font-size: 0.875rem;
`;

// Modal styles for YouTube-style player
const PlayerModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--theme-bg-primary);
  z-index: 1000;
  display: flex;
`;

const PlayerContent = styled.div`
  flex: 1;
  display: flex;
  height: 100vh;
`;

const VideoContainer = styled.div`
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

const MainVideoSection = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--theme-bg-secondary);
`;

const VideoInfoSection = styled.div`
  padding: 20px;
  background: var(--theme-bg-glass);
  backdrop-filter: var(--ivy-glass-blur);
  border-top: 1px solid var(--theme-border-glass);
`;

const MainVideoTitle = styled.h2`
  font-size: 1.25rem;
  margin-bottom: 12px;
  color: var(--theme-text-primary);
`;

const MainVideoMeta = styled.div`
  color: var(--theme-text-secondary);
  font-size: 0.9rem;
  margin-bottom: 16px;
`;

const VideoDescription = styled.div`
  color: var(--theme-text-secondary);
  font-size: 0.875rem;
  line-height: 1.5;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 20px;
  right: 20px;
  background: var(--theme-bg-glass);
  backdrop-filter: var(--ivy-glass-blur);
  border: 1px solid var(--theme-border-glass);
  color: var(--theme-text-primary);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 1000;
  box-shadow: var(--theme-shadow-glass);
  
  &:hover {
    background: var(--theme-bg-glass-hover);
    transform: scale(1.05);
    box-shadow: var(--ivy-glass-shadow-hover);
  }
  
  svg {
    width: 20px;
    height: 20px;
  }
`;

const VideoElement = styled.video`
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
`;

const Sidebar = styled.div`
  width: 400px;
  background: var(--theme-bg-secondary);
  overflow-y: auto;
  border-left: 1px solid var(--theme-border-glass);
`;

const SidebarHeader = styled.div`
  padding: 20px;
  border-bottom: 1px solid var(--theme-border-glass);
`;

const SidebarTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: var(--ivy-primary);
`;

const SidebarVideos = styled.div`
  padding: 20px;
`;

const SidebarVideoCard = styled.div<{ $active?: boolean }>`
  display: flex;
  gap: 12px;
  padding: 12px;
  margin-bottom: 12px;
  background: ${props => props.$active ? 'var(--ivy-glass-primary)' : 'var(--theme-bg-glass)'};
  backdrop-filter: var(--ivy-glass-blur);
  border: 1px solid ${props => props.$active ? 'var(--ivy-glass-primary-border)' : 'var(--theme-border-glass)'};
  border-radius: var(--ivy-radius-lg);
  cursor: pointer;
  transition: all var(--ivy-transition-normal);
  
  &:hover {
    background: var(--theme-bg-glass-hover);
    border-color: var(--theme-border-hover);
    transform: translateX(4px);
    box-shadow: var(--theme-shadow-glass);
  }
`;

const SidebarThumbnailContainer = styled.div`
  position: relative;
  width: 120px;
  height: 67px;
  background: var(--theme-bg-secondary);
  border-radius: var(--ivy-radius-md);
  overflow: hidden;
  flex-shrink: 0;
`;

const SidebarVideoInfo = styled.div`
  flex: 1;
`;

const SidebarVideoTitle = styled.h4`
  font-size: 0.875rem;
  font-weight: 500;
  margin: 0 0 4px 0;
  color: var(--theme-text-primary);
`;

const SidebarVideoMeta = styled.div`
  font-size: 0.75rem;
  color: var(--theme-text-secondary);
`;

interface Session {
  id: string;
  title: string;
  description: string;
  duration: string;
  student: string;
  category: string;
  thumbnail: string;
  video_url?: string;
  audio_url?: string;
  date: string;
  watched: boolean;
  progress: number;
  week?: number;
  file_name?: string;
  file_key?: string;
  smart_start_time?: number;
  preview_url?: string;
  session_type?: 'video' | 'audio' | 'transcript';
  has_video?: boolean;
  has_audio?: boolean;
  has_transcript?: boolean;
  has_insights?: boolean;
  session_folder?: string;
}

interface CoachSessionsViewProps {
  onClose?: () => void;
}

export const CoachSessionsView: React.FC<CoachSessionsViewProps> = ({ onClose }) => {
  console.log('🎬 CoachSessionsView: Component mounted');
  const { theme, toggleTheme } = useTheme();
  
  const sessionsPerPage = 20;
  
  // Get current user for caching
  const token = localStorage.getItem('token') || '';
  const userId = token.split('_')[2] || 'unknown'; // Extract user ID from token
  
  // Initialize from cache if available
  const initializeFromCache = () => {
    const cachedData = metadataCacheService.get('all_metadata');
    if (cachedData && cachedData.data) {
      console.log('✅ Loading coach sessions from cache');
      const cachedSessions = cachedData.data.sessions || [];
      
      // Check if cached data might be stale (only showing few sessions)
      const isSuspiciouslySmall = cachedSessions.length <= 2;
      
      // Extract unique students and categories from cached sessions
      const uniqueStudents = [...new Set(cachedSessions.map(s => s.student))].sort();
      const uniqueCategories = [...new Set(cachedSessions.map(s => s.category))].sort();
      
      return {
        sessions: cachedSessions,
        students: uniqueStudents,
        categories: uniqueCategories,
        totalPages: cachedData.data.totalPages || 1,
        hasCache: true,
        isSuspiciouslySmall
      };
    }
    return {
      sessions: [],
      students: [],
      categories: [],
      totalPages: 1,
      hasCache: false,
      isSuspiciouslySmall: false
    };
  };
  
  const cachedData = initializeFromCache();
  
  const [allSessions, setAllSessions] = useState<Session[]>(cachedData.sessions);
  const [sessions, setSessions] = useState<Session[]>(cachedData.sessions);
  const [filteredSessions, setFilteredSessions] = useState<Session[]>(cachedData.sessions.slice(0, sessionsPerPage));
  const [loading, setLoading] = useState(!cachedData.hasCache);
  const [dataLoaded, setDataLoaded] = useState(cachedData.hasCache);
  const [isFiltering, setIsFiltering] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [students, setStudents] = useState<string[]>(cachedData.students);
  const [categories, setCategories] = useState<string[]>(cachedData.categories);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(cachedData.totalPages);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [hoveredVideo, setHoveredVideo] = useState<string | null>(null);
  const [isMetadataCached, setIsMetadataCached] = useState(cachedData.hasCache);
  const [sessionUrls, setSessionUrls] = useState<{ [key: string]: { url: string; preview_url: string; audio_url?: string } }>({});
  const [urlsFetched, setUrlsFetched] = useState(false);
  const [visibleSessions, setVisibleSessions] = useState<Set<string>>(new Set());
  const [loadingUrls, setLoadingUrls] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCacheWarning, setShowCacheWarning] = useState(false);
  
  const observerRef = useRef<IntersectionObserver | null>(null);
  const cardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const previewVideoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load all metadata on mount if not cached
  useEffect(() => {
    if (!dataLoaded) {
      loadAllMetadata();
    } else {
      // Check if we should show cache warning
      if (cachedData.isSuspiciouslySmall && isMetadataCached) {
        setShowCacheWarning(true);
      }
      
      // Do a silent background refresh to ensure data is fresh
      setTimeout(() => {
        loadAllMetadata(true);
      }, 2000);
    }
  }, [dataLoaded]);
  
  // Handle pagination and filtering
  useEffect(() => {
    if (allSessions.length > 0) {
      applyFiltersAndPagination();
    }
  }, [currentPage, selectedStudent, selectedCategory, searchTerm, allSessions]);

  // Initialize Intersection Observer
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const updates = new Set(visibleSessions);
        
        entries.forEach((entry) => {
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

  // Load URLs for visible sessions
  useEffect(() => {
    if (visibleSessions.size > 0 && filteredSessions.length > 0) {
      const sessionsToLoad = Array.from(visibleSessions)
        .filter(id => !sessionUrls[id] && !loadingUrls.has(id))
        .slice(0, 5); // Load up to 5 at a time
      
      if (sessionsToLoad.length > 0) {
        loadSessionUrls(sessionsToLoad);
      }
      
      // Prefetch adjacent videos for smooth scrolling
      const visibleArray = Array.from(visibleSessions);
      visibleArray.forEach(sessionId => {
        const allIds = filteredSessions.map(s => s.id);
        videoPreloadService.prefetchAdjacentVideos(sessionId, allIds);
      });
    }
  }, [visibleSessions, filteredSessions]);

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
  }, [filteredSessions]);

  // Remove this useEffect as filtering is now handled in applyFiltersAndPagination

  const loadAllMetadata = async (silentRefresh = false) => {
    // Check cache first
    const cachedData = metadataCacheService.get('all_metadata');
    
    if (cachedData && cachedData.data && !silentRefresh) {
      console.log('✅ Using cached coach metadata');
      const cachedSessions = cachedData.data.sessions || [];
      
      // Extract unique students and categories from actual sessions
      const uniqueStudents = [...new Set(cachedSessions.map(s => s.student))].sort();
      const uniqueCategories = [...new Set(cachedSessions.map(s => s.category))].sort();
      
      setAllSessions(cachedSessions);
      setSessions(cachedSessions);
      setStudents(uniqueStudents);  // Use students from actual sessions
      setCategories(uniqueCategories);  // Use categories from actual sessions
      setTotalPages(cachedData.data.totalPages || 1);
      setDataLoaded(true);
      setLoading(false);
      setIsMetadataCached(true);
      return;
    }
    
    if (!silentRefresh) {
      console.log('📡 Fetching all coach metadata from server');
      setLoading(true);
    } else {
      console.log('🔄 Silent background refresh for coach metadata');
    }
    
    try {
      // Fetch ALL metadata at once with high limit
      const response = await fetch(`${API_ENDPOINTS.coach.sessions}?page=1&limit=1000&metadata_only=true`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch sessions');
      }
      
      const data = await response.json();
      const allSessionsData = data.sessions || [];
      
      console.log(`📊 Loaded ${allSessionsData.length} total sessions`);
      
      // Cache the metadata (don't cache students/categories as we derive them from sessions)
      metadataCacheService.set('all_metadata', {
        sessions: allSessionsData,
        totalPages: Math.ceil(allSessionsData.length / sessionsPerPage)
      });
      
      // Extract unique students from actual sessions
      const uniqueStudents = [...new Set(allSessionsData.map(s => s.student))].sort();
      const uniqueCategories = [...new Set(allSessionsData.map(s => s.category))].sort();
      
      console.log(`📊 Found ${uniqueStudents.length} students with sessions:`, uniqueStudents);
      
      setAllSessions(allSessionsData);
      setSessions(allSessionsData);
      setStudents(uniqueStudents);  // Use students from actual sessions, not API
      setCategories(uniqueCategories);  // Use categories from actual sessions
      setTotalPages(Math.ceil(allSessionsData.length / sessionsPerPage));
      setIsMetadataCached(true);
      setDataLoaded(true);
      
      // Hide cache warning if we got sufficient data
      if (allSessionsData.length > 2) {
        setShowCacheWarning(false);
      }
      
      // Clear URLs when new sessions are loaded
      setSessionUrls({});
      setLoadingUrls(new Set());
    } catch (error) {
      console.error('Error fetching sessions:', error);
      setAllSessions([]);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };
  
  const applyFiltersAndPagination = () => {
    setIsFiltering(true);
    
    // Use allSessions but preserve URLs from sessionUrls
    let filtered = allSessions.map(session => {
      const urlData = sessionUrls[session.id];
      if (urlData) {
        return {
          ...session,
          video_url: urlData.url || session.video_url,
          preview_url: urlData.preview_url || session.preview_url,
          audio_url: urlData.audio_url || session.audio_url
        };
      }
      return session;
    });
    
    // Apply filters
    if (selectedStudent) {
      console.log(`🔍 Filtering for student: "${selectedStudent}"`);
      console.log('Available students in sessions:', [...new Set(allSessions.map(s => s.student))]);
      filtered = filtered.filter(s => s.student === selectedStudent);
      console.log(`Found ${filtered.length} sessions for ${selectedStudent}`);
    }
    
    if (selectedCategory) {
      filtered = filtered.filter(s => s.category === selectedCategory);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(session =>
        session.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session.student.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Update total pages based on filtered results
    const newTotalPages = Math.ceil(filtered.length / sessionsPerPage);
    setTotalPages(newTotalPages);
    
    // Apply pagination
    const startIdx = (currentPage - 1) * sessionsPerPage;
    const endIdx = startIdx + sessionsPerPage;
    const paginated = filtered.slice(startIdx, endIdx);
    
    setSessions(paginated);
    setFilteredSessions(paginated);
    
    // Reset visible sessions to trigger URL loading for the new filtered set
    setVisibleSessions(new Set());
    
    // Clear filtering state after a short delay
    setTimeout(() => setIsFiltering(false), 100);
  };

  const loadSessionUrls = async (sessionIds: string[]) => {
    // Skip if already loading
    const toLoad = sessionIds.filter(id => !loadingUrls.has(id) && !sessionUrls[id]);
    if (toLoad.length === 0) {
      console.log('URLs already loaded for sessions:', sessionIds);
      return sessionUrls; // Return existing URLs
    }
    
    console.log('Loading URLs for sessions:', toLoad);
    
    try {
      // Mark sessions as loading
      setLoadingUrls(prev => new Set([...prev, ...sessionIds]));
      
      const sessionData = sessionIds
        .map(id => sessions.find(s => s.id === id))
        .filter(s => s)
        .map(s => ({
          id: s!.id,
          file_key: s!.file_key,
          smart_start_time: s!.smart_start_time,
          session_type: s!.session_type,
          session_folder: s!.session_folder
        }));

      const response = await fetch(API_ENDPOINTS.coach.sessionUrls, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify({ sessions: sessionData }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Update URLs state
        setSessionUrls(prev => ({
          ...prev,
          ...data.urls
        }));
        
        // Update sessions with URLs
        setSessions(prevSessions => 
          prevSessions.map(session => {
            const urlData = data.urls[session.id];
            if (urlData) {
              return {
                ...session,
                video_url: urlData.url,
                preview_url: urlData.preview_url,
                audio_url: urlData.audio_url || session.audio_url
              };
            }
            return session;
          })
        );
        
        // Also update allSessions to preserve URLs across filtering
        setAllSessions(prevSessions => 
          prevSessions.map(session => {
            const urlData = data.urls[session.id];
            if (urlData) {
              return {
                ...session,
                video_url: urlData.url,
                preview_url: urlData.preview_url,
                audio_url: urlData.audio_url || session.audio_url
              };
            }
            return session;
          })
        );
        
        // Also update filteredSessions
        setFilteredSessions(prevSessions => 
          prevSessions.map(session => {
            const urlData = data.urls[session.id];
            if (urlData) {
              return {
                ...session,
                video_url: urlData.url,
                preview_url: urlData.preview_url,
                audio_url: urlData.audio_url || session.audio_url
              };
            }
            return session;
          })
        );
        
        // Update selected session if it's one of the loaded sessions
        setSelectedSession(prevSelected => {
          if (prevSelected && data.urls[prevSelected.id]) {
            const urlData = data.urls[prevSelected.id];
            return {
              ...prevSelected,
              video_url: urlData.url,
              preview_url: urlData.preview_url,
              audio_url: urlData.audio_url || prevSelected.audio_url
            };
          }
          return prevSelected;
        });
        
        return data.urls; // Return the loaded URLs
      }
    } catch (error) {
      console.error('Error fetching session URLs:', error);
      return null;
    } finally {
      // Remove from loading set
      setLoadingUrls(prev => {
        const newSet = new Set(prev);
        sessionIds.forEach(id => newSet.delete(id));
        return newSet;
      });
    }
  };

  const handleVideoHover = useCallback((sessionId: string) => {
    setHoveredVideo(sessionId);
    
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    
    hoverTimeoutRef.current = setTimeout(async () => {
      const session = sessions.find(s => s.id === sessionId);
      if (session) {
        // Load URL if not loaded
        if (!sessionUrls[sessionId] && !loadingUrls.has(sessionId)) {
          loadSessionUrls([sessionId]);
        } else if (session.video_url) {
          // Ensure video is loaded
          const videoEl = previewVideoRefs.current[sessionId];
          if (videoEl && session.smart_start_time) {
            try {
              videoEl.currentTime = session.smart_start_time;
            } catch (error) {
              console.error('Error setting video time:', error);
            }
          }
        }
      }
    }, 500);
  }, [sessions]);

  const handleVideoLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setHoveredVideo(null);
  }, []);

  const openVideo = async (session: Session) => {
    // Load URL if not already loaded (for video or audio)
    const needsUrlLoading = (!session.video_url && session.has_video !== false) || 
                           (!session.audio_url && (session.has_audio || session.session_type === 'audio'));
    
    if (needsUrlLoading && !loadingUrls.has(session.id)) {
      const urlData = await loadSessionUrls([session.id]);
      
      // Check if we got URL data back
      if (urlData && urlData[session.id]) {
        const updatedSession = {
          ...session,
          video_url: urlData[session.id].url || session.video_url,
          preview_url: urlData[session.id].preview_url || session.preview_url,
          audio_url: urlData[session.id].audio_url || session.audio_url
        };
        setSelectedSession(updatedSession);
      } else {
        // Fallback: wait a bit for state updates and try to find in collections
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const updatedSession = filteredSessions.find(s => s.id === session.id) || 
                             allSessions.find(s => s.id === session.id) ||
                             session;
        setSelectedSession(updatedSession);
      }
    } else {
      setSelectedSession(session);
    }
  };

  const closeVideo = () => {
    setSelectedSession(null);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    // Clear the cache for the current user
    const cacheKey = `coach_metadata_${userId}`;
    metadataCacheService.clearUserCache(userId);
    
    // Clear all state
    setSessionUrls({});
    setLoadingUrls(new Set());
    setVisibleSessions(new Set());
    setIsMetadataCached(false);
    setAllSessions([]);
    setSessions([]);
    setFilteredSessions([]);
    
    // Force reload all metadata
    await loadAllMetadata(false);
    
    setIsRefreshing(false);
  };

  const renderSkeletons = () => {
    return Array.from({ length: 8 }).map((_, index) => (
      <SkeletonCard key={`skeleton-${index}`}>
        <SkeletonThumbnail />
        <SkeletonContent>
          <SkeletonText width="80%" />
          <SkeletonText width="60%" />
        </SkeletonContent>
      </SkeletonCard>
    ));
  };

  // Don't show loading screen if we have cached data
  // This ensures instant display of sessions

  return (
    <>
      <Container>
        <Header>
          <HeaderContent>
            <TitleRow>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                {onClose && (
                  <button
                    onClick={onClose}
                    style={{
                      background: 'var(--theme-bg-glass)',
                      backdropFilter: 'var(--ivy-glass-blur)',
                      border: '1px solid var(--theme-border-glass)',
                      borderRadius: 'var(--ivy-radius-lg)',
                      padding: '8px 16px',
                      color: 'var(--theme-text-primary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--theme-bg-glass-hover)';
                      e.currentTarget.style.borderColor = 'var(--theme-border-hover)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--theme-bg-glass)';
                      e.currentTarget.style.borderColor = 'var(--theme-border-glass)';
                    }}
                  >
                    <ChevronLeft size={16} />
                    Back to Dashboard
                  </button>
                )}
                <Title>My Student Sessions</Title>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <VideoCount>
                  <Users size={18} />
                  {filteredSessions.length} videos
                  {selectedStudent && ` • ${selectedStudent}`}
                  <CacheIndicator 
                    $cached={isMetadataCached}
                    onClick={handleRefresh}
                    title={isMetadataCached ? 'Click to refresh data' : 'Live data'}
                  >
                    {isMetadataCached ? 'Cached' : 'Live'}
                  </CacheIndicator>
                </VideoCount>
                <RefreshButton onClick={handleRefresh} disabled={isRefreshing} $loading={isRefreshing}>
                  <RefreshCw size={16} />
                  {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </RefreshButton>
                <ThemeToggle onClick={toggleTheme}>
                  {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
                  {theme === 'light' ? 'Dark' : 'Light'} Mode
                </ThemeToggle>
              </div>
            </TitleRow>
            <FilterRow>
              <SearchContainer>
                <SearchIcon />
                <SearchInput
                  type="text"
                  placeholder="Search sessions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </SearchContainer>
              <FilterSelect
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
              >
                <option value="">All Students</option>
                {students.map(student => (
                  <option key={student} value={student}>{student}</option>
                ))}
              </FilterSelect>
              <FilterSelect
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </FilterSelect>
            </FilterRow>
          </HeaderContent>
        </Header>

        {showCacheWarning && (
          <CacheWarning>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <RefreshCw size={18} style={{ color: '#FFC107' }} />
              <span>
                You're viewing cached data that may be incomplete. Only {allSessions.length} sessions are shown.
              </span>
            </div>
            <RefreshButton 
              onClick={() => {
                setShowCacheWarning(false);
                handleRefresh();
              }}
              style={{ 
                padding: '6px 12px', 
                fontSize: '0.8rem',
                background: 'rgba(255, 193, 7, 0.2)',
                borderColor: 'rgba(255, 193, 7, 0.4)'
              }}
            >
              Refresh Now
            </RefreshButton>
          </CacheWarning>
        )}

        <SessionsGrid>
          {(loading || isFiltering) && filteredSessions.length === 0 ? (
            <GridContainer>
              {renderSkeletons()}
            </GridContainer>
          ) : filteredSessions.length === 0 && dataLoaded && !isFiltering ? (
            <EmptyState>
              <h2>No sessions found</h2>
              <p>Try adjusting your filters or search terms</p>
            </EmptyState>
          ) : (
            <>
              <GridContainer>
                {filteredSessions.map((session) => (
                  <SessionCard
                    key={session.id}
                    ref={el => cardRefs.current[session.id] = el}
                    onClick={() => openVideo(session)}
                    onMouseEnter={() => handleVideoHover(session.id)}
                    onMouseLeave={handleVideoLeave}
                  >
                    <ThumbnailContainer>
                      {hoveredVideo === session.id && session.video_url ? (
                        <PreviewVideo
                          ref={el => previewVideoRefs.current[session.id] = el}
                          src={session.video_url}
                          muted
                          autoPlay
                          loop
                          playsInline
                          onLoadedMetadata={(e) => {
                            if (session.smart_start_time) {
                              e.currentTarget.currentTime = session.smart_start_time;
                            }
                          }}
                        />
                      ) : (
                        <>
                          <Thumbnail src={session.thumbnail} alt={session.title} />
                          {!session.has_video && (
                            <div style={{
                              position: 'absolute',
                              top: '50%',
                              left: '50%',
                              transform: 'translate(-50%, -50%)',
                              background: 'rgba(0, 0, 0, 0.8)',
                              padding: '12px 24px',
                              borderRadius: '8px',
                              color: 'white',
                              fontSize: '14px',
                              fontWeight: '500',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}>
                              {session.has_audio ? (
                                <>
                                  <Music size={20} />
                                  Audio Only
                                </>
                              ) : (
                                <>
                                  <FileText size={20} />
                                  Transcript Only
                                </>
                              )}
                            </div>
                          )}
                        </>
                      )}
                      <PlayOverlay $visible={hoveredVideo === session.id && session.has_video !== false}>
                        <PlayButton>
                          <Play />
                        </PlayButton>
                      </PlayOverlay>
                    </ThumbnailContainer>
                    <SessionContent>
                      <SessionTitle>{session.title}</SessionTitle>
                      <SessionMeta>
                        <MetaItem>
                          <Users size={16} />
                          <StudentBadge>{session.student}</StudentBadge>
                        </MetaItem>
                        <MetaItem>
                          <CategoryBadge>{session.category}</CategoryBadge>
                        </MetaItem>
                        <MetaItem>
                          <Clock size={16} />
                          {session.duration}
                        </MetaItem>
                        <MetaItem>
                          <Calendar size={16} />
                          {new Date(session.date).toLocaleDateString()}
                        </MetaItem>
                      </SessionMeta>
                      <FileIndicators>
                        <FileIndicator $available={session.has_video !== false}>
                          <Video size={12} />
                          Video
                        </FileIndicator>
                        <FileIndicator $available={session.has_audio || false}>
                          <Headphones size={12} />
                          Audio
                        </FileIndicator>
                        <FileIndicator $available={session.has_transcript || false}>
                          <FileText size={12} />
                          Transcript
                        </FileIndicator>
                        <FileIndicator $available={session.has_insights || false}>
                          <Brain size={12} />
                          Insights
                        </FileIndicator>
                      </FileIndicators>
                    </SessionContent>
                  </SessionCard>
                ))}
              </GridContainer>

              {totalPages > 1 && (
                <Pagination>
                  <PageButton
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft />
                  </PageButton>
                  
                  {/* Page numbers */}
                  {(() => {
                    const pageNumbers = [];
                    const maxVisible = 5;
                    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
                    let end = Math.min(totalPages, start + maxVisible - 1);
                    
                    if (end - start + 1 < maxVisible) {
                      start = Math.max(1, end - maxVisible + 1);
                    }
                    
                    if (start > 1) {
                      pageNumbers.push(
                        <PageButton key={1} onClick={() => setCurrentPage(1)}>
                          1
                        </PageButton>
                      );
                      if (start > 2) {
                        pageNumbers.push(
                          <PageInfo key="dots1" style={{ padding: '0 8px', color: 'var(--theme-text-muted)' }}>...</PageInfo>
                        );
                      }
                    }
                    
                    for (let i = start; i <= end; i++) {
                      pageNumbers.push(
                        <PageButton
                          key={i}
                          onClick={() => setCurrentPage(i)}
                          style={{
                            background: i === currentPage ? 'var(--ivy-primary)' : 'var(--theme-bg-glass)',
                            color: i === currentPage ? 'white' : 'var(--theme-text-primary)',
                            border: i === currentPage ? '1px solid var(--ivy-primary)' : '1px solid var(--theme-border-glass)',
                          }}
                        >
                          {i}
                        </PageButton>
                      );
                    }
                    
                    if (end < totalPages) {
                      if (end < totalPages - 1) {
                        pageNumbers.push(
                          <PageInfo key="dots2" style={{ padding: '0 8px', color: 'var(--theme-text-muted)' }}>...</PageInfo>
                        );
                      }
                      pageNumbers.push(
                        <PageButton key={totalPages} onClick={() => setCurrentPage(totalPages)}>
                          {totalPages}
                        </PageButton>
                      );
                    }
                    
                    return pageNumbers;
                  })()}
                  
                  <PageButton
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight />
                  </PageButton>
                </Pagination>
              )}
            </>
          )}
        </SessionsGrid>
      </Container>

      {selectedSession && (
        <PlayerModal>
          <PlayerContent>
            <MainVideoSection>
              <VideoContainer>
                <CloseButton onClick={closeVideo}>
                  <X />
                </CloseButton>
                <EnhancedMediaPlayer session={selectedSession} onClose={closeVideo} />
              </VideoContainer>
              <VideoInfoSection>
                <MainVideoTitle>{selectedSession.title}</MainVideoTitle>
                <MainVideoMeta>
                  {selectedSession.student} • {selectedSession.category} • {new Date(selectedSession.date).toLocaleDateString()}
                </MainVideoMeta>
                <VideoDescription>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Description:</strong> {selectedSession.description}
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Duration:</strong> {selectedSession.duration}
                  </div>
                  {selectedSession.week && (
                    <div style={{ marginBottom: '8px' }}>
                      <strong>Week:</strong> {selectedSession.week}
                    </div>
                  )}
                  {selectedSession.progress > 0 && (
                    <div>
                      <strong>Progress:</strong> {selectedSession.progress}% watched
                    </div>
                  )}
                </VideoDescription>
              </VideoInfoSection>
            </MainVideoSection>
            
            <Sidebar>
              <SidebarHeader>
                <SidebarTitle>Other Sessions</SidebarTitle>
              </SidebarHeader>
              
              <SidebarVideos>
                {filteredSessions.map((session) => (
                  <SidebarVideoCard
                    key={session.id}
                    $active={session.id === selectedSession.id}
                    onClick={() => openVideo(session)}
                    onMouseEnter={() => handleVideoHover(session.id)}
                    onMouseLeave={handleVideoLeave}
                  >
                    <SidebarThumbnailContainer>
                      {hoveredVideo === session.id && session.video_url ? (
                        <PreviewVideo
                          src={session.video_url}
                          muted
                          autoPlay
                          loop
                          playsInline
                          onLoadedMetadata={(e) => {
                            if (session.smart_start_time) {
                              e.currentTarget.currentTime = session.smart_start_time;
                            }
                          }}
                        />
                      ) : (
                        <Thumbnail src={session.thumbnail} alt={session.title} />
                      )}
                    </SidebarThumbnailContainer>
                    <SidebarVideoInfo>
                      <SidebarVideoTitle>{session.title}</SidebarVideoTitle>
                      <SidebarVideoMeta>
                        {session.student} • {session.duration}
                      </SidebarVideoMeta>
                    </SidebarVideoInfo>
                  </SidebarVideoCard>
                ))}
              </SidebarVideos>
            </Sidebar>
          </PlayerContent>
        </PlayerModal>
      )}

      {loading && sessions.length > 0 && (
        <LoadingOverlay>
          <LoadingSpinner />
        </LoadingOverlay>
      )}
    </>
  );
};