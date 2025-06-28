// /src/store/slices/apiSlice.js

import { createApi } from "@reduxjs/toolkit/query/react";
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
import { db } from "../../config/firebase"; // Ensure this path is correct

// Firebase-based base query function with direct Firebase calls
const firebaseBaseQuery = () => async (args) => {
  try {
    console.log("firebaseBaseQuery received args:", args); // Log 1: What firebaseBaseQuery receives

    // Handle query with constraints
    if (args.collection && args.queryConstraints) {
      console.log("firebaseBaseQuery: Handling query with constraints.");
      console.log("  Collection:", args.collection);
      console.log("  Query Constraints:", args.queryConstraints); // Log 2: The exact query constraints being used
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

    // Handle simple collection query (no constraints)
    if (args.collection && !args.queryConstraints && !args.docId) {
      console.log("firebaseBaseQuery: Handling simple collection query.");
      console.log("  Collection:", args.collection);
      const querySnapshot = await getDocs(collection(db, args.collection));
      const documents = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      return { data: documents };
    }

    // Handle update operation
    if (args.collection && args.docId && args.data) {
      console.log("firebaseBaseQuery: Handling update operation.");
      console.log("  Collection:", args.collection, "DocId:", args.docId, "Data:", args.data);
      const docRef = doc(db, args.collection, args.docId);
      await updateDoc(docRef, args.data);
      return { data: { success: true, docId: args.docId } };
    }

    // Handle create operation
    if (args.collection && args.createData) {
      console.log("firebaseBaseQuery: Handling create operation.");
      console.log("  Collection:", args.collection, "CreateData:", args.createData);
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

export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: firebaseBaseQuery(),
  tagTypes: ["Match", "User", "Invitation", "PlayerStats"],
  endpoints: (builder) => ({
    // QUERIES
    getAllUsers: builder.query({
      query: () => ({
        collection: "users",
      }),
      providesTags: ["User"],
      transformResponse: (response) => {
        const usersMap = response.reduce((acc, user) => {
          acc[user.uid] = user;
          return acc;
        }, {});
        return usersMap;
      },
    }),
    getRecentMatches: builder.query({
      query: (userId) => ({
        collection: "matches",
        queryConstraints: [
          where("players", "array-contains", userId),
          orderBy("date", "desc"),
          limit(5),
        ],
      }),
      providesTags: ["Match"],
    }),
    getPendingInvitations: builder.query({
      query: (userId) => {
        console.log("getPendingInvitations query function received userId:", userId, " (Type:", typeof userId, ")"); // Log 3: What the query function receives
        // Explicitly check for undefined, null, or empty string
        if (userId === undefined || userId === null || userId === "") {
          console.warn("getPendingInvitations: userId is invalid (undefined, null, or empty string), returning empty data.");
          return { data: [] };
        }
        const queryObj = {
          collection: "invitations",
          queryConstraints: [
            where("recipientId", "==", userId),
            where("status", "==", "pending"),
            orderBy("createdAt", "desc"),
          ],
        };
        console.log("getPendingInvitations returning query object:", queryObj); // Log 4: The exact query object being returned
        return queryObj;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Invitation", id })),
              { type: "Invitation", id: "LIST" },
            ]
          : [{ type: "Invitation", id: "LIST" }],
      // Transform Firebase Timestamps to JS Date objects
      transformResponse: (response) => {
        return response.map((invitation) => ({
          ...invitation,
          createdAt: invitation.createdAt?.toDate ? invitation.createdAt.toDate() : invitation.createdAt,
          scheduledDate: invitation.scheduledDate?.toDate ? invitation.scheduledDate.toDate() : invitation.scheduledDate,
          // Add other timestamp fields if they exist
          updatedAt: invitation.updatedAt?.toDate ? invitation.updatedAt.toDate() : invitation.updatedAt,
        }));
      },
    }),
    getPlayerStats: builder.query({
        query: (userId) => ({
            collection: 'playerStats',
            queryConstraints: [where('userId', '==', userId)]
        }),
        providesTags: (result, error, userId) => [{ type: 'PlayerStats', id: userId }],
    }),

    // MUTATIONS
    acceptInvitation: builder.mutation({
      query: ({ invitationId }) => ({
        collection: "invitations",
        docId: invitationId,
        data: {
          status: "accepted",
          updatedAt: serverTimestamp(),
        },
      }),
      async onQueryStarted({ invitationId, currentUserId }, { dispatch, queryFulfilled }) {
        // Optimistically remove the invitation from the pending list
        const patchResult = dispatch(
          apiSlice.util.updateQueryData('getPendingInvitations', currentUserId, (draft) => {
            const index = draft.findIndex(inv => inv.id === invitationId);
            if (index !== -1) {
              draft.splice(index, 1);
            }
          })
        );
        try {
          await queryFulfilled;
          // On success, invalidate other tags to refetch data, e.g., matches list
          dispatch(apiSlice.util.invalidateTags(['Match']));
        } catch (error) {
          // On error, undo the optimistic update
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
      async onQueryStarted({ invitationId, currentUserId }, { dispatch, queryFulfilled }) {
        // Optimistically remove the invitation from the pending list
        const patchResult = dispatch(
          apiSlice.util.updateQueryData('getPendingInvitations', currentUserId, (draft) => {
            const index = draft.findIndex(inv => inv.id === invitationId);
            if (index !== -1) {
              draft.splice(index, 1);
            }
          })
        );
        try {
          await queryFulfilled;
        } catch (error) {
          // On error, undo the optimistic update
          patchResult.undo();
          console.error("Failed to decline invitation:", error);
        }
      },
    }),
  }),
});

export const {
  useGetAllUsersQuery,
  useGetRecentMatchesQuery,
  useGetPendingInvitationsQuery,
  useGetPlayerStatsQuery,
  useAcceptInvitationMutation,
  useDeclineInvitationMutation,
} = apiSlice;
