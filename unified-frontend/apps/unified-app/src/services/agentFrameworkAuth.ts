/**
 * Agent Framework Authentication Service
 * Integrates with: services/agent-framework/src/routes/auth.ts
 *
 * Provides JWT authentication for all 9 agents
 */

const API_BASE_URL = import.meta.env.VITE_AGENT_API_URL || 'http://localhost:4101/api';

export interface AuthUser {
  user_id: string;
  coach_id: string;
  email: string;
  name: string;
  role: 'coach' | 'student' | 'admin';
  last_login_at?: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  coach?: AuthUser;
  student?: AuthUser;
}

class AgentFrameworkAuthService {
  private refreshTimer: NodeJS.Timeout | null = null;

  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<{ success: boolean; user: AuthUser; tokens: LoginResponse }> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }

      const data: LoginResponse = await response.json();

      // Store tokens
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);

      // Schedule token refresh
      this.scheduleTokenRefresh(data.expires_in);

      // Get user data
      const user = data.coach || data.student;
      if (!user) {
        throw new Error('No user data returned');
      }

      // Map to unified user format
      const unifiedUser: AuthUser = {
        user_id: user.user_id,
        coach_id: user.coach_id,
        email: user.email,
        name: user.name || user.email.split('@')[0],
        role: user.role,
        last_login_at: user.last_login_at
      };

      return {
        success: true,
        user: unifiedUser,
        tokens: data
      };
    } catch (error: any) {
      console.error('Agent Framework login error:', error);
      return {
        success: false,
        user: null as any,
        tokens: null as any
      };
    }
  }

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    const refreshToken = localStorage.getItem('refresh_token');

    try {
      if (refreshToken) {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.getAccessToken()}`,
          },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
      }
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      // Clear local state
      this.clearTokens();
      this.clearRefreshTimer();
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(): Promise<string | null> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      return null;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        this.clearTokens();
        return null;
      }

      const data = await response.json();
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      this.scheduleTokenRefresh(data.expires_in);

      return data.access_token;
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.clearTokens();
      return null;
    }
  }

  /**
   * Make authenticated fetch request
   */
  async authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const token = this.getAccessToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${token}`);
    headers.set('Content-Type', 'application/json');

    const response = await fetch(url, { ...options, headers });

    // If 401, try refreshing token once
    if (response.status === 401) {
      const newToken = await this.refreshAccessToken();
      if (newToken) {
        headers.set('Authorization', `Bearer ${newToken}`);
        return fetch(url, { ...options, headers });
      }
    }

    return response;
  }

  /**
   * Get access token
   */
  getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  /**
   * Check if authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  // Private methods
  private clearTokens(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  private scheduleTokenRefresh(expiresInSeconds: number): void {
    this.clearRefreshTimer();

    // Refresh 5 minutes before expiry
    const refreshIn = (expiresInSeconds - 5 * 60) * 1000;

    if (refreshIn > 0) {
      this.refreshTimer = setTimeout(async () => {
        await this.refreshAccessToken();
      }, refreshIn);
    }
  }

  private clearRefreshTimer(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
}

export const agentFrameworkAuth = new AgentFrameworkAuthService();
