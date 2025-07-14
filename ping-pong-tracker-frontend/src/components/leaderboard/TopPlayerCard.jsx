// src/components/leaderboard/TopPlayerCard.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Badge } from 'react-bootstrap';
import { 
  useGetAllUsersQuery 
} from '../../store/slices/apiSlice';
import DashboardCard from '../common/Card';
import UserAvatar from '../common/UserAvatar';

const TopPlayerCard = ({ title = "Top Player" }) => {
  // Get all users
  const { 
    data: allUsers = {}, 
    error: usersError, 
    isLoading: usersLoading 
  } = useGetAllUsersQuery();

  // State for top player data
  const [topPlayer, setTopPlayer] = useState(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [statsError, setStatsError] = useState(null);

  // Fetch stats for all users and find top player
  useEffect(() => {
    const fetchTopPlayer = async () => {
      if (!allUsers || Object.keys(allUsers).length === 0) {
        return;
      }

      setIsLoadingStats(true);
      setStatsError(null);

      try {
        const userIds = Object.keys(allUsers);
        const playersWithStats = [];

        // Fetch stats for each user
        for (const userId of userIds) {
          try {
            const response = await fetch(`http://localhost:5000/api/stats/player/${userId}`);
            
            if (response.ok) {
              const result = await response.json();
              const user = allUsers[userId];
              
              if (result.success && user && result.data.gamesPlayed > 0) {
                const stats = result.data;
                playersWithStats.push({
                  id: userId,
                  name: user.displayName || user.email?.split('@')[0] || 'Unknown Player',
                  avatar: user.photoURL,
                  useDefaultAvatar: user.useDefaultAvatar,
                  wins: stats.totalWins || 0,
                  totalMatches: stats.gamesPlayed || 0,
                  losses: stats.totalLosses || 0,
                  winRate: stats.gamesPlayed > 0 ? (stats.totalWins / stats.gamesPlayed) : 0,
                  winStreak: stats.winStreak || 0,
                  maxWinStreak: stats.maxWinStreak || 0
                });
              }
            } else {
              console.warn(`Failed to fetch stats for user ${userId}:`, response.status);
            }
          } catch (error) {
            console.warn(`Error fetching stats for user ${userId}:`, error);
          }
        }

        // Find top player (most wins, then highest win rate as tiebreaker)
        if (playersWithStats.length > 0) {
          const sortedPlayers = playersWithStats.sort((a, b) => {
            // Primary sort: total wins (descending)
            if (b.wins !== a.wins) {
              return b.wins - a.wins;
            }
            // Secondary sort: win rate (descending)
            if (b.winRate !== a.winRate) {
              return b.winRate - a.winRate;
            }
            // Tertiary sort: fewer total matches (more efficient)
            return a.totalMatches - b.totalMatches;
          });

          const topPlayerData = sortedPlayers[0];
          
          // Calculate score (simple formula: wins * 10 + win rate * 100)
          const score = (topPlayerData.wins * 10) + (topPlayerData.winRate * 100);

          setTopPlayer({
            ...topPlayerData,
            winRatePercent: Math.round(topPlayerData.winRate * 100),
            score: Math.round(score),
            rank: 1
          });
        } else {
          setTopPlayer(null);
        }
      } catch (error) {
        console.error('Error fetching top player data:', error);
        setStatsError(error);
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchTopPlayer();
  }, [allUsers]);

  const isLoading = usersLoading || isLoadingStats;
  const error = usersError || statsError;

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
              displayName: topPlayer.name,
              useDefaultAvatar: topPlayer.useDefaultAvatar
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
            {topPlayer.winRatePercent}% Win Rate
          </Badge>
        </div>

        {/* Additional Info */}
        <p className="text-muted mb-0 small">
          {topPlayer.totalMatches} total matches • Score: {topPlayer.score}
        </p>
        
        {/* Win Streak Info */}
        {topPlayer.winStreak > 0 && (
          <p className="text-muted mb-0 small">
            🔥 Current streak: {topPlayer.winStreak} wins
          </p>
        )}
      </div>
    </DashboardCard>
  );
};

export default TopPlayerCard;

