import { configureStore } from '@reduxjs/toolkit';
import { apiSlice } from './slices/apiSlice';
import authReducer from './slices/authSlice';
import matchesReducer from './slices/matchesSlice';
import leaderboardReducer from './slices/leaderboardSlice';

export const store = configureStore({
  reducer: {
    // RTK Query API slice
    [apiSlice.reducerPath]: apiSlice.reducer,
    
    // Existing slices
    auth: authReducer,
    matches: matchesReducer,
    leaderboard: leaderboardReducer,
  },
  
  // Add RTK Query middleware with proper serialization handling
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types from serializability checks
        ignoredActions: [
          'persist/PERSIST', 
          'persist/REHYDRATE',
          // Ignore all RTK Query actions
          'api/executeQuery/pending',
          'api/executeQuery/fulfilled',
          'api/executeQuery/rejected',
          'api/executeMutation/pending',
          'api/executeMutation/fulfilled',
          'api/executeMutation/rejected'
        ],
        // Ignore Firebase Timestamp objects in state paths
        ignoredPaths: [
          'api.queries',
          'api.mutations',
          'api.provided',
          'api.subscriptions',
          'api.config'
        ],
        // Ignore non-serializable values in actions
        ignoredActionPaths: [
          'payload.timestamp',
          'payload.createdAt',
          'payload.completedDate',
          'payload.scheduledDate',
          'meta.arg.originalArgs'
        ]
      },
    }).concat(apiSlice.middleware),
    
  devTools: process.env.NODE_ENV !== 'production',
});