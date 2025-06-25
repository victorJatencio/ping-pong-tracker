import { configureStore } from "@reduxjs/toolkit";
import { apiSlice } from "./slices/apiSlice";
// import authReducer from "./slices/authSlice";
// import matchesReducer from "./slices/matchesSlice";
// import leaderboardReducer from "./slices/leaderboardSlice";

export const store = configureStore({
  reducer: {
    // RTK Query API slice
    api: apiSlice.reducer,
  },

  // Add RTK Query middleware with proper serialization handling
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          "api/executeQuery/pending",
          "api/executeQuery/fulfilled",
          "api/executeQuery/rejected",
          "api/executeMutation/pending",
          "api/executeMutation/fulfilled",
          "api/executeMutation/rejected",
        ],
        ignoredPaths: [
          "api.queries",
          "api.mutations",
          "api.provided",
          "api.subscriptions",
        ],
        ignoredActionPaths: [
          "payload.createdAt",
          "payload.updatedAt",
          "payload.scheduledDate",
          "payload.completedDate",
          "meta.arg.originalArgs",
          "meta.baseQueryMeta",
        ],
      },
      immutableCheck: {
        ignoredPaths: ["api"],
      },
    }).concat(apiSlice.middleware),

  devTools: process.env.NODE_ENV !== "production",
});

export default store;