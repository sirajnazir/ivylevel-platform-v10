import React, { useState, useEffect, useRef } from 'react';
import EnhancedWelcomeExperience from './components/EnhancedWelcomeExperience';
import StudentMasteryModule from './components/StudentMasteryModule';
import TechnicalValidationModule from './components/TechnicalValidationModule';
import SessionSimulationModule from './components/SessionSimulationModule';
import FinalCertificationModule from './components/FinalCertificationModule';



// Import all the enhanced modules (these would be separate component files in your project)
// For this demo, I'll include simplified versions inline

// Enhanced Icons
const icons = {
  Trophy: () => (
    <svg style={{width: '24px', height: '24px', minWidth: '24px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  ),
  Settings: () => (
    <svg style={{width: '24px', height: '24px', minWidth: '24px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  User: () => (
    <svg style={{width: '24px', height: '24px', minWidth: '24px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  Users: () => (
    <svg style={{width: '24px', height: '24px', minWidth: '24px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
    </svg>
  ),
  Video: () => (
    <svg style={{width: '24px', height: '24px', minWidth: '24px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  ),
  Brain: () => (
    <svg style={{width: '24px', height: '24px', minWidth: '24px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
  CheckCircle: () => (
    <svg style={{width: '24px', height: '24px', minWidth: '24px'}} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
    </svg>
  ),
  XCircle: () => (
    <svg style={{width: '24px', height: '24px', minWidth: '24px'}} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11H7v-2h10v2z"/>
    </svg>
  ),
  AlertCircle: () => (
    <svg style={{width: '24px', height: '24px', minWidth: '24px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10"></circle>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01" />
    </svg>
  ),
  Upload: () => (
    <svg style={{width: '24px', height: '24px', minWidth: '24px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
  ),
  Camera: () => (
    <svg style={{width: '24px', height: '24px', minWidth: '24px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Play: () => (
    <svg style={{width: '24px', height: '24px', minWidth: '24px'}} fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z"/>
    </svg>
  ),
  Monitor: () => (
    <svg style={{width: '24px', height: '24px', minWidth: '24px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
      <line x1="8" y1="21" x2="16" y2="21"></line>
      <line x1="12" y1="17" x2="12" y2="21"></line>
    </svg>
  ),
  FileText: () => (
    <svg style={{width: '24px', height: '24px', minWidth: '24px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  Rocket: () => (
    <svg style={{width: '24px', height: '24px', minWidth: '24px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  Star: () => (
    <svg style={{width: '24px', height: '24px', minWidth: '24px'}} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  ),
  BarChart3: () => (
    <svg style={{width: '24px', height: '24px', minWidth: '24px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  Clock: () => (
    <svg style={{width: '16px', height: '16px', minWidth: '16px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10"></circle>
      <polyline points="12,6 12,12 16,14"></polyline>
    </svg>
  ),
  Target: () => (
    <svg style={{width: '16px', height: '16px', minWidth: '16px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10"></circle>
      <circle cx="12" cy="12" r="6"></circle>
      <circle cx="12" cy="12" r="2"></circle>
    </svg>
  ),
  Lock: () => (
    <svg style={{width: '20px', height: '20px', minWidth: '20px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  ),
  Unlock: () => (
    <svg style={{width: '20px', height: '20px', minWidth: '20px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
    </svg>
  ),
  LogOut: () => (
    <svg style={{width: '20px', height: '20px', minWidth: '20px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  ),
  Plus: () => (
    <svg style={{width: '20px', height: '20px', minWidth: '20px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  Edit: () => (
    <svg style={{width: '16px', height: '16px', minWidth: '16px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  Trash: () => (
    <svg style={{width: '16px', height: '16px', minWidth: '16px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  Eye: () => (
    <svg style={{width: '16px', height: '16px', minWidth: '16px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ),
  Download: () => (
    <svg style={{width: '16px', height: '16px', minWidth: '16px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  ChevronRight: () => (
    <svg style={{width: '20px', height: '20px', minWidth: '20px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
  Heart: () => (
    <svg style={{width: '20px', height: '20px', minWidth: '20px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  ),
  Award: () => (
    <svg style={{width: '24px', height: '24px', minWidth: '24px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15l3.4 3.4a1 1 0 01.2 1.1l-2 5a1 1 0 01-1.9 0l-2-5a1 1 0 01.2-1.1L12 15zm0 0V8m0 0l-3.4-3.4a1 1 0 01-.2-1.1l2-5a1 1 0 011.9 0l2 5a1 1 0 01-.2 1.1L12 8z" />
    </svg>
  )
};

// Mock database - In production, this would be a real database
const mockDatabase = {
  // Admin credentials
  admin: {
    email: 'admin@ivymentors.co',
    accessCode: 'ADMIN2025',
    role: 'admin',
    name: 'Admin User'
  },
  
  // Coach accounts
  coaches: {
    'sarah@ivymentors.co': {
      email: 'sarah@ivymentors.co',
      accessCode: 'SC2025A1',
      role: 'coach',
      name: 'Sarah Chen',
      onboardingStarted: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48 hours
      studentProfile: {
        name: 'Emma Johnson',
        grade: '11th',
        focusArea: 'pre-med',
        interests: ['Biology', 'Volunteering'],
        academicProfile: 'High GPA, needs SAT improvement',
        culturalBackground: 'Asian-American',
        previousCoaching: false,
        parentContact: 'parent@email.com',
        programType: '24-week'
      },
      progress: {
        currentModule: 0,
        currentStep: 0,
        completedModules: new Set(),
        unlockedModules: new Set(['welcome']),
        validationResults: {
          emailSetup: { status: 'pending', message: '', evidence: null },
          zoomIntegration: { status: 'pending', message: '', evidence: null },
          mercuryPayment: { status: 'pending', message: '', evidence: null },
          studentProfileMastery: { status: 'pending', message: '', score: 0 }
        },
        readinessScore: 0,
        pointsEarned: 0
      },
      personalizedResources: []
    }
  },
  
  // Global resources
  globalResources: [
    {
      id: '1',
      title: 'Pre-Med Student Coaching Guide',
      type: 'document',
      category: 'pre-med',
      uploadDate: new Date().toISOString(),
      size: '2.4 MB',
      description: 'Comprehensive guide for coaching pre-med track students',
      googleDriveLink: 'https://drive.google.com/file/d/1abc123_premed_guide/view?usp=sharing',
      accessLevel: 'view-only',
      isSecure: true,
      restrictedAccess: true
    }
  ]
};

// Import Enhanced Components (in real app, these would be separate files)
// For now, I'll include simplified inline versions


// Main App Component
function App() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loginForm, setLoginForm] = useState({ email: '', accessCode: '' });
  const [loginError, setLoginError] = useState('');
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showEnhancedWelcome, setShowEnhancedWelcome] = useState(false);
  
  // Admin State
  const [adminView, setAdminView] = useState('dashboard');
  const [selectedCoach, setSelectedCoach] = useState(null);
  const [uploadModal, setUploadModal] = useState(false);
  const [newResource, setNewResource] = useState({
    title: '',
    type: 'document',
    category: '',
    description: '',
    assignedCoaches: [],
    googleDriveLink: '',
    accessLevel: 'view-only',
    isSecure: true,
    uploadMethod: 'google-drive'
  });

  // Coach Training State
  const [currentModule, setCurrentModule] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedModules, setCompletedModules] = useState(new Set());
  const [unlockedModules, setUnlockedModules] = useState(new Set(['welcome']));
  const [timeSpent, setTimeSpent] = useState(0);
  const [sessionSimulationActive, setSessionSimulationActive] = useState(false);
  const [simulationScenario, setSimulationScenario] = useState(null);
  const [uploadedEvidence, setUploadedEvidence] = useState({});
  
  // File upload ref
  const fileInputRef = useRef(null);

  // Load user progress on authentication
  useEffect(() => {
    if (currentUser && currentUser.role === 'coach') {
      const progress = currentUser.progress;
      setCurrentModule(progress.currentModule);
      setCurrentStep(progress.currentStep);
      setCompletedModules(progress.completedModules);
      setUnlockedModules(progress.unlockedModules);
    }
  }, [currentUser]);

  // Save progress to mock database
  const saveProgress = () => {
    if (currentUser && currentUser.role === 'coach') {
      mockDatabase.coaches[currentUser.email].progress = {
        ...currentUser.progress,
        currentModule,
        currentStep,
        completedModules,
        unlockedModules
      };
    }
  };

  // Calculate readiness score
  const calculateReadinessScore = () => {
    if (!currentUser || currentUser.role !== 'coach') return 0;
    
    const validations = currentUser.progress.validationResults;
    let score = 0;
    let total = 0;
    
    // Technical validations (40% weight)
    ['emailSetup', 'zoomIntegration', 'mercuryPayment'].forEach(key => {
      total += 13.33;
      if (validations[key]?.status === 'success') {
        score += 13.33;
      }
    });
    
    // Student mastery (30% weight)
    total += 30;
    if (validations.studentProfileMastery?.status === 'success') {
      score += (validations.studentProfileMastery.score / 100) * 30;
    }
    
    // Module completion (30% weight)
    const trainingModules = getPersonalizedModules();
    total += 30;
    const moduleProgress = (completedModules.size / trainingModules.length) * 30;
    score += moduleProgress;
    
    return Math.round(score);
  };

  // Timer effect
  useEffect(() => {
    if (isAuthenticated && currentUser?.role === 'coach') {
      const timer = setInterval(() => {
        setTimeSpent(prev => prev + 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isAuthenticated, currentUser]);

  // Urgency notification effect
  useEffect(() => {
    if (currentUser?.role === 'coach') {
      const timeRemaining = new Date(currentUser.expiresAt) - new Date();
      const hoursRemaining = timeRemaining / (1000 * 60 * 60);
      
      if (hoursRemaining < 6 && hoursRemaining > 0) {
        // Show urgent notification
        const notification = document.createElement('div');
        notification.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: #dc2626;
          color: white;
          padding: 16px 24px;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          z-index: 9999;
          animation: slide-in 0.3s ease-out;
        `;
        notification.innerHTML = `
          <strong>⚠️ URGENT: ${Math.floor(hoursRemaining)}h remaining!</strong><br>
          Complete training now or lose your position.
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => {
          notification.remove();
        }, 10000);
      }
    }
  }, [currentUser, currentModule]);

  // Authentication Functions
  const handleLogin = (e) => {
    if (e) e.preventDefault();
    setLoginError('');

    const { email, accessCode } = loginForm;
    
    if (!email || !accessCode) {
      setLoginError('Please enter both email and access code.');
      return;
    }
    
    // Check admin credentials
    if (mockDatabase.admin.email === email && mockDatabase.admin.accessCode === accessCode) {
      setCurrentUser(mockDatabase.admin);
      setIsAuthenticated(true);
      return;
    }

    // Check coach credentials
    const coach = mockDatabase.coaches[email];
    if (coach && coach.accessCode === accessCode) {
      // Check if access hasn't expired
      if (new Date() > new Date(coach.expiresAt)) {
        setLoginError('Your 48-hour access window has EXPIRED. Contact admin immediately for a new code.');
        return;
      }
      
      setCurrentUser(coach);
      setIsAuthenticated(true);
      
      // Show enhanced welcome modal for coaches
      setShowEnhancedWelcome(true);
      return;
    }

    setLoginError('Invalid email or access code. Please check your credentials.');
  };

  const handleLogout = () => {
    if (currentUser?.role === 'coach') {
      saveProgress();
    }
    setIsAuthenticated(false);
    setCurrentUser(null);
    setLoginForm({ email: '', accessCode: '' });
  };

  // Admin Functions
  const getAllCoaches = () => {
    return Object.values(mockDatabase.coaches).map(coach => ({
      ...coach,
      timeRemaining: Math.max(0, new Date(coach.expiresAt) - new Date()),
      expired: new Date() > new Date(coach.expiresAt)
    }));
  };

  const getCoachStats = () => {
    const coaches = getAllCoaches();
    return {
      total: coaches.length,
      active: coaches.filter(c => !c.expired).length,
      completed: coaches.filter(c => c.progress.readinessScore >= 90).length,
      atRisk: coaches.filter(c => c.timeRemaining < 12 * 60 * 60 * 1000 && c.progress.readinessScore < 70).length
    };
  };

  const addPersonalizedResource = (coachEmail, resourceId) => {
    if (mockDatabase.coaches[coachEmail]) {
      const resource = mockDatabase.globalResources.find(r => r.id === resourceId);
      if (resource && !mockDatabase.coaches[coachEmail].personalizedResources.find(r => r.id === resourceId)) {
        mockDatabase.coaches[coachEmail].personalizedResources.push({
          ...resource,
          assignedDate: new Date().toISOString()
        });
      }
    }
  };

  const removePersonalizedResource = (coachEmail, resourceId) => {
    if (mockDatabase.coaches[coachEmail]) {
      mockDatabase.coaches[coachEmail].personalizedResources = 
        mockDatabase.coaches[coachEmail].personalizedResources.filter(r => r.id !== resourceId);
    }
  };

  // Coach Training Functions
  const getPersonalizedModules = () => {
    if (!currentUser || currentUser.role !== 'coach') return [];
    
    const studentProfile = currentUser.studentProfile;
    const baseModules = [
      {
        id: 'welcome',
        title: 'Welcome & Elite Selection',
        icon: icons.Trophy,
        duration: '5 min',
        type: 'interactive',
        progress: 0,
        unlocked: unlockedModules.has('welcome'),
        description: 'Discover your exclusive position and impact potential',
        steps: [
          { type: 'video', title: 'Welcome Message', content: 'Personal welcome from Ivylevel leadership' },
          { type: 'interactive', title: 'Coach Profile Setup', content: 'Tell us about yourself and your coaching strengths' },
          { type: 'quiz', title: 'Culture Check', content: 'Understanding Ivylevel values and mission' }
        ]
      },
      {
        id: 'student-profile',
        title: 'Your Student Assignment',
        icon: icons.User,
        duration: '10 min',
        type: 'personalized',
        progress: 0,
        unlocked: unlockedModules.has('student-profile'),
        description: `Meet ${studentProfile.name} and understand their profile`,
        steps: [
          { type: 'student-review', title: 'Student Profile Deep Dive', content: `Comprehensive review of ${studentProfile.name}'s background and goals` },
          { type: 'resources', title: 'Personalized Resources', content: 'Access your student-specific training materials' },
          { type: 'quiz', title: 'Comprehension Check', content: 'Verify understanding of student needs' }
        ]
      },
      {
        id: 'setup',
        title: 'Technical Foundation',
        icon: icons.Settings,
        duration: '15 min',
        type: 'validation',
        progress: 0,
        unlocked: unlockedModules.has('setup'),
        description: 'Interactive setup wizard with real-time validation',
        steps: [
          { type: 'validation', title: 'Email Setup & Verification', content: 'Step-by-step email configuration with validation' },
          { type: 'validation', title: 'Zoom Integration & Testing', content: 'Guided Zoom setup with live testing' },
          { type: 'validation', title: 'Payment Setup & Confirmation', content: 'Mercury account configuration with verification' }
        ]
      }
    ];

    // Add personalized modules based on student profile
    if (studentProfile.grade === '9th') {
      baseModules.push({
        id: 'freshman-specific',
        title: 'Freshman Coaching Mastery',
        icon: icons.Brain,
        duration: '20 min',
        type: 'specialized',
        progress: 0,
        unlocked: unlockedModules.has('freshman-specific'),
        description: 'Specialized techniques for 9th grade students',
        steps: [
          { type: 'training', title: 'Foundation Building', content: 'Focus on GPA establishment and study habits' },
          { type: 'simulation', title: 'Freshman Session Practice', content: 'Practice typical freshman coaching scenarios' }
        ]
      });
    }

    if (studentProfile.focusArea === 'pre-med') {
      baseModules.push({
        id: 'premed-coaching',
        title: 'Pre-Med Student Excellence',
        icon: icons.Brain,
        duration: '25 min',
        type: 'specialized',
        progress: 0,
        unlocked: unlockedModules.has('premed-coaching'),
        description: 'Advanced strategies for pre-med track students',
        steps: [
          { type: 'training', title: 'Medical School Prep Strategy', content: 'MCAT, shadowing, and clinical experience guidance' },
          { type: 'simulation', title: 'Pre-Med Coaching Simulation', content: 'Practice handling pre-med specific challenges' }
        ]
      });
    }

    baseModules.push(
      {
        id: 'session-mastery',
        title: 'Session Excellence',
        icon: icons.Video,
        duration: '25 min',
        type: 'practical',
        progress: 0,
        unlocked: unlockedModules.has('session-mastery'),
        description: 'Master the art of transformational 60-minute coaching sessions',
        steps: [
          { type: 'interactive', title: 'Session Flow Mastery', content: 'Interactive practice of optimal session structure' },
          { type: 'simulation', title: 'Live Session Practice', content: 'Full 60-minute practice session with your student scenario' },
          { type: 'checklist', title: 'Excellence Verification', content: 'Final readiness checklist with evidence submission' }
        ]
      },
      {
        id: 'final-certification',
        title: 'Final Certification',
        icon: icons.Trophy,
        duration: '15 min',
        type: 'certification',
        progress: 0,
        unlocked: unlockedModules.has('final-certification'),
        description: 'Complete your certification and schedule your first session',
        steps: [
          { type: 'certification', title: 'Coach Pledge & Certification', content: 'Final steps to become certified' }
        ]
      }
    );

    return baseModules;
  };

  const trainingModules = getPersonalizedModules();

  const completeStep = (moduleId, stepIndex) => {
    const newCompleted = new Set(completedModules);
    const moduleIndex = trainingModules.findIndex(m => m.id === moduleId);
    
    if (stepIndex === trainingModules[moduleIndex].steps.length - 1) {
      newCompleted.add(moduleId);
      setCompletedModules(newCompleted);
      
      // Unlock next module
      if (moduleIndex < trainingModules.length - 1) {
        const nextModuleId = trainingModules[moduleIndex + 1].id;
        setUnlockedModules(prev => new Set([...prev, nextModuleId]));
      }
      
      // Move to next module if available
      if (moduleIndex < trainingModules.length - 1) {
        setCurrentModule(moduleIndex + 1);
        setCurrentStep(0);
      }
      
      // Save progress
      saveProgress();
    } else {
      setCurrentStep(stepIndex + 1);
    }
  };

  // Helper function to format time
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  // This is the COMPLETE replacement for renderStepContent function
  function renderStepContent(module, stepIndex) {
    const step = module.steps[stepIndex];
    
    switch (step.type) {
      case 'interactive':
        if (step.title === 'Coach Profile Setup') {
          return renderCoachProfileSetup();
        }
        // For any other interactive steps, return a default
        return renderDefaultStep();
        
      case 'student-review':
        return (
          <StudentMasteryModule
            student={currentUser.studentProfile}
            onComplete={(score) => {
              const newValidations = { ...currentUser.progress.validationResults };
              newValidations.studentProfileMastery = {
                status: score >= 80 ? 'success' : 'error',
                message: score >= 80 ? 'Mastery achieved!' : 'Review needed',
                score: score
              };
              currentUser.progress.validationResults = newValidations;
              currentUser.progress.readinessScore = calculateReadinessScore();
              saveProgress();
              completeStep(module.id, stepIndex);
            }}
          />
        );
        
      case 'validation':
        // Only use TechnicalValidationModule for the setup module
        if (module.id === 'setup') {
          return (
            <TechnicalValidationModule
              coach={currentUser}
              onComplete={(validations) => {
                const newValidations = { ...currentUser.progress.validationResults };
                if (validations.email?.status === 'success') {
                  newValidations.emailSetup = validations.email;
                }
                if (validations.zoom?.status === 'success') {
                  newValidations.zoomIntegration = validations.zoom;
                }
                if (validations.payment?.status === 'success') {
                  newValidations.mercuryPayment = validations.payment;
                }
                currentUser.progress.validationResults = newValidations;
                currentUser.progress.readinessScore = calculateReadinessScore();
                saveProgress();
                const allValid = Object.values(validations).every(v => v.status === 'success');
                if (allValid) {
                  completeStep(module.id, module.steps.length - 1);
                }
              }}
            />
          );
        }
        // For ANY other validation type, return this default:
        return (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ margin: '0 auto 16px', display: 'flex', justifyContent: 'center' }}>
              <icons.Settings />
            </div>
            <p style={{ color: '#6b7280', marginBottom: '16px' }}>
              {step.content}
            </p>
            <button 
              onClick={() => {
                // Mark validation as complete based on step title
                const validationKey = step.title.includes('Email') ? 'emailSetup' :
                                   step.title.includes('Zoom') ? 'zoomIntegration' :
                                   step.title.includes('Payment') ? 'mercuryPayment' : null;
                
                if (validationKey) {
                  const newValidations = { ...currentUser.progress.validationResults };
                  newValidations[validationKey] = {
                    status: 'success',
                    message: 'Setup complete',
                    evidence: 'demo-evidence'
                  };
                  currentUser.progress.validationResults = newValidations;
                  currentUser.progress.readinessScore = calculateReadinessScore();
                  saveProgress();
                }
                
                completeStep(trainingModules[currentModule].id, currentStep);
              }}
              style={{
                background: '#2563eb',
                color: 'white',
                padding: '12px 24px',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Mark as Complete (Demo)
            </button>
          </div>
        );
        
      case 'simulation':
        return (
          <SessionSimulationModule
            student={currentUser.studentProfile}
            onComplete={(score) => {
              currentUser.progress.pointsEarned += Math.round(score * 10);
              currentUser.progress.readinessScore = calculateReadinessScore();
              saveProgress();
              completeStep(module.id, stepIndex);
            }}
          />
        );
        
      case 'certification':
        return (
          <FinalCertificationModule
            coach={currentUser}
            student={currentUser.studentProfile}
            trainingStats={{
              totalTime: timeSpent,
              modulesCompleted: completedModules.size,
              averageScore: currentUser.progress.readinessScore || 0
            }}
            onComplete={() => {
              currentUser.progress.readinessScore = 100;
              currentUser.certified = true;
              currentUser.certificationDate = new Date().toISOString();
              saveProgress();
              alert('Congratulations! You are now a certified Ivylevel coach. Check your email for next steps.');
              completeStep(module.id, stepIndex);
            }}
          />
        );
        
      case 'resources':
        return renderPersonalizedResources();
        
      case 'quiz':
        return renderComprehensionQuiz();
        
      case 'video':
      case 'training':
      case 'checklist':
      default:
        return renderDefaultStep();
    }
  }

  function renderCoachProfileSetup() {
    return (
      <div>
        <div style={{ 
          background: '#f0f9ff', 
          padding: '20px', 
          borderRadius: '8px', 
          marginBottom: '24px' 
        }}>
          <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '8px' }}>
            Welcome to Ivylevel, {currentUser.name}!
          </h4>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0 }}>
            You've been selected as an elite coach. Your profile has been pre-configured based on your 
            interview and background. Let's confirm the details.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '8px' }}>
              Full Name
            </label>
            <input 
              type="text" 
              value={currentUser.name}
              disabled
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '1rem',
                background: '#f9fafb',
                color: '#6b7280'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '8px' }}>
              Ivylevel Email
            </label>
            <input 
              type="email" 
              value={currentUser.email}
              disabled
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '1rem',
                background: '#f9fafb',
                color: '#6b7280'
              }}
            />
          </div>
        </div>
        
        <button 
          onClick={() => completeStep(trainingModules[currentModule].id, currentStep)}
          style={{
            width: '100%',
            background: '#2563eb',
            color: 'white',
            padding: '12px 24px',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          Confirm Profile & Continue
        </button>
      </div>
    );
  }



  function renderPersonalizedResources() {
    return (
      <div>
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '12px', color: '#111827' }}>
            Your Secure Training Resources
          </h4>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            These resources have been specifically selected for you based on {currentUser.studentProfile.name}'s profile 
            and your coaching assignment. All resources are stored securely in Google Workspace.
          </p>
        </div>

        {/* Security Notice */}
        <div style={{
          background: '#fef3c7',
          border: '1px solid #f59e0b',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <icons.Lock />
            <strong style={{ color: '#d97706' }}>Security & Access Notice</strong>
          </div>
          <ul style={{ fontSize: '0.875rem', color: '#92400e', margin: 0, paddingLeft: '16px' }}>
            <li>All resources contain sensitive coach and student information</li>
            <li>View-only access - downloading is not permitted</li>
            <li>Access is logged and monitored for compliance</li>
            <li>Do not share links or screenshots outside of training purposes</li>
          </ul>
        </div>

        {currentUser.personalizedResources.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
            {currentUser.personalizedResources.map(resource => (
              <div key={resource.id} style={{
                padding: '20px',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                background: '#fafafa'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{
                    padding: '8px',
                    background: resource.type === 'video' ? '#fef3c7' : '#f0f9ff',
                    borderRadius: '8px',
                    color: resource.type === 'video' ? '#d97706' : '#2563eb'
                  }}>
                    {resource.type === 'video' ? <icons.Video /> : <icons.FileText />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h5 style={{ fontSize: '1rem', fontWeight: '600', margin: '0' }}>
                        {resource.title}
                      </h5>
                      {resource.isSecure && (
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '4px',
                          padding: '2px 6px',
                          background: '#fecaca',
                          borderRadius: '4px',
                          color: '#dc2626'
                        }}>
                          <icons.Lock />
                          <span style={{ fontSize: '0.65rem', fontWeight: '500' }}>SECURE</span>
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>
                      {resource.category} • {resource.size} • {resource.accessLevel === 'view-only' ? 'View Only' : 'Restricted Access'}
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      if (resource.googleDriveLink) {
                        window.open(resource.googleDriveLink, '_blank', 'noopener,noreferrer');
                      } else {
                        alert('Resource link not available. Please contact your admin.');
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 12px',
                      background: '#2563eb',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      cursor: 'pointer'
                    }}
                  >
                    <icons.Eye />
                    Secure View
                  </button>
                </div>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
                  {resource.description}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px', 
            border: '2px dashed #d1d5db', 
            borderRadius: '12px',
            marginBottom: '24px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px', color: '#6b7280' }}>
              <icons.Lock />
            </div>
            <p style={{ marginTop: '16px', color: '#6b7280' }}>
              No personalized resources have been assigned yet. Your admin will add relevant materials 
              specific to {currentUser.studentProfile.name}'s profile soon.
            </p>
          </div>
        )}

        <button 
          onClick={() => completeStep(trainingModules[currentModule].id, currentStep)}
          style={{
            width: '100%',
            background: '#2563eb',
            color: 'white',
            padding: '12px 24px',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          Continue to Comprehension Check
        </button>
      </div>
    );
  }

  

  function renderComprehensionQuiz() {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0' }}>
        <div style={{ margin: '0 auto 16px', display: 'flex', justifyContent: 'center' }}>
          <icons.Brain />
        </div>
        <p style={{ color: '#6b7280', marginBottom: '16px' }}>
          Student comprehension quiz will be implemented here.
        </p>
        <button 
          onClick={() => completeStep(trainingModules[currentModule].id, currentStep)}
          style={{
            background: '#2563eb',
            color: 'white',
            padding: '12px 24px',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          Continue
        </button>
      </div>
    );
  }

 

 

  function renderDefaultStep() {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0' }}>
        <div style={{ margin: '0 auto 16px', display: 'flex', justifyContent: 'center' }}>
          <icons.FileText />
        </div>
        <button 
          onClick={() => completeStep(trainingModules[currentModule].id, currentStep)}
          style={{
            background: '#2563eb',
            color: 'white',
            padding: '12px 24px',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          Continue
        </button>
      </div>
    );
  }

  // Render Login Screen
  if (!isAuthenticated) {
    const getTimeRemaining = (email) => {
      const coach = mockDatabase.coaches[email];
      if (coach) {
        const remaining = new Date(coach.expiresAt) - new Date();
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        return { hours, minutes, expired: remaining <= 0 };
      }
      return null;
    };

    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #1e3a8a 0%, #3730a3 50%, #581c87 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Background Pattern */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `
            radial-gradient(circle at 25% 25%, rgba(255,255,255,0.1) 0%, transparent 50%),
            radial-gradient(circle at 75% 75%, rgba(255,255,255,0.05) 0%, transparent 50%)
          `,
          pointerEvents: 'none'
        }} />

        <div style={{
          background: 'white',
          borderRadius: '20px',
          padding: '48px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          width: '100%',
          maxWidth: '480px',
          position: 'relative',
          zIndex: 1
        }}>
          {/* Header with Urgency */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ 
              width: '80px', 
              height: '80px', 
              background: 'linear-gradient(135deg, #2563eb, #7c3aed)', 
              borderRadius: '20px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: 'white',
              margin: '0 auto 20px',
              boxShadow: '0 10px 20px rgba(37, 99, 235, 0.3)'
            }}>
              <icons.Trophy />
            </div>
            
            <div style={{
              background: 'linear-gradient(135deg, #dc2626, #ea580c)',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '0.875rem',
              fontWeight: '700',
              marginBottom: '16px',
              display: 'inline-block',
              animation: 'pulse 2s infinite'
            }}>
              URGENT: 48-HOUR ACCESS WINDOW
            </div>

            <h1 style={{ 
              fontSize: '2.25rem', 
              fontWeight: '800', 
              color: '#111827', 
              marginBottom: '12px',
              lineHeight: '1.2'
            }}>
              Elite Coach Portal
            </h1>
            
            <div style={{
              background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
              color: '#92400e',
              padding: '12px 20px',
              borderRadius: '12px',
              marginBottom: '20px',
              fontWeight: '600'
            }}>
              Top Coaches Earn Up to <span style={{fontSize: '1.25rem', fontWeight: '800'}}>$25,000/Year</span>
            </div>

            <p style={{ color: '#6b7280', fontSize: '1rem', lineHeight: '1.6' }}>
              <strong>Congratulations!</strong> You're among the top 10% selected. 
              Complete your training to unlock your earning potential and transform student lives.
            </p>
          </div>

          {/* Critical Instructions */}
          <div style={{
            background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
            border: '2px solid #f59e0b',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <icons.AlertCircle />
              <strong style={{ color: '#92400e', fontSize: '1.1rem' }}>MANDATORY COMPLETION REQUIRED</strong>
            </div>
            <ul style={{ fontSize: '0.875rem', color: '#92400e', margin: 0, paddingLeft: '16px', lineHeight: '1.6' }}>
              <li><strong>Complete ALL training modules</strong> before your first session</li>
              <li><strong>Finish technical setup</strong> (Email, Zoom, Payment)</li>
              <li><strong>Master your student's profile</strong> and assigned resources</li>
              <li><strong>Pass comprehension checks</strong> (80% minimum required)</li>
            </ul>
            <div style={{ 
              marginTop: '12px', 
              padding: '8px 12px', 
              background: '#dc2626', 
              color: 'white', 
              borderRadius: '6px',
              fontSize: '0.875rem',
              fontWeight: '600'
            }}>
              Incomplete training = No first session = Lost coaching opportunity
            </div>
          </div>

          {/* Login Form */}
          <div>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ 
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <span style={{ 
                  fontSize: '0.875rem', 
                  fontWeight: '600', 
                  color: '#374151'
                }}>
                  Your Ivylevel Email Address
                </span>
                <span style={{ 
                  fontSize: '0.75rem', 
                  color: '#dc2626',
                  fontWeight: '500'
                }}>
                  *Required
                </span>
              </div>
              <input
                type="email"
                placeholder="yourname@ivymentors.co"
                value={loginForm.email}
                onChange={(e) => setLoginForm(prev => ({...prev, email: e.target.value}))}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin(e)}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  border: '2px solid #d1d5db',
                  borderRadius: '12px',
                  fontSize: '1rem',
                  transition: 'all 0.2s ease',
                  ':focus': {
                    borderColor: '#2563eb',
                    outline: 'none'
                  }
                }}
              />
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>
                Use the @ivymentors.co email provided in your welcome message
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <div style={{ 
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <span style={{ 
                  fontSize: '0.875rem', 
                  fontWeight: '600', 
                  color: '#374151'
                }}>
                  Secret Access Code
                </span>
                <span style={{ 
                  fontSize: '0.75rem', 
                  color: '#dc2626',
                  fontWeight: '500'
                }}>
                  *Required
                </span>
              </div>
              <input
                type="password"
                placeholder="Enter your unique access code"
                value={loginForm.accessCode}
                onChange={(e) => setLoginForm(prev => ({...prev, accessCode: e.target.value}))}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin(e)}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  border: '2px solid #d1d5db',
                  borderRadius: '12px',
                  fontSize: '1rem',
                  transition: 'all 0.2s ease'
                }}
              />
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>
                Check your welcome email for your personal access code
              </div>
              
              {/* Time Remaining Display */}
              {loginForm.email && mockDatabase.coaches[loginForm.email] && (
                <div style={{
                  marginTop: '12px',
                  padding: '12px',
                  background: getTimeRemaining(loginForm.email)?.expired ? '#fef2f2' : '#fef3c7',
                  border: `1px solid ${getTimeRemaining(loginForm.email)?.expired ? '#fecaca' : '#fde68a'}`,
                  borderRadius: '8px'
                }}>
                  {getTimeRemaining(loginForm.email)?.expired ? (
                    <div style={{ color: '#dc2626', fontSize: '0.875rem', fontWeight: '600' }}>
                      ACCESS EXPIRED - Contact admin immediately!
                    </div>
                  ) : (
                    <div style={{ color: '#92400e', fontSize: '0.875rem' }}>
                      <strong>Time Remaining: {getTimeRemaining(loginForm.email)?.hours}h {getTimeRemaining(loginForm.email)?.minutes}m</strong>
                    </div>
                  )}
                </div>
              )}
            </div>

            {loginError && (
              <div style={{
                background: '#fef2f2',
                border: '2px solid #fecaca',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '20px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <icons.AlertCircle />
                  <span style={{ color: '#dc2626', fontSize: '0.875rem', fontWeight: '600' }}>{loginError}</span>
                </div>
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={!loginForm.email || !loginForm.accessCode}
              style={{
                width: '100%',
                background: (!loginForm.email || !loginForm.accessCode) 
                  ? '#d1d5db' 
                  : 'linear-gradient(135deg, #2563eb, #7c3aed)',
                color: 'white',
                padding: '16px 24px',
                border: 'none',
                borderRadius: '12px',
                fontSize: '1.1rem',
                fontWeight: '700',
                cursor: (!loginForm.email || !loginForm.accessCode) ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: (!loginForm.email || !loginForm.accessCode) 
                  ? 'none' 
                  : '0 10px 20px rgba(37, 99, 235, 0.3)',
                transform: (!loginForm.email || !loginForm.accessCode) ? 'none' : 'translateY(-1px)'
              }}
            >
              {(!loginForm.email || !loginForm.accessCode) 
                ? 'Enter Credentials to Begin' 
                : 'START ELITE TRAINING 🚀'}
            </button>
          </div>

          {/* Bottom Motivation */}
          <div style={{ 
            marginTop: '32px', 
            paddingTop: '24px', 
            borderTop: '1px solid #e5e7eb',
            textAlign: 'center' 
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)',
              padding: '16px',
              borderRadius: '12px',
              border: '1px solid #10b981',
              marginBottom: '16px'
            }}>
              <div style={{ fontSize: '0.875rem', color: '#065f46', fontWeight: '600', marginBottom: '8px' }}>
                ESTIMATED COMPLETION TIME
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#059669', marginBottom: '4px' }}>
                90-120 Minutes
              </div>
              <div style={{ fontSize: '0.75rem', color: '#047857' }}>
                Personalized training • Your time investment = Student success = Your $25K potential
              </div>
            </div>

            <div style={{ fontSize: '0.75rem', color: '#6b7280', lineHeight: '1.5' }}>
              <div style={{ marginBottom: '8px' }}>
                <strong style={{ color: '#111827' }}>Your Progress is Monitored</strong><br />
                All training activities are recorded for quality assurance and to ensure you're fully prepared for student success.
              </div>
              <div>
                <strong style={{ color: '#dc2626' }}>Demo Credentials (Remove in Production):</strong><br />
                <strong>Admin:</strong> admin@ivymentors.co / ADMIN2025<br />
                <strong>Coach:</strong> sarah@ivymentors.co / SC2025A1
              </div>
            </div>
          </div>
        </div>
        
        {/* Enhanced Welcome Modal */}
        {showEnhancedWelcome && currentUser?.role === 'coach' && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '20px'
          }}>
            <EnhancedWelcomeExperience
              coach={currentUser}
              student={currentUser.studentProfile}
              onComplete={() => {
                setShowEnhancedWelcome(false);
                if (!unlockedModules.has('welcome')) {
                  setUnlockedModules(new Set(['welcome']));
                }
              }}
            />
          </div>
        )}
      </div>
    );
  }

  // Render Admin Dashboard
  if (currentUser?.role === 'admin') {
    const coachStats = getCoachStats();
    const allCoaches = getAllCoaches();

    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
        {/* Admin Header */}
        <div style={{ 
          background: 'white', 
          padding: '16px 24px', 
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <div style={{ 
            maxWidth: '1400px', 
            margin: '0 auto', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ 
                width: '40px', 
                height: '40px', 
                background: 'linear-gradient(135deg, #2563eb, #7c3aed)', 
                borderRadius: '8px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                color: 'white' 
              }}>
                <icons.Users />
              </div>
              <div>
                <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: '0 0 2px 0', color: '#111827' }}>
                  Ivylevel Admin Dashboard
                </h1>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
                  Manage coaches and training resources
                </p>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827' }}>
                  {currentUser.name}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  Administrator
                </div>
              </div>
              <button
                onClick={handleLogout}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  background: '#f3f4f6',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  color: '#374151',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                <icons.LogOut />
                Sign Out
              </button>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px 24px' }}>
          {/* Admin Navigation */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '32px' }}>
            {[
              { id: 'dashboard', label: 'Dashboard', icon: icons.BarChart3 },
              { id: 'coaches', label: 'Coaches', icon: icons.Users },
              { id: 'resources', label: 'Resources', icon: icons.FileText }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setAdminView(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 20px',
                  background: adminView === tab.id ? '#2563eb' : 'transparent',
                  color: adminView === tab.id ? 'white' : '#6b7280',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  transition: 'all 0.2s ease'
                }}
              >
                <tab.icon />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Dashboard View */}
          {adminView === 'dashboard' && (
            <div>
              {/* Stats Grid */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                gap: '24px', 
                marginBottom: '32px' 
              }}>
                <div style={{ 
                  background: 'white', 
                  padding: '24px', 
                  borderRadius: '12px', 
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ 
                      padding: '8px', 
                      background: '#dbeafe', 
                      borderRadius: '8px', 
                      color: '#2563eb' 
                    }}>
                      <icons.Users />
                    </div>
                    <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', margin: 0 }}>
                      Total Coaches
                    </h3>
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2563eb' }}>
                    {coachStats.total}
                  </div>
                </div>

                <div style={{ 
                  background: 'white', 
                  padding: '24px', 
                  borderRadius: '12px', 
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ 
                      padding: '8px', 
                      background: '#dcfce7', 
                      borderRadius: '8px', 
                      color: '#16a34a' 
                    }}>
                      <icons.CheckCircle />
                    </div>
                    <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', margin: 0 }}>
                      Training Complete
                    </h3>
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#16a34a' }}>
                    {coachStats.completed}
                  </div>
                </div>

                <div style={{ 
                  background: 'white', 
                  padding: '24px', 
                  borderRadius: '12px', 
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ 
                      padding: '8px', 
                      background: '#fef3c7', 
                      borderRadius: '8px', 
                      color: '#d97706' 
                    }}>
                      <icons.Clock />
                    </div>
                    <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', margin: 0 }}>
                      Active Training
                    </h3>
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#d97706' }}>
                    {coachStats.active - coachStats.completed}
                  </div>
                </div>

                <div style={{ 
                  background: 'white', 
                  padding: '24px', 
                  borderRadius: '12px', 
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ 
                      padding: '8px', 
                      background: '#fecaca', 
                      borderRadius: '8px', 
                      color: '#dc2626' 
                    }}>
                      <icons.AlertCircle />
                    </div>
                    <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', margin: 0 }}>
                      At Risk
                    </h3>
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#dc2626' }}>
                    {coachStats.atRisk}
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div style={{ 
                background: 'white', 
                borderRadius: '12px', 
                padding: '24px', 
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
              }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '20px', color: '#111827' }}>
                  Coach Status Overview
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {allCoaches.map(coach => (
                    <div key={coach.email} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      background: '#fafafa'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ 
                          width: '40px', 
                          height: '40px',
                          borderRadius: '50%',
                          background: coach.progress.readinessScore >= 90 ? '#dcfce7' : 
                                     coach.progress.readinessScore >= 70 ? '#fef3c7' : '#fecaca',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: coach.progress.readinessScore >= 90 ? '#16a34a' : 
                                coach.progress.readinessScore >= 70 ? '#d97706' : '#dc2626'
                        }}>
                          <icons.User />
                        </div>
                        <div>
                          <div style={{ fontWeight: '600', color: '#111827' }}>{coach.name}</div>
                          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                            Student: {coach.studentProfile.name} ({coach.studentProfile.grade})
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                          {coach.progress.readinessScore}% Ready
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          {Math.floor(coach.timeRemaining / (1000 * 60 * 60))}h remaining
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Coaches Management View */}
          {adminView === 'coaches' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827', margin: 0 }}>
                  Coach Management
                </h2>
              </div>

              <div style={{ display: 'grid', gap: '24px' }}>
                {allCoaches.map(coach => (
                  <div key={coach.email} style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '24px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    border: coach.expired ? '2px solid #fecaca' : '1px solid #e5e7eb'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                      <div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>
                          {coach.name}
                        </h3>
                        <p style={{ color: '#6b7280', marginBottom: '4px' }}>{coach.email}</p>
                        <p style={{ fontSize: '0.875rem', color: coach.expired ? '#dc2626' : '#16a34a' }}>
                          {coach.expired ? 'Access Expired' : `${Math.floor(coach.timeRemaining / (1000 * 60 * 60))}h ${Math.floor((coach.timeRemaining % (1000 * 60 * 60)) / (1000 * 60))}m remaining`}
                        </p>
                      </div>
                      <div style={{ 
                        background: coach.progress.readinessScore >= 90 ? '#dcfce7' : 
                                   coach.progress.readinessScore >= 70 ? '#fef3c7' : '#fecaca',
                        color: coach.progress.readinessScore >= 90 ? '#16a34a' : 
                               coach.progress.readinessScore >= 70 ? '#d97706' : '#dc2626',
                        padding: '8px 16px',
                        borderRadius: '20px',
                        fontSize: '0.875rem',
                        fontWeight: '600'
                      }}>
                        {coach.progress.readinessScore}% Ready
                      </div>
                    </div>

                    {/* Student Profile */}
                    <div style={{ marginBottom: '20px' }}>
                      <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '12px', color: '#111827' }}>
                        Assigned Student
                      </h4>
                      <div style={{ 
                        background: '#f8fafc', 
                        padding: '16px', 
                        borderRadius: '8px',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '12px'
                      }}>
                        <div>
                          <strong>Name:</strong> {coach.studentProfile.name}
                        </div>
                        <div>
                          <strong>Grade:</strong> {coach.studentProfile.grade}
                        </div>
                        <div>
                          <strong>Focus:</strong> {coach.studentProfile.focusArea}
                        </div>
                        <div>
                          <strong>Program:</strong> {coach.studentProfile.programType}
                        </div>
                      </div>
                    </div>

                    {/* Personalized Resources */}
                    <div style={{ marginBottom: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', margin: 0 }}>
                          Personalized Resources ({coach.personalizedResources.length})
                        </h4>
                        <button
                          onClick={() => setSelectedCoach(coach)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            background: '#2563eb',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '0.875rem',
                            cursor: 'pointer'
                          }}
                        >
                          <icons.Plus />
                          Add Resource
                        </button>
                      </div>
                      
                      {coach.personalizedResources.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {coach.personalizedResources.map(resource => (
                            <div key={resource.id} style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '12px',
                              background: '#f0f9ff',
                              border: '1px solid #e0f2fe',
                              borderRadius: '6px'
                            }}>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ fontWeight: '500', fontSize: '0.875rem' }}>{resource.title}</span>
                                  {resource.isSecure && (
                                    <div style={{ 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      gap: '2px',
                                      padding: '1px 4px',
                                      background: '#fbbf24',
                                      borderRadius: '3px',
                                      color: 'white'
                                    }}>
                                      <icons.Lock />
                                      <span style={{ fontSize: '0.6rem', fontWeight: '600' }}>SEC</span>
                                    </div>
                                  )}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                  {resource.category} • {resource.size} • View Only
                                </div>
                                {resource.googleDriveLink && (
                                  <div style={{ fontSize: '0.65rem', color: '#2563eb', marginTop: '2px' }}>
                                    Google Workspace • Secure Access
                                  </div>
                                )}
                              </div>
                              <button
                                onClick={() => removePersonalizedResource(coach.email, resource.id)}
                                style={{
                                  padding: '4px',
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#dc2626',
                                  cursor: 'pointer'
                                }}
                              >
                                <icons.Trash />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ color: '#6b7280', fontSize: '0.875rem', fontStyle: 'italic' }}>
                          No secure resources assigned yet
                        </p>
                      )}
                    </div>

                    {/* Progress Overview */}
                    <div>
                      <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '12px', color: '#111827' }}>
                        Training Progress
                      </h4>
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
                        gap: '12px' 
                      }}>
                        <div style={{ textAlign: 'center', padding: '12px', background: '#f0f9ff', borderRadius: '6px' }}>
                          <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#2563eb' }}>
                            {coach.progress.completedModules.size}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Modules Done</div>
                        </div>
                        <div style={{ textAlign: 'center', padding: '12px', background: '#fef3c7', borderRadius: '6px' }}>
                          <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#d97706' }}>
                            {coach.progress.pointsEarned}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Points</div>
                        </div>
                        <div style={{ textAlign: 'center', padding: '12px', background: '#f0fdf4', borderRadius: '6px' }}>
                          <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#16a34a' }}>
                            {Object.values(coach.progress.validationResults).filter(v => v.status === 'success').length}/4
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Setup Done</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Resource Assignment Modal */}
              {selectedCoach && (
                <div style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0,0,0,0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1000
                }}>
                  <div style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '24px',
                    width: '90%',
                    maxWidth: '600px',
                    maxHeight: '80vh',
                    overflow: 'auto'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0 }}>
                        Add Resource for {selectedCoach.name}
                      </h3>
                      <button
                        onClick={() => setSelectedCoach(null)}
                        style={{
                          background: 'none',
                          border: 'none',
                          fontSize: '1.5rem',
                          cursor: 'pointer',
                          color: '#6b7280'
                        }}
                      >
                        ×
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {mockDatabase.globalResources
                        .filter(resource => !selectedCoach.personalizedResources.find(r => r.id === resource.id))
                        .map(resource => (
                        <div key={resource.id} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '16px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px'
                        }}>
                          <div>
                            <div style={{ fontWeight: '600', marginBottom: '4px' }}>{resource.title}</div>
                            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '4px' }}>
                              {resource.description}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                              {resource.type} • {resource.category} • {resource.size}
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              addPersonalizedResource(selectedCoach.email, resource.id);
                              setSelectedCoach(null);
                            }}
                            style={{
                              padding: '8px 16px',
                              background: '#2563eb',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '0.875rem',
                              cursor: 'pointer'
                            }}
                          >
                            Add
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Resources Management View */}
          {adminView === 'resources' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827', margin: 0 }}>
                  Training Resources
                </h2>
                <button
                  onClick={() => setUploadModal(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 20px',
                    background: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  <icons.Plus />
                  Upload Resource
                </button>
              </div>

              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', 
                gap: '20px' 
              }}>
                {mockDatabase.globalResources.map(resource => (
                  <div key={resource.id} style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '20px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    border: resource.isSecure ? '2px solid #fbbf24' : '1px solid #e5e7eb'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                      <div style={{
                        padding: '8px',
                        background: resource.type === 'video' ? '#fef3c7' : '#f0f9ff',
                        borderRadius: '8px',
                        color: resource.type === 'video' ? '#d97706' : '#2563eb'
                      }}>
                        {resource.type === 'video' ? <icons.Video /> : <icons.FileText />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <h3 style={{ fontSize: '1rem', fontWeight: '600', margin: 0 }}>
                            {resource.title}
                          </h3>
                          {resource.isSecure && (
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '4px',
                              padding: '2px 6px',
                              background: '#fbbf24',
                              borderRadius: '4px',
                              color: 'white'
                            }}>
                              <icons.Lock />
                              <span style={{ fontSize: '0.65rem', fontWeight: '600' }}>SECURE</span>
                            </div>
                          )}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          {resource.category} • {resource.size} • {resource.accessLevel || 'View Only'}
                        </div>
                      </div>
                    </div>
                    
                    <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '16px', lineHeight: '1.4' }}>
                      {resource.description}
                    </p>

                    {/* Google Drive Integration Info */}
                    {resource.googleDriveLink && (
                      <div style={{ 
                        background: '#f0f9ff', 
                        padding: '12px', 
                        borderRadius: '6px',
                        marginBottom: '16px',
                        border: '1px solid #e0f2fe'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                          <svg style={{width: '16px', height: '16px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#2563eb' }}>
                            Google Drive Integration
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#1e40af' }}>
                          Secure workspace storage • View-only access • Access logging enabled
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                        Added: {new Date(resource.uploadDate).toLocaleDateString()}
                      </div>
                      <div style={{ 
                        fontSize: '0.75rem', 
                        padding: '4px 8px',
                        background: resource.restrictedAccess ? '#fef3c7' : '#f0fdf4',
                        color: resource.restrictedAccess ? '#d97706' : '#16a34a',
                        borderRadius: '4px',
                        fontWeight: '500'
                      }}>
                        {resource.restrictedAccess ? 'Restricted' : 'Standard'}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={() => {
                          if (resource.googleDriveLink) {
                            window.open(resource.googleDriveLink, '_blank', 'noopener,noreferrer');
                          } else {
                            alert('Google Drive link not available for this resource.');
                          }
                        }}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          background: '#2563eb',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '0.875rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        <icons.Eye />
                        Preview
                      </button>
                      <button 
                        onClick={() => {
                          // Copy Google Drive link to clipboard
                          if (resource.googleDriveLink) {
                            navigator.clipboard.writeText(resource.googleDriveLink);
                            alert('Google Drive link copied to clipboard!');
                          }
                        }}
                        style={{
                          padding: '8px',
                          background: 'transparent',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          color: '#6b7280',
                          cursor: 'pointer'
                        }}
                        title="Copy Google Drive Link"
                      >
                        <svg style={{width: '16px', height: '16px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                      <button style={{
                        padding: '8px',
                        background: 'transparent',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        color: '#dc2626',
                        cursor: 'pointer'
                      }}>
                        <icons.Trash />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Upload Modal */}
              {uploadModal && (
                <div style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0,0,0,0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1000
                }}>
                  <div style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '24px',
                    width: '90%',
                    maxWidth: '500px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0 }}>
                        Upload New Resource
                      </h3>
                      <button
                        onClick={() => {
                          setUploadModal(false);
                          setNewResource({
                            title: '',
                            type: 'document',
                            category: '',
                            description: '',
                            assignedCoaches: [],
                            googleDriveLink: '',
                            accessLevel: 'view-only',
                            isSecure: true,
                            uploadMethod: 'google-drive'
                          });
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          fontSize: '1.5rem',
                          cursor: 'pointer',
                          color: '#6b7280'
                        }}
                      >
                        ×
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {/* Security Notice */}
                      <div style={{
                        background: '#fef3c7',
                        border: '1px solid #f59e0b',
                        borderRadius: '8px',
                        padding: '16px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <icons.Lock />
                          <strong style={{ color: '#d97706' }}>Security Notice</strong>
                        </div>
                        <p style={{ fontSize: '0.875rem', color: '#92400e', margin: 0 }}>
                          All training resources contain sensitive coach and student information. 
                          Files must be stored in Google Workspace with view-only access for coaches.
                        </p>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '8px' }}>
                          Resource Title *
                        </label>
                        <input
                          type="text"
                          placeholder="Enter resource title"
                          value={newResource.title}
                          onChange={(e) => setNewResource(prev => ({...prev, title: e.target.value}))}
                          style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '8px',
                            fontSize: '1rem'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '8px' }}>
                          Type
                        </label>
                        <select
                          value={newResource.type}
                          onChange={(e) => setNewResource(prev => ({...prev, type: e.target.value}))}
                          style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '8px',
                            fontSize: '1rem',
                            background: 'white'
                          }}
                        >
                          <option value="document">Document (PDF, DOC)</option>
                          <option value="video">Video (MP4, Training)</option>
                          <option value="template">Template (Forms, Guides)</option>
                          <option value="presentation">Presentation (PPT, Slides)</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '8px' }}>
                          Category *
                        </label>
                        <select
                          value={newResource.category}
                          onChange={(e) => setNewResource(prev => ({...prev, category: e.target.value}))}
                          style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '8px',
                            fontSize: '1rem',
                            background: 'white'
                          }}
                        >
                          <option value="">Select Category</option>
                          <option value="pre-med">Pre-Med Track</option>
                          <option value="stem">STEM Focus</option>
                          <option value="liberal-arts">Liberal Arts</option>
                          <option value="business">Business/Economics</option>
                          <option value="9th-grade">9th Grade Specific</option>
                          <option value="10th-grade">10th Grade Specific</option>
                          <option value="11th-grade">11th Grade Specific</option>
                          <option value="12th-grade">12th Grade Specific</option>
                          <option value="general">General Training</option>
                          <option value="setup">Technical Setup</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '8px' }}>
                          Description
                        </label>
                        <textarea
                          placeholder="Enter resource description and usage instructions"
                          value={newResource.description}
                          onChange={(e) => setNewResource(prev => ({...prev, description: e.target.value}))}
                          style={{
                            width: '100%',
                            height: '80px',
                            padding: '12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '8px',
                            fontSize: '1rem',
                            resize: 'vertical'
                          }}
                        />
                      </div>

                      {/* Google Drive Link Section */}
                      <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '8px' }}>
                          Google Drive Sharing Link *
                        </label>
                        <input
                          type="url"
                          placeholder="https://drive.google.com/file/d/..."
                          value={newResource.googleDriveLink}
                          onChange={(e) => {
                            const link = e.target.value;
                            setNewResource(prev => ({...prev, googleDriveLink: link}));
                            
                            // Auto-detect file type from Google Drive link
                            if (link.includes('drive.google.com')) {
                              if (link.includes('presentation') || link.includes('slides')) {
                                setNewResource(prev => ({...prev, type: 'presentation'}));
                              } else if (link.includes('document') || link.includes('docs')) {
                                setNewResource(prev => ({...prev, type: 'document'}));
                              }
                            }
                          }}
                          style={{
                            width: '100%',
                            padding: '12px',
                            border: newResource.googleDriveLink && !newResource.googleDriveLink.includes('drive.google.com') 
                              ? '1px solid #dc2626' : '1px solid #d1d5db',
                            borderRadius: '8px',
                            fontSize: '1rem'
                          }}
                        />
                        <div style={{ 
                          background: '#f0f9ff', 
                          padding: '12px', 
                          borderRadius: '6px', 
                          marginTop: '8px',
                          border: '1px solid #e0f2fe'
                        }}>
                          <p style={{ fontSize: '0.875rem', color: '#2563eb', margin: '0 0 8px 0', fontWeight: '500' }}>
                            How to get Google Drive sharing link:
                          </p>
                          <ol style={{ fontSize: '0.75rem', color: '#1e40af', margin: 0, paddingLeft: '16px' }}>
                            <li>Upload file to Google Drive (Ivylevel workspace)</li>
                            <li>Right-click file → "Share"</li>
                            <li>Set "Restricted" access (Ivylevel employees only)</li>
                            <li>Set permission to "Viewer" (no download)</li>
                            <li>Copy link and paste above</li>
                          </ol>
                        </div>
                        {newResource.googleDriveLink && !newResource.googleDriveLink.includes('drive.google.com') && (
                          <div style={{ 
                            background: '#fef2f2', 
                            padding: '8px 12px', 
                            borderRadius: '6px', 
                            marginTop: '8px',
                            border: '1px solid #fecaca'
                          }}>
                            <p style={{ fontSize: '0.875rem', color: '#dc2626', margin: 0 }}>
                              Please enter a valid Google Drive link for security compliance
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Security Settings */}
                      <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '8px' }}>
                          Access Control Settings
                        </label>
                        <div style={{ 
                          background: '#f8fafc', 
                          padding: '16px', 
                          borderRadius: '8px',
                          border: '1px solid #e5e7eb'
                        }}>
                          <div style={{ marginBottom: '12px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <input
                                type="radio"
                                name="accessLevel"
                                value="view-only"
                                checked={newResource.accessLevel === 'view-only'}
                                onChange={(e) => setNewResource(prev => ({...prev, accessLevel: e.target.value}))}
                              />
                              <span style={{ fontSize: '0.875rem' }}>
                                <strong>View Only</strong> - Coaches can view but not download (Recommended)
                              </span>
                            </label>
                          </div>
                          <div style={{ marginBottom: '12px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <input
                                type="radio"
                                name="accessLevel"
                                value="restricted-download"
                                checked={newResource.accessLevel === 'restricted-download'}
                                onChange={(e) => setNewResource(prev => ({...prev, accessLevel: e.target.value}))}
                              />
                              <span style={{ fontSize: '0.875rem' }}>
                                <strong>Restricted Download</strong> - Download allowed with tracking
                              </span>
                            </label>
                          </div>
                          <div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <input
                                type="checkbox"
                                checked={newResource.isSecure}
                                onChange={(e) => setNewResource(prev => ({...prev, isSecure: e.target.checked}))}
                              />
                              <span style={{ fontSize: '0.875rem' }}>
                                <strong>Contains Sensitive Information</strong> - Extra security logging
                              </span>
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Upload Instructions */}
                      <div style={{ 
                        border: '2px dashed #2563eb', 
                        borderRadius: '8px', 
                        padding: '20px', 
                        textAlign: 'center',
                        background: '#f0f9ff'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px', color: '#2563eb' }}>
                          <svg style={{width: '48px', height: '48px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </div>
                        <p style={{ margin: '0 0 8px', color: '#1e40af', fontWeight: '500' }}>
                          Google Drive Integration Active
                        </p>
                        <p style={{ fontSize: '0.875rem', color: '#2563eb', margin: 0 }}>
                          Resources are securely stored in Google Workspace with restricted access.
                          Coaches receive view-only links for training purposes.
                        </p>
                      </div>

                      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => {
                            setUploadModal(false);
                            setNewResource({
                              title: '',
                              type: 'document',
                              category: '',
                              description: '',
                              assignedCoaches: [],
                              googleDriveLink: '',
                              accessLevel: 'view-only',
                              isSecure: true,
                              uploadMethod: 'google-drive'
                            });
                          }}
                          style={{
                            padding: '12px 20px',
                            background: '#f3f4f6',
                            color: '#374151',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer'
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            if (!newResource.title || !newResource.category || !newResource.googleDriveLink) {
                              alert('Please fill in all required fields including the Google Drive link.');
                              return;
                            }
                            
                            // Validate Google Drive URL
                            if (!newResource.googleDriveLink.includes('drive.google.com')) {
                              alert('Please enter a valid Google Drive sharing link.');
                              return;
                            }
                            
                            // Extract file size from Google Drive (mock)
                            const mockSize = Math.floor(Math.random() * 50) + 1 + ' MB';
                            
                            // Add resource to mock database
                            const resourceId = String(mockDatabase.globalResources.length + 1);
                            const newResourceData = {
                              id: resourceId,
                              title: newResource.title,
                              type: newResource.type,
                              category: newResource.category,
                              uploadDate: new Date().toISOString(),
                              size: mockSize,
                              description: newResource.description || 'Training resource added via Google Drive',
                              googleDriveLink: newResource.googleDriveLink,
                              accessLevel: newResource.accessLevel,
                              isSecure: newResource.isSecure,
                              restrictedAccess: true,
                              uploadMethod: 'google-drive'
                            };
                            
                            mockDatabase.globalResources.push(newResourceData);
                            
                            // Reset form and close modal
                            setNewResource({
                              title: '',
                              type: 'document',
                              category: '',
                              description: '',
                              assignedCoaches: [],
                              googleDriveLink: '',
                              accessLevel: 'view-only',
                              isSecure: true,
                              uploadMethod: 'google-drive'
                            });
                            setUploadModal(false);
                            
                            // Show success message
                            alert('Secure resource added successfully! Coaches will receive view-only access.');
                          }}
                          style={{
                            padding: '12px 20px',
                            background: (!newResource.title || !newResource.category || !newResource.googleDriveLink) ? '#d1d5db' : '#2563eb',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: (!newResource.title || !newResource.category || !newResource.googleDriveLink) ? 'not-allowed' : 'pointer'
                          }}
                        >
                          Add Secure Resource
                        </button>
                      </div>
                      
                      <div style={{ marginTop: '12px', padding: '12px', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}>
                        <p style={{ fontSize: '0.875rem', color: '#dc2626', margin: 0 }}>
                          <strong>Security Reminder:</strong> All files contain sensitive information. 
                          Ensure Google Drive permissions are set to "Restricted" and "Viewer" only.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render Coach Training Platform
  const studentProfile = currentUser.studentProfile;
  const validationResults = currentUser.progress.validationResults;
  const userProgress = {
    ...currentUser.progress,
    overallProgress: (completedModules.size / trainingModules.length) * 100,
    criticalBlockers: [],
    readinessScore: calculateReadinessScore()
  };

  const getReadinessStatus = () => {
    const readinessScore = userProgress.readinessScore || 0;
    if (readinessScore >= 90) return { color: '#16a34a', label: 'Ready for First Session!' };
    if (readinessScore >= 70) return { color: '#d97706', label: 'Almost Ready' };
    return { color: '#dc2626', label: 'Setup Required' };
  };

  const readinessStatus = getReadinessStatus();

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #f0f9ff, #e0e7ff)', 
      padding: '0',
      margin: '0'
    }}>
      {/* Enhanced Header with Coach Info */}
      <div style={{ 
        background: 'white', 
        padding: '16px 24px', 
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <div style={{ 
          maxWidth: '1200px', 
          margin: '0 auto', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              background: 'linear-gradient(135deg, #2563eb, #7c3aed)', 
              borderRadius: '8px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: 'white' 
            }}>
              <icons.Rocket />
            </div>
            <div>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: '0 0 2px 0', color: '#111827' }}>
                Welcome, {currentUser.name}!
              </h1>
              <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
                Training for {studentProfile.name} ({studentProfile.grade} - {studentProfile.focusArea})
              </p>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Time Remaining */}
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827' }}>
                {Math.floor((new Date(currentUser.expiresAt) - new Date()) / (1000 * 60 * 60))}h remaining
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                Training expires {new Date(currentUser.expiresAt).toLocaleDateString()}
              </div>
            </div>

            {/* Readiness Indicator */}
            <div style={{ 
              padding: '8px 16px', 
              borderRadius: '20px', 
              background: `${readinessStatus.color}15`,
              border: `2px solid ${readinessStatus.color}`,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <div style={{ 
                width: '8px', 
                height: '8px', 
                borderRadius: '50%', 
                background: readinessStatus.color 
              }} />
              <span style={{ fontSize: '0.875rem', fontWeight: '600', color: readinessStatus.color }}>
                {readinessStatus.label}
              </span>
            </div>
            
            <button
              onClick={handleLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                background: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                color: '#374151',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              <icons.LogOut />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div style={{ 
        maxWidth: '1200px', 
        margin: '0 auto', 
        padding: '32px 24px', 
        display: 'grid', 
        gridTemplateColumns: window.innerWidth > 1024 ? '2fr 1fr' : '1fr', 
        gap: '32px',
        alignItems: 'start'
      }}>
        {/* Main Content - Training Modules */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* Current Module Content */}
          {trainingModules[currentModule] && (
            <div>
              <div style={{ 
                display: 'flex', 
                alignItems: 'flex-start', 
                justifyContent: 'space-between', 
                marginBottom: '24px', 
                gap: '16px',
                flexWrap: 'wrap'
              }}>
                <div>
                  <h2 style={{ 
                    fontSize: '2rem', 
                    fontWeight: 'bold', 
                    color: '#111827', 
                    marginBottom: '8px',
                    lineHeight: '1.2'
                  }}>
                    {trainingModules[currentModule].title}
                  </h2>
                  <p style={{ color: '#6b7280', fontSize: '1rem' }}>
                    {trainingModules[currentModule].description}
                  </p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: '500' }}>
                    Step {currentStep + 1} of {trainingModules[currentModule].steps.length}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                    {trainingModules[currentModule].duration} estimated
                  </div>
                </div>
              </div>
              
              {/* Step Progress */}
              <div style={{ marginBottom: '24px', display: 'flex', gap: '8px' }}>
                {trainingModules[currentModule].steps.map((_, idx) => (
                  <div 
                    key={idx}
                    style={{
                      flex: 1,
                      height: '8px',
                      borderRadius: '4px',
                      backgroundColor: idx <= currentStep ? '#2563eb' : '#e5e7eb',
                      transition: 'all 0.3s ease'
                    }}
                  />
                ))}
              </div>
              
              {/* Dynamic Step Content */}
              <div style={{ 
                background: 'white', 
                borderRadius: '12px', 
                padding: '32px', 
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                border: '1px solid #f3f4f6'
              }}>
                <h3 style={{ 
                  fontSize: '1.5rem', 
                  fontWeight: '600', 
                  marginBottom: '16px', 
                  color: '#111827' 
                }}>
                  {trainingModules[currentModule].steps[currentStep].title}
                </h3>
                <p style={{ 
                  color: '#6b7280', 
                  marginBottom: '24px', 
                  lineHeight: '1.6' 
                }}>
                  {trainingModules[currentModule].steps[currentStep].content}
                </p>
                
                {/* Render Different Step Types */}
                {renderStepContent(trainingModules[currentModule], currentStep)}
              </div>
              
              {/* Navigation Controls */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginTop: '32px',
                paddingTop: '24px',
                borderTop: '1px solid #f3f4f6'
              }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button 
                    onClick={() => {
                      if (currentStep > 0) {
                        setCurrentStep(currentStep - 1);
                      } else if (currentModule > 0) {
                        const prevModule = currentModule - 1;
                        setCurrentModule(prevModule);
                        setCurrentStep(trainingModules[prevModule].steps.length - 1);
                      }
                    }}
                    disabled={currentStep === 0 && currentModule === 0}
                    style={{
                      padding: '12px 24px',
                      background: 'transparent',
                      color: (currentStep === 0 && currentModule === 0) ? '#d1d5db' : '#6b7280',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      cursor: (currentStep === 0 && currentModule === 0) ? 'not-allowed' : 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '500'
                    }}
                  >
                    ← Previous
                  </button>
                  
                  <button 
                    onClick={() => {
                      if (currentStep < trainingModules[currentModule].steps.length - 1) {
                        setCurrentStep(currentStep + 1);
                      } else if (currentModule < trainingModules.length - 1 && trainingModules[currentModule + 1].unlocked) {
                        setCurrentModule(currentModule + 1);
                        setCurrentStep(0);
                      }
                    }}
                    disabled={
                      currentStep === trainingModules[currentModule].steps.length - 1 && 
                      (currentModule === trainingModules.length - 1 || !trainingModules[currentModule + 1]?.unlocked)
                    }
                    style={{
                      padding: '12px 24px',
                      background: 'transparent',
                      color: '#6b7280',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '500'
                    }}
                  >
                    Skip Step →
                  </button>
                </div>
                
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  Module {currentModule + 1} of {trainingModules.length} • 
                  Step {currentStep + 1} of {trainingModules[currentModule].steps.length}
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Student Profile Card */}
          <div style={{ 
            background: 'white', 
            borderRadius: '12px', 
            padding: '20px', 
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            border: '1px solid #f3f4f6'
          }}>
            <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '12px', color: '#111827' }}>
              Your Assigned Student
            </h4>
            <div style={{ fontSize: '0.875rem', color: '#6b7280', lineHeight: '1.6' }}>
              <div><strong>Name:</strong> {studentProfile.name}</div>
              <div><strong>Grade:</strong> {studentProfile.grade}</div>
              <div><strong>Focus:</strong> {studentProfile.focusArea}</div>
              <div><strong>Program:</strong> {studentProfile.programType}</div>
              <div><strong>Previous Coaching:</strong> {studentProfile.previousCoaching ? 'Yes' : 'No'}</div>
            </div>
          </div>

          {/* Personalized Resources */}
          {currentUser.personalizedResources.length > 0 && (
            <div style={{ 
              background: 'white', 
              borderRadius: '12px', 
              padding: '20px', 
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              border: '1px solid #f3f4f6'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <icons.Lock />
                <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', margin: 0 }}>
                  Your Secure Training Resources
                </h4>
              </div>
              <div style={{ 
                background: '#fef3c7', 
                padding: '8px 12px', 
                borderRadius: '6px', 
                marginBottom: '16px',
                border: '1px solid #f59e0b'
              }}>
                <p style={{ fontSize: '0.75rem', color: '#92400e', margin: 0 }}>
                  View-only access • Contains sensitive information • No downloads permitted
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {currentUser.personalizedResources.map(resource => (
                  <div key={resource.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px',
                    background: '#f8fafc',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px'
                  }}>
                    <div style={{ color: resource.type === 'video' ? '#d97706' : '#2563eb' }}>
                      {resource.type === 'video' ? <icons.Video /> : <icons.FileText />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>{resource.title}</span>
                        {resource.isSecure && (
                          <div style={{ color: '#dc2626' }}>
                            <icons.Lock />
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        {resource.category} • {resource.size} • View Only
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        if (resource.googleDriveLink) {
                          window.open(resource.googleDriveLink, '_blank', 'noopener,noreferrer');
                        } else {
                          alert('Resource link not available. Please contact admin.');
                        }
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '6px 12px',
                        background: '#2563eb',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        cursor: 'pointer'
                      }}
                    >
                      <icons.Eye />
                      View
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Progress Dashboard */}
          <div style={{ 
            background: 'white', 
            borderRadius: '12px', 
            padding: '24px', 
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            border: '1px solid #f3f4f6'
          }}>
            <h3 style={{ 
              fontSize: '1.125rem', 
              fontWeight: '600', 
              marginBottom: '20px', 
              color: '#111827' 
            }}>
              Training Progress
            </h3>
            
            {/* Readiness Score */}
            <div style={{ 
              textAlign: 'center', 
              padding: '20px', 
              background: `${readinessStatus.color}10`,
              border: `2px solid ${readinessStatus.color}20`,
              borderRadius: '12px',
              marginBottom: '20px'
            }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: readinessStatus.color, marginBottom: '8px' }}>
                {userProgress.readinessScore || 0}%
              </div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Readiness Score</div>
            </div>
            
            {/* Progress Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              marginBottom: '20px'
            }}>
              <div style={{ 
                textAlign: 'center', 
                padding: '12px', 
                background: '#f0f9ff',
                border: '1px solid #e0f2fe',
                borderRadius: '8px' 
              }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#2563eb', marginBottom: '4px' }}>
                  {Math.round(userProgress.overallProgress)}%
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Complete</div>
              </div>
              
              <div style={{ 
                textAlign: 'center', 
                padding: '12px', 
                background: '#fefce8',
                border: '1px solid #fef3c7',
                borderRadius: '8px' 
              }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#d97706', marginBottom: '4px' }}>
                  {userProgress.pointsEarned || 0}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Points</div>
              </div>
            </div>

            {/* Training Metrics */}
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '12px', color: '#111827' }}>
                Training Metrics
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div style={{ 
                  padding: '8px', 
                  background: '#f3f4f6', 
                  borderRadius: '6px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#111827' }}>
                    {formatTime(timeSpent)}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#6b7280' }}>Time Invested</div>
                </div>
                <div style={{ 
                  padding: '8px', 
                  background: '#f3f4f6', 
                  borderRadius: '6px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#111827' }}>
                    {currentUser.personalizedResources.length}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#6b7280' }}>Resources</div>
                </div>
              </div>
            </div>

            {/* Validation Status */}
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '12px', color: '#111827' }}>
                Setup Validation
              </h4>
              {Object.entries(validationResults).map(([key, result]) => (
                <div key={key} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  marginBottom: '8px' 
                }}>
                  <div style={{ color: result.status === 'success' ? '#16a34a' : result.status === 'error' ? '#dc2626' : '#d97706' }}>
                    {result.status === 'success' ? <icons.CheckCircle /> : 
                     result.status === 'error' ? <icons.XCircle /> : <icons.AlertCircle />}
                  </div>
                  <span style={{ fontSize: '0.875rem', color: '#374151', flex: 1 }}>
                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </span>
                  {result.status === 'success' && result.score && (
                    <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: '600' }}>
                      {result.score}%
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Module Navigation */}
          <div style={{ 
            background: 'white', 
            borderRadius: '12px', 
            padding: '24px', 
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            border: '1px solid #f3f4f6'
          }}>
            <h3 style={{ 
              fontSize: '1.125rem', 
              fontWeight: '600', 
              marginBottom: '20px', 
              color: '#111827' 
            }}>
              Training Modules
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {trainingModules.map((module, index) => {
                const isCompleted = completedModules.has(module.id);
                const isActive = currentModule === index;
                const isLocked = !module.unlocked;
                
                return (
                  <div 
                    key={module.id}
                    onClick={() => !isLocked && setCurrentModule(index)}
                    style={{
                      position: 'relative',
                      padding: '16px',
                      border: `2px solid ${
                        isActive ? '#2563eb' : 
                        isCompleted ? '#16a34a' : 
                        isLocked ? '#e5e7eb' : '#e5e7eb'
                      }`,
                      borderRadius: '12px',
                      cursor: isLocked ? 'not-allowed' : 'pointer',
                      transition: 'all 0.3s ease',
                      background: isActive ? '#f0f9ff' : 
                                isCompleted ? '#f0fdf4' : 
                                isLocked ? '#f9fafb' : 'white',
                      opacity: isLocked ? 0.6 : 1,
                      transform: isActive ? 'translateY(-2px)' : 'none',
                      boxShadow: isActive ? '0 4px 6px rgba(0, 0, 0, 0.1)' : 'none'
                    }}
                  >
                    {isLocked && (
                      <div style={{ position: 'absolute', top: '12px', right: '12px', color: '#9ca3af' }}>
                        <icons.Lock />
                      </div>
                    )}
                    {isCompleted && (
                      <div style={{ position: 'absolute', top: '12px', right: '12px', color: '#16a34a' }}>
                        <icons.CheckCircle />
                      </div>
                    )}
                    
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                      <div style={{
                        padding: '8px',
                        borderRadius: '6px',
                        flexShrink: 0,
                        background: isCompleted ? '#dcfce7' : 
                                  isActive ? '#dbeafe' : '#f3f4f6',
                        color: isCompleted ? '#16a34a' : 
                              isActive ? '#2563eb' : '#6b7280'
                      }}>
                        <module.icon />
                      </div>
                      
                      <div style={{ flex: 1 }}>
                        <h4 style={{ 
                          fontWeight: '600', 
                          color: '#111827', 
                          marginBottom: '6px', 
                          fontSize: '0.875rem' 
                        }}>
                          {module.title}
                        </h4>
                        <p style={{ 
                          color: '#6b7280', 
                          fontSize: '0.75rem', 
                          marginBottom: '8px', 
                          lineHeight: '1.3' 
                        }}>
                          {module.description}
                        </p>
                        
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          fontSize: '0.65rem', 
                          color: '#6b7280', 
                          marginBottom: '8px' 
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <icons.Clock />
                            <span>{module.duration}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <icons.Target />
                            <span>{module.steps.length} steps</span>
                          </div>
                        </div>
                        
                        <div style={{ 
                          width: '100%', 
                          height: '4px', 
                          background: '#e5e7eb', 
                          borderRadius: '2px', 
                          overflow: 'hidden' 
                        }}>
                          <div 
                            style={{ 
                              height: '100%', 
                              transition: 'width 0.3s ease',
                              width: `${isCompleted ? 100 : module.progress}%`,
                              background: isCompleted ? '#16a34a' : '#2563eb'
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;