import React from 'react';
import { Card, Badge, Button, Row, Col } from 'react-bootstrap';
import UserAvatar from '../../components/common/UserAvatar';
import MatchHeader from './MatchHeader';
import MatchDetails from './MatchDetails';
import MatchScore from './MatchScore';
import MatchActions from './MatchActions';

/**
 * Individual match item component
 * Displays match information and actions based on user role
 */
const OngoingMatchItem = React.memo(({ match, currentUser, onUpdateScore }) => {
  const {
    opponent,
    isCurrentUserPlayer1,
    canUpdateScore,
    status,
    scheduledDate,
    location,
    notes,
    player1Score,
    player2Score,
    createdAt,
    _optimistic
  } = match;

  return (
    <Card className={`h-100 ${_optimistic ? 'border-warning' : ''}`}>
      {_optimistic && (
        <div className="position-absolute top-0 start-0 w-100 h-100 bg-warning bg-opacity-10 rounded"></div>
      )}
      
      <Card.Header className="pb-2">
        <MatchHeader 
          scheduledDate={scheduledDate}
          status={status}
          compact={true}
        />
      </Card.Header>

      <Card.Body className="pb-2">
        <MatchDetails
          match={match}
          opponent={opponent}
          currentUser={currentUser}
          showNotes={true}
        />

        <div className="mt-3">
          <MatchScore
            player1Score={player1Score}
            player2Score={player2Score}
            status={status}
            currentUserIsPlayer1={isCurrentUserPlayer1}
          />
        </div>
      </Card.Body>

      <Card.Footer className="pt-2">
        <div className="d-flex justify-content-between align-items-center">
          <small className="text-muted">
            Created {new Date(createdAt).toLocaleDateString()}
          </small>
          
          <MatchActions
            match={match}
            currentUser={currentUser}
            onUpdateScore={onUpdateScore}
            loading={_optimistic}
          />
        </div>
      </Card.Footer>
    </Card>
  );
});

OngoingMatchItem.displayName = 'OngoingMatchItem';

export default OngoingMatchItem;