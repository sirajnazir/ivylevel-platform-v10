import React, { useState } from 'react';
import { cognitoAuthService } from '../../services/auth/cognitoAuthService';

interface PasswordResetProps {
  onClose?: () => void;
}

export const PasswordReset: React.FC<PasswordResetProps> = ({ onClose }) => {
  const [step, setStep] = useState<'request' | 'confirm'>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    const result = await cognitoAuthService.forgotPassword(email);

    if (result.success) {
      setMessage('Password reset code sent to your email');
      setStep('confirm');
    } else {
      setError(result.message || 'Failed to send reset code');
    }

    setLoading(false);
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    const result = await cognitoAuthService.resetPassword(email, code, newPassword);

    if (result.success) {
      setMessage('Password reset successfully. You can now login with your new password.');
      setTimeout(() => {
        if (onClose) onClose();
      }, 3000);
    } else {
      setError(result.message || 'Failed to reset password');
    }

    setLoading(false);
  };

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(password)) return 'Password must contain an uppercase letter';
    if (!/[a-z]/.test(password)) return 'Password must contain a lowercase letter';
    if (!/[0-9]/.test(password)) return 'Password must contain a number';
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return 'Password must contain a special character';
    return null;
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        {step === 'request' ? 'Reset Password' : 'Enter Reset Code'}
      </h2>

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

      {step === 'request' ? (
        <form onSubmit={handleRequestReset} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your email"
            />
            <p className="mt-1 text-sm text-gray-500">
              We'll send a reset code to this email address
            </p>
          </div>

          <div className="flex justify-between">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors ml-auto"
            >
              {loading ? 'Sending...' : 'Send Reset Code'}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleConfirmReset} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reset Code
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter the code from your email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                const error = validatePassword(e.target.value);
                if (error && e.target.value) {
                  setError(error);
                } else {
                  setError('');
                }
              }}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter new password"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Confirm new password"
            />
          </div>

          <div className="bg-gray-50 p-3 rounded-md">
            <p className="text-sm text-gray-600 font-medium mb-2">Password Requirements:</p>
            <ul className="text-sm text-gray-500 space-y-1">
              <li className="flex items-center">
                <span className={newPassword.length >= 8 ? 'text-green-500' : ''}>
                  • At least 8 characters
                </span>
              </li>
              <li className="flex items-center">
                <span className={/[A-Z]/.test(newPassword) ? 'text-green-500' : ''}>
                  • One uppercase letter
                </span>
              </li>
              <li className="flex items-center">
                <span className={/[a-z]/.test(newPassword) ? 'text-green-500' : ''}>
                  • One lowercase letter
                </span>
              </li>
              <li className="flex items-center">
                <span className={/[0-9]/.test(newPassword) ? 'text-green-500' : ''}>
                  • One number
                </span>
              </li>
              <li className="flex items-center">
                <span className={/[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ? 'text-green-500' : ''}>
                  • One special character
                </span>
              </li>
            </ul>
          </div>

          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => {
                setStep('request');
                setCode('');
                setNewPassword('');
                setConfirmPassword('');
                setError('');
              }}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={loading || !!validatePassword(newPassword) || newPassword !== confirmPassword}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};