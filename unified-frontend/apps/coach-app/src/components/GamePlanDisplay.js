// GamePlanDisplay.js - Better display for Game Plan content
import React from 'react';
import { VideoIcon, DocumentIcon, ExternalLinkIcon, PlayIcon } from './Icons';

const GamePlanDisplay = ({ gamePlanData, onVideoClick }) => {
  if (!gamePlanData) return null;

  const { video, report, studentName, coachName, totalSessions } = gamePlanData;

  return (
    <div style={{
      backgroundColor: '#f9fafb',
      borderRadius: '12px',
      padding: '24px',
      marginTop: '24px',
      border: '1px solid #e5e7eb'
    }}>
      <h3 style={{
        fontSize: '20px',
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center'
      }}>
        <VideoIcon style={{ marginRight: '8px', color: '#3b82f6' }} />
        {studentName}'s Game Plan Assessment
      </h3>

      {video && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '16px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'start'
          }}>
            <div style={{ flex: 1 }}>
              <h4 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#1f2937',
                marginBottom: '8px'
              }}>
                {video.title || 'Game Plan Video'}
              </h4>
              
              {video.date && (
                <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
                  Date: {video.date}
                </p>
              )}
              
              {video.duration && (
                <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '12px' }}>
                  Duration: {video.duration} minutes
                </p>
              )}
              
              {video.insights && (
                <p style={{ fontSize: '14px', color: '#4b5563', marginBottom: '16px' }}>
                  {video.insights}
                </p>
              )}
            </div>
          </div>

          {/* Embedded Video Preview */}
          <div style={{
            width: '100%',
            paddingTop: '56.25%', // 16:9 aspect ratio
            position: 'relative',
            backgroundColor: '#000',
            borderRadius: '8px',
            overflow: 'hidden',
            marginBottom: '16px'
          }}>
            <iframe
              src={video.embedUrl || `https://drive.google.com/file/d/${video.driveId}/preview`}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                border: 'none'
              }}
              title={video.title || 'Game Plan Video'}
              allow="autoplay; fullscreen"
              allowFullScreen
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => onVideoClick(video)}
              style={{
                backgroundColor: '#3b82f6',
                color: 'white',
                padding: '10px 20px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.target.style.backgroundColor = '#2563eb'}
              onMouseLeave={e => e.target.style.backgroundColor = '#3b82f6'}
            >
              <PlayIcon style={{ marginRight: '6px' }} />
              Full Screen
            </button>
            
            {video.viewUrl && (
              <a
                href={video.viewUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  backgroundColor: '#f3f4f6',
                  color: '#4b5563',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  textDecoration: 'none',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => {
                  e.target.style.backgroundColor = '#e5e7eb';
                  e.target.style.color = '#1f2937';
                }}
                onMouseLeave={e => {
                  e.target.style.backgroundColor = '#f3f4f6';
                  e.target.style.color = '#4b5563';
                }}
              >
                <ExternalLinkIcon style={{ marginRight: '6px' }} />
                Open in Drive
              </a>
            )}
          </div>
        </div>
      )}

      {report && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '16px',
          border: '1px solid #e5e7eb'
        }}>
          <h4 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#1f2937',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center'
          }}>
            <DocumentIcon style={{ marginRight: '8px', color: '#10b981' }} />
            {report.title || 'Game Plan Report'}
          </h4>
          
          {report.preview && (
            <p style={{ fontSize: '14px', color: '#4b5563', marginBottom: '16px' }}>
              {report.preview}
            </p>
          )}
          
          {/* Embedded Document Viewer */}
          {!report.isPlaceholder && report.driveId && (
            <div style={{
              width: '100%',
              height: '600px',
              marginBottom: '16px',
              borderRadius: '8px',
              overflow: 'hidden',
              border: '1px solid #e5e7eb'
            }}>
              <iframe
                src={`https://drive.google.com/file/d/${report.driveId}/preview`}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none'
                }}
                title={report.title || 'Game Plan Report'}
              />
            </div>
          )}
          
          {report.isPlaceholder ? (
            <div style={{ fontSize: '14px', color: '#4b5563' }}>
              <p style={{ marginBottom: '12px' }}>
                The Game Plan Report PDF is stored in the Game Plan Reports folder.
              </p>
              <p style={{ fontWeight: '600', color: '#1f2937' }}>
                Look for: "{report.filename}"
              </p>
              <p style={{ marginTop: '12px', fontSize: '13px', color: '#6b7280' }}>
                Contact your team lead if you need access to the Game Plan Reports folder.
              </p>
            </div>
          ) : (
            <a
              href={report.url || `https://drive.google.com/file/d/${report.driveId}/view`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                backgroundColor: '#10b981',
                color: 'white',
                padding: '10px 20px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'inline-flex',
                alignItems: 'center',
                textDecoration: 'none',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.target.style.backgroundColor = '#059669'}
              onMouseLeave={e => e.target.style.backgroundColor = '#10b981'}
            >
              <DocumentIcon style={{ marginRight: '6px' }} />
              Open in New Tab
            </a>
          )}
        </div>
      )}

      {totalSessions > 0 && (
        <div style={{
          backgroundColor: '#eff6ff',
          borderRadius: '8px',
          padding: '16px',
          marginTop: '16px',
          border: '1px solid #dbeafe'
        }}>
          <p style={{ fontSize: '14px', color: '#1e40af', margin: 0 }}>
            <strong>Total Sessions:</strong> {totalSessions} coaching sessions found for {studentName}
          </p>
        </div>
      )}

      {!video && !report && (
        <div style={{
          backgroundColor: '#fef3c7',
          borderRadius: '8px',
          padding: '16px',
          border: '1px solid #fde68a'
        }}>
          <p style={{ fontSize: '14px', color: '#92400e', margin: 0 }}>
            No Game Plan data found for {studentName}. This may be because:
          </p>
          <ul style={{ fontSize: '14px', color: '#92400e', marginTop: '8px', marginBottom: 0 }}>
            <li>The Game Plan hasn't been created yet</li>
            <li>The files need proper permissions in Google Drive</li>
            <li>The session needs to be properly categorized</li>
          </ul>
        </div>
      )}
      
      {video && !report && (
        <div style={{
          backgroundColor: '#e0e7ff',
          borderRadius: '8px',
          padding: '16px',
          marginTop: '16px',
          border: '1px solid #c7d2fe'
        }}>
          <p style={{ fontSize: '14px', color: '#4338ca', margin: 0 }}>
            <strong>Note:</strong> The Game Plan video assessment is available. The written Game Plan report document will be created by Head Coach Jenny after reviewing the video session and will be added to the student's folder.
          </p>
        </div>
      )}
    </div>
  );
};

export default GamePlanDisplay;