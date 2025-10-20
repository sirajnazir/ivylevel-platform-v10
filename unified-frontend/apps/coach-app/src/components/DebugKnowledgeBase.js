import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../App';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from '../firebase';

const DebugKnowledgeBase = () => {
  const authContext = useContext(AuthContext);
  const currentUser = authContext.user || authContext.userData || authContext.currentUser;
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState([]);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState({});

  useEffect(() => {
    loadVideos();
  }, [currentUser]);

  const loadVideos = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Log current user info
      console.log('Debug: Auth Context:', authContext);
      console.log('Debug: Current User:', currentUser);
      setDebugInfo(prev => ({ ...prev, authContext, currentUser }));

      // Try simple query first
      console.log('Debug: Attempting simple query...');
      const videosRef = collection(db, 'indexed_videos');
      const q = query(videosRef, limit(10));
      const snapshot = await getDocs(q);
      
      console.log(`Debug: Found ${snapshot.size} videos`);
      
      const videoData = [];
      snapshot.forEach(doc => {
        videoData.push({ id: doc.id, ...doc.data() });
      });
      
      setVideos(videoData);
      setDebugInfo(prev => ({ ...prev, videoCount: videoData.length }));
      
      // If we have a user, try filtered query
      const coachName = authContext.userData?.name || currentUser?.name;
      if (coachName) {
        console.log('Debug: Attempting filtered query for coach:', coachName);
        const coachQuery = query(
          videosRef, 
          where('parsedCoach', '==', coachName),
          limit(10)
        );
        
        try {
          const coachSnapshot = await getDocs(coachQuery);
          console.log(`Debug: Found ${coachSnapshot.size} videos for coach ${coachName}`);
          
          const coachVideos = [];
          coachSnapshot.forEach(doc => {
            coachVideos.push({ id: doc.id, ...doc.data() });
          });
          
          setDebugInfo(prev => ({ 
            ...prev, 
            coachName,
            coachVideoCount: coachSnapshot.size,
            coachVideos: coachVideos.slice(0, 3) // Show first 3 for debug
          }));
        } catch (queryError) {
          console.error('Debug: Coach query failed:', queryError);
          setDebugInfo(prev => ({ ...prev, coachQueryError: queryError.message }));
        }
      } else {
        setDebugInfo(prev => ({ ...prev, noCoachName: true }));
      }
      
    } catch (err) {
      console.error('Debug: Error loading videos:', err);
      setError(err.message);
      setDebugInfo(prev => ({ ...prev, error: err.message }));
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading debug view...</div>;

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '2rem', marginBottom: '24px' }}>Debug Knowledge Base</h2>
      
      <div style={{ 
        background: '#f3f4f6', 
        padding: '20px', 
        borderRadius: '8px', 
        marginBottom: '24px',
        fontFamily: 'monospace',
        fontSize: '14px'
      }}>
        <h3>Debug Information:</h3>
        <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
      </div>

      {error && (
        <div style={{ 
          background: '#fee', 
          padding: '20px', 
          borderRadius: '8px', 
          marginBottom: '24px',
          color: '#c00'
        }}>
          Error: {error}
        </div>
      )}

      <div>
        <h3 style={{ marginBottom: '16px' }}>Videos ({videos.length}):</h3>
        {videos.length === 0 ? (
          <p>No videos found</p>
        ) : (
          <div style={{ display: 'grid', gap: '16px' }}>
            {videos.map(video => (
              <div key={video.id} style={{ 
                padding: '16px', 
                background: 'white', 
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}>
                <h4>{video.title || video.originalTitle || 'Untitled'}</h4>
                <p>Coach: {video.parsedCoach || 'Unknown'}</p>
                <p>Student: {video.parsedStudent || 'Unknown'}</p>
                <p>Category: {video.category || 'N/A'}</p>
                <p style={{ fontSize: '12px', color: '#666' }}>ID: {video.id}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DebugKnowledgeBase;