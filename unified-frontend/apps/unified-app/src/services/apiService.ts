import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4101/api';

class ApiService {
  private client = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  constructor() {
    // Add auth interceptor
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Handle unauthorized
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Generic methods for UserImport component
  async post<T>(url: string, data: any, config?: any) {
    const response = await this.client.post<T>(url, data, config);
    return response;
  }

  async get<T>(url: string, config?: any) {
    const response = await this.client.get<T>(url, config);
    return response;
  }

  // Auth endpoints
  async login(email: string, password: string) {
    const response = await this.client.post('/auth/login', { email, password });
    return response.data;
  }

  async register(data: any) {
    const response = await this.client.post('/auth/register', data);
    return response.data;
  }

  // Student endpoints
  async getStudentProfile() {
    const response = await this.client.get('/student/profile');
    return response.data;
  }

  async updateStudentProfile(data: any) {
    const response = await this.client.put('/student/profile', data);
    return response.data;
  }

  // Coach endpoints
  async getCoachDashboard() {
    const response = await this.client.get('/coach/dashboard');
    return response.data;
  }

  async getCoachSessions() {
    const response = await this.client.get('/coach/sessions');
    return response.data;
  }

  // Admin endpoints
  async getAdminStats() {
    const response = await this.client.get('/admin/stats');
    return response.data;
  }

  async getUsers(params?: any) {
    const response = await this.client.get('/admin/users', { params });
    return response.data;
  }
}

export const apiService = new ApiService();