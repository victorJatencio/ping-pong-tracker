import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import matchesReducer from './slices/matchesSlice';
import leaderboardReducer from './slices/leaderboardSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    matches: matchesReducer,
    leaderboard: leaderboardReducer,
  },
  // Optional: Add middleware or other configuration
  middleware: (getDefaultMiddleware) => 
    getDefaultMiddleware({
      serializableCheck: false, // Useful if you store non-serializable values
    }),
  devTools: process.env.NODE_ENV !== 'production',
});
