// EnhancedAdminDashboard.js - Updated admin dashboard with resource management
import React, { useState, useEffect } from 'react';
import { Users, BookOpen, Award, Share2, Clock, TrendingUp, FileText, Video, Search, Bell, Settings, ChevronRight, Eye, Download, Send } from 'lucide-react';
import ResourceManagement from './ResourceManagement';

const EnhancedAdminDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [coaches, setCoaches] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState([]);
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

  useEffect(() => {
    setCoaches(mockCoaches);
    
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
    
    // Update stats
    setStats(prev => ({
      ...prev,
      resourcesShared: prev.resourcesShared + resources.length
    }));
    
    // Add notification
    const coach = coaches.find(c => c.id === coachId);
    setNotifications(prev => [{
      id: Date.now(),
      type: 'success',
      message: `Shared ${resources.length} resources with ${coach.name}`,
      time: 'Just now'
    }, ...prev]);
  };

  // Generate onboarding email
  const generateOnboardingEmail = (coach) => {
    const emailTemplate = `
Subject: Welcome ${coach.name}, Your Mandatory Training & Checklist Items before your first session!

Hi ${coach.name},

We're excited to have you on board!

Below is your mandatory action list to get fully prepared before your first session${coach.assignedStudents.length > 1 ? 's' : ''} with ${coach.assignedStudents.map(s => s.name).join(' and ')}.

1. Mandatory Review of Student Game Plans
${coach.assignedStudents.map(student => `
${student.name} - ${student.interests.toUpperCase()} Aspirant
• Game Plan Report: [Auto-generated link based on shared resources]
• Video Session Recording: [Auto-generated link based on shared resources]
`).join('\n')}

2. Mandatory New Coach Training Videos
[Training videos will be populated based on shared resources]

3. Your First Session Execution Documents
${coach.assignedStudents.map(student => `
• ${coach.name} & ${student.name}: [Execution Doc Link]
`).join('\n')}

4. Scheduling
Update your availability: ${coach.name}'s Schedule

[Rest of standard onboarding content...]

Best,
Siraj
`;
    
    return emailTemplate;
  };

  // Filter coaches based on search
  const filteredCoaches = coaches.filter(coach => 
    coach.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    coach.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    coach.assignedStudents.some(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f9fafb' }}>
      {/* Sidebar */}
      <div style={{ width: '250px', backgroundColor: 'white', borderRight: '1px solid #e5e7eb', padding: '20px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '30px', color: '#FF4A23' }}>
          Admin Portal
        </h2>
        
        <nav>
          {[
            { id: 'overview', label: 'Overview', icon: TrendingUp },
            { id: 'coaches', label: 'Coaches', icon: Users },
            { id: 'resources', label: 'Resources', icon: BookOpen },
            { id: 'notifications', label: 'Notifications', icon: Bell },
            { id: 'settings', label: 'Settings', icon: Settings }
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                width: '100%',
                padding: '12px 16px',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                backgroundColor: activeTab === item.id ? '#FFF5F3' : 'transparent',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                color: activeTab === item.id ? '#FF4A23' : '#6b7280',
                fontSize: '14px',
                fontWeight: activeTab === item.id ? '600' : '400',
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
                  backgroundColor: '#FF4A23',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                + Add New Coach
              </button>
            </div>

            {/* Search Bar */}
            <div style={{ position: 'relative', marginBottom: '20px' }}>
              <Search style={{ position: 'absolute', left: '15px', top: '15px', width: '20px', height: '20px', color: '#9ca3af' }} />
              <input
                type="text"
                placeholder="Search coaches or students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '15px 15px 15px 45px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              />
            </div>

            {/* Coaches Table */}
            <div style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <th style={{ padding: '15px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Coach</th>
                    <th style={{ padding: '15px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Students</th>
                    <th style={{ padding: '15px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Progress</th>
                    <th style={{ padding: '15px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Resources</th>
                    <th style={{ padding: '15px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Status</th>
                    <th style={{ padding: '15px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCoaches.map(coach => (
                    <tr key={coach.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '15px' }}>
                        <div>
                          <div style={{ fontWeight: '600' }}>{coach.name}</div>
                          <div style={{ fontSize: '14px', color: '#6b7280' }}>{coach.email}</div>
                        </div>
                      </td>
                      <td style={{ padding: '15px' }}>
                        {coach.assignedStudents.map((student, idx) => (
                          <div key={idx} style={{ fontSize: '14px', marginBottom: '4px' }}>
                            {student.name} ({student.grade})
                          </div>
                        ))}
                      </td>
                      <td style={{ padding: '15px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                            <div style={{ 
                              width: '100px', 
                              height: '8px', 
                              backgroundColor: '#e5e7eb', 
                              borderRadius: '4px',
                              overflow: 'hidden'
                            }}>
                              <div style={{
                                width: `${coach.progress}%`,
                                height: '100%',
                                backgroundColor: coach.progress === 100 ? '#10b981' : '#FF4A23',
                                transition: 'width 0.3s'
                              }} />
                            </div>
                            <span style={{ fontSize: '12px', color: '#6b7280' }}>{coach.progress}%</span>
                          </div>
                          <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                            {coach.completedModules}/{coach.totalModules} modules
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '15px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <FileText className="w-4 h-4 text-gray-400" />
                          <span style={{ fontSize: '14px' }}>{coach.sharedResources.length}</span>
                        </div>
                      </td>
                      <td style={{ padding: '15px' }}>
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '500',
                          backgroundColor: coach.certified ? '#d1fae5' : coach.status === 'Active' ? '#fef3c7' : '#dbeafe',
                          color: coach.certified ? '#065f46' : coach.status === 'Active' ? '#92400e' : '#1e40af'
                        }}>
                          {coach.certified ? 'Certified' : coach.status}
                        </span>
                      </td>
                      <td style={{ padding: '15px' }}>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button
                            onClick={() => {
                              const email = generateOnboardingEmail(coach);
                              console.log('Generated email:', email);
                              alert('Onboarding email generated! Check console for template.');
                            }}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#f3f4f6',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px'
                            }}
                          >
                            <Send className="w-3 h-3" />
                            Send Email
                          </button>
                          <button
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#f3f4f6',
                              border: 'none',
                              borderRadius: '4px',
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