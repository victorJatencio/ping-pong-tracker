import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  useGetRecentMatchesQuery,
  useGetAllUsersQuery,
} from "../../store/slices/apiSlice";
import DashboardCard from "../common/Card";
import CardMessage from "../../components/common/cardMessages";
import { RiPingPongFill } from "react-icons/ri";
import UserAvatar from "../common/UserAvatar";
import { Badge } from "react-bootstrap";
import { useAuth } from "../../hooks/useAuth";

/**
 * Recent Matches Card Component
 * Shows the most recent completed matches for the current user
 * Displays opponent avatars, win/loss status, scores, and timestamps
 */
const RecentMatchesCard = () => {
  const { currentUser } = useAuth();

  // Add extra protection: only call the query if currentUser and uid exist
  const shouldFetchMatches = currentUser && currentUser.uid && typeof currentUser.uid === 'string';

  // Fetch recent matches for the current user using RTK Query
  const {
    data: allMatches = [],
    isLoading: matchesLoading,
    error: matchesError,
  } = useGetRecentMatchesQuery(currentUser?.uid, {
    skip: !shouldFetchMatches,
  });

  const {
    data: usersMap = {},
    isLoading: usersLoading,
    error: usersError,
  } = useGetAllUsersQuery();

  // Helper function to format time ago
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

    console.log("🔍 FIXED DEBUG - RecentMatchesCard:");
    console.log("  - allMatches:", allMatches);
    console.log("  - usersMap:", usersMap);
    console.log("  - currentUser.uid:", currentUser.uid);

    // Filter for completed matches only
    const completedMatches = allMatches.filter(
      (match) => match.status === "completed" && 
      (match.player1Id === currentUser.uid || match.player2Id === currentUser.uid)
    );

    return completedMatches.slice(0, 3).map((match, index) => {
      console.log(`  Processing match ${index + 1}:`, match);

      const player1_method1 = usersMap[match.player1Id];
      const player1_method2 = Object.values(usersMap).find(user => user.id === match.player1Id);
      const player1_method3 = Object.values(usersMap).find(user => user.uid === match.player1Id);
      
      const player2_method1 = usersMap[match.player2Id];
      const player2_method2 = Object.values(usersMap).find(user => user.id === match.player2Id);
      const player2_method3 = Object.values(usersMap).find(user => user.uid === match.player2Id);
      
      // Use the first method that works
      const player1 = player1_method1 || player1_method2 || player1_method3 || {
        name: "Unknown Player 1",
        email: "unknown1@example.com",
        displayName: "Unknown Player 1",
      };
      
      const player2 = player2_method1 || player2_method2 || player2_method3 || {
        name: "Unknown Player 2",
        email: "unknown2@example.com",
        displayName: "Unknown Player 2",
      };

      // Determine opponent
      const isCurrentUserPlayer1 = match.player1Id === currentUser.uid;
      const opponent = isCurrentUserPlayer1 ? player2 : player1;
      
      console.log("    Opponent data:", opponent);
      console.log("    Opponent photoURL:", opponent.photoURL);

      // Determine winner from scores
      const player1Score = match.player1Score || 0;
      const player2Score = match.player2Score || 0;
      
      let currentUserWon = false;
      if (player1Score !== player2Score) {
        const player1Won = player1Score > player2Score;
        currentUserWon = isCurrentUserPlayer1 ? player1Won : !player1Won;
        console.log("      player1Won:", player1Won);
        console.log("      currentUserWon:", currentUserWon);
      } else {
        console.log("      Tie game");
      }
      
      const result = currentUserWon ? "Won" : "Lost";
      console.log("    Final result:", result);

      // Format the time ago - handle both Date objects and Firestore Timestamps
      let matchDate = match.completedDate || match.date;
      if (matchDate && typeof matchDate.toDate === 'function') {
        matchDate = matchDate.toDate(); // Convert Firestore Timestamp to Date
      } else if (typeof matchDate === 'string') {
        matchDate = new Date(matchDate); // Convert string to Date
      }
      const timeAgo = formatTimeAgo(matchDate);

      // Format score
      const score = `${player1Score}-${player2Score}`;

      const finalMatch = {
        id: match.id,
        opponent: opponent.displayName || opponent.name || opponent.email?.split("@")[0] || "Unknown",
        result: result,
        score: score,
        date: timeAgo,
        completedDate: matchDate,
        // ✅ FIXED: Use photoURL instead of profileImageUrl
        opponentAvatar: opponent.photoURL || null,
        match: match,
        currentUserWon: currentUserWon,
      };

      console.log("    Final processed match:", finalMatch);
      console.log("    Final opponentAvatar:", finalMatch.opponentAvatar);
      return finalMatch;
    });
  }, [allMatches, usersMap, currentUser?.uid]);

  // Determine loading and error states
  const isLoading = matchesLoading || usersLoading;
  const error = matchesError || usersError;

  // Show loading state while auth is initializing
  if (!currentUser) {
    return (
      <DashboardCard
        title="Recent Matches"
        isLoading={true}
        className="recent-matches-card"
      >
        <div className="text-center py-4">
          <p className="text-muted">Loading...</p>
        </div>
      </DashboardCard>
    );
  }

  // Footer action button
  const footerAction = (
    <Link to="/history" className="text-decoration-none">
      View All <i className="bi bi-arrow-right"></i>
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
        // Empty state
        <div className="text-center py-3">
          <CardMessage
              icon= {<RiPingPongFill />}
              text="No Recent Matches."
            />
        </div>
      ) : (
        // Matches list
        <div className="list-group list-group-flush">
          {recentMatches.map((match) => {
            console.log("🔍 RENDERING MATCH:", match);
            console.log("  - Avatar data being passed:", {
              photoURL: match.opponentAvatar,
              displayName: match.opponent,
            });

            return (
              <div key={match.id} className="card-body py-2">
                <div className="player__list_item">
                  <div className="player__list_info">
                    <UserAvatar
                      user={{
                        photoURL: match.opponentAvatar,
                        displayName: match.opponent,
                      }}
                      size={32}
                      className="player__list_avatar"
                    />
                    <div className="player__list_text">
                      <h6><span className="player__list_vs">vs.</span> {match.opponent}</h6>
                      {/* <small>{match.date}</small> */}
                    </div>
                  </div>
                  <div className="player__list_score">
                    <Badge
                      bg={match.result === "Won" ? "success" : "danger"}
                      
                    >
                      {match.result}
                    </Badge>
                    <div className="player__list_number">
                      <small>{match.score}</small>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardCard>
  );
};

export default React.memo(RecentMatchesCard);

