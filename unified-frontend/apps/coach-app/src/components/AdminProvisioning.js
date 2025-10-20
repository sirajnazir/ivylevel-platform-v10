import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '../firebase';
import emailService from '../services/emailService';
import { 
  UserIcon, DocumentIcon, ComputerIcon, CheckIcon, 
  ArrowRightIcon, CloseIcon, ICON_COLORS 
} from './Icons';

const AdminProvisioning = ({ onClose }) => {
  const [step, setStep] = useState('upload'); // upload, review, complete
  const [coachData, setCoachData] = useState({
    name: '',
    email: '',
    background: '',
    experience: '',
    strengths: [],
    gaps: [],
    learningStyle: '',
    availability: '',
    resumeUrl: '',
    linkedinUrl: '',
    interviewNotes: ''
  });
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);

  // Simulated AI analysis (would be real AI in production)
  const analyzeCoachData = async () => {
    setLoading(true);
    
    // Simulate AI processing
    setTimeout(() => {
      setAiAnalysis({
        profile: {
          summary: `${coachData.name} is an experienced ${coachData.background} with ${coachData.experience} years of experience. Strong in ${coachData.strengths.join(', ')}, needs development in ${coachData.gaps.join(', ')}.`,
          personalityTraits: ['Patient', 'Detail-oriented', 'Collaborative'],
          teachingStyle: 'Supportive and structured',
          motivations: ['Student success', 'Making a difference', 'Professional growth']
        },
        recommendations: {
          track: 'counselor_to_elite',
          focusAreas: coachData.gaps,
          estimatedTimeToCompetency: '12 days',
          mentorMatch: 'Jenny Chen',
          firstWeekVideos: [
            { id: 'GP001', title: 'IvyLevel Method Overview' },
            { id: 'SAT001', title: 'SAT Strategy Fundamentals' },
            { id: 'ES001', title: 'Essay Excellence Introduction' }
          ]
        },
        riskFactors: {
          attritionRisk: 'Low',
          strengthAlignment: 'High',
          developmentNeeds: 'Moderate'
        }
      });
      setLoading(false);
      setStep('review');
    }, 2000);
  };

  const provisionCoach = async () => {
    setLoading(true);
    
    try {
      // Generate temporary password
      const tempPassword = `IvyLevel${Math.random().toString(36).substring(2, 10)}!`;
      
      // Create auth user first
      let authUser;
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, coachData.email, tempPassword);
        authUser = userCredential.user;
      } catch (authError) {
        if (authError.code === 'auth/email-already-in-use') {
          // User already exists, just continue with provisioning
          console.log('User already exists in Auth, continuing with provisioning...');
        } else {
          throw authError;
        }
      }
      
      // Create coach profile in Firestore
      const coachProfile = {
        ...coachData,
        role: 'coach',
        status: 'provisioned',
        createdAt: serverTimestamp(),
        provisionedAt: serverTimestamp(),
        aiAnalysis: aiAnalysis,
        learningPath: {
          track: aiAnalysis.recommendations.track,
          currentModule: 0,
          completedVideos: [],
          startDate: new Date().toISOString()
        }
      };

      // Save to coaches collection
      const coachDocRef = await addDoc(collection(db, 'coaches'), coachProfile);
      
      // Create/update user document
      const userId = authUser?.uid || coachData.email.replace(/[^a-zA-Z0-9]/g, '_');
      await addDoc(collection(db, 'users'), {
        uid: userId,
        email: coachData.email,
        name: coachData.name,
        role: 'coach',
        status: 'provisioned',
        coachId: coachDocRef.id,
        onboardingStarted: false,
        createdAt: serverTimestamp()
      });
      
      // Send welcome email with credentials
      await emailService.triggerWelcomeEmail({
        coachName: coachData.name,
        email: coachData.email,
        background: coachData.background,
        experience: coachData.experience,
        strengths: coachData.strengths,
        mentorName: aiAnalysis.recommendations?.mentorMatch,
        tempPassword: authUser ? tempPassword : 'Please use password reset',
        loginUrl: window.location.origin
      });
      
      // Send notification to admin
      await emailService.triggerProvisioningAlert('admin@ivylevel.com', {
        coachName: coachData.name,
        email: coachData.email,
        adminName: 'Admin', // In production, get from auth context
        readinessScore: 0, // Initial score
        status: 'provisioned',
        recommendations: aiAnalysis.recommendations?.focusAreas
      });
      
      setStep('complete');
    } catch (error) {
      console.error('Error provisioning coach:', error);
      alert('Error provisioning coach. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderUploadStep = () => (
    <div style={{ padding: '40px' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '32px' }}>
        New Coach Provisioning
      </h2>

      <div style={{ display: 'grid', gap: '24px' }}>
        {/* Basic Information */}
        <div style={{ 
          background: '#f8f9fa', 
          padding: '24px', 
          borderRadius: '12px',
          border: '1px solid #e9ecef'
        }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserIcon size={20} color={ICON_COLORS.primary} />
            Basic Information
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <input
              type="text"
              placeholder="Full Name"
              value={coachData.name}
              onChange={(e) => setCoachData({ ...coachData, name: e.target.value })}
              style={{
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '1rem'
              }}
            />
            
            <input
              type="email"
              placeholder="Email Address"
              value={coachData.email}
              onChange={(e) => setCoachData({ ...coachData, email: e.target.value })}
              style={{
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '1rem'
              }}
            />
            
            <select
              value={coachData.background}
              onChange={(e) => setCoachData({ ...coachData, background: e.target.value })}
              style={{
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '1rem'
              }}
            >
              <option value="">Select Background</option>
              <option value="High School Counselor">High School Counselor</option>
              <option value="Teacher">Teacher</option>
              <option value="College Admissions">College Admissions</option>
              <option value="Test Prep">Test Prep</option>
              <option value="Other">Other</option>
            </select>
            
            <input
              type="text"
              placeholder="Years of Experience"
              value={coachData.experience}
              onChange={(e) => setCoachData({ ...coachData, experience: e.target.value })}
              style={{
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '1rem'
              }}
            />
          </div>
        </div>

        {/* Skills Assessment */}
        <div style={{ 
          background: '#f8f9fa', 
          padding: '24px', 
          borderRadius: '12px',
          border: '1px solid #e9ecef'
        }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '16px' }}>
            Skills Assessment
          </h3>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Strengths (check all that apply):
            </label>
            {['Student Rapport', 'Essay Coaching', 'SAT/ACT Prep', 'Organization', 'Parent Communication'].map(skill => (
              <label key={skill} style={{ display: 'block', marginBottom: '8px' }}>
                <input
                  type="checkbox"
                  checked={coachData.strengths.includes(skill)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setCoachData({ ...coachData, strengths: [...coachData.strengths, skill] });
                    } else {
                      setCoachData({ ...coachData, strengths: coachData.strengths.filter(s => s !== skill) });
                    }
                  }}
                  style={{ marginRight: '8px' }}
                />
                {skill}
              </label>
            ))}
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Development Areas (check all that apply):
            </label>
            {['SAT Strategy', 'Elite College Process', 'Essay Techniques', 'Athletic Recruitment', 'Financial Aid'].map(gap => (
              <label key={gap} style={{ display: 'block', marginBottom: '8px' }}>
                <input
                  type="checkbox"
                  checked={coachData.gaps.includes(gap)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setCoachData({ ...coachData, gaps: [...coachData.gaps, gap] });
                    } else {
                      setCoachData({ ...coachData, gaps: coachData.gaps.filter(g => g !== gap) });
                    }
                  }}
                  style={{ marginRight: '8px' }}
                />
                {gap}
              </label>
            ))}
          </div>
        </div>

        {/* Documents & Links */}
        <div style={{ 
          background: '#f8f9fa', 
          padding: '24px', 
          borderRadius: '12px',
          border: '1px solid #e9ecef'
        }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <DocumentIcon size={20} color={ICON_COLORS.primary} />
            Documents & Links
          </h3>
          
          <div style={{ display: 'grid', gap: '16px' }}>
            <input
              type="url"
              placeholder="Resume URL (Google Drive, Dropbox, etc.)"
              value={coachData.resumeUrl}
              onChange={(e) => setCoachData({ ...coachData, resumeUrl: e.target.value })}
              style={{
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '1rem'
              }}
            />
            
            <input
              type="url"
              placeholder="LinkedIn Profile URL"
              value={coachData.linkedinUrl}
              onChange={(e) => setCoachData({ ...coachData, linkedinUrl: e.target.value })}
              style={{
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '1rem'
              }}
            />
          </div>
        </div>

        {/* Interview Notes */}
        <div style={{ 
          background: '#f8f9fa', 
          padding: '24px', 
          borderRadius: '12px',
          border: '1px solid #e9ecef'
        }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '16px' }}>
            Interview Notes
          </h3>
          
          <textarea
            placeholder="Paste interview transcript or key notes here..."
            value={coachData.interviewNotes}
            onChange={(e) => setCoachData({ ...coachData, interviewNotes: e.target.value })}
            style={{
              width: '100%',
              minHeight: '120px',
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              fontSize: '1rem',
              resize: 'vertical'
            }}
          />
        </div>

        {/* Additional Info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <select
            value={coachData.learningStyle}
            onChange={(e) => setCoachData({ ...coachData, learningStyle: e.target.value })}
            style={{
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              fontSize: '1rem'
            }}
          >
            <option value="">Learning Style</option>
            <option value="Visual">Visual Learner</option>
            <option value="Hands-on">Hands-on Practice</option>
            <option value="Reading">Reading/Research</option>
            <option value="Discussion">Discussion-based</option>
          </select>
          
          <select
            value={coachData.availability}
            onChange={(e) => setCoachData({ ...coachData, availability: e.target.value })}
            style={{
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              fontSize: '1rem'
            }}
          >
            <option value="">Availability</option>
            <option value="Full-time">Full-time</option>
            <option value="Part-time">Part-time (20+ hrs)</option>
            <option value="Limited">Limited (10-20 hrs)</option>
            <option value="Flexible">Flexible</option>
          </select>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button
            onClick={onClose}
            style={{
              padding: '12px 24px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              background: 'white',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            Cancel
          </button>
          
          <button
            onClick={analyzeCoachData}
            disabled={!coachData.name || !coachData.email || loading}
            style={{
              padding: '12px 24px',
              background: loading || !coachData.name || !coachData.email ? '#ccc' : ICON_COLORS.primary,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: loading || !coachData.name || !coachData.email ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <ComputerIcon size={20} color="white" />
            {loading ? 'Analyzing...' : 'Analyze with AI'}
          </button>
        </div>
      </div>
    </div>
  );

  const renderReviewStep = () => (
    <div style={{ padding: '40px' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '32px' }}>
        AI Analysis & Recommendations
      </h2>

      {aiAnalysis && (
        <div style={{ display: 'grid', gap: '24px' }}>
          {/* Profile Summary */}
          <div style={{ 
            background: '#f0f9ff', 
            padding: '24px', 
            borderRadius: '12px',
            border: '1px solid #bae6fd'
          }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '16px' }}>
              Profile Summary
            </h3>
            <p style={{ marginBottom: '12px' }}>{aiAnalysis.profile.summary}</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
              <div>
                <strong>Personality Traits:</strong>
                <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                  {aiAnalysis.profile.personalityTraits.map(trait => (
                    <li key={trait}>{trait}</li>
                  ))}
                </ul>
              </div>
              
              <div>
                <strong>Teaching Style:</strong>
                <p style={{ margin: '8px 0' }}>{aiAnalysis.profile.teachingStyle}</p>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div style={{ 
            background: '#f0fdf4', 
            padding: '24px', 
            borderRadius: '12px',
            border: '1px solid #86efac'
          }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '16px' }}>
              Training Recommendations
            </h3>
            
            <div style={{ display: 'grid', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>Recommended Track:</strong>
                <span>{aiAnalysis.recommendations.track}</span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>Time to Competency:</strong>
                <span>{aiAnalysis.recommendations.estimatedTimeToCompetency}</span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>Mentor Match:</strong>
                <span>{aiAnalysis.recommendations.mentorMatch}</span>
              </div>
              
              <div>
                <strong>Focus Areas:</strong>
                <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                  {aiAnalysis.recommendations.focusAreas.map(area => (
                    <li key={area}>{area}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* First Week Videos */}
          <div style={{ 
            background: '#fef3c7', 
            padding: '24px', 
            borderRadius: '12px',
            border: '1px solid #fde68a'
          }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '16px' }}>
              First Week Curriculum
            </h3>
            
            <div style={{ display: 'grid', gap: '8px' }}>
              {aiAnalysis.recommendations.firstWeekVideos.map((video, index) => (
                <div key={video.id} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <span style={{ 
                    background: ICON_COLORS.primary, 
                    color: 'white', 
                    width: '24px', 
                    height: '24px', 
                    borderRadius: '50%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontSize: '0.875rem'
                  }}>
                    {index + 1}
                  </span>
                  <span>{video.title}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Risk Assessment */}
          <div style={{ 
            background: '#fef2f2', 
            padding: '24px', 
            borderRadius: '12px',
            border: '1px solid #fecaca'
          }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '16px' }}>
              Risk Assessment
            </h3>
            
            <div style={{ display: 'grid', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Attrition Risk:</span>
                <span style={{ 
                  color: aiAnalysis.riskFactors.attritionRisk === 'Low' ? 'green' : 'orange',
                  fontWeight: '600'
                }}>
                  {aiAnalysis.riskFactors.attritionRisk}
                </span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Strength Alignment:</span>
                <span style={{ 
                  color: aiAnalysis.riskFactors.strengthAlignment === 'High' ? 'green' : 'orange',
                  fontWeight: '600'
                }}>
                  {aiAnalysis.riskFactors.strengthAlignment}
                </span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Development Needs:</span>
                <span style={{ fontWeight: '600' }}>
                  {aiAnalysis.riskFactors.developmentNeeds}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
            <button
              onClick={() => setStep('upload')}
              style={{
                padding: '12px 24px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                background: 'white',
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              Back to Edit
            </button>
            
            <button
              onClick={provisionCoach}
              disabled={loading}
              style={{
                padding: '12px 24px',
                background: loading ? '#ccc' : ICON_COLORS.primary,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <CheckIcon size={20} color="white" />
              {loading ? 'Provisioning...' : 'Approve & Provision'}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderCompleteStep = () => (
    <div style={{ 
      padding: '40px',
      textAlign: 'center',
      maxWidth: '600px',
      margin: '0 auto'
    }}>
      <div style={{
        width: '80px',
        height: '80px',
        background: '#f0fdf4',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 24px'
      }}>
        <CheckIcon size={40} color="#22c55e" />
      </div>
      
      <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '16px' }}>
        Coach Successfully Provisioned!
      </h2>
      
      <p style={{ fontSize: '1.125rem', color: '#6b7280', marginBottom: '32px' }}>
        {coachData.name} has been added to the system and will receive their welcome email shortly.
      </p>
      
      <div style={{ 
        background: '#f8f9fa', 
        padding: '24px', 
        borderRadius: '12px',
        textAlign: 'left',
        marginBottom: '32px'
      }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '16px' }}>
          Next Steps:
        </h3>
        <ul style={{ paddingLeft: '20px' }}>
          <li style={{ marginBottom: '8px' }}>Coach will receive welcome email with login credentials</li>
          <li style={{ marginBottom: '8px' }}>Their personalized learning path is ready</li>
          <li style={{ marginBottom: '8px' }}>Mentor ({aiAnalysis?.recommendations.mentorMatch}) will be notified</li>
          <li>You can track progress in the admin dashboard</li>
        </ul>
      </div>
      
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
        <button
          onClick={onClose}
          style={{
            padding: '12px 24px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            background: 'white',
            cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          Close
        </button>
        
        <button
          onClick={() => {
            setStep('upload');
            setCoachData({
              name: '',
              email: '',
              background: '',
              experience: '',
              strengths: [],
              gaps: [],
              learningStyle: '',
              availability: '',
              resumeUrl: '',
              linkedinUrl: '',
              interviewNotes: ''
            });
            setAiAnalysis(null);
          }}
          style={{
            padding: '12px 24px',
            background: ICON_COLORS.primary,
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          Add Another Coach
        </button>
      </div>
    </div>
  );

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        maxWidth: '900px',
        width: '90%',
        maxHeight: '90vh',
        overflow: 'auto',
        position: 'relative'
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '8px'
          }}
        >
          <CloseIcon size={24} color="#6b7280" />
        </button>
        
        {step === 'upload' && renderUploadStep()}
        {step === 'review' && renderReviewStep()}
        {step === 'complete' && renderCompleteStep()}
      </div>
    </div>
  );
};

export default AdminProvisioning;