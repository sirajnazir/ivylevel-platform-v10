/**
 * Simple Backend Auth Service
 * Connects directly to /api/auth/login endpoint
 */

import axios, { AxiosInstance } from 'axios';

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  student: {
    user_id: string;
    student_id: string;
    email: string;
    name: string;
    role: 'student' | 'coach' | 'admin';
    last_login_at: string;
  };
}

interface User {
  id: string;
  student_id: string;
  email: string;
  name: string;
  role: 'student' | 'coach' | 'admin';
}

class SimpleAuthService {
  private api: AxiosInstance;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

    this.api = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add auth token to requests
    this.api.interceptors.request.use((config) => {
      if (this.accessToken) {
        config.headers.Authorization = `Bearer ${this.accessToken}`;
      }
      return config;
    });

    // Load tokens from localStorage
    this.accessToken = localStorage.getItem('accessToken');
    this.refreshToken = localStorage.getItem('refreshToken');
  }

  async login(email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      console.log('🔐 Attempting login to:', this.api.defaults.baseURL + '/api/auth/login');
      console.log('📧 Email:', email);

      const response = await this.api.post<LoginResponse>('/api/auth/login', {
        email,
        password,
      });

      console.log('✅ Login successful:', response.data);

      // Store tokens
      this.accessToken = response.data.accessToken;
      this.refreshToken = response.data.refreshToken;
      localStorage.setItem('accessToken', this.accessToken);
      localStorage.setItem('refreshToken', this.refreshToken);

      // Store user data
      const user: User = {
        id: response.data.student.student_id,
        student_id: response.data.student.student_id,
        email: response.data.student.email,
        name: response.data.student.name,
        role: response.data.student.role,
      };
      localStorage.setItem('user', JSON.stringify(user));

      return { success: true, user };
    } catch (error: any) {
      console.error('❌ Login error:', error);

      if (error.response) {
        return {
          success: false,
          error: error.response.data.message || 'Login failed',
        };
      }

      return {
        success: false,
        error: 'Unable to connect to server. Please check if the server is running.',
      };
    }
  }

  async logout(): Promise<void> {
    try {
      await this.api.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage
      this.accessToken = null;
      this.refreshToken = null;
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  }

  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;

    try {
      return JSON.parse(userStr);
    } catch (error) {
      return null;
    }
  }

  isAuthenticated(): boolean {
    return !!this.accessToken && !!this.getCurrentUser();
  }
}

export const simpleAuthService = new SimpleAuthService();
