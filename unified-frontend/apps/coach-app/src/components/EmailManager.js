import React, { useState, useEffect } from 'react';
import emailService from '../services/emailService';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  SendIcon, ClockIcon, CheckIcon, UserIcon,
  CalendarIcon, CloseIcon, ICON_COLORS 
} from './Icons';

const EmailManager = ({ onClose }) => {
  const [coaches, setCoaches] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('welcome');
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [emailHistory, setEmailHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('compose');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [customData, setCustomData] = useState({});

  useEffect(() => {
    loadCoaches();
    loadEmailHistory();
  }, []);

  const loadCoaches = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'coaches'));
      const coachList = [];
      snapshot.forEach(doc => {
        coachList.push({ id: doc.id, ...doc.data() });
      });
      setCoaches(coachList);
    } catch (error) {
      console.error('Error loading coaches:', error);
    }
  };

  const loadEmailHistory = () => {
    // Load from email service (mock data for now)
    const history = emailService.getEmailHistory();
    setEmailHistory(history);
  };

  const templates = [
    { id: 'welcome', name: 'Welcome Email', icon: '👋' },
    { id: 'milestoneAchieved', name: 'Milestone Achievement', icon: '🏆' },
    { id: 'weeklyProgress', name: 'Weekly Progress', icon: '📊' },
    { id: 'lowEngagement', name: 'Re-engagement', icon: '💔' }
  ];

  const handleSendEmail = async () => {
    if (selectedRecipients.length === 0) {
      alert('Please select at least one recipient');
      return;
    }

    setSendingEmail(true);
    try {
      const recipientData = selectedRecipients.map(coachId => {
        const coach = coaches.find(c => c.id === coachId);
        return {
          email: coach.email,
          coachName: coach.name,
          ...customData
        };
      });

      const results = await emailService.sendBulkEmails(
        recipientData,
        selectedTemplate,
        {
          loginUrl: window.location.origin,
          dashboardUrl: window.location.origin
        }
      );

      const successCount = results.filter(r => r.success).length;
      alert(`Emails sent successfully! ${successCount} of ${results.length} delivered.`);
      
      // Clear selection
      setSelectedRecipients([]);
      loadEmailHistory();
    } catch (error) {
      console.error('Error sending emails:', error);
      alert('Failed to send emails. Please try again.');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleScheduleEmail = () => {
    const scheduleDate = prompt('Schedule for (YYYY-MM-DD HH:MM):');
    if (!scheduleDate) return;

    selectedRecipients.forEach(coachId => {
      const coach = coaches.find(c => c.id === coachId);
      emailService.scheduleEmail(
        coach.email,
        selectedTemplate,
        {
          coachName: coach.name,
          ...customData
        },
        new Date(scheduleDate)
      );
    });

    alert(`Email scheduled for ${scheduleDate}`);
  };

  const getTemplatePreview = () => {
    const template = emailService.templates[selectedTemplate];
    if (!template) return 'Select a template to preview';

    const sampleData = {
      coachName: 'John Doe',
      email: 'john.doe@example.com',
      background: 'Test Prep Instructor',
      experience: '3',
      strengths: ['SAT Prep', 'Student Motivation'],
      mentorName: 'Jane Smith',
      milestoneName: 'First Video Watched',
      points: 50,
      totalPoints: 150,
      weekStart: new Date().toLocaleDateString(),
      weekEnd: new Date().toLocaleDateString(),
      videosWatched: 5,
      practiceSessions: 2,
      totalTime: 120,
      weeklyPoints: 100,
      overallProgress: 45,
      currentModule: 'Fundamentals',
      readinessScore: 75,
      daysSinceLogin: 7,
      ...customData
    };

    return template.body(sampleData);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
      overflow: 'auto'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '1200px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 32px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <SendIcon size={24} color={ICON_COLORS.primary} />
              Email Manager
            </h2>
            <p style={{ color: '#6b7280' }}>
              Send and manage coach communications
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '8px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1.5rem'
            }}
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #e5e7eb',
          padding: '0 32px'
        }}>
          {['compose', 'history', 'templates'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '16px 24px',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab ? `2px solid ${ICON_COLORS.primary}` : 'none',
                color: activeTab === tab ? ICON_COLORS.primary : '#6b7280',
                fontWeight: activeTab === tab ? '600' : '400',
                cursor: 'pointer',
                textTransform: 'capitalize'
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '32px'
        }}>
          {activeTab === 'compose' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
              {/* Left Column - Compose */}
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '24px' }}>
                  Compose Email
                </h3>

                {/* Template Selection */}
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                    Email Template
                  </label>
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {templates.map(template => (
                      <button
                        key={template.id}
                        onClick={() => setSelectedTemplate(template.id)}
                        style={{
                          padding: '12px 16px',
                          background: selectedTemplate === template.id ? '#e0f2fe' : 'white',
                          border: `1px solid ${selectedTemplate === template.id ? '#3b82f6' : '#e5e7eb'}`,
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        <span style={{ fontSize: '1.25rem' }}>{template.icon}</span>
                        <span style={{ fontWeight: selectedTemplate === template.id ? '600' : '400' }}>
                          {template.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recipients */}
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                    Recipients ({selectedRecipients.length} selected)
                  </label>
                  <div style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '12px',
                    maxHeight: '200px',
                    overflow: 'auto'
                  }}>
                    {coaches.map(coach => (
                      <label
                        key={coach.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px',
                          cursor: 'pointer',
                          borderRadius: '4px',
                          background: selectedRecipients.includes(coach.id) ? '#f3f4f6' : 'transparent'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedRecipients.includes(coach.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRecipients([...selectedRecipients, coach.id]);
                            } else {
                              setSelectedRecipients(selectedRecipients.filter(id => id !== coach.id));
                            }
                          }}
                        />
                        <UserIcon size={16} color="#6b7280" />
                        <span>{coach.name}</span>
                        <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                          ({coach.email})
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={handleSendEmail}
                    disabled={sendingEmail || selectedRecipients.length === 0}
                    style={{
                      padding: '12px 24px',
                      background: sendingEmail || selectedRecipients.length === 0 ? '#e5e7eb' : ICON_COLORS.primary,
                      color: sendingEmail || selectedRecipients.length === 0 ? '#9ca3af' : 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: sendingEmail || selectedRecipients.length === 0 ? 'not-allowed' : 'pointer',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <SendIcon size={20} color={sendingEmail || selectedRecipients.length === 0 ? '#9ca3af' : 'white'} />
                    {sendingEmail ? 'Sending...' : 'Send Now'}
                  </button>
                  
                  <button
                    onClick={handleScheduleEmail}
                    disabled={selectedRecipients.length === 0}
                    style={{
                      padding: '12px 24px',
                      background: 'white',
                      color: '#3b82f6',
                      border: '1px solid #3b82f6',
                      borderRadius: '8px',
                      cursor: selectedRecipients.length === 0 ? 'not-allowed' : 'pointer',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <ClockIcon size={20} color="#3b82f6" />
                    Schedule
                  </button>
                </div>
              </div>

              {/* Right Column - Preview */}
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '24px' }}>
                  Email Preview
                </h3>
                <div style={{
                  background: '#f9fafb',
                  padding: '24px',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  maxHeight: '500px',
                  overflow: 'auto'
                }}>
                  {getTemplatePreview()}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '24px' }}>
                Email History
              </h3>
              
              {emailHistory.length > 0 ? (
                <div style={{
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  overflow: 'hidden'
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f9fafb' }}>
                        <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>To</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Subject</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Sent</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {emailHistory.map((email, idx) => (
                        <tr key={idx} style={{ borderTop: '1px solid #e5e7eb' }}>
                          <td style={{ padding: '12px' }}>{email.to}</td>
                          <td style={{ padding: '12px' }}>{email.subject}</td>
                          <td style={{ padding: '12px' }}>
                            {new Date(email.timestamp).toLocaleString()}
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span style={{
                              padding: '4px 8px',
                              background: email.status === 'sent' ? '#d1fae5' : '#fed7aa',
                              color: email.status === 'sent' ? '#065f46' : '#92400e',
                              borderRadius: '4px',
                              fontSize: '0.875rem'
                            }}>
                              {email.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ color: '#6b7280', textAlign: 'center', padding: '48px' }}>
                  No emails sent yet. Check the browser console for email logs.
                </p>
              )}
            </div>
          )}

          {activeTab === 'templates' && (
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '24px' }}>
                Email Templates
              </h3>
              
              <div style={{ display: 'grid', gap: '24px' }}>
                {Object.entries(emailService.templates).map(([key, template]) => (
                  <div key={key} style={{
                    background: 'white',
                    padding: '24px',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb'
                  }}>
                    <h4 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '8px' }}>
                      {template.subject}
                    </h4>
                    <p style={{ color: '#6b7280', marginBottom: '16px' }}>
                      Template ID: <code style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px' }}>{key}</code>
                    </p>
                    <details>
                      <summary style={{ cursor: 'pointer', color: '#3b82f6', marginBottom: '8px' }}>
                        View template
                      </summary>
                      <pre style={{
                        background: '#f9fafb',
                        padding: '16px',
                        borderRadius: '8px',
                        fontSize: '0.75rem',
                        overflow: 'auto',
                        whiteSpace: 'pre-wrap'
                      }}>
                        {template.body.toString()}
                      </pre>
                    </details>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailManager;