// Video Prefetch Service - Inspired by Netflix's predictive caching
class VideoPrefetchService {
  private cache: Map<string, any> = new Map();
  private prefetchQueue: string[] = [];
  private isPrefetching = false;
  
  // Start prefetching sessions data when user logs in
  async prefetchSessions(token: string): Promise<void> {
    if (this.isPrefetching) return;
    
    this.isPrefetching = true;
    
    try {
      // Fetch first page of sessions in background
      const response = await fetch('/api/student/sessions?page=1&limit=20', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        this.cache.set('sessions-page-1', {
          data,
          timestamp: Date.now()
        });
        
        // Prefetch video metadata for first 4 videos
        if (data.sessions && data.sessions.length > 0) {
          this.queueVideoPrefetch(data.sessions.slice(0, 4));
        }
      }
    } catch (error) {
      console.error('Prefetch failed:', error);
    } finally {
      this.isPrefetching = false;
    }
  }
  
  // Queue videos for metadata prefetch
  private queueVideoPrefetch(sessions: any[]) {
    sessions.forEach(session => {
      if (session.video_url && !this.cache.has(`video-${session.id}`)) {
        this.prefetchQueue.push(session.id);
      }
    });
    
    this.processPrefetchQueue();
  }
  
  // Process prefetch queue
  private async processPrefetchQueue() {
    if (this.prefetchQueue.length === 0) return;
    
    const videoId = this.prefetchQueue.shift();
    if (!videoId) return;
    
    // In a real implementation, this would prefetch video metadata
    // For now, we'll just mark it as cached
    this.cache.set(`video-${videoId}`, {
      prefetched: true,
      timestamp: Date.now()
    });
    
    // Continue with next item after a delay
    setTimeout(() => this.processPrefetchQueue(), 100);
  }
  
  // Get cached data if available and fresh
  getCached(key: string, maxAge: number = 5 * 60 * 1000): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > maxAge) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }
  
  // Clear cache
  clear() {
    this.cache.clear();
    this.prefetchQueue = [];
  }
}

export const videoPrefetchService = new VideoPrefetchService();