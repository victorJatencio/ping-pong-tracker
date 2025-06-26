import React, { useState, useEffect } from 'react';
import { Card, Button, Badge, Row, Col, Spinner, Alert } from 'react-bootstrap';
import { useAuth } from '../../../hooks/useAuth';
import { db } from '../../../config/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import UpdateScoreModal from '../MatchCreate/UpdatedScoreModal/';

const OngoingMatches = () => {
    const { currentUser } = useAuth();
    const [matches, setMatches] = useState([]);
    const [users, setUsers] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedMatch, setSelectedMatch] = useState(null);
    const [showUpdateModal, setShowUpdateModal] = useState(false);

    // Fetch ongoing matches for current user
    useEffect(() => {
        if (!currentUser) {
            setLoading(false);
            return;
        }

        const matchesRef = collection(db, 'matches');
        
        // Query for matches where current user is a participant and status is not completed
        const q = query(
            matchesRef,
            where('status', 'in', ['scheduled', 'in-progress']),
            orderBy('scheduledDate', 'desc')
        );

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const fetchedMatches = querySnapshot.docs
                .map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }))
                .filter(match => 
                    match.player1Id === currentUser.uid || 
                    match.player2Id === currentUser.uid
                );

            setMatches(fetchedMatches);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching ongoing matches:", error);
            setError("Failed to load ongoing matches.");
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser]);

    // Fetch user data for display names
    useEffect(() => {
        const fetchUsers = async () => {
            if (matches.length === 0) return;

            try {
                const usersRef = collection(db, 'users');
                const unsubscribe = onSnapshot(usersRef, (querySnapshot) => {
                    const usersData = {};
                    querySnapshot.docs.forEach(doc => {
                        usersData[doc.id] = {
                            id: doc.id,
                            ...doc.data()
                        };
                    });
                    setUsers(usersData);
                });

                return () => unsubscribe();
            } catch (error) {
                console.error("Error fetching users:", error);
            }
        };

        fetchUsers();
    }, [matches]);

    const handleUpdateScore = (match) => {
        setSelectedMatch(match);
        setShowUpdateModal(true);
    };

    const handleCloseUpdateModal = () => {
        setShowUpdateModal(false);
        setSelectedMatch(null);
    };

    const handleScoreUpdated = () => {
        // The real-time listener will automatically update the matches
        console.log("Score updated, matches will refresh automatically");
    };

    const getOpponentName = (match) => {
        const opponentId = match.player1Id === currentUser.uid ? match.player2Id : match.player1Id;
        const opponent = users[opponentId];
        return opponent?.name || opponent?.displayName || opponent?.email || 'Unknown Player';
    };

    const getStatusBadge = (status) => {
        const statusConfig = {
            'scheduled': { variant: 'primary', text: 'Scheduled' },
            'in-progress': { variant: 'warning', text: 'In Progress' },
            'completed': { variant: 'success', text: 'Completed' }
        };
        
        const config = statusConfig[status] || { variant: 'secondary', text: status };
        return <Badge bg={config.variant}>{config.text}</Badge>;
    };

    const canUpdateScore = (match) => {
        // Only allow the match creator (player1) to update scores initially
        // This can be expanded to allow both players if needed
        return currentUser.uid === match.player1Id;
    };

    if (loading) {
        return (
            <div className="text-center py-4">
                <Spinner animation="border" role="status">
                    <span className="visually-hidden">Loading ongoing matches...</span>
                </Spinner>
                <p className="mt-2 text-muted">Loading your ongoing matches...</p>
            </div>
        );
    }

    if (error) {
        return (
            <Alert variant="danger">
                {error}
            </Alert>
        );
    }

    if (matches.length === 0) {
        return (
            <Card className="text-center py-4">
                <Card.Body>
                    <h5 className="text-muted">No Ongoing Matches</h5>
                    <p className="text-muted mb-3">
                        You don't have any scheduled or in-progress matches.
                    </p>
                    <Button variant="primary" size="sm">
                        Schedule a New Match
                    </Button>
                </Card.Body>
            </Card>
        );
    }

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0">Ongoing Matches</h5>
                <Badge bg="info">{matches.length} active</Badge>
            </div>

            <Row>
                {matches.map(match => (
                    <Col key={match.id} md={6} lg={4} className="mb-3">
                        <Card className="h-100">
                            <Card.Header className="d-flex justify-content-between align-items-center">
                                <small className="text-muted">
                                    {match.date} at {match.time}
                                </small>
                                {getStatusBadge(match.status)}
                            </Card.Header>
                            <Card.Body>
                                <div className="text-center mb-3">
                                    <h6 className="mb-2">vs {getOpponentName(match)}</h6>
                                    <div className="fs-4 fw-bold text-primary">
                                        {match.player1Score} - {match.player2Score}
                                    </div>
                                </div>
                                
                                <div className="mb-3">
                                    <small className="text-muted d-block">
                                        <strong>Location:</strong> {match.location}
                                    </small>
                                    {match.notes && (
                                        <small className="text-muted d-block">
                                            <strong>Notes:</strong> {match.notes}
                                        </small>
                                    )}
                                </div>

                                <div className="d-grid gap-2">
                                    {canUpdateScore(match) ? (
                                        <Button 
                                            variant="success" 
                                            size="sm"
                                            onClick={() => handleUpdateScore(match)}
                                        >
                                            🏓 Update Score
                                        </Button>
                                    ) : (
                                        <Button variant="outline-secondary" size="sm" disabled>
                                            Waiting for opponent to update
                                        </Button>
                                    )}
                                    
                                    
                                </div>
                            </Card.Body>
                            <Card.Footer className="text-muted">
                                <small>
                                    Created {new Date(match.scheduledDate?.toDate()).toLocaleDateString()}
                                </small>
                            </Card.Footer>
                        </Card>
                    </Col>
                ))}
            </Row>

            {/* Update Score Modal */}
            {selectedMatch && (
                <UpdateScoreModal
                    show={showUpdateModal}
                    handleClose={handleCloseUpdateModal}
                    match={selectedMatch}
                    onScoreUpdated={handleScoreUpdated}
                />
            )}
        </div>
    );
};

export default OngoingMatches;

