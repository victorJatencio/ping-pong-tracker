import React from 'react';
import { Row, Col } from 'react-bootstrap';
import UserAvatar from '../../common/UserAvatar';

/**
 * Match details component for displaying opponent and match information
 */
const MatchDetails = React.memo(({ match, opponent, currentUser, showNotes = true }) => {
  const { location, notes } = match;

  return (
    <div>
      {/* Opponent Information */}
      <Row className="align-items-center mb-2">
        <Col xs="auto">
          <UserAvatar 
            user={opponent} 
            size={40}
            showOnlineStatus={false}
          />
        </Col>
        <Col>
          <div className="fw-bold">
            vs. {opponent?.displayName || opponent?.email || 'Unknown Player'}
          </div>
        </Col>
      </Row>

      {/* Location */}
      {location && (
        <div className="mb-2">
          <small className="text-muted">
            <i className="bi bi-geo-alt me-1"></i>
            Location: {location}
          </small>
        </div>
      )}

      {/* Notes */}
      {showNotes && notes && (
        <div className="mb-2">
          <small className="text-muted">
            <i className="bi bi-chat-text me-1"></i>
            Notes: {notes}
          </small>
        </div>
      )}
    </div>
  );
});

MatchDetails.displayName = 'MatchDetails';

export default MatchDetails;