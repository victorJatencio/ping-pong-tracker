import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { db } from "../../config/firebase";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from "firebase/firestore";

// Import utility functions (you'll need to create these files)
// import { validatePingPongScore } from "../../utils/scoreValidation";
// import { createScoreUpdateNotification, createScoreAuditEntry, storeAuditEntry } from "../../utils/auditTrail";
// import { generateNotificationId } from "../../utils/notifications";

// Temporary placeholder functions (remove these when you create the actual utility files)
const validatePingPongScore = (score1, score2) => ({ isValid: true, errors: [] });
const createScoreUpdateNotification = (user, match, score) => ({});
const createScoreAuditEntry = (...args) => ({});
const storeAuditEntry = (entry) => Promise.resolve();
const generateNotificationId = () => `notif_${Date.now()}`;

// Firebase-based base query function
const firebaseBaseQuery = () => async (args) => {
  try {
    const { collection: collectionName, queryConstraints = [], docId } = args;

    if (docId) {
      // Single document query
      const docRef = doc(db, collectionName, docId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return { data: { id: docSnap.id, ...docSnap.data() } };
      } else {
        return { error: { status: 404, data: "Document not found" } };
      }
    } else {
      // Collection query
      const collectionRef = collection(db, collectionName);
      let q = collectionRef;

      if (queryConstraints.length > 0) {
        q = query(collectionRef, ...queryConstraints);
      }

      const querySnapshot = await getDocs(q);
      const data = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });

      return { data };
    }
  } catch (error) {
    console.error("Firebase query error:", error);
    return { error: { status: "FIREBASE_ERROR", data: error.message } };
  }
};

