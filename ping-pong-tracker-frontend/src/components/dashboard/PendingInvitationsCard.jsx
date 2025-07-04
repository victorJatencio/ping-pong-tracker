import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../../contexts/AuthContext";
import {
  useGetPendingInvitationsQuery,
  useGetAllUsersQuery,
  // useAcceptInvitationMutation,
  // useDeclineInvitationMutation,
} from "../../store/slices/apiSlice";
import DashboardCard from "../common/Card";
import UserAvatar from "../../components/common/UserAvatar";
import Modal from "../common/Modal";
import "./PendingInvitationsCard.scss";

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../config/firebase";

const PendingInvitationsCard = () => {
  const { currentUser } = useContext(AuthContext);
  const [enrichedInvitations, setEnrichedInvitations] = useState([]);
  const [selectedInvitation, setSelectedInvitation] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  // Add the missing state variable for tracking removing items
  const [removingId, setRemovingId] = useState(null);

  // Log currentUser.uid when the component renders
  useEffect(() => {
    console.log("PendingInvitationsCard: currentUser.uid:", currentUser?.uid);
  }, [currentUser]);

  const {
    data: invitationsData,
    isLoading: invitationsLoading,
    error: invitationsError,
    refetch: refetchInvitations,
  } = useGetPendingInvitationsQuery(currentUser?.uid, {
    skip: !currentUser?.uid,
  });

  const { data: usersData, isLoading: usersLoading } = useGetAllUsersQuery();

  // const [acceptInvitation, { isLoading: isAccepting }] =
  //   useAcceptInvitationMutation();
  // const [declineInvitation, { isLoading: isDeclining }] =
  //   useDeclineInvitationMutation();

  useEffect(() => {
    if (invitationsData && usersData) {
      const enriched = invitationsData.map((invitation) => {
        const sender = usersData[invitation.senderId];
        return {
          ...invitation,
          sender: sender || {
            uid: invitation.senderId,
            displayName: "Unknown User",
            profileImageUrl: null,
            email: `user-${invitation.senderId}@example.com`, // Fallback for avatar generation
          },
        };
      });
      setEnrichedInvitations(enriched);
    }
  }, [invitationsData, usersData]);

  const clearMessages = () => {
    setError(null);
    setSuccessMessage(null);
  };

  const handleAccept = async (invitationId) => {
    clearMessages();
    setIsProcessing(true);
    setRemovingId(invitationId);
    console.log(`Accepting invitation: ${invitationId}`);

    setTimeout(async () => {
      try {
        // Get the actual document ID first
        const invitationsRef = collection(db, "invitations");
        const q = query(invitationsRef, where("id", "==", invitationId));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          setError(
            "Invitation not found. It may have been deleted or expired."
          );
          setRemovingId(null); // Reset on error
          setIsProcessing(false);
          return;
        }

        // Get the actual document ID and directly update it
        const docSnapshot = querySnapshot.docs[0];
        const actualDocId = docSnapshot.id;
        console.log("Found actual document ID:", actualDocId);

        // Directly update the document
        const docRef = doc(db, "invitations", actualDocId);
        await updateDoc(docRef, {
          status: "accepted",
          updatedAt: serverTimestamp(),
        });

        setSuccessMessage("Invitation accepted!");
        setIsModalOpen(false);
        refetchInvitations();
      } catch (err) {
        setError("Failed to accept invitation. Please try again.");
        console.error("Accept Invitation Error:", err);
        setRemovingId(null); // Reset on error
      } finally {
        setIsProcessing(false); // Reset processing state when done
      }
    }, 300);
  };

  const handleDecline = async (invitationId) => {
    clearMessages();
    setIsProcessing(true);
    setRemovingId(invitationId); // Add this line to set removing ID for animation
    console.log(`Declining invitation: ${invitationId}`);

    setTimeout(async () => { // Wrap in setTimeout for animation
      try {
        // Get the actual document ID first
        const invitationsRef = collection(db, "invitations");
        const q = query(invitationsRef, where("id", "==", invitationId));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          setError("Invitation not found. It may have been deleted or expired.");
          setRemovingId(null); // Reset on error
          setIsProcessing(false);
          return;
        }

        // Get the actual document ID and directly update it
        const docSnapshot = querySnapshot.docs[0];
        const actualDocId = docSnapshot.id;
        console.log("Found actual document ID:", actualDocId);

        // Directly update the document
        const docRef = doc(db, "invitations", actualDocId);
        await updateDoc(docRef, {
          status: "declined",
          updatedAt: serverTimestamp(),
        });

        setSuccessMessage("Invitation declined.");
        setIsModalOpen(false);
        refetchInvitations();
      } catch (err) {
        setError("Failed to decline invitation. Please try again.");
        console.error("Decline Invitation Error:", err);
        setRemovingId(null); // Reset on error
      } finally {
        setIsProcessing(false);
      }
    }, 300); // Match the CSS transition duration
  };

  const retryOperation = () => {
    setError(null);
    setSuccessMessage(null);
    // Optionally refresh data
    refetchInvitations();
  };

  const openInvitationModal = (invitation) => {
    setSelectedInvitation(invitation);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedInvitation(null);
  };

  // Format the scheduled date for display
  const formatScheduledDate = (date) => {
    if (!date) return "Date TBD";

    try {
      const scheduleDate = new Date(date);
      const now = new Date();
      const isToday = scheduleDate.toDateString() === now.toDateString();
      const isTomorrow =
        new Date(now.setDate(now.getDate() + 1)).toDateString() ===
        scheduleDate.toDateString();

      // Format time
      const timeString = scheduleDate.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });

      if (isToday) {
        return `Today, ${timeString}`;
      } else if (isTomorrow) {
        return `Tomorrow, ${timeString}`;
      } else {
        return (
          scheduleDate.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year:
              scheduleDate.getFullYear() !== now.getFullYear()
                ? "numeric"
                : undefined,
          }) + `, ${timeString}`
        );
      }
    } catch (error) {
      console.error("Date formatting error:", error);
      return "Date TBD";
    }
  };

  const isLoading = invitationsLoading || usersLoading || isProcessing;

  if (invitationsLoading || usersLoading) {
    return (
      <DashboardCard title="Pending Invitations">
        <div className="pending-invitations-loading">
          <div className="loading-spinner"></div>
          <p>Loading invitations...</p>
        </div>
      </DashboardCard>
    );
  }

  return (
    <>
      <DashboardCard
        title="Pending Invitations"
        footerAction={
          <button
            className="view-all-button"
            onClick={() => console.log("View all invitations")}
            disabled={enrichedInvitations.length === 0}
          >
            View All
          </button>
        }
      >
        {error && (
          <div className="alert alert-error">
            <p>{error}</p>
            <div className="alert-actions">
              <button onClick={retryOperation}>Retry</button>
              <button onClick={() => setError(null)}>×</button>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="alert alert-success">
            <p>{successMessage}</p>
            <button onClick={() => setSuccessMessage(null)}>×</button>
          </div>
        )}

        {enrichedInvitations.length > 0 ? (
          <div className="pending-invitations-list">
            {enrichedInvitations.slice(0, 3).map((invitation) => (
              <div
                key={invitation.id}
                className={`pending-invitation-preview ${
                  removingId === invitation.id ? "removing" : ""
                }`}
                onClick={() => openInvitationModal(invitation)}
              >
                <div className="invitation-sender">
                  <div className="sender-avatar">
                    <UserAvatar
                      user={{
                        profileImage: invitation.sender.profileImageUrl,
                        displayName: invitation.sender.displayName,
                        email: invitation.sender.email,
                      }}
                      size="small"
                    />
                  </div>
                  <div className="sender-info">
                    <span className="from-label">From</span>
                    <span className="sender-name">
                      {invitation.sender.displayName}
                    </span>
                  </div>
                </div>
                <div className="invitation-time">
                  {formatScheduledDate(invitation.scheduledDate)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-invitations">
            <p className="no-invitations-title">No Pending Invitations</p>
            <p className="no-invitations-message">
              You don't have any pending match invitations at the moment.
            </p>
          </div>
        )}
      </DashboardCard>

      {/* Invitation Details Modal */}
      {selectedInvitation && (
        <Modal
          isOpen={isModalOpen}
          onClose={closeModal}
          title="Match Invitation"
        >
          <div className="invitation-modal-content">
            <div className="invitation-modal-header">
              <div className="sender-info-modal">
                <UserAvatar
                  user={{
                    profileImage: selectedInvitation.sender.profileImageUrl,
                    displayName: selectedInvitation.sender.displayName,
                    email: selectedInvitation.sender.email,
                  }}
                  size="medium"
                />
                <div className="sender-details-modal">
                  <h3>{selectedInvitation.sender.displayName}</h3>
                  <p>has invited you to a match</p>
                </div>
              </div>
            </div>

            <div className="invitation-modal-details">
              {selectedInvitation.message && (
                <div className="invitation-message">
                  <h4>Message:</h4>
                  <p>"{selectedInvitation.message}"</p>
                </div>
              )}

              <div className="invitation-schedule">
                <h4>Scheduled Time:</h4>
                <p>{formatScheduledDate(selectedInvitation.scheduledDate)}</p>
              </div>

              {selectedInvitation.location && (
                <div className="invitation-location">
                  <h4>Location:</h4>
                  <p>{selectedInvitation.location}</p>
                </div>
              )}
            </div>

            <div className="invitation-modal-actions">
              <button
                className="decline-button"
                onClick={() => handleDecline(selectedInvitation.id)}
                disabled={isProcessing}
              >
                {isProcessing ? "Processing..." : "Decline"}
              </button>
              <button
                className="accept-button"
                onClick={() => handleAccept(selectedInvitation.id)}
                disabled={isProcessing}
              >
                {isProcessing ? "Processing..." : "Accept"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export default PendingInvitationsCard;

