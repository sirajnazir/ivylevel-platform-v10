import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../App';
import { collection, getDocs, query, limit, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { VideoIcon, BookIcon, UserIcon, ICON_COLORS } from './Icons';

const SimpleKnowledgeBase = () => {
  const authContext = useContext(AuthContext);
  const currentUser = authContext.userData || authContext.user;
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      console.log('Loading videos for Knowledge Base...');
      const videosRef = collection(db, 'indexed_videos');
      const q = query(videosRef, orderBy('uploadDate', 'desc'), limit(50));
      const snapshot = await getDocs(q);
      
      const videoData = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        videoData.push({
          id: doc.id,
          title: data.title || data.properTitle || data.originalTitle || 'Untitled',
          coach: data.parsedCoach || data.coach || 'Unknown',
          student: data.parsedStudent || data.student || 'Unknown',
          category: data.category || 'General',
          duration: data.duration || '30:00',
          date: data.sessionDate || data.uploadDate,
          driveId: data.driveId
        });
      });
      
      console.log(`Loaded ${videoData.length} videos`);
      setVideos(videoData);
    } catch (err) {
      console.error('Error loading videos:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Loading Knowledge Base...</h2>
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
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#641432', marginBottom: '8px' }}>
          Knowledge Base
        </h1>
        <p style={{ color: '#6b7280', fontSize: '1.125rem' }}>
          Welcome {currentUser?.name || 'Coach'}! Explore coaching sessions to enhance your skills.
        </p>
      </div>

      {/* User Info */}
      {currentUser && (
        <div style={{
          background: '#FFE5DF',
          padding: '20px',
          borderRadius: '12px',
          marginBottom: '32px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <UserIcon size={24} color={ICON_COLORS.primary} />
          <div>
            <div style={{ fontWeight: 'bold' }}>{currentUser.name}</div>
            {currentUser.student && (
              <div style={{ color: '#6b7280' }}>
                Coaching: {currentUser.student.name} ({currentUser.student.grade})
              </div>
            )}
          </div>
        </div>
      )}

      {/* Video Grid */}
      <div>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <VideoIcon size={24} color={ICON_COLORS.primary} />
          Available Sessions ({videos.length})
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
          {videos.map(video => (
            <div key={video.id} style={{
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '20px',
              transition: 'all 0.2s',
              cursor: 'pointer',
              ':hover': {
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                transform: 'translateY(-2px)'
              }
            }}>
              <h3 style={{ fontWeight: 'bold', marginBottom: '8px', color: '#641432' }}>
                {video.title}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: '#6b7280' }}>
                <div>Coach: {video.coach}</div>
                <div>Student: {video.student}</div>
                <div>Category: {video.category}</div>
                <div>Duration: {video.duration}</div>
              </div>
              {video.driveId && (
                <a 
                  href={`https://drive.google.com/file/d/${video.driveId}/view`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-block',
                    marginTop: '12px',
                    padding: '8px 16px',
                    background: '#FF4A23',
                    color: 'white',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    fontWeight: 'bold'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  Watch Video
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SimpleKnowledgeBase;