import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  StarIcon, TargetIcon, BookIcon, TrophyIcon, 
  CheckIcon, PlayIcon, ArrowRightIcon, ICON_COLORS 
} from './Icons';

const CoachWelcome = ({ coachId, onComplete }) => {
  const [coachProfile, setCoachProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    loadCoachProfile();
  }, [coachId]);

  const loadCoachProfile = async () => {
    try {
      // First try to get user data
      const userRef = doc(db, 'users', coachId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists() && userSnap.data().coachId) {
        // If user has coachId, fetch full coach profile
        const coachRef = doc(db, 'coaches', userSnap.data().coachId);
        const coachSnap = await getDoc(coachRef);
        
        if (coachSnap.exists()) {
          setCoachProfile({ ...coachSnap.data(), userId: coachId });
        }
      } else {
        // Fallback: try to fetch directly from coaches collection
        const coachRef = doc(db, 'coaches', coachId);
        const coachSnap = await getDoc(coachRef);
        
        if (coachSnap.exists()) {
          setCoachProfile(coachSnap.data());
        }
      }
    } catch (error) {
      console.error('Error loading coach profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const startJourney = async () => {
    try {
      // Update user status
      const userRef = doc(db, 'users', coachId);
      await updateDoc(userRef, {
        status: 'onboarding',
        onboardingStarted: true
      });
      
      // If we have a separate coach profile, update that too
      if (coachProfile?.userId || coachProfile?.coachId) {
        const coachRef = doc(db, 'coaches', coachProfile.coachId || coachId);
        await updateDoc(coachRef, {
          status: 'onboarding',
          onboardingStarted: new Date().toISOString()
        });
      }
      
      onComplete();
    } catch (error) {
      console.error('Error starting journey:', error);
    }
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: '#f8f9fa'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '3px solid rgba(255, 74, 35, 0.1)',
            borderTopColor: ICON_COLORS.primary,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p>Loading your personalized experience...</p>
        </div>
      </div>
    );
  }

  if (!coachProfile) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: '#f8f9fa'
      }}>
        <div style={{ textAlign: 'center' }}>
          <p>Coach profile not found. Please contact your administrator.</p>
        </div>
      </div>
    );
  }

  const welcomeSteps = [
    {
      title: 'Welcome to IvyLevel',
      content: (
        <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '24px' }}>
            Welcome, {coachProfile.name}!
          </h1>
          
          <p style={{ fontSize: '1.25rem', marginBottom: '32px', color: '#6b7280' }}>
            Based on your conversation with our team, we've created a personalized training path 
            designed specifically for your background and goals.
          </p>
          
          <div style={{ 
            background: '#f0f9ff', 
            padding: '24px', 
            borderRadius: '12px',
            marginBottom: '32px'
          }}>
            <p style={{ fontStyle: 'italic', fontSize: '1.125rem' }}>
              "At IvyLevel, we believe every student deserves personalized guidance to reach their 
              full potential. You're about to join a community of coaches making that vision a reality."
            </p>
          </div>
        </div>
      )
    },
    {
      title: 'Your Unique Strengths',
      content: (
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '24px', textAlign: 'center' }}>
            Your Unique Strengths
          </h2>
          
          <p style={{ fontSize: '1.125rem', marginBottom: '32px', textAlign: 'center', color: '#6b7280' }}>
            We've identified these strengths that will make you an exceptional IvyLevel coach:
          </p>
          
          <div style={{ display: 'grid', gap: '16px' }}>
            {coachProfile.strengths?.map((strength, index) => (
              <div key={index} style={{
                background: '#f0fdf4',
                padding: '20px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px'
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  background: '#22c55e',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <CheckIcon size={24} color="white" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '4px' }}>
                    {strength}
                  </h3>
                  <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                    This will be valuable in your coaching journey
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    },
    {
      title: 'Your Learning Path',
      content: (
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '24px', textAlign: 'center' }}>
            Your Personalized Learning Path
          </h2>
          
          <p style={{ fontSize: '1.125rem', marginBottom: '32px', textAlign: 'center', color: '#6b7280' }}>
            We've designed a {coachProfile.aiAnalysis?.recommendations?.estimatedTimeToCompetency || '12-day'} journey 
            tailored to your experience as a {coachProfile.background}.
          </p>
          
          <div style={{ display: 'grid', gap: '24px' }}>
            {/* Week 1 */}
            <div style={{
              background: '#fff',
              border: '2px solid #e5e7eb',
              borderRadius: '12px',
              padding: '24px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  background: ICON_COLORS.primary,
                  color: 'white',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '600'
                }}>
                  1
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '600' }}>
                  Week 1: Foundation & Focus Areas
                </h3>
              </div>
              
              <p style={{ marginBottom: '12px', color: '#6b7280' }}>
                Master the IvyLevel methodology while strengthening:
              </p>
              
              <ul style={{ paddingLeft: '20px', color: '#6b7280' }}>
                {coachProfile.gaps?.slice(0, 2).map((gap, index) => (
                  <li key={index} style={{ marginBottom: '8px' }}>{gap}</li>
                ))}
              </ul>
            </div>
            
            {/* Week 2 */}
            <div style={{
              background: '#fff',
              border: '2px solid #e5e7eb',
              borderRadius: '12px',
              padding: '24px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  background: '#6b7280',
                  color: 'white',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '600'
                }}>
                  2
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '600' }}>
                  Week 2: Practice & Certification
                </h3>
              </div>
              
              <p style={{ color: '#6b7280' }}>
                Apply your skills through practice scenarios and earn your certification 
                to start working with students.
              </p>
            </div>
          </div>
          
          {/* Mentor Assignment */}
          <div style={{
            background: '#fef3c7',
            padding: '24px',
            borderRadius: '12px',
            marginTop: '32px',
            textAlign: 'center'
          }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '8px' }}>
              Your Mentor: {coachProfile.aiAnalysis?.recommendations?.mentorMatch || 'Jenny Chen'}
            </h3>
            <p style={{ color: '#6b7280' }}>
              Based on your teaching style and background, we've matched you with an experienced 
              mentor who will guide your journey.
            </p>
          </div>
        </div>
      )
    },
    {
      title: 'Today\'s Focus',
      content: (
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '24px', textAlign: 'center' }}>
            Let's Start with Your First Videos
          </h2>
          
          <p style={{ fontSize: '1.125rem', marginBottom: '32px', textAlign: 'center', color: '#6b7280' }}>
            We recommend starting with these foundational videos today:
          </p>
          
          <div style={{ display: 'grid', gap: '16px' }}>
            {coachProfile.aiAnalysis?.recommendations?.firstWeekVideos?.slice(0, 2).map((video, index) => (
              <div key={index} style={{
                background: '#fff',
                border: '2px solid #e5e7eb',
                borderRadius: '12px',
                padding: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px'
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  background: ICON_COLORS.primary,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <PlayIcon size={24} color="white" />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '4px' }}>
                    {video.title}
                  </h3>
                  <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                    {index === 0 ? 'Understand our core methodology' : 'See real coaching in action'}
                  </p>
                </div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  20 min
                </div>
              </div>
            ))}
          </div>
          
          <div style={{
            background: '#f0f9ff',
            padding: '20px',
            borderRadius: '12px',
            marginTop: '24px',
            textAlign: 'center'
          }}>
            <p style={{ fontSize: '1rem', marginBottom: '8px' }}>
              <strong>Pro tip:</strong> Take notes on key concepts you notice.
            </p>
            <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              You'll have a chance to practice these techniques later today.
            </p>
          </div>
        </div>
      )
    }
  ];

  return (
    <div style={{ 
      minHeight: '100vh',
      background: '#f8f9fa',
      padding: '40px 20px'
    }}>
      {/* Progress Bar */}
      <div style={{
        maxWidth: '800px',
        margin: '0 auto 40px',
        background: 'white',
        borderRadius: '12px',
        padding: '24px'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          position: 'relative',
          marginBottom: '24px'
        }}>
          {welcomeSteps.map((step, index) => (
            <div key={index} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              flex: 1,
              position: 'relative'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: currentStep >= index ? ICON_COLORS.primary : '#e5e7eb',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '600',
                position: 'relative',
                zIndex: 2
              }}>
                {currentStep > index ? <CheckIcon size={20} color="white" /> : index + 1}
              </div>
              
              <span style={{
                fontSize: '0.875rem',
                marginTop: '8px',
                color: currentStep >= index ? ICON_COLORS.primary : '#6b7280',
                fontWeight: currentStep === index ? '600' : '400'
              }}>
                {step.title}
              </span>
              
              {index < welcomeSteps.length - 1 && (
                <div style={{
                  position: 'absolute',
                  top: '20px',
                  left: '50%',
                  width: '100%',
                  height: '2px',
                  background: currentStep > index ? ICON_COLORS.primary : '#e5e7eb',
                  zIndex: 1
                }} />
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Content */}
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        background: 'white',
        borderRadius: '12px',
        padding: '48px',
        minHeight: '400px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {welcomeSteps[currentStep].content}
        
        {/* Navigation */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          marginTop: 'auto',
          paddingTop: '48px'
        }}>
          {currentStep > 0 && (
            <button
              onClick={() => setCurrentStep(currentStep - 1)}
              style={{
                padding: '12px 24px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                background: 'white',
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              Back
            </button>
          )}
          
          <div style={{ marginLeft: 'auto' }}>
            {currentStep < welcomeSteps.length - 1 ? (
              <button
                onClick={() => setCurrentStep(currentStep + 1)}
                style={{
                  padding: '12px 24px',
                  background: ICON_COLORS.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                Continue
                <ArrowRightIcon size={20} color="white" />
              </button>
            ) : (
              <button
                onClick={startJourney}
                style={{
                  padding: '12px 32px',
                  background: ICON_COLORS.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                Begin My Journey
                <TrophyIcon size={20} color="white" />
              </button>
            )}
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default CoachWelcome;