import React, { useState } from 'react';
import { cognitoAuthService } from '../../services/auth/cognitoAuthService';

interface MFASetupProps {
  onComplete?: () => void;
}

export const MFASetup: React.FC<MFASetupProps> = ({ onComplete }) => {
  const [step, setStep] = useState<'intro' | 'setup' | 'verify'>('intro');
  const [secretCode, setSecretCode] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [session, setSession] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleStartSetup = async () => {
    setLoading(true);
    setError('');

    const result = await cognitoAuthService.setupMFA();

    if (result.success && result.secret_code) {
      setSecretCode(result.secret_code);
      setQrCodeUrl(result.qr_code_url || '');
      setSession(result.session || '');
      setStep('setup');
    } else {
      setError(result.message || 'Failed to setup MFA');
    }

    setLoading(false);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await cognitoAuthService.verifyMFA(verificationCode, session);

    if (result.success) {
      setStep('verify');
      setTimeout(() => {
        if (onComplete) onComplete();
      }, 3000);
    } else {
      setError(result.message || 'Invalid verification code');
    }

    setLoading(false);
  };

  const generateQRCode = (url: string) => {
    // In production, you'd use a QR code library
    // For now, we'll show the URL that users can manually enter
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
  };

  if (step === 'intro') {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Enable Two-Factor Authentication
        </h2>

        <div className="space-y-4 mb-6">
          <p className="text-gray-600">
            Two-factor authentication adds an extra layer of security to your account. 
            You'll need to enter a code from your authenticator app in addition to your password when signing in.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Before you begin:</h3>
            <ul className="list-disc list-inside text-blue-800 space-y-1">
              <li>Install an authenticator app on your phone (Google Authenticator, Microsoft Authenticator, Authy, etc.)</li>
              <li>Make sure you have your phone nearby</li>
              <li>Keep your recovery codes in a safe place</li>
            </ul>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="flex justify-end space-x-3">
          {onComplete && (
            <button
              onClick={onComplete}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleStartSetup}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Setting up...' : 'Enable 2FA'}
          </button>
        </div>
      </div>
    );
  }

  if (step === 'setup') {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Scan QR Code
        </h2>

        <div className="space-y-6">
          <div className="text-center">
            <div className="inline-block p-4 bg-white border-2 border-gray-300 rounded-lg">
              {qrCodeUrl ? (
                <img 
                  src={generateQRCode(qrCodeUrl)} 
                  alt="MFA QR Code" 
                  className="w-48 h-48"
                />
              ) : (
                <div className="w-48 h-48 bg-gray-100 flex items-center justify-center">
                  <span className="text-gray-500">Loading QR Code...</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-md">
            <h3 className="font-semibold text-gray-700 mb-2">Can't scan the code?</h3>
            <p className="text-sm text-gray-600 mb-2">
              Enter this secret key manually in your authenticator app:
            </p>
            <div className="bg-white p-3 rounded border border-gray-300 font-mono text-sm break-all">
              {secretCode}
            </div>
          </div>

          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Enter Verification Code
              </label>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                maxLength={6}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-center text-2xl font-mono"
              />
              <p className="mt-1 text-sm text-gray-500">
                Enter the 6-digit code from your authenticator app
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                {error}
              </div>
            )}

            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => {
                  setStep('intro');
                  setVerificationCode('');
                  setError('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading || verificationCode.length !== 6}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Verifying...' : 'Verify & Enable'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
          <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Two-Factor Authentication Enabled!
        </h2>
        <p className="text-gray-600 mb-6">
          Your account is now protected with two-factor authentication.
        </p>
        
        <div className="bg-amber-50 border border-amber-200 rounded-md p-4 text-left mb-6">
          <h3 className="font-semibold text-amber-900 mb-2">Important:</h3>
          <p className="text-sm text-amber-800">
            Save these recovery codes in a safe place. You can use them to access your account if you lose your authenticator device.
          </p>
          <div className="mt-3 bg-white p-3 rounded border border-amber-300">
            <p className="text-xs text-gray-500 mb-2">Recovery codes will be shown here in production</p>
          </div>
        </div>

        {onComplete && (
          <button
            onClick={onComplete}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Done
          </button>
        )}
      </div>
    </div>
  );
};