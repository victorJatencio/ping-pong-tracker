// src/components/leaderboard/TopPlayerCard.jsx
import React, { useMemo } from 'react';
import { Badge } from 'react-bootstrap';
import { 
  useGetLeaderboardDataQuery, 
  useGetAllUsersQuery 
} from '../../store/slices/apiSlice';
import DashboardCard from '../common/Card';
import UserAvatar from '../common/UserAvatar';

const TopPlayerCard = ({ title = "Top Player" }) => {
  // Fetch leaderboard data (get top player)
  const { 
    data: leaderboardResponse, 
    error: leaderboardError, 
    isLoading: leaderboardLoading 
  } = useGetLeaderboardDataQuery({
    filters: {
      search: '',
      winRateMin: 0,
      winRateMax: 100,
      matchesMin: 1, // Only players who have played at least 1 match
      streakMin: 0,
      timePeriod: 'all-time',
      sortBy: 'rank',
      sortOrder: 'asc'
    },
    pagination: { page: 1, pageSize: 1 } // Only need the top player
  });

  // Fetch user data for names and avatars
  const { 
    data: allUsers, 
    error: usersError, 
    isLoading: usersLoading 
  } = useGetAllUsersQuery();

  // Get top player info
  const topPlayer = useMemo(() => {
    if (!leaderboardResponse?.leaderboard?.length || !allUsers) {
      return null;
    }

    const topPlayerData = leaderboardResponse.leaderboard[0];
    const user = allUsers[topPlayerData.playerId];

    if (!user) return null;

    return {
      id: topPlayerData.playerId,
      name: user.displayName || user.name || 'Unknown Player',
      avatar: user.photoURL || null,
      wins: topPlayerData.wins,
      totalMatches: topPlayerData.totalMatches,
      winRate: Math.round(topPlayerData.winRate * 100),
      score: Math.round(topPlayerData.score),
      rank: topPlayerData.rank
    };
  }, [leaderboardResponse, allUsers]);

  const isLoading = leaderboardLoading || usersLoading;
  const error = leaderboardError || usersError;

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
          Error loading top player
        </div>
      </DashboardCard>
    );
  }

  if (!topPlayer) {
    return (
      <DashboardCard title={title}>
        <div className="text-center py-4">
          <h5 className="text-muted mb-2">No Players Yet</h5>
          <p className="text-muted mb-0 small">Play some matches to see rankings!</p>
        </div>
      </DashboardCard>
    );
  }

  return (
    <DashboardCard title={title}>
      <div className="text-center py-3">
        {/* Crown icon for #1 */}
        <div className="mb-3">
          <span className="fs-1">👑</span>
        </div>
        
        {/* Player Avatar */}
        <div className="mb-3">
          <UserAvatar
            user={{ 
              photoURL: topPlayer.avatar, 
              displayName: topPlayer.name 
            }}
            size="lg"
            className="border border-warning border-3"
          />
        </div>

        {/* Player Name */}
        <h4 className="fw-bold text-warning mb-2">
          {topPlayer.name}
        </h4>

        {/* Stats */}
        <div className="mb-2">
          <Badge bg="success" className="me-2 fs-6 px-3 py-2">
            {topPlayer.wins} Wins
          </Badge>
          <Badge bg="info" className="fs-6 px-3 py-2">
            {topPlayer.winRate}% Win Rate
          </Badge>
        </div>

        {/* Additional Info */}
        <p className="text-muted mb-0 small">
          {topPlayer.totalMatches} total matches • Score: {topPlayer.score}
        </p>
      </div>
    </DashboardCard>
  );
};

export default TopPlayerCard;
