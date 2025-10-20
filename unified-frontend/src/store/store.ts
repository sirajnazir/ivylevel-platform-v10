import { configureStore } from '@reduxjs/toolkit'
import { setupListeners } from '@reduxjs/toolkit/query'
import authReducer from '@features/auth/authSlice'
import studentReducer from '@features/student/studentSlice'
import coachReducer from '@features/coach/coachSlice'
import uiReducer from '@features/ui/uiSlice'
import { apiSlice } from '@services/api/apiSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    student: studentReducer,
    coach: coachReducer,
    ui: uiReducer,
    [apiSlice.reducerPath]: apiSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }).concat(apiSlice.middleware),
})

setupListeners(store.dispatch)

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch