import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { simpleAuthService } from '../services/auth/simpleAuthService';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'coach' | 'admin';
  email_verified?: boolean;
  phone_number?: string;
  created_at?: string;
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
    
    // Set up event listener for auth state changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth_tokens' || e.key === 'user') {
        loadUser();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const loadUser = async () => {
    setIsLoading(true);
    try {
      const currentUser = simpleAuthService.getCurrentUser();
      if (currentUser && simpleAuthService.isAuthenticated()) {
        setUser(currentUser);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to load user:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const result = await simpleAuthService.login(email, password);
    if (result.success && result.user) {
      setUser(result.user);
    }
    return result;
  };

  const logout = async () => {
    await simpleAuthService.logout();
    setUser(null);
  };

  const register = async (data: any) => {
    // Simple auth doesn't support registration yet
    return { success: false, error: 'Registration not supported' };
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const hasRole = (role: string | string[]): boolean => {
    if (!user) return false;
    if (Array.isArray(role)) {
      return role.includes(user.role);
    }
    return user.role === role;
  };

  const hasAnyRole = (roles: string[]): boolean => {
    if (!user) return false;
    return roles.some(role => user.role === role);
  };

  const hasAllRoles = (roles: string[]): boolean => {
    if (!user) return false;
    // In a single-role system, user can only have all roles if checking for one role
    return roles.length === 1 && roles[0] === user.role;
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
    hasAllRoles
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};