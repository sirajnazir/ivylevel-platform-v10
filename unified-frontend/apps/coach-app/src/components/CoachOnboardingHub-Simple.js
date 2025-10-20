import React, { useState } from 'react';

function CoachOnboardingHub({ coachName, studentName }) {
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [completedVideos, setCompletedVideos] = useState(new Set());

  const videoLibrary = [
    {
      id: 1,
      title: "Introduction to IvyLevel Coaching",
      duration: "12:34",
      category: "Getting Started",
      description: "Learn the fundamentals of our coaching methodology",
      thumbnail: "🎯"
    },
    {
      id: 2,
      title: "Understanding Student Psychology",
      duration: "18:45",
      category: "Psychology",
      description: "How to connect with and motivate students effectively",
      thumbnail: "🧠"
    },
    {
      id: 3,
      title: "Essay Coaching Techniques",
      duration: "25:12",
      category: "Academics",
      description: "Advanced strategies for helping students with college essays",
      thumbnail: "📝"
    },
    {
      id: 4,
      title: "Time Management for Students",
      duration: "15:30",
      category: "Study Skills",
      description: "Teaching effective time management and study habits",
      thumbnail: "⏰"
    },
    {
      id: 5,
      title: "College Application Timeline",
      duration: "22:18",
      category: "Applications",
      description: "Navigate the complex college application process",
      thumbnail: "🎓"
    }
  ];

  const markVideoComplete = (videoId) => {
    const newCompleted = new Set(completedVideos);
    newCompleted.add(videoId);
    setCompletedVideos(newCompleted);
  };

  if (selectedVideo) {
    const video = videoLibrary.find(v => v.id === selectedVideo);
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#000', color: 'white' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
          {/* Video Player Header */}
          <div style={{ marginBottom: '20px' }}>
            <button
              onClick={() => setSelectedVideo(null)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#374151',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                marginBottom: '16px'
              }}
            >
              ← Back to Library
            </button>
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: '0 0 8px 0' }}>
              {video.title}
            </h1>
            <p style={{ color: '#9ca3af', margin: 0 }}>
              {video.category} • {video.duration}
            </p>
          </div>

          {/* Video Player */}
          <div style={{
            backgroundColor: '#1f2937',
            borderRadius: '12px',
            padding: '40px',
            textAlign: 'center',
            marginBottom: '24px'
          }}>
            <div style={{ fontSize: '8rem', marginBottom: '20px' }}>
              {video.thumbnail}
            </div>
            <div style={{ fontSize: '4rem', marginBottom: '20px' }}>▶️</div>
            <p style={{ fontSize: '1.25rem', color: '#d1d5db' }}>
              Video: {video.title}
            </p>
            <p style={{ color: '#9ca3af' }}>
              Duration: {video.duration}
            </p>
            <button
              onClick={() => markVideoComplete(video.id)}
              style={{
                marginTop: '20px',
                padding: '12px 24px',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              Mark as Complete
            </button>
          </div>

          {/* Video Info */}
          <div style={{
            backgroundColor: '#1f2937',
            borderRadius: '12px',
            padding: '24px'
          }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '12px' }}>
              About this video
            </h2>
            <p style={{ color: '#d1d5db', lineHeight: '1.6' }}>
              {video.description}
            </p>
            
            <div style={{ marginTop: '24px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '12px' }}>
                Your Progress
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  padding: '8px 16px',
                  backgroundColor: completedVideos.has(video.id) ? '#10b981' : '#374151',
                  borderRadius: '20px',
                  fontSize: '0.875rem'
                }}>
                  {completedVideos.has(video.id) ? '✅ Completed' : '⏳ In Progress'}
                </div>
                <div style={{ color: '#9ca3af' }}>
                  {completedVideos.size} of {videoLibrary.length} videos completed
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '20px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '12px', 
          padding: '24px', 
          marginBottom: '24px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
        }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: '0 0 8px 0' }}>
            📚 Coach Training Hub
          </h1>
          <p style={{ color: '#6b7280', margin: 0 }}>
            Welcome {coachName}! Complete your training to start coaching {studentName}
          </p>
        </div>

        {/* Progress Overview */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px' }}>
            📊 Training Progress
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            <div style={{
              width: '200px',
              height: '8px',
              backgroundColor: '#e5e7eb',
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${(completedVideos.size / videoLibrary.length) * 100}%`,
                height: '100%',
                backgroundColor: '#10b981',
                transition: 'width 0.3s ease'
              }}></div>
            </div>
            <span style={{ fontSize: '1.1rem', fontWeight: '600' }}>
              {Math.round((completedVideos.size / videoLibrary.length) * 100)}% Complete
            </span>
          </div>
          <p style={{ color: '#6b7280' }}>
            {completedVideos.size} of {videoLibrary.length} training videos completed
          </p>
        </div>

        {/* Video Library */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px' }}>
            🎥 Training Videos
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {videoLibrary.map(video => (
              <div
                key={video.id}
                onClick={() => setSelectedVideo(video.id)}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  position: 'relative'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                {completedVideos.has(video.id) && (
                  <div style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px'
                  }}>
                    ✓
                  </div>
                )}
                
                <div style={{ fontSize: '3rem', textAlign: 'center', marginBottom: '12px' }}>
                  {video.thumbnail}
                </div>
                
                <div style={{ textAlign: 'center' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '600', margin: '0 0 8px 0' }}>
                    {video.title}
                  </h3>
                  <div style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    color: '#6b7280',
                    marginBottom: '8px'
                  }}>
                    {video.category}
                  </div>
                  <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '0 0 8px 0' }}>
                    {video.description}
                  </p>
                  <div style={{ color: '#9ca3af', fontSize: '0.75rem' }}>
                    {video.duration}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Next Steps */}
        {completedVideos.size === videoLibrary.length && (
          <div style={{
            backgroundColor: '#ecfdf5',
            border: '1px solid #10b981',
            borderRadius: '12px',
            padding: '24px',
            marginTop: '24px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🎉</div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#065f46', marginBottom: '8px' }}>
              Congratulations!
            </h2>
            <p style={{ color: '#047857', marginBottom: '16px' }}>
              You've completed all training videos. You're ready to start coaching {studentName}!
            </p>
            <button style={{
              padding: '12px 24px',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1rem'
            }}>
              Start Coaching →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default CoachOnboardingHub;