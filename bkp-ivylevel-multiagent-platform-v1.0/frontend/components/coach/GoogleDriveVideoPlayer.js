import React, { useState, useEffect } from 'react';
import { Play, Pause, Maximize, Volume2, AlertCircle, Loader, X } from 'lucide-react';

const GoogleDriveVideoPlayer = ({ recording, className = '' }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState(null);
  const [embedUrl, setEmbedUrl] = useState(null);

  useEffect(() => {
    if (recording) {
      const url = getVideoUrl();
      if (url) {
        setEmbedUrl(url);
        setError(null);
      } else {
        setError('No video URL available');
      }
    }
  }, [recording]);

  const getVideoUrl = () => {
    if (!recording) return null;

    // Try different URL formats
    if (recording.videoUrl) {
      return convertToEmbedUrl(recording.videoUrl);
    }
    
    if (recording.driveId) {
      return `https://drive.google.com/file/d/${recording.driveId}/preview`;
    }
    
    if (recording.url) {
      return convertToEmbedUrl(recording.url);
    }

    // Try to extract from driveFolder if available
    if (recording.driveFolder) {
      const match = recording.driveFolder.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match) {
        return `https://drive.google.com/file/d/${match[1]}/preview`;
      }
    }

    return null;
  };

  const convertToEmbedUrl = (url) => {
    if (!url) return null;

    // Already an embed URL
    if (url.includes('/preview') || url.includes('/embed')) {
      return url;
    }

    // Extract file ID from various Google Drive URL formats
    let fileId = null;
    
    // Format: https://drive.google.com/file/d/FILE_ID/view
    const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
    if (fileMatch) {
      fileId = fileMatch[1];
    }
    
    // Format: https://drive.google.com/open?id=FILE_ID
    const openMatch = url.match(/[?&]id=([a-zA-Z0-9-_]+)/);
    if (openMatch) {
      fileId = openMatch[1];
    }

    // Format: https://drive.google.com/uc?id=FILE_ID
    const ucMatch = url.match(/\/uc\?.*id=([a-zA-Z0-9-_]+)/);
    if (ucMatch) {
      fileId = ucMatch[1];
    }

    if (fileId) {
      return `https://drive.google.com/file/d/${fileId}/preview`;
    }

    // If it's already a direct Google Drive URL, try to use it
    if (url.includes('drive.google.com')) {
      return url;
    }

    return null;
  };

  if (error) {
    return (
      <div className={`bg-gray-100 rounded-lg flex items-center justify-center p-8 ${className}`}>
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">{error}</p>
          {recording.thumbnailUrl && (
            <img 
              src={recording.thumbnailUrl} 
              alt="Video thumbnail" 
              className="mt-4 rounded-lg mx-auto max-w-xs"
            />
          )}
        </div>
      </div>
    );
  }

  if (!embedUrl) {
    return (
      <div className={`bg-gray-100 rounded-lg flex items-center justify-center p-8 ${className}`}>
        <Loader className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className={`relative bg-black rounded-lg overflow-hidden ${className}`}>
      <iframe
        src={embedUrl}
        width="100%"
        height="100%"
        allow="autoplay"
        allowFullScreen
        className="absolute inset-0"
        title={recording.topic || 'Video'}
        onError={() => setError('Failed to load video')}
      />
      
      {/* Custom Controls Overlay (optional) */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-4 opacity-0 hover:opacity-100 transition-opacity">
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              className="hover:scale-110 transition-transform"
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            </button>
            <Volume2 className="w-5 h-5" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm">{recording.duration || 0} min</span>
            <button className="hover:scale-110 transition-transform">
              <Maximize className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Standalone player for modal/fullscreen use
export const VideoPlayerModal = ({ recording, onClose }) => {
  if (!recording) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
      <div className="relative w-full max-w-6xl">
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
        >
          <X className="w-8 h-8" />
        </button>
        
        <div className="bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
          <GoogleDriveVideoPlayer 
            recording={recording} 
            className="w-full h-full"
          />
        </div>
        
        <div className="mt-4 text-white">
          <h3 className="text-xl font-semibold">{recording.topic}</h3>
          <p className="text-gray-300 mt-1">
            {recording.student} • {new Date(recording.date).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default GoogleDriveVideoPlayer;