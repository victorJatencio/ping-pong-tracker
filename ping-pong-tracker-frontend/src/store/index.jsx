import { configureStore } from "@reduxjs/toolkit";
import { apiSlice } from "./slices/apiSlice";
import uiReducer from "./slices/uiSlice";
// import authReducer from "./slices/authSlice";
// import matchesReducer from "./slices/matchesSlice";
// import leaderboardReducer from "./slices/leaderboardSlice";

export const store = configureStore({
  reducer: {
    // RTK Query API slices
    api: apiSlice.reducer,
    ui: uiReducer,
  },

  // Add RTK Query middleware with proper serialization handling
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          "persist/PERSIST",
          "persist/REHYDRATE",
          "api/executeQuery/pending",
          "api/executeQuery/fulfilled",
          "api/executeQuery/rejected",
          "api/executeMutation/fulfilled",
          "backendApi/executeQuery/pending",
          "backendApi/executeQuery/fulfilled",
          "backendApi/executeQuery/rejected",
          "backendApi/executeMutation/fulfilled",
        ],
        ignoredPaths: [
          "api.queries",
          "api.mutations",
          "api.provided",
          "api.subscriptions",
          "payload.createdAt",
          "payload.updatedAt",
          "payload.acceptedAt",
          "payload.declinedAt",
          "payload.scheduledDate",
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
        ignoredPaths: ["api", "backendApi"],
      },
    })
    .concat(apiSlice.middleware),

  devTools: process.env.NODE_ENV !== "production",
});

export default store;

