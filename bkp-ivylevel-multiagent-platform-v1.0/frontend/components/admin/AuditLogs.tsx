import React from 'react';
import { Shield, User, Settings, Database } from 'lucide-react';

export const AuditLogs: React.FC = () => {
  const logs = [
    { user: 'admin@ivylevel.com', action: 'User Created', target: 'kavya@gmail.com', time: '2 min ago', icon: <User /> },
    { user: 'jenny@ivymentors.co', action: 'Settings Updated', target: 'Email Templates', time: '15 min ago', icon: <Settings /> },
    { user: 'system', action: 'Database Backup', target: 'Full Backup', time: '1 hour ago', icon: <Database /> },
    { user: 'admin@ivylevel.com', action: 'Role Changed', target: 'aditi@ivymentors.co', time: '3 hours ago', icon: <Shield /> },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6">
          <div className="space-y-4">
            {logs.map((log, index) => (
              <div key={index} className="flex items-center space-x-4 p-4 hover:bg-gray-50 rounded-lg">
                <div className="p-2 bg-gray-100 rounded-lg text-gray-600">
                  {log.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900">{log.user}</span>
                    <span className="text-gray-500">performed</span>
                    <span className="font-medium text-gray-900">{log.action}</span>
                    <span className="text-gray-500">on</span>
                    <span className="text-gray-700">{log.target}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{log.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};