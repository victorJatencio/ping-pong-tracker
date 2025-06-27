import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { 
  useGetSentInvitationsQuery, 
  useGetReceivedInvitationsQuery,
  useGetAllUsersQuery 
} from '../../store/slices/apiSlice';
import DashboardCard from '../common/Card';
import SentInvitationItem from './SentInvitationItem';
import ReceivedInvitationItem from './ReceivedInvitationItem';

const PendingInvitationsCard = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('received'); // 'received' or 'sent'

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

  const isLoading = sentLoading || receivedLoading;
  const hasError = sentError || receivedError;

  // Get counts for tab display
  const receivedCount = receivedInvitations?.length || 0;
  const sentCount = sentInvitations?.filter(inv => inv.status === 'pending').length || 0;

  if (isLoading) {
    return (
      <DashboardCard
        title="Pending Invitations"
        isLoading={true}
      />
    );
  }

  if (hasError) {
    return (
      <DashboardCard
        title="Pending Invitations"
        footerAction={
          <button className="btn btn-primary btn-sm">
            View All Matches
          </button>
        }
      >
        <div className="text-center py-8">
          <p className="text-red-600">Error loading invitations</p>
        </div>
      </DashboardCard>
    );
  }

  const currentInvitations = activeTab === 'received' ? receivedInvitations : sentInvitations;
  const isEmpty = !currentInvitations || currentInvitations.length === 0;

  return (
    <DashboardCard
      title="Pending Invitations"
      footerAction={
        <button className="btn btn-primary btn-sm">
          View All Matches
        </button>
      }
    >
      {/* Tab Navigation */}
      <div className="flex border-b mb-4">
        <button
          onClick={() => setActiveTab('received')}
          className={`px-4 py-2 text-sm font-medium border-b-2 ${
            activeTab === 'received'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Received ({receivedCount})
        </button>
        <button
          onClick={() => setActiveTab('sent')}
          className={`px-4 py-2 text-sm font-medium border-b-2 ${
            activeTab === 'sent'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
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
            {activeTab === 'received' 
              ? "You don't have any pending match invitations at the moment."
              : "You haven't sent any invitations recently."
            }
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {currentInvitations.map((invitation) => {
            if (activeTab === 'received') {
              const sender = usersData?.[invitation.senderId];
              return (
                <ReceivedInvitationItem
                  key={invitation.id}
                  invitation={invitation}
                  sender={sender}
                  currentUserId={currentUser?.uid}
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