/**
 * Metadata Cache Service
 * Provides persistent caching for session metadata across component remounts and HMR
 */

const METADATA_CACHE_KEY_PREFIX = 'ivy_sessions_metadata_cache_';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

class MetadataCacheService {
  private cache: Map<string, { data: any; timestamp: number }>;
  private static instance: MetadataCacheService | null = null;

  private constructor() {
    this.cache = this.initializeCacheFromStorage();
    console.log('🏗️ MetadataCacheService initialized');
  }
  
  private getCurrentUserId(): string {
    // Get current user ID from localStorage
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        return user.id || 'default';
      }
    } catch (e) {
      console.error('Error getting user ID:', e);
    }
    return 'default';
  }

  static getInstance(): MetadataCacheService {
    if (!MetadataCacheService.instance) {
      MetadataCacheService.instance = new MetadataCacheService();
    }
    return MetadataCacheService.instance;
  }

  private initializeCacheFromStorage(): Map<string, { data: any; timestamp: number }> {
    try {
      const userId = this.getCurrentUserId();
      const cacheKey = METADATA_CACHE_KEY_PREFIX + userId;
      const stored = localStorage.getItem(cacheKey);
      console.log(`🔍 MetadataCacheService: Checking localStorage for user ${userId}`, stored ? 'Found' : 'Not found');
      
      if (stored) {
        const parsed = JSON.parse(stored);
        const age = Date.now() - parsed.timestamp;
        const isExpired = age >= CACHE_DURATION;
        
        console.log('📊 MetadataCacheService: Cache details:', {
          userId,
          timestamp: new Date(parsed.timestamp).toLocaleTimeString(),
          age: Math.round(age / 1000) + ' seconds',
          expired: isExpired,
          hasData: !!parsed.data
        });
        
        if (!isExpired && parsed.data) {
          console.log(`✅ MetadataCacheService: Cache is valid for user ${userId}`);
          return new Map([['all_metadata', parsed]]);
        }
      }
    } catch (e) {
      console.error('❌ MetadataCacheService: Error loading cache:', e);
    }
    return new Map();
  }

  set(key: string, data: any): void {
    const cacheEntry = { data, timestamp: Date.now() };
    this.cache.set(key, cacheEntry);
    
    // Save to localStorage with user-specific key
    try {
      const userId = this.getCurrentUserId();
      const cacheKey = METADATA_CACHE_KEY_PREFIX + userId;
      localStorage.setItem(cacheKey, JSON.stringify(cacheEntry));
      console.log(`💾 MetadataCacheService: Saved to localStorage for user ${userId}`);
    } catch (e) {
      console.error('Error saving cache:', e);
    }
  }

  get(key: string): { data: any; timestamp: number } | undefined {
    // Always check if we're getting data for the correct user
    const currentUserId = this.getCurrentUserId();
    const cacheKey = METADATA_CACHE_KEY_PREFIX + currentUserId;
    
    // Check if localStorage has data for current user
    try {
      const stored = localStorage.getItem(cacheKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        const age = Date.now() - parsed.timestamp;
        const isExpired = age >= CACHE_DURATION;
        
        if (!isExpired && parsed.data) {
          // Update in-memory cache
          this.cache.set(key, parsed);
          console.log(`🔍 MetadataCacheService: get('${key}') for user ${currentUserId} - Found in localStorage`);
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error reading from localStorage:', e);
    }
    
    // Check in-memory cache
    const cached = this.cache.get(key);
    console.log(`🔍 MetadataCacheService: get('${key}') for user ${currentUserId} -`, cached ? 'Found in memory' : 'Not found');
    return cached;
  }

  has(key: string): boolean {
    // Use the get method which is now user-aware
    const cached = this.get(key);
    if (!cached) return false;
    
    const isExpired = Date.now() - cached.timestamp >= CACHE_DURATION;
    return !isExpired;
  }

  clear(): void {
    this.cache.clear();
    const userId = this.getCurrentUserId();
    const cacheKey = METADATA_CACHE_KEY_PREFIX + userId;
    localStorage.removeItem(cacheKey);
    console.log(`🧹 MetadataCacheService: Cache cleared for user ${userId}`);
  }
  
  clearAllUserCaches(): void {
    // Clear all user-specific caches (useful for logout)
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(METADATA_CACHE_KEY_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
    this.cache.clear();
    console.log('🧹 MetadataCacheService: All user caches cleared');
  }
  
  clearUserCache(userId: string): void {
    // Clear cache for specific user
    const cacheKey = METADATA_CACHE_KEY_PREFIX + userId;
    localStorage.removeItem(cacheKey);
    this.cache.delete('all_metadata');
    console.log(`🧹 MetadataCacheService: Cache cleared for user ${userId}`);
  }
  
  reinitializeForUser(): void {
    // Reinitialize cache for current user (useful after login)
    this.cache = this.initializeCacheFromStorage();
    const userId = this.getCurrentUserId();
    console.log(`🔄 MetadataCacheService: Reinitialized for user ${userId}`);
  }
}

// Export singleton instance
export const metadataCacheService = MetadataCacheService.getInstance();

// Helper function for checking cache
export const hasCachedMetadata = (): boolean => {
  return metadataCacheService.has('all_metadata');
};

// Helper function for getting cached data
export const getCachedMetadata = (): any | null => {
  const cached = metadataCacheService.get('all_metadata');
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
};