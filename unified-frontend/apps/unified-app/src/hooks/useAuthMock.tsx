import { useState, createContext, useContext, ReactNode, useEffect } from 'react';
import { metadataCacheService } from '../services/metadataCacheService';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'coach' | 'admin';
  studentId?: string; // For student role
  coachId?: string; // For coach role
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
  register: (data: any) => Promise<any>;
  updateUser: (user: User) => void;
  hasRole: (role: string | string[]) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  hasAllRoles: (roles: string[]) => boolean;
  clearAllUsers: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state from localStorage
  useEffect(() => {
    // Seed demo users
    const demoUsers = [
      {
        id: '1',
        email: 'hudasir4j@gmail.com',
        name: 'Huda',
        role: 'student',
        password: 'password123'
      },
      {
        id: '2',
        email: 'jennyduan@ivymentors.co',
        name: 'Jenny',
        role: 'coach',
        password: 'password123'
      },
      {
        id: '3',
        email: 'admin@ivylevel.com',
        name: 'Admin',
        role: 'admin',
        password: 'admin123'
      }
    ];
    
    // Initialize registered users array if it doesn't exist
    if (!localStorage.getItem('registeredUsers')) {
      localStorage.setItem('registeredUsers', JSON.stringify(demoUsers));
    } else {
      // Add demo users if they don't exist
      const existingUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
      let updated = false;
      
      demoUsers.forEach(demoUser => {
        if (!existingUsers.some((u: any) => u.email === demoUser.email)) {
          existingUsers.push(demoUser);
          updated = true;
        }
      });
      
      if (updated) {
        localStorage.setItem('registeredUsers', JSON.stringify(existingUsers));
      }
    }
    
    // Check if user is already logged in
    const savedUser = localStorage.getItem('user');
    const savedToken = localStorage.getItem('token');
    
    if (savedUser && savedToken) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
      } catch (error) {
        console.error('Error parsing saved user data:', error);
      }
    }
    
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    console.log('🔐 Login attempt:', { email });
    setIsLoading(true);
    try {
      // First try Agent Framework JWT backend (for AI Chat with 9 agents)
      const agentApiUrl = import.meta.env.VITE_AGENT_API_URL || 'http://localhost:4101/api';
      console.log('📡 Trying Agent Framework login:', agentApiUrl);

      try {
        const agentResponse = await fetch(`${agentApiUrl}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        if (agentResponse.ok) {
          const agentData = await agentResponse.json();
          console.log('✅ Agent Framework login successful');
          const authUser = agentData.coach || agentData.student;

          if (authUser) {
            // Map to unified format
            const unifiedUser: User = {
              id: authUser.user_id,
              email: authUser.email,
              name: authUser.name || authUser.email.split('@')[0],
              role: authUser.role,
              studentId: authUser.student_id || authUser.user_id, // For students
              coachId: authUser.coach_id, // For coaches
            };

            setUser(unifiedUser);
            localStorage.setItem('user', JSON.stringify(unifiedUser));
            localStorage.setItem('token', agentData.access_token);
            localStorage.setItem('refreshToken', agentData.refresh_token);
            localStorage.setItem('access_token', agentData.access_token);
            localStorage.setItem('refresh_token', agentData.refresh_token);
            metadataCacheService.reinitializeForUser();

            console.log('💾 Agent Framework auth stored');
            return { success: true, user: unifiedUser };
          }
        }
      } catch (agentError) {
        console.log('⚠️ Agent Framework unavailable, trying fallback');
      }

      // Fallback to original API
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4101';
      const loginUrl = `${apiUrl}/api/auth/login`;
      console.log('📡 Making API request to:', loginUrl);
      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      console.log('📡 Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Login successful, data:', data);
        const authUser: User = data.user;

        // Store auth data
        setUser(authUser);
        localStorage.setItem('user', JSON.stringify(authUser));
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('refreshToken', data.refresh_token);

        // Reinitialize cache for new user
        metadataCacheService.reinitializeForUser();

        console.log('💾 Auth data stored, user state updated');
        return { success: true, user: authUser };
      } else {
        console.log('❌ API login failed, status:', response.status);
        const errorData = await response.json();
        console.log('❌ Error data:', errorData);
        // Fallback to localStorage for demo
        const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
        const user = registeredUsers.find((u: any) => u.email === email && u.password === password);

        if (user) {
          setUser(user);
          localStorage.setItem('user', JSON.stringify(user));
          localStorage.setItem('token', 'user-token-' + user.id);
          metadataCacheService.reinitializeForUser();
          return { success: true, user };
        }

        return { success: false, message: 'Invalid email or password' };
      }
    } catch (error) {
      console.error('Login error:', error);
      // Fallback to localStorage
      const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
      const user = registeredUsers.find((u: any) => u.email === email && u.password === password);

      if (user) {
        setUser(user);
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('token', 'user-token-' + user.id);
        return { success: true, user };
      }

      return { success: false, message: 'Login failed. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        // Add timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
        
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
      }
    } catch (error) {
      // Don't block logout on API error
      console.error('Logout API error (continuing with local logout):', error);
    }
    
    // Always clear local state regardless of API response
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    
    // Clear all user-specific caches
    metadataCacheService.clearAllUserCaches();
  };

  const register = async (data: any) => {
    try {
      // Try backend registration first
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          first_name: data.firstName || data.name?.split(' ')[0] || '',
          last_name: data.lastName || data.name?.split(' ')[1] || '',
          role: data.role || 'student',
          phone_number: data.phoneNumber,
          grade: data.grade,
          school: data.school,
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        const authUser: User = result.user;
        
        // Auto login after registration
        setUser(authUser);
        localStorage.setItem('user', JSON.stringify(authUser));
        localStorage.setItem('token', result.access_token);
        localStorage.setItem('refreshToken', result.refresh_token);
        
        return { success: true, user: authUser };
      } else {
        const errorData = await response.json();
        return { success: false, message: errorData.detail || 'Registration failed' };
      }
    } catch (error) {
      console.error('Registration error:', error);
      
      // Fallback to localStorage registration
      const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
      const existingUser = registeredUsers.find((u: any) => u.email === data.email);
      if (existingUser) {
        return { success: false, message: 'User with this email already exists' };
      }

      const newUser = {
        id: Date.now().toString(),
        email: data.email,
        name: data.name,
        role: data.role,
        password: data.password // In production, this should be hashed
      };

      registeredUsers.push(newUser);
      localStorage.setItem('registeredUsers', JSON.stringify(registeredUsers));

      // Auto-login after registration
      return await login(data.email, data.password);
    }
  };

  const updateUser = (user: User) => {
    setUser(user);
  };

  const clearAllUsers = () => {
    localStorage.removeItem('registeredUsers');
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    localStorage.setItem('registeredUsers', JSON.stringify([]));
  };

  const hasRole = (role: string | string[]) => {
    if (!user) return false;
    const roles = Array.isArray(role) ? role : [role];
    return roles.includes(user.role);
  };

  const hasAnyRole = (roles: string[]) => {
    if (!user) return false;
    return roles.some(role => role === user.role);
  };

  const hasAllRoles = (roles: string[]) => {
    if (!user) return false;
    return roles.every(role => role === user.role);
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    register,
    updateUser,
    hasRole,
    hasAnyRole,
    hasAllRoles,
    clearAllUsers,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default useAuth;