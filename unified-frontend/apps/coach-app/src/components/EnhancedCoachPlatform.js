import React, { useState, useEffect } from 'react';
import { newCoachesData } from '../data/newCoachesData';
import knowledgeBaseService from '../services/knowledgeBaseService';
import { onAuthStateChanged } from '../services/mockAuth';

const EnhancedCoachPlatform = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedCoach, setSelectedCoach] = useState('kelvin');
  const [activeModule, setActiveModule] = useState('welcome');
  const [allRecordings, setAllRecordings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({
    welcome: { completed: false, startTime: null },
    mastery: { completed: false, score: 0, attempts: 0 },
    technical: { completed: false, checklistItems: {} },
    simulation: { completed: false, score: 0 },
    certification: { completed: false, certificateId: null }
  });

  // Quiz questions for Student Mastery Module
  const masteryQuestions = [
    {
      id: 1,
      question: "What is the primary goal of the IvyLevel coaching methodology?",
      options: [
        "To get students into any college",
        "To help students discover and achieve their authentic potential",
        "To improve test scores only",
        "To complete applications quickly"
      ],
      correct: 1
    },
    {
      id: 2,
      question: "How often should you meet with your assigned student?",
      options: [
        "Once a month",
        "Only when they have questions",
        "Weekly, with consistent scheduling",
        "Whenever convenient"
      ],
      correct: 2
    },
    {
      id: 3,
      question: "What is the 168-hour planning methodology?",
      options: [
        "A time management system for college applications",
        "A comprehensive weekly planning approach to maximize student productivity",
        "The total hours in a semester",
        "A study schedule for SAT prep"
      ],
      correct: 1
    },
    {
      id: 4,
      question: "Which is NOT a core component of student assessment?",
      options: [
        "Academic performance analysis",
        "Extracurricular evaluation",
        "Personal interests and passions",
        "Parent's career preferences"
      ],
      correct: 3
    },
    {
      id: 5,
      question: "What should be your first priority in the initial coaching session?",
      options: [
        "Creating a college list",
        "Building rapport and understanding the student's goals",
        "Reviewing test scores",
        "Setting strict deadlines"
      ],
      correct: 1
    }
  ];

  // Technical checklist items
  const technicalChecklist = [
    { id: 'zoom', label: 'Zoom account setup and tested', required: true },
    { id: 'calendar', label: 'Google Calendar configured and shared', required: true },
    { id: 'drive', label: 'Google Drive access to resources', required: true },
    { id: 'gameplan', label: 'Reviewed Game Plan template', required: true },
    { id: 'execution', label: 'Understood Execution Doc format', required: true },
    { id: 'billing', label: 'Payment and invoicing process clear', required: false },
    { id: 'communication', label: 'Parent communication guidelines reviewed', required: true }
  ];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(null, (user) => {
      setCurrentUser(user);
      if (user) {
        loadUserProgress(user.uid);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    loadCoachData();
  }, [selectedCoach]);

  const loadUserProgress = async (userId) => {
    // In a real app, load from Firestore
    const savedProgress = localStorage.getItem(`coach_progress_${userId}`);
    if (savedProgress) {
      setProgress(JSON.parse(savedProgress));
    }
  };

  const saveProgress = (newProgress) => {
    setProgress(newProgress);
    if (currentUser) {
      localStorage.setItem(`coach_progress_${currentUser.uid}`, JSON.stringify(newProgress));
    }
  };

  const loadCoachData = async () => {
    try {
      setLoading(true);
      const coachData = newCoachesData[selectedCoach];
      if (coachData) {
        const recordings = await knowledgeBaseService.getAllRecordings({ 
          coach: coachData.name 
        });
        setAllRecordings(recordings);
      }
    } catch (error) {
      console.error('Error loading coach data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateOverallProgress = () => {
    const modules = ['welcome', 'mastery', 'technical', 'simulation', 'certification'];
    const completed = modules.filter(m => progress[m]?.completed).length;
    return Math.round((completed / modules.length) * 100);
  };

  const handleQuizSubmit = (answers) => {
    let score = 0;
    answers.forEach((answer, index) => {
      if (answer === masteryQuestions[index].correct) {
        score++;
      }
    });
    
    const percentage = Math.round((score / masteryQuestions.length) * 100);
    const newProgress = {
      ...progress,
      mastery: {
        completed: percentage >= 80,
        score: percentage,
        attempts: (progress.mastery.attempts || 0) + 1,
        lastAttempt: new Date().toISOString()
      }
    };
    
    saveProgress(newProgress);
    return percentage;
  };

  const handleChecklistUpdate = (itemId, checked) => {
    const newProgress = {
      ...progress,
      technical: {
        ...progress.technical,
        checklistItems: {
          ...progress.technical.checklistItems,
          [itemId]: checked
        }
      }
    };
    
    // Check if all required items are completed
    const allRequiredComplete = technicalChecklist
      .filter(item => item.required)
      .every(item => newProgress.technical.checklistItems[item.id]);
    
    newProgress.technical.completed = allRequiredComplete;
    saveProgress(newProgress);
  };

  const generateCertificate = () => {
    const certificateId = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newProgress = {
      ...progress,
      certification: {
        completed: true,
        certificateId,
        completedAt: new Date().toISOString(),
        coachName: currentUser?.displayName || currentUser?.email,
        studentAssigned: newCoachesData[selectedCoach]?.student?.name
      }
    };
    saveProgress(newProgress);
    return certificateId;
  };

  const renderModuleContent = () => {
    switch (activeModule) {
      case 'welcome':
        return <WelcomeModule coach={newCoachesData[selectedCoach]} progress={progress} onComplete={() => {
          const newProgress = { ...progress, welcome: { completed: true, completedAt: new Date().toISOString() } };
          saveProgress(newProgress);
          setActiveModule('mastery');
        }} />;
      
      case 'mastery':
        return <MasteryModule questions={masteryQuestions} progress={progress} onSubmit={handleQuizSubmit} />;
      
      case 'technical':
        return <TechnicalModule checklist={technicalChecklist} progress={progress} onUpdate={handleChecklistUpdate} />;
      
      case 'simulation':
        return <SimulationModule recordings={allRecordings} progress={progress} onComplete={(score) => {
          const newProgress = { ...progress, simulation: { completed: true, score, completedAt: new Date().toISOString() } };
          saveProgress(newProgress);
        }} />;
      
      case 'certification':
        return <CertificationModule progress={progress} onGenerate={generateCertificate} coach={newCoachesData[selectedCoach]} />;
      
      default:
        return null;
    }
  };

  if (!currentUser) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' }}>
        <div style={{ textAlign: 'center', padding: '32px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ marginBottom: '16px' }}>Please Login</h2>
          <p style={{ color: '#6b7280' }}>You need to be logged in to access the coach training platform.</p>
          <button 
            onClick={() => window.location.hash = '#login'} 
            style={{ marginTop: '16px', padding: '8px 24px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <div style={{ backgroundColor: '#4f46e5', color: 'white', padding: '24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '8px' }}>
              IvyLevel Coach Training Platform
            </h1>
            <p style={{ opacity: 0.9 }}>
              Welcome, {currentUser.displayName || currentUser.email}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{calculateOverallProgress()}%</div>
            <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>Overall Progress</div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '24px' }}>
          {/* Sidebar */}
          <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '16px' }}>Training Modules</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { id: 'welcome', label: '1. Welcome & Commitment', icon: '👋' },
                { id: 'mastery', label: '2. Student Mastery Quiz', icon: '📝' },
                { id: 'technical', label: '3. Technical Setup', icon: '⚙️' },
                { id: 'simulation', label: '4. Session Simulation', icon: '🎭' },
                { id: 'certification', label: '5. Final Certification', icon: '🏆' }
              ].map((module) => (
                <button
                  key={module.id}
                  onClick={() => setActiveModule(module.id)}
                  style={{
                    padding: '12px 16px',
                    border: 'none',
                    borderRadius: '6px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    backgroundColor: activeModule === module.id ? '#e0e7ff' : progress[module.id]?.completed ? '#dcfce7' : '#f3f4f6',
                    color: activeModule === module.id ? '#4338ca' : progress[module.id]?.completed ? '#166534' : '#374151',
                    fontWeight: activeModule === module.id ? '600' : '400',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <span>{module.icon}</span>
                  <span style={{ flex: 1 }}>{module.label}</span>
                  {progress[module.id]?.completed && <span>✓</span>}
                </button>
              ))}
            </div>

            <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#f3f4f6', borderRadius: '6px' }}>
              <h4 style={{ fontWeight: '600', marginBottom: '8px' }}>Selected Coach Profile</h4>
              <select
                value={selectedCoach}
                onChange={(e) => setSelectedCoach(e.target.value)}
                style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', marginBottom: '8px' }}
              >
                {Object.entries(newCoachesData).map(([key, coach]) => (
                  <option key={key} value={key}>{coach.name}</option>
                ))}
              </select>
              <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                Student: {newCoachesData[selectedCoach]?.student?.name || 'Multiple Students'}
              </p>
            </div>
          </div>

          {/* Main Content */}
          <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '48px' }}>
                <div>Loading...</div>
              </div>
            ) : (
              renderModuleContent()
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Module Components
const WelcomeModule = ({ coach, progress, onComplete }) => (
  <div>
    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px' }}>Welcome to IvyLevel Coach Training</h2>
    <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
      <h3 style={{ fontWeight: '600', marginBottom: '8px' }}>Your Assignment</h3>
      <p><strong>Student:</strong> {coach?.student?.name || 'Multiple Students'}</p>
      <p><strong>Profile:</strong> {coach?.student?.profile}</p>
      <p><strong>Focus Areas:</strong> {coach?.student?.focusAreas?.join(', ')}</p>
    </div>
    
    <div style={{ marginBottom: '24px' }}>
      <h3 style={{ fontWeight: '600', marginBottom: '8px' }}>Training Commitment</h3>
      <p style={{ marginBottom: '16px' }}>By proceeding with this training, you commit to:</p>
      <ul style={{ paddingLeft: '24px', marginBottom: '16px' }}>
        <li>Completing all 5 training modules within 48 hours</li>
        <li>Meeting with your assigned student weekly</li>
        <li>Following the IvyLevel coaching methodology</li>
        <li>Maintaining confidentiality of student information</li>
        <li>Providing consistent, high-quality guidance</li>
      </ul>
    </div>
    
    {!progress.welcome.completed && (
      <button
        onClick={onComplete}
        style={{
          padding: '12px 24px',
          backgroundColor: '#4f46e5',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '16px',
          fontWeight: '500'
        }}
      >
        I Understand & Commit
      </button>
    )}
  </div>
);

const MasteryModule = ({ questions, progress, onSubmit }) => {
  const [answers, setAnswers] = useState(Array(questions.length).fill(null));
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);

  const handleSubmit = () => {
    const result = onSubmit(answers);
    setScore(result);
    setShowResults(true);
  };

  if (showResults) {
    return (
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px' }}>Quiz Results</h2>
        <div style={{ textAlign: 'center', padding: '32px', backgroundColor: score >= 80 ? '#dcfce7' : '#fee2e2', borderRadius: '8px', marginBottom: '24px' }}>
          <div style={{ fontSize: '3rem', fontWeight: 'bold', color: score >= 80 ? '#166534' : '#991b1b' }}>{score}%</div>
          <p style={{ fontSize: '1.125rem', marginTop: '8px' }}>
            {score >= 80 ? 'Congratulations! You passed!' : 'Please review the materials and try again.'}
          </p>
        </div>
        {score < 80 && (
          <button
            onClick={() => {
              setAnswers(Array(questions.length).fill(null));
              setShowResults(false);
            }}
            style={{ padding: '12px 24px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
          >
            Retake Quiz
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px' }}>Student Mastery Quiz</h2>
      <p style={{ marginBottom: '24px', color: '#6b7280' }}>
        Test your understanding of IvyLevel's coaching methodology. You need 80% or higher to pass.
      </p>
      
      {questions.map((q, index) => (
        <div key={q.id} style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
          <h4 style={{ fontWeight: '600', marginBottom: '12px' }}>Question {index + 1}: {q.question}</h4>
          {q.options.map((option, optionIndex) => (
            <label key={optionIndex} style={{ display: 'block', marginBottom: '8px', cursor: 'pointer' }}>
              <input
                type="radio"
                name={`question-${index}`}
                value={optionIndex}
                checked={answers[index] === optionIndex}
                onChange={() => {
                  const newAnswers = [...answers];
                  newAnswers[index] = optionIndex;
                  setAnswers(newAnswers);
                }}
                style={{ marginRight: '8px' }}
              />
              {option}
            </label>
          ))}
        </div>
      ))}
      
      <button
        onClick={handleSubmit}
        disabled={answers.includes(null)}
        style={{
          padding: '12px 24px',
          backgroundColor: answers.includes(null) ? '#9ca3af' : '#4f46e5',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: answers.includes(null) ? 'not-allowed' : 'pointer',
          fontSize: '16px',
          fontWeight: '500'
        }}
      >
        Submit Quiz
      </button>
    </div>
  );
};

const TechnicalModule = ({ checklist, progress, onUpdate }) => (
  <div>
    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px' }}>Technical Setup Checklist</h2>
    <p style={{ marginBottom: '24px', color: '#6b7280' }}>
      Complete all required items to proceed. These tools are essential for effective coaching.
    </p>
    
    <div style={{ marginBottom: '24px' }}>
      {checklist.map((item) => (
        <label key={item.id} style={{ display: 'flex', alignItems: 'center', marginBottom: '12px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={progress.technical.checklistItems[item.id] || false}
            onChange={(e) => onUpdate(item.id, e.target.checked)}
            style={{ marginRight: '12px' }}
          />
          <span style={{ flex: 1 }}>{item.label}</span>
          {item.required && <span style={{ color: '#ef4444', fontSize: '0.875rem' }}>Required</span>}
        </label>
      ))}
    </div>
    
    {progress.technical.completed && (
      <div style={{ padding: '16px', backgroundColor: '#dcfce7', borderRadius: '8px' }}>
        <p style={{ color: '#166534', fontWeight: '600' }}>✓ All required items completed!</p>
      </div>
    )}
  </div>
);

const SimulationModule = ({ recordings, progress, onComplete }) => {
  const [simulationStarted, setSimulationStarted] = useState(false);
  const [responses, setResponses] = useState({});

  const scenarios = [
    {
      id: 1,
      scenario: "Your student says: 'I don't think I'm good enough for Ivy League schools.'",
      goodResponse: "Let's explore what makes you unique. Every student has strengths - let's identify yours and build on them.",
      badResponse: "You're probably right. Let's look at easier schools."
    },
    {
      id: 2,
      scenario: "The parent interrupts your session and starts directing the conversation.",
      goodResponse: "I appreciate your input. Let's schedule a separate parent meeting to discuss your concerns.",
      badResponse: "Sure, let's focus on what you want to talk about instead."
    },
    {
      id: 3,
      scenario: "Your student hasn't completed their weekly assignments.",
      goodResponse: "Let's understand what challenges you faced this week and adjust our plan to be more manageable.",
      badResponse: "This is unacceptable. You need to take this more seriously."
    }
  ];

  const calculateScore = () => {
    const correct = Object.values(responses).filter(r => r === 'good').length;
    return Math.round((correct / scenarios.length) * 100);
  };

  if (simulationStarted && Object.keys(responses).length === scenarios.length) {
    const score = calculateScore();
    return (
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px' }}>Simulation Complete</h2>
        <div style={{ textAlign: 'center', padding: '32px', backgroundColor: '#dcfce7', borderRadius: '8px', marginBottom: '24px' }}>
          <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#166534' }}>{score}%</div>
          <p style={{ fontSize: '1.125rem', marginTop: '8px' }}>Coaching Simulation Score</p>
        </div>
        {score >= 70 && !progress.simulation.completed && (
          <button
            onClick={() => onComplete(score)}
            style={{ padding: '12px 24px', backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
          >
            Complete Module
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px' }}>Coaching Session Simulation</h2>
      
      {!simulationStarted ? (
        <div>
          <p style={{ marginBottom: '16px' }}>
            You'll be presented with common coaching scenarios. Choose the best response for each situation.
          </p>
          <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
            <h3 style={{ fontWeight: '600', marginBottom: '8px' }}>Available Training Videos</h3>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '12px' }}>
              Review these recordings before starting the simulation:
            </p>
            {recordings.slice(0, 3).map((video, index) => (
              <div key={index} style={{ padding: '8px', backgroundColor: 'white', borderRadius: '4px', marginBottom: '8px' }}>
                <p style={{ fontWeight: '500' }}>{video.topic}</p>
                <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  Coach: {video.coach} | Student: {video.student}
                </p>
              </div>
            ))}
          </div>
          <button
            onClick={() => setSimulationStarted(true)}
            style={{ padding: '12px 24px', backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
          >
            Start Simulation
          </button>
        </div>
      ) : (
        <div>
          {scenarios.map((scenario, index) => (
            <div key={scenario.id} style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
              <h4 style={{ fontWeight: '600', marginBottom: '12px' }}>Scenario {index + 1}</h4>
              <p style={{ marginBottom: '16px', fontStyle: 'italic' }}>{scenario.scenario}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name={`scenario-${scenario.id}`}
                    value="good"
                    onChange={() => setResponses({ ...responses, [scenario.id]: 'good' })}
                    style={{ marginRight: '8px' }}
                  />
                  {scenario.goodResponse}
                </label>
                <label style={{ cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name={`scenario-${scenario.id}`}
                    value="bad"
                    onChange={() => setResponses({ ...responses, [scenario.id]: 'bad' })}
                    style={{ marginRight: '8px' }}
                  />
                  {scenario.badResponse}
                </label>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const CertificationModule = ({ progress, onGenerate, coach }) => {
  const [certificateId, setCertificateId] = useState(progress.certification.certificateId);
  const allModulesComplete = ['welcome', 'mastery', 'technical', 'simulation'].every(m => progress[m]?.completed);

  if (!allModulesComplete) {
    return (
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px' }}>Final Certification</h2>
        <div style={{ padding: '24px', backgroundColor: '#fef3c7', borderRadius: '8px' }}>
          <p style={{ color: '#92400e', fontWeight: '600' }}>⚠️ Complete all previous modules to unlock certification</p>
        </div>
      </div>
    );
  }

  if (certificateId) {
    return (
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px' }}>Congratulations!</h2>
        <div style={{ 
          padding: '48px', 
          backgroundColor: '#f9fafb', 
          borderRadius: '8px', 
          border: '2px solid #4f46e5',
          textAlign: 'center',
          marginBottom: '24px'
        }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#4f46e5', marginBottom: '24px' }}>
            Certificate of Completion
          </h1>
          <p style={{ fontSize: '1.125rem', marginBottom: '16px' }}>
            This certifies that
          </p>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px' }}>
            {progress.certification.coachName}
          </p>
          <p style={{ fontSize: '1.125rem', marginBottom: '24px' }}>
            has successfully completed the IvyLevel Coach Training Program
          </p>
          <p style={{ marginBottom: '8px' }}>
            <strong>Student Assignment:</strong> {coach?.student?.name || 'Multiple Students'}
          </p>
          <p style={{ marginBottom: '8px' }}>
            <strong>Completion Date:</strong> {new Date(progress.certification.completedAt).toLocaleDateString()}
          </p>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '24px' }}>
            Certificate ID: {certificateId}
          </p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={() => window.print()}
            style={{ padding: '12px 24px', backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
          >
            Print Certificate
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px' }}>Final Certification</h2>
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontWeight: '600', marginBottom: '16px' }}>Training Summary</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ padding: '16px', backgroundColor: '#dcfce7', borderRadius: '8px' }}>
            <p style={{ fontWeight: '600' }}>Mastery Quiz Score</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{progress.mastery.score}%</p>
          </div>
          <div style={{ padding: '16px', backgroundColor: '#dcfce7', borderRadius: '8px' }}>
            <p style={{ fontWeight: '600' }}>Simulation Score</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{progress.simulation.score}%</p>
          </div>
        </div>
      </div>
      
      <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
        <h4 style={{ fontWeight: '600', marginBottom: '8px' }}>Coach Pledge</h4>
        <p>I pledge to:</p>
        <ul style={{ paddingLeft: '24px', marginTop: '8px' }}>
          <li>Uphold the highest standards of coaching excellence</li>
          <li>Maintain student confidentiality</li>
          <li>Provide consistent, reliable guidance</li>
          <li>Continue learning and improving my coaching skills</li>
        </ul>
      </div>
      
      <button
        onClick={() => {
          const id = onGenerate();
          setCertificateId(id);
        }}
        style={{ 
          padding: '16px 32px', 
          backgroundColor: '#4f46e5', 
          color: 'white', 
          border: 'none', 
          borderRadius: '8px', 
          cursor: 'pointer',
          fontSize: '18px',
          fontWeight: '600'
        }}
      >
        Generate Certificate
      </button>
    </div>
  );
};

export default EnhancedCoachPlatform;