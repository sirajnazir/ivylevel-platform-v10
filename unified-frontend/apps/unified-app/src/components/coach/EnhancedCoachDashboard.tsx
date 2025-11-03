import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  StarIcon, TargetIcon, BookIcon, VideoIcon, UsersIcon, CalendarIcon, 
  ClockIcon, FileTextIcon, SearchIcon, FilterIcon, DownloadIcon, 
  PlayIcon, TrendingUpIcon, CheckCircleIcon, AwardIcon, ChevronRightIcon, 
  ExternalLinkIcon, ICON_COLORS 
} from '../shared/Icons';
import ModernKnowledgeBase from './ModernKnowledgeBase.jsx';
import { CoachSessionsView } from './CoachSessionsView';
import { LogoutButton } from '../shared/LogoutButton';
import '../../styles/design-system.css';

interface Student {
  id: number;
  name: string;
  grade: string;
  gpa: string;
  interests: string;
  nextSession: string;
  progress: number;
  weakSpots: string[];
  quickWins: string[];
  avatar?: string;
}

interface Resource {
  id: number;
  title: string;
  type: 'video' | 'document' | 'template' | 'case-study';
  duration?: string;
  relevance: number;
  tags: string[];
  description: string;
  url: string;
  thumbnail: string;
  addedDate: string;
  priority: 'high' | 'medium' | 'low';
}

interface Session {
  id: number;
  student: string;
  date: string;
  time: string;
  duration: string;
  type: string;
  status: 'upcoming' | 'completed' | 'cancelled';
}

