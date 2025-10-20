import React from 'react';
import { useAuth } from '../../hooks/useAuth';

interface RoleBasedComponentProps {
  children: React.ReactNode;
  roles?: string[];
  fallback?: React.ReactNode;
  requireAll?: boolean;
}

export const RoleBasedComponent: React.FC<RoleBasedComponentProps> = ({
  children,
  roles,
  fallback = null,
  requireAll = false
}) => {
  const { user, hasRole, hasAnyRole, hasAllRoles } = useAuth();

  // If no roles specified, just check if authenticated
  if (!roles || roles.length === 0) {
    return user ? <>{children}</> : <>{fallback}</>;
  }

  // Check role requirements
  let hasAccess = false;
  if (requireAll) {
    hasAccess = hasAllRoles(roles);
  } else {
    hasAccess = hasAnyRole(roles);
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
};

// Convenience components for common use cases
export const AdminOnly: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({ 
  children, 
  fallback 
}) => (
  <RoleBasedComponent roles={['admin']} fallback={fallback}>
    {children}
  </RoleBasedComponent>
);

export const CoachOnly: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({ 
  children, 
  fallback 
}) => (
  <RoleBasedComponent roles={['coach']} fallback={fallback}>
    {children}
  </RoleBasedComponent>
);

export const StudentOnly: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({ 
  children, 
  fallback 
}) => (
  <RoleBasedComponent roles={['student']} fallback={fallback}>
    {children}
  </RoleBasedComponent>
);

export const CoachOrAdmin: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({ 
  children, 
  fallback 
}) => (
  <RoleBasedComponent roles={['coach', 'admin']} fallback={fallback}>
    {children}
  </RoleBasedComponent>
);