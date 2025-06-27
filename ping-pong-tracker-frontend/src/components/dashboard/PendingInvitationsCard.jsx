import React, { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import {
  useGetSentInvitationsQuery,
  useGetReceivedInvitationsQuery,
  useGetAllUsersQuery,
  useAcceptInvitationMutation,
  useDeclineInvitationMutation,
} from "../../store/slices/apiSlice";
import DashboardCard from "../common/Card";
import SentInvitationItem from "./SentInvitationItem";
import ReceivedInvitationItem from "./ReceivedInvitationItem";

const PendingInvitationsCard = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState("received"); // 'received' or 'sent'
  const [error, setError] = useState(null); // Step 8: Error state
  const [successMessage, setSuccessMessage] = useState(null); // Step 8: Success state

  // Fetch sent invitations (where user is sender)
  const {
    data: sentInvitations,
    error: sentError,
    isLoading: sentLoading,
  } = useGetSentInvitationsQuery(currentUser?.uid, {
    skip: !currentUser?.uid,
    pollingInterval: 30000,
  });

  // Fetch received invitations (where user is recipient)
  const {
    data: receivedInvitations,
    error: receivedError,
    isLoading: receivedLoading,
  } = useGetReceivedInvitationsQuery(currentUser?.uid, {
    skip: !currentUser?.uid,
    pollingInterval: 30000,
  });

  // Fetch all users for enrichment
  const { data: usersData } = useGetAllUsersQuery();

  // Mutation hooks for accept/decline actions
  const [acceptInvitation, { isLoading: isAccepting }] = useAcceptInvitationMutation();
  const [declineInvitation, { isLoading: isDeclining }] = useDeclineInvitationMutation();

  const isLoading = sentLoading || receivedLoading;
  const hasError = sentError || receivedError;

  // Get counts for tab display
  const receivedCount = receivedInvitations?.length || 0;
  const sentCount =
    sentInvitations?.filter((inv) => inv.status === "pending").length || 0;

  // Step 8: Auto-clear messages after 5 seconds
  useEffect(() => {
    if (error || successMessage) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccessMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, successMessage]);

  // Updated handleAccept with proper error handling
  const handleAccept = async (invitationId) => {
    try {
      setError(null); // Clear previous errors
      setSuccessMessage(null); // Clear previous success messages
      
      await acceptInvitation({
        invitationId,
        currentUserId: currentUser.uid,
      }).unwrap();

      // Step 8: Show success message
      setSuccessMessage("Invitation accepted successfully!");
      console.log("Invitation accepted successfully");
    } catch (error) {
      console.error("Failed to accept invitation:", error);
      // Step 8: Show user-friendly error message
      setError("Failed to accept invitation. Please try again.");
    }
  };

  // Updated handleDecline with proper error handling
  const handleDecline = async (invitationId) => {
    try {
      setError(null); // Clear previous errors
      setSuccessMessage(null); // Clear previous success messages
      
      await declineInvitation({
        invitationId,
        currentUserId: currentUser.uid,
      }).unwrap();

      // Step 8: Show success message
      setSuccessMessage("Invitation declined successfully!");
      console.log("Invitation declined successfully");
    } catch (error) {
      console.error("Failed to decline invitation:", error);
      // Step 8: Show user-friendly error message
      setError("Failed to decline invitation. Please try again.");
    }
  };

  if (isLoading) {
    return <DashboardCard title="Pending Invitations" isLoading={true} />;
  }

  if (hasError) {
    return (
      <DashboardCard
        title="Pending Invitations"
        footerAction={
          <button className="btn btn-primary btn-sm">View All Matches</button>
        }
      >
        <div className="text-center py-8">
          <p className="text-red-600">Error loading invitations</p>
        </div>
      </DashboardCard>
    );
  }

  const currentInvitations =
    activeTab === "received" ? receivedInvitations : sentInvitations;
  const isEmpty = !currentInvitations || currentInvitations.length === 0;

  return (
    <DashboardCard
      title="Pending Invitations"
      footerAction={
        <button className="btn btn-primary btn-sm">View All Matches</button>
      }
    >
      {/* Step 8: Error and Success Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          <div className="flex justify-between items-center">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-700 font-bold"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          <div className="flex justify-between items-center">
            <span>{successMessage}</span>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-green-500 hover:text-green-700 font-bold"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex border-b mb-4">
        <button
          onClick={() => setActiveTab("received")}
          className={`px-4 py-2 text-sm font-medium border-b-2 ${
            activeTab === "received"
              ? "border-blue-500 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Received ({receivedCount})
        </button>
        <button
          onClick={() => setActiveTab("sent")}
          className={`px-4 py-2 text-sm font-medium border-b-2 ${
            activeTab === "sent"
              ? "border-blue-500 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Sent ({sentCount})
        </button>
      </div>

      {/* Content */}
      {isEmpty ? (
        <div className="text-center py-8">
          <p className="text-lg font-semibold text-gray-600">
            No {activeTab} invitations
          </p>
          <p className="text-sm text-gray-500 mt-2">
            {activeTab === "received"
              ? "You don't have any pending match invitations at the moment."
              : "You haven't sent any invitations recently."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {currentInvitations.map((invitation) => {
            if (activeTab === "received") {
              const sender = usersData?.[invitation.senderId];
              return (
                <ReceivedInvitationItem
                  key={invitation.id}
                  invitation={invitation}
                  sender={sender}
                  currentUserId={currentUser?.uid}
                  onAccept={handleAccept}
                  onDecline={handleDecline}
                  isAccepting={isAccepting}
                  isDeclining={isDeclining}
                />
              );
            } else {
              const recipient = usersData?.[invitation.recipientId];
              return (
                <SentInvitationItem
                  key={invitation.id}
                  invitation={invitation}
                  recipient={recipient}
                />
              );
            }
          })}
        </div>
      )}
    </DashboardCard>
  );
};

export default PendingInvitationsCard;

