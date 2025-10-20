import React from 'react';
import { cognitoAuthService } from '../../services/auth/cognitoAuthService';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: string[];
  fallback?: React.ReactNode;
  redirectTo?: string;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ 
  children, 
  allowedRoles,
  fallback = null,
  redirectTo
}) => {
  const user = cognitoAuthService.getCurrentUser();
  
  if (!user) {
    // No user found, redirect to login
    if (redirectTo) {
      window.location.href = redirectTo;
    }
    return fallback || (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Unauthorized</h2>
          <p className="text-gray-600">You need to be logged in to access this page.</p>
        </div>
      </div>
    );
  }

  // Check if user has required role
  const hasRequiredRole = allowedRoles.includes(user.role);
  
  if (!hasRequiredRole) {
    // User doesn't have required role
    if (redirectTo) {
      window.location.href = redirectTo;
    }
    return fallback || (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">
            You don't have permission to access this page.
          </p>
          <p className="text-sm text-gray-500">
            Required role: {allowedRoles.join(' or ')}
          </p>
          <button
            onClick={() => window.history.back()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // User has required role, render children
  return <>{children}</>;
};