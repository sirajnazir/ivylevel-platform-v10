const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export const api = {
  baseURL: API_BASE_URL,
  
  // Auth endpoints
  auth: {
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
    getMyStudents: async () => {
      const response = await fetch(`${API_BASE_URL}/api/coach/my-students`, {
        headers: getAuthHeaders()
      });
      return response.json();
    },
    
    updateAvailability: async (data) => {
      const response = await fetch(`${API_BASE_URL}/api/coach/update-availability`, {
        method: 'PUT',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return response.json();
    },
    
    getWorkload: async (coachId) => {
      const response = await fetch(`${API_BASE_URL}/api/coach/workload/${coachId}`, {
        headers: getAuthHeaders()
      });
      return response.json();
    }
  },
  
  // Training endpoints
  training: {
    getModules: async () => {
      const response = await fetch(`${API_BASE_URL}/api/training/modules`, {
        headers: getAuthHeaders()
      });
      return response.json();
    },
    
    completeModule: async (moduleId) => {
      const response = await fetch(`${API_BASE_URL}/api/training/complete/${moduleId}`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      return response.json();
    }
  }
};

export default api;
