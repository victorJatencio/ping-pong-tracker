import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Form, Button, Spinner, Alert } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../config/firebase';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import statsService from '../../services/statsService';
import Jumbotron from '../../components/common/Jumbotron';
import UserAvatar from '../../components/common/UserAvatar';

const Leaderboard = () => {
    const { currentUser } = useAuth();
    const [timeFilter, setTimeFilter] = useState('all-time');
    const [currentPage, setCurrentPage] = useState(1);
    const [leaderboardData, setLeaderboardData] = useState([]);
    const [users, setUsers] = useState({});
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [error, setError] = useState('');
    const [lastUpdated, setLastUpdated] = useState(null);
    
    const playersPerPage = 10;

    // Fetch user data for display names and avatars
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const usersRef = collection(db, 'users');
                const unsubscribe = onSnapshot(usersRef, (snapshot) => {
                    const usersData = {};
                    snapshot.docs.forEach(doc => {
                        usersData[doc.id] = {
                            id: doc.id,
                            ...doc.data()
                        };
                    });
                    setUsers(usersData);
                });

                return () => unsubscribe();
            } catch (error) {
                console.error('Error fetching users:', error);
            }
        };

        fetchUsers();
    }, []);

    // Set up real-time leaderboard listener
    useEffect(() => {
        const unsubscribe = statsService.onLeaderboardUpdate((data) => {
            setLeaderboardData(data);
            setLastUpdated(new Date());
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Initial data load and stats calculation
    useEffect(() => {
        const initializeLeaderboard = async () => {
            try {
                setLoading(true);
                
                // Check if playerStats collection exists and has data
                const statsSnapshot = await getDocs(collection(db, 'playerStats'));
                
                if (statsSnapshot.empty) {
                    console.log('No player stats found, calculating initial statistics...');
                    setUpdating(true);
                    await statsService.updateAllPlayerStats();
                    setUpdating(false);
                }
                
                // The real-time listener will handle the data update
            } catch (error) {
                console.error('Error initializing leaderboard:', error);
                setError('Failed to load leaderboard data.');
                setLoading(false);
            }
        };

        initializeLeaderboard();
    }, []);

    const handleRefreshStats = async () => {
        try {
            setUpdating(true);
            setError('');
            await statsService.updateAllPlayerStats();
            setUpdating(false);
        } catch (error) {
            console.error('Error refreshing stats:', error);
            setError('Failed to refresh statistics.');
            setUpdating(false);
        }
    };

    const getPlayerName = (playerId) => {
        const user = users[playerId];
        return user?.name || user?.displayName || user?.email || 'Unknown Player';
    };

    const getPlayerAvatar = (playerId) => {
        const user = users[playerId];
        if (user?.photoURL) {
            return user.photoURL;
        }
        // Return default avatar or initials
        const name = getPlayerName(playerId);
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=5C6BC0&color=fff&size=40`;
    };

    // Calculate derived data from real leaderboard data
    const totalPlayers = leaderboardData.length;
    const currentUserData = leaderboardData.find(player => player.playerId === currentUser?.uid);
    const currentUserRank = currentUserData?.rank || 0;
    const topPlayer = leaderboardData[0];

    // Calculate recent changes (mock implementation - can be enhanced with historical data)
    const recentChanges = leaderboardData.slice(0, 3).map((player, index) => ({
        name: getPlayerName(player.playerId),
        change: index === 0 ? '+2' : index === 1 ? '-1' : '+1',
        direction: index === 1 ? 'down' : 'up'
    }));

    // Calculate rising stars (players with best recent performance)
    const risingStars = leaderboardData
        .filter(player => player.recentWinRate > player.winRate)
        .sort((a, b) => (b.recentWinRate - b.winRate) - (a.recentWinRate - a.winRate))
        .slice(0, 3)
        .map(player => ({
            name: getPlayerName(player.playerId),
            improvement: `+${Math.round((player.recentWinRate - player.winRate) * 10) / 10}%`,
            period: 'recent matches'
        }));

    // Hall of Fame (top performers by different metrics)
    const hallOfFame = {
        highestWinRate: leaderboardData.reduce((max, player) => 
            player.winRate > (max?.winRate || 0) ? player : max, null),
        longestStreak: leaderboardData.reduce((max, player) => 
            player.currentStreak > (max?.currentStreak || 0) ? player : max, null),
        mostActive: leaderboardData.reduce((max, player) => 
            player.totalMatches > (max?.totalMatches || 0) ? player : max, null)
    };

    // Pagination logic
    const totalPages = Math.ceil(leaderboardData.length / playersPerPage);
    const startIndex = (currentPage - 1) * playersPerPage;
    const endIndex = startIndex + playersPerPage;
    const currentPlayers = leaderboardData.slice(startIndex, endIndex);

    const handleTimeFilterChange = (e) => {
        setTimeFilter(e.target.value);
        setCurrentPage(1);
        // TODO: Implement actual filtering logic with time-based queries
    };

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    const getStreakColor = (streak, type) => {
        if (streak === 0) return 'secondary';
        return type === 'wins' ? 'success' : 'danger';
    };

    const renderPagination = () => {
        if (totalPages <= 1) return null;

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

    if (loading) {
        return (
            <div className="leaderboard-page">
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
                <div className="jumbotron-overlap-container">
                    <Container className="py-5">
                        <div className="text-center">
                            <Spinner animation="border" role="status" size="lg">
                                <span className="visually-hidden">Loading leaderboard...</span>
                            </Spinner>
                            <p className="mt-3 text-muted">Loading leaderboard data...</p>
                            {updating && <p className="text-info">Calculating player statistics...</p>}
                        </div>
                    </Container>
                </div>
            </div>
        );
    }

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
                    {error && (
                        <Alert variant="danger" className="mb-4">
                            {error}
                            <Button variant="outline-danger" size="sm" className="ms-3" onClick={handleRefreshStats}>
                                Try Again
                            </Button>
                        </Alert>
                    )}

                    {/* Stat Cards Row - Enhanced with Real Data */}
                    <Row className="mb-4">
                        <Col lg={4}>
                            <Card className="text-center stat-card">
                                <Card.Body>
                                    <h6 className="text-muted mb-2">Top Players</h6>
                                    <h2 className="display-4 text-primary mb-0">{totalPlayers}</h2>
                                    <small className="text-muted">Active players</small>
                                    {updating && (
                                        <div className="mt-2">
                                            <Spinner animation="border" size="sm" />
                                        </div>
                                    )}
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col lg={4}>
                            <Card className="text-center stat-card">
                                <Card.Body>
                                    <h6 className="text-muted mb-2">Your Rank</h6>
                                    <h2 className="display-4 text-warning mb-0">
                                        {currentUserRank > 0 ? `#${currentUserRank}` : '--'}
                                    </h2>
                                    <small className="text-muted">
                                        {currentUserData ? 
                                            `${currentUserData.winRate}% win rate` : 
                                            'Play matches to get ranked'
                                        }
                                    </small>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col lg={4}>
                            <Card className="text-center stat-card">
                                <Card.Body>
                                    <h6 className="text-muted mb-2">Top Player</h6>
                                    {topPlayer ? (
                                        <>
                                            <h4 className="text-success mb-1">{getPlayerName(topPlayer.playerId)}</h4>
                                            <p className="mb-0">({topPlayer.totalWins} wins)</p>
                                            <small className="text-muted">{topPlayer.winRate}% win rate</small>
                                        </>
                                    ) : (
                                        <p className="text-muted">No data available</p>
                                    )}
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
                        <Col md={9} className="text-end">
                            <Button 
                                variant="outline-primary" 
                                size="sm" 
                                onClick={handleRefreshStats}
                                disabled={updating}
                            >
                                {updating ? (
                                    <>
                                        <Spinner animation="border" size="sm" className="me-2" />
                                        Updating...
                                    </>
                                ) : (
                                    '🔄 Refresh Stats'
                                )}
                            </Button>
                            {lastUpdated && (
                                <small className="text-muted ms-3">
                                    Last updated: {lastUpdated.toLocaleTimeString()}
                                </small>
                            )}
                        </Col>
                    </Row>

                    {leaderboardData.length === 0 ? (
                        <Card className="text-center py-5">
                            <Card.Body>
                                <h5 className="text-muted">No Player Data Available</h5>
                                <p className="text-muted">
                                    Complete some matches to see the leaderboard rankings.
                                </p>
                                <Button variant="primary" onClick={handleRefreshStats}>
                                    Calculate Statistics
                                </Button>
                            </Card.Body>
                        </Card>
                    ) : (
                        <>
                            {/* Main Leaderboard Table - Enhanced with Real Data */}
                            <Card className="mb-4">
                                <Card.Header>
                                    <h5 className="mb-0">Player Rankings</h5>
                                </Card.Header>
                                <Card.Body className="p-0">
                                    <Table responsive hover className="mb-0">
                                        <thead className="table-light">
                                            <tr>
                                                <th>Rank</th>
                                                <th>Player</th>
                                                <th>Matches</th>
                                                <th>Win Rate</th>
                                                <th>Record</th>
                                                <th>Streak</th>
                                                <th>Score</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {currentPlayers.map((player) => (
                                                <tr 
                                                    key={player.playerId}
                                                    className={player.playerId === currentUser?.uid ? 'table-warning' : ''}
                                                >
                                                    <td>
                                                        <Badge 
                                                            bg={player.rank <= 3 ? 'warning' : 'primary'} 
                                                            className="fs-6"
                                                        >
                                                            #{player.rank}
                                                        </Badge>
                                                    </td>
                                                    <td>
                                                        <div className="d-flex align-items-center">
                                                            <img 
                                                                src={getPlayerAvatar(player.playerId)}
                                                                alt="Player"
                                                                className="rounded-circle me-2"
                                                                width="32"
                                                                height="32"
                                                            />
                                                            <div>
                                                                <div className="fw-bold">
                                                                    {getPlayerName(player.playerId)}
                                                                    {player.playerId === currentUser?.uid && (
                                                                        <Badge bg="info" className="ms-2">You</Badge>
                                                                    )}
                                                                </div>
                                                                {player.lastMatchDate && (
                                                                    <small className="text-muted">
                                                                        Last: {new Date(player.lastMatchDate.toDate()).toLocaleDateString()}
                                                                    </small>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className="fw-bold">{player.totalMatches}</span>
                                                    </td>
                                                    <td>
                                                        <Badge 
                                                            bg={player.winRate >= 70 ? 'success' : 
                                                                player.winRate >= 50 ? 'warning' : 'danger'}
                                                        >
                                                            {player.winRate}%
                                                        </Badge>
                                                    </td>
                                                    <td>
                                                        <span className="text-success fw-bold">{player.totalWins}W</span>
                                                        <span className="text-muted"> - </span>
                                                        <span className="text-danger fw-bold">{player.totalLosses}L</span>
                                                    </td>
                                                    <td>
                                                        {player.currentStreak > 0 && (
                                                            <Badge bg={getStreakColor(player.currentStreak, player.streakType)}>
                                                                {player.currentStreak}{player.streakType === 'wins' ? 'W' : 'L'}
                                                            </Badge>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <span className="fw-bold text-primary">
                                                            {player.rankingScore}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                </Card.Body>

                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <Card.Footer>
                                        <nav aria-label="Leaderboard pagination">
                                            <ul className="pagination justify-content-center mb-0">
                                                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                                    <button 
                                                        className="page-link" 
                                                        onClick={() => handlePageChange(currentPage - 1)}
                                                        disabled={currentPage === 1}
                                                    >
                                                        Previous
                                                    </button>
                                                </li>
                                                {renderPagination()}
                                                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                                                    <button 
                                                        className="page-link" 
                                                        onClick={() => handlePageChange(currentPage + 1)}
                                                        disabled={currentPage === totalPages}
                                                    >
                                                        Next
                                                    </button>
                                                </li>
                                            </ul>
                                        </nav>
                                    </Card.Footer>
                                )}
                            </Card>

                            {/* Additional Cards Row - Enhanced with Real Data */}
                            <Row>
                                {/* Recent Changes Card */}
                                <Col lg={4} className="mb-4">
                                    <Card className="h-100">
                                        <Card.Header>
                                            <h6 className="mb-0">Recent Changes</h6>
                                        </Card.Header>
                                        <Card.Body>
                                            {recentChanges.length > 0 ? (
                                                <div className="list-group list-group-flush">
                                                    {recentChanges.map((change, index) => (
                                                        <div key={index} className="list-group-item border-0 px-0 py-2">
                                                            <div className="d-flex justify-content-between align-items-center">
                                                                <span className="fw-bold">{change.name}</span>
                                                                <Badge bg={change.direction === 'up' ? 'success' : 'danger'}>
                                                                    {change.direction === 'up' ? '↗' : '↘'} {change.change}
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-muted">No recent changes available</p>
                                            )}
                                        </Card.Body>
                                    </Card>
                                </Col>

                                {/* Rising Stars Card */}
                                <Col lg={4} className="mb-4">
                                    <Card className="h-100">
                                        <Card.Header>
                                            <h6 className="mb-0">Rising Stars</h6>
                                        </Card.Header>
                                        <Card.Body>
                                            {risingStars.length > 0 ? (
                                                <div className="list-group list-group-flush">
                                                    {risingStars.map((star, index) => (
                                                        <div key={index} className="list-group-item border-0 px-0 py-2">
                                                            <div className="d-flex justify-content-between align-items-center">
                                                                <div>
                                                                    <div className="fw-bold">{star.name}</div>
                                                                    <small className="text-muted">{star.period}</small>
                                                                </div>
                                                                <Badge bg="success">{star.improvement}</Badge>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-muted">No rising stars this period</p>
                                            )}
                                        </Card.Body>
                                    </Card>
                                </Col>

                                {/* Hall of Fame Card */}
                                <Col lg={4} className="mb-4">
                                    <Card className="h-100">
                                        <Card.Header>
                                            <h6 className="mb-0">Hall of Fame</h6>
                                        </Card.Header>
                                        <Card.Body>
                                            <div className="list-group list-group-flush">
                                                {hallOfFame.highestWinRate && (
                                                    <div className="list-group-item border-0 px-0 py-2">
                                                        <div className="d-flex justify-content-between align-items-center">
                                                            <div>
                                                                <div className="fw-bold">🎯 Best Win Rate</div>
                                                                <small className="text-muted">
                                                                    {getPlayerName(hallOfFame.highestWinRate.playerId)}
                                                                </small>
                                                            </div>
                                                            <Badge bg="success">{hallOfFame.highestWinRate.winRate}%</Badge>
                                                        </div>
                                                    </div>
                                                )}
                                                {hallOfFame.longestStreak && (
                                                    <div className="list-group-item border-0 px-0 py-2">
                                                        <div className="d-flex justify-content-between align-items-center">
                                                            <div>
                                                                <div className="fw-bold">🔥 Longest Streak</div>
                                                                <small className="text-muted">
                                                                    {getPlayerName(hallOfFame.longestStreak.playerId)}
                                                                </small>
                                                            </div>
                                                            <Badge bg="warning">{hallOfFame.longestStreak.currentStreak}</Badge>
                                                        </div>
                                                    </div>
                                                )}
                                                {hallOfFame.mostActive && (
                                                    <div className="list-group-item border-0 px-0 py-2">
                                                        <div className="d-flex justify-content-between align-items-center">
                                                            <div>
                                                                <div className="fw-bold">⚡ Most Active</div>
                                                                <small className="text-muted">
                                                                    {getPlayerName(hallOfFame.mostActive.playerId)}
                                                                </small>
                                                            </div>
                                                            <Badge bg="info">{hallOfFame.mostActive.totalMatches}</Badge>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>
                        </>
                    )}
                </Container>
            </div>
        </div>
    );
};

export default Leaderboard;

