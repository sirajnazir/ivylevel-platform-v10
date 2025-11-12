import React, { useState } from 'react';
import { ProfileSettings } from './ProfileSettings';
import { ChangePassword } from './ChangePassword';
import { MFASetup } from './MFASetup';
import { SessionSettings } from './SessionSettings';
import { cognitoAuthService } from '../../services/auth/cognitoAuthService';

type TabType = 'profile' | 'security' | 'privacy' | 'danger';

export const AccountSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [showMFASetup, setShowMFASetup] = useState(false);
  const [showSessionSettings, setShowSessionSettings] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      setError('Please type DELETE to confirm');
      return;
    }

    setLoading(true);
    setError('');

    const result = await cognitoAuthService.deleteAccount();

    if (result.success) {
      setMessage('Account deleted successfully. Redirecting...');
      setTimeout(() => {
        cognitoAuthService.logout();
        window.location.href = '/';
      }, 2000);
    } else {
      setError(result.message || 'Failed to delete account');
    }

    setLoading(false);
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: 'user' },
    { id: 'security', label: 'Security', icon: 'shield' },
    { id: 'privacy', label: 'Privacy', icon: 'eye' },
    { id: 'danger', label: 'Danger Zone', icon: 'alert' }
  ];

  const renderTabIcon = (icon: string) => {
    switch (icon) {
      case 'user':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      case 'shield':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        );
      case 'eye':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        );
      case 'alert':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Account Settings</h1>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Navigation */}
        <nav className="lg:w-64">
          <ul className="space-y-1">
            {tabs.map((tab) => (
              <li key={tab.id}>
                <button
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <span className="mr-3">{renderTabIcon(tab.icon)}</span>
                  {tab.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Main Content */}
        <div className="flex-1">
          {message && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              {message}
            </div>
          )}

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && <ProfileSettings />}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              {showPasswordChange ? (
                <ChangePassword 
                  onClose={() => setShowPasswordChange(false)} 
                  onSuccess={() => {
                    setShowPasswordChange(false);
                    setMessage('Password changed successfully');
                    setTimeout(() => setMessage(''), 5000);
                  }}
                />
              ) : showMFASetup ? (
                <MFASetup onComplete={() => setShowMFASetup(false)} />
              ) : showSessionSettings ? (
                <div>
                  <button
                    onClick={() => setShowSessionSettings(false)}
                    className="mb-4 flex items-center text-sm text-gray-600 hover:text-gray-900"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Security Settings
                  </button>
                  <SessionSettings />
                </div>
              ) : (
                <>
                  <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Security Settings</h2>
                    
                    <div className="space-y-6">
                      {/* Password Section */}
                      <div className="border-b border-gray-200 pb-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Password</h3>
                        <p className="text-sm text-gray-600 mb-4">
                          Ensure your account stays secure by using a strong password
                        </p>
                        <button
                          onClick={() => setShowPasswordChange(true)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                          Change Password
                        </button>
                      </div>

                      {/* Two-Factor Authentication */}
                      <div className="border-b border-gray-200 pb-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          Two-Factor Authentication
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">
                          Add an extra layer of security to your account
                        </p>
                        <button
                          onClick={() => setShowMFASetup(true)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                          Enable 2FA
                        </button>
                      </div>

                      {/* Session Management */}
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Session Management</h3>
                        <p className="text-sm text-gray-600 mb-4">
                          Configure session timeout and security preferences
                        </p>
                        <button
                          onClick={() => setShowSessionSettings(true)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                          Manage Sessions
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Privacy Tab */}
          {activeTab === 'privacy' && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Privacy Settings</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Data & Personalization</h3>
                  <div className="space-y-4">
                    <label className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">
                        Allow usage analytics to improve the platform
                      </span>
                      <input
                        type="checkbox"
                        defaultChecked
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </label>
                    
                    <label className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">
                        Receive product updates and announcements
                      </span>
                      <input
                        type="checkbox"
                        defaultChecked
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </label>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Data Export</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Download a copy of your data
                  </p>
                  <button className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors">
                    Request Data Export
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Danger Zone Tab */}
          {activeTab === 'danger' && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-bold text-red-600 mb-4">Danger Zone</h2>
              
              <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
                <h3 className="text-lg font-medium text-red-900 mb-2">Delete Account</h3>
                <p className="text-sm text-red-700 mb-4">
                  Once you delete your account, there is no going back. Please be certain.
                </p>
                
                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                  >
                    Delete Account
                  </button>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm font-medium text-red-900">
                      Type <span className="font-mono bg-red-100 px-1">DELETE</span> to confirm:
                    </p>
                    <input
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      className="w-full px-3 py-2 border border-red-300 rounded-md focus:ring-red-500 focus:border-red-500"
                      placeholder="Type DELETE"
                    />
                    <div className="flex space-x-3">
                      <button
                        onClick={handleDeleteAccount}
                        disabled={loading || deleteConfirmText !== 'DELETE'}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
                      >
                        {loading ? 'Deleting...' : 'Permanently Delete Account'}
                      </button>
                      <button
                        onClick={() => {
                          setShowDeleteConfirm(false);
                          setDeleteConfirmText('');
                          setError('');
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};