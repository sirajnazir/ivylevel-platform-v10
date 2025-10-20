import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Provider } from 'react-redux'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { store } from '@store/store'
import { AuthProvider } from '@features/auth/AuthProvider'
import { ThemeProvider } from '@features/theme/ThemeProvider'
import { RealtimeProvider } from '@features/realtime/RealtimeProvider'
import { Layout } from '@components/layout/Layout'
import { ProtectedRoute } from '@features/auth/ProtectedRoute'

// Pages
import { LoginPage } from '@features/auth/pages/LoginPage'
import { StudentDashboard } from '@features/student/pages/Dashboard'
import { StudentProfile } from '@features/student/pages/Profile'
import { GamePlan } from '@features/student/pages/GamePlan'
import { Tasks } from '@features/student/pages/Tasks'
import { AIChat } from '@features/ai-chat/pages/AIChat'
import { CoachDashboard } from '@features/coach/pages/Dashboard'
import { Training } from '@features/coach/pages/Training'
import { Students } from '@features/coach/pages/Students'
import { Resources } from '@features/coach/pages/Resources'
import { Analytics } from '@features/analytics/pages/Analytics'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: 1,
    },
  },
})

function App() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <Router>
          <AuthProvider>
            <ThemeProvider>
              <RealtimeProvider>
                <Routes>
                  <Route path="/login" element={<LoginPage />} />
                  
                  <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                    {/* Student Routes */}
                    <Route path="student">
                      <Route index element={<Navigate to="/student/dashboard" />} />
                      <Route path="dashboard" element={<StudentDashboard />} />
                      <Route path="profile" element={<StudentProfile />} />
                      <Route path="gameplan" element={<GamePlan />} />
                      <Route path="tasks" element={<Tasks />} />
                      <Route path="chat" element={<AIChat />} />
                    </Route>
                    
                    {/* Coach Routes */}
                    <Route path="coach">
                      <Route index element={<Navigate to="/coach/dashboard" />} />
                      <Route path="dashboard" element={<CoachDashboard />} />
                      <Route path="training" element={<Training />} />
                      <Route path="students" element={<Students />} />
                      <Route path="resources" element={<Resources />} />
                      <Route path="analytics" element={<Analytics />} />
                    </Route>
                    
                    {/* Default redirect based on role */}
                    <Route index element={<Navigate to="/student/dashboard" replace />} />
                  </Route>
                </Routes>
              </RealtimeProvider>
            </ThemeProvider>
          </AuthProvider>
        </Router>
      </QueryClientProvider>
    </Provider>
  )
}

export default App