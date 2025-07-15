import React, { useState, useEffect, useContext, useRef } from "react";
import { AuthContext } from "../../contexts/AuthContext";
import { useGetAllUsersQuery } from "../../store/slices/apiSlice";
import DashboardCard from "../common/Card";
import UserAvatar from "../../components/common/UserAvatar";
import Modal from "../common/Modal";
import "./PendingInvitationsCard.scss";

// Firebase imports for real-time sync
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../config/firebase";

const PendingInvitationsCard = () => {
  const { currentUser } = useContext(AuthContext);
  const [invitations, setInvitations] = useState([]);
  const [enrichedInvitations, setEnrichedInvitations] = useState([]);
  const [selectedInvitation, setSelectedInvitation] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const [loading, setLoading] = useState(false);

  // Use ref to track the unsubscribe function
  const unsubscribeRef = useRef(null);

  const { data: usersData, isLoading: usersLoading } = useGetAllUsersQuery();

  // Real-time Firebase listener for invitations with proper cleanup
  useEffect(() => {
    // Clean up any existing listener first
    if (unsubscribeRef.current) {
      console.log('📋 Cleaning up existing invitation listener');
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    // Reset state when no user
    if (!currentUser?.uid) {
      console.log('📋 No authenticated user, clearing invitations');
      setInvitations([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    console.log('📋 PendingInvitations: Setting up real-time listener for user:', currentUser.uid);

    // Query the "invitations" collection with "recipientId" field (same as NotificationBell)
    const invitationsRef = collection(db, 'invitations');
    
    // First try with orderBy, if it fails due to missing index, try without
    let q;
    try {
      q = query(
        invitationsRef,
        where('recipientId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      );
    } catch (indexError) {
      console.log('📋 OrderBy failed, trying without orderBy:', indexError);
      q = query(
        invitationsRef,
        where('recipientId', '==', currentUser.uid)
      );
    }

    // Set up real-time listener with proper error handling
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        // Check if user is still authenticated
        if (!currentUser?.uid) {
          console.log('📋 User no longer authenticated, ignoring snapshot');
          return;
        }

        const invitationsData = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          console.log('📋 Found invitation:', { 
            firestoreDocId: doc.id, 
            dataId: data.id,
            status: data.status,
            ...data 
          });
          
          // Use the actual Firestore document ID, not the data.id field
          invitationsData.push({
            firestoreDocId: doc.id, // This is the real document ID for updates
            ...data
          });
        });

        // Sort manually if we couldn't use orderBy
        invitationsData.sort((a, b) => {
          const aTime = a.createdAt?.seconds || 0;
          const bTime = b.createdAt?.seconds || 0;
          return bTime - aTime; // Newest first
        });

        // Filter out invitations that have been responded to (accepted/declined)
        const pendingInvitations = invitationsData.filter(inv => 
          !inv.status || inv.status === 'pending' || inv.status === 'sent'
        );

        console.log('📋 Real-time invitations update:', pendingInvitations.length);
        setInvitations(pendingInvitations);
        setLoading(false);
      },
      (err) => {
        console.error('📋 Error listening to invitations:', err);
        
        // Handle permission denied errors gracefully (common during logout)
        if (err.code === 'permission-denied') {
          console.log('📋 Permission denied - likely due to authentication state change');
          setInvitations([]);
          setLoading(false);
          setError(null); // Don't show error for permission issues during auth transitions
          return;
        }
        
        // If orderBy fails due to missing index, try without orderBy
        if (err.code === 'failed-precondition' && err.message.includes('index')) {
          console.log('📋 Retrying without orderBy due to missing index...');
          
          const simpleQuery = query(
            invitationsRef,
            where('recipientId', '==', currentUser.uid)
          );
          
          const retryUnsubscribe = onSnapshot(
            simpleQuery,
            (querySnapshot) => {
              // Check if user is still authenticated
              if (!currentUser?.uid) {
                console.log('📋 User no longer authenticated, ignoring retry snapshot');
                return;
              }

              const invitationsData = [];
              querySnapshot.forEach((doc) => {
                const data = doc.data();
                console.log('📋 Found invitation (retry):', { 
                  firestoreDocId: doc.id, 
                  dataId: data.id,
                  status: data.status,
                  ...data 
                });
                
                // Use the actual Firestore document ID, not the data.id field
                invitationsData.push({
                  firestoreDocId: doc.id, // This is the real document ID for updates
                  ...data
                });
              });

              // Sort manually by createdAt
              invitationsData.sort((a, b) => {
                const aTime = a.createdAt?.seconds || 0;
                const bTime = b.createdAt?.seconds || 0;
                return bTime - aTime; // Newest first
              });

              // Filter out invitations that have been responded to
              const pendingInvitations = invitationsData.filter(inv => 
                !inv.status || inv.status === 'pending' || inv.status === 'sent'
              );

              console.log('📋 Real-time invitations update (retry):', pendingInvitations.length);
              setInvitations(pendingInvitations);
              setLoading(false);
            },
            (retryErr) => {
              console.error('📋 Error on retry:', retryErr);
              
              // Handle permission denied errors gracefully
              if (retryErr.code === 'permission-denied') {
                console.log('📋 Permission denied on retry - likely due to authentication state change');
                setInvitations([]);
                setLoading(false);
                setError(null);
                return;
              }
              
              setError(retryErr.message);
              setLoading(false);
            }
          );
          
          // Store the retry unsubscribe function
          unsubscribeRef.current = retryUnsubscribe;
          return;
        } else {
          setError(err.message);
          setLoading(false);
        }
      }
    );

    // Store the unsubscribe function
    unsubscribeRef.current = unsubscribe;

    // Cleanup function
    return () => {
      if (unsubscribeRef.current) {
        console.log('📋 Cleaning up invitation listener on unmount/dependency change');
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [currentUser?.uid]); // Only depend on currentUser.uid

  // Additional cleanup on component unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        console.log('📋 Final cleanup on component unmount');
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, []);

  // Enrich invitations with user data
  useEffect(() => {
    if (invitations.length > 0 && usersData) {
      console.log("📋 AVATAR DEBUG - Raw usersData sample:", Object.values(usersData)[0]);
      
      const enriched = invitations.map((invitation) => {
        const senderId = invitation.senderId || invitation.id;
        const sender = usersData[senderId];
        console.log("📋 AVATAR DEBUG - Sender data for", senderId, ":", sender);
        
        return {
          ...invitation,
          sender: sender || {
            uid: senderId,
            displayName: "Unknown User",
            photoURL: null,
            useDefaultAvatar: true,
            email: `user-${senderId}@example.com`,
          },
        };
      });
      
      console.log("📋 AVATAR DEBUG - Enriched invitations:", enriched);
      setEnrichedInvitations(enriched);
    } else {
      setEnrichedInvitations([]);
    }
  }, [invitations, usersData]);

  const clearMessages = () => {
    setError(null);
    setSuccessMessage(null);
  };

  const handleAccept = async (invitation) => {
    // Check if user is still authenticated
    if (!currentUser?.uid) {
      console.log('📋 Cannot accept invitation - user not authenticated');
      return;
    }

    clearMessages();
    setIsProcessing(true);
    setRemovingId(invitation.firestoreDocId);
    console.log(`📋 Accepting invitation:`, {
      firestoreDocId: invitation.firestoreDocId,
      dataId: invitation.id,
      currentStatus: invitation.status
    });

    setTimeout(async () => {
      try {
        // Use the actual Firestore document ID for the update (same as NotificationBell)
        const invitationRef = doc(db, 'invitations', invitation.firestoreDocId);
        await updateDoc(invitationRef, {
          status: 'accepted',
          respondedAt: new Date(),
          updatedAt: serverTimestamp(),
        });

        console.log('📋 Invitation accepted successfully - status updated to "accepted"');
        setSuccessMessage("Invitation accepted!");
        setIsModalOpen(false);
      } catch (err) {
        console.error("📋 Accept Invitation Error:", err);
        
        // Handle permission errors gracefully
        if (err.code === 'permission-denied') {
          console.log('📋 Permission denied while accepting - user may have been logged out');
          setError("Unable to accept invitation. Please try logging in again.");
        } else {
          setError("Failed to accept invitation. Please try again.");
        }
        
        setRemovingId(null);
      } finally {
        setIsProcessing(false);
      }
    }, 300);
  };

  const handleDecline = async (invitation) => {
    // Check if user is still authenticated
    if (!currentUser?.uid) {
      console.log('📋 Cannot decline invitation - user not authenticated');
      return;
    }

    clearMessages();
    setIsProcessing(true);
    setRemovingId(invitation.firestoreDocId);
    console.log(`📋 Declining invitation:`, {
      firestoreDocId: invitation.firestoreDocId,
      dataId: invitation.id,
      currentStatus: invitation.status
    });

    setTimeout(async () => {
      try {
        // Use the actual Firestore document ID for the update (same as NotificationBell)
        const invitationRef = doc(db, 'invitations', invitation.firestoreDocId);
        await updateDoc(invitationRef, {
          status: 'declined',
          respondedAt: new Date(),
          updatedAt: serverTimestamp(),
        });

        console.log('📋 Invitation declined successfully - status updated to "declined"');
        setSuccessMessage("Invitation declined.");
        setIsModalOpen(false);
      } catch (err) {
        console.error("📋 Decline Invitation Error:", err);
        
        // Handle permission errors gracefully
        if (err.code === 'permission-denied') {
          console.log('📋 Permission denied while declining - user may have been logged out');
          setError("Unable to decline invitation. Please try logging in again.");
        } else {
          setError("Failed to decline invitation. Please try again.");
        }
        
        setRemovingId(null);
      } finally {
        setIsProcessing(false);
      }
    }, 300);
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
      // Handle both Firestore timestamp and regular date
      const scheduleDate = date.seconds ? new Date(date.seconds * 1000) : new Date(date);
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

  const isLoading = loading || usersLoading || isProcessing;

  if (loading || usersLoading) {
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
            {enrichedInvitations.slice(0, 3).map((invitation) => {
              // Create proper avatar data with useDefaultAvatar logic
              const avatarData = {
                photoURL: (!invitation.sender.useDefaultAvatar && invitation.sender.photoURL) ? invitation.sender.photoURL : null,
                displayName: invitation.sender.displayName,
                email: invitation.sender.email,
              };
              
              console.log("📋 AVATAR DEBUG - Avatar data being passed to UserAvatar:", avatarData);
              
              return (
                <div
                  key={invitation.firestoreDocId}
                  className={`pending-invitation-preview ${
                    removingId === invitation.firestoreDocId ? "removing" : ""
                  }`}
                  onClick={() => openInvitationModal(invitation)}
                >
                  <div className="invitation-sender">
                    <div className="sender-avatar">
                      <UserAvatar
                        user={avatarData}
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
                    {invitation.time || formatScheduledDate(invitation.scheduledDate)}
                  </div>
                </div>
              );
            })}
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
                    photoURL: (!selectedInvitation.sender.useDefaultAvatar && selectedInvitation.sender.photoURL) ? selectedInvitation.sender.photoURL : null,
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
                <p>{selectedInvitation.time || formatScheduledDate(selectedInvitation.scheduledDate)}</p>
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
                onClick={() => handleDecline(selectedInvitation)}
                disabled={isProcessing}
              >
                {isProcessing ? "Processing..." : "Decline"}
              </button>
              <button
                className="accept-button"
                onClick={() => handleAccept(selectedInvitation)}
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

