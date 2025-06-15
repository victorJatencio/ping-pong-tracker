import React, { useState, useMemo } from 'react';
import { Container, Row, Col, Card, Table, Badge, Form, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Jumbotron from '../../components/common/Jumbotron';
import UserAvatar from '../../components/common/UserAvatar';

const Leaderboard = () => {
    const { currentUser } = useAuth();
    const [timeFilter, setTimeFilter] = useState('all-time');
    const [currentPage, setCurrentPage] = useState(1);
    const playersPerPage = 10;

    // Mock leaderboard data - replace with actual data from your backend
    const allPlayers = [
        { id: 1, name: 'Mike', avatar: null, wins: 15, losses: 3, winRate: 83, streak: '3W', lastMatch: 'Today', isCurrentUser: false },
        { id: 2, name: 'Jane', avatar: null, wins: 12, losses: 4, winRate: 75, streak: '2W', lastMatch: 'Yesterday', isCurrentUser: false },
        { id: 3, name: currentUser?.displayName || 'You', avatar: currentUser?.photoURL, wins: 10, losses: 5, winRate: 67, streak: '1L', lastMatch: 'Today', isCurrentUser: true },
        { id: 4, name: 'Sarah', avatar: null, wins: 8, losses: 4, winRate: 67, streak: '2L', lastMatch: '2 days ago', isCurrentUser: false },
        { id: 5, name: 'Tom', avatar: null, wins: 7, losses: 6, winRate: 54, streak: '1W', lastMatch: 'Yesterday', isCurrentUser: false },
        { id: 6, name: 'Alex', avatar: null, wins: 6, losses: 7, winRate: 46, streak: '2L', lastMatch: '3 days ago', isCurrentUser: false },
        { id: 7, name: 'Lisa', avatar: null, wins: 5, losses: 8, winRate: 38, streak: '1L', lastMatch: 'Yesterday', isCurrentUser: false },
        { id: 8, name: 'David', avatar: null, wins: 4, losses: 9, winRate: 31, streak: '3L', lastMatch: '4 days ago', isCurrentUser: false },
        { id: 9, name: 'Emma', avatar: null, wins: 3, losses: 10, winRate: 23, streak: '1W', lastMatch: '5 days ago', isCurrentUser: false },
        { id: 10, name: 'Chris', avatar: null, wins: 2, losses: 11, winRate: 15, streak: '4L', lastMatch: '6 days ago', isCurrentUser: false },
        // Add more players for pagination demo
        { id: 11, name: 'Player 11', avatar: null, wins: 1, losses: 12, winRate: 8, streak: '5L', lastMatch: '1 week ago', isCurrentUser: false },
        { id: 12, name: 'Player 12', avatar: null, wins: 0, losses: 13, winRate: 0, streak: '6L', lastMatch: '1 week ago', isCurrentUser: false },
    ];

    // Calculate stats
    const totalPlayers = allPlayers.length;
    const currentUserRank = allPlayers.findIndex(player => player.isCurrentUser) + 1;
    const topPlayer = allPlayers[0];

    // Pagination logic
    const totalPages = Math.ceil(allPlayers.length / playersPerPage);
    const startIndex = (currentPage - 1) * playersPerPage;
    const endIndex = startIndex + playersPerPage;
    const currentPlayers = allPlayers.slice(startIndex, endIndex);

    // Recent rank changes (mock data)
    const recentChanges = [
        { name: 'Jane', change: '+2', direction: 'up' },
        { name: 'Sarah', change: '-1', direction: 'down' },
        { name: 'Tom', change: '+1', direction: 'up' }
    ];

    // Rising stars (mock data)
    const risingStars = [
        { name: 'Alex', improvement: '+15%', period: 'this week' },
        { name: 'Lisa', improvement: '+12%', period: 'this week' },
        { name: 'Emma', improvement: '+8%', period: 'this week' }
    ];

    const handleTimeFilterChange = (e) => {
        setTimeFilter(e.target.value);
        setCurrentPage(1); // Reset to first page when filter changes
        // TODO: Implement actual filtering logic
    };

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    const getStreakColor = (streak) => {
        if (streak.includes('W')) return 'success';
        if (streak.includes('L')) return 'danger';
        return 'secondary';
    };

    const renderPagination = () => {
        const pages = [];
        const maxVisiblePages = 5;
        
        // Always show first page
        if (currentPage > 3) {
            pages.push(
                <li key={1} className="page-item">
                    <button className="page-link" onClick={() => handlePageChange(1)}>1</button>
                </li>
            );
            if (currentPage > 4) {
                pages.push(
                    <li key="ellipsis1" className="page-item disabled">
                        <span className="page-link">...</span>
                    </li>
                );
            }
        }

        // Show pages around current page
        const start = Math.max(1, currentPage - 2);
        const end = Math.min(totalPages, currentPage + 2);
        
        for (let i = start; i <= end; i++) {
            pages.push(
                <li key={i} className={`page-item ${i === currentPage ? 'active' : ''}`}>
                    <button className="page-link" onClick={() => handlePageChange(i)}>
                        {i}
                    </button>
                </li>
            );
        }

        // Always show last page
        if (currentPage < totalPages - 2) {
            if (currentPage < totalPages - 3) {
                pages.push(
                    <li key="ellipsis2" className="page-item disabled">
                        <span className="page-link">...</span>
                    </li>
                );
            }
            pages.push(
                <li key={totalPages} className="page-item">
                    <button className="page-link" onClick={() => handlePageChange(totalPages)}>
                        {totalPages}
                    </button>
                </li>
            );
        }

        return pages;
    };

    return (
        <div className="leaderboard-page">
            {/* Standard Jumbotron */}
            <Jumbotron
                title="Leaderboard"
                subtitle="See how you rank against other players"
                backgroundImage="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80"
                height="300px"
                overlay={true}
                textAlign="left"
                fullWidth={true}
                className="jumbotron-success"
            />

            {/* Leaderboard Content with Overlap Effect */}
            <div className="jumbotron-overlap-container">
                <Container className="py-5">
                    {/* Stat Cards Row */}
                    <Row className="mb-4">
                        <Col lg={4}>
                            <Card className="text-center stat-card">
                                <Card.Body>
                                    <h6 className="text-muted mb-2">Top Players</h6>
                                    <h2 className="display-4 text-primary mb-0">{totalPlayers}</h2>
                                    <small className="text-muted">Active players</small>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col lg={4}>
                            <Card className="text-center stat-card">
                                <Card.Body>
                                    <h6 className="text-muted mb-2">Your Rank</h6>
                                    <h2 className="display-4 text-warning mb-0">#{currentUserRank}</h2>
                                    <small className="text-muted">Current position</small>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col lg={4}>
                            <Card className="text-center stat-card">
                                <Card.Body>
                                    <h6 className="text-muted mb-2">Top Player</h6>
                                    <h4 className="text-success mb-1">{topPlayer.name}</h4>
                                    <p className="mb-0">({topPlayer.wins} wins )</p>
                                    <small className="text-muted">{topPlayer.winRate}% win rate</small>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>

                    {/* Filter Section */}
                    <Row className="mb-4">
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label className="fw-bold">Time Period:</Form.Label>
                                <Form.Select 
                                    value={timeFilter} 
                                    onChange={handleTimeFilterChange}
                                    className="filter-select"
                                >
                                    <option value="all-time">All Time</option>
                                    <option value="this-month">This Month</option>
                                    <option value="this-week">This Week</option>
                                    <option value="last-30-days">Last 30 Days</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                    </Row>

                    {/* Main Leaderboard Table */}
                    <Card className="mb-4">
                        <Card.Header>
                            <h5 className="mb-0">Rankings</h5>
                        </Card.Header>
                        <Card.Body className="p-0">
                            <div className="table-responsive">
                                <Table className="mb-0 leaderboard-table">
                                    <thead className="table-light">
                                        <tr>
                                            <th>Rank</th>
                                            <th>Player</th>
                                            <th>Wins</th>
                                            <th>Losses</th>
                                            <th>Win Rate</th>
                                            <th>Streak</th>
                                            <th>Last Match</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {currentPlayers.map((player, index) => (
                                            <tr 
                                                key={player.id} 
                                                className={player.isCurrentUser ? 'current-user-row' : ''}
                                            >
                                                <td>
                                                    <span className="rank-number">
                                                        {startIndex + index + 1}
                                                    </span>
                                                    {startIndex + index + 1 <= 3 && (
                                                        <i className={`bi bi-trophy-fill ms-2 ${
                                                            startIndex + index + 1 === 1 ? 'text-warning' :
                                                            startIndex + index + 1 === 2 ? 'text-secondary' :
                                                            'text-warning'
                                                        }`}></i>
                                                    )}
                                                </td>
                                                <td>
                                                    <div className="d-flex align-items-center">
                                                        <UserAvatar 
                                                            user={{ 
                                                                displayName: player.name,
                                                                photoURL: player.avatar 
                                                            }} 
                                                            size={32} 
                                                            className="me-2"
                                                        />
                                                        <span className={player.isCurrentUser ? 'fw-bold' : ''}>
                                                            {player.name}
                                                        </span>
                                                        {player.isCurrentUser && (
                                                            <Badge bg="primary" className="ms-2">You</Badge>
                                                        )}
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className="fw-bold text-success">{player.wins}</span>
                                                </td>
                                                <td>
                                                    <span className="fw-bold text-danger">{player.losses}</span>
                                                </td>
                                                <td>
                                                    <span className="fw-bold">{player.winRate}%</span>
                                                </td>
                                                <td>
                                                    <Badge bg={getStreakColor(player.streak)} className="streak-badge">
                                                        {player.streak}
                                                    </Badge>
                                                </td>
                                                <td>
                                                    <small className="text-muted">{player.lastMatch}</small>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </div>
                        </Card.Body>
                        <Card.Footer>
                            <nav aria-label="Leaderboard pagination">
                                <ul className="pagination pagination-sm justify-content-center mb-0">
                                    {renderPagination()}
                                </ul>
                            </nav>
                        </Card.Footer>
                    </Card>

                    {/* Additional Cards Row */}
                    <Row>
                        {/* Recent Rank Changes */}
                        <Col lg={4}>
                            <Card className="mb-4">
                                <Card.Header>
                                    <h6 className="mb-0">
                                        <i className="bi bi-arrow-up-down me-2"></i>
                                        Recent Changes
                                    </h6>
                                </Card.Header>
                                <Card.Body>
                                    {recentChanges.map((change, index) => (
                                        <div key={index} className="d-flex justify-content-between align-items-center mb-2">
                                            <span>{change.name}</span>
                                            <Badge bg={change.direction === 'up' ? 'success' : 'danger'}>
                                                <i className={`bi bi-arrow-${change.direction} me-1`}></i>
                                                {change.change}
                                            </Badge>
                                        </div>
                                    ))}
                                </Card.Body>
                            </Card>
                        </Col>

                        {/* Rising Stars */}
                        <Col lg={4}>
                            <Card className="mb-4">
                                <Card.Header>
                                    <h6 className="mb-0">
                                        <i className="bi bi-star-fill me-2"></i>
                                        Rising Stars
                                    </h6>
                                </Card.Header>
                                <Card.Body>
                                    {risingStars.map((star, index) => (
                                        <div key={index} className="d-flex justify-content-between align-items-center mb-2">
                                            <span>{star.name}</span>
                                            <div className="text-end">
                                                <Badge bg="info">{star.improvement}</Badge>
                                                <br />
                                                <small className="text-muted">{star.period}</small>
                                            </div>
                                        </div>
                                    ))}
                                </Card.Body>
                            </Card>
                        </Col>

                        {/* Hall of Fame */}
                        <Col lg={4}>
                            <Card className="mb-4">
                                <Card.Header>
                                    <h6 className="mb-0">
                                        <i className="bi bi-trophy me-2"></i>
                                        Hall of Fame
                                    </h6>
                                </Card.Header>
                                <Card.Body>
                                    <div className="text-center">
                                        <div className="mb-3">
                                            <h4 className="text-warning mb-1">Mike</h4>
                                            <small className="text-muted">Longest Win Streak</small>
                                            <p className="mb-0 fw-bold">8 wins</p>
                                        </div>
                                        <div className="mb-3">
                                            <h5 className="text-info mb-1">Jane</h5>
                                            <small className="text-muted">Highest Win Rate</small>
                                            <p className="mb-0 fw-bold">85%</p>
                                        </div>
                                        <Button variant="outline-primary" size="sm" className="w-100">
                                            View All Records
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

export default Leaderboard;
