// API Configuration with proper URLs
const isDevelopment = import.meta.env.DEV;
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4101';

export const API_ENDPOINTS = {
  base: API_BASE_URL,
  // Auth endpoints
  auth: {
    login: `${API_BASE_URL}/api/auth/login`,
    register: `${API_BASE_URL}/api/auth/register`,
    logout: `${API_BASE_URL}/api/auth/logout`,
    refresh: `${API_BASE_URL}/api/auth/refresh`,
    me: `${API_BASE_URL}/api/auth/me`,
  },
  
  // Student endpoints
  student: {
    profile: (studentId: string) => `${API_BASE_URL}/api/students/${studentId}/profile`,
    gameplan: `${API_BASE_URL}/api/student/gameplan`,
    sessions: `${API_BASE_URL}/api/student/sessions`,
    sessionUrls: `${API_BASE_URL}/api/student/sessions/urls`,
    stream: (sessionId: string) => `${API_BASE_URL}/api/stream/${encodeURIComponent(sessionId)}`,
  },
  
  // Coach endpoints
  coach: {
    sessions: `${API_BASE_URL}/api/coach/sessions`,
    sessionUrls: `${API_BASE_URL}/api/coach/sessions/urls`,
    myStudents: `${API_BASE_URL}/api/coach/my-students`,
  },
  
  // Session endpoints
  session: {
    auxiliaryFiles: `${API_BASE_URL}/api/session/auxiliary-files`,
  },
  
  // Assessment endpoints
  assessments: {
    profile: (studentId: string) => `${API_BASE_URL}/api/assessments/${studentId}/profile`,
  },
  
  // Mobility endpoints
  mobility: {
    data: (studentId: string) => `${API_BASE_URL}/api/mobility/${studentId}/data`,
  },
};

export default API_ENDPOINTS;