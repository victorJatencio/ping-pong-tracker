import React, { useState } from 'react';
import { Container, Row, Col, Card, Button, Form, Table, Badge, Dropdown } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Jumbotron from '../../components/common/Jumbotron';
import UserAvatar from '../../components/common/UserAvatar';

const Matches = () => {
    const { currentUser } = useAuth();
    const [selectedPlayer, setSelectedPlayer] = useState('');
    const [selectedDateTime, setSelectedDateTime] = useState('');

    // Mock data - replace with actual data from your backend
    const upcomingMatches = [
        { id: 1, opponent: 'Sarah', opponentAvatar: null, time: 'Today, 5:00 PM' },
        { id: 2, opponent: 'Tom', opponentAvatar: null, time: 'Tomorrow, 3:30 PM' },
        { id: 3, opponent: 'Alex', opponentAvatar: null, time: 'Jun 10, 4:15 PM' }
    ];

    const pendingInvitations = [
        { id: 1, from: 'Alex', fromAvatar: null, time: 'Today, 7:00 PM' },
        { id: 2, from: 'Lisa', fromAvatar: null, time: 'Tomorrow, 1:00PM' },
        { id: 3, from: 'Mike', fromAvatar: null, time: 'Jun 12, 6:30 PM' }
    ];

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

    const handleAcceptInvitation = (invitationId) => {
        // TODO: Implement invitation acceptance
        alert(`Invitation ${invitationId} accepted`);
    };

    const handleDeclineInvitation = (invitationId) => {
        // TODO: Implement invitation decline
        alert(`Invitation ${invitationId} declined`);
    };

    const handleSeeDetails = (matchId) => {
        // TODO: Navigate to match details
        alert(`View details for match ${matchId}`);
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
                                    <Badge bg="primary">{upcomingMatches.length}</Badge>
                                </Card.Header>
                                <Card.Body className="p-0">
                                    {upcomingMatches.length > 0 ? (
                                        <div className="list-group list-group-flush">
                                            {upcomingMatches.map(match => (
                                                <div key={match.id} className="list-group-item d-flex align-items-center">
                                                    <UserAvatar 
                                                        user={{ displayName: match.opponent }} 
                                                        size={40} 
                                                        className="me-3"
                                                    />
                                                    <div className="flex-grow-1">
                                                        <h6 className="mb-1">vs. {match.opponent}</h6>
                                                        <small className="text-muted">{match.time}</small>
                                                    </div>
                                                    <Button variant="outline-primary" size="sm">
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
                                    <Badge bg="warning">{pendingInvitations.length}</Badge>
                                </Card.Header>
                                <Card.Body className="p-0">
                                    {pendingInvitations.length > 0 ? (
                                        <div className="list-group list-group-flush">
                                            {pendingInvitations.map(invitation => (
                                                <div key={invitation.id} className="list-group-item">
                                                    <div className="d-flex align-items-center mb-2">
                                                        <UserAvatar 
                                                            user={{ displayName: invitation.from }} 
                                                            size={40} 
                                                            className="me-3"
                                                        />
                                                        <div className="flex-grow-1">
                                                            <h6 className="mb-1">From {invitation.from}</h6>
                                                            <small className="text-muted">{invitation.time}</small>
                                                        </div>
                                                    </div>
                                                    <div className="d-flex gap-2">
                                                        <Button 
                                                            variant="success" 
                                                            size="sm"
                                                            onClick={() => handleAcceptInvitation(invitation.id)}
                                                            className="flex-grow-1"
                                                        >
                                                            <i className="bi bi-check-circle me-1"></i>
                                                            Accept
                                                        </Button>
                                                        <Button 
                                                            variant="outline-danger" 
                                                            size="sm"
                                                            onClick={() => handleDeclineInvitation(invitation.id)}
                                                            className="flex-grow-1"
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

                    {/* Recent Matches Table */}
                    <Card className="mb-4">
                        <Card.Header>
                            <h5 className="mb-0">Recent Matches</h5>
                        </Card.Header>
                        <Card.Body className="p-0">
                            <div className="table-responsive">
                                <Table className="mb-0">
                                    <thead className="table-light">
                                        <tr>
                                            <th>Date</th>
                                            <th>Opponent</th>
                                            <th>Score</th>
                                            <th>Result</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentMatches.map(match => (
                                            <tr key={match.id}>
                                                <td>{match.date}</td>
                                                <td>
                                                    <div className="d-flex align-items-center">
                                                        <UserAvatar 
                                                            user={{ displayName: match.opponent }} 
                                                            size={32} 
                                                            className="me-2"
                                                        />
                                                        {match.opponent}
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className="font-monospace">{match.score}</span>
                                                </td>
                                                <td>
                                                    <Badge 
                                                        bg={match.result === 'Won' ? 'success' : 'danger'}
                                                        className="result-badge"
                                                    >
                                                        {match.result}
                                                    </Badge>
                                                </td>
                                                <td>
                                                    <Button 
                                                        variant="outline-primary" 
                                                        size="sm"
                                                        onClick={() => handleSeeDetails(match.id)}
                                                    >
                                                        See Details
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </div>
                        </Card.Body>
                        <Card.Footer>
                            <nav aria-label="Recent matches pagination">
                                <ul className="pagination pagination-sm justify-content-center mb-0">
                                    <li className="page-item active">
                                        <span className="page-link">1</span>
                                    </li>
                                    <li className="page-item">
                                        <Link className="page-link" to="/matches?page=2">2</Link>
                                    </li>
                                    <li className="page-item">
                                        <Link className="page-link" to="/matches?page=3">3</Link>
                                    </li>
                                    <li className="page-item disabled">
                                        <span className="page-link">...</span>
                                    </li>
                                    <li className="page-item">
                                        <Link className="page-link" to="/matches?page=10">10</Link>
                                    </li>
                                </ul>
                            </nav>
                        </Card.Footer>
                    </Card>

                    {/* Additional Cards Row */}
                    <Row>
                        {/* Quick Stats Card */}
                        <Col lg={4}>
                            <Card className="mb-4">
                                <Card.Header>
                                    <h6 className="mb-0">This Month</h6>
                                </Card.Header>
                                <Card.Body className="text-center">
                                    <Row>
                                        <Col>
                                            <h4 className="text-success mb-1">3</h4>
                                            <small className="text-muted">Wins</small>
                                        </Col>
                                        <Col>
                                            <h4 className="text-danger mb-1">2</h4>
                                            <small className="text-muted">Losses</small>
                                        </Col>
                                        <Col>
                                            <h4 className="text-primary mb-1">60%</h4>
                                            <small className="text-muted">Win Rate</small>
                                        </Col>
                                    </Row>
                                </Card.Body>
                            </Card>
                        </Col>

                        {/* Win Streak Card */}
                        <Col lg={4}>
                            <Card className="mb-4">
                                <Card.Header>
                                    <h6 className="mb-0">Current Streak</h6>
                                </Card.Header>
                                <Card.Body className="text-center">
                                    <h2 className="text-success mb-2">
                                        <i className="bi bi-fire me-2"></i>3
                                    </h2>
                                    <p className="text-muted mb-0">Win Streak</p>
                                    <small className="text-muted">Best: 5 wins</small>
                                </Card.Body>
                            </Card>
                        </Col>

                        {/* Quick Actions Card */}
                        <Col lg={4}>
                            <Card className="mb-4">
                                <Card.Header>
                                    <h6 className="mb-0">Quick Actions</h6>
                                </Card.Header>
                                <Card.Body>
                                    <div className="d-grid gap-2">
                                        <Button variant="outline-primary" size="sm">
                                            <i className="bi bi-arrow-repeat me-2"></i>
                                            Rematch Sarah
                                        </Button>
                                        <Button variant="outline-secondary" size="sm">
                                            <i className="bi bi-trophy me-2"></i>
                                            Join Tournament
                                        </Button>
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>
                </Container>
            </div>
        </div>
    );
};

export default Matches;
