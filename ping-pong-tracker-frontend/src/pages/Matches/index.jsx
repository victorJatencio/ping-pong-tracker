import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Form, Table, Badge, Dropdown, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Jumbotron from '../../components/common/Jumbotron';
import UserAvatar from '../../components/common/UserAvatar';
import matchService from '../../services/matchService';
import userService from '../../services/userService';
import { formatScheduledDateTime } from '../../utils/dateUtils';
import createTestMatch from '../../utils/createTestMatch';
import invitationService from '../../services/invitationService';
import createTestInvitation from '../../utils/createTestInvitation';
import { toast } from 'react-toastify';

const Matches = () => {
    const { currentUser } = useAuth();
    const [selectedPlayer, setSelectedPlayer] = useState('');
    const [selectedDateTime, setSelectedDateTime] = useState('');
    
    // State for upcoming matches
    const [upcomingMatches, setUpcomingMatches] = useState([]);
    const [upcomingMatchesLoading, setUpcomingMatchesLoading] = useState(true);
    const [upcomingMatchesError, setUpcomingMatchesError] = useState('');
    
    // Mock data for other sections (will be replaced in future steps)
    const [pendingInvitations, setPendingInvitations] = useState([]);
    const [pendingInvitationsLoading, setPendingInvitationsLoading] = useState(true);
    const [pendingInvitationsError, setPendingInvitationsError] = useState('');

    const recentMatches = [
        { id: 1, date: 'June 5, 2025', opponent: 'Jane', opponentAvatar: null, score: '21-15', result: 'Won' },
        { id: 2, date: 'June 3, 2025', opponent: 'Mike', opponentAvatar: null, score: '18-21', result: 'Lost' },
        { id: 3, date: 'May 30, 2025', opponent: 'Sarah', opponentAvatar: null, score: '21-19', result: 'Won' },
        { id: 4, date: 'May 28, 2025', opponent: 'Tom', opponentAvatar: null, score: '15-21', result: 'Lost' },
        { id: 5, date: 'May 25, 2025', opponent: 'Alex', opponentAvatar: null, score: '21-12', result: 'Won' }
    ];

    const availablePlayers = [
        { id: 1, name: 'Sarah', avatar: null },
        { id: 2, name: 'Tom', avatar: null },
        { id: 3, name: 'Alex', avatar: null },
        { id: 4, name: 'Lisa', avatar: null },
        { id: 5, name: 'Mike', avatar: null }
    ];

    // Fetch upcoming matches when component mounts
    useEffect(() => {
        const fetchUpcomingMatches = async () => {
            if (!currentUser?.uid) return;
            
            try {
                setUpcomingMatchesLoading(true);
                setUpcomingMatchesError('');
                
                // Pass currentUser.uid to the service function
                const matches = await matchService.getUpcomingMatches(currentUser.uid);
                
                // Get unique opponent IDs
                const opponentIds = matches.map(match => 
                    match.player1Id === currentUser.uid ? match.player2Id : match.player1Id
                );
                
                // Fetch opponent information
                const usersMap = await userService.getUsersByIds(opponentIds);
                
                // Process matches with opponent information
                const processedMatches = matches.map(match => {
                    const opponentId = match.player1Id === currentUser.uid ? match.player2Id : match.player1Id;
                    const opponent = usersMap[opponentId] || { name: 'Unknown Player' };
                    
                    return {
                        id: match.id,
                        opponent: opponent.name || opponent.email || 'Unknown Player',
                        opponentAvatar: opponent.profileImageUrl || null,
                        time: formatScheduledDateTime(match.scheduledDate, match.time),
                        location: match.location || '',
                        rawMatch: match // Keep the raw match data for reference
                    };
                });
                
                setUpcomingMatches(processedMatches);
            } catch (error) {
                console.error('Error fetching upcoming matches:', error);
                setUpcomingMatchesError('Failed to load upcoming matches');
            } finally {
                setUpcomingMatchesLoading(false);
            }
        };
        
        fetchUpcomingMatches();
    }, [currentUser?.uid]);


    // Add useEffect hook for fetching pending invitations
    useEffect(() => {
        const fetchPendingInvitations = async () => {
            if (!currentUser?.uid) return;
            
            try {
                setPendingInvitationsLoading(true);
                setPendingInvitationsError('');
                
                // Fetch pending invitations
                const invitations = await invitationService.getPendingInvitations(currentUser.uid);
                
                // Get unique sender IDs
                const senderIds = invitations.map(invitation => invitation.senderId);
                
                // Fetch sender information
                const usersMap = await userService.getUsersByIds(senderIds);
                
                // Process invitations with sender information
                const processedInvitations = invitations.map(invitation => {
                    const sender = usersMap[invitation.senderId] || { name: 'Unknown Player' };
                    
                    return {
                        id: invitation.id,
                        from: sender.name || sender.email || 'Unknown Player',
                        fromAvatar: sender.profileImageUrl || null,
                        time: formatScheduledDateTime(invitation.scheduledDate, invitation.time),
                        location: invitation.location || '',
                        message: invitation.message || '',
                        rawInvitation: invitation // Keep the raw invitation data for reference
                    };
                });
                
                setPendingInvitations(processedInvitations);
            } catch (error) {
                console.error('Error fetching pending invitations:', error);
                setPendingInvitationsError('Failed to load pending invitations');
            } finally {
                setPendingInvitationsLoading(false);
            }
        };
        
        fetchPendingInvitations();
    }, [currentUser?.uid]);

    // Handler functions
    const handleCreateMatch = (e) => {
        e.preventDefault();
        if (!selectedPlayer || !selectedDateTime) {
            alert('Please select both a player and date/time');
            return;
        }
        // TODO: Implement match creation
        alert(`Match created with ${selectedPlayer} at ${selectedDateTime}`);
        setSelectedPlayer('');
        setSelectedDateTime('');
    };

    // Add handler functions for accepting and declining invitations
    const handleAcceptInvitation = async (invitationId) => {
        try {
            // Show loading state
            setPendingInvitationsLoading(true);
            
            // Accept the invitation
            const matchId = await invitationService.acceptInvitation(invitationId);
            
            // Show success message
            toast.success('Invitation accepted! Match has been scheduled.');
            
            // Refresh pending invitations
            const invitations = await invitationService.getPendingInvitations(currentUser.uid);
            const senderIds = invitations.map(invitation => invitation.senderId);
            const usersMap = await userService.getUsersByIds(senderIds);
            
            const processedInvitations = invitations.map(invitation => {
                const sender = usersMap[invitation.senderId] || { name: 'Unknown Player' };
                
                return {
                    id: invitation.id,
                    from: sender.name || sender.email || 'Unknown Player',
                    fromAvatar: sender.profileImageUrl || null,
                    time: formatScheduledDateTime(invitation.scheduledDate, invitation.time),
                    location: invitation.location || '',
                    message: invitation.message || '',
                    rawInvitation: invitation
                };
            });
            
            setPendingInvitations(processedInvitations);
            
            // Refresh upcoming matches (if implemented)
            // ...
        } catch (error) {
            console.error('Error accepting invitation:', error);
            toast.error('Failed to accept invitation. Please try again.');
        } finally {
            setPendingInvitationsLoading(false);
        }
    };

    const handleDeclineInvitation = async (invitationId) => {
        try {
            // Show loading state
            setPendingInvitationsLoading(true);
            
            // Decline the invitation
            await invitationService.declineInvitation(invitationId);
            
            // Show success message
            toast.success('Invitation declined.');
            
            // Refresh pending invitations
            const invitations = await invitationService.getPendingInvitations(currentUser.uid);
            const senderIds = invitations.map(invitation => invitation.senderId);
            const usersMap = await userService.getUsersByIds(senderIds);
            
            const processedInvitations = invitations.map(invitation => {
                const sender = usersMap[invitation.senderId] || { name: 'Unknown Player' };
                
                return {
                    id: invitation.id,
                    from: sender.name || sender.email || 'Unknown Player',
                    fromAvatar: sender.profileImageUrl || null,
                    time: formatScheduledDateTime(invitation.scheduledDate, invitation.time),
                    location: invitation.location || '',
                    message: invitation.message || '',
                    rawInvitation: invitation
                };
            });
            
            setPendingInvitations(processedInvitations);
        } catch (error) {
            console.error('Error declining invitation:', error);
            toast.error('Failed to decline invitation. Please try again.');
        } finally {
            setPendingInvitationsLoading(false);
        }
    };

     // Add handler for creating test invitation
    const handleCreateTestInvitation = async () => {
        try {
            if (!currentUser?.uid) return;
            
            setPendingInvitationsLoading(true);
            
            // Create a test invitation
            await createTestInvitation(currentUser.uid);
            
            // Show success message
            toast.success('Test invitation created successfully!');
            
            // Refresh pending invitations
            const invitations = await invitationService.getPendingInvitations(currentUser.uid);
            const senderIds = invitations.map(invitation => invitation.senderId);
            const usersMap = await userService.getUsersByIds(senderIds);
            
            const processedInvitations = invitations.map(invitation => {
                const sender = usersMap[invitation.senderId] || { name: 'Unknown Player' };
                
                return {
                    id: invitation.id,
                    from: sender.name || sender.email || 'Unknown Player',
                    fromAvatar: sender.profileImageUrl || null,
                    time: formatScheduledDateTime(invitation.scheduledDate, invitation.time),
                    location: invitation.location || '',
                    message: invitation.message || '',
                    rawInvitation: invitation
                };
            });
            
            setPendingInvitations(processedInvitations);
        } catch (error) {
            console.error('Error creating test invitation:', error);
            toast.error('Failed to create test invitation');
        } finally {
            setPendingInvitationsLoading(false);
        }
    };

    const handleSeeDetails = (matchId) => {
        // TODO: Navigate to match details
        alert(`View details for match ${matchId}`);
    };
    
    const handleViewMatchDetails = (matchId) => {
        // This will be implemented later to navigate to match details page
        alert(`View details for upcoming match ${matchId}`);
    };

    return (
        <div className="matches-page">
            {/* Standard Jumbotron */}
            <Jumbotron
                title="Matches"
                subtitle="Manage your ping-pong matches and invitations"
                backgroundImage="https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80"
                height="300px"
                overlay={true}
                textAlign="left"
                fullWidth={true}
            />

            {/* Matches Content with Overlap Effect */}
            <div className="jumbotron-overlap-container">
                <Container className="py-5">
                    {/* Create New Match Section */}
                    <Card className="mb-4 create-match-card">
                        <Card.Body className="p-4">
                            <Row className="align-items-end">
                                <Col md={3}>
                                    <h5 className="mb-3">Create New Match</h5>
                                </Col>
                                <Col md={3}>
                                    <Form.Group className="mb-3">
                                        <Form.Select
                                            value={selectedPlayer}
                                            onChange={(e ) => setSelectedPlayer(e.target.value)}
                                            className="form-select-custom"
                                        >
                                            <option value="">Select player</option>
                                            {availablePlayers.map(player => (
                                                <option key={player.id} value={player.name}>
                                                    {player.name}
                                                </option>
                                            ))}
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                                <Col md={3}>
                                    <Form.Group className="mb-3">
                                        <Form.Control
                                            type="datetime-local"
                                            value={selectedDateTime}
                                            onChange={(e) => setSelectedDateTime(e.target.value)}
                                            className="form-control-custom"
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={3}>
                                    <Button 
                                        variant="primary" 
                                        onClick={handleCreateMatch}
                                        className="w-100 mb-3"
                                    >
                                        Create Match
                                    </Button>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>

                    <Row>
                        {/* Upcoming Matches Card */}
                        <Col lg={6}>
                            <Card className="mb-4 h-100">
                                <Card.Header className="d-flex justify-content-between align-items-center">
                                    <h5 className="mb-0">Upcoming Matches</h5>
                                    {!upcomingMatchesLoading && (
                                        <Badge bg="primary">{upcomingMatches.length}</Badge>
                                    )}
                                </Card.Header>
                                <Card.Body className="p-0">
                                    {upcomingMatchesLoading ? (
                                        <div className="text-center py-5">
                                            <Spinner animation="border" role="status" variant="primary">
                                                <span className="visually-hidden">Loading...</span>
                                            </Spinner>
                                            <p className="mt-3 text-muted">Loading upcoming matches...</p>
                                        </div>
                                    ) : upcomingMatchesError ? (
                                        <div className="text-center py-5">
                                            <i className="bi bi-exclamation-circle fs-1 text-danger d-block mb-3"></i>
                                            <p className="text-muted">{upcomingMatchesError}</p>
                                            <Button 
                                                variant="outline-primary" 
                                                size="sm"
                                                onClick={() => window.location.reload()}
                                            >
                                                Retry
                                            </Button>
                                        </div>
                                    ) : upcomingMatches.length > 0 ? (
                                        <div className="list-group list-group-flush">
                                            {upcomingMatches.map(match => (
                                                <div key={match.id} className="list-group-item d-flex align-items-center">
                                                    <UserAvatar 
                                                        user={{ 
                                                            displayName: match.opponent,
                                                            photoURL: match.opponentAvatar 
                                                        }} 
                                                        size={40} 
                                                        className="me-3"
                                                    />
                                                    <div className="flex-grow-1">
                                                        <h6 className="mb-1">vs. {match.opponent}</h6>
                                                        <small className="text-muted">{match.time}</small>
                                                        {match.location && (
                                                            <small className="text-muted d-block">
                                                                <i className="bi bi-geo-alt me-1"></i>
                                                                {match.location}
                                                            </small>
                                                        )}
                                                    </div>
                                                    <Button 
                                                        variant="outline-primary" 
                                                        size="sm"
                                                        onClick={() => handleViewMatchDetails(match.id)}
                                                    >
                                                        <i className="bi bi-calendar-event"></i>
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-5">
                                            <i className="bi bi-calendar-x fs-1 text-muted d-block mb-3"></i>
                                            <p className="text-muted">No upcoming matches</p>
                                            <Button variant="primary" size="sm">
                                                Schedule a Match
                                            </Button>
                                        </div>
                                    )}
                                </Card.Body>
                                {upcomingMatches.length > 0 && (
                                    <Card.Footer className="text-center">
                                        <Link to="/matches/scheduled" className="text-decoration-none">
                                            View All Scheduled Matches <i className="bi bi-arrow-right"></i>
                                        </Link>
                                    </Card.Footer>
                                )}
                            </Card>
                        </Col>

                        {/* Pending Invitations Card */}
                        <Col lg={6}>
                            <Card className="mb-4 h-100">
            <Card.Header className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Pending Invitations</h5>
                <div>
                    {/* Test Invitation Button (Development Only) */}
                    {process.env.NODE_ENV === 'development' && (
                        <Button 
                            variant="outline-secondary" 
                            size="sm" 
                            onClick={handleCreateTestInvitation}
                            disabled={pendingInvitationsLoading}
                            className="me-2"
                        >
                            Create Test Invitation
                        </Button>
                    )}
                    {!pendingInvitationsLoading && (
                        <Badge bg="warning">{pendingInvitations.length}</Badge>
                    )}
                </div>
            </Card.Header>
            <Card.Body className="p-0">
                {pendingInvitationsLoading ? (
                    <div className="text-center py-5">
                        <Spinner animation="border" role="status" variant="warning">
                            <span className="visually-hidden">Loading...</span>
                        </Spinner>
                        <p className="mt-3 text-muted">Loading pending invitations...</p>
                    </div>
                ) : pendingInvitationsError ? (
                    <div className="text-center py-5">
                        <i className="bi bi-exclamation-circle fs-1 text-danger d-block mb-3"></i>
                        <p className="text-muted">{pendingInvitationsError}</p>
                        <Button 
                            variant="outline-primary" 
                            size="sm"
                            onClick={() => window.location.reload()}
                        >
                            Retry
                        </Button>
                    </div>
                ) : pendingInvitations.length > 0 ? (
                    <div className="list-group list-group-flush">
                        {pendingInvitations.map(invitation => (
                            <div key={invitation.id} className="list-group-item">
                                <div className="d-flex align-items-center mb-2">
                                    <UserAvatar 
                                        user={{ 
                                            displayName: invitation.from,
                                            photoURL: invitation.fromAvatar 
                                        }} 
                                        size={40} 
                                        className="me-3"
                                    />
                                    <div className="flex-grow-1">
                                        <h6 className="mb-1">From {invitation.from}</h6>
                                        <small className="text-muted">{invitation.time}</small>
                                        {invitation.location && (
                                            <small className="text-muted d-block">
                                                <i className="bi bi-geo-alt me-1"></i>
                                                {invitation.location}
                                            </small>
                                        )}
                                        {invitation.message && (
                                            <small className="text-muted d-block">
                                                <i className="bi bi-chat-quote me-1"></i>
                                                "{invitation.message}"
                                            </small>
                                        )}
                                    </div>
                                </div>
                                <div className="d-flex gap-2">
                                    <Button 
                                        variant="success" 
                                        size="sm"
                                        onClick={() => handleAcceptInvitation(invitation.id)}
                                        className="flex-grow-1"
                                        disabled={pendingInvitationsLoading}
                                    >
                                        <i className="bi bi-check-circle me-1"></i>
                                        Accept
                                    </Button>
                                    <Button 
                                        variant="outline-danger" 
                                        size="sm"
                                        onClick={() => handleDeclineInvitation(invitation.id)}
                                        className="flex-grow-1"
                                        disabled={pendingInvitationsLoading}
                                    >
                                        <i className="bi bi-x-circle me-1"></i>
                                        Decline
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-5">
                        <i className="bi bi-inbox fs-1 text-muted d-block mb-3"></i>
                        <p className="text-muted">No pending invitations</p>
                    </div>
                )}
            </Card.Body>
            {pendingInvitations.length > 0 && (
                <Card.Footer className="text-center">
                    <Link to="/matches/invitations" className="text-decoration-none">
                        View All Invitations <i className="bi bi-arrow-right"></i>
                    </Link>
                </Card.Footer>
            )}
        </Card>
                        </Col>
                    </Row>

                    {/* Rest of the component remains unchanged */}
                    {/* ... */}
                </Container>
            </div>
        </div>
    );
};

export default Matches;