import React, { useState, useCallback, useMemo } from 'react';
import { Modal, Form, Button, Alert, Row, Col, Badge, Spinner } from 'react-bootstrap';
import { useUpdateMatchScoreMutation } from '../../store/slices/apiSlice';
import { validatePingPongScore, createScoreAuditEntry } from '../../utils/scoreValidation';
import UserAvatar from '../common/UserAvatar';

/**
 * Score update modal with comprehensive anti-cheating validation
 * Implements ping-pong rules and provides clear user feedback
 */
const UpdateScoreModal = React.memo(({ show, match, onClose, onScoreUpdated }) => {
  const [player1Score, setPlayer1Score] = useState(match?.player1Score || 0);
  const [player2Score, setPlayer2Score] = useState(match?.player2Score || 0);
  const [notes, setNotes] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  const [updateMatchScore, { isLoading: isUpdating }] = useUpdateMatchScoreMutation();

  // Real-time score validation
  const validation = useMemo(() => {
    return validatePingPongScore(player1Score, player2Score);
  }, [player1Score, player2Score]);

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (show && match) {
      setPlayer1Score(match.player1Score || 0);
      setPlayer2Score(match.player2Score || 0);
      setNotes('');
      setShowConfirmation(false);
    }
  }, [show, match]);

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

  // Handle form submission
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (!validation.isValid) {
      return;
    }

    if (!showConfirmation) {
      setShowConfirmation(true);
      return;
    }

    try {
      // Create audit trail entry
      const auditEntry = createScoreAuditEntry(
        match.id,
        match.currentUser?.uid,
        { player1Score: match.player1Score, player2Score: match.player2Score },
        { player1Score, player2Score }
      );

      // Update match score
      await updateMatchScore({
        matchId: match.id,
        player1Score,
        player2Score,
        currentUserId: match.currentUser?.uid,
        opponentId: match.opponent?.id,
        notes,
        auditEntry
      }).unwrap();

      // Notify parent component
      onScoreUpdated();
      
    } catch (error) {
      console.error('Failed to update score:', error);
      // Error handling is managed by RTK Query
    }
  }, [
    validation.isValid,
    showConfirmation,
    match,
    player1Score,
    player2Score,
    notes,
    updateMatchScore,
    onScoreUpdated
  ]);

  // Handle modal close
  const handleClose = useCallback(() => {
    if (!isUpdating) {
      setShowConfirmation(false);
      onClose();
    }
  }, [isUpdating, onClose]);

  // Get player names for display
  const player1Name = match?.isCurrentUserPlayer1 
    ? 'You' 
    : match?.opponent?.displayName || 'Opponent';
  const player2Name = match?.isCurrentUserPlayer1 
    ? match?.opponent?.displayName || 'Opponent'
    : 'You';

  return (
    <Modal show={show} onHide={handleClose} centered size="md">
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
                <UserAvatar user={match?.opponent} size={40} />
              </Col>
              <Col>
                <div className="fw-bold">
                  vs. {match?.opponent?.displayName || 'Unknown Player'}
                </div>
                <small className="text-muted">
                  {match?.location && (
                    <>
                      <i className="bi bi-geo-alt me-1"></i>
                      {match.location}
                    </>
                  )}
                </small>
              </Col>
            </Row>
          </div>

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
          {validation.isValid && (
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
            onClick={handleClose}
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