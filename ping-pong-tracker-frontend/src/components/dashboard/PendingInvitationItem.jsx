import React from 'react';
import PropTypes from 'prop-types';
import './PendingInvitationItem.scss';

/**
 * PendingInvitationItem Component
 * Displays individual invitation with sender info and action buttons
 */
const PendingInvitationItem = ({ 
  invitation, 
  onAccept, 
  onDecline, 
  isAccepting, 
  isDeclining 
}) => {
  const { sender, message, scheduledDate, location, createdAt } = invitation;

  // Format the scheduled date
  const formatScheduledDate = (date) => {
    if (!date) return 'Date TBD';
    
    const scheduleDate = new Date(date);
    const now = new Date();
    const diffTime = scheduleDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays > 1 && diffDays <= 7) return `In ${diffDays} days`;
    
    return scheduleDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: scheduleDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  // Format the invitation time (how long ago it was sent)
  const formatInvitationTime = (date) => {
    if (!date) return '';
    
    const inviteDate = new Date(date);
    const now = new Date();
    const diffTime = now.getTime() - inviteDate.getTime();
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return inviteDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="pending-invitation-item">
      {/* Sender Info */}
      <div className="invitation-header">
        <div className="sender-info">
          <img 
            src={sender.profileImageUrl || 'https://i.pravatar.cc/150?u=default'} 
            alt={sender.displayName}
            className="sender-avatar"
            onError={(e) => {
              e.target.src = 'https://i.pravatar.cc/150?u=default';
            }}
          />
          <div className="sender-details">
            <h4 className="sender-name">{sender.displayName}</h4>
            <span className="invitation-time">
              Invited you {formatInvitationTime(createdAt)}
            </span>
          </div>
        </div>
        <div className="match-timing">
          <span className="scheduled-date">
            {formatScheduledDate(scheduledDate)}
          </span>
        </div>
      </div>

      {/* Invitation Details */}
      <div className="invitation-details">
        {message && (
          <p className="invitation-message">
            "{message}"
          </p>
        )}
        
        <div className="match-info">
          {location && (
            <span className="match-location">
              📍 {location}
            </span>
          )}
          {scheduledDate && (
            <span className="match-schedule">
              🕒 {new Date(scheduledDate).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              })}
            </span>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="invitation-actions">
        <button
          className="btn btn-outline btn-sm decline-btn"
          onClick={onDecline}
          disabled={isAccepting || isDeclining}
        >
          {isDeclining ? (
            <>
              <span className="loading loading-spinner loading-xs"></span>
              Declining...
            </>
          ) : (
            'Decline'
          )}
        </button>
        
        <button
          className="btn btn-primary btn-sm accept-btn"
          onClick={onAccept}
          disabled={isAccepting || isDeclining}
        >
          {isAccepting ? (
            <>
              <span className="loading loading-spinner loading-xs"></span>
              Accepting...
            </>
          ) : (
            'Accept'
          )}
        </button>
      </div>
    </div>
  );
};

PendingInvitationItem.propTypes = {
  invitation: PropTypes.shape({
    id: PropTypes.string.isRequired,
    sender: PropTypes.shape({
      uid: PropTypes.string.isRequired,
      displayName: PropTypes.string.isRequired,
      profileImageUrl: PropTypes.string
    }).isRequired,
    message: PropTypes.string,
    scheduledDate: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.instanceOf(Date)
    ]),
    location: PropTypes.string,
    createdAt: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.instanceOf(Date)
    ])
  }).isRequired,
  onAccept: PropTypes.func.isRequired,
  onDecline: PropTypes.func.isRequired,
  isAccepting: PropTypes.bool,
  isDeclining: PropTypes.bool
};

PendingInvitationItem.defaultProps = {
  isAccepting: false,
  isDeclining: false
};

export default PendingInvitationItem;

