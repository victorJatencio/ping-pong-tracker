import React, { useState, useMemo } from 'react';
import { Container, Row, Col, Card, Table, Badge, Form, Button, InputGroup } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Jumbotron from '../../components/common/Jumbotron';
import UserAvatar from '../../components/common/UserAvatar';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

const History = () => {
    const { currentUser } = useAuth();
    const [resultFilter, setResultFilter] = useState('all');
    const [playerFilter, setPlayerFilter] = useState('all');
    const [dateRange, setDateRange] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const matchesPerPage = 10;

    // Mock match history data - replace with actual data from your backend
    const allMatches = [
        { id: 1, date: 'Jun 5, 2025', opponent: 'Jane', opponentAvatar: null, score: '21-15', result: 'Won', details: 'Great match!' },
        { id: 2, date: 'June 3, 2025', opponent: 'Mike', opponentAvatar: null, score: '18-21', result: 'Lost', details: 'Close game' },
        { id: 3, date: 'May 30, 2025', opponent: 'Sarah', opponentAvatar: null, score: '21-19', result: 'Won', details: 'Comeback win' },
        { id: 4, date: 'May 28, 2025', opponent: 'Tom', opponentAvatar: null, score: '15-21', result: 'Lost', details: 'Tough opponent' },
        { id: 5, date: 'May 25, 2025', opponent: 'Alex', opponentAvatar: null, score: '21-12', result: 'Won', details: 'Dominant performance' },
        { id: 6, date: 'May 23, 2025', opponent: 'Lisa', opponentAvatar: null, score: '19-21', result: 'Lost', details: 'Heartbreaker' },
        { id: 7, date: 'May 20, 2025', opponent: 'David', opponentAvatar: null, score: '21-16', result: 'Won', details: 'Solid win' },
        { id: 8, date: 'May 18, 2025', opponent: 'Emma', opponentAvatar: null, score: '21-14', result: 'Won', details: 'Easy victory' },
        { id: 9, date: 'May 15, 2025', opponent: 'Chris', opponentAvatar: null, score: '17-21', result: 'Lost', details: 'Off day' },
        { id: 10, date: 'May 12, 2025', opponent: 'Jane', opponentAvatar: null, score: '21-18', result: 'Won', details: 'Revenge match' },
        { id: 11, date: 'May 10, 2025', opponent: 'Mike', opponentAvatar: null, score: '16-21', result: 'Lost', details: 'Learning experience' },
        { id: 12, date: 'May 8, 2025', opponent: 'Sarah', opponentAvatar: null, score: '21-13', result: 'Won', details: 'Perfect game' },
        { id: 13, date: 'May 5, 2025', opponent: 'Tom', opponentAvatar: null, score: '21-20', result: 'Won', details: 'Nail-biter' },
        { id: 14, date: 'May 3, 2025', opponent: 'Alex', opponentAvatar: null, score: '14-21', result: 'Lost', details: 'Rusty performance' },
        { id: 15, date: 'May 1, 2025', opponent: 'Lisa', opponentAvatar: null, score: '21-17', result: 'Won', details: 'Month starter' },
    ];

    // Calculate statistics
    const totalMatches = allMatches.length;
    const wins = allMatches.filter(match => match.result === 'Won').length;
    const losses = allMatches.filter(match => match.result === 'Lost').length;
    const winRate = Math.round((wins / totalMatches) * 100);

    // Calculate longest streak
    const calculateLongestStreak = () => {
        let longestStreak = 0;
        let currentStreak = 0;
        let streakType = '';
        let longestStreakType = '';
        
        // Sort matches by date (most recent first)
        const sortedMatches = [...allMatches].reverse();
        
        for (let i = 0; i < sortedMatches.length; i++) {
            const currentResult = sortedMatches[i].result;
            
            if (i === 0 || currentResult === streakType) {
                currentStreak++;
                streakType = currentResult;
            } else {
                if (currentStreak > longestStreak) {
                    longestStreak = currentStreak;
                    longestStreakType = streakType;
                }
                currentStreak = 1;
                streakType = currentResult;
            }
        }
        
        // Check final streak
        if (currentStreak > longestStreak) {
            longestStreak = currentStreak;
            longestStreakType = streakType;
        }
        
        return { count: longestStreak, type: longestStreakType };
    };

    const longestStreak = calculateLongestStreak();

    // Performance chart data
    const chartData = {
        labels: ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
        datasets: [
            {
                label: 'Win Rate %',
                data: [15, 12, 15, 10, 8, 12, 15, 13, 12],
                borderColor: '#5C6BC0',
                backgroundColor: 'rgba(92, 107, 192, 0.1)',
                borderWidth: 3,
                pointBackgroundColor: '#5C6BC0',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 6,
                tension: 0.4,
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
            title: {
                display: false,
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                max: 30,
                grid: {
                    color: 'rgba(0, 0, 0, 0.1)',
                },
                ticks: {
                    color: '#6c757d',
                },
            },
            x: {
                grid: {
                    color: 'rgba(0, 0, 0, 0.1)',
                },
                ticks: {
                    color: '#6c757d',
                },
            },
        },
    };

    // Filter matches based on current filters
    const filteredMatches = useMemo(() => {
        return allMatches.filter(match => {
            const matchesResult = resultFilter === 'all' || match.result.toLowerCase() === resultFilter;
            const matchesPlayer = playerFilter === 'all' || match.opponent.toLowerCase().includes(playerFilter.toLowerCase());
            const matchesSearch = searchTerm === '' || 
                match.opponent.toLowerCase().includes(searchTerm.toLowerCase()) ||
                match.score.includes(searchTerm) ||
                match.details.toLowerCase().includes(searchTerm.toLowerCase());
            
            return matchesResult && matchesPlayer && matchesSearch;
        });
    }, [resultFilter, playerFilter, searchTerm]);

    // Pagination logic
    const totalPages = Math.ceil(filteredMatches.length / matchesPerPage);
    const startIndex = (currentPage - 1) * matchesPerPage;
    const endIndex = startIndex + matchesPerPage;
    const currentMatches = filteredMatches.slice(startIndex, endIndex);

    // Get unique opponents for filter
    const uniqueOpponents = [...new Set(allMatches.map(match => match.opponent))];

    // Recent performance data
    const recentMatches = allMatches.slice(0, 10);
    const recentWins = recentMatches.filter(match => match.result === 'Won').length;
    const recentWinRate = Math.round((recentWins / recentMatches.length) * 100);

    // Best/Worst opponents
    const opponentStats = {};
    allMatches.forEach(match => {
        if (!opponentStats[match.opponent]) {
            opponentStats[match.opponent] = { wins: 0, losses: 0, total: 0 };
        }
        opponentStats[match.opponent].total++;
        if (match.result === 'Won') {
            opponentStats[match.opponent].wins++;
        } else {
            opponentStats[match.opponent].losses++;
        }
    });

    const bestOpponent = Object.entries(opponentStats)
        .map(([name, stats]) => ({ name, winRate: Math.round((stats.wins / stats.total) * 100), total: stats.total }))
        .filter(opponent => opponent.total >= 2)
        .sort((a, b) => b.winRate - a.winRate)[0];

    const worstOpponent = Object.entries(opponentStats)
        .map(([name, stats]) => ({ name, winRate: Math.round((stats.wins / stats.total) * 100), total: stats.total }))
        .filter(opponent => opponent.total >= 2)
        .sort((a, b) => a.winRate - b.winRate)[0];

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    const handleFilterChange = (filterType, value) => {
        switch (filterType) {
            case 'result':
                setResultFilter(value);
                break;
            case 'player':
                setPlayerFilter(value);
                break;
            case 'dateRange':
                setDateRange(value);
                break;
            case 'search':
                setSearchTerm(value);
                break;
        }
        setCurrentPage(1); // Reset to first page when filters change
    };

    const renderPagination = () => {
        const pages = [];
        const maxVisiblePages = 5;
        
        for (let i = 1; i <= Math.min(totalPages, maxVisiblePages); i++) {
            pages.push(
                <li key={i} className={`page-item ${i === currentPage ? 'active' : ''}`}>
                    <button className="page-link" onClick={() => handlePageChange(i)}>
                        {i}
                    </button>
                </li>
            );
        }

        if (totalPages > maxVisiblePages) {
            pages.push(
                <li key="ellipsis" className="page-item disabled">
                    <span className="page-link">...</span>
                </li>
            );
            pages.push(
                <li key={totalPages} className={`page-item ${totalPages === currentPage ? 'active' : ''}`}>
                    <button className="page-link" onClick={() => handlePageChange(totalPages)}>
                        {totalPages}
                    </button>
                </li>
            );
        }

        return pages;
    };

    return (
        <div className="history-page">
            {/* Standard Jumbotron */}
            <Jumbotron
                title="Match History"
                subtitle="View your past matches and performance over time"
                backgroundImage="https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80"
                height="300px"
                overlay={true}
                textAlign="left"
                fullWidth={true}
                className="jumbotron-primary"
            />

            {/* History Content with Overlap Effect */}
            <div className="jumbotron-overlap-container">
                <Container className="py-5">
                    {/* Performance Stat Cards Row */}
                    <Row className="mb-4">
                        <Col lg={4}>
                            <Card className="text-center stat-card">
                                <Card.Body>
                                    <h6 className="text-muted mb-2">Total Matches</h6>
                                    <h2 className="display-4 text-primary mb-0">{totalMatches}</h2>
                                    <small className="text-muted">Matches played</small>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col lg={4}>
                            <Card className="text-center stat-card">
                                <Card.Body>
                                    <h6 className="text-muted mb-2">Win/Loss Ratio</h6>
                                    <h2 className="display-4 text-success mb-0">{winRate}%</h2>
                                    <small className="text-muted">{wins}W - {losses}L</small>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col lg={4}>
                            <Card className="text-center stat-card">
                                <Card.Body>
                                    <h6 className="text-muted mb-2">Longest Streak</h6>
                                    <h2 className={`display-4 mb-0 ${longestStreak.type === 'Won' ? 'text-success' : 'text-danger'}`}>
                                        {longestStreak.count}
                                    </h2>
                                    <small className="text-muted">{longestStreak.type === 'Won' ? 'Wins' : 'Losses'}</small>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>

                    {/* Performance Chart and Filters Row */}
                    <Row className="mb-4">
                        {/* Performance Over Time Chart */}
                        <Col lg={6}>
                            <Card className="mb-4">
                                <Card.Header>
                                    <h5 className="mb-0">Performance Over Time</h5>
                                </Card.Header>
                                <Card.Body>
                                    <div style={{ height: '300px' }}>
                                        <Line data={chartData} options={chartOptions} />
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>

                        {/* Additional Stats Cards */}
                        <Col lg={6}>
                            <Row>
                                {/* Recent Performance */}
                                <Col md={12}>
                                    <Card className="mb-3">
                                        <Card.Header>
                                            <h6 className="mb-0">
                                                <i className="bi bi-graph-up me-2"></i>
                                                Recent Performance
                                            </h6>
                                        </Card.Header>
                                        <Card.Body>
                                            <div className="d-flex justify-content-between align-items-center">
                                                <div>
                                                    <h4 className="text-primary mb-1">{recentWinRate}%</h4>
                                                    <small className="text-muted">Last 10 matches</small>
                                                </div>
                                                <div className="text-end">
                                                    <Badge bg={recentWinRate >= winRate ? 'success' : 'warning'}>
                                                        {recentWinRate >= winRate ? '↗ Improving' : '↘ Declining'}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </Card.Body>
                                    </Card>
                                </Col>

                                {/* Best/Worst Opponents */}
                                <Col md={6}>
                                    <Card className="mb-3">
                                        <Card.Header>
                                            <h6 className="mb-0">
                                                <i className="bi bi-trophy me-2"></i>
                                                Best Matchup
                                            </h6>
                                        </Card.Header>
                                        <Card.Body className="text-center">
                                            {bestOpponent ? (
                                                <>
                                                    <h5 className="text-success mb-1">{bestOpponent.name}</h5>
                                                    <p className="mb-0">{bestOpponent.winRate}% win rate</p>
                                                    <small className="text-muted">{bestOpponent.total} matches</small>
                                                </>
                                             ) : (
                                                <p className="text-muted mb-0">Play more matches</p>
                                            )}
                                        </Card.Body>
                                    </Card>
                                </Col>

                                <Col md={6}>
                                    <Card className="mb-3">
                                        <Card.Header>
                                            <h6 className="mb-0">
                                                <i className="bi bi-exclamation-triangle me-2"></i>
                                                Toughest Opponent
                                            </h6>
                                        </Card.Header>
                                        <Card.Body className="text-center">
                                            {worstOpponent ? (
                                                <>
                                                    <h5 className="text-danger mb-1">{worstOpponent.name}</h5>
                                                    <p className="mb-0">{worstOpponent.winRate}% win rate</p>
                                                    <small className="text-muted">{worstOpponent.total} matches</small>
                                                </>
                                            ) : (
                                                <p className="text-muted mb-0">Play more matches</p>
                                            )}
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>
                        </Col>
                    </Row>

                    {/* Filter Section */}
                    <Row className="mb-4">
                        <Col md={3}>
                            <Form.Group className="mb-3">
                                <Form.Label className="fw-bold">Results:</Form.Label>
                                <Form.Select 
                                    value={resultFilter} 
                                    onChange={(e) => handleFilterChange('result', e.target.value)}
                                    className="filter-select"
                                >
                                    <option value="all">All Results</option>
                                    <option value="won">Wins Only</option>
                                    <option value="lost">Losses Only</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group className="mb-3">
                                <Form.Label className="fw-bold">Players:</Form.Label>
                                <Form.Select 
                                    value={playerFilter} 
                                    onChange={(e) => handleFilterChange('player', e.target.value)}
                                    className="filter-select"
                                >
                                    <option value="all">All Players</option>
                                    {uniqueOpponents.map(opponent => (
                                        <option key={opponent} value={opponent}>{opponent}</option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group className="mb-3">
                                <Form.Label className="fw-bold">Date Range:</Form.Label>
                                <Form.Select 
                                    value={dateRange} 
                                    onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                                    className="filter-select"
                                >
                                    <option value="all">All Time</option>
                                    <option value="this-month">This Month</option>
                                    <option value="last-month">Last Month</option>
                                    <option value="last-3-months">Last 3 Months</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group className="mb-3">
                                <Form.Label className="fw-bold">Search:</Form.Label>
                                <InputGroup>
                                    <Form.Control
                                        type="text"
                                        placeholder="Search matches..."
                                        value={searchTerm}
                                        onChange={(e) => handleFilterChange('search', e.target.value)}
                                        className="filter-input"
                                    />
                                    <InputGroup.Text>
                                        <i className="bi bi-search"></i>
                                    </InputGroup.Text>
                                </InputGroup>
                            </Form.Group>
                        </Col>
                    </Row>

                    {/* Match History Table */}
                    <Card className="mb-4">
                        <Card.Header>
                            <h5 className="mb-0">Match History ({filteredMatches.length} matches)</h5>
                        </Card.Header>
                        <Card.Body className="p-0">
                            <div className="table-responsive">
                                <Table className="mb-0 history-table">
                                    <thead className="table-light">
                                        <tr>
                                            <th>Date</th>
                                            <th>Opponent</th>
                                            <th>Score</th>
                                            <th>Result</th>
                                            <th>Details</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {currentMatches.length > 0 ? (
                                            currentMatches.map((match) => (
                                                <tr key={match.id}>
                                                    <td>
                                                        <span className="fw-bold">{match.date}</span>
                                                    </td>
                                                    <td>
                                                        <div className="d-flex align-items-center">
                                                            <UserAvatar 
                                                                user={{ 
                                                                    displayName: match.opponent,
                                                                    photoURL: match.opponentAvatar 
                                                                }} 
                                                                size={32} 
                                                                className="me-2"
                                                            />
                                                            <span>{match.opponent}</span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className="fw-bold">{match.score}</span>
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
                                                        <Button variant="outline-primary" size="sm">
                                                            View
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="5" className="text-center py-4">
                                                    <i className="bi bi-search fs-1 text-muted d-block mb-2"></i>
                                                    <p className="text-muted mb-0">No matches found with current filters</p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </Table>
                            </div>
                        </Card.Body>
                        {totalPages > 1 && (
                            <Card.Footer>
                                <nav aria-label="Match history pagination">
                                    <ul className="pagination pagination-sm justify-content-center mb-0">
                                        {renderPagination()}
                                    </ul>
                                </nav>
                            </Card.Footer>
                        )}
                    </Card>

                    {/* Monthly Summary Card */}
                    <Row>
                        <Col lg={12}>
                            <Card className="mb-4">
                                <Card.Header>
                                    <h5 className="mb-0">
                                        <i className="bi bi-calendar-month me-2"></i>
                                        Monthly Summary
                                    </h5>
                                </Card.Header>
                                <Card.Body>
                                    <Row>
                                        <Col md={3} className="text-center">
                                            <h4 className="text-primary mb-1">8</h4>
                                            <small className="text-muted">Matches This Month</small>
                                        </Col>
                                        <Col md={3} className="text-center">
                                            <h4 className="text-success mb-1">5</h4>
                                            <small className="text-muted">Wins</small>
                                        </Col>
                                        <Col md={3} className="text-center">
                                            <h4 className="text-danger mb-1">3</h4>
                                            <small className="text-muted">Losses</small>
                                        </Col>
                                        <Col md={3} className="text-center">
                                            <h4 className="text-warning mb-1">63%</h4>
                                            <small className="text-muted">Win Rate</small>
                                        </Col>
                                    </Row>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>
                </Container>
            </div>
        </div>
    );
};

export default History;
