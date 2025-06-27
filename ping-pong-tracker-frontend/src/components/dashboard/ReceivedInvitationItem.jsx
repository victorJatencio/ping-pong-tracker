// src/components/dashboard/ReceivedInvitationItem.jsx
import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useAcceptInvitationMutation, useDeclineInvitationMutation } from '../../store/slices/apiSlice';

const ReceivedInvitationItem = ({ invitation, sender, currentUserId }) => {
  const [acceptInvitation, { isLoading: isAccepting }] = useAcceptInvitationMutation();
  const [declineInvitation, { isLoading: isDeclining }] = useDeclineInvitationMutation();

  const handleAccept = async () => {
    try {
      await acceptInvitation({
        invitationId: invitation.id,
        currentUserId,
      });
    } catch (error) {
      console.error('Failed to accept invitation:', error);
    }
  };

  const handleDecline = async () => {
    try {
      await declineInvitation({
        invitationId: invitation.id,
        currentUserId,
      });
    } catch (error) {
      console.error('Failed to decline invitation:', error);
    }
  };

  return (
    <div className="received-invitation-item p-4 border rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <img
            src={sender?.profileImageUrl || 'https://i.pravatar.cc/150?u=default'}
            alt={sender?.displayName || 'Unknown User'}
            className="w-10 h-10 rounded-full"
          />
          <div>
            <h4 className="font-medium">{sender?.displayName || 'Unknown User'}</h4>
            <p className="text-sm text-gray-500">{invitation.message}</p>
            <p className="text-xs text-gray-400">
              Received {formatDistanceToNow(invitation.createdAt)} ago
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleDecline}
            disabled={isDeclining || isAccepting}
            className="px-3 py-1 text-sm text-red-600 border border-red-300 rounded hover:bg-red-50 disabled:opacity-50"
          >
            {isDeclining ? 'Declining...' : 'Decline'}
          </button>
          
          <button
            onClick={handleAccept}
            disabled={isAccepting || isDeclining}
            className="px-3 py-1 text-sm text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-50"
          >
            {isAccepting ? 'Accepting...' : 'Accept'}
          </button>
        </div>
      </div>

      <div className="mt-2 text-sm text-gray-600">
        <span>📍 {invitation.location}</span>
        <span className="ml-4">📅 {invitation.date} at {invitation.time}</span>
      </div>
    </div>
  );
};

export default ReceivedInvitationItem;