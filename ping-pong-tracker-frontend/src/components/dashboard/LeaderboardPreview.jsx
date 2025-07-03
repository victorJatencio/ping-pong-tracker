import React, { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../contexts/AuthContext";
import { useGetLeaderboardPreviewQuery } from "../../store/slices/apiSlice";
import UserAvatar from "../common/UserAvatar";
import "./LeaderboardPreview.scss";

const LeaderboardPreview = () => {
  const navigate = useNavigate();
  const { currentUser } = useContext(AuthContext);

  const {
    data: leaderboard = [],
    isLoading,
    error,
    refetch,
  } = useGetLeaderboardPreviewQuery();

  const currentUserId = currentUser?.uid;

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

  if (isLoading) {
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

  if (error) {
    return (
      <div className="leaderboard-preview">
        <div className="leaderboard-preview__header">
          <h3 className="leaderboard-preview__title">Leaderboard Preview</h3>
        </div>
        <div className="leaderboard-preview__content">
          <div className="leaderboard-preview__error">
            <p>Failed to load leaderboard</p>
            <button
              onClick={refetch}
              className="leaderboard-preview__retry-btn"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

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
            const isCurrentUser = entry.player.id === currentUser?.uid; // ✅ Fixed

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
                        profileImage: entry.player.profileImage,
                        displayName: entry.player.displayName,
                        email: entry.player.email,
                      }}
                      size="small"
                    />
                  </div>

                  <div className="leaderboard-preview__info">
                    <span className="leaderboard-preview__position">
                      {getPositionText(entry.position)} {/* ✅ Fixed */}
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
                    {entry.stats.totalWins !== 1 ? "s" : ""} {/* ✅ Fixed */}
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
