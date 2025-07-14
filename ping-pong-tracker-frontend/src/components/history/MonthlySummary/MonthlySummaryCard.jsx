// src/components/history/MonthlySummaryCard.jsx
import React, { useContext, useMemo } from 'react';
import { Badge, Row, Col } from 'react-bootstrap';
import { AuthContext } from '../../../contexts/AuthContext';
import { useGetPlayerStatsFromBackendQuery } from '../../../store/slices/apiSlice';
import DashboardCard from '../../common/Card';

const MonthlySummaryCard = ({ title = "Performance Summary" }) => {
  const { currentUser } = useContext(AuthContext);

  // Use the working stats endpoint that we've already fixed
  const { 
    data: userStats, 
    error, 
    isLoading 
  } = useGetPlayerStatsFromBackendQuery(currentUser?.uid, {
    skip: !currentUser?.uid
  });

  // Add debug logging to see what data we're getting
  console.log('🔍 MonthlySummaryCard - Raw userStats:', userStats);

  // Calculate display stats from backend data
  const summaryStats = useMemo(() => {
    // Handle the case where userStats might be the full response object
    const stats = userStats?.data || userStats;
    
    console.log('🔍 MonthlySummaryCard - Processed stats:', stats);

    if (!stats) {
      return {
        totalMatches: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        currentStreak: 0,
        maxStreak: 0,
        monthName: new Date().toLocaleString('default', { month: 'long' })
      };
    }

    const monthName = new Date().toLocaleString('default', { month: 'long' });

    const result = {
      totalMatches: stats.gamesPlayed || 0,
      wins: stats.totalWins || 0,
      losses: stats.totalLosses || 0,
      winRate: stats.gamesPlayed > 0 ? Math.round((stats.totalWins / stats.gamesPlayed) * 100) : 0,
      currentStreak: stats.winStreak || 0,
      maxStreak: stats.maxWinStreak || 0,
      monthName
    };

    console.log('🔍 MonthlySummaryCard - Final summaryStats:', result);
    return result;
  }, [userStats]);

  // Get performance indicator
  const getPerformanceIndicator = (winRate, totalMatches) => {
    if (totalMatches === 0) return { icon: '🎯', text: 'Get Started', color: 'secondary' };
    if (winRate >= 80) return { icon: '🔥', text: 'On Fire!', color: 'danger' };
    if (winRate >= 70) return { icon: '🚀', text: 'Excellent', color: 'success' };
    if (winRate >= 60) return { icon: '👍', text: 'Good', color: 'primary' };
    if (winRate >= 50) return { icon: '📈', text: 'Improving', color: 'info' };
    return { icon: '💪', text: 'Keep Going', color: 'warning' };
  };

  const performance = getPerformanceIndicator(summaryStats.winRate, summaryStats.totalMatches);

  // Get motivational message
  const getMotivationalMessage = (stats) => {
    if (stats.totalMatches === 0) {
      return "Start playing to see your performance stats!";
    }
    if (stats.winRate >= 70) {
      return `Amazing performance! ${stats.wins} wins out of ${stats.totalMatches} matches! 🎉`;
    }
    if (stats.winRate >= 50) {
      return `Solid performance with ${stats.wins} wins! Keep it up! 💪`;
    }
    return `${stats.wins} wins so far - every match is progress! 🚀`;
  };

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
          Error loading performance summary
        </div>
      </DashboardCard>
    );
  }

  return (
    <DashboardCard title={`${summaryStats.monthName} Performance`}>
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
              <h4 className="fw-bold text-primary mb-1">{summaryStats.totalMatches}</h4>
              <small className="text-muted">Total Matches</small>
            </div>
          </Col>
          <Col xs={6}>
            <div className="border rounded p-2">
              <h4 className="fw-bold text-success mb-1">{summaryStats.winRate}%</h4>
              <small className="text-muted">Win Rate</small>
            </div>
          </Col>
        </Row>

        {/* Win/Loss/Streak Breakdown */}
        <Row className="text-center g-2 mb-3">
          <Col xs={4}>
            <div className="text-success">
              <div className="fw-bold">{summaryStats.wins}</div>
              <small className="text-muted">Wins</small>
            </div>
          </Col>
          <Col xs={4}>
            <div className="text-danger">
              <div className="fw-bold">{summaryStats.losses}</div>
              <small className="text-muted">Losses</small>
            </div>
          </Col>
          <Col xs={4}>
            <div className="text-warning">
              <div className="fw-bold">{summaryStats.currentStreak}</div>
              <small className="text-muted">Current</small>
            </div>
          </Col>
        </Row>

        {/* Best Streak Display */}
        {summaryStats.maxStreak > 0 && (
          <div className="text-center mb-3">
            <div className="border rounded p-2 bg-light">
              <div className="fw-bold text-info">{summaryStats.maxStreak}</div>
              <small className="text-muted">Best Streak</small>
            </div>
          </div>
        )}

        {/* Motivational Message */}
        <div className="text-center">
          <small className="text-muted">
            {getMotivationalMessage(summaryStats)}
          </small>
        </div>
      </div>
    </DashboardCard>
  );
};

export default MonthlySummaryCard;

