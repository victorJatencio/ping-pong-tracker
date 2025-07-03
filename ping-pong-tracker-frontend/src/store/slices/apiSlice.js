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
} from "firebase/firestore";
import { db } from "../../config/firebase";

// Firebase base query (for existing Firebase functionality)
const firebaseBaseQuery = () => async (args) => {
  try {
    if (args.collection && args.queryConstraints) {
      const q = query(
        collection(db, args.collection),
        ...args.queryConstraints
      );
      const querySnapshot = await getDocs(q);
      const documents = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      return { data: documents };
    }

    if (args.collection && !args.queryConstraints && !args.docId) {
      const querySnapshot = await getDocs(collection(db, args.collection));
      const documents = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      return { data: documents };
    }

    if (args.collection && args.docId && args.data) {
      const docRef = doc(db, args.collection, args.docId);
      await updateDoc(docRef, args.data);
      return { data: { success: true, docId: args.docId } };
    }

    if (args.collection && args.createData) {
      const docRef = await addDoc(
        collection(db, args.collection),
        args.createData
      );
      return { data: { success: true, docId: docRef.id } };
    }

    console.error("Invalid arguments provided to firebaseBaseQuery:", args);
    return {
      error: { status: "INVALID_ARGS", error: "Invalid arguments provided" },
    };
  } catch (error) {
    console.error("Firebase operation error:", error);
    return { error: { status: "FIREBASE_ERROR", error: error.message } };
  }
};

// Backend API base query (for new backend endpoints)
const backendBaseQuery = fetchBaseQuery({
  baseUrl: 'http://localhost:5000/api',
  prepareHeaders: (headers) => {
    headers.set('Content-Type', 'application/json');
    return headers;
  },
});

export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: firebaseBaseQuery(), // Default to Firebase for existing queries
  tagTypes: ["Match", "User", "Invitation", "PlayerStats", "BackendPlayerStats", "Leaderboard"],
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

          // Query for matches where user is either player1 or player2
          const q1 = query(
            collection(db, "matches"),
            where("player1Id", "==", userId),
            orderBy("date", "desc"),
            limit(10)
          );

          const q2 = query(
            collection(db, "matches"),
            where("player2Id", "==", userId),
            orderBy("date", "desc"),
            limit(10)
          );

          // Execute both queries
          const [snapshot1, snapshot2] = await Promise.all([
            getDocs(q1),
            getDocs(q2),
          ]);

          // Combine results
          const matches1 = snapshot1.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          const matches2 = snapshot2.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          // Merge and deduplicate matches
          const allUserMatches = [...matches1, ...matches2];
          const uniqueMatches = allUserMatches.filter(
            (match, index, self) =>
              index === self.findIndex((m) => m.id === match.id)
          );

          // Sort by date and limit to 5 most recent
          const sortedMatches = uniqueMatches
            .sort((a, b) => {
              const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
              const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
              return dateB - dateA; // Most recent first
            })
            .slice(0, 5);

          console.log("  - Total user matches found:", uniqueMatches.length);
          console.log("  - Recent matches (top 5):", sortedMatches.length);

          return { data: sortedMatches };
        } catch (error) {
          console.error("getRecentMatches error:", error);
          return { error: { status: "FIREBASE_ERROR", error: error.message } };
        }
      },
      providesTags: ["Match"],
    }),

    getPendingInvitations: builder.query({
      queryFn: async (userId) => {
        try {
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
            createdAt: doc.data().createdAt?.toDate
              ? doc.data().createdAt.toDate()
              : doc.data().createdAt,
            scheduledDate: doc.data().scheduledDate?.toDate
              ? doc.data().scheduledDate.toDate()
              : doc.data().scheduledDate,
            updatedAt: doc.data().updatedAt?.toDate
              ? doc.data().updatedAt.toDate()
              : doc.data().updatedAt,
          }));

          return { data: documents };
        } catch (error) {
          console.error("getPendingInvitations error:", error);
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
      query: ({ invitationId }) => ({
        collection: "invitations",
        docId: invitationId,
        data: {
          status: "accepted",
          updatedAt: serverTimestamp(),
        },
      }),
      async onQueryStarted(
        { invitationId, currentUserId },
        { dispatch, queryFulfilled }
      ) {
        const patchResult = dispatch(
          apiSlice.util.updateQueryData(
            "getPendingInvitations",
            currentUserId,
            (draft) => {
              const index = draft.findIndex((inv) => inv.id === invitationId);
              if (index !== -1) {
                draft.splice(index, 1);
              }
            }
          )
        );
        try {
          await queryFulfilled;
          dispatch(apiSlice.util.invalidateTags(["Match"]));
        } catch (error) {
          patchResult.undo();
          console.error("Failed to accept invitation:", error);
        }
      },
    }),

    declineInvitation: builder.mutation({
      query: ({ invitationId }) => ({
        collection: "invitations",
        docId: invitationId,
        data: {
          status: "declined",
          updatedAt: serverTimestamp(),
        },
      }),
      async onQueryStarted(
        { invitationId, currentUserId },
        { dispatch, queryFulfilled }
      ) {
        const patchResult = dispatch(
          apiSlice.util.updateQueryData(
            "getPendingInvitations",
            currentUserId,
            (draft) => {
              const index = draft.findIndex((inv) => inv.id === invitationId);
              if (index !== -1) {
                draft.splice(index, 1);
              }
            }
          )
        );
        try {
          await queryFulfilled;
        } catch (error) {
          patchResult.undo();
          console.error("Failed to decline invitation:", error);
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
          console.log("🔍 getPlayerStatsFromBackend - calling backend API for userId:", userId);
          
          const result = await backendBaseQuery(
            {
              url: `stats/player/${userId}`,
              method: 'GET',
            },
            api,
            extraOptions
          );

          console.log("🔍 Backend API result:", result);

          if (result.error) {
            console.error("Backend API error:", result.error);
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
              playerId: userId
            }
          };

        } catch (error) {
          console.error("getPlayerStatsFromBackend error:", error);
          return {
            error: {
              status: 'FETCH_ERROR',
              error: error.message
            }
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
              url: 'stats/leaderboard/preview',
              method: 'GET',
            },
            api,
            extraOptions
          );

          console.log("🔍 Leaderboard API result:", result);

          if (result.error) {
            console.error("Leaderboard API error:", result.error);
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
          console.error("getLeaderboardPreview error:", error);
          return {
            error: {
              status: 'FETCH_ERROR',
              error: error.message
            }
          };
        }
      },
      providesTags: ["Leaderboard"],
    }),

    // Sync player stats (trigger backend sync)
    syncPlayerStats: builder.mutation({
      queryFn: async (userId, api, extraOptions) => {
        try {
          console.log("🔍 syncPlayerStats - calling backend API for userId:", userId);
          
          const result = await backendBaseQuery(
            {
              url: `stats/player/${userId}/sync`,
              method: 'POST',
            },
            api,
            extraOptions
          );

          console.log("🔍 Sync API result:", result);
          return result;

        } catch (error) {
          console.error("syncPlayerStats error:", error);
          return {
            error: {
              status: 'FETCH_ERROR',
              error: error.message
            }
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
              url: 'stats/players',
              method: 'GET',
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
          console.error("getAllPlayerStatsFromBackend error:", error);
          return {
            error: {
              status: 'FETCH_ERROR',
              error: error.message
            }
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
  useGetRecentMatchesQuery,
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

