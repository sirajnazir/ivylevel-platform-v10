/**
 * CognitoAuthService - Wrapper around simpleAuthService
 * This maintains API compatibility with old code while using the new simple auth
 */

import { simpleAuthService } from './simpleAuthService';

// Re-export for compatibility
export const cognitoAuthService = {
  login: simpleAuthService.login.bind(simpleAuthService),
  logout: simpleAuthService.logout.bind(simpleAuthService),
  getCurrentUser: simpleAuthService.getCurrentUser.bind(simpleAuthService),
  isAuthenticated: simpleAuthService.isAuthenticated.bind(simpleAuthService),

  // Stubs for methods that simple auth doesn't support
  register: async () => ({ success: false, error: 'Registration not supported' }),
  validateSession: async () => true,
  confirmEmail: async () => ({ success: false, error: 'Not supported' }),
  resendConfirmation: async () => ({ success: false, error: 'Not supported' }),
  forgotPassword: async () => ({ success: false, error: 'Not supported' }),
  resetPassword: async () => ({ success: false, error: 'Not supported' }),
  changePassword: async () => ({ success: false, error: 'Not supported' }),
  updateProfile: async () => ({ success: false, error: 'Not supported' }),
  deleteAccount: async () => ({ success: false, error: 'Not supported' }),
  refreshTokens: async () => ({ success: false, error: 'Not supported' }),
  setupMFA: async () => ({ success: false, error: 'Not supported' }),
  verifyMFA: async () => ({ success: false, error: 'Not supported' }),
  disableMFA: async () => ({ success: false, error: 'Not supported' }),
};
