const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export const api = {
  baseURL: API_BASE_URL,
  
  // Auth endpoints
  auth: {
    register: async (data) => {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return response.json();
    },
    
    login: async (email, password) => {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (data.access_token) {
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
      }
      return data;
    },
    
    logout: async () => {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    },
    
    getProfile: async () => {
      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: getAuthHeaders()
      });
      return response.json();
    }
  },
  
  // Coach endpoints
  coach: {
    getMyCoach: async () => {
      const response = await fetch(`${API_BASE_URL}/api/coach/my-assignment`, {
        headers: getAuthHeaders()
      });
      return response.json();
    }
  },
  
  // Student endpoints
  student: {
    getGamePlan: async () => {
      const response = await fetch(`${API_BASE_URL}/api/student/gameplan`, {
        headers: getAuthHeaders()
      });
      return response.json();
    },
    
    updateProgress: async (taskId, progress) => {
      const response = await fetch(`${API_BASE_URL}/api/student/progress/${taskId}`, {
        method: 'PUT',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ progress })
      });
      return response.json();
    }
  }
};

export default api;
