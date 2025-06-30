import React, { useMemo } from "react";
import DashboardCard from "../common/Card";
import "./AchievementsCard.scss";

/**
 * Achievements Card Component
 * Displays user achievements including total wins, current streak, and total games played
 * Now uses props data instead of Redux query for better reliability
 */
const AchievementsCard = ({ playerStats, isLoading = false }) => {
  // Debug logging to see what we're getting from props
  console.log("🔍 AchievementsCard Debug (Props Version):");
  console.log("  - playerStats prop:", playerStats);
  console.log("  - isLoading prop:", isLoading);

  // Process achievements data from props
  const achievements = useMemo(() => {
    if (!playerStats) {
      console.log("  - No playerStats prop, using defaults");
      return {
        totalWins: 0,
        currentStreak: 0,
        totalGames: 0,
        winRate: 0,
      };
    }

    // Extract data using the correct field names from your Firebase structure
    const totalWins = playerStats.totalWins || 0;
    const totalLosses = playerStats.totalLosses || 0;
    const totalGames = playerStats.totalMatches || (totalWins + totalLosses);
    const currentStreak = playerStats.currentStreak || 0;
    const winRate = playerStats.winRate || 0;
    
    console.log("  - Extracted data:");
    console.log("    - totalWins:", totalWins);
    console.log("    - totalLosses:", totalLosses);
    console.log("    - totalGames:", totalGames);
    console.log("    - currentStreak:", currentStreak);
    console.log("    - winRate:", winRate);

    return {
      totalWins,
      currentStreak,
      totalGames,
      winRate,
      streakType: playerStats.streakType || 'wins',
    };
  }, [playerStats]);

  return (
    <DashboardCard
      title="Achievements"
      isLoading={isLoading}
      className="achievements-card"
    >
      <div className="achievements-grid">
        {/* Total Wins */}
        <div className="achievement-item">
          <div className="achievement-icon trophy">
            <i className="bi bi-trophy-fill"></i>
          </div>
          <div className="achievement-content">
            <div className="achievement-number">{achievements.totalWins}</div>
            <div className="achievement-label">Total Wins</div>
          </div>
        </div>

        {/* Current Streak */}
        <div className="achievement-item">
          <div className="achievement-icon streak">
            <i className="bi bi-fire"></i>
          </div>
          <div className="achievement-content">
            <div className="achievement-number">{achievements.currentStreak}</div>
            <div className="achievement-label">Win Streak</div>
          </div>
        </div>

        {/* Total Games */}
        <div className="achievement-item">
          <div className="achievement-icon games">
            <i className="bi bi-controller"></i>
          </div>
          <div className="achievement-content">
            <div className="achievement-number">{achievements.totalGames}</div>
            <div className="achievement-label">Games Played</div>
          </div>
        </div>
      </div>

      {/* Win Rate Display */}
      {achievements.totalGames > 0 && (
        <div className="win-rate-section mt-3 mb-3">
          <div className="d-flex justify-content-between align-items-center">
            <span className="text-muted">Win Rate</span>
            <span className="fw-bold text-primary">{achievements.winRate}%</span>
          </div>
          <div className="progress mt-1" style={{ height: '6px' }}>
            <div 
              className="progress-bar bg-primary" 
              role="progressbar" 
              style={{ width: `${achievements.winRate}%` }}
              aria-valuenow={achievements.winRate} 
              aria-valuemin="0" 
              aria-valuemax="100"
            ></div>
          </div>
        </div>
      )}

      {/* Achievement Badges/Milestones */}
      {achievements.totalWins > 0 && (
        <div className="achievement-badges mt-3">
          <div className="badge-section">
            <h6 className="badge-title">Recent Milestones</h6>
            <div className="badges-container">
              {achievements.totalWins >= 1 && (
                <span className="badge bg-success me-2 mb-2">
                  <i className="bi bi-star-fill me-1"></i>
                  First Win
                </span>
              )}
              {achievements.totalWins >= 5 && (
                <span className="badge bg-primary me-2 mb-2">
                  <i className="bi bi-award-fill me-1"></i>
                  5 Wins
                </span>
              )}
              {achievements.totalWins >= 10 && (
                <span className="badge bg-warning me-2 mb-2">
                  <i className="bi bi-gem me-1"></i>
                  10 Wins
                </span>
              )}
              {achievements.currentStreak >= 3 && (
                <span className="badge bg-danger me-2 mb-2">
                  <i className="bi bi-lightning-fill me-1"></i>
                  Hot Streak
                </span>
              )}
              {achievements.totalGames >= 10 && (
                <span className="badge bg-info me-2 mb-2">
                  <i className="bi bi-person-check-fill me-1"></i>
                  Veteran Player
                </span>
              )}
              {achievements.winRate >= 70 && (
                <span className="badge bg-warning me-2 mb-2">
                  <i className="bi bi-crown-fill me-1"></i>
                  Champion
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {achievements.totalGames === 0 && (
        <div className="text-center py-3">
          <i className="bi bi-trophy fs-1 text-muted d-block mb-2"></i>
          <p className="text-muted mb-0">Play your first match to start earning achievements!</p>
        </div>
      )}
    </DashboardCard>
  );
};

export default React.memo(AchievementsCard);
