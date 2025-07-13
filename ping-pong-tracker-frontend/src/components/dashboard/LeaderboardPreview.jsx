import React, { useContext, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../contexts/AuthContext";
import { 
  useGetLeaderboardPreviewQuery,
  useGetAllUsersQuery,  // ✅ ADD: Get complete user data
  useGetUserProfileQuery
} from "../../store/slices/apiSlice";
import UserAvatar from "../common/UserAvatar";
import "./LeaderboardPreview.scss";

const LeaderboardPreview = () => {
  const navigate = useNavigate();
  const { currentUser } = useContext(AuthContext);

  // Get current user profile data via RTK Query
  const { 
    data: currentUserProfile,
    isLoading: isLoadingCurrentUser 
  } = useGetUserProfileQuery(currentUser?.uid, {
    skip: !currentUser?.uid
  });

  // Get leaderboard data (basic info)
  const {
    data: leaderboard = [],
    isLoading: isLoadingLeaderboard,
    error,
    refetch,
  } = useGetLeaderboardPreviewQuery();

  // ✅ SOLUTION: Get complete user data for avatars
  const {
    data: allUsers = {},
    isLoading: isLoadingUsers,
  } = useGetAllUsersQuery();

  // Use profile data for current user ID comparison
  const displayUser = currentUserProfile || currentUser;
  const currentUserId = displayUser?.uid || currentUser?.uid;

  // ✅ SOLUTION: Merge leaderboard data with complete user data
  const enrichedLeaderboard = useMemo(() => {
    if (!leaderboard.length || !Object.keys(allUsers).length) {
      return leaderboard;
    }

    return leaderboard.map(entry => {
      const completeUserData = allUsers[entry.player.id];
      
      console.log("🔍 SOLUTION DEBUG - Merging data:");
      console.log("  - Leaderboard player:", entry.player);
      console.log("  - Complete user data:", completeUserData);
      console.log("  - photoURL:", completeUserData?.photoURL);

      return {
        ...entry,
        player: {
          ...entry.player,
          // ✅ MERGE: Add complete user data including avatar
          ...completeUserData,
          // Keep leaderboard-specific fields
          displayName: entry.player.displayName || completeUserData?.displayName,
        }
      };
    });
  }, [leaderboard, allUsers]);

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

  // Include all loading states
  if (isLoadingLeaderboard || isLoadingUsers || isLoadingCurrentUser) {
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

  if (!enrichedLeaderboard || enrichedLeaderboard.length === 0) {
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
          {enrichedLeaderboard.map((entry) => {
            const isCurrentUser = entry.player.id === currentUserId;

            console.log("🔍 SOLUTION DEBUG - Rendering entry:");
            console.log("  - Player with complete data:", entry.player);
            console.log("  - photoURL:", entry.player.photoURL);

            return (
              <div
                key={entry.player.id}
                className={`leaderboard-preview__item ${
                  isCurrentUser ? "leaderboard-preview__item--current-user" : ""
                }`}
              >
                <div className="leaderboard-preview__player">
                  <div className="leaderboard-preview__avatar">
                    {/* ✅ SOLUTION: Use the same pattern that works in RecentActivityCard */}
                    <UserAvatar
                      user={{ photoURL: entry.player.photoURL }}
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

