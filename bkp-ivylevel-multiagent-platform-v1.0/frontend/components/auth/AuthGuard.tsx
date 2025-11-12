import React, { useEffect, useState } from 'react';
import { cognitoAuthService } from '../../services/auth/cognitoAuthService';

interface AuthGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
  fallback?: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ 
  children, 
  redirectTo = '/login',
  fallback = null 
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isValidating, setIsValidating] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    setIsValidating(true);
    
    try {
      // Check if user has valid tokens
      const authenticated = cognitoAuthService.isAuthenticated();
      
      if (authenticated) {
        // Validate session with backend
        const isValid = await cognitoAuthService.validateSession();
        setIsAuthenticated(isValid);
        
        if (!isValid) {
          // Clear invalid session
          await cognitoAuthService.logout();
          window.location.href = redirectTo;
        }
      } else {
        setIsAuthenticated(false);
        window.location.href = redirectTo;
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setIsAuthenticated(false);
      window.location.href = redirectTo;
    } finally {
      setIsValidating(false);
    }
  };

  // Show loading state while validating
  if (isValidating) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // User is not authenticated
  if (!isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  // User is authenticated, render children
  return <>{children}</>;
};