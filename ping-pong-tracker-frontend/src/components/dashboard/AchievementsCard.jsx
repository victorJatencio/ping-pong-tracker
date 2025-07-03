import React, { useContext } from "react";
import { AuthContext } from "../../contexts/AuthContext";
import DashboardCard from "../common/Card";
import "./AchievementsCard.scss";
import { useGetPlayerStatsFromBackendQuery } from "../../store/slices/apiSlice";

/**
 * Achievements Card Component
 * Displays user achievements: Total Wins, Win Streak, and Games Played
 * Uses backend API for accurate, synced data
 */
const AchievementsCard = () => {
  // Get current user from AuthContext
  const { currentUser } = useContext(AuthContext);
  const userId = currentUser?.uid;

  // Fetch player stats from backend API (synced data)
  const {
    data: playerStats,
    isLoading,
    error,
    refetch
  } = useGetPlayerStatsFromBackendQuery(userId, {
    skip: !userId,
    refetchOnMountOrArgChange: true,
  });

  // Handle loading state
  if (isLoading) {
    return (
      <DashboardCard
        title="Achievements"
        className="achievements-card"
      >
        <div className="achievements-loading">
          <div className="loading-spinner"></div>
          <p>Loading your achievements...</p>
        </div>
      </DashboardCard>
    );
  }

  // Handle error state
  if (error) {
    return (
      <DashboardCard
        title="Achievements"
        className="achievements-card"
      >
        <div className="achievements-error">
          <div className="error-icon">⚠️</div>
          <p>Failed to load achievements</p>
          <button 
            className="retry-button"
            onClick={() => refetch()}
          >
            Try Again
          </button>
        </div>
      </DashboardCard>
    );
  }

  // Handle no user case
  if (!userId) {
    return (
      <DashboardCard
        title="Achievements"
        className="achievements-card"
      >
        <div className="achievements-no-user">
          <p>Please log in to view your achievements</p>
        </div>
      </DashboardCard>
    );
  }

  // Extract only the essential data
  const totalWins = playerStats?.totalWins || 0;
  const currentStreak = playerStats?.winStreak || 0;
  const totalGames = playerStats?.gamesPlayed || 0;

  return (
    <DashboardCard
      title="Achievements"
      className="achievements-card"
    >
      <div className="achievements-grid">
        {/* Total Wins */}
        <div className="achievement-item">
          <div className="achievement-icon trophy">
            <i className="bi bi-trophy-fill"></i>
          </div>
          <div className="achievement-content">
            <div className="achievement-number">{totalWins}</div>
            <div className="achievement-label">Total Wins</div>
          </div>
        </div>

        {/* Current Streak */}
        <div className="achievement-item">
          <div className="achievement-icon streak">
            <i className="bi bi-fire"></i>
          </div>
          <div className="achievement-content">
            <div className="achievement-number">{currentStreak}</div>
            <div className="achievement-label">Win Streak</div>
          </div>
        </div>

        {/* Total Games */}
        <div className="achievement-item">
          <div className="achievement-icon games">
            <i className="bi bi-controller"></i>
          </div>
          <div className="achievement-content">
            <div className="achievement-number">{totalGames}</div>
            <div className="achievement-label">Games Played</div>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
};

export default AchievementsCard;

