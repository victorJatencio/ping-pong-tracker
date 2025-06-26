import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { useDispatch } from 'react-redux'; 
import { useAuth } from '../../../../hooks/useAuth';
import { db } from '../../../../config/firebase';
import { collection, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { closeMatchCreationModal } from '../../../../store/slices/uiSlice';

const MatchCreationModal = ({ show, data }) => {
    const { currentUser } = useAuth();
    const dispatch = useDispatch();

    const handleClose = () => {
        dispatch(closeMatchCreationModal());
    };

    const [formData, setFormData] = useState({
        date: '',
        time: '',
        location: '',
        opponent: '', // This will be opponent's UID
        notes: ''
    });
    const [errors, setErrors] = useState({});
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [opponents, setOpponents] = useState([]);
    const [fetchingOpponents, setFetchingOpponents] = useState(false);

    // Fetch opponents from Firestore
    useEffect(() => {
        const fetchOpponents = async () => {
            if (!currentUser) {
                console.log('No current user, skipping opponent fetch');
                return;
            }

            console.log('Current user:', currentUser.uid);
            setFetchingOpponents(true);

            try {
                const usersRef = collection(db, 'users');
                console.log('Fetching from users collection...');
                
                // Fetch ALL users, then filter out current user in JavaScript
                const querySnapshot = await getDocs(usersRef);
                
                console.log('Query snapshot size:', querySnapshot.size);
                
                const fetchedOpponents = querySnapshot.docs
                    .filter(doc => doc.id !== currentUser.uid)
                    .map(doc => {
                        const data = doc.data();
                        console.log('User document:', doc.id, data);
                        return {
                            id: doc.id,
                            uid: doc.id,
                            ...data
                        };
                    });
                
                console.log('Fetched opponents:', fetchedOpponents);
                setOpponents(fetchedOpponents);
                
                if (fetchedOpponents.length === 0) {
                    setErrorMessage("No other users found. Make sure other users are registered in the system.");
                }
            } catch (error) {
                console.error("Error fetching opponents:", error);
                setErrorMessage(`Failed to load opponents: ${error.message}`);
            } finally {
                setFetchingOpponents(false);
            }
        };

        if (show) {
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
                notes: ''
            });
            setErrors({});
            setSuccessMessage('');
            setErrorMessage('');
        }
    }, [show, currentUser]);

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
        
        // Removed score validation - scores will default to 0-0

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSuccessMessage('');
        setErrorMessage('');
        setLoading(true);

        if (!currentUser) {
            setErrorMessage("You must be logged in to schedule a match.");
            setLoading(false);
            return;
        }

        if (validateForm()) {
            try {
                // Create match data with new schema
                const matchData = {
                    // Player information
                    player1Id: currentUser.uid, // The user scheduling the match
                    player2Id: formData.opponent,
                    
                    // Scores (default to 0-0 for scheduled matches)
                    player1Score: 0,
                    player2Score: 0,
                    
                    // Winner/Loser (null for scheduled matches)
                    winnerId: null,
                    loserId: null,
                    
                    // Match details
                    date: formData.date,
                    time: formData.time,
                    location: formData.location,
                    notes: formData.notes,
                    
                    // Timestamps
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    
                    // New workflow fields
                    status: "scheduled", // scheduled | in-progress | completed
                    scheduledDate: serverTimestamp(),
                    completedDate: null,
                    lastUpdatedBy: currentUser.uid,
                    scoreUpdateHistory: [] // Track score changes for transparency
                };

                console.log('Scheduling match data:', matchData);
                const docRef = await addDoc(collection(db, 'matches'), matchData);
                console.log("Match scheduled with ID: ", docRef.id);
                
                setSuccessMessage('Match successfully scheduled! You can update the score after playing.');
                
                // Close modal after success
                setTimeout(() => {
                    handleClose();
                }, 2000);

            } catch (error) {
                console.error('Error scheduling match:', error);
                setErrorMessage(`Failed to schedule match: ${error.message}`);
            } finally {
                setLoading(false);
            }
        } else {
            setErrorMessage('Please correct the errors in the form.');
            setLoading(false);
        }
    };

    return (
        <Modal show={show} onHide={handleClose} centered size="lg">
            <Modal.Header closeButton>
                <Modal.Title>Schedule a New Match</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {successMessage && <Alert variant="success">{successMessage}</Alert>}
                {errorMessage && <Alert variant="danger">{errorMessage}</Alert>}
                
                <Alert variant="info" className="mb-3">
                    <strong>📅 Scheduling a Match</strong><br />
                    You're creating a scheduled match with initial scores of 0-0. 
                    After playing, you can update the final scores from your dashboard.
                </Alert>

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
                        <Form.Label>
                            Opponent 
                            {fetchingOpponents && (
                                <Spinner 
                                    as="span" 
                                    animation="border" 
                                    size="sm" 
                                    className="ms-2" 
                                />
                            )}
                        </Form.Label>
                        <Form.Select
                            name="opponent"
                            value={formData.opponent}
                            onChange={handleChange}
                            isInvalid={!!errors.opponent}
                            disabled={fetchingOpponents}
                        >
                            <option value="">
                                {fetchingOpponents ? 'Loading opponents...' : 'Select an opponent'}
                            </option>
                            {opponents.map(opponent => (
                                <option key={opponent.id} value={opponent.id}>
                                    {opponent.name || opponent.displayName || opponent.email}
                                </option>
                            ))}
                        </Form.Select>
                        <Form.Control.Feedback type="invalid">
                            {errors.opponent}
                        </Form.Control.Feedback>
                        {opponents.length === 0 && !fetchingOpponents && (
                            <Form.Text className="text-muted">
                                No opponents available. Make sure other users are registered.
                            </Form.Text>
                        )}
                    </Form.Group>

                    {/* Disabled Score Display */}
                    <Row className="mb-3">
                        <Col>
                            <Form.Label>Your Score</Form.Label>
                            <Form.Control
                                type="number"
                                value="0"
                                disabled
                                className="bg-light"
                            />
                            <Form.Text className="text-muted">
                                Scores start at 0-0. Update after playing.
                            </Form.Text>
                        </Col>
                        <Col className="d-flex align-items-end justify-content-center">
                            <span className="fs-4 fw-bold text-muted">-</span>
                        </Col>
                        <Col>
                            <Form.Label>Opponent Score</Form.Label>
                            <Form.Control
                                type="number"
                                value="0"
                                disabled
                                className="bg-light"
                            />
                            <Form.Text className="text-muted">
                                Scores start at 0-0. Update after playing.
                            </Form.Text>
                        </Col>
                    </Row>

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
                                    Scheduling...
                                </>
                            ) : (
                                '📅 Schedule Match'
                            )}
                        </Button>
                    </div>
                </Form>
            </Modal.Body>
        </Modal>
    );
};

export default MatchCreationModal;

