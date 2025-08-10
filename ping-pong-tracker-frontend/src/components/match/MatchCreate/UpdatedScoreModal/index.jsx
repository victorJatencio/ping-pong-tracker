import React, { useState } from 'react';
import { Modal, Form, Button, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { useAuth } from '../../../../hooks/useAuth';
import { db } from '../../../../config/firebase';
import { doc, updateDoc, serverTimestamp, arrayUnion } from 'firebase/firestore';

const UpdateScoreModal = ({ show, handleClose, match, onScoreUpdated }) => {
    const { currentUser } = useAuth();

    const [formData, setFormData] = useState({
        player1Score: match?.player1Score || 0,
        player2Score: match?.player2Score || 0,
        notes: match?.notes || ''
    });
    const [errors, setErrors] = useState({});
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);

    // Reset form when match changes or modal opens
    React.useEffect(() => {
        if (match && show) {
            setFormData({
                player1Score: match.player1Score || 0,
                player2Score: match.player2Score || 0,
                notes: match.notes || ''
            });
            setErrors({});
            setSuccessMessage('');
            setErrorMessage('');
            setShowConfirmation(false);
        }
    }, [match, show]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevData => ({
            ...prevData,
            [name]: value
        }));
        if (errors[name]) {
            setErrors(prevErrors => ({
                ...prevErrors,
                [name]: undefined
            }));
        }
    };

    const validateForm = () => {
        const newErrors = {};
        
        const p1Score = parseInt(formData.player1Score);
        const p2Score = parseInt(formData.player2Score);

        if (formData.player1Score === '' || isNaN(p1Score) || p1Score < 0) {
            newErrors.player1Score = 'Player 1 score must be a valid number (0 or greater).';
        }
        if (formData.player2Score === '' || isNaN(p2Score) || p2Score < 0) {
            newErrors.player2Score = 'Player 2 score must be a valid number (0 or greater).';
        }
        
        if (!newErrors.player1Score && !newErrors.player2Score) {
            if (p1Score === p2Score) {
                newErrors.scores = 'Scores cannot be tied. Ping-pong matches must have a winner.';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (!currentUser) {
            setErrorMessage("You must be logged in to update scores.");
            return;
        }

        if (!match) {
            setErrorMessage("No match data available.");
            return;
        }

        // Check if user is authorized to update this match
        if (currentUser.uid !== match.player1Id && currentUser.uid !== match.player2Id) {
            setErrorMessage("You can only update scores for matches you're participating in.");
            return;
        }

        if (validateForm()) {
            setShowConfirmation(true);
        } else {
            setErrorMessage('Please correct the errors in the form.');
        }
    };

    const confirmScoreUpdate = async () => {
        setLoading(true);
        setShowConfirmation(false);

        try {
            const p1Score = parseInt(formData.player1Score);
            const p2Score = parseInt(formData.player2Score);

            // Determine winner and loser
            let winnerId = '';
            let loserId = '';

            if (p1Score > p2Score) {
                winnerId = match.player1Id;
                loserId = match.player2Id;
            } else {
                winnerId = match.player2Id;
                loserId = match.player1Id;
            }

            // Create score update history entry
            const scoreUpdate = {
                timestamp: new Date(),
                updatedBy: currentUser.uid,
                previousScores: {
                    player1Score: match.player1Score,
                    player2Score: match.player2Score
                },
                newScores: {
                    player1Score: p1Score,
                    player2Score: p2Score
                },
                previousStatus: match.status
            };

            // Update match document
            const matchRef = doc(db, 'matches', match.id);
            const updateData = {
                player1Score: p1Score,
                player2Score: p2Score,
                winnerId: winnerId,
                loserId: loserId,
                notes: formData.notes,
                status: 'completed',
                completedDate: serverTimestamp(),
                updatedAt: serverTimestamp(),
                lastUpdatedBy: currentUser.uid,
                scoreUpdateHistory: arrayUnion(scoreUpdate)
            };

            await updateDoc(matchRef, updateData);
            
            console.log("Match scores updated successfully");
            setSuccessMessage('Match scores updated successfully! The opponent will be notified.');
            
            // Call callback to refresh parent component
            if (onScoreUpdated) {
                onScoreUpdated();
            }
            
            // Close modal after success
            setTimeout(() => {
                handleClose();
            }, 2000);

        } catch (error) {
            console.error('Error updating match scores:', error);
            setErrorMessage(`Failed to update scores: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const cancelConfirmation = () => {
        setShowConfirmation(false);
    };

    if (!match) {
        return null;
    }

    // Get player names for display
    const getPlayerName = (playerId) => {
        // This would ideally come from a users context or prop
        // For now, we'll show the ID or you can pass user data as props
        return playerId === currentUser?.uid ? 'You' : 'Opponent';
    };

    return (
        <Modal show={show} onHide={handleClose} centered size="lg">
            <Modal.Header closeButton>
                <Modal.Title>Update Match Score</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {successMessage && <Alert variant="success">{successMessage}</Alert>}
                {errorMessage && <Alert variant="danger">{errorMessage}</Alert>}
                
                {!showConfirmation ? (
                    <>
                        <Alert variant="warning" className="mb-3">
                            <strong>⚠️ Score Update</strong><br />
                            You're updating the final scores for this match. 
                            The opponent will be notified of this change.
                        </Alert>

                        {/* Match Info Display */}
                        <div className="p-3 rounded mb-3">
                            <h6 className="mb-2">Match Details</h6>
                            <p className="mb-1"><strong>Date:</strong> {match.date} at {match.time}</p>
                            <p className="mb-1"><strong>Location:</strong> {match.location}</p>
                            <p className="mb-0"><strong>Status:</strong> 
                                <span className={`badge ms-2 ${
                                    match.status === 'scheduled' ? 'bg-primary' : 
                                    match.status === 'in-progress' ? 'bg-warning' : 'bg-success'
                                }`}>
                                    {match.status.charAt(0).toUpperCase() + match.status.slice(1)}
                                </span>
                            </p>
                        </div>

                        <Form onSubmit={handleSubmit}>
                            <Row className="mb-3">
                                <Col>
                                    <Form.Label>
                                        {getPlayerName(match.player1Id)} Score
                                    </Form.Label>
                                    <Form.Control
                                        type="number"
                                        name="player1Score"
                                        value={formData.player1Score}
                                        onChange={handleChange}
                                        isInvalid={!!errors.player1Score || !!errors.scores}
                                        min="0"
                                    />
                                    <Form.Control.Feedback type="invalid">
                                        {errors.player1Score}
                                    </Form.Control.Feedback>
                                </Col>
                                <Col className="d-flex align-items-end justify-content-center">
                                    <span className="fs-4 fw-bold text-muted">-</span>
                                </Col>
                                <Col>
                                    <Form.Label>
                                        {getPlayerName(match.player2Id)} Score
                                    </Form.Label>
                                    <Form.Control
                                        type="number"
                                        name="player2Score"
                                        value={formData.player2Score}
                                        onChange={handleChange}
                                        isInvalid={!!errors.player2Score || !!errors.scores}
                                        min="0"
                                    />
                                    <Form.Control.Feedback type="invalid">
                                        {errors.player2Score}
                                    </Form.Control.Feedback>
                                </Col>
                            </Row>
                            {errors.scores && <Alert variant="danger" className="mt-2">{errors.scores}</Alert>}

                            <Form.Group className="mb-4" controlId="formNotes">
                                <Form.Label>Notes (Optional)</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={3}
                                    placeholder="Any additional notes about the match?"
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleChange}
                                />
                            </Form.Group>

                            <div className="d-grid gap-2">
                                <Button variant="primary" type="submit" size="lg">
                                    Update Score
                                </Button>
                                <Button variant="outline-secondary" onClick={handleClose}>
                                    Cancel
                                </Button>
                            </div>
                        </Form>
                    </>
                ) : (
                    /* Confirmation Dialog */
                    <div className="text-center">
                        <div className="mb-4">
                            <h5 className="text-warning">⚠️ Confirm Score Update</h5>
                            <p className="text-muted">
                                You're about to change the score values. This action will:
                            </p>
                            <ul className="list-unstyled">
                                <li>✅ Update the match to "Completed" status</li>
                                <li>✅ Set the final scores</li>
                                <li>✅ Determine the winner</li>
                                <li>✅ Notify the opponent</li>
                                <li>✅ Create an audit trail</li>
                            </ul>
                        </div>

                        <div className="p-3 rounded mb-4">
                            <h6>New Scores:</h6>
                            <div className="fs-4 fw-bold">
                                {getPlayerName(match.player1Id)}: {formData.player1Score} - {getPlayerName(match.player2Id)}: {formData.player2Score}
                            </div>
                            <div className="mt-2">
                                <span className="badge bg-success">
                                    Winner: {parseInt(formData.player1Score) > parseInt(formData.player2Score) 
                                        ? getPlayerName(match.player1Id) 
                                        : getPlayerName(match.player2Id)}
                                </span>
                            </div>
                        </div>

                        <div className="d-grid gap-2">
                            <Button 
                                variant="warning" 
                                size="lg" 
                                onClick={confirmScoreUpdate}
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <Spinner
                                            as="span"
                                            animation="border"
                                            size="sm"
                                            role="status"
                                            aria-hidden="true"
                                            className="me-2"
                                        />
                                        Updating...
                                    </>
                                ) : (
                                    'Confirm Update'
                                )}
                            </Button>
                            <Button 
                                variant="outline-secondary" 
                                onClick={cancelConfirmation}
                                disabled={loading}
                            >
                                Go Back
                            </Button>
                        </div>
                    </div>
                )}
            </Modal.Body>
        </Modal>
    );
};

export default UpdateScoreModal;

