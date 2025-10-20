import API_ENDPOINTS from '../config/api';

// Enhanced Video Preload Service with optimized URL-based caching
class VideoPreloadService {
  private previewCache: Map<string, string> = new Map(); // URL cache for better performance
  private blobCache: Map<string, Blob> = new Map(); // Blob cache for offline support
  private urlCache: Map<string, { url: string; expires: number }> = new Map();
  private loadingQueue: Map<string, Promise<string | null>> = new Map();
  private maxCacheSize = 500 * 1024 * 1024; // 500MB max cache
  private currentCacheSize = 0;
  
  // Get video preview URL (not blob for better performance)
  async getVideoPreview(
    sessionId: string, 
    videoUrl?: string,
    startTime: number = 0
  ): Promise<string | null> {
    // Check URL cache first
    if (this.previewCache.has(sessionId)) {
      return this.previewCache.get(sessionId)!;
    }
    
    // Check if already loading
    if (this.loadingQueue.has(sessionId)) {
      return this.loadingQueue.get(sessionId)!;
    }
    
    // Create loading promise
    const loadingPromise = this.loadPreview(sessionId, videoUrl);
    this.loadingQueue.set(sessionId, loadingPromise);
    
    try {
      const result = await loadingPromise;
      this.loadingQueue.delete(sessionId);
      return result;
    } catch (error) {
      this.loadingQueue.delete(sessionId);
      throw error;
    }
  }
  
  private async loadPreview(sessionId: string, videoUrl?: string): Promise<string | null> {
    try {
      // Get presigned URL
      const url = await this.getPresignedUrl(sessionId, videoUrl);
      if (!url) return null;
      
      // For previews, we'll use the URL directly with video element's built-in buffering
      // This is more efficient than downloading entire blob
      this.previewCache.set(sessionId, url);
      return url;
      
    } catch (error) {
      console.error(`Failed to load preview for ${sessionId}:`, error);
      return null;
    }
  }
  
  // Get presigned URL with proper API endpoint
  async getPresignedUrl(sessionId: string, fallbackUrl?: string): Promise<string | null> {
    // Check URL cache
    const cached = this.urlCache.get(sessionId);
    if (cached && cached.expires > Date.now()) {
      return cached.url;
    }
    
    // Use fallback if provided and valid
    if (fallbackUrl && fallbackUrl.startsWith('http')) {
      return fallbackUrl;
    }
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No auth token found');
        return null;
      }
      
      const response = await fetch(API_ENDPOINTS.student.sessionUrls, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          session_ids: [sessionId]
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        const url = data.urls[sessionId];
        if (url) {
          // Cache for 55 minutes
          this.urlCache.set(sessionId, {
            url,
            expires: Date.now() + 55 * 60 * 1000
          });
          return url;
        }
      } else {
        console.error('Failed to get URL:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Failed to get presigned URL:', error);
    }
    
    return null;
  }
  
  // Prefetch multiple videos efficiently
  async prefetchVideos(sessionIds: string[]): Promise<void> {
    const promises = sessionIds.map(id => 
      this.getVideoPreview(id).catch(err => {
        console.error(`Prefetch failed for ${id}:`, err);
        return null;
      })
    );
    
    await Promise.allSettled(promises);
  }
  
  // Get full video URL
  async getFullVideoUrl(sessionId: string): Promise<string | null> {
    return this.getPresignedUrl(sessionId);
  }
  
  // Cache management with size limits
  private addToCache(sessionId: string, blob: Blob, type: 'preview' | 'full') {
    const cache = type === 'preview' ? this.blobCache : this.blobCache;
    
    // Check if we need to free space
    if (this.currentCacheSize + blob.size > this.maxCacheSize) {
      this.evictOldestEntries(blob.size);
    }
    
    cache.set(sessionId, blob);
    this.currentCacheSize += blob.size;
  }
  
  // LRU eviction
  private evictOldestEntries(spaceNeeded: number) {
    let freedSpace = 0;
    
    // Evict from preview cache first
    for (const [key, blob] of this.previewCache.entries()) {
      if (freedSpace >= spaceNeeded) break;
      freedSpace += blob.size;
      this.currentCacheSize -= blob.size;
      this.previewCache.delete(key);
    }
    
    // Then evict from full video cache if needed
    if (freedSpace < spaceNeeded) {
      for (const [key, blob] of this.fullVideoCache.entries()) {
        if (freedSpace >= spaceNeeded) break;
        freedSpace += blob.size;
        this.currentCacheSize -= blob.size;
        this.fullVideoCache.delete(key);
      }
    }
  }
  
  // Prefetch videos based on user behavior
  async prefetchAdjacentVideos(currentSessionId: string, sessionIds: string[]) {
    const currentIndex = sessionIds.indexOf(currentSessionId);
    if (currentIndex === -1) return;
    
    // Prefetch 2 videos before and after
    const toPrefetch = [
      ...sessionIds.slice(Math.max(0, currentIndex - 2), currentIndex),
      ...sessionIds.slice(currentIndex + 1, Math.min(sessionIds.length, currentIndex + 3))
    ];
    
    // Prefetch in background with low priority
    for (const sessionId of toPrefetch) {
      if (!this.previewCache.has(sessionId)) {
        // Use requestIdleCallback for low priority loading
        if ('requestIdleCallback' in window) {
          requestIdleCallback(() => {
            this.getVideoPreview(sessionId, '');
          });
        } else {
          setTimeout(() => {
            this.getVideoPreview(sessionId, '');
          }, 1000);
        }
      }
    }
  }
  
  // Clear all caches
  clearCache() {
    // Revoke blob URLs before clearing
    this.blobCache.forEach((_, key) => {
      const url = this.previewCache.get(key);
      if (url && url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
    
    this.previewCache.clear();
    this.blobCache.clear();
    this.urlCache.clear();
    this.loadingQueue.clear();
    this.currentCacheSize = 0;
  }
  
  // Get cache stats
  getCacheStats() {
    return {
      previewCount: this.previewCache.size,
      fullVideoCount: this.fullVideoCache.size,
      totalSize: this.currentCacheSize,
      maxSize: this.maxCacheSize,
      utilizationPercent: (this.currentCacheSize / this.maxCacheSize) * 100
    };
  }
}

export const videoPreloadService = new VideoPreloadService();