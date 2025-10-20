// src/App-AI.js
// Main App component with AI-powered coaching features

import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AICoachingDashboard from './components/AICoachingDashboard';
import CoachOnboardingHub from './components/CoachOnboardingHub-v2';
import EnhancedAdminDashboard from './components/EnhancedAdminDashboard-v2';
import Login from './components/Login';
import './App.css';
import './styles/VideoPlayer.css';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [coachProfile, setCoachProfile] = useState(null);
  const [currentStudent, setCurrentStudent] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        // Determine user role based on email or database lookup
        const role = await determineUserRole(user);
        setUserRole(role);
        
        if (role === 'coach') {
          // Load coach profile and assigned students
          const profile = await loadCoachProfile(user.email);
          setCoachProfile(profile);
          // Set first student as current by default
          if (profile?.assignedStudents?.length > 0) {
            setCurrentStudent(profile.assignedStudents[0]);
          }
        }
      } else {
        setUser(null);
        setUserRole(null);
        setCoachProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const determineUserRole = async (user) => {
    // Check if user is admin
    if (user.email === 'admin@ivylevel.com' || user.email === 'siraj@ivylevel.com') {
      return 'admin';
    }
    // Check if user is a coach (ends with @ivymentors.co)
    if (user.email.endsWith('@ivymentors.co')) {
      return 'coach';
    }
    // Otherwise, assume student
    return 'student';
  };

  const loadCoachProfile = async (email) => {
    // In a real app, this would fetch from Firestore
    // For now, return mock data
    const coachName = email.split('@')[0];
    return {
      name: coachName.charAt(0).toUpperCase() + coachName.slice(1),
      email: email,
      assignedStudents: [
        { id: 1, name: 'Sarah Chen', grade: 'sophomore', track: 'biomed' },
        { id: 2, name: 'Michael Park', grade: 'junior', track: 'cs' },
        { id: 3, name: 'Emma Wilson', grade: 'freshman', track: 'business' }
      ],
      stats: {
        totalSessions: 48,
        completedSessions: 12,
        averageRating: 4.8,
        studentProgress: 78
      }
    };
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      setUser(null);
      setUserRole(null);
      setCoachProfile(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading AI Coach Pro...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  // Admin View
  if (userRole === 'admin') {
    return <EnhancedAdminDashboard user={user} onLogout={handleLogout} />;
  }

  // Coach View with AI Features
  if (userRole === 'coach') {
    // Check if coach needs onboarding
    const needsOnboarding = !coachProfile?.onboardingCompleted;
    
    if (needsOnboarding && currentStudent) {
      return (
        <CoachOnboardingHub 
          coachName={coachProfile.name} 
          studentName={currentStudent.name}
        />
      );
    }

    return (
      <AICoachingDashboard 
        coach={coachProfile.name}
        student={currentStudent?.name || 'No Student Assigned'}
        onLogout={handleLogout}
      />
    );
  }

  // Student View (placeholder)
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Student Dashboard</h1>
          <p className="text-gray-600">Welcome, {user.email}</p>
          <button
            onClick={handleLogout}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;