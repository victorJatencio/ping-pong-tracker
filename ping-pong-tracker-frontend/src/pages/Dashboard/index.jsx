import React from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Jumbotron from '../../components/common/Jumbotron';

const Dashboard = () => {
    const { currentUser } = useAuth();
    
    // Get user's first name for personalized greeting
    const getFirstName = (user) => {
        if (user?.displayName) {
            return user.displayName.split(' ')[0];
        }
        if (user?.email) {
            return user.email.split('@')[0];
        }
        return 'Player';
    };

    const firstName = getFirstName(currentUser);

    return (
        <div className="dashboard-page">
            {/* Hero Jumbotron - Full Width */}
            <Jumbotron
                title={`Welcome back, ${firstName}!`}
                subtitle="Ready to dominate the ping-pong table? Check your stats, challenge opponents, and climb the leaderboard."
                backgroundImage="https://images.unsplash.com/photo-1551698618-1dfe5d97d256?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80"
                height="450px"
                overlay={true}
                textAlign="left"
                fullWidth={true}
            >
                <div className="d-flex gap-3 flex-wrap">
                    <Button 
                        variant="success" 
                        size="lg" 
                        as={Link} 
                        to="/matches/create"
                        className="px-4"
                    >
                        <i className="bi bi-plus-circle me-2"></i>
                        Create Match
                    </Button>
                    <Button 
                        variant="outline-light" 
                        size="lg" 
                        as={Link} 
                        to="/leaderboard"
                        className="px-4"
                    >
                        <i className="bi bi-trophy me-2"></i>
                        View Leaderboard
                    </Button>
                </div>
            </Jumbotron>

            {/* Dashboard Content with Overlap Effect */}
            <div className="jumbotron-overlap-container">
                <Container className="py-5">
                    <Row>
                        <Col lg={8}>
                            <Card className="mb-4">
                                <Card.Header>
                                    <h5 className="mb-0">Recent Matches</h5>
                                </Card.Header>
                                <Card.Body>
                                    <p className="text-muted">No recent matches found.</p>
                                    <Button variant="primary" as={Link} to="/matches">
                                        View All Matches
                                    </Button>
                                </Card.Body>
                            </Card>
                            
                            <Card>
                                <Card.Header>
                                    <h5 className="mb-0">Upcoming Matches</h5>
                                </Card.Header>
                                <Card.Body>
                                    <p className="text-muted">No upcoming matches scheduled.</p>
                                    <Button variant="success" as={Link} to="/matches/create">
                                        Schedule a Match
                                    </Button>
                                </Card.Body>
                            </Card>
                        </Col>
                        
                        <Col lg={4}>
                            <Card className="mb-4">
                                <Card.Header>
                                    <h5 className="mb-0">Your Stats</h5>
                                </Card.Header>
                                <Card.Body>
                                    <div className="d-flex justify-content-between mb-2">
                                        <span>Matches Played:</span>
                                        <strong>0</strong>
                                    </div>
                                    <div className="d-flex justify-content-between mb-2">
                                        <span>Wins:</span>
                                        <strong className="text-success">0</strong>
                                    </div>
                                    <div className="d-flex justify-content-between mb-2">
                                        <span>Losses:</span>
                                        <strong className="text-danger">0</strong>
                                    </div>
                                    <div className="d-flex justify-content-between">
                                        <span>Win Rate:</span>
                                        <strong>0%</strong>
                                    </div>
                                </Card.Body>
                            </Card>
                            
                            <Card>
                                <Card.Header>
                                    <h5 className="mb-0">Leaderboard Position</h5>
                                </Card.Header>
                                <Card.Body className="text-center">
                                    <h2 className="display-4 text-primary mb-2">-</h2>
                                    <p className="text-muted">Play matches to get ranked!</p>
                                    <Button variant="outline-primary" as={Link} to="/leaderboard">
                                        View Full Leaderboard
                                    </Button>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>
                </Container>
            </div>
        </div>
     );
};

export default Dashboard;
