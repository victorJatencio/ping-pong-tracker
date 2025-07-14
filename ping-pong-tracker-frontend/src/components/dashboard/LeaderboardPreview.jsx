import React, { useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../contexts/AuthContext";
import { 
  useGetAllUsersQuery
} from "../../store/slices/apiSlice";
import UserAvatar from "../common/UserAvatar";
import "./LeaderboardPreview.scss";

const LeaderboardPreview = () => {
  const navigate = useNavigate();
  const { currentUser } = useContext(AuthContext);

  // Get all users
  const {
    data: allUsers = {},
    isLoading: isLoadingUsers,
    error: usersError
  } = useGetAllUsersQuery();

  // State for leaderboard data
  const [leaderboard, setLeaderboard] = useState([]);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [statsError, setStatsError] = useState(null);

  // Get current user ID
  const currentUserId = currentUser?.uid;

  // Fetch stats for all users manually (avoiding hooks in loops)
  useEffect(() => {
    const fetchAllPlayerStats = async () => {
      if (!allUsers || Object.keys(allUsers).length === 0) {
        return;
      }

      setIsLoadingStats(true);
      setStatsError(null);

      try {
        const userIds = Object.keys(allUsers);
        const playersWithStats = [];

        // Fetch stats for each user sequentially
        for (const userId of userIds) {
          try {
            const response = await fetch(`http://localhost:5000/api/stats/player/${userId}`);
            
            if (response.ok) {
              const result = await response.json();
              const user = allUsers[userId];
              
              if (result.success && user) {
                playersWithStats.push({
                  player: {
                    id: userId,
                    displayName: user.displayName || user.email?.split('@')[0] || 'Unknown Player',
                    photoURL: user.photoURL,
                    email: user.email,
                    useDefaultAvatar: user.useDefaultAvatar
                  },
                  stats: {
                    totalWins: result.data.totalWins || 0,
                    gamesPlayed: result.data.gamesPlayed || 0,
                    winStreak: result.data.winStreak || 0
                  }
                });
              }
            } else {
              console.warn(`Failed to fetch stats for user ${userId}:`, response.status);
            }
          } catch (error) {
            console.warn(`Error fetching stats for user ${userId}:`, error);
          }
        }

        // Sort by total wins (descending), then by games played (ascending as tiebreaker)
        const sortedPlayers = playersWithStats
          .sort((a, b) => {
            if (b.stats.totalWins !== a.stats.totalWins) {
              return b.stats.totalWins - a.stats.totalWins;
            }
            return a.stats.gamesPlayed - b.stats.gamesPlayed;
          })
          .slice(0, 5); // Top 5 players for preview

        // Add position numbers
        const leaderboardWithPositions = sortedPlayers.map((player, index) => ({
          ...player,
          position: index + 1
        }));

        setLeaderboard(leaderboardWithPositions);
      } catch (error) {
        console.error('Error fetching leaderboard data:', error);
        setStatsError(error);
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchAllPlayerStats();
  }, [allUsers]);

  const getPositionText = (position) => {
    switch (position) {
      case 1:
        return "1st";
      case 2:
        return "2nd";
      case 3:
        return "3rd";
      default:
        return `${position}th`;
    }
  };

  const handleViewFullLeaderboard = () => {
    navigate("/leaderboard");
  };

  // Loading state
  if (isLoadingUsers || isLoadingStats) {
    return (
      <div className="leaderboard-preview">
        <div className="leaderboard-preview__header">
          <h3 className="leaderboard-preview__title">Leaderboard Preview</h3>
        </div>
        <div className="leaderboard-preview__content">
          <div className="leaderboard-preview__loading">
            <div className="loading-spinner"></div>
            <p>Loading leaderboard...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (usersError || statsError) {
    return (
      <div className="leaderboard-preview">
        <div className="leaderboard-preview__header">
          <h3 className="leaderboard-preview__title">Leaderboard Preview</h3>
        </div>
        <div className="leaderboard-preview__content">
          <div className="leaderboard-preview__error">
            <p>Failed to load leaderboard</p>
            <button
              onClick={() => window.location.reload()}
              className="leaderboard-preview__retry-btn"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (!leaderboard || leaderboard.length === 0) {
    return (
      <div className="leaderboard-preview">
        <div className="leaderboard-preview__header">
          <h3 className="leaderboard-preview__title">Leaderboard Preview</h3>
        </div>
        <div className="leaderboard-preview__content">
          <div className="leaderboard-preview__empty">
            <p>No players found</p>
            <p className="leaderboard-preview__empty-subtitle">
              Start playing matches to see the leaderboard!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="leaderboard-preview">
      <div className="leaderboard-preview__header">
        <h3 className="leaderboard-preview__title">Leaderboard Preview</h3>
      </div>

      <div className="leaderboard-preview__content">
        <div className="leaderboard-preview__list">
          {leaderboard.map((entry) => {
            const isCurrentUser = entry.player.id === currentUserId;

            return (
              <div
                key={entry.player.id}
                className={`leaderboard-preview__item ${
                  isCurrentUser ? "leaderboard-preview__item--current-user" : ""
                }`}
              >
                <div className="leaderboard-preview__player">
                  <div className="leaderboard-preview__avatar">
                    <UserAvatar
                      user={{
                        photoURL: entry.player.photoURL,
                        displayName: entry.player.displayName,
                        email: entry.player.email,
                        useDefaultAvatar: entry.player.useDefaultAvatar
                      }}
                      size="small"
                    />
                  </div>

                  <div className="leaderboard-preview__info">
                    <span className="leaderboard-preview__position">
                      {getPositionText(entry.position)}
                    </span>
                    <span className="leaderboard-preview__name">
                      {isCurrentUser ? "You" : entry.player.displayName}
                    </span>
                  </div>
                </div>

                <div className="leaderboard-preview__wins">
                  <span
                    className={`leaderboard-preview__wins-count ${
                      isCurrentUser
                        ? "leaderboard-preview__wins-count--current-user"
                        : ""
                    }`}
                  >
                    {entry.stats.totalWins} win
                    {entry.stats.totalWins !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="leaderboard-preview__footer">
          <button
            onClick={handleViewFullLeaderboard}
            className="leaderboard-preview__view-all-btn"
          >
            Leaderboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeaderboardPreview;

