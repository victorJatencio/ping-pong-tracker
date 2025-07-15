import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import {
  getDocs,
  getDoc,
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
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { db, storage, auth } from "../../config/firebase";

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
    "UserProfile",
    "UserProfileStats", // Delete
  ],
  endpoints: (builder) => ({
    // ========================================
    // EXISTING FIREBASE ENDPOINTS (Keep as-is)
    // ========================================
    // getAllUsers: builder.query({
    //   query: () => ({
    //     collection: "users",
    //   }),
    //   providesTags: ["User"],
    //   transformResponse: (response) => {
    //     console.log("🔍 getAllUsers Debug:");
    //     console.log("  - Raw response:", response);

    //     const usersMap = response.reduce((acc, user) => {
    //       // Try different possible ID fields
    //       const userId = user.uid || user.id || user.userId;
    //       console.log(
    //         `  - Processing user: ${user.name || user.email}, ID: ${userId}`
    //       );

    //       if (userId) {
    //         acc[userId] = user;
    //       } else {
    //         console.warn("  - User has no valid ID field:", user);
    //       }
    //       return acc;
    //     }, {});

    //     console.log("  - Final usersMap:", usersMap);
    //     return usersMap;
    //   },
    // }),
    getAllUsers: builder.query({
      query: () => ({
        collection: "users",
      }),
      queryFn: async () => {
        try {
          // ✅ Check authentication before making Firebase call
          if (!auth.currentUser) {
            console.log(
              "🔒 getAllUsers: User not authenticated, returning empty object"
            );
            return { data: {} };
          }

          console.log("👥 Fetching all users...");
          const usersSnapshot = await getDocs(collection(db, "users"));
          const users = {};

          usersSnapshot.forEach((doc) => {
            const userData = doc.data();
            const userId = userData.uid || doc.id || userData.userId;
            if (userId) {
              users[userId] = { id: doc.id, ...userData };
            }
          });

          console.log(
            "✅ All users fetched successfully:",
            Object.keys(users).length,
            "users"
          );
          return { data: users };
        } catch (error) {
          console.error("❌ getAllUsers error:", error);

          // ✅ Handle permission-denied errors gracefully
          if (error.code === "permission-denied") {
            console.log(
              "🔒 getAllUsers: Permission denied - returning empty object"
            );
            return { data: {} };
          }

          return { data: {} };
        }
      },
      providesTags: ["User"],
      transformResponse: (response) => {
        console.log("🔍 getAllUsers Debug:");
        console.log("  - Raw response:", response);

        if (!response || typeof response !== "object") {
          console.log("  - Invalid response, returning empty object");
          return {};
        }

        // If response is already in the correct format, return it
        if (!Array.isArray(response)) {
          return response;
        }

        // Transform array to object (fallback)
        const usersMap = response.reduce((acc, user) => {
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
    // FILTERS API ENDPOINTS
    // ========================================
    getFilteredMatches: builder.query({
      async queryFn(filters) {
        try {
          console.log(
            "🔍 getFilteredMatches Debug: Received filters:",
            filters
          );

          const {
            userId, // The current logged-in user ID (now optional for "Show All Matches")
            opponentId, // Specific opponent ID to filter by
            status, // "completed", "scheduled", "in-progress"
            result, // "won", "lost" (relative to userId)
            startDate, // ISO string
            endDate, // ISO string
            page = 1, // For pagination
            pageSize = 10, // For pagination
          } = filters;

          const matchesRef = collection(db, "matches");
          let queryConstraints = [];

          // 1. Player Filter (userId and/or opponentId)
          let playerConditions = [];

          if (userId) {
            // ONLY apply this if userId is provided (i.e., not showing all matches)
            playerConditions.push(where("player1Id", "==", userId));
            playerConditions.push(where("player2Id", "==", userId));
          }

          if (opponentId) {
            // If filtering by a specific opponent, ensure the current user is also involved
            // This logic needs to be careful if userId is NOT present (i.e., showAllMatches is true)
            if (userId) {
              // If userId is present, filter by opponent AND current user
              playerConditions = [
                and(
                  where("player1Id", "==", userId),
                  where("player2Id", "==", opponentId)
                ),
                and(
                  where("player1Id", "==", opponentId),
                  where("player2Id", "==", userId)
                ),
              ];
            } else {
              // If no userId (showAllMatches is true), just filter by opponent
              playerConditions = [
                where("player1Id", "==", opponentId),
                where("player2Id", "==", opponentId),
              ];
            }
          }

          if (playerConditions.length > 0) {
            if (playerConditions.length === 1) {
              queryConstraints.push(playerConditions[0]);
            } else {
              queryConstraints.push(or(...playerConditions));
            }
          } else if (!userId && !opponentId) {
            // If no specific user or opponent is selected AND userId is not provided (showAllMatches is true),
            // then we want ALL matches. No player conditions needed.
          } else if (userId && !opponentId) {
            // If userId is provided but no specific opponent, ensure we filter by current user's matches
            // This case is handled by the initial 'if (userId)' block
          }

          // 2. Status Filter
          if (status && status !== "all") {
            queryConstraints.push(where("status", "==", status));
          }

          // 3. Date Range Filter
          if (startDate) {
            const startTimestamp = new Date(startDate);
            queryConstraints.push(where("completedDate", ">=", startTimestamp));
          }
          if (endDate) {
            const endTimestamp = new Date(endDate);
            // To include the entire end day, set time to end of day
            endTimestamp.setHours(23, 59, 59, 999);
            queryConstraints.push(where("completedDate", "<=", endTimestamp));
          }

          // Combine all top-level constraints with 'and' if necessary
          let finalQueryConstraints = [];
          if (queryConstraints.length > 1) {
            finalQueryConstraints.push(and(...queryConstraints));
          } else if (queryConstraints.length === 1) {
            finalQueryConstraints.push(queryConstraints[0]);
          }

          // Ordering and Pagination
          finalQueryConstraints.push(orderBy("completedDate", "desc")); // Always order by date

          // Firestore pagination: startAt/startAfter with limit
          // For simplicity, we'll fetch more than pageSize and slice client-side for now
          // Or implement proper cursor-based pagination later
          finalQueryConstraints.push(limit(pageSize * page)); // Fetch enough for current page

          const q = query(matchesRef, ...finalQueryConstraints);
          const querySnapshot = await getDocs(q);
          const documents = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          // Apply client-side filtering for 'result'
          let filteredMatches = documents;

          // Filter by 'result' (won/lost) - this must be client-side as it depends on currentUserId
          if (userId && result && (result === "won" || result === "lost")) {
            filteredMatches = filteredMatches.filter((match) => {
              const isWinner = match.winnerId === userId;
              return (
                (result === "won" && isWinner) ||
                (result === "lost" && !isWinner)
              );
            });
          }

          // Apply client-side pagination (slice to current page's data)
          const startIndex = (page - 1) * pageSize;
          const paginatedMatches = filteredMatches.slice(
            startIndex,
            startIndex + pageSize
          );

          console.log(
            "Fetched filtered matches:",
            paginatedMatches.length,
            "out of",
            filteredMatches.length
          );
          const serializedMatches = convertTimestamps(paginatedMatches);
          return { data: serializedMatches };
        } catch (error) {
          console.error("❌ getFilteredMatches error:", error);
          return { error: { status: "FIREBASE_ERROR", error: error.message } };
        }
      },
      providesTags: ["Match"], // Invalidate when matches change
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

    getLeaderboardData: builder.query({
      queryFn: async ({ filters = {}, pagination = {} }) => {
        try {
          console.log("🔍 getLeaderboardData called with:", {
            filters,
            pagination,
          });

          const {
            search = "",
            winRateMin = 0,
            winRateMax = 100,
            matchesMin = 0,
            streakMin = 0,
            timePeriod = "all-time",
            sortBy = "rank",
            sortOrder = "asc",
          } = filters;

          const { page = 1, pageSize = 10 } = pagination;

          // Fetch all playerStats documents
          const leaderboardQuery = collection(db, "playerStats");
          const snapshot = await getDocs(leaderboardQuery);
          const leaderboardData = [];

          console.log("📊 Raw playerStats documents:", snapshot.docs.length);

          snapshot.forEach((doc) => {
            const data = doc.data();

            // Apply client-side filtering
            const playerWinRate = data.winRate || 0; // Already in 0-100 format
            const playerMatches = data.gamesPlayed || 0;
            const playerStreak = data.currentStreak || 0;

            // Filter by matches minimum
            if (matchesMin > 0 && playerMatches < matchesMin) {
              return;
            }

            // Filter by win rate range
            if (playerWinRate < winRateMin || playerWinRate > winRateMax) {
              return;
            }

            // Filter by streak minimum
            if (streakMin > 0 && playerStreak < streakMin) {
              return;
            }

            leaderboardData.push({
              id: doc.id,
              playerId: data.playerId || doc.id,
              rank: 0, // We'll calculate this after sorting
              displayName: "Loading...", // Will be filled from users collection
              totalMatches: playerMatches,
              wins: data.totalWins || 0,
              losses: data.totalLosses || 0,
              winRate: playerWinRate / 100, // Convert to 0-1 format for consistency
              currentStreak: playerStreak,
              longestStreak: data.maxWinStreak || 0,
              score: data.rankingScore || 0,
              photoURL: null, // Will be filled from users collection
              lastActive: data.lastMatchDate || null,
            });
          });

          // Sort the data
          const sortField =
            sortBy === "rank"
              ? "score" // Use score for ranking
              : sortBy === "winRate"
              ? "winRate"
              : sortBy === "matches"
              ? "totalMatches"
              : sortBy === "streak"
              ? "currentStreak"
              : "score";

          leaderboardData.sort((a, b) => {
            const aVal = a[sortField];
            const bVal = b[sortField];

            if (sortBy === "rank" || sortField === "score") {
              // For ranking, higher score = better rank (descending)
              return sortOrder === "asc" ? bVal - aVal : aVal - bVal;
            } else {
              // For other fields, normal sorting
              return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
            }
          });

          // Assign ranks after sorting
          leaderboardData.forEach((player, index) => {
            player.rank = index + 1;
          });

          // Apply search filter (after we get user names)
          let filteredData = leaderboardData;
          if (search.trim()) {
            filteredData = leaderboardData.filter((player) =>
              player.displayName.toLowerCase().includes(search.toLowerCase())
            );
          }

          // Apply pagination
          const startIndex = (page - 1) * pageSize;
          const endIndex = startIndex + pageSize;
          const paginatedData = filteredData.slice(startIndex, endIndex);

          const totalCount = filteredData.length;
          const totalPages = Math.ceil(totalCount / pageSize);

          console.log("✅ getLeaderboardData success:", {
            totalDocuments: snapshot.docs.length,
            filteredCount: filteredData.length,
            paginatedCount: paginatedData.length,
            currentPage: page,
          });

          return {
            data: {
              leaderboard: paginatedData,
              pagination: {
                currentPage: page,
                pageSize,
                totalCount,
                totalPages,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1,
              },
            },
          };
        } catch (error) {
          console.error("❌ getLeaderboardData error:", error);
          return {
            error: {
              status: "FIREBASE_ERROR",
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

    getUserMatchHistory: builder.query({
      queryFn: async ({ userId, filters = {}, pagination = {} }) => {
        try {
          console.log("🔍 getUserMatchHistory called with:", {
            userId,
            filters,
            pagination,
          });

          const {
            result = "all", // 'won', 'lost', 'all'
            startDate = null,
            endDate = null,
            sortBy = "date",
            sortOrder = "desc",
          } = filters;

          const { page = 1, pageSize = 10 } = pagination;

          if (!userId) {
            throw new Error("User ID is required");
          }

          // Build the base query for user's matches
          let matchQuery = collection(db, "matches");

          // Create conditions array for filtering
          const conditions = [];

          // User participation condition (player1 OR player2)
          const userCondition = or(
            where("player1Id", "==", userId),
            where("player2Id", "==", userId)
          );
          conditions.push(userCondition);

          // Only completed matches
          conditions.push(where("status", "==", "completed"));

          // Date range filtering
          if (startDate) {
            conditions.push(where("completedDate", ">=", startDate));
          }
          if (endDate) {
            conditions.push(where("completedDate", "<=", endDate));
          }

          // Result filtering (won/lost)
          if (result === "won") {
            conditions.push(where("winnerId", "==", userId));
          } else if (result === "lost") {
            conditions.push(where("loserId", "==", userId));
          }

          // Combine all conditions with AND
          if (conditions.length > 1) {
            matchQuery = query(matchQuery, and(...conditions));
          } else {
            matchQuery = query(matchQuery, conditions[0]);
          }

          // Add ordering
          const orderField = sortBy === "date" ? "completedDate" : sortBy;
          matchQuery = query(matchQuery, orderBy(orderField, sortOrder));

          console.log("🔍 Executing match history query...");
          const snapshot = await getDocs(matchQuery);

          console.log(
            `✅ Found ${snapshot.docs.length} matches for user ${userId}`
          );

          // Process the matches
          const allMatches = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            // Ensure dates are properly formatted
            completedDate:
              doc.data().completedDate?.toDate?.() || doc.data().completedDate,
            createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
            scheduledDate:
              doc.data().scheduledDate?.toDate?.() || doc.data().scheduledDate,
          }));

          // Apply pagination
          const startIndex = (page - 1) * pageSize;
          const endIndex = startIndex + pageSize;
          const paginatedMatches = allMatches.slice(startIndex, endIndex);

          const totalCount = allMatches.length;
          const totalPages = Math.ceil(totalCount / pageSize);

          console.log("✅ getUserMatchHistory success:", {
            totalMatches: totalCount,
            currentPage: page,
            pageSize,
            totalPages,
            returnedMatches: paginatedMatches.length,
          });

          return {
            data: {
              matches: paginatedMatches,
              pagination: {
                currentPage: page,
                pageSize,
                totalCount,
                totalPages,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1,
              },
            },
          };
        } catch (error) {
          console.error("❌ getUserMatchHistory error:", error);
          return {
            error: {
              status: "FIREBASE_ERROR",
              error: error.message,
            },
          };
        }
      },
      providesTags: (result, error, { userId }) => [
        { type: "Match", id: "USER_HISTORY" },
        { type: "Match", id: userId },
      ],
    }),

    // ========================================
    // Profile API ENDPOINTS
    // ========================================
    // getUserProfile: builder.query({
    //   queryFn: async (userId) => {
    //     try {
    //       if (!userId) {
    //         return {
    //           error: { status: "INVALID_USER", error: "No user ID provided" },
    //         };
    //       }

    //       console.log(
    //         "🔍 getUserProfile - fetching profile for userId:",
    //         userId
    //       );

    //       const userDocRef = doc(db, "users", userId);
    //       const userDoc = await getDoc(userDocRef);

    //       if (!userDoc.exists()) {
    //         return {
    //           error: { status: "USER_NOT_FOUND", error: "User not found" },
    //         };
    //       }

    //       const userData = { id: userDoc.id, ...userDoc.data() };
    //       const serializedData = convertTimestamps(userData);

    //       console.log("✅ getUserProfile - profile data:", serializedData);
    //       return { data: serializedData };
    //     } catch (error) {
    //       console.error("❌ getUserProfile error:", error);
    //       return { error: { status: "FIREBASE_ERROR", error: error.message } };
    //     }
    //   },
    //   providesTags: (result, error, userId) => [
    //     { type: "UserProfile", id: userId },
    //   ],
    // }),
    getUserProfile: builder.query({
      queryFn: async (userId) => {
        try {
          // ✅ CRITICAL FIX: Check authentication before making Firebase call
          if (!auth.currentUser) {
            console.log(
              "🔒 getUserProfile: User not authenticated, returning null"
            );
            return { data: null };
          }

          if (!userId) {
            console.log(
              "🔒 getUserProfile: No userId provided, returning null"
            );
            return { data: null };
          }

          console.log(
            "🔍 getUserProfile - fetching profile for userId:",
            userId
          );

          const userDocRef = doc(db, "users", userId);
          const userDoc = await getDoc(userDocRef);

          if (!userDoc.exists()) {
            console.log(
              "❌ getUserProfile: User document not found for:",
              userId
            );
            return {
              error: { status: "USER_NOT_FOUND", error: "User not found" },
            };
          }

          const userData = { id: userDoc.id, ...userDoc.data() };
          const serializedData = convertTimestamps(userData);

          console.log("✅ getUserProfile - profile data:", serializedData);
          return { data: serializedData };
        } catch (error) {
          console.error("❌ getUserProfile error:", error);

          // ✅ CRITICAL FIX: Handle permission-denied errors gracefully
          if (error.code === "permission-denied") {
            console.log(
              "🔒 getUserProfile: Permission denied - likely during auth transition, returning null"
            );
            return { data: null };
          }

          // ✅ CRITICAL FIX: Handle other Firebase errors gracefully
          if (error.code === "unavailable") {
            console.log(
              "🌐 getUserProfile: Firebase unavailable, returning null"
            );
            return { data: null };
          }

          return { error: { status: "FIREBASE_ERROR", error: error.message } };
        }
      },
      providesTags: (result, error, userId) => [
        { type: "UserProfile", id: userId },
      ],
    }),

    updateUserProfile: builder.mutation({
      queryFn: async ({ userId, profileData }) => {
        try {
          if (!userId) {
            return {
              error: { status: "INVALID_USER", error: "No user ID provided" },
            };
          }

          console.log(
            "🔍 updateUserProfile - updating profile for userId:",
            userId
          );
          console.log("  - Profile data:", profileData);

          const userDocRef = doc(db, "users", userId);
          const updateData = {
            ...profileData,
            updatedAt: serverTimestamp(),
          };

          await updateDoc(userDocRef, updateData);

          console.log("✅ updateUserProfile - profile updated successfully");
          return { data: { success: true, userId } };
        } catch (error) {
          console.error("❌ updateUserProfile error:", error);
          return { error: { status: "FIREBASE_ERROR", error: error.message } };
        }
      },
      invalidatesTags: (result, error, { userId }) => [
        { type: "UserProfile", id: userId },
        { type: "User", id: "LIST" },
      ],
    }),

    getUserProfileStats: builder.query({
      queryFn: async (userId, api, extraOptions) => {
        try {
          if (!userId) {
            return {
              error: { status: "INVALID_USER", error: "No user ID provided" },
            };
          }

          console.log(
            "🔍 getUserProfileStats - fetching stats for userId:",
            userId
          );

          // Use the existing backend API for consistency
          const result = await backendBaseQuery(
            {
              url: `stats/player/${userId}`,
              method: "GET",
            },
            api,
            extraOptions
          );

          if (result.error) {
            console.error("❌ Backend API error:", result.error);
            return result;
          }

          if (result.data && result.data.success && result.data.data) {
            console.log("✅ Profile stats data:", result.data.data);
            return { data: result.data.data };
          }

          // Fallback for empty response
          console.warn("⚠️ No profile stats found, returning defaults");
          return {
            data: {
              totalWins: 0,
              winStreak: 0,
              maxWinStreak: 0,
              gamesPlayed: 0,
              totalLosses: 0,
              playerId: userId,
              winRate: 0,
              rank: null,
            },
          };
        } catch (error) {
          console.error("❌ getUserProfileStats error:", error);
          return {
            error: {
              status: "FETCH_ERROR",
              error: error.message,
            },
          };
        }
      },
      providesTags: (result, error, userId) => [
        { type: "UserProfileStats", id: userId },
      ],
    }), // Delete

    uploadProfileImage: builder.mutation({
      queryFn: async ({ userId, imageFile }) => {
        try {
          if (!userId) {
            return {
              error: { status: "INVALID_USER", error: "No user ID provided" },
            };
          }

          if (!imageFile) {
            return {
              error: {
                status: "INVALID_FILE",
                error: "No image file provided",
              },
            };
          }

          console.log(
            "🔍 uploadProfileImage - uploading image for userId:",
            userId
          );
          console.log("  - File:", imageFile.name, imageFile.size, "bytes");

          // Create a reference to the user's profile image
          const imageRef = ref(
            storage,
            `profile-images/${userId}/${Date.now()}_${imageFile.name}`
          );

          // Upload the file
          const uploadResult = await uploadBytes(imageRef, imageFile);
          console.log(
            "✅ Image uploaded successfully:",
            uploadResult.metadata.fullPath
          );

          // Get the download URL
          const downloadURL = await getDownloadURL(uploadResult.ref);
          console.log("✅ Download URL obtained:", downloadURL);

          // ✅ FIXED: Update the user's profile with the new photo URL AND set useDefaultAvatar to false
          const userDocRef = doc(db, "users", userId);
          await updateDoc(userDocRef, {
            photoURL: downloadURL,
            useDefaultAvatar: false, // ✅ CRITICAL FIX: Set to false when uploading custom image
            updatedAt: serverTimestamp(),
          });

          console.log(
            "✅ User profile updated with new photo URL and useDefaultAvatar set to false"
          );

          return {
            data: {
              photoURL: downloadURL,
              useDefaultAvatar: false, // ✅ Return the updated flag
              success: true,
              userId,
            },
          };
        } catch (error) {
          console.error("❌ uploadProfileImage error:", error);
          return { error: { status: "UPLOAD_ERROR", error: error.message } };
        }
      },
      invalidatesTags: (result, error, { userId }) => [
        { type: "UserProfile", id: userId },
        { type: "User", id: "LIST" },
      ],
    }),

    removeProfileImage: builder.mutation({
      queryFn: async ({ userId }) => {
        try {
          if (!userId) {
            return {
              error: { status: "INVALID_USER", error: "No user ID provided" },
            };
          }

          console.log(
            "🔍 removeProfileImage - removing image for userId:",
            userId
          );

          // ✅ FIXED: Update the user's profile to remove the photo URL AND set useDefaultAvatar to true
          const userDocRef = doc(db, "users", userId);
          await updateDoc(userDocRef, {
            photoURL: null,
            useDefaultAvatar: true, // ✅ CRITICAL FIX: Set to true when removing custom image
            updatedAt: serverTimestamp(),
          });

          console.log(
            "✅ Profile image removed successfully and useDefaultAvatar set to true"
          );

          return {
            data: {
              success: true,
              useDefaultAvatar: true, // ✅ Return the updated flag
              userId,
            },
          };
        } catch (error) {
          console.error("❌ removeProfileImage error:", error);
          return { error: { status: "REMOVE_ERROR", error: error.message } };
        }
      },
      invalidatesTags: (result, error, { userId }) => [
        { type: "UserProfile", id: userId },
        { type: "User", id: "LIST" },
      ],
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
  useGetFilteredMatchesQuery,

  // New Backend API hooks
  useGetPlayerStatsFromBackendQuery,
  useGetLeaderboardPreviewQuery,
  useSyncPlayerStatsMutation,
  useGetAllPlayerStatsFromBackendQuery,
  useGetLeaderboardDataQuery,
  useGetUserMatchHistoryQuery,

  // Profile API hooks
  useGetUserProfileQuery,
  useUpdateUserProfileMutation,
  useGetUserProfileStatsQuery, // Delete
  useUploadProfileImageMutation,
  useRemoveProfileImageMutation,
} = apiSlice;
