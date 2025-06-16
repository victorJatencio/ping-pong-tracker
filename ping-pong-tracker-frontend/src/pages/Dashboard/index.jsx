import React, { useState, useMemo } from 'react';
import { Container, Row, Col, Card, Button, Badge, Table, ProgressBar } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Jumbotron from '../../components/common/Jumbotron';
import UserAvatar from '../../components/common/UserAvatar';
import { Doughnut } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

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

    // Mock data - replace with actual data from your backend
    const userStats = {
        totalMatches: 15,
        wins: 10,
        losses: 5,
        winRate: 67,
        currentStreak: 3,
        streakType: 'wins',
        rank: 3,
        totalPlayers: 24
    };

    const recentMatches = [
        { id: 1, opponent: 'Jane', result: 'Won', score: '21-15', date: 'Today' },
        { id: 2, opponent: 'Mike', result: 'Lost', score: '18-21', date: 'Yesterday' },
        { id: 3, opponent: 'Sarah', result: 'Won', score: '21-19', date: '2 days ago' }
    ];

    const upcomingMatches = [
        { id: 1, opponent: 'Sarah', time: 'Today, 5:00 PM' },
        { id: 2, opponent: 'Tom', time: 'Tomorrow, 3:30 PM' }
    ];

    const pendingInvitations = [
        { id: 1, from: 'Alex', time: 'Today, 7:00 PM' },
        { id: 2, from: 'Lisa', time: 'Tomorrow, 1:00 PM' }
    ];

    const achievements = [
        { id: 1, title: '5 wins', icon: 'bi-trophy', unlocked: true },
        { id: 2, title: '3 streaks', icon: 'bi-fire', unlocked: true },
        { id: 3, title: '10 games', icon: 'bi-controller', unlocked: true },
        { id: 4, title: 'First Win', icon: 'bi-star', unlocked: true },
        { id: 5, title: '20 games', icon: 'bi-gem', unlocked: false }
    ];

    const leaderboardPreview = [
        { rank: 1, name: 'Mike', wins: 15, isCurrentUser: false },
        { rank: 2, name: 'Jane', wins: 12, isCurrentUser: false },
        { rank: 3, name: 'You', wins: 10, isCurrentUser: true }
    ];

    const recentActivity = [
        { id: 1, type: 'match_won', description: 'You won a match against Jane', time: '10 minutes ago', icon: 'bi-trophy-fill', color: 'success' },
        { id: 2, type: 'leaderboard', description: 'Mike is now #1 on the leaderboard', time: '2 hours ago', icon: 'bi-bar-chart-fill', color: 'info' },
        { id: 3, type: 'achievement', description: 'You received a new achievement: \'3 Win Streak\'', time: 'Yesterday', icon: 'bi-star-fill', color: 'warning' },
        { id: 4, type: 'invitation', description: 'Sarah accepted your match invitation', time: 'Yesterday', icon: 'bi-check-circle-fill', color: 'primary' }
    ];

    // Win/Loss ratio chart data
    const chartData = {
        labels: ['Wins', 'Losses'],
        datasets: [
            {
                data: [userStats.wins, userStats.losses],
                backgroundColor: ['#28a745', '#dc3545'],
                borderColor: ['#ffffff', '#ffffff'],
                borderWidth: 3,
                hoverBackgroundColor: ['#34ce57', '#e55353'],
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        const label = context.label || '';
                        const value = context.parsed;
                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                        const percentage = Math.round((value / total) * 100);
                        return `${label}: ${value} (${percentage}%)`;
                    }
                }
            }
        },
        cutout: '60%',
    };

    const handleAcceptInvitation = (invitationId) => {
        // TODO: Implement accept invitation functionality
        console.log('Accept invitation:', invitationId);
    };

    const handleDeclineInvitation = (invitationId) => {
        // TODO: Implement decline invitation functionality
        console.log('Decline invitation:', invitationId);
    };

    return (
        <div className="dashboard-page">
            {/* Hero Jumbotron */}
            <Jumbotron
                title={`Welcome back, ${firstName}!`}
                subtitle={`You have ${pendingInvitations.length} pending match invitations and ${upcomingMatches.length} upcoming matches`}
                backgroundImage="https://images.unsplash.com/photo-1551698618-1dfe5d97d256?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80"
                height="300px"
                overlay={true}
                textAlign="left"
                fullWidth={true}
            />

            {/* Dashboard Content with Overlap Effect */}
            <div className="jumbotron-overlap-container">
                <Container className="py-5">
                    {/* First Row - Main Stats Cards */}
                    <Row className="mb-4">
                        {/* Win/Loss Ratio Card */}
                        <Col lg={4}>
                            <Card className="text-center stat-card h-100">
                                <Card.Header>
                                    <h5 className="mb-0">Win/Loss Ratio</h5>
                                </Card.Header>
                                <Card.Body>
                                    <div style={{ height: '200px', position: 'relative' }}>
                                        <Doughnut data={chartData} options={chartOptions} />
                                        <div className="chart-center-text">
                                            <h3 className="text-success mb-0">{userStats.winRate}%</h3>
                                            <small className="text-muted">Win Rate</small>
                                        </div>
                                    </div>
                                    <div className="mt-3">
                                        <div className="d-flex justify-content-between">
                                            <span className="text-success">
                                                <i className="bi bi-circle-fill me-1"></i>
                                                Wins: {userStats.wins}
                                            </span>
                                            <span className="text-danger">
                                                <i className="bi bi-circle-fill me-1"></i>
                                                Losses: {userStats.losses}
                                            </span>
                                        </div>
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>

                        {/* Recent Matches Card */}
                        <Col lg={4}>
                            <Card className="h-100">
                                <Card.Header>
                                    <h5 className="mb-0">Recent Matches</h5>
                                </Card.Header>
                                <Card.Body>
                                    {recentMatches.length > 0 ? (
                                        <div className="list-group list-group-flush">
                                            {recentMatches.map((match ) => (
                                                <div key={match.id} className="list-group-item border-0 px-0 py-2">
                                                    <div className="d-flex justify-content-between align-items-center">
                                                        <div className="d-flex align-items-center">
                                                            <UserAvatar 
                                                                user={{ displayName: match.opponent }} 
                                                                size={32} 
                                                                className="me-2"
                                                            />
                                                            <div>
                                                                <h6 className="mb-0">vs. {match.opponent}</h6>
                                                                <small className="text-muted">{match.date}</small>
                                                            </div>
                                                        </div>
                                                        <div className="text-end">
                                                            <Badge 
                                                                bg={match.result === 'Won' ? 'success' : 'danger'}
                                                                className="mb-1"
                                                            >
                                                                {match.result}
                                                            </Badge>
                                                            <div>
                                                                <small className="fw-bold">{match.score}</small>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-4">
                                            <i className="bi bi-controller fs-1 text-muted d-block mb-2"></i>
                                            <p className="text-muted mb-0">No recent matches</p>
                                        </div>
                                    )}
                                </Card.Body>
                                <Card.Footer>
                                    <Link to="/matches" className="text-decoration-none">
                                        View All Matches <i className="bi bi-arrow-right"></i>
                                    </Link>
                                </Card.Footer>
                            </Card>
                        </Col>

                        {/* Achievements Card */}
                        <Col lg={4}>
                            <Card className="text-center h-100">
                                <Card.Header>
                                    <h5 className="mb-0">Achievements</h5>
                                </Card.Header>
                                <Card.Body>
                                    <Row className="g-3">
                                        {achievements.slice(0, 3).map((achievement) => (
                                            <Col key={achievement.id} xs={4}>
                                                <div className="achievement-item">
                                                    <div className={`achievement-icon ${achievement.unlocked ? 'unlocked' : 'locked'}`}>
                                                        <i className={`${achievement.icon} fs-2`}></i>
                                                    </div>
                                                    <small className="d-block mt-2 fw-bold">
                                                        {achievement.title}
                                                    </small>
                                                </div>
                                            </Col>
                                        ))}
                                    </Row>
                                    <div className="mt-3">
                                        <ProgressBar 
                                            now={75} 
                                            label="75% to next achievement"
                                            className="achievement-progress"
                                        />
                                    </div>
                                </Card.Body>
                                <Card.Footer>
                                    <Link to="/profile" className="text-decoration-none">
                                        View All Achievements <i className="bi bi-arrow-right"></i>
                                    </Link>
                                </Card.Footer>
                            </Card>
                        </Col>
                    </Row>

                    {/* Second Row - Activity Cards */}
                    <Row className="mb-4">
                        {/* Upcoming Matches Card */}
                        <Col lg={4}>
                            <Card className="h-100">
                                <Card.Header>
                                    <h5 className="mb-0">Upcoming Matches</h5>
                                </Card.Header>
                                <Card.Body>
                                    {upcomingMatches.length > 0 ? (
                                        <div className="list-group list-group-flush">
                                            {upcomingMatches.map((match) => (
                                                <div key={match.id} className="list-group-item border-0 px-0 py-2">
                                                    <div className="d-flex justify-content-between align-items-center">
                                                        <div className="d-flex align-items-center">
                                                            <UserAvatar 
                                                                user={{ displayName: match.opponent }} 
                                                                size={32} 
                                                                className="me-2"
                                                            />
                                                            <div>
                                                                <h6 className="mb-0">vs. {match.opponent}</h6>
                                                                <small className="text-muted">{match.time}</small>
                                                            </div>
                                                        </div>
                                                        <Button variant="outline-primary" size="sm">
                                                            <i className="bi bi-calendar-event"></i>
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-4">
                                            <i className="bi bi-calendar-x fs-1 text-muted d-block mb-2"></i>
                                            <p className="text-muted mb-0">No upcoming matches</p>
                                        </div>
                                    )}
                                </Card.Body>
                                <Card.Footer>
                                    <Link to="/matches" className="text-decoration-none">
                                        View All Scheduled Matches <i className="bi bi-arrow-right"></i>
                                    </Link>
                                </Card.Footer>
                            </Card>
                        </Col>

                        {/* Pending Invitations Card */}
                        <Col lg={4}>
                            <Card className="h-100">
                                <Card.Header className="d-flex justify-content-between align-items-center">
                                    <h5 className="mb-0">Pending Invitations</h5>
                                    {pendingInvitations.length > 0 && (
                                        <Badge bg="primary">{pendingInvitations.length}</Badge>
                                    )}
                                </Card.Header>
                                <Card.Body>
                                    {pendingInvitations.length > 0 ? (
                                        <div className="list-group list-group-flush">
                                            {pendingInvitations.map((invitation) => (
                                                <div key={invitation.id} className="list-group-item border-0 px-0 py-2">
                                                    <div className="d-flex justify-content-between align-items-center">
                                                        <div className="d-flex align-items-center">
                                                            <UserAvatar 
                                                                user={{ displayName: invitation.from }} 
                                                                size={32} 
                                                                className="me-2"
                                                            />
                                                            <div>
                                                                <h6 className="mb-0">From {invitation.from}</h6>
                                                                <small className="text-muted">{invitation.time}</small>
                                                            </div>
                                                        </div>
                                                        <div className="d-flex gap-1">
                                                            <Button 
                                                                variant="success" 
                                                                size="sm"
                                                                onClick={() => handleAcceptInvitation(invitation.id)}
                                                            >
                                                                <i className="bi bi-check"></i>
                                                            </Button>
                                                            <Button 
                                                                variant="danger" 
                                                                size="sm"
                                                                onClick={() => handleDeclineInvitation(invitation.id)}
                                                            >
                                                                <i className="bi bi-x"></i>
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-4">
                                            <i className="bi bi-envelope fs-1 text-muted d-block mb-2"></i>
                                            <p className="text-muted mb-0">No pending invitations</p>
                                        </div>
                                    )}
                                </Card.Body>
                                <Card.Footer>
                                    <Link to="/matches" className="text-decoration-none">
                                        View All Invitations <i className="bi bi-arrow-right"></i>
                                    </Link>
                                </Card.Footer>
                            </Card>
                        </Col>

                        {/* Leaderboard Preview Card */}
                        <Col lg={4}>
                            <Card className="h-100">
                                <Card.Header>
                                    <h5 className="mb-0">Leaderboard Preview</h5>
                                </Card.Header>
                                <Card.Body>
                                    <div className="list-group list-group-flush">
                                        {leaderboardPreview.map((player) => (
                                            <div 
                                                key={player.rank} 
                                                className={`list-group-item border-0 px-0 py-2 ${player.isCurrentUser ? 'current-user-highlight' : ''}`}
                                            >
                                                <div className="d-flex justify-content-between align-items-center">
                                                    <div className="d-flex align-items-center">
                                                        <span className={`rank-number me-2 ${player.rank <= 3 ? 'top-rank' : ''}`}>
                                                            {player.rank <= 3 && <i className="bi bi-trophy-fill me-1"></i>}
                                                            {player.rank}.
                                                        </span>
                                                        <UserAvatar 
                                                            user={{ 
                                                                displayName: player.name,
                                                                photoURL: player.isCurrentUser ? currentUser?.photoURL : null
                                                            }} 
                                                            size={32} 
                                                            className="me-2"
                                                        />
                                                        <div>
                                                            <h6 className="mb-0">
                                                                {player.name}
                                                                {player.isCurrentUser && (
                                                                    <Badge bg="primary" className="ms-2">You</Badge>
                                                                )}
                                                            </h6>
                                                        </div>
                                                    </div>
                                                    <div className="text-end">
                                                        <span className="fw-bold text-success">{player.wins} wins</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </Card.Body>
                                <Card.Footer>
                                    <Link to="/leaderboard" className="text-decoration-none">
                                        View Full Leaderboard <i className="bi bi-arrow-right"></i>
                                    </Link>
                                </Card.Footer>
                            </Card>
                        </Col>
                    </Row>

                    {/* Third Row - Recent Activity Table */}
                    <Row className="mb-4">
                        <Col lg={12}>
                            <Card>
                                <Card.Header>
                                    <h5 className="mb-0">Recent Activity</h5>
                                </Card.Header>
                                <Card.Body className="p-0">
                                    <div className="table-responsive">
                                        <Table className="mb-0 activity-table">
                                            <tbody>
                                                {recentActivity.map((activity) => (
                                                    <tr key={activity.id}>
                                                        <td className="activity-icon">
                                                            <div className={`activity-icon-circle bg-${activity.color}`}>
                                                                <i className={`${activity.icon} text-white`}></i>
                                                            </div>
                                                        </td>
                                                        <td className="activity-description">
                                                            <span 
                                                                className={activity.type === 'achievement' ? 'text-success fw-bold' : ''}
                                                            >
                                                                {activity.description}
                                                            </span>
                                                        </td>
                                                        <td className="activity-time text-end">
                                                            <small className="text-muted">{activity.time}</small>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </Table>
                                    </div>
                                </Card.Body>
                                <Card.Footer>
                                    <Link to="/history" className="text-decoration-none">
                                        View Full Activity History <i className="bi bi-arrow-right"></i>
                                    </Link>
                                </Card.Footer>
                            </Card>
                        </Col>
                    </Row>

                    {/* Fourth Row - Additional Quick Cards */}
                    <Row>
                        {/* Quick Actions Card */}
                        <Col lg={4}>
                            <Card className="text-center">
                                <Card.Header>
                                    <h6 className="mb-0">
                                        <i className="bi bi-lightning-fill me-2"></i>
                                        Quick Actions
                                    </h6>
                                </Card.Header>
                                <Card.Body>
                                    <div className="d-grid gap-2">
                                        <Button variant="success" as={Link} to="/matches/create">
                                            <i className="bi bi-plus-circle me-2"></i>
                                            Create Match
                                        </Button>
                                        <Button variant="outline-primary" as={Link} to="/matches">
                                            <i className="bi bi-search me-2"></i>
                                            Find Opponent
                                        </Button>
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>

                        {/* Performance Trends Card */}
                        <Col lg={4}>
                            <Card className="text-center">
                                <Card.Header>
                                    <h6 className="mb-0">
                                        <i className="bi bi-graph-up me-2"></i>
                                        Performance Trends
                                    </h6>
                                </Card.Header>
                                <Card.Body>
                                    <div className="mb-3">
                                        <h4 className="text-success mb-1">↗ +12%</h4>
                                        <small className="text-muted">Win rate this month</small>
                                    </div>
                                    <div className="d-flex justify-content-between">
                                        <div className="text-center">
                                            <h6 className="text-primary mb-0">8</h6>
                                            <small className="text-muted">This Week</small>
                                        </div>
                                        <div className="text-center">
                                            <h6 className="text-warning mb-0">3</h6>
                                            <small className="text-muted">Current Streak</small>
                                        </div>
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>

                        {/* Today's Schedule Card */}
                        <Col lg={4}>
                            <Card className="text-center">
                                <Card.Header>
                                    <h6 className="mb-0">
                                        <i className="bi bi-calendar-day me-2"></i>
                                        Today's Schedule
                                    </h6>
                                </Card.Header>
                                <Card.Body>
                                    {upcomingMatches.filter(match => match.time.includes('Today')).length > 0 ? (
                                        <div>
                                            <h4 className="text-primary mb-1">
                                                {upcomingMatches.filter(match => match.time.includes('Today')).length}
                                            </h4>
                                            <small className="text-muted">Matches today</small>
                                            <div className="mt-2">
                                                <small className="fw-bold">
                                                    Next: vs. {upcomingMatches.find(match => match.time.includes('Today'))?.opponent} at 5:00 PM
                                                </small>
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            <i className="bi bi-calendar-x fs-1 text-muted d-block mb-2"></i>
                                            <small className="text-muted">No matches today</small>
                                        </div>
                                    )}
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
