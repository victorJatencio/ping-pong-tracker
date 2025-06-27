import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { db } from "../../config/firebase";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";

// Import utility functions
import { generateInvitationId } from "../../utils/notifications";

// Utility functions for score validation and notifications
const validatePingPongScore = (score1, score2) => ({
  isValid: true,
  errors: [],
});

const createScoreUpdateNotification = (user, match, score) => ({
  recipientId: user?.uid,
  type: "score_update",
  title: "Match Score Updated",
  message: `Match score updated to ${score}`,
  data: { matchId: match?.id, score },
});

const createScoreAuditEntry = (...args) => ({
  id: `audit_${Date.now()}`,
  timestamp: new Date(),
  action: "score_update",
  data: args,
});

const storeAuditEntry = (entry) => {
  console.log("Audit entry:", entry);
  return Promise.resolve();
};

const generateNotificationId = () => {
  return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Firebase-based base query function with direct Firebase calls
const firebaseBaseQuery = () => async (args) => {
  try {
    const {
      collection: collectionName,
      queryConstraints = [],
      docId,
      updateData,
      createData,
    } = args;

    // Handle document updates
    if (updateData && docId) {
      const docRef = doc(db, collectionName, docId);
      await updateDoc(docRef, updateData);
      return { data: { id: docId, ...updateData } };
    }

    // Handle document creation
    if (createData) {
      const collectionRef = collection(db, collectionName);
      const docRef = await addDoc(collectionRef, createData);
      return { data: { id: docRef.id, ...createData } };
    }

    // Handle queries (existing logic)
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
  } catch (error) {
    console.error("Firebase query error:", error);
    return { error: { status: "FIREBASE_ERROR", data: error.message } };
  }
};

// Create the API slice
export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: firebaseBaseQuery(),
  tagTypes: [
    "Match",
    "User",
    "Invitation",
    "Stats",
    "Notifications",
    "OngoingMatches",
    "RecentMatches",
  ],
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
        if (!userId) {
          throw new Error("User ID is required for getOngoingMatches query");
        }

        return {
          collection: "matches",
          queryConstraints: [
            where("status", "in", ["scheduled", "in-progress"]),
            orderBy("scheduledDate", "asc"),
          ],
        };
      },
      providesTags: (result, error, userId) => [
        { type: "OngoingMatches", id: userId },
        "OngoingMatches",
      ],
      transformResponse: (response, meta, userId) => {
        if (!response || !Array.isArray(response)) {
          return [];
        }

        const userMatches = response.filter(
          (match) => match.player1Id === userId || match.player2Id === userId
        );

        return userMatches.map((match) => ({
          ...match,
          scheduledDate:
            match.scheduledDate?.toDate?.() || new Date(match.scheduledDate),
          createdAt: match.createdAt?.toDate?.() || new Date(match.createdAt),
          updatedAt: match.updatedAt?.toDate?.() || new Date(match.updatedAt),
        }));
      },
    }),

    // Get invitations SENT by current user (waiting for response)
    getSentInvitations: builder.query({
      query: (userId) => ({
        collection: "invitations",
        queryConstraints: [
          where("senderId", "==", userId),
          where("status", "in", ["pending", "accepted", "declined"]),
          orderBy("createdAt", "desc"),
          limit(10),
        ],
      }),
      providesTags: ["SentInvitation"],
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

    // Get invitations RECEIVED by current user (need to respond)
    getReceivedInvitations: builder.query({
      query: (userId) => ({
        collection: "invitations",
        queryConstraints: [
          where("recipientId", "==", userId),
          where("status", "==", "pending"),
          orderBy("createdAt", "desc"),
          limit(10),
        ],
      }),
      providesTags: ["ReceivedInvitation"],
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
        collection: "notifications",
        queryConstraints: [
          where("recipientId", "==", userId),
          where("archived", "==", false),
          orderBy("createdAt", "desc"),
          limit(50),
        ],
      }),
      transformResponse: (response) => {
        const notifications = response.map((doc) => ({
          ...doc,
          createdAt: doc.createdAt?.toDate?.() || new Date(doc.createdAt),
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
        collection: "notifications",
        createData: {
          ...notification,
          createdAt: new Date(),
          read: false,
          archived: false,
          id: generateNotificationId(),
        },
      }),
      invalidatesTags: ["Notifications"],
    }),

    // Mark notification as read
    markNotificationRead: builder.mutation({
      query: ({ notificationId, userId }) => ({
        collection: "notifications",
        docId: notificationId,
        updateData: {
          read: true,
          readAt: new Date(),
        },
      }),
      invalidatesTags: ["Notifications"],
    }),

    // Mark all notifications as read
    markAllNotificationsRead: builder.mutation({
      query: (userId) => ({
        collection: "notifications",
        // This would need a custom implementation for batch updates
        // For now, we'll handle it client-side
      }),
      invalidatesTags: ["Notifications"],
    }),

    // Accept invitation
    acceptInvitation: builder.mutation({
      query: ({ invitationId, currentUserId }) => ({
        collection: "invitations",
        docId: invitationId,
        updateData: {
          status: "accepted",
          acceptedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          acceptedBy: currentUserId,
        },
      }),
      invalidatesTags: ["ReceivedInvitation", "SentInvitation", "Match"],
      onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
        // Optimistic update for recipient
        const patchReceived = dispatch(
          apiSlice.util.updateQueryData(
            "getReceivedInvitations",
            currentUserId,
            (draft) => {
              const invitationIndex = draft.findIndex(
                (inv) => inv.id === arg.invitationId
              );
              if (invitationIndex !== -1) {
                draft.splice(invitationIndex, 1); // Remove from pending
              }
            }
          )
        );

        try {
          await queryFulfilled;
          console.log("Invitation accepted successfully");
        } catch (error) {
          console.error("Failed to accept invitation:", error);

          patchReceived.undo();
        }
      },
    }),

    // Decline invitation
    // Add this mutation after acceptInvitation
    declineInvitation: builder.mutation({
      query: ({ invitationId, currentUserId }) => ({
        collection: "invitations",
        docId: invitationId,
        updateData: {
          status: "declined",
          declinedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          declinedBy: currentUserId,
        },
      }),
      invalidatesTags: ["ReceivedInvitation", "SentInvitation", "Match"],
      onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
        const { invitationId, currentUserId } = arg;

        // Optimistic update for received invitations
        const patchReceived = dispatch(
          apiSlice.util.updateQueryData(
            "getReceivedInvitations",
            currentUserId,
            (draft) => {
              const invitationIndex = draft.findIndex(
                (inv) => inv.id === invitationId
              );
              if (invitationIndex !== -1) {
                draft.splice(invitationIndex, 1); // Remove from pending list
              }
            }
          )
        );

        try {
          await queryFulfilled;
          console.log("Invitation declined successfully");
        } catch (error) {
          console.error("Failed to decline invitation:", error);
          patchReceived.undo(); // Rollback optimistic update
        }
      },
    }),

    // Cancel invitation (senders only)
    cancelInvitation: builder.mutation({
      query: ({ invitationId, currentUserId }) => ({
        collection: "invitations",
        docId: invitationId,
        updateData: {
          status: "cancelled",
          cancelledAt: new Date(),
          updatedAt: new Date(),
        },
      }),
      invalidatesTags: ["SentInvitation", "ReceivedInvitation"],
    }),

    // Cancel match (when invitation declined)
    cancelMatch: builder.mutation({
      query: ({ matchId, currentUserId }) => ({
        collection: "matches",
        docId: matchId,
        updateData: {
          status: "cancelled",
          cancelledAt: new Date(),
          cancelledBy: currentUserId,
          updatedAt: new Date(),
        },
      }),
      invalidatesTags: ["Match", "OngoingMatches"],
    }),

    // Send invitation
    sendInvitation: builder.mutation({
      query: (invitation) => ({
        collection: "invitations",
        createData: {
          ...invitation,
          status: "pending",
          createdAt: new Date(),
          id: generateInvitationId(),
        },
      }),
      invalidatesTags: ["Invitation"],
    }),

    // Create match
    createMatch: builder.mutation({
      query: (matchData) => ({
        collection: "matches",
        createData: {
          ...matchData,
          id: `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        },
      }),
      invalidatesTags: ["Match", "OngoingMatches", "RecentMatches"],
    }),

    // Update match score
    updateMatchScore: builder.mutation({
      query: ({
        matchId,
        player1Score,
        player2Score,
        currentUserId,
        notes,
      }) => {
        const validation = validatePingPongScore(player1Score, player2Score);
        if (!validation.isValid) {
          throw new Error(validation.errors.join(", "));
        }

        return {
          collection: "matches",
          docId: matchId,
          updateData: {
            player1Score: parseInt(player1Score),
            player2Score: parseInt(player2Score),
            status: "completed",
            completedDate: new Date(),
            updatedAt: new Date(),
            lastUpdatedBy: currentUserId,
            winnerId: player1Score > player2Score ? "player1" : "player2",
            loserId: player1Score > player2Score ? "player2" : "player1",
            notes: notes || "",
          },
        };
      },
      invalidatesTags: (result, error, { matchId }) => [
        "OngoingMatches",
        "RecentMatches",
        "UserStats",
        { type: "Match", id: matchId },
      ],
    }),

    // Update match status
    updateMatchStatus: builder.mutation({
      query: ({ matchId, status, notes, currentUserId }) => ({
        collection: "matches",
        docId: matchId,
        updateData: {
          status,
          notes: notes || "",
          updatedAt: new Date(),
          lastUpdatedBy: currentUserId,
          ...(status === "in-progress" && { startedAt: new Date() }),
          ...(status === "cancelled" && { cancelledAt: new Date() }),
        },
      }),
      invalidatesTags: (result, error, { matchId }) => [
        "OngoingMatches",
        { type: "Match", id: matchId },
      ],
    }),
  }),
});

// Export hooks for usage in functional components
export const {
  useGetAllRecentMatchesQuery,
  useGetUserMatchesQuery,
  useGetUpcomingMatchesQuery,
  useGetOngoingMatchesQuery,
  useGetAllUsersQuery,
  useGetUserStatsQuery,
  useGetLeaderboardQuery,
  useGetNotificationsQuery,
  useCreateNotificationMutation,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useUpdateMatchScoreMutation,
  useUpdateMatchStatusMutation,
  useAcceptInvitationMutation,
  useDeclineInvitationMutation,
  useSendInvitationMutation,
  useCreateMatchMutation,
  useGetSentInvitationsQuery,
  useGetReceivedInvitationsQuery,
  useCancelInvitationMutation,
  useCancelMatchMutation,
} = apiSlice;
