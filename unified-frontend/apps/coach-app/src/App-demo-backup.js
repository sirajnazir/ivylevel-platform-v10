// src/App.js
// Simplified demo app to showcase AI features

import React, { useState } from 'react';
import AICoachingDashboard from './components/AICoachingDashboard';
import CoachOnboardingHub from './components/CoachOnboardingHub-v2';
import EnhancedAdminDashboard from './components/EnhancedAdminDashboard-v2';
import './App.css';

function App() {
  const [view, setView] = useState('select');
  const [userRole, setUserRole] = useState(null);
  const [userName, setUserName] = useState('');

  const DemoSelector = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center px-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4 flex items-center justify-center gap-3">
            <span className="text-6xl">🧠</span>
            AI Coach Pro
            <span className="text-4xl">✨</span>
          </h1>
          <p className="text-xl text-gray-600">Choose a role to explore AI-powered coaching features!</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Admin View */}
          <button
            onClick={() => {
              setUserRole('admin');
              setUserName('Admin');
              setView('app');
            }}
            className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all text-left group"
          >
            <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <span className="text-2xl">👨‍💼</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Admin Dashboard</h3>
            <p className="text-gray-600 mb-4">
              Manage coaches, create onboarding packages, view platform analytics
            </p>
            <div className="text-sm text-purple-600 font-medium">
              Explore Admin Features →
            </div>
          </button>

          {/* Coach View */}
          <button
            onClick={() => {
              setUserRole('coach');
              setUserName('Sarah');
              setView('app');
            }}
            className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all text-left group"
          >
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <span className="text-2xl">🎯</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">AI Coach Dashboard</h3>
            <p className="text-gray-600 mb-4">
              Experience real-time AI assistance, smart planning, and automated workflows
            </p>
            <div className="text-sm text-blue-600 font-medium">
              See AI Features →
            </div>
          </button>

          {/* Onboarding View */}
          <button
            onClick={() => {
              setUserRole('onboarding');
              setUserName('New Coach');
              setView('app');
            }}
            className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all text-left group"
          >
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <span className="text-2xl">📚</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Coach Onboarding</h3>
            <p className="text-gray-600 mb-4">
              YouTube-style training with personalized learning paths
            </p>
            <div className="text-sm text-green-600 font-medium">
              Start Training →
            </div>
          </button>
        </div>

        <div className="mt-12 bg-white rounded-xl shadow-lg p-6">
          <h3 className="font-bold text-gray-900 mb-4">🚀 AI Features You'll Experience:</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-xl">🎙️</span>
              <span>Voice AI Assistant</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">📊</span>
              <span>Real-time Analytics</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🎯</span>
              <span>Smart Resources</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">📅</span>
              <span>AI Planning</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🎥</span>
              <span>Video Training</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">⚡</span>
              <span>Automation</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">💡</span>
              <span>Predictive Insights</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">📈</span>
              <span>Success Patterns</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const handleLogout = () => {
    setView('select');
    setUserRole(null);
    setUserName('');
  };

  if (view === 'select') {
    return <DemoSelector />;
  }

  // Mock user object
  const user = {
    email: userRole === 'admin' ? 'admin@ivylevel.com' : `${userName.toLowerCase()}@ivymentors.co`,
    displayName: userName
  };

  if (userRole === 'admin') {
    return <EnhancedAdminDashboard user={user} onLogout={handleLogout} />;
  }

  if (userRole === 'coach') {
    return (
      <AICoachingDashboard 
        coach={userName}
        student="Michael Chen"
        onLogout={handleLogout}
      />
    );
  }

  if (userRole === 'onboarding') {
    return (
      <CoachOnboardingHub 
        coachName={userName}
        studentName="Emma Wilson"
      />
    );
  }

  return null;
}

export default App;