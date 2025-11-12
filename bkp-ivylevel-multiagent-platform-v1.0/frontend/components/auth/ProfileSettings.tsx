import React, { useState, useEffect } from 'react';
import { cognitoAuthService } from '../../services/auth/cognitoAuthService';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'coach' | 'admin';
  phone_number?: string;
  email_verified?: boolean;
  created_at?: string;
}

export const ProfileSettings: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    phone_number: ''
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = () => {
    const user = cognitoAuthService.getCurrentUser();
    if (user) {
      setProfile(user);
      setFormData({
        name: user.name || '',
        phone_number: user.phone_number || ''
      });
    }
    setLoading(false);
  };

  const handleEdit = () => {
    setEditMode(true);
    setMessage('');
    setError('');
  };

  const handleCancel = () => {
    setEditMode(false);
    setFormData({
      name: profile?.name || '',
      phone_number: profile?.phone_number || ''
    });
    setMessage('');
    setError('');
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setMessage('');

    const result = await cognitoAuthService.updateProfile(formData);

    if (result.success) {
      setMessage('Profile updated successfully');
      setProfile(result.user || profile);
      setEditMode(false);
    } else {
      setError(result.message || 'Failed to update profile');
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        Unable to load profile information
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Profile Settings</h2>
        {!editMode && (
          <button
            onClick={handleEdit}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Edit Profile
          </button>
        )}
      </div>

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

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <div className="flex items-center">
            <input
              type="email"
              value={profile.email}
              disabled
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
            />
            {profile.email_verified && (
              <span className="ml-2 text-green-600 flex items-center">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="ml-1 text-sm">Verified</span>
              </span>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Name
          </label>
          <input
            type="text"
            value={editMode ? formData.name : profile.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            disabled={!editMode}
            className={`w-full px-3 py-2 border rounded-md ${
              editMode 
                ? 'border-gray-300 focus:ring-blue-500 focus:border-blue-500' 
                : 'border-gray-300 bg-gray-50 text-gray-500'
            }`}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number
          </label>
          <input
            type="tel"
            value={editMode ? formData.phone_number : (profile.phone_number || '')}
            onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
            disabled={!editMode}
            placeholder="+1 (555) 123-4567"
            className={`w-full px-3 py-2 border rounded-md ${
              editMode 
                ? 'border-gray-300 focus:ring-blue-500 focus:border-blue-500' 
                : 'border-gray-300 bg-gray-50 text-gray-500'
            }`}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Role
          </label>
          <input
            type="text"
            value={profile.role}
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 capitalize"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Member Since
          </label>
          <input
            type="text"
            value={profile.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
          />
        </div>
      </div>

      {editMode && (
        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={handleCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}
    </div>
  );
};