import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import {
  getDocs,
  addDoc,
  doc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  or,
  and,
} from "firebase/firestore";
import { db } from "../../config/firebase";

// Helper function to safely convert Firebase Timestamps to ISO strings
const convertTimestamps = (obj) => {
  if (!obj) return obj;

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map((item) => convertTimestamps(item));
  }

  // Handle objects
  if (typeof obj === "object") {
    // Check if it's a Firebase Timestamp
    if (obj.toDate && typeof obj.toDate === "function") {
      return obj.toDate().toISOString();
    }

    // Process regular objects recursively
    const result = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        result[key] = convertTimestamps(obj[key]);
      }
    }
    return result;
  }

  // Return primitive values as is
  return obj;
};

// Firebase base query (for existing Firebase functionality)
const firebaseBaseQuery = () => async (args) => {
  try {
    console.log("🔍 firebaseBaseQuery received args:", args);

    if (args.collection && args.queryConstraints) {
      console.log("🔍 Handling query with constraints:");
      console.log("  Collection:", args.collection);
      console.log("  Query Constraints:", args.queryConstraints);

      const q = query(
        collection(db, args.collection),
        ...args.queryConstraints
      );
      const querySnapshot = await getDocs(q);
      const documents = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Convert Firebase Timestamps to ISO strings for Redux
      const serializedDocuments = convertTimestamps(documents);
      return { data: serializedDocuments };
    }

    if (args.collection && !args.queryConstraints && !args.docId) {
      console.log("🔍 Handling simple collection query:");
      console.log("  Collection:", args.collection);

      const querySnapshot = await getDocs(collection(db, args.collection));
      const documents = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Convert Firebase Timestamps to ISO strings for Redux
      const serializedDocuments = convertTimestamps(documents);
      return { data: serializedDocuments };
    }

    if (args.collection && args.docId && args.data) {
      console.log("🔍 Handling update operation:");
      console.log("  Collection:", args.collection);
      console.log("  DocId:", args.docId);
      console.log("  Data:", args.data);

      const docRef = doc(db, args.collection, args.docId);
      await updateDoc(docRef, args.data);
      return { data: { success: true, docId: args.docId } };
    }

    if (args.collection && args.createData) {
      console.log("🔍 Handling create operation:");
      console.log("  Collection:", args.collection);
      console.log("  CreateData:", args.createData);

      const docRef = await addDoc(
        collection(db, args.collection),
        args.createData
      );
      return { data: { success: true, docId: docRef.id } };
    }

    console.error("❌ Invalid arguments provided to firebaseBaseQuery:", args);
    return {
      error: { status: "INVALID_ARGS", error: "Invalid arguments provided" },
    };
  } catch (error) {
    console.error("❌ Firebase operation error:", error);
    return { error: { status: "FIREBASE_ERROR", error: error.message } };
  }
};

// Backend API base query (for new backend endpoints)
const backendBaseQuery = fetchBaseQuery({
  baseUrl: "http://localhost:5000/api",
  prepareHeaders: (headers) => {
    headers.set("Content-Type", "application/json");
    return headers;
  },
});