// Create the API slice
export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: firebaseBaseQuery(),
  tagTypes: ["Match", "User", "Invitation", "Stats", "Notifications", "OngoingMatches", "RecentMatches"],
  endpoints: (builder) => ({
    // Get all recent matches (for Recent Matches card - shows matches from ALL users)
    getAllRecentMatches: builder.query({
      query: () => ({
        collection: "matches",
        queryConstraints: [
          where("status", "==", "completed"),
          orderBy("completedDate", "desc"),
          limit(10),
        ],
      }),
      providesTags: ["Match"],
      transformResponse: (response) => {
        // Transform Firebase timestamps to readable dates
        return response.map((match) => ({
          ...match,
          completedDate:
            match.completedDate?.toDate?.() || new Date(match.completedDate),
          scheduledDate:
            match.scheduledDate?.toDate?.() || new Date(match.scheduledDate),
        }));
      },
    }),

    // Get user-specific matches (for user-specific data)
    getUserMatches: builder.query({
      query: (userId) => ({
        collection: "matches",
        queryConstraints: [
          where("status", "==", "completed"),
          orderBy("completedDate", "desc"),
        ],
      }),
      providesTags: ["Match"],
      transformResponse: (response, meta, arg) => {
        // Filter matches for the specific user and transform dates
        return response
          .filter((match) => match.player1Id === arg || match.player2Id === arg)
          .map((match) => ({
            ...match,
            completedDate:
              match.completedDate?.toDate?.() || new Date(match.completedDate),
            scheduledDate:
              match.scheduledDate?.toDate?.() || new Date(match.scheduledDate),
          }));
      },
    }),

    // Get upcoming matches
    getUpcomingMatches: builder.query({
      query: () => ({
        collection: "matches",
        queryConstraints: [
          where("status", "in", ["scheduled", "in-progress"]),
          orderBy("scheduledDate", "asc"),
          limit(10),
        ],
      }),
      providesTags: ["Match"],
      transformResponse: (response) => {
        return response.map((match) => ({
          ...match,
          completedDate:
            match.completedDate?.toDate?.() || new Date(match.completedDate),
          scheduledDate:
            match.scheduledDate?.toDate?.() || new Date(match.scheduledDate),
        }));
      },
    }),

    // Get ongoing matches (matches that need score updates)
    getOngoingMatches: builder.query({
      query: (userId) => {
        const baseQuery = {
          collection: "matches",
          where: [
            ["participants", "array-contains", userId],
            ["status", "in", ["scheduled", "in-progress"]],
          ],
          orderBy: [["scheduledDate", "asc"]],
        };

        return {
          url: "/firebase/query",
          method: "POST",
          body: baseQuery,
        };
      },
      transformResponse: (response) => {
        if (!response?.documents) return { matches: [], total: 0 };
        const matches = response.documents.map((doc) => ({
          id: doc.id,
          ...doc.data,
          scheduledDate:
            doc.data.scheduledDate?.toDate?.() ||
            new Date(doc.data.scheduledDate),
          createdAt:
            doc.data.createdAt?.toDate?.() || new Date(doc.data.createdAt),
          updatedAt:
            doc.data.updatedAt?.toDate?.() || new Date(doc.data.updatedAt),
        }));

        return {
          matches,
          total: matches.length,
        };
      },
      providesTags: (result) => [
        "OngoingMatches",
        ...(result?.matches || []).map(({ id }) => ({ type: "Match", id })),
      ],
      keepUnusedDataFor: 300, // 5 minutes cache
      refetchOnMountOrArgChange: 30, // Refetch if data is older than 30 seconds
    }),

    // Update match score with anti-cheating validation
    updateMatchScore: builder.mutation({
      query: ({
        matchId,
        player1Score,
        player2Score,
        currentUserId,
        notes,
      }) => {
        // Client-side validation before sending to server
        const validation = validatePingPongScore(player1Score, player2Score);
        if (!validation.isValid) {
          throw new Error(validation.errors.join(", "));
        }

        const updateData = {
          player1Score: parseInt(player1Score),
          player2Score: parseInt(player2Score),
          status: "completed",
          completedDate: new Date(),
          updatedAt: new Date(),
          lastUpdatedBy: currentUserId,
          winnerId: player1Score > player2Score ? "player1" : "player2",
          loserId: player1Score > player2Score ? "player2" : "player1",
          notes: notes || "",
        };

        return {
          url: "/firebase/update",
          method: "POST",
          body: {
            collection: "matches",
            docId: matchId,
            data: updateData,
          },
        };
      },
      invalidatesTags: (result, error, { matchId }) => [
        "OngoingMatches",
        "RecentMatches",
        "UserStats",
        { type: "Match", id: matchId },
      ],
      onQueryStarted: async (arg, { dispatch, queryFulfilled, getState }) => {
        // Optimistic update for immediate UI feedback
        const {
          matchId,
          player1Score,
          player2Score,
          currentUserId,
          match,
          opponent,
        } = arg;
        const patchResult = dispatch(
          apiSlice.util.updateQueryData(
            "getOngoingMatches",
            currentUserId,
            (draft) => {
              const matchIndex = draft.matches.findIndex(
                (m) => m.id === matchId
              );
              if (matchIndex !== -1) {
                draft.matches[matchIndex] = {
                  ...draft.matches[matchIndex],
                  player1Score: parseInt(player1Score),
                  player2Score: parseInt(player2Score),
                  status: "completed",
                  completedDate: new Date(),
                  updatedAt: new Date(),
                  lastUpdatedBy: currentUserId,
                  winnerId: player1Score > player2Score ? "player1" : "player2",
                  loserId: player1Score > player2Score ? "player2" : "player1",
                  _optimistic: true, // Flag for UI feedback
                };
              }
            }
          )
        );

        try {
          const result = await queryFulfilled;

          // Create notifications for score update
          const finalScore = `${player1Score}-${player2Score}`;
          const currentUser = getState().auth?.currentUser; // Assuming auth state exists

          // Notify opponent about score update
          if (opponent?.id) {
            const scoreNotification = createScoreUpdateNotification(
              currentUser,
              match,
              finalScore
            );

            dispatch(
              apiSlice.endpoints.createNotification.initiate(scoreNotification)
            );
          }

          // Create audit trail entry
          const auditEntry = createScoreAuditEntry(
            matchId,
            currentUserId,
            {
              player1Score: match.player1Score,
              player2Score: match.player2Score,
            },
            {
              player1Score: parseInt(player1Score),
              player2Score: parseInt(player2Score),
            },
            validatePingPongScore(player1Score, player2Score)
          );

          // Store audit entry
          await storeAuditEntry(auditEntry);
        } catch (error) {
          // Revert optimistic update on failure
          patchResult.undo();
          // Show error notification to user
          console.error("Failed to update match score:", error);
        }
      },
    }),

    // Update match status (for state transitions)
    updateMatchStatus: builder.mutation({
      query: ({ matchId, status, notes, currentUserId }) => ({
        url: "/firebase/update",
        method: "POST",
        body: {
          collection: "matches",
          docId: matchId,
          data: {
            status,
            notes: notes || "",
            updatedAt: new Date(),
            lastUpdatedBy: currentUserId,
            ...(status === "in-progress" && { startedAt: new Date() }),
            ...(status === "cancelled" && { cancelledAt: new Date() }),
          },
        },
      }),
      invalidatesTags: (result, error, { matchId }) => [
        "OngoingMatches",
        { type: "Match", id: matchId },
      ],
      onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
        // Optimistic update for status changes
        const { matchId, status, currentUserId } = arg;
        const patchResult = dispatch(
          apiSlice.util.updateQueryData(
            "getOngoingMatches",
            currentUserId,
            (draft) => {
              const matchIndex = draft.matches.findIndex(
                (m) => m.id === matchId
              );
              if (matchIndex !== -1) {
                draft.matches[matchIndex] = {
                  ...draft.matches[matchIndex],
                  status,
                  updatedAt: new Date(),
                  lastUpdatedBy: currentUserId,
                  _optimistic: true,
                };
              }
            }
          )
        );

        try {
          await queryFulfilled;
        } catch (error) {
          patchResult.undo();
          console.error("Failed to update match status:", error);
        }
      },
    }),

    // Get pending invitations
    getPendingInvitations: builder.query({
      query: (userId) => ({
        collection: "invitations",
        queryConstraints: [
          where("receiverId", "==", userId),
          where("status", "==", "pending"),
          orderBy("createdAt", "desc"),
          limit(10),
        ],
      }),
      providesTags: ["Invitation"],
      transformResponse: (response) => {
        return response.map((invitation) => ({
          ...invitation,
          createdAt:
            invitation.createdAt?.toDate?.() || new Date(invitation.createdAt),
          scheduledDate:
            invitation.scheduledDate?.toDate?.() ||
            new Date(invitation.scheduledDate),
        }));
      },
    }),

    // Get all users (for opponent names and avatars)
    getAllUsers: builder.query({
      query: () => ({
        collection: "users",
      }),
      providesTags: ["User"],
      transformResponse: (response) => {
        // Convert array to object for easier lookup
        const usersMap = {};
        response.forEach((user) => {
          usersMap[user.id] = user;
        });
        return usersMap;
      },
    }),

    // Get user stats
    getUserStats: builder.query({
      query: (userId) => ({
        collection: "userStats",
        docId: userId,
      }),
      providesTags: ["Stats"],
    }),

    // Get leaderboard data
    getLeaderboard: builder.query({
      query: () => ({
        collection: "userStats",
        queryConstraints: [orderBy("totalWins", "desc"), limit(10)],
      }),
      providesTags: ["Stats"],
    }),

    // Get notifications for current user
    getNotifications: builder.query({
      query: (userId) => ({
        url: "/firebase/query",
        method: "POST",
        body: {
          collection: "notifications",
          where: [
            ["recipientId", "==", userId],
            ["archived", "==", false],
          ],
          orderBy: [["createdAt", "desc"]],
          limit: 50,
        },
      }),
      transformResponse: (response) => {
        if (!response?.documents) return { notifications: [], unreadCount: 0 };

        const notifications = response.documents.map((doc) => ({
          id: doc.id,
          ...doc.data,
          createdAt:
            doc.data.createdAt?.toDate?.() || new Date(doc.data.createdAt),
        }));

        const unreadCount = notifications.filter((n) => !n.read).length;

        return { notifications, unreadCount };
      },
      providesTags: ["Notifications"],
      keepUnusedDataFor: 300,
    }),

    // Create notification
    createNotification: builder.mutation({
      query: (notification) => ({
        url: "/firebase/create",
        method: "POST",
        body: {
          collection: "notifications",
          data: {
            ...notification,
            createdAt: new Date(),
            read: false,
            archived: false,
            id: generateNotificationId(),
          },
        },
      }),
      invalidatesTags: ["Notifications"],
      onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
        // Optimistic update for immediate UI feedback
        const tempId = `temp-${Date.now()}`;
        const optimisticNotification = {
          id: tempId,
          ...arg,
          createdAt: new Date(),
          read: false,
          archived: false,
          _optimistic: true,
        };

        const patchResult = dispatch(
          apiSlice.util.updateQueryData(
            "getNotifications",
            arg.recipientId,
            (draft) => {
              draft.notifications.unshift(optimisticNotification);
              draft.unreadCount += 1;
            }
          )
        );

        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),

    // Mark notification as read
    markNotificationRead: builder.mutation({
      query: ({ notificationId, userId }) => ({
        url: "/firebase/update",
        method: "POST",
        body: {
          collection: "notifications",
          docId: notificationId,
          data: {
            read: true,
            readAt: new Date(),
          },
        },
      }),
      invalidatesTags: ["Notifications"],
      onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
        // Optimistic update
        const patchResult = dispatch(
          apiSlice.util.updateQueryData("getNotifications", arg.userId, (draft) => {
            const notification = draft.notifications.find(
              (n) => n.id === arg.notificationId
            );
            if (notification && !notification.read) {
              notification.read = true;
              notification.readAt = new Date();
              draft.unreadCount = Math.max(0, draft.unreadCount - 1);
            }
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),

    // Mark all notifications as read
    markAllNotificationsRead: builder.mutation({
      query: (userId) => ({
        url: "/firebase/batch-update",
        method: "POST",
        body: {
          collection: "notifications",
          where: [
            ["recipientId", "==", userId],
            ["read", "==", false],
          ],
          data: {
            read: true,
            readAt: new Date(),
          },
        },
      }),
      invalidatesTags: ["Notifications"],
      onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
        // Optimistic update
        const patchResult = dispatch(
          apiSlice.util.updateQueryData("getNotifications", arg, (draft) => {
            draft.notifications.forEach((notification) => {
              if (!notification.read) {
                notification.read = true;
                notification.readAt = new Date();
              }
            });
            draft.unreadCount = 0;
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),
  }),
});

// Export hooks for usage in functional components
export const {
  useGetAllRecentMatchesQuery,
  useGetUserMatchesQuery,
  useGetUpcomingMatchesQuery,
  useGetOngoingMatchesQuery,
  useGetPendingInvitationsQuery,
  useGetAllUsersQuery,
  useGetUserStatsQuery,
  useGetLeaderboardQuery,
  useGetNotificationsQuery,
  useCreateNotificationMutation,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useUpdateMatchScoreMutation,
  useUpdateMatchStatusMutation,
} = apiSlice;

