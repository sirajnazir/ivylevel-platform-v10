import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'
import { store } from '@store/store'
import { logout, refreshAccessToken } from '@features/auth/authSlice'

class ApiClient {
  private client: AxiosInstance
  
  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    this.setupInterceptors()
  }
  
  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        const token = store.getState().auth.token
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )
    
    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config
        
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true
          
          try {
            await store.dispatch(refreshAccessToken())
            const newToken = store.getState().auth.token
            originalRequest.headers.Authorization = `Bearer ${newToken}`
            return this.client(originalRequest)
          } catch (refreshError) {
            store.dispatch(logout())
            window.location.href = '/login'
            return Promise.reject(refreshError)
          }
        }
        
        return Promise.reject(error)
      }
    )
  }
  
  // Student APIs
  async getStudentProfile(studentId: string) {
    const response = await this.client.get(`/unified/student/${studentId}/profile`)
    return response.data
  }
  
  async updateStudentProfile(studentId: string, data: any) {
    const response = await this.client.put(`/unified/student/${studentId}/profile`, data)
    return response.data
  }
  
  async getIvyScore(studentId: string) {
    const response = await this.client.get(`/unified/student/${studentId}/ivy-ready-score`)
    return response.data
  }
  
  async generateGamePlan(studentId: string) {
    const response = await this.client.post('/unified/generate-gameplan', { studentId })
    return response.data
  }
  
  async getSimulations(studentId: string) {
    const response = await this.client.get(`/unified/student/${studentId}/simulations`)
    return response.data
  }
  
  // AI Agent APIs
  async analyzeStudent(data: any) {
    const response = await this.client.post('/unified/analyze-student', data)
    return response.data
  }
  
  async detectCrisis(studentId: string) {
    const response = await this.client.post('/unified/detect-crisis', { studentId })
    return response.data
  }
  
  // Search API
  async searchIntelligence(query: string, filters?: any) {
    const response = await this.client.post('/unified/search-intelligence', { query, filters })
    return response.data
  }
  
  // Email Intelligence APIs
  async getEmailStats(studentId: string) {
    const response = await this.client.get(`/email/stats/${studentId}`)
    return response.data
  }
  
  async searchEmails(query: string) {
    const response = await this.client.post('/email/search', { query })
    return response.data
  }
  
  // Benchmarking APIs
  async getRedditBenchmarks(studentId: string) {
    const response = await this.client.get(`/unified/student/${studentId}/reddit-benchmarks`)
    return response.data
  }
  
  async getChettyInsights(studentId: string) {
    const response = await this.client.get(`/unified/student/${studentId}/chetty-insights`)
    return response.data
  }
  
  // Generic request method
  async request<T>(config: AxiosRequestConfig): Promise<T> {
    const response = await this.client.request<T>(config)
    return response.data
  }
}

export const apiClient = new ApiClient()