export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: firebaseBaseQuery(), // Default to Firebase for existing queries
  tagTypes: [
    "Match",
    "User",
    "Invitation",
    "PlayerStats",
    "BackendPlayerStats",
    "Leaderboard",
  ],
  endpoints: (builder) => ({
    // ========================================
    // EXISTING FIREBASE ENDPOINTS (Keep as-is)
    // ========================================
    getAllUsers: builder.query({
      query: () => ({
        collection: "users",
      }),
      providesTags: ["User"],
      transformResponse: (response) => {
        console.log("🔍 getAllUsers Debug:");
        console.log("  - Raw response:", response);

        const usersMap = response.reduce((acc, user) => {
          // Try different possible ID fields
          const userId = user.uid || user.id || user.userId;
          console.log(
            `  - Processing user: ${user.name || user.email}, ID: ${userId}`
          );

          if (userId) {
            acc[userId] = user;
          } else {
            console.warn("  - User has no valid ID field:", user);
          }
          return acc;
        }, {});

        console.log("  - Final usersMap:", usersMap);
        return usersMap;
      },
    }),

    // MODIFIED: getRecentMatches to use 'or' operator and filter by 'completedDate' and 'status'
    getRecentMatches: builder.query({
      queryFn: async (userId) => {
        try {
          if (!userId) {
            console.warn(
              "getRecentMatches: userId is invalid, returning empty array."
            );
            return { data: [] };
          }

          console.log("🔍 getRecentMatches Debug:");
          console.log("  - Querying for userId:", userId);

          const matchesRef = collection(db, "matches");
          const q = query(
            matchesRef,
            and(
              or(
                // Use the new OR operator for player IDs
                where("player1Id", "==", userId),
                where("player2Id", "==", userId)
              ),
              where("status", "==", "completed") // Only completed matches
            ),
            orderBy("completedDate", "desc"), // Order by most recent completedDate
            limit(5) // Limit to 5 for the dashboard card
          );

          const querySnapshot = await getDocs(q);
          const matches = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          console.log("  - Recent matches found:", matches.length);

          // Convert Firebase Timestamps to ISO strings for Redux
          const serializedMatches = convertTimestamps(matches);
          return { data: serializedMatches };
        } catch (error) {
          console.error("❌ getRecentMatches error:", error);
          return { error: { status: "FIREBASE_ERROR", error: error.message } };
        }
      },
      providesTags: ["Match"],
    }),

    getPendingInvitations: builder.query({
      queryFn: async (userId) => {
        try {
          console.log("🔍 getPendingInvitations Debug:");
          console.log("  - Querying for userId:", userId);

          if (userId === undefined || userId === null || userId === "") {
            console.warn(
              "getPendingInvitations: userId is invalid, returning empty array."
            );
            return { data: [] };
          }

          const q = query(
            collection(db, "invitations"),
            where("recipientId", "==", userId),
            where("status", "==", "pending"),
            orderBy("createdAt", "desc")
          );

          const querySnapshot = await getDocs(q);
          const documents = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          console.log("  - Found invitations:", documents.length);

          // Convert Firebase Timestamps to ISO strings for Redux
          const serializedInvitations = convertTimestamps(documents);
          return { data: serializedInvitations };
        } catch (error) {
          console.error("❌ getPendingInvitations error:", error);
          return { error: { status: "FIREBASE_ERROR", error: error.message } };
        }
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Invitation", id })),
              { type: "Invitation", id: "LIST" },
            ]
          : [{ type: "Invitation", id: "LIST" }],
    }),

    // Original Firebase playerStats query (keep for compatibility)
    getPlayerStats: builder.query({
      query: (userId) => ({
        collection: "playerStats",
        queryConstraints: [where("userId", "==", userId)],
      }),
      providesTags: (result, error, userId) => [
        { type: "PlayerStats", id: userId },
      ],
    }),

    acceptInvitation: builder.mutation({
      query: async ({ invitationId, currentUserId }) => {
        try {
          console.log("🔍 acceptInvitation Debug:");
          console.log("  - invitationId:", invitationId);

          if (!invitationId) {
            throw new Error("Invalid invitation ID");
          }

          // First, find the document with matching 'id' field
          const invitationsRef = collection(db, "invitations");
          const q = query(invitationsRef, where("id", "==", invitationId));
          const querySnapshot = await getDocs(q);

          if (querySnapshot.empty) {
            throw new Error(`No invitation found with id: ${invitationId}`);
          }

          // Get the actual document ID (path)
          const docSnapshot = querySnapshot.docs[0];
          const actualDocId = docSnapshot.id;

          // Now update using the actual document ID
          const docRef = doc(db, "invitations", actualDocId);
          await updateDoc(docRef, {
            status: "accepted",
            updatedAt: serverTimestamp(),
          });

          return { data: { success: true, docId: invitationId } };
        } catch (error) {
          console.error("❌ acceptInvitation error:", error);
          return { error: { status: "FIREBASE_ERROR", error: error.message } };
        }
      },
      async onQueryStarted(
        { invitationId, currentUserId },
        { dispatch, queryFulfilled }
      ) {
        console.log("🔍 acceptInvitation onQueryStarted:");
        console.log("  - invitationId:", invitationId);
        console.log("  - currentUserId:", currentUserId);

        // Optimistic update
        const patchResult = dispatch(
          apiSlice.util.updateQueryData(
            "getPendingInvitations",
            currentUserId,
            (draft) => {
              const index = draft.findIndex((inv) => inv.id === invitationId);
              if (index !== -1) {
                console.log(
                  "  - Removing invitation from pending list (index:",
                  index,
                  ")"
                );
                draft.splice(index, 1);
              } else {
                console.warn("  - Invitation not found in pending list");
              }
            }
          )
        );

        try {
          const result = await queryFulfilled;
          console.log("  - Invitation accepted successfully:", result);
          dispatch(apiSlice.util.invalidateTags(["Match"]));
        } catch (error) {
          console.error("❌ Failed to accept invitation:", error);
          patchResult.undo();
        }
      },
    }),

    declineInvitation: builder.mutation({
      query: ({ invitationId }) => {
        console.log("🔍 declineInvitation Debug:");
        console.log("  - invitationId:", invitationId);

        if (!invitationId) {
          throw new Error("Invalid invitation ID");
        }

        return {
          collection: "invitations",
          docId: invitationId,
          data: {
            status: "declined",
            updatedAt: serverTimestamp(),
          },
        };
      },
      async onQueryStarted(
        { invitationId, currentUserId },
        { dispatch, queryFulfilled }
      ) {
        console.log("🔍 declineInvitation onQueryStarted:");
        console.log("  - invitationId:", invitationId);
        console.log("  - currentUserId:", currentUserId);

        // Optimistic update
        const patchResult = dispatch(
          apiSlice.util.updateQueryData(
            "getPendingInvitations",
            currentUserId,
            (draft) => {
              const index = draft.findIndex((inv) => inv.id === invitationId);
              if (index !== -1) {
                console.log(
                  "  - Removing invitation from pending list (index:",
                  index,
                  ")"
                );
                draft.splice(index, 1);
              } else {
                console.warn("  - Invitation not found in pending list");
              }
            }
          )
        );

        try {
          const result = await queryFulfilled;
          console.log("  - Invitation declined successfully:", result);
        } catch (error) {
          console.error("❌ Failed to decline invitation:", error);
          patchResult.undo();
        }
      },
    }),

    // ========================================
    // NEW BACKEND API ENDPOINTS
    // ========================================

    // Get player stats from backend (synced data)
    getPlayerStatsFromBackend: builder.query({
      queryFn: async (userId, api, extraOptions) => {
        try {
          console.log(
            "🔍 getPlayerStatsFromBackend - calling backend API for userId:",
            userId
          );

          const result = await backendBaseQuery(
            {
              url: `stats/player/${userId}`,
              method: "GET",
            },
            api,
            extraOptions
          );

          console.log("🔍 Backend API result:", result);

          if (result.error) {
            console.error("❌ Backend API error:", result.error);
            return result;
          }

          if (result.data && result.data.success && result.data.data) {
            console.log("✅ Backend stats data:", result.data.data);
            return { data: result.data.data };
          }

          // Fallback for empty response
          console.warn("⚠️ No stats found, returning defaults");
          return {
            data: {
              totalWins: 0,
              winStreak: 0,
              maxWinStreak: 0,
              gamesPlayed: 0,
              totalLosses: 0,
              playerId: userId,
            },
          };
        } catch (error) {
          console.error("❌ getPlayerStatsFromBackend error:", error);
          return {
            error: {
              status: "FETCH_ERROR",
              error: error.message,
            },
          };
        }
      },
      providesTags: (result, error, userId) => [
        { type: "BackendPlayerStats", id: userId },
      ],
    }),

    // Get leaderboard preview (top 3 players)
    getLeaderboardPreview: builder.query({
      queryFn: async (arg, api, extraOptions) => {
        try {
          console.log("🔍 getLeaderboardPreview - calling backend API");

          const result = await backendBaseQuery(
            {
              url: "stats/leaderboard/preview",
              method: "GET",
            },
            api,
            extraOptions
          );

          console.log("🔍 Leaderboard API result:", result);

          if (result.error) {
            console.error("❌ Leaderboard API error:", result.error);
            return result;
          }

          if (result.data && result.data.success && result.data.data) {
            console.log("✅ Leaderboard data:", result.data.data);
            return { data: result.data.data };
          }

          // Fallback for empty response
          console.warn("⚠️ No leaderboard data found, returning empty array");
          return { data: [] };
        } catch (error) {
          console.error("❌ getLeaderboardPreview error:", error);
          return {
            error: {
              status: "FETCH_ERROR",
              error: error.message,
            },
          };
        }
      },
      providesTags: ["Leaderboard"],
    }),

    // Sync player stats (trigger backend sync)
    syncPlayerStats: builder.mutation({
      queryFn: async (userId, api, extraOptions) => {
        try {
          console.log(
            "🔍 syncPlayerStats - calling backend API for userId:",
            userId
          );

          const result = await backendBaseQuery(
            {
              url: `stats/player/${userId}/sync`,
              method: "POST",
            },
            api,
            extraOptions
          );

          console.log("🔍 Sync API result:", result);
          return result;
        } catch (error) {
          console.error("❌ syncPlayerStats error:", error);
          return {
            error: {
              status: "FETCH_ERROR",
              error: error.message,
            },
          };
        }
      },
      invalidatesTags: (result, error, userId) => [
        { type: "BackendPlayerStats", id: userId },
        { type: "PlayerStats", id: userId },
        { type: "Leaderboard" }, // Invalidate leaderboard when stats change
      ],
    }),

    // Get all player stats (for leaderboards, etc.)
    getAllPlayerStatsFromBackend: builder.query({
      queryFn: async (arg, api, extraOptions) => {
        try {
          console.log("🔍 getAllPlayerStatsFromBackend - calling backend API");

          const result = await backendBaseQuery(
            {
              url: "stats/players",
              method: "GET",
            },
            api,
            extraOptions
          );

          console.log("🔍 All stats API result:", result);

          if (result.error) {
            return result;
          }

          if (result.data && result.data.success && result.data.data) {
            return { data: result.data.data };
          }

          return { data: [] };
        } catch (error) {
          console.error("❌ getAllPlayerStatsFromBackend error:", error);
          return {
            error: {
              status: "FETCH_ERROR",
              error: error.message,
            },
          };
        }
      },
      providesTags: ["BackendPlayerStats"],
    }),
  }),
});

export const {
  // Existing Firebase hooks
  useGetAllUsersQuery,
  useGetRecentMatchesQuery, // This hook is now updated
  useGetPendingInvitationsQuery,
  useGetPlayerStatsQuery,
  useAcceptInvitationMutation,
  useDeclineInvitationMutation,

  // New Backend API hooks
  useGetPlayerStatsFromBackendQuery,
  useGetLeaderboardPreviewQuery,
  useSyncPlayerStatsMutation,
  useGetAllPlayerStatsFromBackendQuery,
} = apiSlice;
