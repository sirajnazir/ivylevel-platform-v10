import React from 'react';
import { Settings, Globe, Mail, Shield, Bell, Database } from 'lucide-react';

export const PlatformSettings: React.FC = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Platform Settings</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <Globe className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">General Settings</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Platform Name</label>
              <input type="text" defaultValue="Ivylevel" className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Support Email</label>
              <input type="email" defaultValue="support@ivylevel.com" className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <Shield className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Security Settings</h3>
          </div>
          <div className="space-y-4">
            <label className="flex items-center space-x-3">
              <input type="checkbox" defaultChecked className="rounded border-gray-300" />
              <span className="text-sm text-gray-700">Require 2FA for admin accounts</span>
            </label>
            <label className="flex items-center space-x-3">
              <input type="checkbox" defaultChecked className="rounded border-gray-300" />
              <span className="text-sm text-gray-700">Enable session timeout</span>
            </label>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <Mail className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Email Settings</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">SMTP Server</label>
              <input type="text" defaultValue="email-smtp.us-east-1.amazonaws.com" className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">From Email</label>
              <input type="email" defaultValue="noreply@ivylevel.com" className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <Database className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Backup Settings</h3>
          </div>
          <div className="space-y-4">
            <label className="flex items-center space-x-3">
              <input type="checkbox" defaultChecked className="rounded border-gray-300" />
              <span className="text-sm text-gray-700">Enable automatic backups</span>
            </label>
            <div>
              <label className="block text-sm font-medium text-gray-700">Backup Frequency</label>
              <select className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md">
                <option>Daily</option>
                <option>Weekly</option>
                <option>Monthly</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button className="px-6 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:from-orange-600 hover:to-red-700">
          Save Settings
        </button>
      </div>
    </div>
  );
};