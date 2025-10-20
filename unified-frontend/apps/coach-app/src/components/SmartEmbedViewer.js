// SmartEmbedViewer.js - Intelligent embed viewer with fallback
import React, { useState, useEffect } from 'react';
import { VideoIcon, DocumentIcon, ExternalLinkIcon, AlertIcon } from './Icons';

const SmartEmbedViewer = ({ 
  type = 'video', // 'video' or 'document'
  driveId, 
  title, 
  fallbackUrl,
  height = type === 'video' ? '56.25%' : '600px', // 16:9 for video, fixed for docs
  onError 
}) => {
  const [embedError, setEmbedError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Construct the embed URL
  const getEmbedUrl = () => {
    if (!driveId) return null;
    
    // Try different embed formats
    if (type === 'video') {
      return `https://drive.google.com/file/d/${driveId}/preview`;
    } else {
      // For documents, try both formats
      return `https://drive.google.com/file/d/${driveId}/preview`;
    }
  };

  const embedUrl = getEmbedUrl();
  const viewUrl = driveId ? `https://drive.google.com/file/d/${driveId}/view` : fallbackUrl;

  useEffect(() => {
    // Reset states when driveId changes
    setEmbedError(false);
    setIsLoading(true);
  }, [driveId]);

  const handleIframeLoad = () => {
    setIsLoading(false);
    // Check if iframe loaded successfully
    const iframe = document.getElementById(`embed-${driveId}`);
    if (iframe) {
      try {
        // This will throw if cross-origin
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        if (doc.body.innerHTML.includes('denied') || doc.body.innerHTML.includes('error')) {
          setEmbedError(true);
        }
      } catch (e) {
        // Cross-origin, but loaded - this is normal for Google Drive
        console.log('Embed loaded successfully');
      }
    }
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setEmbedError(true);
    if (onError) onError();
  };

  if (!driveId && !fallbackUrl) {
    return (
      <div style={{
        backgroundColor: '#fef3c7',
        borderRadius: '8px',
        padding: '24px',
        textAlign: 'center',
        border: '1px solid #fcd34d'
      }}>
        <AlertIcon size={48} color="#f59e0b" style={{ marginBottom: '16px' }} />
        <h3 style={{ color: '#92400e', marginBottom: '8px' }}>Content Not Available</h3>
        <p style={{ color: '#92400e', marginBottom: '0' }}>
          This {type} is not yet available in the system.
        </p>
      </div>
    );
  }

  return (
    <div style={{
      width: '100%',
      position: 'relative',
      backgroundColor: '#000',
      borderRadius: '8px',
      overflow: 'hidden'
    }}>
      {/* Responsive container for video or fixed height for documents */}
      <div style={{
        paddingTop: type === 'video' ? height : 0,
        height: type === 'video' ? 0 : height,
        position: 'relative'
      }}>
        {/* Loading state */}
        {isLoading && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#1e293b',
            zIndex: 10
          }}>
            <div style={{
              width: '50px',
              height: '50px',
              border: '3px solid #334155',
              borderTopColor: '#3b82f6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <p style={{ color: '#94a3b8', marginTop: '16px' }}>Loading {type}...</p>
            <style>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        )}

        {/* Error/Fallback state */}
        {embedError && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#1e293b',
            padding: '24px',
            textAlign: 'center'
          }}>
            {type === 'video' ? (
              <VideoIcon size={64} color="#3b82f6" style={{ marginBottom: '16px' }} />
            ) : (
              <DocumentIcon size={64} color="#3b82f6" style={{ marginBottom: '16px' }} />
            )}
            <h3 style={{ color: 'white', marginBottom: '16px' }}>{title || `${type} Content`}</h3>
            <p style={{ color: '#94a3b8', marginBottom: '24px', maxWidth: '400px' }}>
              This {type} requires access permissions. Click below to open it in Google Drive where you can request access.
            </p>
            <a
              href={viewUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                backgroundColor: '#3b82f6',
                color: 'white',
                padding: '12px 24px',
                borderRadius: '6px',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                fontWeight: '600',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.target.style.backgroundColor = '#2563eb'}
              onMouseLeave={e => e.target.style.backgroundColor = '#3b82f6'}
            >
              <ExternalLinkIcon style={{ marginRight: '8px' }} />
              Open in Google Drive
            </a>
          </div>
        )}

        {/* Iframe embed */}
        {embedUrl && !embedError && (
          <iframe
            id={`embed-${driveId}`}
            src={embedUrl}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              border: 'none',
              display: embedError ? 'none' : 'block'
            }}
            title={title || `${type} viewer`}
            allow="autoplay; fullscreen; accelerometer; gyroscope; picture-in-picture"
            allowFullScreen
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            // Add sandbox for security but allow necessary features
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation"
          />
        )}
      </div>

      {/* Additional info bar */}
      {!embedError && (
        <div style={{
          backgroundColor: '#1e293b',
          padding: '12px 16px',
          borderTop: '1px solid #334155',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ color: '#94a3b8', fontSize: '14px' }}>
            {title || `${type} Content`}
          </span>
          <a
            href={viewUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#3b82f6',
              fontSize: '14px',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              transition: 'color 0.2s'
            }}
            onMouseEnter={e => e.target.style.color = '#60a5fa'}
            onMouseLeave={e => e.target.style.color = '#3b82f6'}
          >
            <ExternalLinkIcon size={16} style={{ marginRight: '4px' }} />
            Open in new tab
          </a>
        </div>
      )}
    </div>
  );
};

export default SmartEmbedViewer;