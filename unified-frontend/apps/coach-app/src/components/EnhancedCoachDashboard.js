// EnhancedCoachDashboard.js - Coach dashboard with personalized resource access
import React, { useState, useEffect } from 'react';
import { BookOpen, Video, FileText, Clock, Calendar, Users, Award, ChevronRight, Play, Download, ExternalLink, Star, Filter, Search, Target, TrendingUp, CheckCircle, BarChart3 } from 'lucide-react';
import ModernKnowledgeBase from './ModernKnowledgeBase';

const EnhancedCoachDashboard = ({ user, onLogout, onStartTraining }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [resources, setResources] = useState([]);
  const [students, setStudents] = useState([]);
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data initialization
  useEffect(() => {
    // Mock shared resources
    setResources([
      {
        id: 1,
        title: 'Marissa & Iqra - BioMed Training Session',
        type: 'video',
        duration: '90 min',
        relevance: 95,
        tags: ['biomed', 'sophomore', 'first-session'],
        description: 'Complete walkthrough of first 168-hour session with biomedical aspirant',
        url: '#',
        thumbnail: '🎥',
        addedDate: '2024-11-18',
        priority: 'high'
      },
      {
        id: 2,
        title: "Hiba's Game Plan Report",
        type: 'document',
        relevance: 90,
        tags: ['game-plan', 'cs-business', 'sophomore'],
        description: 'Comprehensive assessment and strategic plan for CS/Business dual interest',
        url: '#',
        thumbnail: '📄',
        addedDate: '2024-11-17',
        priority: 'high'
      },
      {
        id: 3,
        title: 'Weekly Execution Template',
        type: 'template',
        relevance: 85,
        tags: ['planning', 'execution', 'all-students'],
        description: 'Standardized template for tracking weekly progress and action items',
        url: '#',
        thumbnail: '📋',
        addedDate: '2024-11-15',
        priority: 'medium'
      },
      {
        id: 4,
        title: 'Similar Student Success Story - Aisha',
        type: 'case-study',
        relevance: 80,
        tags: ['success-story', 'biomed', 'average-profile'],
        description: 'How Aisha improved from 3.2 to 3.8 GPA and secured research opportunity',
        url: '#',
        thumbnail: '🌟',
        addedDate: '2024-11-16',
        priority: 'medium'
      }
    ]);

    // Mock assigned students
    setStudents([
      {
        id: 1,
        name: 'Beya Johnson',
        grade: 'Junior',
        gpa: '3.5',
        interests: 'Pre-Med/Biology',
        nextSession: '2024-11-25 4:00 PM',
        progress: 25,
        weakSpots: ['Time Management', 'Research Experience'],
        quickWins: ['Biology Olympiad Registration', 'Hospital Volunteering']
      },
      {
        id: 2,
        name: 'Hiba Martinez',
        grade: 'Sophomore',
        gpa: '3.2',
        interests: 'CS/Business',
        nextSession: '2024-11-26 5:00 PM',
        progress: 15,
        weakSpots: ['Math Grades', 'Coding Skills'],
        quickWins: ['Join CS Club', 'Start Coding Project']
      }
    ]);

    // Mock upcoming sessions
    setUpcomingSessions([
      {
        id: 1,
        student: 'Beya Johnson',
        date: '2024-11-25',
        time: '4:00 PM',
        type: 'Regular Session',
        agenda: 'Review college list and research opportunities'
      },
      {
        id: 2,
        student: 'Hiba Martinez',
        date: '2024-11-26',
        time: '5:00 PM',
        type: 'First Session',
        agenda: '168-hour comprehensive planning session'
      }
    ]);

    // Mock recent activity
    setRecentActivity([
      { id: 1, action: 'New resource shared', detail: '4 training videos added to your hub', time: '2 hours ago' },
      { id: 2, action: 'Student assigned', detail: 'Hiba Martinez added to your roster', time: '1 day ago' },
      { id: 3, action: 'Training reminder', detail: 'Complete Module 4 within 24 hours', time: '2 days ago' }
    ]);
  }, []);

  // Filter resources
  const filteredResources = resources.filter(resource => {
    const matchesFilter = filter === 'all' || resource.type === filter;
    const matchesSearch = resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         resource.tags.some(tag => tag.includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  }).sort((a, b) => b.relevance - a.relevance);

  // Get resource icon
  const getResourceIcon = (type) => {
    switch(type) {
      case 'video': return <Video className="w-5 h-5 text-blue-500" />;
      case 'document': return <FileText className="w-5 h-5 text-green-500" />;
      case 'template': return <BookOpen className="w-5 h-5 text-purple-500" />;
      case 'case-study': return <Star className="w-5 h-5 text-yellow-500" />;
      default: return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', padding: '20px 30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '5px' }}>
              Welcome back, {user.name}!
            </h1>
            <p style={{ color: '#6b7280', fontSize: '14px' }}>
              You have {students.length} active students and {upcomingSessions.length} upcoming sessions
            </p>
          </div>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <button
              onClick={onStartTraining}
              style={{
                padding: '10px 20px',
                backgroundColor: '#FF4A23',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Play className="w-4 h-4" />
              Continue Training
            </button>
            <button
              onClick={onLogout}
              style={{
                padding: '10px 20px',
                backgroundColor: '#f3f4f6',
                color: '#374151',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Logout
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '30px', marginTop: '20px' }}>
          {['overview', 'resources', 'students', 'analytics', 'schedule'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '10px 0',
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab ? '2px solid #FF4A23' : '2px solid transparent',
                color: activeTab === tab ? '#FF4A23' : '#6b7280',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: activeTab === tab ? '600' : '400',
                textTransform: 'capitalize'
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '30px' }}>
        {activeTab === 'overview' && (
          <div>
            {/* Quick Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
              <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '5px' }}>Training Progress</p>
                    <p style={{ fontSize: '24px', fontWeight: 'bold' }}>60%</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-500" />
                </div>
                <div style={{ marginTop: '10px', backgroundColor: '#e5e7eb', height: '6px', borderRadius: '3px' }}>
                  <div style={{ width: '60%', height: '100%', backgroundColor: '#FF4A23', borderRadius: '3px' }} />
                </div>
              </div>

              <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '5px' }}>Resources Available</p>
                    <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{resources.length}</p>
                  </div>
                  <BookOpen className="w-8 h-8 text-blue-500" />
                </div>
              </div>

              <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '5px' }}>Next Session</p>
                    <p style={{ fontSize: '18px', fontWeight: 'bold' }}>Tomorrow</p>
                  </div>
                  <Calendar className="w-8 h-8 text-purple-500" />
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '15px' }}>Recent Activity</h2>
              <div style={{ display: 'grid', gap: '15px' }}>
                {recentActivity.map(activity => (
                  <div key={activity.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: '500' }}>{activity.action}</p>
                      <p style={{ fontSize: '13px', color: '#6b7280' }}>{activity.detail}</p>
                    </div>
                    <span style={{ fontSize: '12px', color: '#9ca3af' }}>{activity.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'resources' && (
          <div style={{ marginTop: '-30px', marginLeft: '-30px', marginRight: '-30px' }}>
            <ModernKnowledgeBase />
          </div>
        )}

        {activeTab === 'students' && (
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>
              Your Students
            </h2>
            <div style={{ display: 'grid', gap: '20px' }}>
              {students.map(student => (
                <div
                  key={student.id}
                  style={{
                    backgroundColor: 'white',
                    padding: '25px',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '20px' }}>
                    <div>
                      <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '5px' }}>{student.name}</h3>
                      <p style={{ color: '#6b7280' }}>
                        {student.grade} • GPA: {student.gpa} • {student.interests}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '5px' }}>Next Session</p>
                      <p style={{ fontSize: '16px', fontWeight: '600' }}>{student.nextSession}</p>
                    </div>
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <p style={{ fontSize: '14px', fontWeight: '500', marginBottom: '10px' }}>Progress</p>
                    <div style={{ backgroundColor: '#e5e7eb', height: '8px', borderRadius: '4px' }}>
                      <div 
                        style={{ 
                          width: `${student.progress}%`, 
                          height: '100%', 
                          backgroundColor: '#FF4A23', 
                          borderRadius: '4px',
                          transition: 'width 0.3s'
                        }} 
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                      <h4 style={{ fontSize: '14px', fontWeight: '500', marginBottom: '10px', color: '#DC2626' }}>
                        Weak Spots
                      </h4>
                      <ul style={{ listStyle: 'none', padding: 0 }}>
                        {student.weakSpots.map((spot, idx) => (
                          <li key={idx} style={{ fontSize: '14px', color: '#6b7280', marginBottom: '5px' }}>
                            • {spot}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 style={{ fontSize: '14px', fontWeight: '500', marginBottom: '10px', color: '#059669' }}>
                        Quick Wins
                      </h4>
                      <ul style={{ listStyle: 'none', padding: 0 }}>
                        {student.quickWins.map((win, idx) => (
                          <li key={idx} style={{ fontSize: '14px', color: '#6b7280', marginBottom: '5px' }}>
                            • {win}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                    <button
                      style={{
                        padding: '10px 20px',
                        backgroundColor: '#FF4A23',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      View Game Plan
                    </button>
                    <button
                      style={{
                        padding: '10px 20px',
                        backgroundColor: '#f3f4f6',
                        color: '#374151',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      Execution Doc
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'schedule' && (
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>
              Upcoming Sessions
            </h2>
            <div style={{ display: 'grid', gap: '15px' }}>
              {upcomingSessions.map(session => (
                <div
                  key={session.id}
                  style={{
                    backgroundColor: 'white',
                    padding: '20px',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '5px' }}>
                      {session.student}
                    </h3>
                    <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '5px' }}>
                      {session.type} • {session.date} at {session.time}
                    </p>
                    <p style={{ fontSize: '14px' }}>
                      <strong>Agenda:</strong> {session.agenda}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#FF4A23',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      Prepare
                    </button>
                    <button
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#f3f4f6',
                        color: '#374151',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      Reschedule
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>
              Performance Analytics
            </h2>
            
            {/* Key Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
              <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <p style={{ color: '#6b7280', fontSize: '14px' }}>Total Sessions</p>
                  <BarChart3 style={{ width: '20px', height: '20px', color: '#FF4A23' }} />
                </div>
                <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#111827' }}>316</p>
                <p style={{ fontSize: '14px', color: '#10b981' }}>+12% from last month</p>
              </div>

              <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <p style={{ color: '#6b7280', fontSize: '14px' }}>Student Success Rate</p>
                  <TrendingUp style={{ width: '20px', height: '20px', color: '#10b981' }} />
                </div>
                <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#111827' }}>94%</p>
                <p style={{ fontSize: '14px', color: '#10b981' }}>Above target</p>
              </div>

              <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <p style={{ color: '#6b7280', fontSize: '14px' }}>Active Students</p>
                  <Users style={{ width: '20px', height: '20px', color: '#6366f1' }} />
                </div>
                <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#111827' }}>{students.length}</p>
                <p style={{ fontSize: '14px', color: '#6b7280' }}>Currently enrolled</p>
              </div>

              <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <p style={{ color: '#6b7280', fontSize: '14px' }}>Avg. Session Rating</p>
                  <Star style={{ width: '20px', height: '20px', color: '#f59e0b' }} />
                </div>
                <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#111827' }}>4.8</p>
                <p style={{ fontSize: '14px', color: '#6b7280' }}>Out of 5.0</p>
              </div>
            </div>

            {/* Student Progress Overview */}
            <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '8px', border: '1px solid #e5e7eb', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>Student Progress Overview</h3>
              <div style={{ display: 'grid', gap: '15px' }}>
                {students.map(student => (
                  <div key={student.id} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '15px',
                    padding: '15px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '6px'
                  }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: '500', marginBottom: '5px' }}>{student.name}</p>
                      <p style={{ fontSize: '13px', color: '#6b7280' }}>{student.gradeProfile}</p>
                    </div>
                    <div style={{ width: '200px' }}>
                      <div style={{ backgroundColor: '#e5e7eb', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ 
                          width: `${student.ivyReadyScore}%`, 
                          height: '100%', 
                          backgroundColor: student.ivyReadyScore >= 80 ? '#10b981' : student.ivyReadyScore >= 60 ? '#f59e0b' : '#ef4444',
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                    </div>
                    <p style={{ fontSize: '14px', fontWeight: '600', width: '50px', textAlign: 'right' }}>
                      {student.ivyReadyScore}%
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Insights */}
            <div style={{ backgroundColor: '#FFF7ED', padding: '20px', borderRadius: '8px', border: '1px solid #FED7AA' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <div style={{ 
                  width: '32px', 
                  height: '32px', 
                  backgroundColor: '#FF4A23', 
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <TrendingUp style={{ width: '18px', height: '18px', color: 'white' }} />
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: '600' }}>AI-Powered Insights</h3>
              </div>
              <p style={{ fontSize: '14px', color: '#92400E' }}>
                Your students show strong engagement patterns. Consider focusing on SAT/ACT prep 
                for 3 students approaching test dates. The AI recommends increasing session frequency 
                for students with Ivy Ready Scores below 70%.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedCoachDashboard;