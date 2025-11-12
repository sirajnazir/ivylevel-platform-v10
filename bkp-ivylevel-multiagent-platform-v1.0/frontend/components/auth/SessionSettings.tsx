import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';

interface SessionPreferences {
  rememberMe: boolean;
  sessionTimeout: number; // in minutes
  showWarning: boolean;
  warningTime: number; // minutes before timeout
}

const DEFAULT_PREFERENCES: SessionPreferences = {
  rememberMe: false,
  sessionTimeout: 30,
  showWarning: true,
  warningTime: 5
};

export const SessionSettings: React.FC = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<SessionPreferences>(DEFAULT_PREFERENCES);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Load preferences from localStorage
    const savedPrefs = localStorage.getItem('session_preferences');
    if (savedPrefs) {
      try {
        setPreferences(JSON.parse(savedPrefs));
      } catch (error) {
        console.error('Failed to load session preferences:', error);
      }
    }
  }, []);

  const handleSave = () => {
    // Save preferences to localStorage
    localStorage.setItem('session_preferences', JSON.stringify(preferences));
    setSaved(true);
    
    // Emit custom event to notify SessionMonitor of changes
    window.dispatchEvent(new CustomEvent('session-preferences-updated', { 
      detail: preferences 
    }));

    setTimeout(() => setSaved(false), 3000);
  };

  const timeoutOptions = [
    { value: 15, label: '15 minutes' },
    { value: 30, label: '30 minutes' },
    { value: 60, label: '1 hour' },
    { value: 120, label: '2 hours' },
    { value: 480, label: '8 hours' }
  ];

  const warningOptions = [
    { value: 1, label: '1 minute' },
    { value: 5, label: '5 minutes' },
    { value: 10, label: '10 minutes' },
    { value: 15, label: '15 minutes' }
  ];

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Session Settings</h2>

      {saved && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          Session preferences saved successfully
        </div>
      )}

      <div className="space-y-6">
        {/* Remember Me */}
        <div>
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={preferences.rememberMe}
              onChange={(e) => setPreferences({ ...preferences, rememberMe: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <div>
              <span className="text-sm font-medium text-gray-900">Remember me on this device</span>
              <p className="text-sm text-gray-500">Stay logged in for up to 30 days of inactivity</p>
            </div>
          </label>
        </div>

        {/* Session Timeout */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Session Timeout
          </label>
          <select
            value={preferences.sessionTimeout}
            onChange={(e) => setPreferences({ 
              ...preferences, 
              sessionTimeout: parseInt(e.target.value) 
            })}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            {timeoutOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-sm text-gray-500">
            Automatically log out after this period of inactivity
          </p>
        </div>

        {/* Warning Settings */}
        <div>
          <label className="flex items-center space-x-3 mb-3">
            <input
              type="checkbox"
              checked={preferences.showWarning}
              onChange={(e) => setPreferences({ ...preferences, showWarning: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm font-medium text-gray-900">
              Show warning before session expires
            </span>
          </label>

          {preferences.showWarning && (
            <div className="ml-7">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Warning Time
              </label>
              <select
                value={preferences.warningTime}
                onChange={(e) => setPreferences({ 
                  ...preferences, 
                  warningTime: parseInt(e.target.value) 
                })}
                disabled={!preferences.showWarning}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md disabled:bg-gray-100"
              >
                {warningOptions
                  .filter(option => option.value < preferences.sessionTimeout)
                  .map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label} before timeout
                    </option>
                  ))}
              </select>
            </div>
          )}
        </div>

        {/* Active Sessions Info */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Active Sessions</h3>
          <div className="bg-gray-50 rounded-md p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-medium text-gray-900">Current Session</p>
                <p className="text-sm text-gray-500">
                  Started {new Date().toLocaleTimeString()}
                </p>
              </div>
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                Active
              </span>
            </div>
            <p className="text-sm text-gray-600">
              Browser: {navigator.userAgent.substring(0, 50)}...
            </p>
          </div>

          <button
            type="button"
            className="mt-4 text-sm text-blue-600 hover:text-blue-500"
          >
            Sign out all other sessions
          </button>
        </div>

        {/* Security Tips */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Security Tips</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start">
              <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Always log out when using shared computers
            </li>
            <li className="flex items-start">
              <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Use shorter timeout periods on public devices
            </li>
            <li className="flex items-start">
              <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Enable two-factor authentication for added security
            </li>
          </ul>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Save Preferences
        </button>
      </div>
    </div>
  );
};