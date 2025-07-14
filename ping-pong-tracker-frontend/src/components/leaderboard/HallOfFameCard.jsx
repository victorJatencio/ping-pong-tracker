// src/components/leaderboard/HallOfFameCard.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Badge, Row, Col } from 'react-bootstrap';
import { 
  useGetAllUsersQuery 
} from '../../store/slices/apiSlice';
import DashboardCard from '../common/Card';
import UserAvatar from '../common/UserAvatar';

const HallOfFameCard = ({ title = "Hall of Fame" }) => {
  // Get all users
  const { 
    data: allUsers = {}, 
    error: usersError, 
    isLoading: usersLoading 
  } = useGetAllUsersQuery();

  // State for hall of fame data
  const [hallOfFameWinners, setHallOfFameWinners] = useState(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [statsError, setStatsError] = useState(null);

  // Fetch stats for all users and calculate Hall of Fame winners
  useEffect(() => {
    const fetchHallOfFameData = async () => {
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
                  currentStreak: stats.winStreak || 0,
                  longestStreak: stats.maxWinStreak || 0
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
          // Find Most Wins (highest total wins)
          const mostWinsPlayer = playersWithStats.reduce((max, player) => 
            player.wins > max.wins ? player : max
          );

          // Find Longest Streak (highest maxWinStreak)
          const longestStreakPlayer = playersWithStats.reduce((max, player) => 
            player.longestStreak > max.longestStreak ? player : max
          );

          // Find Most Active (highest total matches)
          const mostActivePlayer = playersWithStats.reduce((max, player) => 
            player.totalMatches > max.totalMatches ? player : max
          );

          setHallOfFameWinners({
            mostWins: mostWinsPlayer,
            longestStreak: longestStreakPlayer,
            mostActive: mostActivePlayer
          });
        } else {
          setHallOfFameWinners(null);
        }
      } catch (error) {
        console.error('Error fetching Hall of Fame data:', error);
        setStatsError(error);
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchHallOfFameData();
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
          Error loading Hall of Fame
        </div>
      </DashboardCard>
    );
  }

  if (!hallOfFameWinners) {
    return (
      <DashboardCard title={title}>
        <div className="text-center py-4">
          <h5 className="text-muted mb-2">No Champions Yet</h5>
          <p className="text-muted mb-0 small">Play matches to earn your place in the Hall of Fame!</p>
        </div>
      </DashboardCard>
    );
  }

  // Component for individual achievement
  const AchievementItem = ({ icon, title, player, stat, statLabel, badgeColor }) => (
    <div className="text-center py-3 border-end border-light">
      <div className="mb-2">
        <span className="fs-3">{icon}</span>
      </div>
      <div className="mb-2">
        <UserAvatar
          user={{ 
            photoURL: player.avatar,
            displayName: player.name,
            useDefaultAvatar: player.useDefaultAvatar
          }}
          size="sm"
          className="border border-2"
          style={{ borderColor: `var(--bs-${badgeColor})` }}
        />
      </div>
      <h6 className="fw-bold mb-1 text-truncate" title={player.name}>
        {player.name}
      </h6>
      <Badge bg={badgeColor} className="mb-1">
        {stat} {statLabel}
      </Badge>
      <p className="text-muted mb-0 small">{title}</p>
    </div>
  );

  return (
    <DashboardCard title={title}>
      <Row className="g-0">
        <Col xs={4}>
          <AchievementItem
            icon="🏆"
            title="Most Wins"
            player={hallOfFameWinners.mostWins}
            stat={hallOfFameWinners.mostWins.wins}
            statLabel="Wins"
            badgeColor="warning"
          />
        </Col>
        <Col xs={4}>
          <AchievementItem
            icon="🔥"
            title="Longest Streak"
            player={hallOfFameWinners.longestStreak}
            stat={hallOfFameWinners.longestStreak.longestStreak}
            statLabel="Streak"
            badgeColor="danger"
          />
        </Col>
        <Col xs={4}>
          <div className="text-center py-3">
            <div className="mb-2">
              <span className="fs-3">⚡</span>
            </div>
            <div className="mb-2">
              <UserAvatar
                user={{ 
                  photoURL: hallOfFameWinners.mostActive.avatar,
                  displayName: hallOfFameWinners.mostActive.name,
                  useDefaultAvatar: hallOfFameWinners.mostActive.useDefaultAvatar
                }}
                size="sm"
                className="border border-2 border-success"
              />
            </div>
            <h6 className="fw-bold mb-1 text-truncate" title={hallOfFameWinners.mostActive.name}>
              {hallOfFameWinners.mostActive.name}
            </h6>
            <Badge bg="success" className="mb-1">
              {hallOfFameWinners.mostActive.totalMatches} Matches
            </Badge>
            <p className="text-muted mb-0 small">Most Active</p>
          </div>
        </Col>
      </Row>
    </DashboardCard>
  );
};

export default HallOfFameCard;

