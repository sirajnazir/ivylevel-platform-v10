import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { 
  RoleBasedComponent, 
  AdminOnly, 
  CoachOnly, 
  StudentOnly,
  CoachOrAdmin 
} from '../auth/RoleBasedComponent';

export const RoleBasedDashboard: React.FC = () => {
  const { user, hasRole } = useAuth();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        Welcome, {user?.name || 'User'}!
      </h1>

      {/* Common section for all authenticated users */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">General Information</h2>
        <p className="text-gray-600">
          You are logged in as a <span className="font-semibold capitalize">{user?.role}</span>.
        </p>
      </div>

      {/* Student-only section */}
      <StudentOnly>
        <div className="bg-blue-50 border-l-4 border-blue-500 p-6 mb-6">
          <h2 className="text-xl font-semibold text-blue-900 mb-4">Student Resources</h2>
          <ul className="space-y-2 text-blue-800">
            <li>• Access your personalized study plan</li>
            <li>• View upcoming college application deadlines</li>
            <li>• Track your progress and achievements</li>
            <li>• Connect with your assigned coach</li>
          </ul>
        </div>
      </StudentOnly>

      {/* Coach-only section */}
      <CoachOnly>
        <div className="bg-green-50 border-l-4 border-green-500 p-6 mb-6">
          <h2 className="text-xl font-semibold text-green-900 mb-4">Coach Dashboard</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded shadow">
              <h3 className="font-medium text-gray-900">Student Management</h3>
              <p className="text-gray-600 mt-2">Manage your assigned students</p>
            </div>
            <div className="bg-white p-4 rounded shadow">
              <h3 className="font-medium text-gray-900">Resources</h3>
              <p className="text-gray-600 mt-2">Access coaching materials</p>
            </div>
          </div>
        </div>
      </CoachOnly>

      {/* Admin-only section */}
      <AdminOnly>
        <div className="bg-purple-50 border-l-4 border-purple-500 p-6 mb-6">
          <h2 className="text-xl font-semibold text-purple-900 mb-4">Admin Controls</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded shadow">
              <h3 className="font-medium text-gray-900">User Management</h3>
              <p className="text-gray-600 mt-2">Create and manage users</p>
            </div>
            <div className="bg-white p-4 rounded shadow">
              <h3 className="font-medium text-gray-900">System Settings</h3>
              <p className="text-gray-600 mt-2">Configure platform settings</p>
            </div>
            <div className="bg-white p-4 rounded shadow">
              <h3 className="font-medium text-gray-900">Analytics</h3>
              <p className="text-gray-600 mt-2">View platform analytics</p>
            </div>
          </div>
        </div>
      </AdminOnly>

      {/* Coach or Admin section */}
      <CoachOrAdmin>
        <div className="bg-gray-50 border-l-4 border-gray-500 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Management Tools
          </h2>
          <p className="text-gray-600">
            As a {user?.role}, you have access to advanced management features.
          </p>
        </div>
      </CoachOrAdmin>

      {/* Using RoleBasedComponent with custom fallback */}
      <RoleBasedComponent 
        roles={['admin', 'coach']} 
        fallback={
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6">
            <p className="text-yellow-800">
              Some features are only available to coaches and administrators.
            </p>
          </div>
        }
      >
        <div className="bg-indigo-50 border-l-4 border-indigo-500 p-6">
          <h2 className="text-xl font-semibold text-indigo-900 mb-4">
            Advanced Features
          </h2>
          <p className="text-indigo-800">
            You have access to advanced platform features.
          </p>
        </div>
      </RoleBasedComponent>

      {/* Programmatic role checking */}
      {hasRole('admin') && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded">
          <p className="text-red-800 font-medium">
            Admin Notice: System maintenance scheduled for tonight.
          </p>
        </div>
      )}

      {/* Multiple role checking */}
      {hasRole(['coach', 'admin']) && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
          <p className="text-blue-800">
            Staff Resources: Access training materials and guidelines.
          </p>
        </div>
      )}
    </div>
  );
};