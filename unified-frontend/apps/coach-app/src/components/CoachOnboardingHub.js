// src/components/CoachOnboardingHub.js
// Coach onboarding hub with critical resources

import React, { useState, useEffect } from 'react';
import { 
  Play, 
  FileText, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  ChevronRight,
  User,
  Calendar,
  Target,
  BookOpen,
  Award
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';

const CoachOnboardingHub = ({ studentName, coachName }) => {
  const { currentUser } = useAuth();
  const [onboardingPackage, setOnboardingPackage] = useState(null);
  const [criticalSessions, setCriticalSessions] = useState({
    gamePlan: [],
    '168Hour': [],
    executionExamples: [],
    parentSessions: [],
    milestones: []
  });
  const [checklist, setChecklist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('required');
  const [viewingSession, setViewingSession] = useState(null);

  useEffect(() => {
    loadOnboardingData();
  }, [studentName, coachName]);

  const loadOnboardingData = async () => {
    try {
      setLoading(true);

      // Load or generate onboarding package
      const packageQuery = query(
        collection(db, 'coach_onboarding_packages'),
        where('coach', '==', coachName),
        where('student', '==', studentName)
      );
      const packageSnapshot = await getDocs(packageQuery);

      if (!packageSnapshot.empty) {
        const pkg = { id: packageSnapshot.docs[0].id, ...packageSnapshot.docs[0].data() };
        setOnboardingPackage(pkg);
        setChecklist(pkg.checklist || []);
      } else {
        // Generate new package
        await generateOnboardingPackage();
      }

      // Load critical sessions
      await loadCriticalSessions();
    } catch (error) {
      console.error('Error loading onboarding data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateOnboardingPackage = async () => {
    // This would call the backend service to generate the package
    // For now, we'll create a simplified version
    const newPackage = {
      coach: coachName,
      student: studentName,
      generatedAt: serverTimestamp(),
      checklist: [
        {
          id: 'game-plan',
          task: 'Watch Game Plan Session',
          description: 'Understand student goals and challenges',
          required: true,
          completed: false,
          estimatedTime: 60,
          category: 'critical-viewing'
        },
        {
          id: '168-hour',
          task: 'Review 168-Hour Session Examples',
          description: 'Learn how to conduct your first session',
          required: true,
          completed: false,
          estimatedTime: 90,
          category: 'critical-viewing'
        },
        {
          id: 'execution',
          task: 'Study Weekly Execution Patterns',
          description: 'Understand regular session flow',
          required: true,
          completed: false,
          estimatedTime: 60,
          category: 'critical-viewing'
        },
        {
          id: 'exec-doc',
          task: 'Review Student Execution Doc',
          description: 'Familiarize with collaboration tools',
          required: true,
          completed: false,
          estimatedTime: 30,
          category: 'documentation'
        },
        {
          id: 'quiz',
          task: 'Complete Onboarding Quiz',
          description: 'Test your understanding',
          required: true,
          completed: false,
          estimatedTime: 15,
          category: 'assessment'
        }
      ]
    };

    const docRef = await addDoc(collection(db, 'coach_onboarding_packages'), newPackage);
    setOnboardingPackage({ id: docRef.id, ...newPackage });
    setChecklist(newPackage.checklist);
  };

  const loadCriticalSessions = async () => {
    // Query for critical sessions
    const sessionsQuery = query(
      collection(db, 'coaching_sessions'),
      where('participants.studentNormalized', '==', studentName.toLowerCase())
    );
    const snapshot = await getDocs(sessionsQuery);

    const sessions = {
      gamePlan: [],
      '168Hour': [],
      executionExamples: [],
      parentSessions: [],
      milestones: []
    };

    snapshot.forEach(doc => {
      const session = { id: doc.id, ...doc.data() };
      const type = session.criticalSessionType;

      if (type === 'GAME_PLAN') sessions.gamePlan.push(session);
      else if (type === '168_HOUR') sessions['168Hour'].push(session);
      else if (type === 'EXECUTION' && sessions.executionExamples.length < 3) {
        sessions.executionExamples.push(session);
      }
      else if (type === 'PARENT_SESSION') sessions.parentSessions.push(session);
      else if (type === 'MILESTONE') sessions.milestones.push(session);
    });

    setCriticalSessions(sessions);
  };

  const updateChecklistItem = async (itemId, completed) => {
    const updatedChecklist = checklist.map(item =>
      item.id === itemId ? { ...item, completed } : item
    );
    setChecklist(updatedChecklist);

    // Update in Firestore
    if (onboardingPackage?.id) {
      await updateDoc(doc(db, 'coach_onboarding_packages', onboardingPackage.id), {
        checklist: updatedChecklist,
        lastUpdated: serverTimestamp()
      });
    }

    // Log progress
    await addDoc(collection(db, 'onboarding_progress'), {
      coach: coachName,
      student: studentName,
      action: completed ? 'completed' : 'uncompleted',
      itemId,
      timestamp: serverTimestamp()
    });
  };

  const markSessionAsViewed = async (sessionId) => {
    setViewingSession(sessionId);
    
    // Log viewing
    await addDoc(collection(db, 'session_views'), {
      sessionId,
      coach: coachName,
      viewedAt: serverTimestamp(),
      context: 'onboarding'
    });

    // Simulate viewing time
    setTimeout(() => {
      setViewingSession(null);
    }, 3000);
  };

  const calculateProgress = () => {
    const required = checklist.filter(item => item.required);
    const completed = required.filter(item => item.completed);
    return Math.round((completed.length / required.length) * 100);
  };

  const formatDuration = (minutes) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  const SessionCard = ({ session, type, required = false }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-medium text-gray-900 flex items-center gap-2">
            {session.title || session.originalFileName?.split('_').slice(0, 3).join(' ')}
            {required && (
              <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Required</span>
            )}
          </h4>
          <p className="text-sm text-gray-600 mt-1">
            {session.participants?.coach} & {session.participants?.student}
          </p>
          {session.sessionInfo?.date && (
            <p className="text-xs text-gray-500 mt-1">
              {new Date(session.sessionInfo.date.seconds * 1000).toLocaleDateString()}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {viewingSession === session.id ? (
            <div className="text-blue-600 flex items-center gap-1">
              <Clock className="w-4 h-4 animate-pulse" />
              <span className="text-sm">Viewing...</span>
            </div>
          ) : (
            <button
              onClick={() => markSessionAsViewed(session.id)}
              className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <Play className="w-4 h-4" />
              <span className="text-sm">Watch</span>
            </button>
          )}
        </div>
      </div>
      
      {session.description && (
        <p className="text-sm text-gray-600">{session.description}</p>
      )}
      
      <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
        {session.sessionInfo?.week && (
          <span>Week {session.sessionInfo.week}</span>
        )}
        {session.dataQuality?.confidence && (
          <span>Quality: {Math.round(session.dataQuality.confidence * 100)}%</span>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading onboarding resources...</p>
        </div>
      </div>
    );
  }

  const progress = calculateProgress();

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white mb-8">
        <h1 className="text-2xl font-bold mb-2">Coach Onboarding Hub</h1>
        <div className="flex items-center gap-6 text-blue-100">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4" />
            <span>Coach: {coachName}</span>
          </div>
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            <span>Student: {studentName}</span>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm">Onboarding Progress</span>
            <span className="text-sm font-medium">{progress}% Complete</span>
          </div>
          <div className="w-full bg-blue-800 rounded-full h-2">
            <div 
              className="bg-white h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-4 mb-6 border-b">
        <button
          onClick={() => setActiveSection('required')}
          className={`pb-3 px-1 border-b-2 transition-colors ${
            activeSection === 'required' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>Required Resources</span>
          </div>
        </button>
        <button
          onClick={() => setActiveSection('additional')}
          className={`pb-3 px-1 border-b-2 transition-colors ${
            activeSection === 'additional' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            <span>Additional Resources</span>
          </div>
        </button>
        <button
          onClick={() => setActiveSection('checklist')}
          className={`pb-3 px-1 border-b-2 transition-colors ${
            activeSection === 'checklist' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            <span>Checklist</span>
          </div>
        </button>
      </div>

      {/* Content Sections */}
      {activeSection === 'required' && (
        <div className="space-y-8">
          {/* Game Plan Section */}
          <div>
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-600" />
                Game Plan Session
              </h2>
              <p className="text-gray-600 mt-1">
                Critical for understanding the student's goals, challenges, and personalized strategy
              </p>
            </div>
            <div className="space-y-3">
              {criticalSessions.gamePlan.length > 0 ? (
                criticalSessions.gamePlan.map(session => (
                  <SessionCard key={session.id} session={session} type="game-plan" required />
                ))
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800">No game plan session found for this student.</p>
                </div>
              )}
            </div>
          </div>

          {/* 168-Hour Session Section */}
          <div>
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                168-Hour Session Examples
              </h2>
              <p className="text-gray-600 mt-1">
                Learn how to conduct your first critical session with the student
              </p>
            </div>
            <div className="space-y-3">
              {criticalSessions['168Hour'].length > 0 ? (
                criticalSessions['168Hour'].map(session => (
                  <SessionCard key={session.id} session={session} type="168-hour" required />
                ))
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800">No 168-hour sessions found. Check Week 1-2 sessions.</p>
                </div>
              )}
            </div>
          </div>

          {/* Execution Examples Section */}
          <div>
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Weekly Execution Examples
              </h2>
              <p className="text-gray-600 mt-1">
                Understand the flow and best practices of regular coaching sessions
              </p>
            </div>
            <div className="space-y-3">
              {criticalSessions.executionExamples.length > 0 ? (
                criticalSessions.executionExamples.map(session => (
                  <SessionCard key={session.id} session={session} type="execution" required />
                ))
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800">No execution session examples found.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeSection === 'additional' && (
        <div className="space-y-8">
          {/* Parent Sessions */}
          {criticalSessions.parentSessions.length > 0 && (
            <div>
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Parent Communication Sessions</h2>
                <p className="text-gray-600 mt-1">
                  Examples of parent/family involvement sessions
                </p>
              </div>
              <div className="space-y-3">
                {criticalSessions.parentSessions.map(session => (
                  <SessionCard key={session.id} session={session} type="parent" />
                ))}
              </div>
            </div>
          )}

          {/* Milestone Sessions */}
          {criticalSessions.milestones.length > 0 && (
            <div>
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Milestone & Achievement Sessions</h2>
                <p className="text-gray-600 mt-1">
                  Review sessions celebrating progress and achievements
                </p>
              </div>
              <div className="space-y-3">
                {criticalSessions.milestones.map(session => (
                  <SessionCard key={session.id} session={session} type="milestone" />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeSection === 'checklist' && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Onboarding Checklist</h2>
            
            <div className="space-y-3">
              {checklist.map(item => (
                <div 
                  key={item.id}
                  className={`flex items-start gap-3 p-4 rounded-lg border ${
                    item.completed ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={(e) => updateChecklistItem(item.id, e.target.checked)}
                    className="mt-1 h-5 w-5 text-blue-600 rounded border-gray-300"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className={`font-medium ${
                        item.completed ? 'text-green-900' : 'text-gray-900'
                      }`}>
                        {item.task}
                      </h3>
                      {item.required && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                          Required
                        </span>
                      )}
                      <span className="text-sm text-gray-500">
                        {formatDuration(item.estimatedTime)}
                      </span>
                    </div>
                    {item.description && (
                      <p className={`text-sm mt-1 ${
                        item.completed ? 'text-green-700' : 'text-gray-600'
                      }`}>
                        {item.description}
                      </p>
                    )}
                  </div>
                  {item.completed && (
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>

            {progress === 100 && (
              <div className="mt-6 bg-green-100 border border-green-300 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Award className="w-6 h-6 text-green-700" />
                  <div>
                    <h3 className="font-medium text-green-900">Onboarding Complete!</h3>
                    <p className="text-sm text-green-700 mt-1">
                      You're ready to begin coaching {studentName}. Schedule your first session!
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CoachOnboardingHub;