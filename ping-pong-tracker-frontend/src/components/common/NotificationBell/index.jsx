import React, { useState, useEffect, useContext, useRef } from 'react';
import { Button, Badge, Dropdown, Spinner } from 'react-bootstrap';
import { AuthContext } from '../../../contexts/AuthContext';
import { useGetAllUsersQuery } from '../../../store/slices/apiSlice';
import UserAvatar from '../UserAvatar';

// Firebase imports
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  doc,
  updateDoc
} from 'firebase/firestore';
import { db } from '../../../config/firebase';

const NotificationBell = () => {
  const { currentUser } = useContext(AuthContext);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Use ref to track the unsubscribe function
  const unsubscribeRef = useRef(null);

  // Fetch user data for inviter names and avatars
  const { 
    data: allUsers, 
    error: usersError, 
    isLoading: usersLoading 
  } = useGetAllUsersQuery();

  // Real-time listener for match invitations with proper cleanup
  useEffect(() => {
    // Clean up any existing listener first
    if (unsubscribeRef.current) {
      console.log('🔔 Cleaning up existing invitation listener');
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    // Reset state when no user
    if (!currentUser?.uid) {
      console.log('🔔 No authenticated user, clearing invitations');
      setInvitations([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    console.log('🔔 Setting up real-time invitation listener for user:', currentUser.uid);

    // Query the correct "invitations" collection with "recipientId" field
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
      console.log('🔔 OrderBy failed, trying without orderBy:', indexError);
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
          console.log('🔔 User no longer authenticated, ignoring snapshot');
          return;
        }

        const invitationsData = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          console.log('🔔 Found invitation:', { id: doc.id, ...data });
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

        console.log('🔔 Real-time invitations update:', pendingInvitations.length);
        setInvitations(pendingInvitations);
        setLoading(false);
      },
      (err) => {
        console.error('🔔 Error listening to invitations:', err);
        
        // Handle permission denied errors gracefully (common during logout)
        if (err.code === 'permission-denied') {
          console.log('🔔 Permission denied - likely due to authentication state change');
          setInvitations([]);
          setLoading(false);
          setError(null); // Don't show error for permission issues during auth transitions
          return;
        }
        
        // If orderBy fails due to missing index, try without orderBy
        if (err.code === 'failed-precondition' && err.message.includes('index')) {
          console.log('🔔 Retrying without orderBy due to missing index...');
          
          const simpleQuery = query(
            invitationsRef,
            where('recipientId', '==', currentUser.uid)
          );
          
          const retryUnsubscribe = onSnapshot(
            simpleQuery,
            (querySnapshot) => {
              // Check if user is still authenticated
              if (!currentUser?.uid) {
                console.log('🔔 User no longer authenticated, ignoring retry snapshot');
                return;
              }

              const invitationsData = [];
              querySnapshot.forEach((doc) => {
                const data = doc.data();
                console.log('🔔 Found invitation (retry):', { id: doc.id, ...data });
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

              console.log('🔔 Real-time invitations update (retry):', pendingInvitations.length);
              setInvitations(pendingInvitations);
              setLoading(false);
            },
            (retryErr) => {
              console.error('🔔 Error on retry:', retryErr);
              
              // Handle permission denied errors gracefully
              if (retryErr.code === 'permission-denied') {
                console.log('🔔 Permission denied on retry - likely due to authentication state change');
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
        console.log('🔔 Cleaning up invitation listener on unmount/dependency change');
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [currentUser?.uid]); // Only depend on currentUser.uid

  // Additional cleanup on component unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        console.log('🔔 Final cleanup on component unmount');
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, []);

  // Handle accepting an invitation
  const handleAcceptInvitation = async (invitation) => {
    // Check if user is still authenticated
    if (!currentUser?.uid) {
      console.log('🔔 Cannot accept invitation - user not authenticated');
      return;
    }

    try {
      console.log('🔔 Accepting invitation:', invitation.firestoreDocId);
      
      // Use the actual Firestore document ID for the update
      const invitationRef = doc(db, 'invitations', invitation.firestoreDocId);
      await updateDoc(invitationRef, {
        status: 'accepted',
        respondedAt: new Date()
      });

      console.log('🔔 Invitation accepted successfully');
    } catch (err) {
      console.error('Error accepting invitation:', err);
      
      // Handle permission errors gracefully
      if (err.code === 'permission-denied') {
        console.log('🔔 Permission denied while accepting - user may have been logged out');
        return;
      }
      
      setError(err.message);
    }
  };

  // Handle declining an invitation
  const handleDeclineInvitation = async (invitation) => {
    // Check if user is still authenticated
    if (!currentUser?.uid) {
      console.log('🔔 Cannot decline invitation - user not authenticated');
      return;
    }

    try {
      console.log('🔔 Declining invitation:', invitation.firestoreDocId);
      
      // Use the actual Firestore document ID for the update
      const invitationRef = doc(db, 'invitations', invitation.firestoreDocId);
      await updateDoc(invitationRef, {
        status: 'declined',
        respondedAt: new Date()
      });

      console.log('🔔 Invitation declined successfully');
    } catch (err) {
      console.error('Error declining invitation:', err);
      
      // Handle permission errors gracefully
      if (err.code === 'permission-denied') {
        console.log('🔔 Permission denied while declining - user may have been logged out');
        return;
      }
      
      setError(err.message);
    }
  };

  // Handle marking invitation as read (optional)
  const handleMarkAsRead = async (invitation) => {
    // Check if user is still authenticated
    if (!currentUser?.uid) {
      return;
    }

    try {
      const invitationRef = doc(db, 'invitations', invitation.firestoreDocId);
      await updateDoc(invitationRef, {
        read: true
      });
    } catch (err) {
      console.error('Error marking invitation as read:', err);
      // Don't show error for read status updates
    }
  };

  // Handle clearing all notifications (mark all as read)
  const handleMarkAllAsRead = async () => {
    // Check if user is still authenticated
    if (!currentUser?.uid) {
      return;
    }

    try {
      const updatePromises = invitations.map(invitation => {
        const invitationRef = doc(db, 'invitations', invitation.firestoreDocId);
        return updateDoc(invitationRef, { read: true });
      });
      
      await Promise.all(updatePromises);
      console.log('🔔 All invitations marked as read');
    } catch (err) {
      console.error('Error marking all invitations as read:', err);
      // Don't show error for read status updates
    }
  };

  // Format time ago
  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Just now';
    
    const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  // Count unread invitations
  const unreadCount = invitations.filter(inv => !inv.read).length;

  // Don't render if no authenticated user
  if (!currentUser?.uid) {
    return (
      <Button variant="link" className="notification-bell-toggle position-relative p-2" disabled>
        <i className="bi bi-bell-fill text-white fs-5"></i>
      </Button>
    );
  }

  return (
    <Dropdown align="end">
      <Dropdown.Toggle
        as={Button}
        variant="link"
        className="notification-bell-toggle position-relative p-2"
        id="notification-dropdown"
      >
        <i className="bi bi-bell-fill text-white fs-5"></i>
        {unreadCount > 0 && (
          <Badge
            bg="danger"
            pill
            className="position-absolute top-0 start-100 translate-middle"
            style={{ fontSize: '0.7rem' }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Dropdown.Toggle>

      <Dropdown.Menu className="notification-dropdown-menu" style={{ width: '350px', maxHeight: '400px', overflowY: 'auto' }}>
        <Dropdown.Header className="d-flex justify-content-between align-items-center">
          <span>Match Invitations</span>
          {unreadCount > 0 && (
            <Button
              variant="link"
              size="sm"
              className="text-primary p-0"
              onClick={handleMarkAllAsRead}
            >
              Mark all as read
            </Button>
          )}
        </Dropdown.Header>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-3">
            <Spinner animation="border" size="sm" className="me-2" />
            <span>Loading invitations...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <Dropdown.Item disabled>
            <div className="text-center text-danger py-2">
              <small>Error: {error}</small>
            </div>
          </Dropdown.Item>
        )}

        {/* Invitations List */}
        {!loading && !error && invitations.length > 0 ? (
          invitations.map((invitation) => {
            // Get inviter info - check both senderId and id fields
            const inviterId = invitation.senderId || invitation.id;
            const inviter = allUsers?.[inviterId];
            const inviterName = inviter?.displayName || inviter?.name || 'Unknown Player';
            
            return (
              <div key={invitation.firestoreDocId} className={`px-3 py-2 border-bottom ${!invitation.read ? 'bg-light' : ''}`}>
                {/* Invitation Header */}
                <div className="d-flex align-items-center mb-2">
                  <UserAvatar
                    user={{
                      photoURL: (!inviter?.useDefaultAvatar && inviter?.photoURL) ? inviter.photoURL : null,
                      displayName: inviterName,
                      email: inviter?.email
                    }}
                    size="sm"
                    className="me-2"
                  />
                  <div className="flex-grow-1">
                    <div className="fw-semibold">{inviterName}</div>
                    <small className="text-muted">invited you to a match</small>
                  </div>
                  {!invitation.read && (
                    <div 
                      className="bg-primary rounded-circle" 
                      style={{ width: '8px', height: '8px' }}
                    ></div>
                  )}
                </div>

                {/* Invitation Details */}
                {invitation.message && (
                  <div className="mb-2">
                    <small className="text-muted">"{invitation.message}"</small>
                  </div>
                )}

                {/* Match Details */}
                <div className="mb-2">
                  <small className="text-muted">
                    {invitation.time && (
                      <>🕐 {invitation.time}</>
                    )}
                    {invitation.location && (
                      <> • 📍 {invitation.location}</>
                    )}
                  </small>
                </div>

                {/* Time and Actions */}
                <div className="d-flex justify-content-between align-items-center">
                  <small className="text-muted">
                    {formatTimeAgo(invitation.createdAt)}
                  </small>
                  
                  <div className="d-flex gap-1">
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => handleAcceptInvitation(invitation)}
                    >
                      Accept
                    </Button>
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      onClick={() => handleDeclineInvitation(invitation)}
                    >
                      Decline
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        ) : !loading && !error ? (
          <Dropdown.Item disabled>
            <div className="text-center text-muted py-3">
              <i className="bi bi-bell-slash fs-4 d-block mb-2"></i>
              No pending invitations
            </div>
          </Dropdown.Item>
        ) : null}

        {/* Footer */}
        {invitations.length > 0 && (
          <div className="px-3 py-2 border-top">
            <small className="text-muted">
              {invitations.length} invitation{invitations.length !== 1 ? 's' : ''} • Real-time updates
            </small>
          </div>
        )}
      </Dropdown.Menu>
    </Dropdown>
  );
};

export default NotificationBell;