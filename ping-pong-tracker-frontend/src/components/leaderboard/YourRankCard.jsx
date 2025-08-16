// src/components/leaderboard/YourRankCard.jsx
import React, { useContext, useState, useEffect, useMemo } from 'react';
import { Badge } from 'react-bootstrap';
import { AuthContext } from '../../contexts/AuthContext';
import { useGetAllUsersQuery } from '../../store/slices/apiSlice';
import DashboardCard from '../common/Card';
import CardMessage from "../../components/common/cardMessages";
import { RiPingPongFill } from "react-icons/ri";

const YourRankCard = ({ title = "Your Rank" }) => {
  const { currentUser } = useContext(AuthContext);

  // Get all users
  const { 
    data: allUsers = {}, 
    error: usersError, 
    isLoading: usersLoading 
  } = useGetAllUsersQuery();

  // State for user rank data
  const [userStats, setUserStats] = useState(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [statsError, setStatsError] = useState(null);

  // Fetch stats for all users and calculate current user's rank
  useEffect(() => {
    const fetchUserRank = async () => {
      if (!allUsers || Object.keys(allUsers).length === 0 || !currentUser?.uid) {
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

        if (playersWithStats.length > 0) {
          // Sort players by wins (descending), then by win rate (descending)
          const sortedPlayers = playersWithStats.sort((a, b) => {
            if (b.wins !== a.wins) {
              return b.wins - a.wins;
            }
            if (b.winRate !== a.winRate) {
              return b.winRate - a.winRate;
            }
            return a.totalMatches - b.totalMatches;
          });

          // Find current user's rank
          const userIndex = sortedPlayers.findIndex(player => player.id === currentUser.uid);
          
          if (userIndex !== -1) {
            const userPlayer = sortedPlayers[userIndex];
            setUserStats({
              rank: userIndex + 1,
              winRate: Math.round(userPlayer.winRate * 100),
              totalMatches: userPlayer.totalMatches,
              wins: userPlayer.wins,
              losses: userPlayer.losses,
              winStreak: userPlayer.winStreak,
              maxWinStreak: userPlayer.maxWinStreak
            });
          } else {
            // User has no matches yet
            setUserStats(null);
          }
        } else {
          setUserStats(null);
        }
      } catch (error) {
        console.error('Error fetching user rank data:', error);
        setStatsError(error);
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchUserRank();
  }, [allUsers, currentUser]);

  const isLoading = usersLoading || isLoadingStats;
  const error = usersError || statsError;

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
          <CardMessage
                icon= {<RiPingPongFill />}
                text="Play some matches to get ranked!"
            />
        </div>
      </DashboardCard>
    );
  }

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
        {userStats.winStreak > 0 && (
          <p className="text-muted mb-0 small">
            🔥 Current streak: {userStats.winStreak}
          </p>
        )}
      </div>
    </DashboardCard>
  );
};

export default YourRankCard;

