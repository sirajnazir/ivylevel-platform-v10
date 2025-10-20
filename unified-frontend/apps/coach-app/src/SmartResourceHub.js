import React, { useState, useEffect } from 'react';

// Icon components (consistent with App.js design system)
const FileText = ({ style = {} }) => (
  <svg style={{width: '24px', height: '24px', ...style}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const Video = ({ style = {} }) => (
  <svg style={{width: '24px', height: '24px', ...style}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const BookOpen = ({ style = {} }) => (
  <svg style={{width: '24px', height: '24px', ...style}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);

const ExternalLink = ({ style = {} }) => (
  <svg style={{width: '16px', height: '16px', ...style}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);

const ChevronRight = ({ style = {} }) => (
  <svg style={{width: '20px', height: '20px', ...style}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

const Check = ({ style = {} }) => (
  <svg style={{width: '16px', height: '16px', ...style}} fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
  </svg>
);

const AlertCircle = ({ style = {} }) => (
  <svg style={{width: '16px', height: '16px', ...style}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10"></circle>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01" />
  </svg>
);

const Download = ({ style = {} }) => (
  <svg style={{width: '24px', height: '24px', ...style}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

// Additional icons to match App.js style
const ChartBar = ({ style = {} }) => (
  <svg style={{width: '24px', height: '24px', ...style}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const Target = ({ style = {} }) => (
  <svg style={{width: '24px', height: '24px', ...style}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10"></circle>
    <circle cx="12" cy="12" r="6"></circle>
    <circle cx="12" cy="12" r="2"></circle>
  </svg>
);

const Users = ({ style = {} }) => (
  <svg style={{width: '24px', height: '24px', ...style}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const ClipboardList = ({ style = {} }) => (
  <svg style={{width: '24px', height: '24px', ...style}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
  </svg>
);

const SmartResourceHub = ({ student, coach, onProgress }) => {
  const [resources, setResources] = useState({
    gamePlan: null,
    trainingVideos: [],
    similarStudents: [],
    executionDocs: [],
    loading: true
  });
  
  const [viewedResources, setViewedResources] = useState({
    gamePlan: false,
    videos: new Set(),
    docs: new Set()
  });
  
  const [activeTab, setActiveTab] = useState('overview');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    loadPersonalizedResources();
  }, [student]);

  useEffect(() => {
    // Calculate overall progress
    let totalItems = 1; // Game plan
    let completedItems = viewedResources.gamePlan ? 1 : 0;
    
    // Add mandatory videos
    const mandatoryVideos = resources.trainingVideos.filter(v => v.priority === 'mandatory');
    totalItems += mandatoryVideos.length;
    completedItems += mandatoryVideos.filter(v => viewedResources.videos.has(v.id)).length;
    
    const newProgress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
    setProgress(newProgress);
    
    // Report progress back to parent
    if (onProgress) {
      onProgress('resourceHub', newProgress);
    }
  }, [viewedResources, resources]);

  const loadPersonalizedResources = async () => {
    // Simulate loading resources - in real app, this would call actual APIs
    setTimeout(() => {
      setResources({
        gamePlan: {
          id: 'gp-001',
          title: `${student.name} - Comprehensive Game Plan`,
          lastUpdated: '2024-12-15',
          url: 'https://drive.google.com/file/d/SAMPLE_GAMEPLAN/view',
          highlights: [
            { area: 'Academic Strategy', detail: 'Focus on AP sciences for pre-med track' },
            { area: 'Test Prep Timeline', detail: 'SAT retake in March, Subject Tests in May' },
            { area: 'Extracurriculars', detail: 'Hospital volunteering + research opportunity' },
            { area: 'College List', detail: '12 schools balanced across reach/match/safety' }
          ]
        },
        trainingVideos: [
          {
            id: 'vid-001',
            title: '168 Hour Method - Junior Year Pre-Med Students',
            duration: '45 min',
            priority: 'mandatory',
            relevance: 95,
            url: 'https://example.com/video1'
          },
          {
            id: 'vid-002',
            title: 'Managing High-Pressure Parent Expectations',
            duration: '30 min',
            priority: 'mandatory',
            relevance: 90,
            url: 'https://example.com/video2'
          },
          {
            id: 'vid-003',
            title: 'SAT Strategy for 1400+ Scorers',
            duration: '25 min',
            priority: 'recommended',
            relevance: 85,
            url: 'https://example.com/video3'
          }
        ],
        similarStudents: [
          {
            id: 'ex-001',
            name: 'Sarah L.',
            similarity: 92,
            outcome: 'Accepted to Johns Hopkins',
            profile: 'Pre-med, 3.8 GPA, Similar parent dynamics',
            url: 'https://drive.google.com/file/d/EXAMPLE1/view'
          },
          {
            id: 'ex-002',
            name: 'Michael K.',
            similarity: 87,
            outcome: 'Full ride to state medical program',
            profile: 'Pre-med, First-gen, Strong sciences',
            url: 'https://drive.google.com/file/d/EXAMPLE2/view'
          }
        ],
        executionDocs: [
          {
            id: 'doc-001',
            title: 'Session Planning Template - Pre-Med Track',
            type: 'template',
            url: 'https://drive.google.com/file/d/TEMPLATE1/view'
          },
          {
            id: 'doc-002',
            title: 'Parent Communication Guidelines',
            type: 'guide',
            url: 'https://drive.google.com/file/d/GUIDE1/view'
          }
        ],
        loading: false
      });
    }, 1500);
  };

  const handleViewResource = (type, resourceId, url) => {
    // Open resource in new tab
    window.open(url, '_blank');
    
    // Track viewing
    setViewedResources(prev => {
      if (type === 'gamePlan') {
        return { ...prev, gamePlan: true };
      } else if (type === 'video') {
        const newVideos = new Set(prev.videos);
        newVideos.add(resourceId);
        return { ...prev, videos: newVideos };
      } else if (type === 'doc') {
        const newDocs = new Set(prev.docs);
        newDocs.add(resourceId);
        return { ...prev, docs: newDocs };
      }
      return prev;
    });
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: ChartBar },
    { id: 'gameplan', label: 'Game Plan', icon: Target },
    { id: 'training', label: 'Training Videos', icon: Video },
    { id: 'examples', label: 'Similar Students', icon: Users },
    { id: 'tools', label: 'Session Tools', icon: ClipboardList }
  ];

  if (resources.loading) {
    return (
      <div style={{
        background: '#f3f4f6',
        borderRadius: '8px',
        padding: '48px',
        textAlign: 'center'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '4px solid #e5e7eb',
          borderTopColor: '#FF4A23',
          borderRadius: '50%',
          margin: '0 auto 16px',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{color: '#616479'}}>Loading personalized resources for {student.name}...</p>
      </div>
    );
  }

  return (
    <div style={{marginTop: '24px'}}>
      {/* Progress Header */}
      <div style={{
        background: 'linear-gradient(135deg, #FFE5DF, #FFF5F2)',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '24px'
      }}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px'}}>
          <h4 style={{fontSize: '1.125rem', fontWeight: 'bold', color: '#020202'}}>
            Your Personalized Resource Hub
          </h4>
          <span style={{
            background: progress === 100 ? '#10b981' : '#FF4A23',
            color: 'white',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '0.875rem',
            fontWeight: '600'
          }}>
            {progress}% Complete
          </span>
        </div>
        <p style={{color: '#616479', fontSize: '0.875rem'}}>
          Resources specifically curated for coaching {student.name} ({student.grade}, {student.focusArea})
        </p>
        <div style={{
          marginTop: '12px',
          background: 'rgba(255,255,255,0.5)',
          borderRadius: '4px',
          height: '8px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            background: '#FF4A23',
            transition: 'width 0.3s ease'
          }}></div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        borderBottom: '2px solid #e5e7eb',
        paddingBottom: '0'
      }}>
        {tabs.map(tab => {
          const IconComponent = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 20px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab.id ? '3px solid #FF4A23' : '3px solid transparent',
                cursor: 'pointer',
                fontWeight: activeTab === tab.id ? '600' : '400',
                color: activeTab === tab.id ? '#FF4A23' : '#616479',
                transition: 'all 0.2s',
                marginBottom: '-2px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <IconComponent style={{width: '20px', height: '20px'}} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div style={{minHeight: '300px'}}>
        {activeTab === 'overview' && (
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px'}}>
            {/* Game Plan Card */}
            <div style={{
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '24px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {viewedResources.gamePlan && (
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  background: '#10b981',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontWeight: '600'
                }}>
                  Reviewed ✓
                </div>
              )}
              <FileText style={{color: '#FF4A23', marginBottom: '16px', width: '32px', height: '32px'}} />
              <h5 style={{fontWeight: '600', marginBottom: '8px', fontSize: '1rem', color: '#020202'}}>
                Student Game Plan
              </h5>
              <p style={{fontSize: '0.75rem', color: '#616479', marginBottom: '16px', lineHeight: '1.4'}}>
                Comprehensive strategy and roadmap
              </p>
              <button
                onClick={() => handleViewResource('gamePlan', 'gp-001', resources.gamePlan.url)}
                style={{
                  color: '#FF4A23',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: '500',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                View Game Plan <ExternalLink />
              </button>
            </div>

            {/* Training Videos Card */}
            <div style={{
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '24px'
            }}>
              <Video style={{color: '#FF4A23', marginBottom: '16px', width: '32px', height: '32px'}} />
              <h5 style={{fontWeight: '600', marginBottom: '8px', fontSize: '1rem', color: '#020202'}}>
                Training Videos
              </h5>
              <p style={{fontSize: '0.75rem', color: '#616479', marginBottom: '16px', lineHeight: '1.4'}}>
                {resources.trainingVideos.filter(v => v.priority === 'mandatory').length} mandatory videos
              </p>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.875rem',
                color: '#616479'
              }}>
                <span>{viewedResources.videos.size}</span>
                <span>/</span>
                <span>{resources.trainingVideos.length} watched</span>
              </div>
            </div>

            {/* Similar Students Card */}
            <div style={{
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '24px'
            }}>
              <Users style={{color: '#FF4A23', marginBottom: '16px', width: '32px', height: '32px'}} />
              <h5 style={{fontWeight: '600', marginBottom: '8px', fontSize: '1rem', color: '#020202'}}>
                Similar Success Stories
              </h5>
              <p style={{fontSize: '0.75rem', color: '#616479', marginBottom: '16px', lineHeight: '1.4'}}>
                {resources.similarStudents.length} matched profiles
              </p>
              <p style={{fontSize: '0.75rem', color: '#10b981', fontWeight: '500'}}>
                Up to {Math.max(...resources.similarStudents.map(s => s.similarity))}% similarity
              </p>
            </div>

            {/* Tools Card */}
            <div style={{
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '24px'
            }}>
              <ClipboardList style={{color: '#FF4A23', marginBottom: '16px', width: '32px', height: '32px'}} />
              <h5 style={{fontWeight: '600', marginBottom: '8px', fontSize: '1rem', color: '#020202'}}>
                Session Tools
              </h5>
              <p style={{fontSize: '0.75rem', color: '#616479', marginBottom: '16px', lineHeight: '1.4'}}>
                Templates & guides ready
              </p>
              <p style={{fontSize: '0.75rem', color: '#616479'}}>
                {resources.executionDocs.length} documents available
              </p>
            </div>
          </div>
        )}

        {activeTab === 'gameplan' && resources.gamePlan && (
          <div style={{background: 'white', borderRadius: '8px', padding: '24px'}}>
            <div style={{marginBottom: '24px'}}>
              <h5 style={{fontSize: '1.25rem', fontWeight: '600', marginBottom: '8px', color: '#020202'}}>
                {resources.gamePlan.title}
              </h5>
              <p style={{fontSize: '0.875rem', color: '#616479'}}>
                Last updated: {resources.gamePlan.lastUpdated}
              </p>
            </div>

            <div style={{marginBottom: '24px'}}>
              <h6 style={{fontWeight: '600', marginBottom: '16px', fontSize: '1rem', color: '#020202'}}>
                Key Focus Areas:
              </h6>
              <div style={{display: 'grid', gap: '12px'}}>
                {resources.gamePlan.highlights.map((highlight, idx) => (
                  <div key={idx} style={{
                    background: '#f3f4f6',
                    borderRadius: '8px',
                    padding: '16px',
                    borderLeft: '4px solid #FF4A23'
                  }}>
                    <p style={{fontWeight: '500', marginBottom: '4px', fontSize: '0.875rem', color: '#020202'}}>
                      {highlight.area}
                    </p>
                    <p style={{fontSize: '0.75rem', color: '#616479', lineHeight: '1.4'}}>
                      {highlight.detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => handleViewResource('gamePlan', 'gp-001', resources.gamePlan.url)}
              style={{
                padding: '12px 24px',
                background: viewedResources.gamePlan ? '#10b981' : '#FF4A23',
                color: 'white',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {viewedResources.gamePlan ? 'Review Again' : 'View Full Game Plan'} 
              <ExternalLink style={{width: '16px', height: '16px'}} />
            </button>
          </div>
        )}

        {activeTab === 'training' && (
          <div>
            <div style={{
              background: '#fef3c7',
              border: '1px solid #fbbf24',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '20px'
            }}>
              <p style={{fontSize: '0.875rem', color: '#92400e'}}>
                <strong>⚠️ Important:</strong> Watch all mandatory videos before your first session with {student.name}
              </p>
            </div>

            <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
              {resources.trainingVideos.map(video => (
                <div key={video.id} style={{
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
                    <Video style={{color: '#616479'}} />
                    <div>
                      <h6 style={{fontWeight: '500', marginBottom: '4px', fontSize: '0.875rem', color: '#020202'}}>
                        {video.title}
                      </h6>
                      <div style={{display: 'flex', gap: '12px', fontSize: '0.75rem', color: '#616479'}}>
                        <span>{video.duration}</span>
                        {video.priority === 'mandatory' && (
                          <span style={{
                            background: '#dc2626',
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: '600'
                          }}>
                            MANDATORY
                          </span>
                        )}
                        <span style={{color: '#FF4A23'}}>
                          {video.relevance}% relevant
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleViewResource('video', video.id, video.url)}
                    style={{
                      padding: '8px 16px',
                      background: viewedResources.videos.has(video.id) ? '#e5e7eb' : '#FF4A23',
                      color: viewedResources.videos.has(video.id) ? '#616479' : 'white',
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: '500',
                      fontSize: '0.875rem'
                    }}
                  >
                    {viewedResources.videos.has(video.id) ? 'Rewatch' : 'Watch'} →
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'examples' && (
          <div style={{display: 'grid', gap: '16px'}}>
            {resources.similarStudents.map(example => (
              <div key={example.id} style={{
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '20px'
              }}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px'}}>
                  <div>
                    <h6 style={{fontWeight: '600', marginBottom: '4px', fontSize: '1rem', color: '#020202'}}>
                      {example.name}
                    </h6>
                    <p style={{fontSize: '0.75rem', color: '#616479', lineHeight: '1.4'}}>
                      {example.profile}
                    </p>
                  </div>
                  <span style={{
                    background: '#d1fae5',
                    color: '#059669',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '0.875rem',
                    fontWeight: '600'
                  }}>
                    {example.similarity}% match
                  </span>
                </div>
                <div style={{
                  background: '#f3f4f6',
                  borderRadius: '6px',
                  padding: '12px',
                  marginBottom: '12px'
                }}>
                  <p style={{fontSize: '0.875rem', color: '#616479'}}>
                    <strong>Outcome:</strong> {example.outcome}
                  </p>
                </div>
                <a
                  href={example.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: '#FF4A23',
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  View Success Story <ExternalLink />
                </a>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'tools' && (
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px'}}>
            {resources.executionDocs.map(doc => (
              <div key={doc.id} style={{
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '20px'
              }}>
                <FileText style={{color: '#FF4A23', marginBottom: '12px'}} />
                <h6 style={{fontWeight: '600', marginBottom: '8px', fontSize: '1rem', color: '#020202'}}>
                  {doc.title}
                </h6>
                <p style={{
                  fontSize: '0.75rem',
                  color: '#616479',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '16px'
                }}>
                  {doc.type}
                </p>
                <button
                  onClick={() => handleViewResource('doc', doc.id, doc.url)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: viewedResources.docs.has(doc.id) ? '#e5e7eb' : '#FF4A23',
                    color: viewedResources.docs.has(doc.id) ? '#616479' : 'white',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: '500',
                    fontSize: '0.875rem'
                  }}
                >
                  {viewedResources.docs.has(doc.id) ? 'Download Again' : 'Download'} ↓
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Call to Action */}
      {progress < 100 && (
        <div style={{
          marginTop: '24px',
          padding: '16px',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <AlertCircle style={{color: '#dc2626'}} />
          <p style={{fontSize: '0.875rem', color: '#dc2626'}}>
            Please review the game plan and watch all mandatory videos before proceeding.
          </p>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

export default SmartResourceHub;