// EnhancedApp.js - Complete integration of all services

import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  onAuthStateChanged,
  signOut 
} from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

// Import all our services
import GoogleDriveService from './services/googleDriveService';
import recommendationEngine from './services/recommendationEngine';
import emailService from './services/emailAutomation';

// Import enhanced components
import EnhancedAdminDashboard from './components/EnhancedAdminDashboard';
import EnhancedCoachDashboard from './components/EnhancedCoachDashboard';
import ResourceManagement from './components/ResourceManagement';

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

// Initialize services
let driveService = null;

function EnhancedApp() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [servicesReady, setServicesReady] = useState(false);

  // Initialize all services on app load
  useEffect(() => {
    const initializeServices = async () => {
      try {
        // Initialize Google Drive service
        driveService = new GoogleDriveService();
        await driveService.initialize();
        
        console.log('All services initialized successfully');
        setServicesReady(true);
      } catch (error) {
        console.error('Error initializing services:', error);
        setError('Failed to initialize services. Some features may be limited.');
      }
    };

    initializeServices();
  }, []);

  // Auth state observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User is signed in
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserData({ id: user.uid, ...data });
          setUser(user);
          
          // Update last login
          await updateDoc(doc(db, 'users', user.uid), {
            lastLogin: serverTimestamp(),
            lastActivityAt: serverTimestamp()
          });
        }
      } else {
        setUser(null);
        setUserData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Enhanced login function
  const handleLogin = async (email, password) => {
    try {
      setError('');
      setLoading(true);
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Get user data from Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        throw new Error('User profile not found');
      }
      
      const userData = { id: user.uid, ...userDoc.data() };
      setUserData(userData);
      
      // Track login event
      await addAnalyticsEvent('login', {
        userId: user.uid,
        userRole: userData.role,
        timestamp: new Date()
      });
      
      return userData;
    } catch (error) {
      console.error('Login error:', error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Enhanced logout function
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setUserData(null);
    } catch (error) {
      console.error('Logout error:', error);
      setError(error.message);
    }
  };

  // Resource sharing handler
  const handleResourceShare = async (coachId, resources) => {
    try {
      setLoading(true);
      
      // Save each resource assignment to Firestore
      for (const resource of resources) {
        await setDoc(doc(db, 'coachResources'), {
          coachId,
          resourceId: resource.id,
          sharedAt: serverTimestamp(),
          sharedBy: userData.id,
          relevanceScore: resource.relevanceScore || 85,
          matchingCriteria: {
            studentMatch: true,
            gradeMatch: true,
            subjectMatch: true,
            profileMatch: true
          },
          firstAccessedAt: null,
          lastAccessedAt: null,
          accessCount: 0,
          downloadedAt: null,
          rating: null,
          feedback: null,
          wasHelpful: null,
          expiresAt: null,
          notes: null
        });
      }
      
      // Generate and send onboarding email
      const emailContent = await emailService.generateOnboardingEmail(coachId, userData.id);
      await emailService.sendEmail(emailContent);
      
      // Track event
      await addAnalyticsEvent('resources_shared', {
        adminId: userData.id,
        coachId,
        resourceCount: resources.length,
        resourceIds: resources.map(r => r.id)
      });
      
      setLoading(false);
      return true;
    } catch (error) {
      console.error('Error sharing resources:', error);
      setError('Failed to share resources');
      setLoading(false);
      throw error;
    }
  };

  // Get personalized recommendations for coach
  const getCoachRecommendations = async (coachId) => {
    try {
      const recommendations = await recommendationEngine.getRecommendationsForCoach(coachId, {
        limit: 20,
        includeShared: false
      });
      
      return recommendations;
    } catch (error) {
      console.error('Error getting recommendations:', error);
      return [];
    }
  };

  // Sync Google Drive resources (admin only)
  const syncGoogleDrive = async () => {
    if (userData?.role !== 'admin') {
      setError('Only admins can sync Google Drive');
      return;
    }
    
    try {
      setLoading(true);
      const count = await driveService.indexAllResources();
      
      await addAnalyticsEvent('drive_sync', {
        adminId: userData.id,
        resourceCount: count,
        timestamp: new Date()
      });
      
      setLoading(false);
      return count;
    } catch (error) {
      console.error('Error syncing Google Drive:', error);
      setError('Failed to sync Google Drive');
      setLoading(false);
      throw error;
    }
  };

  // Analytics helper
  const addAnalyticsEvent = async (eventType, eventData) => {
    try {
      await setDoc(doc(db, 'analytics'), {
        eventType,
        userId: userData?.id || 'anonymous',
        userRole: userData?.role || 'unknown',
        eventData,
        timestamp: serverTimestamp(),
        platform: 'web',
        userAgent: navigator.userAgent
      });
    } catch (error) {
      console.error('Error logging analytics:', error);
    }
  };

  // Loading screen
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#f9fafb'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '50px', 
            height: '50px', 
            border: '4px solid #FF4A23', 
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }} />
          <p style={{ color: '#6b7280' }}>Loading Smart Coach Platform...</p>
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Error display
  if (error && !user) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#f9fafb'
      }}>
        <div style={{ 
          backgroundColor: 'white', 
          padding: '40px', 
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          maxWidth: '400px',
          textAlign: 'center'
        }}>
          <h2 style={{ color: '#ef4444', marginBottom: '20px' }}>Error</h2>
          <p style={{ color: '#6b7280', marginBottom: '20px' }}>{error}</p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              backgroundColor: '#FF4A23',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Main app render
  return (
    <div className="App">
      {!user ? (
        // Login screen
        <LoginScreen onLogin={handleLogin} error={error} />
      ) : (
        // Authenticated app
        <>
          {userData?.role === 'admin' ? (
            <EnhancedAdminDashboard
              user={userData}
              onLogout={handleLogout}
              onResourceShare={handleResourceShare}
              onSyncDrive={syncGoogleDrive}
              getRecommendations={getCoachRecommendations}
              servicesReady={servicesReady}
            />
          ) : (
            <EnhancedCoachDashboard
              user={userData}
              onLogout={handleLogout}
              onStartTraining={() => console.log('Start training')}
              servicesReady={servicesReady}
            />
          )}
        </>
      )}
    </div>
  );
}

