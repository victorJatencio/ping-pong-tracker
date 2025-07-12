// src/components/history/MonthlySummaryCard.jsx
import React, { useContext, useMemo } from 'react';
import { Badge, Row, Col } from 'react-bootstrap';
import { AuthContext } from '../../../contexts/AuthContext';
import { useGetUserMatchHistoryQuery } from '../../../store/slices/apiSlice';
import DashboardCard from '../../common/Card';

const MonthlySummaryCard = ({ title = "This Month" }) => {
  const { currentUser } = useContext(AuthContext);

  // Fetch user's match history
  const { 
    data: matchHistoryResponse, 
    error, 
    isLoading 
  } = useGetUserMatchHistoryQuery({
    userId: currentUser?.uid,
    filters: {
      result: 'all',
      startDate: null,
      endDate: null,
      sortBy: 'date',
      sortOrder: 'desc'
    },
    pagination: { page: 1, pageSize: 1000 } // Get all matches for filtering
  }, {
    skip: !currentUser?.uid
  });

  // Calculate current month statistics
  const monthlyStats = useMemo(() => {
    if (!matchHistoryResponse?.matches || matchHistoryResponse.matches.length === 0) {
      return {
        totalMatches: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        currentStreak: 0,
        monthName: new Date().toLocaleString('default', { month: 'long' })
      };
    }

    // Get current month and year
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const monthName = now.toLocaleString('default', { month: 'long' });

    // Filter matches for current month
    const currentMonthMatches = matchHistoryResponse.matches.filter(match => {
      const matchDate = new Date(match.completedDate);
      return matchDate.getMonth() === currentMonth && matchDate.getFullYear() === currentYear;
    });

    // Calculate stats
    const totalMatches = currentMonthMatches.length;
    const wins = currentMonthMatches.filter(match => match.winnerId === currentUser?.uid).length;
    const losses = currentMonthMatches.filter(match => match.loserId === currentUser?.uid).length;
    const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;

    // Calculate current streak (from most recent matches this month)
    const sortedMatches = [...currentMonthMatches].sort((a, b) => {
      const dateA = new Date(a.completedDate);
      const dateB = new Date(b.completedDate);
      return dateB - dateA; // Most recent first
    });

    let currentStreak = 0;
    for (const match of sortedMatches) {
      if (match.winnerId === currentUser?.uid) {
        currentStreak++;
      } else {
        break; // Streak broken
      }
    }

    return {
      totalMatches,
      wins,
      losses,
      winRate,
      currentStreak,
      monthName
    };
  }, [matchHistoryResponse, currentUser]);

  // Get performance indicator
  const getPerformanceIndicator = (winRate) => {
    if (winRate >= 80) return { icon: '🔥', text: 'On Fire!', color: 'danger' };
    if (winRate >= 70) return { icon: '🚀', text: 'Excellent', color: 'success' };
    if (winRate >= 60) return { icon: '👍', text: 'Good', color: 'primary' };
    if (winRate >= 50) return { icon: '📈', text: 'Improving', color: 'info' };
    if (winRate > 0) return { icon: '💪', text: 'Keep Going', color: 'warning' };
    return { icon: '🎯', text: 'Get Started', color: 'secondary' };
  };

  const performance = getPerformanceIndicator(monthlyStats.winRate);

  if (isLoading) {
    return (
      <DashboardCard title={title}>
        <div className="text-center py-4">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </DashboardCard>
    );
  }

  if (error) {
    return (
      <DashboardCard title={title}>
        <div className="alert alert-danger" role="alert">
          Error loading monthly summary
        </div>
      </DashboardCard>
    );
  }

  return (
    <DashboardCard title={`${monthlyStats.monthName} Summary`}>
      <div className="py-3">
        {/* Performance Indicator */}
        <div className="text-center mb-3">
          <span className="fs-2 me-2">{performance.icon}</span>
          <Badge bg={performance.color} className="fs-6 px-3 py-2">
            {performance.text}
          </Badge>
        </div>

        {/* Main Stats Grid */}
        <Row className="text-center g-3 mb-3">
          <Col xs={6}>
            <div className="border rounded p-2">
              <h4 className="fw-bold text-primary mb-1">{monthlyStats.totalMatches}</h4>
              <small className="text-muted">Matches</small>
            </div>
          </Col>
          <Col xs={6}>
            <div className="border rounded p-2">
              <h4 className="fw-bold text-success mb-1">{monthlyStats.winRate}%</h4>
              <small className="text-muted">Win Rate</small>
            </div>
          </Col>
        </Row>

        {/* Win/Loss Breakdown */}
        <Row className="text-center g-2 mb-3">
          <Col xs={4}>
            <div className="text-success">
              <div className="fw-bold">{monthlyStats.wins}</div>
              <small className="text-muted">Wins</small>
            </div>
          </Col>
          <Col xs={4}>
            <div className="text-danger">
              <div className="fw-bold">{monthlyStats.losses}</div>
              <small className="text-muted">Losses</small>
            </div>
          </Col>
          <Col xs={4}>
            <div className="text-warning">
              <div className="fw-bold">{monthlyStats.currentStreak}</div>
              <small className="text-muted">Streak</small>
            </div>
          </Col>
        </Row>

        {/* Motivational Message */}
        <div className="text-center">
          {monthlyStats.totalMatches === 0 ? (
            <small className="text-muted">
              No matches played this month yet. Start playing to see your progress!
            </small>
          ) : monthlyStats.winRate >= 70 ? (
            <small className="text-muted">
              Great performance this month! Keep it up! 🎉
            </small>
          ) : monthlyStats.winRate >= 50 ? (
            <small className="text-muted">
              Solid month so far. You're on the right track! 💪
            </small>
          ) : (
            <small className="text-muted">
              Every match is a chance to improve. Keep playing! 🚀
            </small>
          )}
        </div>
      </div>
    </DashboardCard>
  );
};

export default MonthlySummaryCard;

