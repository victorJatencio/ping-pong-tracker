import React, { useContext } from "react";
import { AuthContext } from "../../contexts/AuthContext";
import { Link } from "react-router-dom";
import DashboardCard from "../common/Card";
import { useGetPlayerStatsFromBackendQuery } from "../../store/slices/apiSlice";


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

  // Footer action button
  const footerAction = (
    <Link to="/history" className="text-decoration-none">
      View All <i className="bi bi-arrow-right"></i>
    </Link>
  );


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
      footerAction={footerAction}
    >
      <div className="card-body achievements-grid">
        {/* Total Wins */}
        <div className="achievement-item">
          <div className="achievement-icon trophy">
            {/* <i className="bi bi-trophy-fill"></i> */}
            <img className="bi bi-trophy-fill" src="images/trophy.jpg" alt="wins" />
          </div>
          <div className="achievement-content">
            <div className="achievement-number">{totalWins}</div>
            <div className="achievement-label">Wins</div>
          </div>
        </div>

        {/* Current Streak */}
        <div className="achievement-item">
          <div className="achievement-icon streak">
            {/* <i className="bi bi-fire"></i> */}
            <img className="bi bi-trophy-fill" src="images/ball.jpg" alt="streak" />
          </div>
          <div className="achievement-content">
            <div className="achievement-number">{currentStreak}</div>
            <div className="achievement-label">Streak</div>
          </div>
        </div>

        {/* Total Games */}
        <div className="achievement-item">
          <div className="achievement-icon games">
            {/* <i className="bi bi-controller"></i> */}
            <img className="bi bi-trophy-fill" src="images/racket.jpg" alt="games" />
          </div>
          <div className="achievement-content">
            <div className="achievement-number">{totalGames}</div>
            <div className="achievement-label">Games</div>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
};

export default AchievementsCard;

