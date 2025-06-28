import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../../contexts/AuthContext";
import {
  useGetPendingInvitationsQuery,
  useGetAllUsersQuery,
  useAcceptInvitationMutation,
  useDeclineInvitationMutation,
} from "../../store/slices/apiSlice";
import DashboardCard from "../common/Card";
import ReceivedInvitationItem from "../dashboard/ReceivedInvitationItem";
// import { Alert } from "../../../shared/Alert";

const PendingInvitationsCard = () => {
  const { currentUser } = useContext(AuthContext);
  const [enrichedInvitations, setEnrichedInvitations] = useState([]);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

   // Log currentUser.uid when the component renders
  useEffect(() => {
    console.log("PendingInvitationsCard: currentUser.uid:", currentUser?.uid);
  }, [currentUser]);

  const {
    data: invitationsData,
    isLoading: invitationsLoading,
    error: invitationsError,
  } = useGetPendingInvitationsQuery(currentUser?.uid, {
    skip: !currentUser?.uid,
  });

  const { data: usersData, isLoading: usersLoading } = useGetAllUsersQuery();

  const [acceptInvitation, { isLoading: isAccepting }] = useAcceptInvitationMutation();
  const [declineInvitation, { isLoading: isDeclining }] = useDeclineInvitationMutation();

  useEffect(() => {
    if (invitationsData && usersData) {
      const enriched = invitationsData.map((invitation) => {
        const sender = usersData[invitation.senderId];
        return {
          ...invitation,
          sender: sender || {
            uid: invitation.senderId,
            displayName: "Unknown User",
            profileImageUrl: `https://i.pravatar.cc/150?u=${invitation.senderId}`,
          },
        };
      } );
      setEnrichedInvitations(enriched);
    }
  }, [invitationsData, usersData]);

  const clearMessages = () => {
    setError(null);
    setSuccessMessage(null);
  };

  const handleAccept = async (invitationId) => {
    clearMessages();
    console.log(`Accepting invitation: ${invitationId}`); // Debug log
    if (!invitationId) {
        setError("Cannot accept: Invitation ID is missing.");
        return;
    }
    try {
      await acceptInvitation({ invitationId, currentUserId: currentUser?.uid }).unwrap();
      setSuccessMessage("Invitation accepted!");
    } catch (err) {
      setError("Failed to accept invitation. Please try again.");
      console.error("Accept Invitation Error:", err);
    }
  };

  const handleDecline = async (invitationId) => {
    clearMessages();
    console.log(`Declining invitation: ${invitationId}`); // Debug log
    if (!invitationId) {
        setError("Cannot decline: Invitation ID is missing.");
        return;
    }
    try {
      await declineInvitation({ invitationId, currentUserId: currentUser?.uid }).unwrap();
      setSuccessMessage("Invitation declined.");
    } catch (err) {
      setError("Failed to decline invitation. Please try again.");
      console.error("Decline Invitation Error:", err);
    }
  };

  const isLoading = invitationsLoading || usersLoading;

  if (isLoading) {
    return <DashboardCard title="Pending Invitations">Loading...</DashboardCard>;
  }

  return (
    <DashboardCard
      title="Pending Invitations"
      footerAction={
        <button className="btn btn-primary btn-sm">View All</button>
      }
    >
      {error && <div type="error" message={error} onClose={() => setError(null)} />}
      {successMessage && <div type="success" message={successMessage} onClose={() => setSuccessMessage(null)} />}

      {enrichedInvitations.length > 0 ? (
        <ul className="divide-y divide-gray-200">
          {enrichedInvitations.map((invitation) => (
            <ReceivedInvitationItem
              key={invitation.id}
              invitation={invitation}
              onAccept={() => handleAccept(invitation.id)}
              onDecline={() => handleDecline(invitation.id)}
              isAccepting={isAccepting}
              isDeclining={isDeclining}
            />
          ))}
        </ul>
      ) : (
        <div className="text-center py-8">
          <p className="text-lg font-semibold text-gray-600">
            No Pending Invitations
          </p>
          <p className="text-sm text-gray-500 mt-2">
            You don't have any pending match invitations at the moment.
          </p>
        </div>
      )}
    </DashboardCard>
  );
};

export default PendingInvitationsCard;
