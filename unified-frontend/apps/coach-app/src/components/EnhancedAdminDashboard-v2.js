// EnhancedAdminDashboard-v2.js - Updated admin dashboard with onboarding hub
import React, { useState, useEffect } from 'react';
import { 
  Users, BookOpen, Award, Share2, Clock, TrendingUp, FileText, Video, 
  Search, Bell, Settings, ChevronRight, ChevronLeft, Eye, Download, Send,
  Target, Calendar, CheckCircle
} from 'lucide-react';
import ResourceManagement from './ResourceManagement';
import CoachOnboardingHub from './CoachOnboardingHub-v2';

const EnhancedAdminDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [coaches, setCoaches] = useState([]);
  const [students, setStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [showOnboardingHub, setShowOnboardingHub] = useState(false);
  const [onboardingCoach, setOnboardingCoach] = useState(null);
  const [onboardingStudent, setOnboardingStudent] = useState(null);
  const [stats, setStats] = useState({
    totalCoaches: 0,
    activeTraining: 0,
    certified: 0,
    resourcesShared: 0,
    avgCompletionTime: 0,
    successRate: 0
  });

  // Mock coach data with enhanced fields
  const mockCoaches = [
    {
      id: 'coach1',
      name: 'Noor Patel',
      email: 'noor@ivylevel.com',
      status: 'Active',
      progress: 60,
      startDate: '2024-11-15',
      completedModules: 3,
      totalModules: 5,
      assignedStudents: [
        { name: 'Beya', grade: 'junior', interests: 'biomed' },
        { name: 'Hiba', grade: 'sophomore', interests: 'cs-business' }
      ],
      sharedResources: [],
      lastActivity: '2024-11-20'
    },
    {
      id: 'coach2',
      name: 'Kelvin Chen',
      email: 'kelvin@ivylevel.com',
      status: 'Training',
      progress: 100,
      startDate: '2024-11-10',
      completedModules: 5,
      totalModules: 5,
      assignedStudents: [
        { name: 'Abhi', grade: 'senior', interests: 'cs-business', profile: 'high-achieving' }
      ],
      sharedResources: [],
      lastActivity: '2024-11-19',
      certified: true
    },
    {
      id: 'coach3',
      name: 'Jamie Williams',
      email: 'jamie@ivylevel.com',
      status: 'Training',
      progress: 40,
      startDate: '2024-11-18',
      completedModules: 2,
      totalModules: 5,
      assignedStudents: [
        { name: 'Zainab', grade: 'sophomore', interests: 'biomed', profile: 'average' }
      ],
      sharedResources: [],
      lastActivity: '2024-11-21'
    }
  ];

  // Extract unique students from coaches' assignments
  useEffect(() => {
    setCoaches(mockCoaches);
    
    // Extract students
    const allStudents = mockCoaches.flatMap(coach => 
      coach.assignedStudents.map(student => ({
        id: `${coach.id}-${student.name}`,
        name: student.name,
        grade: student.grade,
        interests: student.interests,
        coach: coach.name
      }))
    );
    setStudents(allStudents);
    
    // Calculate stats
    const activeCount = mockCoaches.filter(c => c.status === 'Training').length;
    const certifiedCount = mockCoaches.filter(c => c.certified).length;
    const totalShared = mockCoaches.reduce((sum, c) => sum + c.sharedResources.length, 0);
    
    setStats({
      totalCoaches: mockCoaches.length,
      activeTraining: activeCount,
      certified: certifiedCount,
      resourcesShared: totalShared,
      avgCompletionTime: 4.2,
      successRate: 85
    });

    // Mock notifications
    setNotifications([
      { id: 1, type: 'success', message: 'Kelvin Chen completed all training modules', time: '2 hours ago' },
      { id: 2, type: 'warning', message: 'Jamie Williams approaching 48-hour deadline', time: '5 hours ago' },
      { id: 3, type: 'info', message: 'New resource bundle created for BioMed students', time: '1 day ago' }
    ]);
  }, []);

  // Handle resource sharing
  const handleResourceShare = (coachId, resources) => {
    setCoaches(prevCoaches => 
      prevCoaches.map(coach => 
        coach.id === coachId 
          ? { ...coach, sharedResources: [...coach.sharedResources, ...resources] }
          : coach
      )
    );
  };

  const navItems = [
    { icon: TrendingUp, label: 'Overview', value: 'overview' },
    { icon: Users, label: 'Coaches', value: 'coaches' },
    { icon: Share2, label: 'Resources', value: 'resources' },
    { icon: BookOpen, label: 'Onboarding', value: 'onboarding' },
    { icon: Bell, label: 'Notifications', value: 'notifications' },
    { icon: Settings, label: 'Settings', value: 'settings' }
  ];

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f3f4f6' }}>
      {/* Sidebar */}
      <div style={{ 
        width: '250px', 
        backgroundColor: 'white', 
        borderRight: '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
      }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1f2937' }}>Admin Portal</h2>
          <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '5px' }}>
            Welcome, {user?.email}
          </p>
        </div>
        
        <nav style={{ flex: 1, padding: '20px' }}>
          {navItems.map(item => (
            <button
              key={item.value}
              onClick={() => setActiveTab(item.value)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                width: '100%',
                padding: '10px 15px',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: activeTab === item.value ? '#3b82f6' : 'transparent',
                color: activeTab === item.value ? 'white' : '#4b5563',
                cursor: 'pointer',
                marginBottom: '5px',
                transition: 'all 0.2s'
              }}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>
        
        <button
          onClick={onLogout}
          style={{
            position: 'absolute',
            bottom: '20px',
            left: '20px',
            right: '20px',
            padding: '10px',
            backgroundColor: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Logout
        </button>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {activeTab === 'overview' && (
          <div style={{ padding: '30px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '30px' }}>
              Dashboard Overview
            </h1>
            
            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
              <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <Users className="w-8 h-8 text-blue-500" />
                  <span style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.totalCoaches}</span>
                </div>
                <h3 style={{ fontSize: '14px', color: '#6b7280' }}>Total Coaches</h3>
              </div>
              
              <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <Clock className="w-8 h-8 text-yellow-500" />
                  <span style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.activeTraining}</span>
                </div>
                <h3 style={{ fontSize: '14px', color: '#6b7280' }}>In Training</h3>
              </div>
              
              <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <Award className="w-8 h-8 text-green-500" />
                  <span style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.certified}</span>
                </div>
                <h3 style={{ fontSize: '14px', color: '#6b7280' }}>Certified</h3>
              </div>
              
              <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <Share2 className="w-8 h-8 text-purple-500" />
                  <span style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.resourcesShared}</span>
                </div>
                <h3 style={{ fontSize: '14px', color: '#6b7280' }}>Resources Shared</h3>
              </div>
            </div>

            {/* Recent Activity */}
            <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px' }}>Recent Activity</h2>
              <div style={{ display: 'grid', gap: '15px' }}>
                {notifications.slice(0, 5).map(notif => (
                  <div key={notif.id} style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: notif.type === 'success' ? '#10b981' : notif.type === 'warning' ? '#f59e0b' : '#3b82f6'
                    }} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '14px' }}>{notif.message}</p>
                      <p style={{ fontSize: '12px', color: '#9ca3af' }}>{notif.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'coaches' && (
          <div style={{ padding: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
              <h1 style={{ fontSize: '28px', fontWeight: 'bold' }}>Manage Coaches</h1>
              <button
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Users className="w-4 h-4" />
                Add New Coach
              </button>
            </div>

            {/* Coaches Table */}
            <div style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Coach Name</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Status</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Progress</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Assigned Students</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Resources</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {coaches.map(coach => (
                    <tr key={coach.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px' }}>
                        <div>
                          <p style={{ fontWeight: '500' }}>{coach.name}</p>
                          <p style={{ fontSize: '12px', color: '#6b7280' }}>{coach.email}</p>
                        </div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: '9999px',
                          fontSize: '12px',
                          backgroundColor: coach.status === 'Active' ? '#d1fae5' : '#fef3c7',
                          color: coach.status === 'Active' ? '#065f46' : '#92400e'
                        }}>
                          {coach.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ flex: 1, height: '6px', backgroundColor: '#e5e7eb', borderRadius: '3px' }}>
                              <div
                                style={{
                                  width: `${coach.progress}%`,
                                  height: '100%',
                                  backgroundColor: coach.progress === 100 ? '#10b981' : '#3b82f6',
                                  borderRadius: '3px',
                                  transition: 'width 0.3s'
                                }}
                              />
                            </div>
                            <span style={{ fontSize: '12px', color: '#6b7280' }}>{coach.progress}%</span>
                          </div>
                          <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                            {coach.completedModules}/{coach.totalModules} modules
                          </p>
                        </div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        {coach.assignedStudents.map((student, idx) => (
                          <div key={idx} style={{ fontSize: '12px', marginBottom: '4px' }}>
                            <span style={{ fontWeight: '500' }}>{student.name}</span>
                            <span style={{ color: '#6b7280' }}> ({student.grade}, {student.interests})</span>
                          </div>
                        ))}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ fontSize: '14px' }}>{coach.sharedResources.length} shared</span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#3b82f6',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            <Send className="w-3 h-3 inline mr-1" />
                            Share Resources
                          </button>
                          <button
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#e5e7eb',
                              color: '#4b5563',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            View Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'resources' && (
          <ResourceManagement 
            coaches={coaches} 
            onResourceShare={handleResourceShare}
          />
        )}

        {activeTab === 'onboarding' && (
          <div style={{ padding: '30px' }}>
            {showOnboardingHub ? (
              <div>
                <button
                  onClick={() => setShowOnboardingHub(false)}
                  style={{
                    marginBottom: '20px',
                    color: '#3b82f6',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '14px'
                  }}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back to Onboarding Setup
                </button>
                <CoachOnboardingHub 
                  coachName={onboardingCoach} 
                  studentName={onboardingStudent} 
                />
              </div>
            ) : (
              <div>
                <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '30px' }}>
                  Coach Onboarding Setup
                </h1>
                
                <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '30px', marginBottom: '20px' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '15px' }}>
                    Create Onboarding Package
                  </h2>
                  <p style={{ color: '#6b7280', marginBottom: '25px' }}>
                    Generate a comprehensive onboarding package for a new coach-student pairing.
                    This will identify critical sessions (Game Plan, 168-Hour, Execution examples)
                    and create a checklist for the coach.
                  </p>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                        Select Coach
                      </label>
                      <select
                        value={onboardingCoach || ''}
                        onChange={(e) => setOnboardingCoach(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                      >
                        <option value="">Choose a coach...</option>
                        {coaches.map(coach => (
                          <option key={coach.id} value={coach.name}>
                            {coach.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                        Select Student
                      </label>
                      <select
                        value={onboardingStudent || ''}
                        onChange={(e) => setOnboardingStudent(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                      >
                        <option value="">Choose a student...</option>
                        {students.map(student => (
                          <option key={student.id} value={student.name}>
                            {student.name} ({student.grade}, {student.interests})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      if (onboardingCoach && onboardingStudent) {
                        setShowOnboardingHub(true);
                      }
                    }}
                    disabled={!onboardingCoach || !onboardingStudent}
                    style={{
                      padding: '12px 24px',
                      backgroundColor: onboardingCoach && onboardingStudent ? '#3b82f6' : '#9ca3af',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: onboardingCoach && onboardingStudent ? 'pointer' : 'not-allowed',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    Generate Onboarding Package
                  </button>
                </div>
                
                <div style={{ backgroundColor: '#eff6ff', borderRadius: '8px', padding: '25px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1e40af', marginBottom: '15px' }}>
                    What Gets Included?
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', fontSize: '14px', color: '#1e40af' }}>
                    <div style={{ display: 'grid', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'start', gap: '10px' }}>
                        <Target className="w-5 h-5" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div>
                          <strong>Game Plan Session:</strong> Student's goals, challenges, and strategy
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'start', gap: '10px' }}>
                        <Clock className="w-5 h-5" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div>
                          <strong>168-Hour Session:</strong> Examples of how to conduct the first critical session
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'start', gap: '10px' }}>
                        <Calendar className="w-5 h-5" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div>
                          <strong>Execution Examples:</strong> 3 recent weekly sessions to understand flow
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'start', gap: '10px' }}>
                        <CheckCircle className="w-5 h-5" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div>
                          <strong>Onboarding Checklist:</strong> Track completion of required viewings
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'notifications' && (
          <div style={{ padding: '30px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '30px' }}>
              Notifications
            </h1>
            
            <div style={{ display: 'grid', gap: '15px' }}>
              {notifications.map(notif => (
                <div 
                  key={notif.id} 
                  style={{ 
                    backgroundColor: 'white', 
                    padding: '20px', 
                    borderRadius: '8px', 
                    border: '1px solid #e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '15px'
                  }}
                >
                  <div style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: notif.type === 'success' ? '#10b981' : notif.type === 'warning' ? '#f59e0b' : '#3b82f6'
                  }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '16px', marginBottom: '5px' }}>{notif.message}</p>
                    <p style={{ fontSize: '14px', color: '#9ca3af' }}>{notif.time}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedAdminDashboard;