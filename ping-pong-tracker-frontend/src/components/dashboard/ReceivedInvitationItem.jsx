import React from 'react';
import { formatDistanceToNow } from 'date-fns';

const ReceivedInvitationItem = ({ 
  invitation, 
  sender, 
  currentUserId, 
  onAccept, 
  onDecline, 
  isAccepting, 
  isDeclining 
}) => {
  const handleAcceptClick = () => {
    onAccept(invitation.id);
  };

  const handleDeclineClick = () => {
    onDecline(invitation.id);
  };

  // Format the invitation date
  const formatDate = (date) => {
    if (!date) return 'Unknown time';
    
    try {
      // Handle Firebase Timestamp or Date object
      const dateObj = date.toDate ? date.toDate() : new Date(date);
      return formatDistanceToNow(dateObj, { addSuffix: true });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Unknown time';
    }
  };

  return (
    <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
      {/* Sender Info */}
      <div className="flex items-center space-x-3">
        <img
          src={sender?.profileImageUrl || `https://i.pravatar.cc/150?u=${invitation.senderId}`}
          alt={sender?.displayName || 'Unknown User'}
          className="w-10 h-10 rounded-full object-cover"
        />
        <div>
          <h4 className="font-medium text-gray-900">
            {sender?.displayName || 'Unknown User'}
          </h4>
          <p className="text-sm text-gray-600">{invitation.message}</p>
          <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
            <span>📍 {invitation.location}</span>
            <span>📅 {invitation.date}</span>
            <span>🕐 {invitation.time}</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Sent {formatDate(invitation.createdAt)}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-2">
        <button
          onClick={handleAcceptClick}
          disabled={isAccepting || isDeclining}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            isAccepting
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500'
          }`}
        >
          {isAccepting ? (
            <div className="flex items-center space-x-1">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Accepting...</span>
            </div>
          ) : (
            'Accept'
          )}
        </button>
        
        <button
          onClick={handleDeclineClick}
          disabled={isAccepting || isDeclining}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            isDeclining
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500'
          }`}
        >
          {isDeclining ? (
            <div className="flex items-center space-x-1">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Declining...</span>
            </div>
          ) : (
            'Decline'
          )}
        </button>
      </div>
    </div>
  );
};

export default ReceivedInvitationItem;