const EnhancedCoachDashboard: React.FC = () => {
  console.log('👨‍🏫 EnhancedCoachDashboard: Component mounted');
  
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [resources, setResources] = useState<Resource[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<Session[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Determine active tab from URL
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/knowledge-base')) {
      setActiveTab('knowledge-base');
    } else if (path.includes('/training')) {
      setActiveTab('training');
    } else if (path.includes('/students')) {
      setActiveTab('students');
    } else if (path.includes('/resources')) {
      setActiveTab('resources');
    } else if (path.includes('/analytics')) {
      setActiveTab('analytics');
    } else if (path.includes('/sessions')) {
      setActiveTab('sessions');
    } else {
      setActiveTab('overview');
    }
  }, [location.pathname]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleTabChange = (tab: string) => {
    console.log('🎯 Coach Dashboard: Tab changed to:', tab);
    setActiveTab(tab);
    if (tab === 'knowledge-base') {
      navigate('/coach/knowledge-base');
    } else if (tab === 'training') {
      navigate('/coach/training');
    } else if (tab === 'students') {
      navigate('/coach/students');
    } else if (tab === 'resources') {
      navigate('/coach/resources');
    } else if (tab === 'analytics') {
      navigate('/coach/analytics');
    } else if (tab === 'sessions') {
      console.log('🎬 Navigating to coach sessions...');
      navigate('/coach/sessions');
    } else {
      navigate('/coach');
    }
  };

  const loadDashboardData = async () => {
    try {
      // Load students
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4101';
      const studentsResponse = await fetch(`${apiUrl}/api/coach/my-students`);
      if (studentsResponse.ok) {
        const studentsData = await studentsResponse.json();
        setStudents(studentsData.students || []);
      }

      // Mock resources data
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
          title: "Huda's Game Plan Report",
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

      // Mock upcoming sessions
      setUpcomingSessions([
        {
          id: 1,
          student: 'Beya Johnson',
          date: '2024-11-25',
          time: '4:00 PM',
          duration: '60 min',
          type: 'Strategy Session',
          status: 'upcoming'
        },
        {
          id: 2,
          student: 'Hiba Martinez',
          date: '2024-11-26',
          time: '5:00 PM',
          duration: '45 min',
          type: 'Progress Review',
          status: 'upcoming'
        }
      ]);

      // Mock recent activity
      setRecentActivity([
        {
          id: 1,
          type: 'session_completed',
          student: 'Beya Johnson',
          description: 'Completed strategy session',
          timestamp: '2 hours ago',
          icon: CheckCircleIcon
        },
        {
          id: 2,
          type: 'resource_added',
          description: 'Added new training video',
          timestamp: '1 day ago',
          icon: VideoIcon
        },
        {
          id: 3,
          type: 'progress_update',
          student: 'Hiba Martinez',
          description: 'Updated progress report',
          timestamp: '2 days ago',
          icon: TrendingUpIcon
        }
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return ICON_COLORS.error;
      case 'medium': return ICON_COLORS.warning;
      case 'low': return ICON_COLORS.success;
      default: return ICON_COLORS.default;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return VideoIcon;
      case 'document': return FileTextIcon;
      case 'template': return BookIcon;
      case 'case-study': return StarIcon;
      default: return FileTextIcon;
    }
  };

  const renderOverview = () => (
    <div className="ivy-container">
      {/* Welcome Section */}
      <div className="ivy-card p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="ivy-text-3xl ivy-font-bold ivy-text-primary mb-2">
              Welcome back, {user?.name || 'Coach'}! 👋
            </h1>
            <p className="ivy-text-secondary ivy-text-lg">
              Here's what's happening with your students today
            </p>
          </div>
          <div className="text-right">
            <div className="ivy-text-sm ivy-text-tertiary">Today's Date</div>
            <div className="ivy-text-lg ivy-font-semibold">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="ivy-grid ivy-grid-4 mb-6">
        <div className="ivy-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="ivy-text-sm ivy-text-tertiary">Active Students</div>
              <div className="ivy-text-2xl ivy-font-bold ivy-text-primary">{students.length}</div>
            </div>
            <UsersIcon size={32} color={ICON_COLORS.primary} />
          </div>
        </div>
        
        <div className="ivy-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="ivy-text-sm ivy-text-tertiary">Upcoming Sessions</div>
              <div className="ivy-text-2xl ivy-font-bold ivy-text-primary">{upcomingSessions.length}</div>
            </div>
            <CalendarIcon size={32} color={ICON_COLORS.primary} />
          </div>
        </div>
        
        <div className="ivy-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="ivy-text-sm ivy-text-tertiary">Resources Available</div>
              <div className="ivy-text-2xl ivy-font-bold ivy-text-primary">{resources.length}</div>
            </div>
            <BookIcon size={32} color={ICON_COLORS.primary} />
          </div>
        </div>
        
        <div className="ivy-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="ivy-text-sm ivy-text-tertiary">Avg. Progress</div>
              <div className="ivy-text-2xl ivy-font-bold ivy-text-primary">
                {students.length > 0 
                  ? Math.round(students.reduce((acc, s) => acc + s.progress, 0) / students.length)
                  : 0}%
              </div>
            </div>
            <TrendingUpIcon size={32} color={ICON_COLORS.primary} />
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="ivy-grid ivy-grid-2 gap-6">
        {/* Students Section */}
        <div className="ivy-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="ivy-text-xl ivy-font-semibold">My Students</h2>
            <button className="ivy-button ivy-button-outline">
              View All
            </button>
          </div>
          
          <div className="space-y-4">
            {students.slice(0, 3).map((student) => (
              <div key={student.id} className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center text-white font-semibold mr-4">
                  {student.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="ivy-font-semibold">{student.name}</div>
                  <div className="ivy-text-sm ivy-text-secondary">{student.grade} • {student.interests}</div>
                  <div className="flex items-center mt-1">
                    <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                      <div 
                        className="bg-gradient-to-r from-orange-400 to-red-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${student.progress}%` }}
                      ></div>
                    </div>
                    <span className="ivy-text-sm ivy-text-secondary">{student.progress}%</span>
                  </div>
                </div>
                <ChevronRightIcon size={20} color={ICON_COLORS.default} />
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Sessions */}
        <div className="ivy-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="ivy-text-xl ivy-font-semibold">Upcoming Sessions</h2>
            <button className="ivy-button ivy-button-outline">
              Schedule New
            </button>
          </div>
          
          <div className="space-y-4">
            {upcomingSessions.map((session) => (
              <div key={session.id} className="flex items-center p-4 border border-gray-200 rounded-lg">
                                 <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                   <ClockIcon size={20} color={ICON_COLORS.primary} />
                 </div>
                <div className="flex-1">
                  <div className="ivy-font-semibold">{session.student}</div>
                  <div className="ivy-text-sm ivy-text-secondary">
                    {session.date} at {session.time} • {session.duration}
                  </div>
                  <div className="ivy-text-xs ivy-text-tertiary">{session.type}</div>
                </div>
                <div className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                  {session.status}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="ivy-card p-6 mt-6">
        <h2 className="ivy-text-xl ivy-font-semibold mb-4">Recent Activity</h2>
        <div className="space-y-3">
          {recentActivity.map((activity) => (
            <div key={activity.id} className="flex items-center p-3 hover:bg-gray-50 rounded-lg transition-colors">
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mr-3">
                <activity.icon size={16} color={ICON_COLORS.default} />
              </div>
              <div className="flex-1">
                <div className="ivy-text-sm">
                  {activity.student && <span className="ivy-font-semibold">{activity.student}</span>}
                  {' '}{activity.description}
                </div>
                <div className="ivy-text-xs ivy-text-tertiary">{activity.timestamp}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderResources = () => (
    <div className="ivy-container">
      <div className="ivy-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="ivy-text-2xl ivy-font-bold">Training Resources</h1>
          <div className="flex items-center space-x-4">
                         <div className="relative">
               <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                 <SearchIcon size={20} color={ICON_COLORS.default} />
               </div>
               <input
                type="text"
                placeholder="Search resources..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="video">Videos</option>
              <option value="document">Documents</option>
              <option value="template">Templates</option>
              <option value="case-study">Case Studies</option>
            </select>
          </div>
        </div>

        <div className="ivy-grid ivy-grid-3">
          {resources
            .filter(resource => 
              (filter === 'all' || resource.type === filter) &&
              resource.title.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .map((resource) => {
              const TypeIcon = getTypeIcon(resource.type);
              return (
                <div key={resource.id} className="ivy-card p-6 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg flex items-center justify-center">
                      <TypeIcon size={24} color={ICON_COLORS.white} />
                    </div>
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: getPriorityColor(resource.priority) }}
                      ></div>
                      <span className="ivy-text-xs ivy-text-tertiary capitalize">{resource.priority}</span>
                    </div>
                  </div>
                  
                  <h3 className="ivy-font-semibold mb-2 line-clamp-2">{resource.title}</h3>
                  <p className="ivy-text-sm ivy-text-secondary mb-3 line-clamp-2">{resource.description}</p>
                  
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <span className="ivy-text-xs ivy-text-tertiary">{resource.duration}</span>
                      <span className="ivy-text-xs ivy-text-tertiary">•</span>
                      <span className="ivy-text-xs ivy-text-tertiary">{resource.relevance}% relevant</span>
                    </div>
                    <span className="ivy-text-xs ivy-text-tertiary">{resource.addedDate}</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-1 mb-4">
                    {resource.tags.slice(0, 3).map((tag, index) => (
                      <span 
                        key={index}
                        className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <button className="ivy-button ivy-button-primary">
                      <PlayIcon size={16} color={ICON_COLORS.white} />
                      <span className="ml-2">View</span>
                    </button>
                    <button className="ivy-button ivy-button-outline">
                      <DownloadIcon size={16} color={ICON_COLORS.primary} />
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );

  const renderStudents = () => (
    <div className="ivy-container">
      <div className="ivy-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="ivy-text-2xl ivy-font-bold">Student Management</h1>
          <button className="ivy-button ivy-button-primary">
            <UsersIcon size={16} color={ICON_COLORS.white} />
            <span className="ml-2">Add Student</span>
          </button>
        </div>

        <div className="ivy-grid ivy-grid-2">
          {students.map((student) => (
            <div key={student.id} className="ivy-card p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center text-white font-bold text-xl mr-4">
                    {student.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="ivy-text-lg ivy-font-semibold">{student.name}</h3>
                    <p className="ivy-text-secondary">{student.grade} • GPA: {student.gpa}</p>
                    <p className="ivy-text-sm ivy-text-tertiary">{student.interests}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="ivy-text-sm ivy-text-tertiary">Next Session</div>
                  <div className="ivy-text-sm ivy-font-medium">{student.nextSession}</div>
                </div>
              </div>
              
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="ivy-text-sm ivy-font-medium">Progress</span>
                  <span className="ivy-text-sm ivy-text-secondary">{student.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-orange-400 to-red-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${student.progress}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <h4 className="ivy-text-sm ivy-font-semibold mb-2">Weak Spots</h4>
                  <div className="space-y-1">
                    {student.weakSpots.map((spot, index) => (
                      <div key={index} className="ivy-text-xs ivy-text-secondary bg-red-50 px-2 py-1 rounded">
                        {spot}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="ivy-text-sm ivy-font-semibold mb-2">Quick Wins</h4>
                  <div className="space-y-1">
                    {student.quickWins.map((win, index) => (
                      <div key={index} className="ivy-text-xs ivy-text-secondary bg-green-50 px-2 py-1 rounded">
                        {win}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <button className="ivy-button ivy-button-primary flex-1">
                  <CalendarIcon size={16} color={ICON_COLORS.white} />
                  <span className="ml-2">Schedule Session</span>
                </button>
                <button className="ivy-button ivy-button-outline">
                  <TargetIcon size={16} color={ICON_COLORS.primary} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div className="ivy-container">
      <div className="ivy-card p-6">
        <h1 className="ivy-text-2xl ivy-font-bold mb-6">Analytics & Insights</h1>
        
        <div className="ivy-grid ivy-grid-2 gap-6">
          <div className="ivy-card p-6">
            <h3 className="ivy-text-lg ivy-font-semibold mb-4">Student Progress Overview</h3>
            <div className="space-y-4">
              {students.map((student) => (
                <div key={student.id} className="flex items-center justify-between">
                  <span className="ivy-text-sm">{student.name}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-orange-400 to-red-500 h-2 rounded-full"
                        style={{ width: `${student.progress}%` }}
                      ></div>
                    </div>
                    <span className="ivy-text-sm ivy-font-medium">{student.progress}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="ivy-card p-6">
            <h3 className="ivy-text-lg ivy-font-semibold mb-4">Session Statistics</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="ivy-text-sm">Total Sessions</span>
                <span className="ivy-text-lg ivy-font-bold ivy-text-primary">24</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="ivy-text-sm">This Month</span>
                <span className="ivy-text-lg ivy-font-bold ivy-text-primary">8</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="ivy-text-sm">Avg. Duration</span>
                <span className="ivy-text-lg ivy-font-bold ivy-text-primary">52 min</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="ivy-text-sm">Completion Rate</span>
                <span className="ivy-text-lg ivy-font-bold ivy-text-success">94%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSchedule = () => (
    <div className="ivy-container">
      <div className="ivy-card p-6">
        <h1 className="ivy-text-2xl ivy-font-bold mb-6">Upcoming Sessions</h1>
        
        <div className="space-y-4">
          {upcomingSessions.map((session) => (
            <div key={session.id} className="ivy-card p-4 flex items-center justify-between">
              <div className="flex-1">
                <h3 className="ivy-text-lg ivy-font-semibold">{session.student}</h3>
                <p className="ivy-text-sm ivy-text-secondary">
                  {session.type} • {session.date} at {session.time}
                </p>
                <p className="ivy-text-sm mt-2">
                  <strong>Duration:</strong> {session.duration}
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <button className="ivy-button ivy-button-primary">
                  <CalendarIcon size={16} color={ICON_COLORS.white} />
                  <span className="ml-2">Prepare</span>
                </button>
                <button className="ivy-button ivy-button-outline">
                  Reschedule
                </button>
              </div>
            </div>
          ))}
          
          {upcomingSessions.length === 0 && (
            <div className="text-center py-8">
              <CalendarIcon size={48} color={ICON_COLORS.tertiary} />
              <p className="ivy-text-secondary mt-4">No upcoming sessions scheduled</p>
              <button className="ivy-button ivy-button-primary mt-4">
                Schedule New Session
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen ivy-bg-secondary">
      {/* Header */}
      <div style={{ 
        background: 'white', 
        height: '64px', 
        borderBottom: '1px solid #EAEAEA',
        display: 'flex',
        alignItems: 'center',
        padding: '0 32px'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          width: '100%',
          maxWidth: '1800px',
          margin: '0 auto'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '48px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AwardIcon size={24} color="#FF5733" />
              <span style={{ fontSize: '18px', fontWeight: '600', color: '#333' }}>IvyLevel Coach</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <span style={{ fontSize: '14px', color: '#666' }}>
              {user?.name || 'Coach'}
            </span>
            <div style={{ 
              width: '36px', 
              height: '36px', 
              background: '#FF5733',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '16px',
              fontWeight: '600'
            }}>
              {user?.name?.charAt(0) || 'C'}
            </div>
            <LogoutButton />
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="ivy-bg-white border-b border-gray-200">
        <div className="ivy-container">
          <nav className="flex space-x-8">
            {console.log('🎯 Rendering tabs with Sessions tab')}
            {[
              { id: 'overview', label: 'Overview', icon: TargetIcon },
              { id: 'sessions', label: 'Sessions', icon: PlayIcon },
              { id: 'resources', label: 'Resources', icon: BookIcon },
              { id: 'students', label: 'Students', icon: UsersIcon },
              { id: 'analytics', label: 'Analytics', icon: TrendingUpIcon },
              { id: 'schedule', label: 'Schedule', icon: CalendarIcon },
              { id: 'knowledge-base', label: 'Knowledge Base', icon: VideoIcon }
            ].map((tab) => {
              console.log('🎯 Rendering tab:', tab.label);
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <TabIcon size={20} color={activeTab === tab.id ? ICON_COLORS.primary : ICON_COLORS.default} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="py-6">
        {console.log('🎯 Coach Dashboard: Current activeTab:', activeTab)}
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'sessions' && (
          <>
            {console.log('🎬 Rendering CoachSessionsView')}
            <CoachSessionsView onClose={() => handleTabChange('overview')} />
          </>
        )}
        {activeTab === 'resources' && renderResources()}
        {activeTab === 'students' && renderStudents()}
        {activeTab === 'analytics' && renderAnalytics()}
        {activeTab === 'schedule' && renderSchedule()}
        {activeTab === 'knowledge-base' && <ModernKnowledgeBase />}
        {activeTab === 'training' && <div className="ivy-container py-8"><div className="ivy-card p-8 text-center"><h2 className="ivy-text-2xl ivy-font-bold mb-4">Training Module</h2><p className="ivy-text-secondary">Training content will be displayed here.</p></div></div>}
      </div>
    </div>
  );
};

export default EnhancedCoachDashboard;