import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Auth Components
import { AuthProvider } from './hooks/useAuth';
import { useAuth } from './hooks/useAuth';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { Login } from './components/auth/Login';
import { Register } from './components/auth/Register';
import { AccountSettings } from './components/auth/AccountSettings';
import { SessionMonitor } from './components/auth/SessionMonitor';

// Student Components
import { StudentDashboard } from './components/student/StudentDashboard';
import HomePage from './pages/HomePage';

// Coach Components  
import ModernKnowledgeBase from './components/coach/ModernKnowledgeBase.jsx';
import CoachWelcome from './components/coach/CoachWelcome.jsx';
import SmartOnboardingSystem from './components/coach/SmartOnboardingSystem.jsx';
import { CoachDashboard } from './components/coach/CoachDashboard';
import EnhancedCoachDashboard from './components/coach/EnhancedCoachDashboard';
import { Training } from './components/coach/Training';
import { Students } from './components/coach/Students';
import { Resources } from './components/coach/Resources';
import { Analytics } from './components/analytics/Analytics';

// Admin Components
import { AdminDashboard } from './components/admin/AdminDashboard';

// Test Components
import TestAuth from './pages/TestAuth';

// Shared Components
import UnifiedHeader from './components/shared/UnifiedHeader';
import EntryPortal from './components/shared/EntryPortal';
import { ThemeProvider } from './contexts/ThemeContext';
import './styles/design-system.css';


// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (was cacheTime)
    },
  },
});

function AppRoutes() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = React.useState(() => new URLSearchParams(window.location.search));
  const roleParam = searchParams.get('role');

  // Removed global logout button - each dashboard component has its own logout button

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/" element={<EntryPortal />} />
        <Route path="/login" element={<Login onRegister={() => navigate('/register')} />} />
        <Route path="/register" element={<Register />} />
        <Route path="/test-auth" element={<TestAuth />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  return (
    <>
      <Routes>
        <Route path="/" element={
          <Navigate to={
            user?.role === 'admin' ? '/admin' : 
            user?.role === 'coach' ? '/coach' : 
            '/student'
          } replace />
        } />
        
        {/* Student Routes */}
        <Route path="/student" element={<ProtectedRoute><StudentDashboard /></ProtectedRoute>} />
        
        {/* Coach Routes */}
        <Route path="/coach/*" element={<ProtectedRoute><EnhancedCoachDashboard /></ProtectedRoute>} />
        
        {/* Admin Routes */}
        <Route path="/admin/*" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
        
        {/* Test Routes */}
        <Route path="/test-auth" element={<TestAuth />} />
        
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/register" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <Router>
            <div className="App">
              <SessionMonitor />
              <AppRoutes />
            </div>
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;