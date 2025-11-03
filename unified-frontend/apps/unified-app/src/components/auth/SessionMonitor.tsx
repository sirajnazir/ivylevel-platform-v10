import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { cognitoAuthService } from '../../services/auth/cognitoAuthService';

interface SessionMonitorProps {
  warningTime?: number; // Time before timeout to show warning (in minutes)
  timeoutDuration?: number; // Session timeout duration (in minutes)
  onSessionExpired?: () => void;
}

export const SessionMonitor: React.FC<SessionMonitorProps> = ({
  warningTime = 5,
  timeoutDuration = 30,
  onSessionExpired
}) => {
  const { isAuthenticated, logout } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const logoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Convert minutes to milliseconds
  const warningTimeMs = warningTime * 60 * 1000;
  const timeoutDurationMs = timeoutDuration * 60 * 1000;

  const resetTimers = useCallback(() => {
    // Clear existing timers
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
    }
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }

    // Hide warning
    setShowWarning(false);
    setTimeRemaining(null);

    // Update last activity
    lastActivityRef.current = Date.now();

    if (!isAuthenticated) return;

    // Set warning timer
    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
      setTimeRemaining(warningTime * 60); // Convert to seconds for countdown

      // Start countdown
      countdownTimerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev === null || prev <= 1) {
            if (countdownTimerRef.current) {
              clearInterval(countdownTimerRef.current);
            }
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    }, timeoutDurationMs - warningTimeMs);

    // Set logout timer
    logoutTimerRef.current = setTimeout(async () => {
      setShowWarning(false);
      await logout();
      if (onSessionExpired) {
        onSessionExpired();
      } else {
        window.location.href = '/login?reason=session_expired';
      }
    }, timeoutDurationMs);
  }, [isAuthenticated, logout, onSessionExpired, timeoutDurationMs, warningTimeMs, warningTime]);

  const handleUserActivity = useCallback(() => {
    const now = Date.now();
    const timeSinceLastActivity = now - lastActivityRef.current;

    // Only reset if more than 1 second has passed (debounce)
    if (timeSinceLastActivity > 1000) {
      resetTimers();
    }
  }, [resetTimers]);

  const handleExtendSession = async () => {
    try {
      // Validate session with backend
      const isValid = await cognitoAuthService.validateSession();
      if (isValid) {
        resetTimers();
      } else {
        // Session invalid, force logout
        await logout();
        window.location.href = '/login?reason=session_invalid';
      }
    } catch (error) {
      console.error('Failed to extend session:', error);
    }
  };

  const handleLogoutNow = async () => {
    setShowWarning(false);
    await logout();
    window.location.href = '/login';
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    // Activity events to monitor
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleUserActivity);
    });

    // Initial timer setup
    resetTimers();

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserActivity);
      });
      
      if (warningTimerRef.current) {
        clearTimeout(warningTimerRef.current);
      }
      if (logoutTimerRef.current) {
        clearTimeout(logoutTimerRef.current);
      }
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, [isAuthenticated, handleUserActivity, resetTimers]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!showWarning || !isAuthenticated) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        
        <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-sm sm:p-6">
          <div>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
              <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="mt-3 text-center sm:mt-5">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                Session Expiring Soon
              </h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  Your session will expire in{' '}
                  <span className="font-semibold text-gray-900">
                    {timeRemaining !== null ? formatTime(timeRemaining) : '...'}
                  </span>
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Would you like to continue your session?
                </p>
              </div>
            </div>
          </div>
          <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
            <button
              type="button"
              onClick={handleExtendSession}
              className="inline-flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:col-start-2 sm:text-sm"
            >
              Continue Session
            </button>
            <button
              type="button"
              onClick={handleLogoutNow}
              className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:col-start-1 sm:mt-0 sm:text-sm"
            >
              Logout Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};