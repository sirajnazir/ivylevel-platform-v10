import axios, { AxiosInstance } from 'axios';

interface AuthTokens {
  access_token: string;
  refresh_token: string;
  id_token: string;
  expires_in: number;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'coach' | 'admin';
  email_verified?: boolean;
  phone_number?: string;
  created_at?: string;
}

interface AuthResponse {
  success: boolean;
  tokens?: AuthTokens;
  user?: User;
  user_id?: string;
  message?: string;
  error?: string;
  challenge?: string;
  session?: string;
}

class CognitoAuthService {
  private api: AxiosInstance;
  private tokens: AuthTokens | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.api = axios.create({
      baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4101',
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 60000, // 60 second timeout for very slow connections
      withCredentials: true, // Include cookies
    });
    
    // Initialize registered users from localStorage if not present
    if (!localStorage.getItem('registeredUsers')) {
      // Initialize with demo users
      const demoUsers = [
        {
          id: '1',
          email: 'hudasir4j@gmail.com',
          name: 'Huda',
          role: 'student',
          password: 'Welcome123!'
        },
        {
          id: '2',
          email: 'jennyduan@ivymentors.co',
          name: 'Jenny',
          role: 'coach',
          password: 'Welcome123!'
        },
        {
          id: '3',
          email: 'admin@ivylevel.com',
          name: 'Admin',
          role: 'admin',
          password: 'admin123'
        }
      ];
      localStorage.setItem('registeredUsers', JSON.stringify(demoUsers));
    }

