import React from 'react';
import { Badge } from 'react-bootstrap';

/**
 * Match score component for displaying current scores
 */
const MatchScore = React.memo(({ 
  player1Score, 
  player2Score, 
  status, 
  currentUserIsPlayer1 = true 
}) => {
  const score1 = player1Score || 0;
  const score2 = player2Score || 0;
  
  // Display score from current user's perspective
  const displayScore = currentUserIsPlayer1 
    ? `${score1} - ${score2}`
    : `${score2} - ${score1}`;

  // Determine if current user is winning (for completed matches)
  const currentUserScore = currentUserIsPlayer1 ? score1 : score2;
  const opponentScore = currentUserIsPlayer1 ? score2 : score1;
  const isWinning = currentUserScore > opponentScore;

  return (
    <div className="text-center">
      <div className="display-6 fw-bold mb-1">
        {displayScore}
      </div>
      
      {status === 'completed' && (
        <Badge 
          bg={isWinning ? 'success' : 'danger'} 
          className="px-3 py-2"
        >
          {isWinning ? 'You Won!' : 'You Lost'}
        </Badge>
      )}
      
      {status === 'scheduled' && (
        <small className="text-muted">Match not started</small>
      )}
      
      {status === 'in-progress' && (
        <small className="text-warning">
          <i className="bi bi-clock me-1"></i>
          In progress
        </small>
      )}
    </div>
  );
});

MatchScore.displayName = 'MatchScore';

export default MatchScore;