// src/components/leaderboard/HallOfFameCard.jsx
import React, { useMemo } from 'react';
import { Badge, Row, Col } from 'react-bootstrap';
import { 
  useGetLeaderboardDataQuery, 
  useGetAllUsersQuery 
} from '../../store/slices/apiSlice';
import DashboardCard from '../common/Card';
import UserAvatar from '../common/UserAvatar';

const HallOfFameCard = ({ title = "Hall of Fame" }) => {
  // Fetch leaderboard data (get all players for analysis)
  const { 
    data: leaderboardResponse, 
    error: leaderboardError, 
    isLoading: leaderboardLoading 
  } = useGetLeaderboardDataQuery({
    filters: {
      search: '',
      winRateMin: 0,
      winRateMax: 100,
      matchesMin: 1, // Only players who have played matches
      streakMin: 0,
      timePeriod: 'all-time',
      sortBy: 'rank',
      sortOrder: 'asc'
    },
    pagination: { page: 1, pageSize: 100 } // Get enough data to analyze
  });

  // Fetch user data for names and avatars
  const { 
    data: allUsers, 
    error: usersError, 
    isLoading: usersLoading 
  } = useGetAllUsersQuery();

  // Calculate Hall of Fame winners
  const hallOfFameWinners = useMemo(() => {
    if (!leaderboardResponse?.leaderboard?.length || !allUsers) {
      return null;
    }

    const players = leaderboardResponse.leaderboard;

    // Find Most Wins (highest total wins)
    const mostWinsPlayer = players.reduce((max, player) => 
      player.wins > max.wins ? player : max
    );

    // Find Longest Streak (highest longestStreak)
    const longestStreakPlayer = players.reduce((max, player) => 
      player.longestStreak > max.longestStreak ? player : max
    );

    // Find Most Active (highest total matches)
    const mostActivePlayer = players.reduce((max, player) => 
      player.totalMatches > max.totalMatches ? player : max
    );

    // Helper function to get user info
    const getUserInfo = (playerData) => {
      const user = allUsers[playerData.playerId];
      return {
        id: playerData.playerId,
        name: user?.displayName || user?.name || 'Unknown Player',
        avatar: user?.photoURL || null,
        ...playerData
      };
    };

    return {
      mostWins: getUserInfo(mostWinsPlayer),
      longestStreak: getUserInfo(longestStreakPlayer),
      mostActive: getUserInfo(mostActivePlayer)
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
            displayName: player.name 
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
                  displayName: hallOfFameWinners.mostActive.name 
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
