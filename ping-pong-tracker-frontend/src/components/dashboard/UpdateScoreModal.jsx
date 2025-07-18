import React, { useState, useCallback, useMemo } from 'react';
import { Modal, Form, Button, Alert, Row, Col, Badge, Spinner } from 'react-bootstrap';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';

/**
 * Fixed UpdateScoreModal that works with direct Firebase updates
 * Implements ping-pong rules and provides clear user feedback
 */
const UpdateScoreModal = React.memo(({ show, match, handleClose, onScoreUpdated }) => {
  const [player1Score, setPlayer1Score] = useState(0);
  const [player2Score, setPlayer2Score] = useState(0);
  const [notes, setNotes] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState('');

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (show && match) {
      setPlayer1Score(match.player1Score || 0);
      setPlayer2Score(match.player2Score || 0);
      setNotes('');
      setShowConfirmation(false);
      setError('');
    }
  }, [show, match]);

  // Simple ping-pong score validation
  const validation = useMemo(() => {
    const score1 = parseInt(player1Score) || 0;
    const score2 = parseInt(player2Score) || 0;
    const errors = [];
    const warnings = [];

    // Basic validation
    if (score1 < 0 || score2 < 0) {
      errors.push("Scores cannot be negative");
    }

    if (score1 > 50 || score2 > 50) {
      errors.push("Scores seem unreasonably high");
    }

    // Ping-pong rules validation
    const maxScore = Math.max(score1, score2);
    const minScore = Math.min(score1, score2);
    const scoreDiff = maxScore - minScore;

    if (maxScore >= 21) {
      if (scoreDiff < 2) {
        errors.push("Winner must win by at least 2 points");
      }
    } else if (maxScore > 0) {
      warnings.push("Match doesn't appear to be finished (scores under 21)");
    }

    const isValid = errors.length === 0;
    const winner = score1 > score2 ? 'player1' : score2 > score1 ? 'player2' : null;

    return { isValid, errors, warnings, winner };
  }, [player1Score, player2Score]);

  // Handle score input changes with validation
  const handleScoreChange = useCallback((player, value) => {
    const numValue = parseInt(value) || 0;
    
    // Prevent negative scores
    if (numValue < 0) return;
    
    // Prevent unreasonably high scores during input
    if (numValue > 100) return;
    
    if (player === 'player1') {
      setPlayer1Score(numValue);
    } else {
      setPlayer2Score(numValue);
    }
  }, []);

  // Handle form submission with direct Firebase update
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (!validation.isValid) {
      return;
    }

    if (!showConfirmation) {
      setShowConfirmation(true);
      return;
    }

    setIsUpdating(true);
    setError('');

    try {
      // Update match in Firebase
      const matchRef = doc(db, 'matches', match.id);
      
      await updateDoc(matchRef, {
        player1Score: parseInt(player1Score),
        player2Score: parseInt(player2Score),
        status: 'completed',
        completedDate: serverTimestamp(),
        updatedAt: serverTimestamp(),
        notes: notes.trim() || null,
        // Add audit trail
        lastUpdatedBy: match.currentUser?.uid || 'unknown',
        scoreHistory: {
          previousScore: {
            player1Score: match.player1Score || 0,
            player2Score: match.player2Score || 0
          },
          newScore: {
            player1Score: parseInt(player1Score),
            player2Score: parseInt(player2Score)
          },
          updatedAt: serverTimestamp(),
          updatedBy: match.currentUser?.uid || 'unknown'
        }
      });

      // Success - close modal and notify parent
      setTimeout(() => {
        setIsUpdating(false);
        handleClose();
        onScoreUpdated();
      }, 1000); // Brief delay to show success state

    } catch (error) {
      console.error('Failed to update score:', error);
      setError('Failed to update score. Please try again.');
      setIsUpdating(false);
    }
  }, [
    validation.isValid,
    showConfirmation,
    match,
    player1Score,
    player2Score,
    notes,
    handleClose,
    onScoreUpdated
  ]);

  // Handle modal close
  const handleModalClose = useCallback(() => {
    if (!isUpdating) {
      setShowConfirmation(false);
      setError('');
      handleClose();
    }
  }, [isUpdating, handleClose]);

  // Get opponent information from the match data
  const getOpponentInfo = () => {
    if (!match) return { name: 'Unknown Player', avatar: null };
    
    // The merged component should pass opponent info
    if (match.opponent) {
      return {
        name: match.opponent.name || match.opponent.displayName || match.opponent.email || 'Unknown Player',
        avatar: match.opponent.photoURL || null
      };
    }
    
    // Fallback: try to get opponent name from users data
    const currentUserId = match.currentUser?.uid;
    const opponentId = match.player1Id === currentUserId ? match.player2Id : match.player1Id;
    
    return {
      name: `Player ${opponentId?.substring(0, 8) || 'Unknown'}`,
      avatar: null
    };
  };

  const opponent = getOpponentInfo();

  // Get player names for display
  const player1Name = match?.player1Id === match?.currentUser?.uid ? 'You' : opponent.name;
  const player2Name = match?.player1Id === match?.currentUser?.uid ? opponent.name : 'You';

  if (!match) {
    return null;
  }

  return (
    <Modal show={show} onHide={handleModalClose} centered size="md">
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-trophy me-2"></i>
          Update Match Score
        </Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {/* Match Information */}
          <div className="mb-4 p-3 bg-light rounded">
            <Row className="align-items-center">
              <Col xs="auto">
                {opponent.avatar ? (
                  <img 
                    src={opponent.avatar} 
                    alt={opponent.name}
                    className="rounded-circle"
                    width="40"
                    height="40"
                  />
                ) : (
                  <div 
                    className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center"
                    style={{ width: '40px', height: '40px' }}
                  >
                    {opponent.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </Col>
              <Col>
                <div className="fw-bold">
                  vs. {opponent.name}
                </div>
                <small className="text-muted">
                  {match.location && (
                    <>
                      <i className="bi bi-geo-alt me-1"></i>
                      {match.location}
                    </>
                  )}
                </small>
              </Col>
            </Row>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="danger" className="mb-3">
              {error}
            </Alert>
          )}

          {/* Score Input */}
          <Row className="mb-4">
            <Col>
              <Form.Group>
                <Form.Label className="fw-bold">{player1Name}</Form.Label>
                <Form.Control
                  type="number"
                  min="0"
                  max="50"
                  value={player1Score}
                  onChange={(e) => handleScoreChange('player1', e.target.value)}
                  className="text-center fs-4"
                  disabled={isUpdating}
                />
              </Form.Group>
            </Col>
            <Col xs="auto" className="d-flex align-items-center">
              <div className="fs-2 text-muted">-</div>
            </Col>
            <Col>
              <Form.Group>
                <Form.Label className="fw-bold">{player2Name}</Form.Label>
                <Form.Control
                  type="number"
                  min="0"
                  max="50"
                  value={player2Score}
                  onChange={(e) => handleScoreChange('player2', e.target.value)}
                  className="text-center fs-4"
                  disabled={isUpdating}
                />
              </Form.Group>
            </Col>
          </Row>

          {/* Validation Feedback */}
          {validation.errors.length > 0 && (
            <Alert variant="danger" className="mb-3">
              <Alert.Heading className="h6">Invalid Score</Alert.Heading>
              <ul className="mb-0">
                {validation.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </Alert>
          )}

          {validation.warnings.length > 0 && validation.isValid && (
            <Alert variant="warning" className="mb-3">
              <Alert.Heading className="h6">Please Confirm</Alert.Heading>
              <ul className="mb-0">
                {validation.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </Alert>
          )}

          {/* Winner Display */}
          {validation.isValid && validation.winner && (
            <div className="text-center mb-3">
              <Badge bg="success" className="px-3 py-2">
                Winner: {validation.winner === 'player1' ? player1Name : player2Name}
              </Badge>
            </div>
          )}

          {/* Confirmation Step */}
          {showConfirmation && validation.isValid && (
            <Alert variant="info" className="mb-3">
              <Alert.Heading className="h6">Confirm Final Score</Alert.Heading>
              <p className="mb-2">
                Are you sure this is the final score? This action cannot be undone.
              </p>
              <div className="text-center">
                <strong>{player1Name}: {player1Score} - {player2Name}: {player2Score}</strong>
              </div>
            </Alert>
          )}

          {/* Optional Notes */}
          <Form.Group className="mb-3">
            <Form.Label>Notes (Optional)</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about the match..."
              disabled={isUpdating}
              maxLength={500}
            />
            <Form.Text className="text-muted">
              {notes.length}/500 characters
            </Form.Text>
          </Form.Group>

          {/* Success State */}
          {isUpdating && (
            <Alert variant="success" className="mb-3">
              <div className="d-flex align-items-center">
                <Spinner animation="border" size="sm" className="me-2" />
                <span>Updating score...</span>
              </div>
            </Alert>
          )}

          {/* Anti-Cheating Information */}
          <Alert variant="info" className="small">
            <i className="bi bi-shield-check me-1"></i>
            <strong>Fair Play:</strong> All score updates are logged for transparency. 
            Scores must follow standard ping-pong rules (21+ points, win by 2).
          </Alert>
        </Modal.Body>

        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={handleModalClose}
            disabled={isUpdating}
          >
            Cancel
          </Button>
          
          {!showConfirmation ? (
            <Button
              type="submit"
              variant="primary"
              disabled={!validation.isValid || isUpdating}
            >
              {validation.isValid ? 'Continue' : 'Fix Errors First'}
            </Button>
          ) : (
            <Button
              type="submit"
              variant="success"
              disabled={isUpdating}
              className="d-flex align-items-center"
            >
              {isUpdating ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Updating Score...
                </>
              ) : (
                <>
                  <i className="bi bi-check-circle me-2"></i>
                  Confirm & Update
                </>
              )}
            </Button>
          )}
        </Modal.Footer>
      </Form>
    </Modal>
  );
});

UpdateScoreModal.displayName = 'UpdateScoreModal';

export default UpdateScoreModal;

