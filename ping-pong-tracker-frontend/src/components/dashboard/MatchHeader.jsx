import React from 'react';
import { Badge } from 'react-bootstrap';

/**
 * Match header component for displaying date, time, and status
 */
const MatchHeader = React.memo(({ scheduledDate, status, compact = false }) => {
  const formatDate = (date) => {
    const now = new Date();
    const matchDate = new Date(date);
    const diffTime = matchDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return `Today at ${matchDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays === 1) {
      return `Tomorrow at ${matchDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays === -1) {
      return `Yesterday at ${matchDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays > 0 && diffDays <= 7) {
      return `${matchDate.toLocaleDateString([], { weekday: 'long' })} at ${matchDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return matchDate.toLocaleDateString([], { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case 'scheduled': return 'primary';
      case 'in-progress': return 'warning';
      case 'completed': return 'success';
      case 'cancelled': return 'danger';
      default: return 'secondary';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'scheduled': return 'Scheduled';
      case 'in-progress': return 'In Progress';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  return (
    <div className="d-flex justify-content-between align-items-center">
      <div className={compact ? 'small' : ''}>
        <i className="bi bi-calendar-event me-1"></i>
        {formatDate(scheduledDate)}
      </div>
      <Badge bg={getStatusVariant(status)} className={compact ? 'small' : ''}>
        {getStatusText(status)}
      </Badge>
    </div>
  );
});

MatchHeader.displayName = 'MatchHeader';

export default MatchHeader;