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
          'api/executeQuery/pending',
          'api/executeQuery/fulfilled',
          'api/executeQuery/rejected',
          'api/subscriptions/unsubscribeQueryResult',
          'api/config/middlewareRegistered',
        ],
        // Ignore Firebase Timestamp objects in state paths
        ignoredPaths: [
          'api.queries',
          'api.mutations',
          // Specific paths for date fields that RTK Query might put in the cache
          // These regex patterns will match 'completedDate', 'createdAt', 'updatedAt'
          // within any query result data array.
          /^api\.queries\..*\.data\.\d+\.completedDate$/,
          /^api\.queries\..*\.data\.\d+\.createdAt$/,
          /^api\.queries\..*\.data\.\d+\.updatedAt$/,
        ],
        // Ignore non-serializable values in actions
        ignoredActionPaths: [
          'payload.timestamp',
          'payload.createdAt',
          'payload.completedDate',
          'payload.scheduledDate',
          'meta.arg.originalArgs'
        ],
      },
      
    }).concat(apiSlice.middleware),
    
  devTools: process.env.NODE_ENV !== 'production',
});