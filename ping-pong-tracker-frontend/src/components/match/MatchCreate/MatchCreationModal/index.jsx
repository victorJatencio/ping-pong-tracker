import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Row, Col, Alert, Spinner } from 'react-bootstrap'; // <--- Add Spinner
import { useAuth } from '../../../../hooks/useAuth';
import { db } from '../../../../config/firebase'; // <--- Import db
import { collection, addDoc, serverTimestamp, query, getDocs, where } from 'firebase/firestore'; // <--- Import Firestore functions

const MatchCreationModal = ({ show, handleClose }) => {
    const { currentUser } = useAuth();

    const [formData, setFormData] = useState({
        date: '',
        time: '',
        location: '',
        opponent: '', // This will be opponent's UID
        scorePlayer1: '',
        scorePlayer2: '',
        notes: ''
    });
    const [errors, setErrors] = useState({});
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [loading, setLoading] = useState(false); // <--- Add loading state
    const [opponents, setOpponents] = useState([]); // <--- State for real opponents

    // Fetch opponents from Firestore
    useEffect(() => {
        const fetchOpponents = async () => {
            if (!currentUser) return; // Don't fetch if no current user

            try {
                const usersRef = collection(db, 'users');
                // Fetch all users except the current user
                const q = query(usersRef, where('uid', '!=', currentUser.uid));
                const querySnapshot = await getDocs(q);
                const fetchedOpponents = querySnapshot.docs.map(doc => ({
                    id: doc.id, // Document ID is usually the UID if you set it that way
                    ...doc.data()
                }));
                setOpponents(fetchedOpponents);
            } catch (error) {
                console.error("Error fetching opponents:", error);
                setErrorMessage("Failed to load opponents. Please try again.");
            }
        };

        if (show) { // Fetch opponents only when modal is shown
            fetchOpponents();
            // Reset form and messages when modal opens
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            setFormData({
                date: `${year}-${month}-${day}`,
                time: '',
                location: '',
                opponent: '',
                scorePlayer1: '',
                scorePlayer2: '',
                notes: ''
            });
            setErrors({});
            setSuccessMessage('');
            setErrorMessage('');
        }
    }, [show, currentUser]); // Re-run when modal shows or currentUser changes

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
        if (!formData.date) newErrors.date = 'Match date is required.';
        if (!formData.time) newErrors.time = 'Match time is required.';
        if (!formData.location) newErrors.location = 'Location is required.';
        if (!formData.opponent) newErrors.opponent = 'Opponent is required.';
        
        const p1Score = parseInt(formData.scorePlayer1);
        const p2Score = parseInt(formData.scorePlayer2);

        if (formData.scorePlayer1 === '' || isNaN(p1Score)) newErrors.scorePlayer1 = 'Your score is required and must be a number.';
        if (formData.scorePlayer2 === '' || isNaN(p2Score)) newErrors.scorePlayer2 = 'Opponent score is required and must be a number.';
        
        if (!newErrors.scorePlayer1 && !newErrors.scorePlayer2) {
            if (p1Score === p2Score) {
                newErrors.scores = 'Scores cannot be tied for a win/loss match.';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSuccessMessage('');
        setErrorMessage('');
        setLoading(true); // <--- Set loading to true

        if (!currentUser) {
            setErrorMessage("You must be logged in to record a match.");
            setLoading(false);
            return;
        }

        if (validateForm()) {
            try {
                const p1Score = parseInt(formData.scorePlayer1);
                const p2Score = parseInt(formData.scorePlayer2);

                let winnerId = '';
                let loserId = '';

                if (p1Score > p2Score) {
                    winnerId = currentUser.uid;
                    loserId = formData.opponent;
                } else if (p2Score > p1Score) {
                    winnerId = formData.opponent;
                    loserId = currentUser.uid;
                } else {
                    // This case should be caught by validation, but as a fallback
                    setErrorMessage("Scores cannot be tied.");
                    setLoading(false);
                    return;
                }
                
                const matchData = {
                    player1Id: currentUser.uid, // The user recording the match
                    player2Id: formData.opponent,
                    player1Score: p1Score,
                    player2Score: p2Score,
                    winnerId: winnerId,
                    loserId: loserId,
                    date: formData.date,
                    time: formData.time,
                    location: formData.location,
                    notes: formData.notes,
                    createdAt: serverTimestamp(), // Firebase server timestamp
                    updatedAt: serverTimestamp()
                };

                const docRef = await addDoc(collection(db, 'matches'), matchData);
                console.log("Document written with ID: ", docRef.id);
                
                setSuccessMessage('Match successfully recorded!');
                // Optionally close modal after success
                // setTimeout(handleClose, 2000); 

            } catch (error) {
                console.error('Error submitting match:', error);
                setErrorMessage('Failed to record match. Please try again.');
            } finally {
                setLoading(false); // <--- Set loading to false
            }
        } else {
            setErrorMessage('Please correct the errors in the form.');
            setLoading(false); // <--- Set loading to false
        }
    };

    return (
        <Modal show={show} onHide={handleClose} centered size="lg">
            <Modal.Header closeButton>
                <Modal.Title>Record a New Match</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {successMessage && <Alert variant="success">{successMessage}</Alert>}
                {errorMessage && <Alert variant="danger">{errorMessage}</Alert>}
                <Form onSubmit={handleSubmit}>
                    <Row className="mb-3">
                        <Form.Group as={Col} controlId="formDate">
                            <Form.Label>Date</Form.Label>
                            <Form.Control
                                type="date"
                                name="date"
                                value={formData.date}
                                onChange={handleChange}
                                isInvalid={!!errors.date}
                            />
                            <Form.Control.Feedback type="invalid">
                                {errors.date}
                            </Form.Control.Feedback>
                        </Form.Group>

                        <Form.Group as={Col} controlId="formTime">
                            <Form.Label>Time</Form.Label>
                            <Form.Control
                                type="time"
                                name="time"
                                value={formData.time}
                                onChange={handleChange}
                                isInvalid={!!errors.time}
                            />
                            <Form.Control.Feedback type="invalid">
                                {errors.time}
                            </Form.Control.Feedback>
                        </Form.Group>
                    </Row>

                    <Form.Group className="mb-3" controlId="formLocation">
                        <Form.Label>Location</Form.Label>
                        <Form.Control
                            type="text"
                            placeholder="e.g., Office Game Room, My Garage"
                            name="location"
                            value={formData.location}
                            onChange={handleChange}
                            isInvalid={!!errors.location}
                        />
                        <Form.Control.Feedback type="invalid">
                            {errors.location}
                        </Form.Control.Feedback>
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="formOpponent">
                        <Form.Label>Opponent</Form.Label>
                        <Form.Select
                            name="opponent"
                            value={formData.opponent}
                            onChange={handleChange}
                            isInvalid={!!errors.opponent}
                        >
                            <option value="">Select an opponent</option>
                            {opponents.map(opponent => (
                                <option key={opponent.id} value={opponent.id}> {/* Use opponent.id for key and value */}
                                    {opponent.name || opponent.email} {/* Use opponent.name for display */}
                                </option>
                            ))}
                        </Form.Select>
                        <Form.Control.Feedback type="invalid">
                            {errors.opponent}
                        </Form.Control.Feedback>
                    </Form.Group>

                    <Row className="mb-3">
                        <Col>
                            <Form.Label>Your Score</Form.Label>
                            <Form.Control
                                type="number"
                                name="scorePlayer1"
                                value={formData.scorePlayer1}
                                onChange={handleChange}
                                isInvalid={!!errors.scorePlayer1 || !!errors.scores}
                            />
                            <Form.Control.Feedback type="invalid">
                                {errors.scorePlayer1}
                            </Form.Control.Feedback>
                        </Col>
                        <Col className="d-flex align-items-end justify-content-center">
                            <span className="fs-4 fw-bold text-muted">-</span>
                        </Col>
                        <Col>
                            <Form.Label>Opponent Score</Form.Label>
                            <Form.Control
                                type="number"
                                name="scorePlayer2"
                                value={formData.scorePlayer2}
                                onChange={handleChange}
                                isInvalid={!!errors.scorePlayer2 || !!errors.scores}
                            />
                            <Form.Control.Feedback type="invalid">
                                {errors.scorePlayer2}
                            </Form.Control.Feedback>
                        </Col>
                    </Row>
                    {errors.scores && <Alert variant="danger" className="mt-2">{errors.scores}</Alert>}

                    <Form.Group className="mb-4" controlId="formNotes">
                        <Form.Label>Notes (Optional)</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={3}
                            placeholder="Any special notes about the match?"
                            name="notes"
                            value={formData.notes}
                            onChange={handleChange}
                        />
                    </Form.Group>

                    <div className="d-grid">
                        <Button variant="primary" type="submit" size="lg" disabled={loading}>
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
                                    Recording...
                                </>
                            ) : (
                                'Record Match'
                            )}
                        </Button>
                    </div>
                </Form>
            </Modal.Body>
        </Modal>
    );
};

export default MatchCreationModal;