// Login component
const LoginScreen = ({ onLogin, error }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onLogin(email, password);
    } catch (error) {
      // Error handled in parent
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      backgroundColor: '#f9fafb'
    }}>
      <div style={{ 
        backgroundColor: 'white', 
        padding: '40px', 
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        width: '100%',
        maxWidth: '400px'
      }}>
        <h2 style={{ 
          textAlign: 'center', 
          marginBottom: '30px', 
          color: '#FF4A23' 
        }}>
          Smart Coach Platform
        </h2>
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '5px', 
              fontSize: '14px',
              color: '#374151'
            }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '16px'
              }}
              placeholder="admin@ivylevel.com"
            />
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '5px', 
              fontSize: '14px',
              color: '#374151'
            }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px',
                  paddingRight: '40px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '16px'
                }}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#6b7280'
                }}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>
          
          {error && (
            <div style={{ 
              marginBottom: '20px', 
              padding: '10px', 
              backgroundColor: '#fee2e2',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              color: '#dc2626',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: loading ? '#fca5a5' : '#FF4A23',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s'
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        
        <div style={{ 
          marginTop: '20px', 
          padding: '15px', 
          backgroundColor: '#f3f4f6',
          borderRadius: '6px',
          fontSize: '14px',
          color: '#6b7280'
        }}>
          <strong>Demo Credentials:</strong><br />
          Admin: admin@ivylevel.com / admin123<br />
          Coach: coach@ivylevel.com / coach123
        </div>
      </div>
    </div>
  );
};

export default EnhancedApp;