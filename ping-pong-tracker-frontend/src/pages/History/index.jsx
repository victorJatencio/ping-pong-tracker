import React, { useState, useEffect, useMemo } from 'react';
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
import { db } from '../../config/firebase';
import { 
    collection, 
    getDocs,
    query,
    where,
    orderBy
} from 'firebase/firestore';
import statsService from '../../services/statsService';

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
    
    // State for real data
    const [historyData, setHistoryData] = useState({
        allMatches: [],
        userStats: null,
        usersMap: {}
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    // Filter states
    const [resultFilter, setResultFilter] = useState('all');
    const [playerFilter, setPlayerFilter] = useState('all');
    const [dateRange, setDateRange] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const matchesPerPage = 10;

    // Helper function to format date - MOVED UP before its usage
    const formatMatchDate = (date) => {
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    // Load history data
    useEffect(() => {
        if (!currentUser?.uid) return;

        const loadHistoryData = async () => {
            try {
                setLoading(true);
                setError('');

                console.log('Loading history data for user:', currentUser.uid);

                // Load user statistics
                const userStats = await statsService.getPlayerProfileStats(currentUser.uid);
                console.log('User stats loaded:', userStats);

                // Load ALL matches and filter for user
                const allMatchesSnapshot = await getDocs(collection(db, 'matches'));
                const allMatches = [];
                allMatchesSnapshot.forEach(doc => {
                    const matchData = { id: doc.id, ...doc.data() };
                    // Only include matches where current user participated
                    if (matchData.player1Id === currentUser.uid || matchData.player2Id === currentUser.uid) {
                        allMatches.push(matchData);
                    }
                });
                console.log('User matches loaded:', allMatches.length);

                // Load users for opponent names
                const usersSnapshot = await getDocs(collection(db, 'users'));
                const usersMap = {};
                usersSnapshot.forEach(doc => {
                    usersMap[doc.id] = { id: doc.id, ...doc.data() };
                });
                console.log('Users loaded:', Object.keys(usersMap).length);

                // Sort matches by date (most recent first)
                const sortedMatches = allMatches
                    .filter(match => match.status === 'completed')
                    .sort((a, b) => {
                        const dateA = a.completedDate?.toDate() || new Date(0);
                        const dateB = b.completedDate?.toDate() || new Date(0);
                        return dateB - dateA;
                    });

                console.log('Sorted completed matches:', sortedMatches.length);

                setHistoryData({
                    allMatches: sortedMatches,
                    userStats,
                    usersMap
                });

            } catch (error) {
                console.error('Error loading history data:', error);
                setError(`Failed to load history data: ${error.message}`);
            } finally {
                setLoading(false);
            }
        };

        loadHistoryData();
    }, [currentUser?.uid]);

    // Process matches for display
    const processedMatches = useMemo(() => {
        return historyData.allMatches.map(match => {
            const opponentId = match.player1Id === currentUser.uid ? match.player2Id : match.player1Id;
            const opponent = historyData.usersMap[opponentId];
            const isWinner = match.winnerId === currentUser.uid;
            
            return {
                id: match.id,
                date: match.completedDate ? formatMatchDate(match.completedDate.toDate()) : 'Unknown',
                opponent: opponent?.name || opponent?.email || 'Unknown Player',
                opponentAvatar: opponent?.profileImageUrl || null,
                score: `${match.player1Score}-${match.player2Score}`,
                result: isWinner ? 'Won' : 'Lost',
                details: match.notes || 'No details',
                rawDate: match.completedDate?.toDate() || new Date(0),
                location: match.location || 'Unknown'
            };
        });
    }, [historyData.allMatches, historyData.usersMap, currentUser?.uid]);

    // Calculate statistics from real data
    const totalMatches = processedMatches.length;
    const wins = processedMatches.filter(match => match.result === 'Won').length;
    const losses = processedMatches.filter(match => match.result === 'Lost').length;
    const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;

    // Calculate longest streak from real data
    const calculateLongestStreak = () => {
        if (processedMatches.length === 0) return { count: 0, type: 'None' };
        
        let longestStreak = 0;
        let currentStreak = 0;
        let streakType = '';
        let longestStreakType = '';
        
        // Process matches in chronological order (reverse of display order)
        const chronologicalMatches = [...processedMatches].reverse();
        
        for (let i = 0; i < chronologicalMatches.length; i++) {
            const currentResult = chronologicalMatches[i].result;
            
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

    // Generate performance chart data from real matches
    const generatePerformanceChart = () => {
        if (processedMatches.length === 0) {
            return {
                labels: ['No Data'],
                datasets: [{
                    label: 'Win Rate %',
                    data: [0],
                    borderColor: '#5C6BC0',
                    backgroundColor: 'rgba(92, 107, 192, 0.1)',
                    borderWidth: 3,
                    pointBackgroundColor: '#5C6BC0',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    tension: 0.4,
                }]
            };
        }

        // Group matches by month and calculate win rate for each month
        const monthlyData = {};
        processedMatches.forEach(match => {
            const monthKey = match.rawDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = { wins: 0, total: 0 };
            }
            monthlyData[monthKey].total++;
            if (match.result === 'Won') {
                monthlyData[monthKey].wins++;
            }
        });

        // Convert to chart format (last 6 months)
        const sortedMonths = Object.keys(monthlyData).sort((a, b) => {
            return new Date(a) - new Date(b);
        }).slice(-6);

        const labels = sortedMonths.length > 0 ? sortedMonths : ['Current'];
        const data = sortedMonths.length > 0 
            ? sortedMonths.map(month => Math.round((monthlyData[month].wins / monthlyData[month].total) * 100))
            : [winRate];

        return {
            labels,
            datasets: [{
                label: 'Win Rate %',
                data,
                borderColor: '#5C6BC0',
                backgroundColor: 'rgba(92, 107, 192, 0.1)',
                borderWidth: 3,
                pointBackgroundColor: '#5C6BC0',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 6,
                tension: 0.4,
            }]
        };
    };

    const chartData = generatePerformanceChart();

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
                max: 100,
                grid: {
                    color: 'rgba(0, 0, 0, 0.1)',
                },
                ticks: {
                    color: '#6c757d',
                    callback: function(value) {
                        return value + '%';
                    }
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
        return processedMatches.filter(match => {
            const matchesResult = resultFilter === 'all' || match.result.toLowerCase() === resultFilter;
            const matchesPlayer = playerFilter === 'all' || match.opponent.toLowerCase().includes(playerFilter.toLowerCase());
            const matchesSearch = searchTerm === '' || 
                match.opponent.toLowerCase().includes(searchTerm.toLowerCase()) ||
                match.score.includes(searchTerm) ||
                match.details.toLowerCase().includes(searchTerm.toLowerCase());
            
            // Date range filtering
            let matchesDateRange = true;
            if (dateRange !== 'all') {
                const matchDate = match.rawDate;
                const now = new Date();
                const daysDiff = Math.floor((now - matchDate) / (1000 * 60 * 60 * 24));
                
                switch (dateRange) {
                    case 'week':
                        matchesDateRange = daysDiff <= 7;
                        break;
                    case 'month':
                        matchesDateRange = daysDiff <= 30;
                        break;
                    case '3months':
                        matchesDateRange = daysDiff <= 90;
                        break;
                    default:
                        matchesDateRange = true;
                }
            }
            
            return matchesResult && matchesPlayer && matchesSearch && matchesDateRange;
        });
    }, [processedMatches, resultFilter, playerFilter, searchTerm, dateRange]);

    // Pagination logic
    const totalPages = Math.ceil(filteredMatches.length / matchesPerPage);
    const startIndex = (currentPage - 1) * matchesPerPage;
    const endIndex = startIndex + matchesPerPage;
    const currentMatches = filteredMatches.slice(startIndex, endIndex);

    // Get unique opponents for filter
    const uniqueOpponents = [...new Set(processedMatches.map(match => match.opponent))];

    // Recent performance data (last 10 matches)
    const recentMatches = processedMatches.slice(0, 10);
    const recentWins = recentMatches.filter(match => match.result === 'Won').length;
    const recentWinRate = recentMatches.length > 0 ? Math.round((recentWins / recentMatches.length) * 100) : 0;

    // Calculate opponent statistics
    const calculateOpponentStats = () => {
        const opponentStats = {};
        processedMatches.forEach(match => {
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

        const opponentList = Object.entries(opponentStats)
            .map(([name, stats]) => ({ 
                name, 
                winRate: Math.round((stats.wins / stats.total) * 100), 
                total: stats.total,
                wins: stats.wins,
                losses: stats.losses
            }))
            .filter(opponent => opponent.total >= 2); // Only include opponents with 2+ matches

        const bestOpponent = opponentList.sort((a, b) => b.winRate - a.winRate)[0];
        const worstOpponent = opponentList.sort((a, b) => a.winRate - b.winRate)[0];

        return { bestOpponent, worstOpponent };
    };

    const { bestOpponent, worstOpponent } = calculateOpponentStats();

    // Monthly summary calculation
    const calculateMonthlySummary = () => {
        const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        const currentMonthMatches = processedMatches.filter(match => {
            const matchMonth = match.rawDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            return matchMonth === currentMonth;
        });

        const monthlyWins = currentMonthMatches.filter(match => match.result === 'Won').length;
        const monthlyTotal = currentMonthMatches.length;
        const monthlyWinRate = monthlyTotal > 0 ? Math.round((monthlyWins / monthlyTotal) * 100) : 0;

        return {
            month: currentMonth,
            wins: monthlyWins,
            losses: monthlyTotal - monthlyWins,
            total: monthlyTotal,
            winRate: monthlyWinRate
        };
    };

    const monthlySummary = calculateMonthlySummary();

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
        if (totalPages <= 1) return null;

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

        return (
            <nav>
                <ul className="pagination justify-content-center">
                    <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                        <button 
                            className="page-link" 
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                        >
                            Previous
                        </button>
                    </li>
                    {pages}
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
        );
    };

    if (loading) {
        return (
            <div className="history-page">
                <Jumbotron
                    title="Match History"
                    subtitle="Loading your match history..."
                    backgroundImage="https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80"
                    height="300px"
                    overlay={true}
                    textAlign="left"
                    fullWidth={true}
                    className="jumbotron-primary"
                />
                <div className="jumbotron-overlap-container">
                    <Container className="py-5">
                        <div className="text-center">
                            <div className="spinner-border text-primary" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                            <p className="mt-3 text-muted">Loading your match history...</p>
                        </div>
                    </Container>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="history-page">
                <Jumbotron
                    title="Match History"
                    subtitle="There was an error loading your history"
                    backgroundImage="https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80"
                    height="300px"
                    overlay={true}
                    textAlign="left"
                    fullWidth={true}
                    className="jumbotron-primary"
                />
                <div className="jumbotron-overlap-container">
                    <Container className="py-5">
                        <div className="alert alert-danger text-center">
                            <h5>Error Loading History</h5>
                            <p>{error}</p>
                            <Button variant="primary" onClick={() => window.location.reload()}>
                                Try Again
                            </Button>
                        </div>
                    </Container>
                </div>
            </div>
        );
    }

    return (
        <div className="history-page">
            {/* Standard Jumbotron */}
            <Jumbotron
                title="Match History"
                subtitle={`View your ${totalMatches} matches and performance over time`}
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
                                    <small className="text-muted">{longestStreak.type === 'Won' ? 'Wins' : longestStreak.type === 'Lost' ? 'Losses' : 'None'}</small>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>

                    {/* Performance Chart and Additional Stats Row */}
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
                                                    <small className="text-muted">Last {recentMatches.length} matches</small>
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
                                        <Card.Body>
                                            {bestOpponent ? (
                                                <div className="text-center">
                                                    <UserAvatar 
                                                        user={{ displayName: bestOpponent.name }} 
                                                        size={40} 
                                                        className="mb-2"
                                                    />
                                                    <h6 className="mb-1">{bestOpponent.name}</h6>
                                                    <Badge bg="success">{bestOpponent.winRate}% win rate</Badge>
                                                    <div className="mt-1">
                                                        <small className="text-muted">{bestOpponent.wins}-{bestOpponent.losses}</small>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-center text-muted">
                                                    <i className="bi bi-person-x fs-1 d-block mb-2"></i>
                                                    <small>Need more matches</small>
                                                </div>
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
                                        <Card.Body>
                                            {worstOpponent ? (
                                                <div className="text-center">
                                                    <UserAvatar 
                                                        user={{ displayName: worstOpponent.name }} 
                                                        size={40} 
                                                        className="mb-2"
                                                    />
                                                    <h6 className="mb-1">{worstOpponent.name}</h6>
                                                    <Badge bg="danger">{worstOpponent.winRate}% win rate</Badge>
                                                    <div className="mt-1">
                                                        <small className="text-muted">{worstOpponent.wins}-{worstOpponent.losses}</small>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-center text-muted">
                                                    <i className="bi bi-person-x fs-1 d-block mb-2"></i>
                                                    <small>Need more matches</small>
                                                </div>
                                            )}
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>
                        </Col>
                    </Row>

                    {/* Match History Table with Filters */}
                    <Row className="mb-4">
                        <Col lg={9}>
                            <Card>
                                <Card.Header>
                                    <div className="d-flex justify-content-between align-items-center">
                                        <h5 className="mb-0">Match History</h5>
                                        <Badge bg="secondary">{filteredMatches.length} matches</Badge>
                                    </div>
                                </Card.Header>
                                <Card.Body>
                                    {/* Filters Row - Now inside the card */}
                                    <Row className="mb-3">
                                        <Col md={3}>
                                            <Form.Group>
                                                <Form.Label className="small fw-bold">Results</Form.Label>
                                                <Form.Select 
                                                    size="sm"
                                                    value={resultFilter} 
                                                    onChange={(e) => handleFilterChange('result', e.target.value)}
                                                >
                                                    <option value="all">All Results</option>
                                                    <option value="won">Wins Only</option>
                                                    <option value="lost">Losses Only</option>
                                                </Form.Select>
                                            </Form.Group>
                                        </Col>
                                        <Col md={3}>
                                            <Form.Group>
                                                <Form.Label className="small fw-bold">Players</Form.Label>
                                                <Form.Select 
                                                    size="sm"
                                                    value={playerFilter} 
                                                    onChange={(e) => handleFilterChange('player', e.target.value)}
                                                >
                                                    <option value="all">All Players</option>
                                                    {uniqueOpponents.map(opponent => (
                                                        <option key={opponent} value={opponent}>{opponent}</option>
                                                    ))}
                                                </Form.Select>
                                            </Form.Group>
                                        </Col>
                                        <Col md={3}>
                                            <Form.Group>
                                                <Form.Label className="small fw-bold">Date Range</Form.Label>
                                                <Form.Select 
                                                    size="sm"
                                                    value={dateRange} 
                                                    onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                                                >
                                                    <option value="all">All Time</option>
                                                    <option value="week">Last Week</option>
                                                    <option value="month">Last Month</option>
                                                    <option value="3months">Last 3 Months</option>
                                                </Form.Select>
                                            </Form.Group>
                                        </Col>
                                        <Col md={3}>
                                            <Form.Group>
                                                <Form.Label className="small fw-bold">Search</Form.Label>
                                                <InputGroup size="sm">
                                                    <Form.Control
                                                        type="text"
                                                        placeholder="Search matches..."
                                                        value={searchTerm}
                                                        onChange={(e) => handleFilterChange('search', e.target.value)}
                                                    />
                                                    <InputGroup.Text>
                                                        <i className="bi bi-search"></i>
                                                    </InputGroup.Text>
                                                </InputGroup>
                                            </Form.Group>
                                        </Col>
                                    </Row>

                                    {/* Match Table */}
                                    {currentMatches.length > 0 ? (
                                        <>
                                            <Table responsive hover className="align-middle mb-4">
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
                                                    {currentMatches.map(match => (
                                                        <tr key={match.id}>
                                                            <td>{match.date}</td>
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
                                                            <td className="fw-bold">{match.score}</td>
                                                            <td>
                                                                <Badge bg={match.result === 'Won' ? 'success' : 'danger'}>
                                                                    {match.result}
                                                                </Badge>
                                                            </td>
                                                            <td className="text-muted">{match.details}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </Table>
                                            
                                            {/* Pagination */}
                                            {renderPagination()}
                                        </>
                                    ) : (
                                        <div className="text-center py-4">
                                            <i className="bi bi-search fs-1 text-muted d-block mb-2"></i>
                                            <p className="text-muted mb-0">No matches found</p>
                                            <small className="text-muted">Try adjusting your filters</small>
                                        </div>
                                    )}
                                </Card.Body>
                            </Card>
                        </Col>

                        {/* Monthly Summary Card */}
                        <Col lg={3}>
                            <Card>
                                <Card.Header>
                                    <h6 className="mb-0">
                                        <i className="bi bi-calendar-month me-2"></i>
                                        Monthly Summary
                                    </h6>
                                </Card.Header>
                                <Card.Body>
                                    <div className="text-center">
                                        <h6 className="text-muted mb-3">{monthlySummary.month}</h6>
                                        
                                        <div className="mb-3">
                                            <h3 className="text-primary mb-0">{monthlySummary.total}</h3>
                                            <small className="text-muted">Total Matches</small>
                                        </div>

                                        <div className="row g-2 mb-3">
                                            <div className="col-6">
                                                <div className="border rounded p-2">
                                                    <h5 className="text-success mb-0">{monthlySummary.wins}</h5>
                                                    <small className="text-muted">Wins</small>
                                                </div>
                                            </div>
                                            <div className="col-6">
                                                <div className="border rounded p-2">
                                                    <h5 className="text-danger mb-0">{monthlySummary.losses}</h5>
                                                    <small className="text-muted">Losses</small>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mb-3">
                                            <h4 className="text-primary mb-0">{monthlySummary.winRate}%</h4>
                                            <small className="text-muted">Win Rate</small>
                                        </div>

                                        <Badge 
                                            bg={monthlySummary.winRate >= winRate ? 'success' : 'warning'}
                                            className="w-100"
                                        >
                                            {monthlySummary.winRate >= winRate ? 
                                                `↗ ${monthlySummary.winRate - winRate}% above average` : 
                                                `↘ ${winRate - monthlySummary.winRate}% below average`
                                            }
                                        </Badge>
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

export default History;

