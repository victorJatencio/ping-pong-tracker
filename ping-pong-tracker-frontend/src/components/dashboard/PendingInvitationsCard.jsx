import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useGetPendingInvitationsQuery, useGetAllUsersQuery, useAcceptInvitationMutation, useDeclineInvitationMutation } from '../../store/slices/apiSlice';
import { useAuth } from '../../hooks/useAuth';
import DashboardCard from '../common/Card';
import PendingInvitationItem from './PendingInvitationItem';
import './PendingInvitationsCard.scss';

/**
 * PendingInvitationsCard Component
 * Displays pending invitations with accept/decline functionality
 * Follows the same patterns as OngoingMatchesCard
 */
const PendingInvitationsCard = () => {
  const { currentUser } = useAuth();
  const [enrichedInvitations, setEnrichedInvitations] = useState([]);
  
  // Fetch pending invitations for current user
  const {
    data: invitationsData,
    error: invitationsError,
    isLoading: invitationsLoading,
    refetch: refetchInvitations
  } = useGetPendingInvitationsQuery(currentUser?.uid, {
    skip: !currentUser?.uid,
    pollingInterval: 30000, // Poll every 30 seconds for real-time updates
  });

  // Fetch all users for sender information
  const {
    data: usersData,
    error: usersError,
    isLoading: usersLoading
  } = useGetAllUsersQuery();

  // Mutation hooks for accepting/declining invitations
  const [acceptInvitation, { isLoading: isAccepting }] = useAcceptInvitationMutation();
  const [declineInvitation, { isLoading: isDeclining }] = useDeclineInvitationMutation();

  // Enrich invitations with sender information
  useEffect(() => {
    if (invitationsData && usersData) {
      const enriched = invitationsData.map(invitation => {
        const sender = usersData[invitation.senderId];
        return {
          ...invitation,
          sender: sender || {
            uid: invitation.senderId,
            displayName: 'Unknown User',
            profileImageUrl: 'https://i.pravatar.cc/150?u=unknown'
          }
        };
      });
      setEnrichedInvitations(enriched);
    }
  }, [invitationsData, usersData]);

  // Handle accepting an invitation
  const handleAcceptInvitation = async (invitation) => {
    try {
      await acceptInvitation({
        invitationId: invitation.id,
        currentUserId: currentUser.uid,
        invitation: invitation // Pass full invitation for match creation
      }).unwrap();
      
      // Show success feedback
      console.log('Invitation accepted successfully');
      
      // Refetch to ensure UI is updated
      refetchInvitations();
    } catch (error) {
      console.error('Failed to accept invitation:', error);
      // TODO: Show error notification to user
    }
  };

  // Handle declining an invitation
  const handleDeclineInvitation = async (invitation) => {
    try {
      await declineInvitation({
        invitationId: invitation.id,
        currentUserId: currentUser.uid
      }).unwrap();
      
      // Show success feedback
      console.log('Invitation declined');
      
      // Refetch to ensure UI is updated
      refetchInvitations();
    } catch (error) {
      console.error('Failed to decline invitation:', error);
      // TODO: Show error notification to user
    }
  };

  // Loading state
  if (invitationsLoading || usersLoading) {
    return (
      <DashboardCard
        title="Pending Invitations"
        isLoading={true}
      />
    );
  }

  // Error state
  if (invitationsError || usersError) {
    return (
      <DashboardCard
        title="Pending Invitations"
        error="Unable to load invitations"
      />
    );
  }

  // Empty state
  if (!enrichedInvitations || enrichedInvitations.length === 0) {
    return (
      <DashboardCard
      title="Pending Invitations"
      // Remove the emptyState prop completely
      footerAction={
        <button 
          className="btn btn-primary btn-sm"
          onClick={() => {
            console.log('Navigate to matches page');
          }}
        >
          View All Matches
        </button>
      }
    >
      {/* Add the empty state content as children instead */}
      <div className="text-center py-8">
        <p className="text-lg font-semibold text-gray-600">No Pending Invitations</p>
        <p className="text-sm text-gray-500 mt-2">You don't have any pending match invitations at the moment.</p>
      </div>
    </DashboardCard>
    );
  }

  // Display invitations (limit to 3 for dashboard)
  const displayInvitations = enrichedInvitations.slice(0, 3);

  return (
    <DashboardCard
      title="Pending Invitations"
      subtitle={`${enrichedInvitations.length} invitation${enrichedInvitations.length !== 1 ? 's' : ''} waiting for response`}
      footerAction={
        enrichedInvitations.length > 3 ? (
          <button 
            className="btn btn-outline btn-sm"
            onClick={() => {
              // TODO: Navigate to full invitations page
              console.log('Navigate to all invitations');
            }}
          >
            View All ({enrichedInvitations.length})
          </button>
        ) : null
      }
    >
      <div className="pending-invitations-list">
        {displayInvitations.map((invitation) => (
          <PendingInvitationItem
            key={invitation.id}
            invitation={invitation}
            onAccept={() => handleAcceptInvitation(invitation)}
            onDecline={() => handleDeclineInvitation(invitation)}
            isAccepting={isAccepting}
            isDeclining={isDeclining}
          />
        ))}
      </div>
    </DashboardCard>
  );
};

export default PendingInvitationsCard;

