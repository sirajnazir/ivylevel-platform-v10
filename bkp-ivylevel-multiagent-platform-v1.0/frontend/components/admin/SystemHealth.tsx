import React, { useState, useEffect } from 'react';
import {
  Activity, Server, Database, Globe, 
  CheckCircle, AlertCircle, XCircle, RefreshCw,
  Cpu, HardDrive, Wifi, Clock
} from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

const colors = {
  success: '#059669',
  warning: '#F59E0B',
  error: '#DC2626',
  info: '#3B82F6'
};

interface ServiceStatus {
  name: string;
  status: 'operational' | 'degraded' | 'down';
  responseTime: number;
  uptime: number;
  lastChecked: Date;
}

export const SystemHealth: React.FC = () => {
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [cpuData, setCpuData] = useState<any[]>([]);
  const [memoryData, setMemoryData] = useState<any[]>([]);

  useEffect(() => {
    // Initialize services
    setServices([
      {
        name: 'API Server',
        status: 'operational',
        responseTime: 124,
        uptime: 99.98,
        lastChecked: new Date()
      },
      {
        name: 'Database',
        status: 'operational',
        responseTime: 45,
        uptime: 99.99,
        lastChecked: new Date()
      },
      {
        name: 'Redis Cache',
        status: 'operational',
        responseTime: 12,
        uptime: 100,
        lastChecked: new Date()
      },
      {
        name: 'Email Service',
        status: 'operational',
        responseTime: 234,
        uptime: 99.87,
        lastChecked: new Date()
      },
      {
        name: 'Storage (S3)',
        status: 'operational',
        responseTime: 156,
        uptime: 99.99,
        lastChecked: new Date()
      },
      {
        name: 'CDN',
        status: 'operational',
        responseTime: 32,
        uptime: 100,
        lastChecked: new Date()
      }
    ]);

    // Generate sample monitoring data
    const generateData = () => {
      const data = [];
      for (let i = 0; i < 20; i++) {
        data.push({
          time: `${i * 5}m`,
          value: Math.floor(Math.random() * 30) + 20
        });
      }
      return data;
    };

    setCpuData(generateData());
    setMemoryData(generateData().map(d => ({ ...d, value: d.value + 30 })));
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    // Simulate refresh
    setTimeout(() => {
      setServices(services.map(service => ({
        ...service,
        responseTime: service.responseTime + Math.floor(Math.random() * 20) - 10,
        lastChecked: new Date()
      })));
      setRefreshing(false);
    }, 1500);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational': return colors.success;
      case 'degraded': return colors.warning;
      case 'down': return colors.error;
      default: return colors.info;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational': return <CheckCircle className="w-5 h-5" />;
      case 'degraded': return <AlertCircle className="w-5 h-5" />;
      case 'down': return <XCircle className="w-5 h-5" />;
      default: return <Activity className="w-5 h-5" />;
    }
  };

  const systemMetrics = [
    { label: 'CPU Usage', value: '23%', icon: <Cpu />, status: 'good' },
    { label: 'Memory', value: '4.2GB / 8GB', icon: <Server />, status: 'good' },
    { label: 'Storage', value: '45GB / 100GB', icon: <HardDrive />, status: 'good' },
    { label: 'Network I/O', value: '1.2 MB/s', icon: <Wifi />, status: 'good' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Health</h1>
          <p className="text-gray-600 mt-2">Monitor platform infrastructure and services</p>
        </div>
        <button
          onClick={handleRefresh}
          className={`px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2 ${
            refreshing ? 'animate-spin' : ''
          }`}
        >
          <RefreshCw className="w-5 h-5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Overall Status */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center space-x-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
          <div>
            <h2 className="text-xl font-semibold text-green-900">All Systems Operational</h2>
            <p className="text-green-700 mt-1">All services are running normally</p>
          </div>
        </div>
      </div>

      {/* System Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {systemMetrics.map((metric, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gray-100 rounded-lg text-gray-600">
                {metric.icon}
              </div>
              <div className="w-2 h-2 rounded-full bg-green-500" />
            </div>
            <p className="text-sm text-gray-600">{metric.label}</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{metric.value}</p>
          </div>
        ))}
      </div>

      {/* Service Status */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Service Status</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Service
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Response Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Uptime
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Checked
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {services.map((service, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <Server className="w-5 h-5 text-gray-400 mr-3" />
                      <span className="text-sm font-medium text-gray-900">{service.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2" style={{ color: getStatusColor(service.status) }}>
                      {getStatusIcon(service.status)}
                      <span className="text-sm font-medium capitalize">{service.status}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-900">{service.responseTime}ms</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-900">{service.uptime}%</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-500">
                      {service.lastChecked.toLocaleTimeString()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">CPU Usage</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={cpuData}>
              <XAxis dataKey="time" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke={colors.info} 
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Memory Usage</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={memoryData}>
              <XAxis dataKey="time" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke={colors.warning} 
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Incidents */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Incidents</h3>
        <div className="space-y-4">
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No incidents in the last 30 days</p>
          </div>
        </div>
      </div>

      {/* System Information */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Infrastructure</h4>
          <dl className="space-y-2">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-600">Region</dt>
              <dd className="text-sm font-medium text-gray-900">us-east-1</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-600">Environment</dt>
              <dd className="text-sm font-medium text-gray-900">Production</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-600">Version</dt>
              <dd className="text-sm font-medium text-gray-900">v3.0.0</dd>
            </div>
          </dl>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Database</h4>
          <dl className="space-y-2">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-600">Type</dt>
              <dd className="text-sm font-medium text-gray-900">PostgreSQL 14</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-600">Connections</dt>
              <dd className="text-sm font-medium text-gray-900">18 / 100</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-600">Size</dt>
              <dd className="text-sm font-medium text-gray-900">2.3 GB</dd>
            </div>
          </dl>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Monitoring</h4>
          <dl className="space-y-2">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-600">Alerts</dt>
              <dd className="text-sm font-medium text-gray-900">0 Active</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-600">Log Level</dt>
              <dd className="text-sm font-medium text-gray-900">Info</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-600">APM</dt>
              <dd className="text-sm font-medium text-gray-900">Enabled</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
};