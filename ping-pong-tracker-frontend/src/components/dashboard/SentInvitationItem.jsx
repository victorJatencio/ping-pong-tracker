import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useCancelInvitationMutation, useCancelMatchMutation } from '../../store/slices/apiSlice';

const SentInvitationItem = ({ invitation, recipient }) => {
  const [cancelInvitation, { isLoading: isCancelling }] = useCancelInvitationMutation();
  const [cancelMatch, { isLoading: isCancellingMatch }] = useCancelMatchMutation();

  const handleCancel = async () => {
    try {
      await cancelInvitation({
        invitationId: invitation.id,
        currentUserId: invitation.senderId,
      });

      // If invitation was declined, also cancel the match
      if (invitation.status === 'declined' && invitation.matchId) {
        await cancelMatch({
          matchId: invitation.matchId,
          currentUserId: invitation.senderId,
        });
      }
    } catch (error) {
      console.error('Failed to cancel invitation:', error);
    }
  };

  const getStatusDisplay = () => {
    switch (invitation.status) {
      case 'pending':
        return {
          text: 'Waiting for response',
          className: 'text-yellow-600 bg-yellow-100',
          showCancel: true,
        };
      case 'accepted':
        return {
          text: 'Accepted',
          className: 'text-green-600 bg-green-100',
          showCancel: false,
        };
      case 'declined':
        return {
          text: 'Declined',
          className: 'text-red-600 bg-red-100',
          showCancel: true,
          cancelText: 'Cancel Match',
        };
      default:
        return {
          text: invitation.status,
          className: 'text-gray-600 bg-gray-100',
          showCancel: false,
        };
    }
  };

  const status = getStatusDisplay();

  return (
    <div className="sent-invitation-item p-4 border rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <img
            src={recipient?.profileImageUrl || 'https://i.pravatar.cc/150?u=default'}
            alt={recipient?.displayName || 'Unknown User'}
            className="w-10 h-10 rounded-full"
          />
          <div>
            <h4 className="font-medium">{recipient?.displayName || 'Unknown User'}</h4>
            <p className="text-sm text-gray-500">{invitation.message}</p>
            <p className="text-xs text-gray-400">
              Sent {formatDistanceToNow(invitation.createdAt)} ago
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.className}`}>
            {status.text}
          </span>
          
          {status.showCancel && (
            <button
              onClick={handleCancel}
              disabled={isCancelling || isCancellingMatch}
              className="px-3 py-1 text-sm text-red-600 border border-red-300 rounded hover:bg-red-50 disabled:opacity-50"
            >
              {isCancelling || isCancellingMatch ? 'Cancelling...' : (status.cancelText || 'Cancel')}
            </button>
          )}
        </div>
      </div>

      <div className="mt-2 text-sm text-gray-600">
        <span>📍 {invitation.location}</span>
        <span className="ml-4">📅 {invitation.date} at {invitation.time}</span>
      </div>
    </div>
  );
};

export default SentInvitationItem;