    // Add auth interceptor
    this.api.interceptors.request.use((config) => {
      const token = this.getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Add response interceptor for token refresh
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          try {
            await this.refreshAccessToken();
            const token = this.getAccessToken();
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return this.api(originalRequest);
          } catch (refreshError) {
            this.logout();
            window.location.href = '/login';
          }
        }
        
        return Promise.reject(error);
      }
    );

    // Load tokens from storage
    this.loadTokens();
  }

  // Token Management
  private loadTokens(): void {
    const storedTokens = localStorage.getItem('auth_tokens');
    if (storedTokens) {
      this.tokens = JSON.parse(storedTokens);
      this.scheduleTokenRefresh();
    }
  }

  private saveTokens(tokens: AuthTokens): void {
    this.tokens = tokens;
    localStorage.setItem('auth_tokens', JSON.stringify(tokens));
    // Also save the access token separately for backward compatibility
    localStorage.setItem('token', tokens.access_token);
    this.scheduleTokenRefresh();
  }

  private clearTokens(): void {
    this.tokens = null;
    localStorage.removeItem('auth_tokens');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  private scheduleTokenRefresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    if (this.tokens) {
      // Refresh 5 minutes before expiry
      const refreshIn = (this.tokens.expires_in - 300) * 1000;
      this.refreshTimer = setTimeout(() => {
        this.refreshAccessToken();
      }, refreshIn);
    }
  }

  getAccessToken(): string | null {
    return this.tokens?.access_token || null;
  }

  // Authentication Methods
  async register(data: {
    email: string;
    password: string;
    name: string;
    role: string;
    phone_number?: string;
  }): Promise<AuthResponse> {
    try {
      console.log('🔍 Attempting real API registration:', data);
      // Try the real API first
      const response = await this.api.post<AuthResponse>('/api/auth/register', data);
      console.log('✅ Real API registration successful:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Real API registration failed:', {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      // If API fails, use mock registration
      console.log('🔄 Falling back to mock registration');
      return this.mockRegister(data);
    }
  }

  private mockRegister(data: {
    email: string;
    password: string;
    name: string;
    role: string;
    phone_number?: string;
  }): AuthResponse {
    // Create new user
    const user = {
      id: Date.now().toString(),
      email: data.email,
      name: data.name,
      role: data.role as 'student' | 'coach' | 'admin',
      phone_number: data.phone_number,
      created_at: new Date().toISOString(),
      is_active: true
    };

    console.log('🔍 Mock register debug:', { data, user, role: user.role });

    // Store in localStorage for persistence
    const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
    
    // Check if user already exists
    const existingUser = registeredUsers.find((u: any) => u.email === data.email);
    if (existingUser) {
      return {
        success: false,
        message: 'User with this email already exists'
      };
    }

    // Add password to user object for login
    const userWithPassword = {
      ...user,
      password: data.password
    };

    registeredUsers.push(userWithPassword);
    localStorage.setItem('registeredUsers', JSON.stringify(registeredUsers));
    
    console.log('✅ User registered successfully:', { email: data.email, role: user.role });

    return {
      success: true,
      user_id: user.id,
      message: "User registered successfully"
    };
  }

  async confirmEmail(email: string, code: string): Promise<AuthResponse> {
    try {
      const response = await this.api.post<AuthResponse>('/api/auth/confirm-email', {
        email,
        code: code,
      });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'verification_failed',
        message: error.response?.data?.message || 'Email verification failed',
      };
    }
  }

  async resendConfirmationCode(email: string): Promise<AuthResponse> {
    try {
      const response = await this.api.post<AuthResponse>('/api/auth/resend-confirmation', {
        email,
      });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'resend_failed',
        message: error.response?.data?.message || 'Failed to resend confirmation code',
      };
    }
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      console.log('🔍 Attempting real API login for:', email);
      console.log('📡 API URL:', this.api.defaults.baseURL + '/api/auth/login');
      
      // First, try a simple health check to verify connectivity
      try {
        const healthCheck = await fetch(this.api.defaults.baseURL + '/', {
          method: 'GET',
          mode: 'cors',
        });
        console.log('🏥 Health check status:', healthCheck.status);
      } catch (healthError) {
        console.warn('⚠️ Health check failed:', healthError);
      }
      
      // Try to make the request with a custom timeout for login
      const response = await this.api.post<any>('/api/auth/login', {
        email,
        password,
      }, {
        timeout: 60000, // 60 seconds for login on slow connections
      });
      
      console.log('✅ Real API login response:', response.data);

      // Check if we got tokens directly in the response (backend format)
      if (response.data.access_token && response.data.user) {
        // Convert backend response to expected format
        const tokens: AuthTokens = {
          access_token: response.data.access_token,
          refresh_token: response.data.refresh_token,
          id_token: response.data.access_token, // Using access_token as id_token for compatibility
          expires_in: response.data.expires_in || 3600
        };
        
        this.saveTokens(tokens);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        return {
          success: true,
          tokens: tokens,
          user: response.data.user,
          message: 'Login successful'
        };
      } else {
        // If API returns an error response
        return {
          success: false,
          error: 'login_failed',
          message: response.data.message || 'Login failed'
        };
      }
    } catch (error: any) {
      console.error('❌ Real API login failed:', {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText,
        code: error.code,
        isAxiosError: error.isAxiosError,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers,
          timeout: error.config?.timeout
        }
      });
      
      // Check for specific error types
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        return {
          success: false,
          error: 'timeout',
          message: 'Request timed out. Please check your connection and try again.'
        };
      }
      
      if (error.code === 'ERR_NETWORK' || !error.response) {
        return {
          success: false,
          error: 'network_error',
          message: 'Unable to connect to server. Please check if the server is running.'
        };
      }
      
      // Return proper error response
      return {
        success: false,
        error: error.response?.data?.error || 'login_failed',
        message: error.response?.data?.message || 'Failed to connect to server. Please try again.'
      };
    }
  }

  private mockLogin(email: string, password: string): AuthResponse {
    // Get registered users from localStorage
    const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
    const user = registeredUsers.find((u: any) => u.email === email && u.password === password);
    
    console.log('🔍 Mock login debug:', { email, password, userFound: !!user, totalUsers: registeredUsers.length });
    
    if (!user) {
      return {
        success: false,
        error: 'login_failed',
        message: 'Invalid email or password'
      };
    }

    // Ensure user has proper structure
    const formattedUser = {
      id: user.id,
      email: user.email,
      name: user.name || user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim(),
      first_name: user.first_name || user.name?.split(' ')[0] || '',
      last_name: user.last_name || user.name?.split(' ')[1] || '',
      role: user.role,
      email_verified: true,
      created_at: new Date().toISOString(),
      profile: user.profile || {}
    };

    // Create mock tokens
    const tokens = {
      access_token: `mock_token_${user.id}`,
      refresh_token: `mock_refresh_${user.id}`,
      id_token: `mock_id_${user.id}`,
      expires_in: 86400
    };

    // Save tokens and user
    this.saveTokens(tokens);
    localStorage.setItem('user', JSON.stringify(formattedUser));
    
    console.log('✅ Mock login successful:', { user: formattedUser, role: formattedUser.role });

    return {
      success: true,
      tokens,
      user: formattedUser,
      message: 'Login successful'
    };
  }

  async logout(): Promise<void> {
    try {
      const token = this.getAccessToken();
      if (token) {
        await this.api.post('/api/auth/logout');
      }
    } catch (error) {
      // Continue with local logout even if server logout fails
    } finally {
      this.clearTokens();
    }
  }

  async refreshAccessToken(): Promise<boolean> {
    if (!this.tokens?.refresh_token) {
      return false;
    }

    try {
      const response = await this.api.post<AuthResponse>('/api/auth/refresh', {
        refresh_token: this.tokens.refresh_token,
      });

      if (response.data.success && response.data.tokens) {
        this.saveTokens({
          ...this.tokens,
          ...response.data.tokens,
        });
        return true;
      }
      
      return false;
    } catch (error) {
      this.clearTokens();
      return false;
    }
  }

  // Password Management
  async forgotPassword(email: string): Promise<AuthResponse> {
    try {
      const response = await this.api.post<AuthResponse>('/api/auth/forgot-password', {
        email,
      });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'request_failed',
        message: error.response?.data?.message || 'Password reset request failed',
      };
    }
  }

  async resetPassword(
    email: string,
    code: string,
    newPassword: string
  ): Promise<AuthResponse> {
    try {
      const response = await this.api.post<AuthResponse>('/api/auth/reset-password', {
        email,
        confirmation_code: code,
        new_password: newPassword,
      });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'reset_failed',
        message: error.response?.data?.message || 'Password reset failed',
      };
    }
  }

  async changePassword(oldPassword: string, newPassword: string): Promise<AuthResponse> {
    try {
      const response = await this.api.post<AuthResponse>('/api/auth/change-password', {
        old_password: oldPassword,
        new_password: newPassword,
      });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'change_failed',
        message: error.response?.data?.message || 'Password change failed',
      };
    }
  }

  // MFA Methods
  async setupMFA(): Promise<{
    success: boolean;
    secret_code?: string;
    qr_code_url?: string;
    session?: string;
    error?: string;
    message?: string;
  }> {
    try {
      const response = await this.api.post('/api/auth/mfa/setup');
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'mfa_setup_failed',
        message: error.response?.data?.message || 'MFA setup failed',
      };
    }
  }

  async verifyMFA(code: string, session?: string): Promise<AuthResponse> {
    try {
      const response = await this.api.post<AuthResponse>('/api/auth/mfa/verify', {
        mfa_code: code,
        session,
      });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'mfa_verification_failed',
        message: error.response?.data?.message || 'MFA verification failed',
      };
    }
  }

  async disableMFA(): Promise<AuthResponse> {
    try {
      const response = await this.api.post<AuthResponse>('/api/auth/mfa/disable');
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'mfa_disable_failed',
        message: error.response?.data?.message || 'Failed to disable MFA',
      };
    }
  }

  // Challenge Response
  async respondToChallenge(
    challengeName: string,
    session: string,
    challengeResponse: Record<string, string>
  ): Promise<AuthResponse> {
    try {
      const response = await this.api.post<AuthResponse>('/api/auth/challenge', {
        challenge_name: challengeName,
        session,
        challenge_response: challengeResponse,
      });

      if (response.data.success && response.data.tokens) {
        this.saveTokens(response.data.tokens);
        if (response.data.user) {
          localStorage.setItem('user', JSON.stringify(response.data.user));
        }
      }

      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'challenge_failed',
        message: error.response?.data?.message || 'Challenge response failed',
      };
    }
  }

  // User Management
  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    console.log('🔍 getCurrentUser debug:', { userStr, user, role: user?.role });
    return user;
  }

  async updateProfile(data: Partial<User>): Promise<AuthResponse> {
    try {
      const response = await this.api.put<AuthResponse>('/api/auth/profile', data);
      if (response.data.success && response.data.user) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'update_failed',
        message: error.response?.data?.message || 'Profile update failed',
      };
    }
  }

  async deleteAccount(): Promise<AuthResponse> {
    try {
      const response = await this.api.delete<AuthResponse>('/api/auth/account');
      if (response.data.success) {
        this.clearTokens();
      }
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'delete_failed',
        message: error.response?.data?.message || 'Account deletion failed',
      };
    }
  }

  isAuthenticated(): boolean {
    return !!this.tokens?.access_token;
  }

  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    return user?.role === role;
  }

  // Session Management
  async validateSession(): Promise<boolean> {
    if (!this.isAuthenticated()) {
      return false;
    }

    try {
      const response = await this.api.get('/api/auth/validate');
      return response.data.valid === true;
    } catch (error) {
      return false;
    }
  }
}

export const cognitoAuthService = new CognitoAuthService();