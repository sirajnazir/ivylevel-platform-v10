// src/App-Demo.js
// Demo version with mock authentication for testing AI features

import React, { useState, useEffect } from 'react';
import AICoachingDashboard from './components/AICoachingDashboard';
import CoachOnboardingHub from './components/CoachOnboardingHub-v2';
import EnhancedAdminDashboard from './components/EnhancedAdminDashboard-v2';
import LoginEnhanced from './components/Login-Enhanced';
import './App.css';
import './styles/VideoPlayer.css';

// Mock authentication for demo
const mockAuth = {
  currentUser: null,
  signIn: (email, password) => {
    // Demo authentication
    const validAccounts = {
      'admin@ivylevel.com': { role: 'admin', name: 'Admin User' },
      'demo@ivymentors.co': { role: 'coach', name: 'Demo Coach', onboarded: true },
      'newcoach@ivymentors.co': { role: 'coach', name: 'New Coach', onboarded: false },
      'sarah@ivymentors.co': { role: 'coach', name: 'Sarah', onboarded: true },
      'kelvin@ivymentors.co': { role: 'coach', name: 'Kelvin', onboarded: true },
      'noor@ivymentors.co': { role: 'coach', name: 'Noor', onboarded: true }
    };

    if (validAccounts[email] && password === 'password123') {
      mockAuth.currentUser = {
        email,
        ...validAccounts[email]
      };
      return true;
    }
    return false;
  },
  signOut: () => {
    mockAuth.currentUser = null;
  }
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [demoMode, setDemoMode] = useState('select'); // select, admin, coach, onboarding

  // Mock login handler
  const handleMockLogin = (email, password) => {
    if (mockAuth.signIn(email, password)) {
      setUser(mockAuth.currentUser);
      
      // Set demo mode based on user
      if (mockAuth.currentUser.role === 'admin') {
        setDemoMode('admin');
      } else if (mockAuth.currentUser.role === 'coach') {
        setDemoMode(mockAuth.currentUser.onboarded ? 'coach' : 'onboarding');
      }
      return true;
    }
    return false;
  };

  const handleLogout = () => {
    mockAuth.signOut();
    setUser(null);
    setDemoMode('select');
  };

  // Quick demo mode selector for testing
  const DemoModeSelector = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center px-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">AI Coach Pro - Demo Mode</h1>
          <p className="text-xl text-gray-600">Choose a view to explore AI features</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Admin View */}
          <button
            onClick={() => {
              handleMockLogin('admin@ivylevel.com', 'password123');
            }}
            className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow text-left"
          >
            <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Admin Dashboard</h3>
            <p className="text-gray-600 mb-4">
              Manage coaches, view analytics, and oversee the entire platform
            </p>
            <div className="text-sm text-purple-600 font-medium">
              Explore Admin Features →
            </div>
          </button>

          {/* Coach View */}
          <button
            onClick={() => {
              handleMockLogin('demo@ivymentors.co', 'password123');
            }}
            className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow text-left"
          >
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">AI Coach Dashboard</h3>
            <p className="text-gray-600 mb-4">
              Experience AI-powered coaching with real-time insights and automation
            </p>
            <div className="text-sm text-blue-600 font-medium">
              See AI Features →
            </div>
          </button>

          {/* Onboarding View */}
          <button
            onClick={() => {
              handleMockLogin('newcoach@ivymentors.co', 'password123');
            }}
            className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow text-left"
          >
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Coach Onboarding</h3>
            <p className="text-gray-600 mb-4">
              YouTube-style training interface with personalized learning paths
            </p>
            <div className="text-sm text-green-600 font-medium">
              Start Training →
            </div>
          </button>
        </div>

        <div className="mt-12 text-center">
          <p className="text-gray-600 mb-4">Or use the login form for full experience</p>
          <button
            onClick={() => setDemoMode('login')}
            className="text-purple-600 hover:text-purple-700 font-medium"
          >
            Go to Login →
          </button>
        </div>
      </div>
    </div>
  );

  // Show appropriate view based on demo mode
  if (!user) {
    if (demoMode === 'login') {
      return <LoginEnhanced onLogin={handleMockLogin} />;
    }
    return <DemoModeSelector />;
  }

  // Admin View
  if (user.role === 'admin') {
    return <EnhancedAdminDashboard user={user} onLogout={handleLogout} />;
  }

  // Coach View
  if (user.role === 'coach') {
    // Check if needs onboarding
    if (!user.onboarded) {
      return (
        <CoachOnboardingHub 
          coachName={user.name} 
          studentName="Sarah Chen" // Demo student
        />
      );
    }

    // Show AI Dashboard
    return (
      <AICoachingDashboard 
        coach={user.name}
        student="Sarah Chen" // Demo student
        onLogout={handleLogout}
      />
    );
  }

  return <div>Unknown user type</div>;
}

export default App;