import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  useGetRecentMatchesQuery,
  useGetAllUsersQuery,
} from "../../store/slices/apiSlice";
import DashboardCard from "../common/Card";
import UserAvatar from "../common/UserAvatar";
import { Badge } from "react-bootstrap";
import { useAuth } from "../../hooks/useAuth";

/**
 * Recent Matches Card Component (Priority 1)
 * Shows the 3 most recent completed matches from ALL users
 * Displays opponent avatars, win/loss status, scores, and timestamps
 * Matches the existing design from the current Dashboard
 */
const RecentMatchesCard = () => {
  const { currentUser } = useAuth();
  // Fetch recent matches and users data using RTK Query
  const {
    data: allMatches = [],
    isLoading: matchesLoading,
    error: matchesError,
  } = useGetRecentMatchesQuery();

  const {
    data: usersMap = {},
    isLoading: usersLoading,
    error: usersError,
  } = useGetAllUsersQuery();

  // Helper function to format time ago (matches existing Dashboard logic)
  const formatTimeAgo = (date) => {
    if (!date) return "Recently";

    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.ceil(diffTime / (1000 * 60));

    if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays <= 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // Process and format the recent matches data
  const recentMatches = useMemo(() => {
    if (
      !allMatches.length ||
      !Object.keys(usersMap).length ||
      !currentUser?.uid
    ) {
      return [];
    }

    // Filter matches to only include those where current user participated
    const userMatches = allMatches.filter(
      (match) =>
        match.player1Id === currentUser.uid ||
        match.player2Id === currentUser.uid
    );

    return userMatches.slice(0, 3).map((match) => {
      const player1 = usersMap[match.player1Id] || {
        name: "Unknown Player",
        email: "unknown@example.com",
        displayName: "Unknown Player",
      };
      const player2 = usersMap[match.player2Id] || {
        name: "Unknown Player",
        email: "unknown@example.com",
        displayName: "Unknown Player",
      };

      // Determine opponent (the other player)
      const isCurrentUserPlayer1 = match.player1Id === currentUser.uid;
      const opponent = isCurrentUserPlayer1 ? player2 : player1;

      // Determine if current user won or lost
      const currentUserWon = match.winnerId === currentUser.uid;
      const result = currentUserWon ? "Won" : "Lost";

      // Format the time ago
      const timeAgo = formatTimeAgo(match.completedDate);

      // Format score
      const score = `${match.player1Score || 0}-${match.player2Score || 0}`;

      return {
        id: match.id,
        opponent:
          opponent.displayName ||
          opponent.name ||
          opponent.email?.split("@")[0] ||
          "Unknown",
        result: result,
        score: score,
        date: timeAgo,
        completedDate: match.completedDate,
        opponentAvatar: opponent.profileImageUrl || null,
        // Store match details for potential future use
        match: match,
        currentUserWon: currentUserWon,
      };
    });
  }, [allMatches, usersMap, currentUser?.uid]);

  // Determine loading and error states
  const isLoading = matchesLoading || usersLoading;
  const error = matchesError || usersError;

  // Footer action button (matches existing Dashboard design)
  const footerAction = (
    <Link to="/history" className="text-decoration-none">
      View All Matches <i className="bi bi-arrow-right"></i>
    </Link>
  );

  return (
    <DashboardCard
      title="Recent Matches"
      isLoading={isLoading}
      error={error}
      footerAction={footerAction}
      className="recent-matches-card"
    >
      {recentMatches.length === 0 ? (
        // Empty state (matches existing Dashboard design)
        <div className="text-center py-4">
          <i className="bi bi-controller fs-1 text-muted d-block mb-2"></i>
          <p className="text-muted mb-0">No recent matches</p>
        </div>
      ) : (
        // Matches list (matches existing Dashboard structure)
        <div className="list-group list-group-flush">
          {recentMatches.map((match) => (
            <div key={match.id} className="list-group-item border-0 px-0 py-2">
              <div className="d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center">
                  <UserAvatar
                    user={{
                      displayName: match.opponent,
                      profileImageUrl: match.opponentAvatar,
                    }}
                    size={32}
                    className="me-2"
                  />
                  <div>
                    <h6 className="mb-0">vs. {match.opponent}</h6>
                    <small className="text-muted">{match.date}</small>
                  </div>
                </div>
                <div className="text-end">
                  <Badge
                    bg={match.result === "Won" ? "success" : "danger"}
                    className="mb-1"
                  >
                    {match.result}
                  </Badge>
                  <div>
                    <small className="fw-bold">{match.score}</small>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardCard>
  );
};

export default React.memo(RecentMatchesCard);
