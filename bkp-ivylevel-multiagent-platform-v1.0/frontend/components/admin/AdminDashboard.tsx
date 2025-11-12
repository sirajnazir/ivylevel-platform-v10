import React, { useState } from 'react';
import { 
  Users, FileText, BarChart3, Settings, 
  CreditCard, Shield, Database, Activity,
  Upload, Mail, Calendar, TrendingUp,
  AlertCircle, CheckCircle, Clock, DollarSign,
  LogOut, Bell
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LogoutButton } from '../shared/LogoutButton';
import { UserManagement } from './UserManagement';
import { Analytics } from './Analytics';
import { SystemHealth } from './SystemHealth';
import { ContentManagement } from './ContentManagement';
import { BillingManagement } from './BillingManagement';
import { PlatformSettings } from './PlatformSettings';
import { EmailCampaigns } from './EmailCampaigns';
import { AuditLogs } from './AuditLogs';

// Ivylevel brand colors
const colors = {
  primary: '#FF4A23',
  secondary: '#641432',
  accent: '#FE4A22',
  background: {
    light: '#FFE5DF',
    lighter: '#F5E8E5',
    white: '#FFFFFF'
  },
  text: {
    primary: '#111827',
    secondary: '#6B7280',
    light: '#9CA3AF'
  },
  success: '#059669',
  warning: '#F59E0B',
  error: '#DC2626',
  info: '#3B82F6'
};

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  component: React.ComponentType<any>;
  badge?: number | string;
}

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  const handleLogout = async () => {
    console.log('Admin logout clicked');
    await logout();
    navigate('/');
  };

  const navItems: NavItem[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: <BarChart3 className="w-5 h-5" />,
      component: OverviewDashboard
    },
    {
      id: 'users',
      label: 'User Management',
      icon: <Users className="w-5 h-5" />,
      component: UserManagement,
      badge: '53'
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: <TrendingUp className="w-5 h-5" />,
      component: Analytics
    },
    {
      id: 'health',
      label: 'System Health',
      icon: <Activity className="w-5 h-5" />,
      component: SystemHealth
    },
    {
      id: 'content',
      label: 'Content',
      icon: <FileText className="w-5 h-5" />,
      component: ContentManagement
    },
    {
      id: 'billing',
      label: 'Billing',
      icon: <CreditCard className="w-5 h-5" />,
      component: BillingManagement,
      badge: '$45.2k'
    },
    {
      id: 'emails',
      label: 'Email Campaigns',
      icon: <Mail className="w-5 h-5" />,
      component: EmailCampaigns
    },
    {
      id: 'audit',
      label: 'Audit Logs',
      icon: <Shield className="w-5 h-5" />,
      component: AuditLogs
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="w-5 h-5" />,
      component: PlatformSettings
    }
  ];

  const ActiveComponent = navItems.find(item => item.id === activeTab)?.component || OverviewDashboard;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-full px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" 
                style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})` }}>
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Admin Portal</h2>
                <p className="text-xs text-gray-500">Ivylevel Platform</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Bell className="w-5 h-5 text-gray-500 cursor-pointer hover:text-gray-700" />
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-600">{user?.email || 'Admin'}</span>
                <LogoutButton />
              </div>
            </div>
          </div>
        </div>
      </header>
      
      <div className="flex">
        {/* Sidebar */}
        <aside className={`${sidebarCollapsed ? 'w-20' : 'w-64'} bg-white shadow-lg transition-all duration-300 relative flex flex-col h-[calc(100vh-73px)]`}>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all ${
                activeTab === item.id
                  ? 'bg-gradient-to-r from-orange-50 to-red-50 text-red-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className={activeTab === item.id ? 'text-red-600' : ''}>{item.icon}</span>
                {!sidebarCollapsed && (
                  <span className="font-medium">{item.label}</span>
                )}
              </div>
              {!sidebarCollapsed && item.badge && (
                <span className={`px-2 py-1 text-xs rounded-full ${
                  activeTab === item.id
                    ? 'bg-red-100 text-red-600'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200">
          {/* Collapse Button */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full flex items-center justify-center py-2 text-gray-500 hover:text-gray-700"
          >
            <svg className={`w-5 h-5 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} 
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>
      </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-8">
            <ActiveComponent />
          </div>
        </main>
      </div>
    </div>
  );
};

// Overview Dashboard Component
const OverviewDashboard: React.FC = () => {
  const stats = [
    {
      label: 'Total Users',
      value: '53',
      change: '+12%',
      trend: 'up',
      icon: <Users className="w-6 h-6" />,
      color: colors.primary
    },
    {
      label: 'Active Sessions',
      value: '18',
      change: '+5%',
      trend: 'up',
      icon: <Activity className="w-6 h-6" />,
      color: colors.success
    },
    {
      label: 'Revenue MTD',
      value: '$45.2k',
      change: '+23%',
      trend: 'up',
      icon: <DollarSign className="w-6 h-6" />,
      color: colors.info
    },
    {
      label: 'Success Rate',
      value: '92%',
      change: '+3%',
      trend: 'up',
      icon: <TrendingUp className="w-6 h-6" />,
      color: colors.warning
    }
  ];

  const recentActivities = [
    { type: 'user', message: 'New student registered: Kavya Venkatesan', time: '2 min ago', icon: <Users /> },
    { type: 'payment', message: 'Payment received from Aarav K. - $150', time: '15 min ago', icon: <CreditCard /> },
    { type: 'session', message: 'Coaching session completed: Jenny & Huda', time: '1 hour ago', icon: <Calendar /> },
    { type: 'alert', message: 'System backup completed successfully', time: '3 hours ago', icon: <CheckCircle /> }
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome back! Here's what's happening on your platform.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg" style={{ backgroundColor: `${stat.color}15` }}>
                <span style={{ color: stat.color }}>{stat.icon}</span>
              </div>
              <span className={`text-sm font-medium ${
                stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
              }`}>
                {stat.change}
              </span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
            <p className="text-sm text-gray-600 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-red-400 hover:bg-red-50 transition-all">
            <Upload className="w-6 h-6 mx-auto mb-2 text-gray-400" />
            <span className="text-sm text-gray-600">Import Users</span>
          </button>
          <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-red-400 hover:bg-red-50 transition-all">
            <Mail className="w-6 h-6 mx-auto mb-2 text-gray-400" />
            <span className="text-sm text-gray-600">Send Campaign</span>
          </button>
          <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-red-400 hover:bg-red-50 transition-all">
            <FileText className="w-6 h-6 mx-auto mb-2 text-gray-400" />
            <span className="text-sm text-gray-600">Create Report</span>
          </button>
          <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-red-400 hover:bg-red-50 transition-all">
            <Database className="w-6 h-6 mx-auto mb-2 text-gray-400" />
            <span className="text-sm text-gray-600">Backup Data</span>
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <div className="space-y-4">
          {recentActivities.map((activity, index) => (
            <div key={index} className="flex items-center space-x-4 p-3 hover:bg-gray-50 rounded-lg">
              <div className="p-2 bg-gray-100 rounded-lg text-gray-600">
                {activity.icon}
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-900">{activity.message}</p>
                <p className="text-xs text-gray-500">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* System Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">API Status</h3>
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Response Time</span>
              <span className="font-medium">124ms</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Uptime</span>
              <span className="font-medium">99.98%</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Database</h3>
            <Activity className="w-5 h-5 text-blue-600" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Storage Used</span>
              <span className="font-medium">2.3 GB / 10 GB</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Connections</span>
              <span className="font-medium">18 / 100</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Email Service</h3>
            <Mail className="w-5 h-5 text-purple-600" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Sent Today</span>
              <span className="font-medium">234</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Delivery Rate</span>
              <span className="font-medium">98.7%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};