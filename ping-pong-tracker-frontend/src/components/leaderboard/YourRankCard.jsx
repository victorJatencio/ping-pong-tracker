// src/components/leaderboard/YourRankCard.jsx
import React, { useContext, useMemo } from 'react';
import { Badge } from 'react-bootstrap';
import { AuthContext } from '../../contexts/AuthContext';
import { useGetLeaderboardDataQuery } from '../../store/slices/apiSlice';
import DashboardCard from '../common/Card';

const YourRankCard = ({ title = "Your Rank" }) => {
  const { currentUser } = useContext(AuthContext);

  // Fetch leaderboard data (without filters to get true rank)
  const { 
    data: leaderboardResponse, 
    error, 
    isLoading 
  } = useGetLeaderboardDataQuery({
    filters: {
      search: '',
      winRateMin: 0,
      winRateMax: 100,
      matchesMin: 0,
      streakMin: 0,
      timePeriod: 'all-time',
      sortBy: 'rank',
      sortOrder: 'asc'
    },
    pagination: { page: 1, pageSize: 100 } // Get enough data to find user's rank
  });

  // Find current user's rank and stats
  const userStats = useMemo(() => {
    if (!leaderboardResponse?.leaderboard || !currentUser?.uid) {
      return null;
    }

    const userEntry = leaderboardResponse.leaderboard.find(
      player => player.playerId === currentUser.uid
    );

    if (!userEntry) {
      return null;
    }

    return {
      rank: userEntry.rank,
      winRate: Math.round(userEntry.winRate * 100),
      totalMatches: userEntry.totalMatches,
      wins: userEntry.wins,
      losses: userEntry.losses
    };
  }, [leaderboardResponse, currentUser]);

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
          Error loading your rank
        </div>
      </DashboardCard>
    );
  }

  if (!userStats) {
    return (
      <DashboardCard title={title}>
        <div className="text-center py-4">
          <h3 className="text-muted mb-2">Unranked</h3>
          <p className="text-muted mb-0">Play some matches to get ranked!</p>
        </div>
      </DashboardCard>
    );
  }

  // Determine rank color based on position
  const getRankColor = (rank) => {
    if (rank === 1) return 'text-warning'; // Gold for 1st
    if (rank <= 3) return 'text-info';     // Blue for top 3
    if (rank <= 10) return 'text-success'; // Green for top 10
    return 'text-primary';                 // Default blue
  };

  // Determine win rate badge color
  const getWinRateBadge = (winRate) => {
    if (winRate >= 70) return 'success';
    if (winRate >= 50) return 'warning';
    return 'danger';
  };

  return (
    <DashboardCard title={title}>
      <div className="text-center py-3">
        <h1 className={`display-3 fw-bold mb-2 ${getRankColor(userStats.rank)}`}>
          #{userStats.rank}
        </h1>
        <div className="mb-2">
          <Badge 
            bg={getWinRateBadge(userStats.winRate)} 
            className="fs-6 px-3 py-2"
          >
            {userStats.winRate}% Win Rate
          </Badge>
        </div>
        <p className="text-muted mb-0 small">
          {userStats.wins}W - {userStats.losses}L ({userStats.totalMatches} total)
        </p>
      </div>
    </DashboardCard>
  );
};

export default YourRankCard;
