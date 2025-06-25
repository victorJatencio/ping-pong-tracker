import React from 'react';
import { Button, Spinner } from 'react-bootstrap';

/**
 * Match actions component for rendering appropriate action buttons
 */
const MatchActions = React.memo(({ match, currentUser, onUpdateScore, loading = false }) => {
  const { status, isCurrentUserPlayer1, canUpdateScore } = match;

  // Match creator can update score when match is in progress
  if (canUpdateScore && status === 'in-progress') {
    return (
      <Button
        variant="success"
        size="sm"
        onClick={() => onUpdateScore(match)}
        disabled={loading}
        className="d-flex align-items-center"
      >
        {loading ? (
          <>
            <Spinner animation="border" size="sm" className="me-1" />
            Updating...
          </>
        ) : (
          <>
            <i className="bi bi-trophy me-1"></i>
            Update Score
          </>
        )}
      </Button>
    );
  }

  // Opponent sees waiting message
  if (!isCurrentUserPlayer1 && status === 'in-progress') {
    return (
      <Button
        variant="outline-secondary"
        size="sm"
        disabled
        className="d-flex align-items-center"
      >
        <i className="bi bi-clock me-1"></i>
        Waiting for opponent
      </Button>
    );
  }

  // Scheduled matches show waiting for start
  if (status === 'scheduled') {
    return (
      <Button
        variant="outline-primary"
        size="sm"
        disabled
        className="d-flex align-items-center"
      >
        <i className="bi bi-calendar-check me-1"></i>
        Scheduled
      </Button>
    );
  }

  // Completed matches show completion status
  if (status === 'completed') {
    return (
      <Button
        variant="outline-success"
        size="sm"
        disabled
        className="d-flex align-items-center"
      >
        <i className="bi bi-check-circle me-1"></i>
        Completed
      </Button>
    );
  }

  // Default case
  return null;
});

MatchActions.displayName = 'MatchActions';

export default MatchActions;