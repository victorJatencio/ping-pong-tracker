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
  tagTypes: ["Match", "User", "Invitation", "Stats"],
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
      query: (userId) => ({
        collection: "matches",
        queryConstraints: [
          where("status", "==", "in-progress"),
          orderBy("scheduledDate", "asc"),
        ],
      }),
      providesTags: ["Match"],
      transformResponse: (response, meta, arg) => {
        // Filter matches where user is a participant
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
} = apiSlice;
