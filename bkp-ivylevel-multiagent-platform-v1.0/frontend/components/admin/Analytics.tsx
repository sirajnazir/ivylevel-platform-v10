import React, { useState } from 'react';
import { 
  BarChart3, TrendingUp, Users, DollarSign, 
  Calendar, Download, Filter, RefreshCw,
  Target, Award, BookOpen, Clock
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const colors = {
  primary: '#FF4A23',
  secondary: '#641432',
  accent: '#FE4A22',
  success: '#059669',
  warning: '#F59E0B',
  error: '#DC2626',
  info: '#3B82F6'
};

export const Analytics: React.FC = () => {
  const [timeRange, setTimeRange] = useState('30d');
  const [refreshing, setRefreshing] = useState(false);

  // Sample data
  const userGrowthData = [
    { month: 'Jan', students: 12, coaches: 8 },
    { month: 'Feb', students: 15, coaches: 10 },
    { month: 'Mar', students: 18, coaches: 12 },
    { month: 'Apr', students: 22, coaches: 15 },
    { month: 'May', students: 28, coaches: 18 },
    { month: 'Jun', students: 35, coaches: 22 },
    { month: 'Jul', students: 42, coaches: 26 },
    { month: 'Aug', students: 48, coaches: 30 },
  ];

  const revenueData = [
    { month: 'Jan', revenue: 12500, target: 15000 },
    { month: 'Feb', revenue: 18200, target: 17000 },
    { month: 'Mar', revenue: 22800, target: 20000 },
    { month: 'Apr', revenue: 28500, target: 25000 },
    { month: 'May', revenue: 35200, target: 30000 },
    { month: 'Jun', revenue: 42100, target: 35000 },
    { month: 'Jul', revenue: 48900, target: 40000 },
    { month: 'Aug', revenue: 55600, target: 45000 },
  ];

  const collegeDistribution = [
    { name: 'Ivy League', value: 35, color: colors.primary },
    { name: 'Top 20', value: 28, color: colors.secondary },
    { name: 'Top 50', value: 22, color: colors.info },
    { name: 'Other', value: 15, color: colors.warning },
  ];

  const engagementMetrics = [
    { metric: 'Avg. Session Duration', value: '45 min', change: '+12%', icon: <Clock /> },
    { metric: 'Sessions per Week', value: '3.2', change: '+8%', icon: <Calendar /> },
    { metric: 'Course Completion', value: '78%', change: '+15%', icon: <BookOpen /> },
    { metric: 'Student Satisfaction', value: '4.8/5', change: '+0.3', icon: <Award /> },
  ];

  const topPerformers = [
    { name: 'Jenny Duan', role: 'Coach', metric: '98% Success Rate', students: 12 },
    { name: 'Aditi Bhaskar', role: 'Coach', metric: '95% Success Rate', students: 10 },
    { name: 'Rishi Patel', role: 'Coach', metric: '93% Success Rate', students: 8 },
    { name: 'Huda Siraj', role: 'Student', metric: 'Ivy+ Score: 92', coach: 'Jenny' },
    { name: 'Kavya V.', role: 'Student', metric: 'Ivy+ Score: 89', coach: 'Aditi' },
  ];

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  };

  const handleExport = () => {
    console.log('Exporting analytics data...');
    // Implement export functionality
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-2">Track platform performance and user engagement</p>
        </div>
        <div className="flex items-center space-x-3">
          <select 
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          <button
            onClick={handleRefresh}
            className={`p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 ${
              refreshing ? 'animate-spin' : ''
            }`}
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: '$55.6k', change: '+23%', icon: <DollarSign />, color: colors.success },
          { label: 'Active Users', value: '53', change: '+12%', icon: <Users />, color: colors.primary },
          { label: 'Success Rate', value: '92%', change: '+3%', icon: <Target />, color: colors.info },
          { label: 'Avg. Ivy+ Score', value: '87', change: '+5', icon: <TrendingUp />, color: colors.warning },
        ].map((metric, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg" style={{ backgroundColor: `${metric.color}15` }}>
                <span style={{ color: metric.color }}>{metric.icon}</span>
              </div>
              <span className="text-sm font-medium text-green-600">{metric.change}</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{metric.value}</h3>
            <p className="text-sm text-gray-600 mt-1">{metric.label}</p>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth Chart */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">User Growth</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={userGrowthData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="students" stroke={colors.primary} strokeWidth={2} />
              <Line type="monotone" dataKey="coaches" stroke={colors.secondary} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue Chart */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue vs Target</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="revenue" fill={colors.success} />
              <Bar dataKey="target" fill={colors.warning} opacity={0.5} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* College Distribution */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Target Colleges</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={collegeDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {collegeDistribution.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {collegeDistribution.map((item, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-gray-600">{item.name}</span>
                </div>
                <span className="font-medium">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Engagement Metrics */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Engagement Metrics</h3>
          <div className="grid grid-cols-2 gap-4">
            {engagementMetrics.map((metric, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-white rounded-lg text-gray-600">
                    {metric.icon}
                  </div>
                  <span className="text-sm font-medium text-green-600">{metric.change}</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                <p className="text-sm text-gray-600 mt-1">{metric.metric}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Performers */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performers</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Key Metric
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {topPerformers.map((performer, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-medium"
                        style={{ backgroundColor: performer.role === 'Coach' ? colors.secondary : colors.primary }}>
                        {performer.name.charAt(0)}
                      </div>
                      <span className="ml-3 text-sm font-medium text-gray-900">{performer.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      performer.role === 'Coach' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {performer.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{performer.metric}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {performer.role === 'Coach' 
                      ? `${performer.students} students` 
                      : `Coach: ${performer.coach}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-lg p-6 border border-red-100">
          <h4 className="text-lg font-semibold text-gray-900 mb-2">Conversion Rate</h4>
          <p className="text-3xl font-bold text-red-600">68%</p>
          <p className="text-sm text-gray-600 mt-1">Trial to paid conversion</p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-100">
          <h4 className="text-lg font-semibold text-gray-900 mb-2">Retention Rate</h4>
          <p className="text-3xl font-bold text-blue-600">94%</p>
          <p className="text-sm text-gray-600 mt-1">Monthly active retention</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-6 border border-green-100">
          <h4 className="text-lg font-semibold text-gray-900 mb-2">NPS Score</h4>
          <p className="text-3xl font-bold text-green-600">72</p>
          <p className="text-sm text-gray-600 mt-1">Net Promoter Score</p>
        </div>
      </div>
    </div>
  );
};