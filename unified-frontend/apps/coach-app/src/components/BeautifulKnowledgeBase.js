import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../App';
import { collection, getDocs, query, limit, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  VideoIcon, BookIcon, UserIcon, CalendarIcon, ClockIcon, 
  SearchIcon, FilterIcon, PlayIcon, StarIcon, ChartIcon,
  ICON_COLORS 
} from './Icons';

const BeautifulKnowledgeBase = () => {
  const authContext = useContext(AuthContext);
  const currentUser = authContext.userData || authContext.user;
  const [videos, setVideos] = useState([]);
  const [filteredVideos, setFilteredVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCoach, setSelectedCoach] = useState('all');

  useEffect(() => {
    loadVideos();
  }, []);

  useEffect(() => {
    filterVideos();
  }, [videos, searchTerm, selectedCategory, selectedCoach]);

  const loadVideos = async () => {
    try {
      console.log('Loading videos for Knowledge Base...');
      const videosRef = collection(db, 'indexed_videos');
      const q = query(videosRef, orderBy('uploadDate', 'desc'), limit(500));
      const snapshot = await getDocs(q);
      
      const videoData = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        const filename = data.filename || '';
        const folderPath = data.folderPath || '';
        
        // FIRST: Skip all Quick Check-ins (TRIVIAL_ files)
        if (filename.includes('TRIVIAL_') || data.category === 'Quick Check-in') {
          return; // Skip this video
        }
        
        // SECOND: Skip all Miscellaneous content
        if (folderPath.includes('/Miscellaneous/') || 
            filename.includes('MISC_') || 
            data.category === 'Miscellaneous') {
          return; // Skip this video
        }
        
        // THIRD: Only include proper coaching sessions
        const isCoachingSession = 
          filename.startsWith('Coaching_') || 
          filename.startsWith('GamePlan_') ||
          data.category === 'student_sessions' ||
          data.category === 'game_plan_reports';
          
        if (!isCoachingSession) {
          return; // Skip non-coaching content
        }
        
        // Extract coach and student names from filename
        let coachName = data.parsedCoach || data.coach;
        let studentName = data.parsedStudent || data.student;
        
        // Parse from filename structure: Coaching_B_Rishi_Aaryan_Wk01_...
        // or GamePlan_B_Andrew_Advay_Wk10_...
        if (filename && (filename.startsWith('Coaching_') || filename.startsWith('GamePlan_'))) {
          const parts = filename.split('_');
          if (parts.length >= 4) {
            // parts[0] = 'Coaching' or 'GamePlan'
            // parts[1] = 'B' (or 'A')
            // parts[2] = Coach name
            // parts[3] = Student name
            const filenameCoach = parts[2];
            const filenameStudent = parts[3];
            
            // Use filename data if database data is missing or unknown
            if (!coachName || coachName === 'Unknown' || coachName === 'Unknown Coach' || coachName === 'unknown') {
              if (filenameCoach && filenameCoach !== 'unknown' && filenameCoach !== 'Unknown') {
                coachName = filenameCoach;
              }
            }
            
            if (!studentName || studentName === 'Unknown' || studentName === 'Unknown Student' || studentName === 'unknown') {
              if (filenameStudent && filenameStudent !== 'unknown' && filenameStudent !== 'Unknown') {
                studentName = filenameStudent;
              }
            }
          }
        }
        
        // If still unknown, try to extract from folder path
        // folderPath like: "Ivylevel Knowledge Base/Students/Aaryan/Coaching_B_Rishi_Aaryan_Wk01_..."
        if ((coachName === 'Unknown' || coachName === 'unknown' || !coachName) || 
            (studentName === 'Unknown' || studentName === 'unknown' || !studentName)) {
          const folderPath = data.folderPath || '';
          const folderParts = folderPath.split('/');
          if (folderParts.length >= 4) {
            const folderFilename = folderParts[folderParts.length - 1];
            if (folderFilename && (folderFilename.startsWith('Coaching_') || folderFilename.startsWith('GamePlan_'))) {
              const folderFilenameParts = folderFilename.split('_');
              if (folderFilenameParts.length >= 4) {
                const folderCoach = folderFilenameParts[2];
                const folderStudent = folderFilenameParts[3];
                
                if (!coachName || coachName === 'Unknown' || coachName === 'unknown') {
                  if (folderCoach && folderCoach !== 'unknown' && folderCoach !== 'Unknown') {
                    coachName = folderCoach;
                  }
                }
                
                if (!studentName || studentName === 'Unknown' || studentName === 'unknown') {
                  if (folderStudent && folderStudent !== 'unknown' && folderStudent !== 'Unknown') {
                    studentName = folderStudent;
                  }
                }
              }
            }
          }
        }
        
        videoData.push({
          id: doc.id,
          title: data.title || data.properTitle || data.originalTitle || 'Untitled',
          coach: coachName || 'Unknown',
          student: studentName || 'Unknown',
          category: data.category || 'General',
          duration: data.duration || '30:00',
          date: data.sessionDate || data.uploadDate,
          week: data.parsedWeek || extractWeekFromTitle(data.title || data.originalTitle),
          driveId: data.driveId,
          sessionType: data.sessionType || 'coaching_session',
          tags: data.tags || [],
          filename: data.filename || '',
          folderPath: data.folderPath || ''
        });
      });
      
      console.log(`Loaded ${videoData.length} coaching videos (filtered from ${snapshot.size} total)`);
      setVideos(videoData);
      setFilteredVideos(videoData);
    } catch (err) {
      console.error('Error loading videos:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const extractWeekFromTitle = (title) => {
    const weekMatch = title?.match(/Week\s+(\d+)/i);
    return weekMatch ? parseInt(weekMatch[1]) : null;
  };

  const parseTitle = (title, coach, student, category) => {
    let cleaned = title;
    const dateMatch = cleaned.match(/\((\d{4}-\d{2}-\d{2})\)/);
    const weekMatch = cleaned.match(/Week\s+(\d+)/i);
    
    // Remove date from title if present
    if (dateMatch) {
      cleaned = cleaned.replace(/\s*\([^)]+\)\s*$/, '');
    }
    
    // Handle different title patterns
    if (cleaned.startsWith('Gameplan & ')) {
      // Fix "Gameplan & A/B - Week X" to "Coach & Student Game Plan - Week X"
      if (coach && student && coach !== 'Unknown' && student !== 'Unknown') {
        const weekPart = weekMatch ? ` - Week ${weekMatch[1]}` : '';
        cleaned = `${coach} & ${student} Game Plan${weekPart}`;
      }
    } else if (cleaned.match(/^B\s*&\s*[A-Za-z]+\s*-\s*Week/i)) {
      // Fix "B & Rishi - Week X" to "Rishi & Student - Week X"
      if (coach && student && coach !== 'Unknown' && student !== 'Unknown') {
        const weekPart = weekMatch ? ` - Week ${weekMatch[1]}` : '';
        cleaned = `${coach} & ${student}${weekPart}`;
      }
    } else if (cleaned.match(/^[A-Za-z]+\s*-\s*Week/i)) {
      // Fix "Rishi - Week X" to "Rishi & Student - Week X"
      if (coach && student && coach !== 'Unknown' && student !== 'Unknown') {
        const weekPart = weekMatch ? ` - Week ${weekMatch[1]}` : '';
        cleaned = `${coach} & ${student}${weekPart}`;
      }
    } else if (cleaned.includes('Unknown')) {
      // Fix any title with "Unknown" in it
      if (coach && student && coach !== 'Unknown' && student !== 'Unknown') {
        const weekPart = weekMatch ? ` - Week ${weekMatch[1]}` : '';
        cleaned = `${coach} & ${student}${weekPart}`;
      }
    }
    
    // Clean up any remaining "B & " prefix
    cleaned = cleaned.replace(/^B\s*&\s*/i, '');
    
    return {
      displayTitle: cleaned,
      date: dateMatch ? dateMatch[1] : null,
      week: weekMatch ? weekMatch[1] : null
    };
  };

  const filterVideos = () => {
    let filtered = [...videos];
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(video => 
        video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        video.coach.toLowerCase().includes(searchTerm.toLowerCase()) ||
        video.student.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(video => video.category === selectedCategory);
    }
    
    // Coach filter
    if (selectedCoach !== 'all') {
      filtered = filtered.filter(video => video.coach === selectedCoach);
    }
    
    setFilteredVideos(filtered);
  };

  const getCategories = () => {
    const categories = new Set(videos.map(v => v.category));
    return ['all', ...Array.from(categories)];
  };

  const getCoaches = () => {
    const coaches = new Set(videos.map(v => v.coach).filter(c => c !== 'Unknown'));
    return ['all', ...Array.from(coaches).sort()];
  };

  const getCategoryColor = (category) => {
    const colors = {
      'student_sessions': '#FF4A23',
      'game_plan_reports': '#641432',
      'execution_documents': '#FFE5DF',
      'Quick Check-in': '#FF6B47',
      'General': '#6B7280'
    };
    return colors[category] || '#6B7280';
  };

  const getCategoryIcon = (category) => {
    switch(category) {
      case 'student_sessions': return <VideoIcon size={16} />;
      case 'game_plan_reports': return <ChartIcon size={16} />;
      case 'execution_documents': return <BookIcon size={16} />;
      default: return <VideoIcon size={16} />;
    }
  };

  const formatDuration = (duration) => {
    if (!duration || duration === '30:00') return '30 min';
    const parts = duration.split(':');
    if (parts.length >= 2) {
      const hours = parseInt(parts[0]);
      const minutes = parseInt(parts[1]);
      if (hours > 0) return `${hours}h ${minutes}m`;
      return `${minutes} min`;
    }
    return duration;
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '400px',
        gap: '16px'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '4px solid #FFE5DF',
          borderTopColor: '#FF4A23',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <h2 style={{ color: '#641432', margin: 0 }}>Loading Knowledge Base...</h2>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Error Loading Knowledge Base</h2>
        <p style={{ color: 'red' }}>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '40px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ 
          fontSize: '3rem', 
          fontWeight: 'bold', 
          color: '#641432', 
          marginBottom: '12px',
          lineHeight: '1.2'
        }}>
          Ivylevel Knowledge Base
        </h1>
        <p style={{ color: '#6b7280', fontSize: '1.25rem', marginBottom: '24px' }}>
          Explore {videos.length} coaching sessions to enhance your skills
        </p>

        {/* User Welcome Card */}
        {currentUser && (
          <div style={{
            background: 'linear-gradient(135deg, #FFE5DF, #FFF5F3)',
            padding: '24px',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 12px rgba(100, 20, 50, 0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{
                width: '64px',
                height: '64px',
                background: '#FF4A23',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '24px',
                fontWeight: 'bold'
              }}>
                {currentUser.name?.charAt(0) || 'C'}
              </div>
              <div>
                <h2 style={{ margin: '0 0 4px 0', color: '#641432' }}>
                  Welcome back, {currentUser.name}!
                </h2>
                {currentUser.student && (
                  <p style={{ margin: 0, color: '#6b7280' }}>
                    Currently coaching: <strong>{currentUser.student.name}</strong> • {currentUser.student.grade} • {currentUser.student.focusArea}
                  </p>
                )}
              </div>
            </div>
            <div style={{
              display: 'flex',
              gap: '32px',
              padding: '0 24px'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#FF4A23' }}>
                  {filteredVideos.length}
                </div>
                <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>Videos</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#641432' }}>
                  {getCoaches().length - 1}
                </div>
                <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>Coaches</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <div style={{ 
        background: 'white',
        padding: '24px',
        borderRadius: '16px',
        marginBottom: '32px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
      }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          {/* Search Bar */}
          <div style={{ flex: '1', minWidth: '300px', position: 'relative' }}>
            <SearchIcon 
              size={20} 
              color="#6B7280" 
              style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              placeholder="Search by title, coach, or student..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px 12px 48px',
                border: '2px solid #E5E7EB',
                borderRadius: '12px',
                fontSize: '1rem',
                outline: 'none',
                transition: 'all 0.2s',
                '&:focus': {
                  borderColor: '#FF4A23'
                }
              }}
              onFocus={(e) => e.target.style.borderColor = '#FF4A23'}
              onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{
              padding: '12px 24px',
              border: '2px solid #E5E7EB',
              borderRadius: '12px',
              fontSize: '1rem',
              outline: 'none',
              cursor: 'pointer',
              minWidth: '180px',
              background: 'white'
            }}
          >
            {getCategories().map(cat => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All Categories' : cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </option>
            ))}
          </select>

          {/* Coach Filter */}
          <select
            value={selectedCoach}
            onChange={(e) => setSelectedCoach(e.target.value)}
            style={{
              padding: '12px 24px',
              border: '2px solid #E5E7EB',
              borderRadius: '12px',
              fontSize: '1rem',
              outline: 'none',
              cursor: 'pointer',
              minWidth: '180px',
              background: 'white'
            }}
          >
            {getCoaches().map(coach => (
              <option key={coach} value={coach}>
                {coach === 'all' ? 'All Coaches' : coach}
              </option>
            ))}
          </select>
        </div>

        {/* Active Filters */}
        {(searchTerm || selectedCategory !== 'all' || selectedCoach !== 'all') && (
          <div style={{ marginTop: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ color: '#6B7280', fontSize: '0.875rem' }}>Active filters:</span>
            {searchTerm && (
              <span style={{
                background: '#FFE5DF',
                color: '#641432',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '0.875rem'
              }}>
                Search: {searchTerm}
              </span>
            )}
            {selectedCategory !== 'all' && (
              <span style={{
                background: '#FFE5DF',
                color: '#641432',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '0.875rem'
              }}>
                {selectedCategory.replace(/_/g, ' ')}
              </span>
            )}
            {selectedCoach !== 'all' && (
              <span style={{
                background: '#FFE5DF',
                color: '#641432',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '0.875rem'
              }}>
                Coach: {selectedCoach}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Results Count */}
      <div style={{ marginBottom: '24px', color: '#6B7280' }}>
        Showing {filteredVideos.length} of {videos.length} videos
      </div>

      {/* Video Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', 
        gap: '24px' 
      }}>
        {filteredVideos.map(video => {
          const { displayTitle, date, week } = parseTitle(video.title, video.coach, video.student, video.category);
          
          return (
            <div key={video.id} style={{
              background: 'white',
              borderRadius: '16px',
              overflow: 'hidden',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              transform: 'translateY(0)',
              position: 'relative'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
              e.currentTarget.style.transform = 'translateY(-4px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}>
              {/* Category Bar */}
              <div style={{
                background: getCategoryColor(video.category),
                color: 'white',
                padding: '8px 16px',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                {getCategoryIcon(video.category)}
                {video.category.replace(/_/g, ' ')}
              </div>

              {/* Content */}
              <div style={{ padding: '20px' }}>
                {/* Title and Week */}
                <div style={{ marginBottom: '16px' }}>
                  <h3 style={{ 
                    fontWeight: 'bold', 
                    fontSize: '1.25rem',
                    color: '#1F2937',
                    marginBottom: '4px',
                    lineHeight: '1.4'
                  }}>
                    {displayTitle}
                  </h3>
                  {week && (
                    <span style={{
                      display: 'inline-block',
                      background: '#F3F4F6',
                      color: '#641432',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      fontWeight: '600'
                    }}>
                      Week {week}
                    </span>
                  )}
                </div>

                {/* Metadata Grid */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  marginBottom: '16px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6B7280' }}>
                    <UserIcon size={16} />
                    <span style={{ fontSize: '0.875rem' }}>
                      <strong>Coach:</strong> {video.coach}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6B7280' }}>
                    <UserIcon size={16} />
                    <span style={{ fontSize: '0.875rem' }}>
                      <strong>Student:</strong> {video.student}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6B7280' }}>
                    <ClockIcon size={16} />
                    <span style={{ fontSize: '0.875rem' }}>{formatDuration(video.duration)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6B7280' }}>
                    <CalendarIcon size={16} />
                    <span style={{ fontSize: '0.875rem' }}>{date || 'No date'}</span>
                  </div>
                </div>

                {/* Action Button */}
                {video.driveId && (
                  <a 
                    href={`https://drive.google.com/file/d/${video.driveId}/view`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      width: '100%',
                      padding: '12px 20px',
                      background: 'linear-gradient(135deg, #FF4A23, #FF6B47)',
                      color: 'white',
                      borderRadius: '10px',
                      textDecoration: 'none',
                      fontSize: '1rem',
                      fontWeight: 'bold',
                      transition: 'all 0.2s',
                      boxShadow: '0 2px 4px rgba(255, 74, 35, 0.3)'
                    }}
                    onClick={(e) => e.stopPropagation()}
                    onMouseEnter={(e) => {
                      e.target.style.transform = 'scale(1.02)';
                      e.target.style.boxShadow = '0 4px 8px rgba(255, 74, 35, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = 'scale(1)';
                      e.target.style.boxShadow = '0 2px 4px rgba(255, 74, 35, 0.3)';
                    }}
                  >
                    <PlayIcon size={20} />
                    Watch Session
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredVideos.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '80px 40px',
          color: '#6B7280'
        }}>
          <VideoIcon size={64} color="#E5E7EB" style={{ marginBottom: '16px' }} />
          <h3 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>No videos found</h3>
          <p>Try adjusting your filters or search terms</p>
        </div>
      )}
    </div>
  );
};

export default BeautifulKnowledgeBase;