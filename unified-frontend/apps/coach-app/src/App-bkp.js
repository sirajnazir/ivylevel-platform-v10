import React, { useState, useEffect, useRef } from 'react';

// Enhanced Icons with new ones for validation and features
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
  )
};

function App() {
  // Core State
  const [currentModule, setCurrentModule] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedModules, setCompletedModules] = useState(new Set());
  const [timeSpent, setTimeSpent] = useState(0);

  // Enhanced State for New Features
  const [studentProfile, setStudentProfile] = useState({
    name: '',
    grade: '',
    focusArea: '',
    interests: [],
    academicProfile: '',
    culturalBackground: '',
    previousCoaching: false,
    parentContact: '',
    programType: '24-week' // or 48-week
  });

  const [coachProfile, setCoachProfile] = useState({
    name: '',
    email: '',
    experience: '',
    strengths: [],
    ivylevelEmail: '',
    zoomSetup: false,
    mercurySetup: false,
    studentAssigned: false
  });

  const [validationResults, setValidationResults] = useState({
    emailSetup: { status: 'pending', message: '', evidence: null },
    zoomIntegration: { status: 'pending', message: '', evidence: null },
    mercuryPayment: { status: 'pending', message: '', evidence: null },
    studentProfileMastery: { status: 'pending', message: '', score: 0 }
  });

  const [uploadedEvidence, setUploadedEvidence] = useState({});
  const [sessionSimulationActive, setSessionSimulationActive] = useState(false);
  const [simulationScenario, setSimulationScenario] = useState(null);

  const [userProgress, setUserProgress] = useState({
    overallProgress: 0,
    streakDays: 1,
    pointsEarned: 0,
    badgesEarned: [],
    readinessScore: 0,
    criticalBlockers: []
  });

  // File upload ref
  const fileInputRef = useRef(null);

  // Timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeSpent(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Calculate readiness score based on validations and progress
  useEffect(() => {
    const validations = Object.values(validationResults);
    const completedValidations = validations.filter(v => v.status === 'success').length;
    const totalValidations = validations.length;
    const validationScore = (completedValidations / totalValidations) * 50;
    
    const progressScore = (completedModules.size / trainingModules.length) * 50;
    const readinessScore = Math.round(validationScore + progressScore);
    
    const criticalBlockers = [];
    if (!studentProfile.name) criticalBlockers.push('Student profile incomplete');
    if (validationResults.emailSetup.status !== 'success') criticalBlockers.push('Email setup not verified');
    if (validationResults.zoomIntegration.status !== 'success') criticalBlockers.push('Zoom integration pending');
    if (validationResults.studentProfileMastery.score < 80) criticalBlockers.push('Student profile mastery insufficient');

    setUserProgress(prev => ({
      ...prev,
      readinessScore,
      criticalBlockers,
      overallProgress: (completedModules.size / trainingModules.length) * 100
    }));
  }, [validationResults, completedModules, studentProfile]);

  // Enhanced Training Modules with Personalization
  const getPersonalizedModules = () => {
    const baseModules = [
      {
        id: 'welcome',
        title: 'Welcome & Elite Selection',
        icon: icons.Trophy,
        duration: '5 min',
        type: 'interactive',
        progress: 0,
        unlocked: true,
        description: 'Discover your exclusive position and impact potential',
        requiredFor: 'all',
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
        unlocked: false,
        description: 'Meet your assigned student and understand their profile',
        requiredFor: 'all',
        steps: [
          { type: 'upload', title: 'Student Profile Upload', content: 'Upload and review your assigned student profile' },
          { type: 'interactive', title: 'Student Analysis', content: 'Deep dive into student background and goals' },
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
        unlocked: false,
        description: 'Interactive setup wizard with real-time validation',
        requiredFor: 'all',
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
        unlocked: false,
        description: 'Specialized techniques for 9th grade students',
        requiredFor: 'freshman',
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
        unlocked: false,
        description: 'Advanced strategies for pre-med track students',
        requiredFor: 'pre-med',
        steps: [
          { type: 'training', title: 'Medical School Prep Strategy', content: 'MCAT, shadowing, and clinical experience guidance' },
          { type: 'simulation', title: 'Pre-Med Coaching Simulation', content: 'Practice handling pre-med specific challenges' }
        ]
      });
    }

    baseModules.push({
      id: 'session-mastery',
      title: 'Session Excellence',
      icon: icons.Video,
      duration: '25 min',
      type: 'practical',
      progress: 0,
      unlocked: false,
      description: 'Master the art of transformational 60-minute coaching sessions',
      requiredFor: 'all',
      steps: [
        { type: 'interactive', title: 'Session Flow Mastery', content: 'Interactive practice of optimal session structure' },
        { type: 'simulation', title: 'Live Session Practice', content: 'Full 60-minute practice session with your student scenario' },
        { type: 'checklist', title: 'Excellence Verification', content: 'Final readiness checklist with evidence submission' }
      ]
    });

    return baseModules;
  };

  const trainingModules = getPersonalizedModules();

  // Validation Functions
  const validateEmailSetup = async (email) => {
    // Simulate API call to verify email setup
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (email && email.includes('@ivymentors.co')) {
      setValidationResults(prev => ({
        ...prev,
        emailSetup: { 
          status: 'success', 
          message: 'Email setup verified successfully!',
          evidence: `Test email sent to ${email}`
        }
      }));
      return true;
    } else {
      setValidationResults(prev => ({
        ...prev,
        emailSetup: { 
          status: 'error', 
          message: 'Please use your @ivymentors.co email address',
          evidence: null
        }
      }));
      return false;
    }
  };

  const validateZoomIntegration = async () => {
    // Simulate Zoom integration check
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setValidationResults(prev => ({
      ...prev,
      zoomIntegration: { 
        status: 'success', 
        message: 'Zoom integration verified with calendar sync enabled',
        evidence: 'Test meeting created successfully'
      }
    }));
    return true;
  };

  const validateMercurySetup = async () => {
    // Simulate Mercury payment setup check
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setValidationResults(prev => ({
      ...prev,
      mercuryPayment: { 
        status: 'success', 
        message: 'Mercury payment setup completed',
        evidence: 'Banking information verified'
      }
    }));
    return true;
  };

  // File Upload Handler
  const handleFileUpload = (event, type) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedEvidence(prev => ({
          ...prev,
          [type]: {
            name: file.name,
            type: file.type,
            size: file.size,
            content: e.target.result
          }
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Session Simulation
  const startSessionSimulation = () => {
    const scenarios = [
      {
        title: 'Student Engagement Challenge',
        description: 'Your student seems distracted and unresponsive. How do you re-engage them?',
        type: 'engagement',
        studentGrade: studentProfile.grade || '11th'
      },
      {
        title: 'Parent Pressure Situation',
        description: 'The student mentions feeling overwhelmed by parent expectations. How do you handle this?',
        type: 'family-dynamics',
        studentGrade: studentProfile.grade || '11th'
      },
      {
        title: 'Goal Setting Session',
        description: 'This is your first session. Walk through the complete 60-minute structure.',
        type: 'first-session',
        studentGrade: studentProfile.grade || '11th'
      }
    ];

    const randomScenario = scenarios[Math.floor(Math.random() * scenarios.length)];
    setSimulationScenario(randomScenario);
    setSessionSimulationActive(true);
  };

  // Student Profile Mastery Quiz
  const conductMasteryQuiz = () => {
    const questions = [
      {
        question: `What is ${studentProfile.name || 'your student'}'s primary academic goal?`,
        options: ['Ivy League admission', 'Top UC admission', 'Merit scholarships', 'Skill development'],
        correct: 0
      },
      {
        question: 'What is the most critical area needing improvement?',
        options: ['GPA improvement', 'Test scores', 'Extracurriculars', 'Essays'],
        correct: 1
      },
      {
        question: 'What coaching approach would be most effective?',
        options: ['Structured accountability', 'Creative exploration', 'Technical skill building', 'Emotional support'],
        correct: 0
      }
    ];

    // Simulate quiz completion
    const score = Math.floor(Math.random() * 41) + 60; // Random score between 60-100
    setValidationResults(prev => ({
      ...prev,
      studentProfileMastery: {
        status: score >= 80 ? 'success' : 'warning',
        message: score >= 80 ? 'Excellent understanding of student profile!' : 'Review student profile more thoroughly',
        score
      }
    }));
  };

  const completeStep = (moduleId, stepIndex) => {
    const newCompleted = new Set(completedModules);
    const moduleIndex = trainingModules.findIndex(m => m.id === moduleId);
    
    if (stepIndex === trainingModules[moduleIndex].steps.length - 1) {
      newCompleted.add(moduleId);
      setCompletedModules(newCompleted);
      
      // Unlock next module
      if (moduleIndex < trainingModules.length - 1) {
        trainingModules[moduleIndex + 1].unlocked = true;
      }
      
      // Award points and badges
      setUserProgress(prev => ({
        ...prev,
        pointsEarned: prev.pointsEarned + 100,
        badgesEarned: moduleId === 'setup' ? [...prev.badgesEarned, 'setup-wizard'] : prev.badgesEarned
      }));
      
      // Move to next module if available
      if (moduleIndex < trainingModules.length - 1) {
        setCurrentModule(moduleIndex + 1);
        setCurrentStep(0);
      }
    } else {
      // Move to next step
      setCurrentStep(stepIndex + 1);
    }
  };

  const getReadinessStatus = () => {
    if (userProgress.readinessScore >= 90) return { color: '#16a34a', label: 'Ready for First Session!' };
    if (userProgress.readinessScore >= 70) return { color: '#d97706', label: 'Almost Ready' };
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
      {/* Enhanced Header with Readiness Indicator */}
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
                Ivylevel Coach Training
              </h1>
              <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
                Smart Personalized Training Platform
              </p>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
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
            
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827' }}>
                {coachProfile.name || 'Coach'}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                Readiness: {userProgress.readinessScore}%
              </div>
            </div>
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
        {/* Main Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* Critical Blockers Alert */}
          {userProgress.criticalBlockers.length > 0 && (
            <div style={{ 
              background: '#fef3c7',
              border: '1px solid #f59e0b',
              borderRadius: '12px',
              padding: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <icons.AlertCircle />
                <h3 style={{ color: '#d97706', fontSize: '1.125rem', fontWeight: '600', margin: 0 }}>
                  Action Required Before First Session
                </h3>
              </div>
              <ul style={{ margin: '0', paddingLeft: '20px', color: '#92400e' }}>
                {userProgress.criticalBlockers.map((blocker, idx) => (
                  <li key={idx} style={{ marginBottom: '4px' }}>{blocker}</li>
                ))}
              </ul>
            </div>
          )}

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
            </div>
          )}

          {/* Session Simulation Modal */}
          {sessionSimulationActive && simulationScenario && (
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
              zIndex: 1000
            }}>
              <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '32px',
                maxWidth: '600px',
                width: '90%',
                maxHeight: '80vh',
                overflow: 'auto'
              }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '16px' }}>
                  Session Simulation: {simulationScenario.title}
                </h3>
                <p style={{ color: '#6b7280', marginBottom: '24px', lineHeight: '1.6' }}>
                  {simulationScenario.description}
                </p>
                
                <div style={{ 
                  background: '#f8fafc', 
                  padding: '16px', 
                  borderRadius: '8px', 
                  marginBottom: '24px' 
                }}>
                  <strong>Student Profile:</strong> {studentProfile.grade || '11th'} Grade, 
                  {studentProfile.focusArea || 'General'} Focus
                </div>
                
                <textarea
                  placeholder="Type your response to this scenario..."
                  style={{
                    width: '100%',
                    height: '120px',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    marginBottom: '16px',
                    resize: 'vertical'
                  }}
                />
                
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setSessionSimulationActive(false)}
                    style={{
                      padding: '12px 24px',
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
                      setSessionSimulationActive(false);
                      completeStep(trainingModules[currentModule].id, currentStep);
                    }}
                    style={{
                      padding: '12px 24px',
                      background: '#2563eb',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    Submit Response
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Enhanced Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
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
                {userProgress.readinessScore}%
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
                  {userProgress.pointsEarned}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Points</div>
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

          {/* Student Profile Card */}
          {studentProfile.name && (
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
              </div>
            </div>
          )}

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

  // Helper function to render different step content types
  function renderStepContent(module, stepIndex) {
    const step = module.steps[stepIndex];
    
    switch (step.type) {
      case 'interactive':
        if (step.title === 'Coach Profile Setup') {
          return renderCoachProfileSetup();
        }
        break;
        
      case 'upload':
        if (step.title === 'Student Profile Upload') {
          return renderStudentProfileUpload();
        }
        break;
        
      case 'validation':
        return renderValidationStep(step);
        
      case 'quiz':
        if (step.title === 'Comprehension Check') {
          return renderComprehensionQuiz();
        }
        break;
        
      case 'simulation':
        return renderSimulationStep();
        
      default:
        return renderDefaultStep();
    }
  }

  function renderCoachProfileSetup() {
    return (
      <div>
        <div style={{ marginBottom: '24px' }}>
          <label style={{ 
            display: 'block', 
            fontSize: '0.875rem', 
            fontWeight: '500', 
            color: '#374151', 
            marginBottom: '8px' 
          }}>
            Your Full Name *
          </label>
          <input 
            type="text" 
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '1rem',
              transition: 'all 0.2s ease',
              background: 'white'
            }}
            placeholder="Enter your full name"
            value={coachProfile.name}
            onChange={(e) => setCoachProfile(prev => ({...prev, name: e.target.value}))}
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ 
            display: 'block', 
            fontSize: '0.875rem', 
            fontWeight: '500', 
            color: '#374151', 
            marginBottom: '8px' 
          }}>
            Ivylevel Email Address *
          </label>
          <input 
            type="email" 
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '1rem',
              transition: 'all 0.2s ease',
              background: 'white'
            }}
            placeholder="yourname@ivymentors.co"
            value={coachProfile.ivylevelEmail}
            onChange={(e) => setCoachProfile(prev => ({...prev, ivylevelEmail: e.target.value}))}
          />
        </div>
        
        <button 
          onClick={() => completeStep(trainingModules[currentModule].id, currentStep)}
          disabled={!coachProfile.name || !coachProfile.ivylevelEmail}
          style={{
            width: '100%',
            background: (!coachProfile.name || !coachProfile.ivylevelEmail) ? '#d1d5db' : '#2563eb',
            color: 'white',
            padding: '12px 24px',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: '500',
            cursor: (!coachProfile.name || !coachProfile.ivylevelEmail) ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          Complete Profile Setup
        </button>
      </div>
    );
  }

  function renderStudentProfileUpload() {
    return (
      <div>
        <div style={{ 
          border: '2px dashed #d1d5db', 
          borderRadius: '12px', 
          padding: '40px', 
          textAlign: 'center', 
          marginBottom: '24px',
          background: '#fafafa'
        }}>
          <icons.Upload />
          <p style={{ marginTop: '16px', marginBottom: '16px', color: '#6b7280' }}>
            Upload your assigned student's profile document or enter details manually
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(e) => handleFileUpload(e, 'studentProfile')}
            style={{ display: 'none' }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              background: '#2563eb',
              color: 'white',
              padding: '8px 16px',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            Choose File
          </button>
        </div>

        {/* Manual Entry Form */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <input
            placeholder="Student Name"
            value={studentProfile.name}
            onChange={(e) => setStudentProfile(prev => ({...prev, name: e.target.value}))}
            style={{
              padding: '12px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '1rem'
            }}
          />
          <select
            value={studentProfile.grade}
            onChange={(e) => setStudentProfile(prev => ({...prev, grade: e.target.value}))}
            style={{
              padding: '12px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',  
              fontSize: '1rem',
              background: 'white'
            }}
          >
            <option value="">Select Grade</option>
            <option value="9th">9th Grade (Freshman)</option>
            <option value="10th">10th Grade (Sophomore)</option>
            <option value="11th">11th Grade (Junior)</option>
            <option value="12th">12th Grade (Senior)</option>
          </select>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <select
            value={studentProfile.focusArea}
            onChange={(e) => setStudentProfile(prev => ({...prev, focusArea: e.target.value}))}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '1rem',
              background: 'white'
            }}
          >
            <option value="">Select Focus Area</option>
            <option value="pre-med">Pre-Med Track</option>
            <option value="stem">STEM Focus</option>
            <option value="liberal-arts">Liberal Arts</option>
            <option value="business">Business/Economics</option>
            <option value="arts">Arts & Creative</option>
            <option value="general">General College Prep</option>
          </select>
        </div>

        <button 
          onClick={() => completeStep(trainingModules[currentModule].id, currentStep)}
          disabled={!studentProfile.name || !studentProfile.grade}
          style={{
            width: '100%',
            background: (!studentProfile.name || !studentProfile.grade) ? '#d1d5db' : '#2563eb',
            color: 'white',
            padding: '12px 24px',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: '500',
            cursor: (!studentProfile.name || !studentProfile.grade) ? 'not-allowed' : 'pointer'
          }}
        >
          Confirm Student Profile
        </button>
      </div>
    );
  }

  function renderValidationStep(step) {
    const getValidationForStep = () => {
      if (step.title.includes('Email')) return 'emailSetup';
      if (step.title.includes('Zoom')) return 'zoomIntegration';
      if (step.title.includes('Payment')) return 'mercuryPayment';
      return 'emailSetup';
    };

    const validationKey = getValidationForStep();
    const validation = validationResults[validationKey];

    return (
      <div>
        <div style={{ 
          background: '#f8f9fa', 
          padding: '20px', 
          borderRadius: '8px', 
          marginBottom: '24px' 
        }}>
          <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '12px' }}>
            {step.title}
          </h4>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', lineHeight: '1.5' }}>
            {step.content}
          </p>
        </div>

        {/* Validation Status */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px', 
          padding: '16px',
          background: validation.status === 'success' ? '#f0fdf4' : 
                     validation.status === 'error' ? '#fef2f2' : '#fffbeb',
          border: `1px solid ${validation.status === 'success' ? '#16a34a' : 
                                validation.status === 'error' ? '#dc2626' : '#d97706'}`,
          borderRadius: '8px',
          marginBottom: '24px'
        }}>
          <div style={{ 
            color: validation.status === 'success' ? '#16a34a' : 
                   validation.status === 'error' ? '#dc2626' : '#d97706' 
          }}>
            {validation.status === 'success' ? <icons.CheckCircle /> : 
             validation.status === 'error' ? <icons.XCircle /> : <icons.AlertCircle />}
          </div>
          <div>
            <div style={{ fontWeight: '500', fontSize: '0.875rem' }}>
              {validation.message || 'Click to validate setup'}
            </div>
            {validation.evidence && (
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>
                {validation.evidence}
              </div>
            )}
          </div>
        </div>

        {/* Validation Action */}
        {validation.status !== 'success' && (
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => {
                if (validationKey === 'emailSetup') {
                  validateEmailSetup(coachProfile.ivylevelEmail);
                } else if (validationKey === 'zoomIntegration') {
                  validateZoomIntegration();
                } else if (validationKey === 'mercuryPayment') {
                  validateMercurySetup();
                }
              }}
              style={{
                background: '#2563eb',
                color: 'white',
                padding: '12px 24px',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}
            >
              Validate Setup
            </button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleFileUpload(e, validationKey)}
                style={{ display: 'none' }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  background: '#f3f4f6',
                  color: '#374151',
                  padding: '12px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <icons.Camera />
                Upload Evidence
              </button>
            </div>
          </div>
        )}

        {validation.status === 'success' && (
          <button 
            onClick={() => completeStep(trainingModules[currentModule].id, currentStep)}
            style={{
              width: '100%',
              background: '#16a34a',
              color: 'white',
              padding: '12px 24px',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Continue to Next Step
          </button>
        )}
      </div>
    );
  }

  function renderComprehensionQuiz() {
    return (
      <div>
        <div style={{ 
          background: '#f8f9fa', 
          padding: '20px', 
          borderRadius: '8px', 
          marginBottom: '24px' 
        }}>
          <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '12px' }}>
            Student Profile Mastery Check
          </h4>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            Demonstrate your understanding of {studentProfile.name || 'your assigned student'}'s profile and coaching needs.
          </p>
        </div>

        {validationResults.studentProfileMastery.score > 0 && (
          <div style={{ 
            background: validationResults.studentProfileMastery.status === 'success' ? '#f0fdf4' : '#fffbeb',
            border: `1px solid ${validationResults.studentProfileMastery.status === 'success' ? '#16a34a' : '#d97706'}`,
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ color: validationResults.studentProfileMastery.status === 'success' ? '#16a34a' : '#d97706' }}>
                {validationResults.studentProfileMastery.status === 'success' ? <icons.CheckCircle /> : <icons.AlertCircle />}
              </div>
              <div>
                <div style={{ fontWeight: '600' }}>
                  Score: {validationResults.studentProfileMastery.score}%
                </div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  {validationResults.studentProfileMastery.message}
                </div>
              </div>
            </div>
          </div>
        )}

        <button 
          onClick={conductMasteryQuiz}
          disabled={validationResults.studentProfileMastery.score >= 80}
          style={{
            width: '100%',
            background: validationResults.studentProfileMastery.score >= 80 ? '#16a34a' : '#2563eb',
            color: 'white',
            padding: '12px 24px',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: '500',
            cursor: 'pointer',
            marginBottom: '16px'
          }}
        >
          {validationResults.studentProfileMastery.score >= 80 ? 'Quiz Passed!' : 'Take Mastery Quiz'}
        </button>

        {validationResults.studentProfileMastery.score >= 80 && (
          <button 
            onClick={() => completeStep(trainingModules[currentModule].id, currentStep)}
            style={{
              width: '100%',
              background: '#16a34a',
              color: 'white',
              padding: '12px 24px',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Continue Training
          </button>
        )}
      </div>
    );
  }

  function renderSimulationStep() {
    return (
      <div>
        <div style={{ 
          background: '#f8f9fa', 
          padding: '20px', 
          borderRadius: '8px', 
          marginBottom: '24px' 
        }}>
          <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '12px' }}>
            Practice Session Simulation
          </h4>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            Practice your coaching skills with realistic scenarios based on your student's profile.
          </p>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '16px', 
          marginBottom: '24px' 
        }}>
          <div style={{ padding: '16px', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #e0f2fe' }}>
            <strong>Student:</strong> {studentProfile.name || 'Assigned Student'}<br />
            <strong>Grade:</strong> {studentProfile.grade || 'TBD'}<br />
            <strong>Focus:</strong> {studentProfile.focusArea || 'General'}
          </div>
          <div style={{ padding: '16px', background: '#fef3c7', borderRadius: '8px', border: '1px solid #f59e0b' }}>
            <strong>Session Type:</strong> Interactive Practice<br />
            <strong>Duration:</strong> 15-20 minutes<br />
            <strong>Recording:</strong> Optional
          </div>
        </div>

        <button 
          onClick={startSessionSimulation}
          style={{
            width: '100%',
            background: '#2563eb',
            color: 'white',
            padding: '16px 24px',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: '500',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <icons.Play />
          Start Practice Session
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
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          Continue
        </button>
      </div>
    );
  }
}

export default App;