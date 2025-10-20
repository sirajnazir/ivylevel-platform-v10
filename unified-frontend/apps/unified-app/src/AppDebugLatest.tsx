import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './hooks/useAuthMock';
import useAuth from './hooks/useAuthMock';
import { StudentDashboard } from './components/student/StudentDashboard';
import { Login } from './components/auth/Login';
import EntryPortal from './components/shared/EntryPortal';
import EnhancedCoachDashboard from './components/coach/EnhancedCoachDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import './styles/design-system.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    },
  },
});

function AppContent() {
  const { isAuthenticated, user: userInfo, logout } = useAuth();
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    // Debug info
    setDebugInfo({
      isAuthenticated,
      userInfo,
      localStorage: {
        authToken: localStorage.getItem('authToken'),
        userRole: localStorage.getItem('userRole'),
        userEmail: localStorage.getItem('userEmail'),
      },
      timestamp: new Date().toISOString(),
    });
    console.log('App State:', { isAuthenticated, userInfo });
    if (userInfo) {
      console.log('👤 User Details:', {
        name: userInfo.name,
        email: userInfo.email,
        role: userInfo.role,
        id: userInfo.id
      });
    }
  }, [isAuthenticated, userInfo]);

  // Show debug info
  if (window.location.search.includes('debug=true')) {
    return (
      <div style={{ padding: '20px', fontFamily: 'monospace' }}>
        <h1>Debug Mode</h1>
        <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
        <button onClick={() => {
          localStorage.clear();
          window.location.reload();
        }}>Clear LocalStorage & Reload</button>
        <button onClick={() => window.location.href = '/'}>Go to App</button>
      </div>
    );
  }

  // Not authenticated - show entry portal
  if (!isAuthenticated) {
    return <EntryPortal />;
  }

  // Authenticated - show appropriate dashboard based on role
  if (userInfo?.role === 'student') {
    return <StudentDashboard />;
  }

  if (userInfo?.role === 'coach') {
    return <EnhancedCoachDashboard />;
  }

  if (userInfo?.role === 'admin') {
    return <AdminDashboard />;
  }

  // Fallback for unknown roles
  return (
    <div style={{ padding: '20px' }}>
      <h1>Welcome {userInfo?.name || userInfo?.email}</h1>
      <p>Role: {userInfo?.role}</p>
      <p>Unknown role type. Please contact support.</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

export default function AppDebugLatest() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
}