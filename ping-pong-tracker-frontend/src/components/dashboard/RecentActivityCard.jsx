import React, { useContext, useMemo } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import {
  useGetRecentMatchesQuery,
  useGetAllUsersQuery,
  useGetUserProfileQuery,
} from '../../store/slices/apiSlice';
import DashboardCard from '../common/Card';
import GenericTable from '../common/Table/GenericTable';
import UserAvatar from '../common/UserAvatar';
import { formatDistanceToNow } from 'date-fns';

const RecentActivityCard = () => {
  const { currentUser } = useContext(AuthContext);
  const currentUserId = currentUser?.uid;

  // Get current user profile data via RTK Query
  const { 
    data: currentUserProfile,
    isLoading: isLoadingCurrentUser 
  } = useGetUserProfileQuery(currentUserId, {
    skip: !currentUserId
  });

  // Fetch recent matches for the current user
  const {
    data: recentMatches = [],
    isLoading: isLoadingMatches,
    isError: isErrorMatches,
    error: matchesError,
  } = useGetRecentMatchesQuery(currentUserId);

  // Fetch all users to get display names and avatars
  const {
    data: allUsers = {},
    isLoading: isLoadingUsers,
    isError: isErrorUsers,
    error: usersError,
  } = useGetAllUsersQuery();

  // Use profile data for current user, fallback to AuthContext
  const displayUser = currentUserProfile || currentUser;

  // Combine data and prepare for GenericTable
  const tableData = useMemo(() => {
    console.log("🔍 DEBUG - RecentActivityCard Data:");
    console.log("  - Recent Matches:", recentMatches);
    console.log("  - All Users Map:", allUsers);
    console.log("  - Current User ID:", currentUserId);
    
    if (!recentMatches.length || !Object.keys(allUsers).length) {
      return [];
    }

    return recentMatches.map((match) => {
      const isWinner = match.winnerId === currentUserId;
      const opponentId = isWinner ? match.loserId : match.winnerId;

      const opponent = allUsers[opponentId];
      console.log("🔍 DEBUG - Opponent data:", opponent);
      
      if (opponent) {
        console.log("  - photoURL:", opponent.photoURL);
        console.log("  - useDefaultAvatar:", opponent.useDefaultAvatar);
      }

      const opponentDisplayName = opponent?.displayName || opponent?.name || 'Unknown Player';

      // Determine activity message
      let activityMessage = '';
      if (isWinner) {
        activityMessage = `You won a match against ${opponentDisplayName}`;
      } else {
        activityMessage = `You lost a match against ${opponentDisplayName}`;
      }

      // Determine status badge
      const statusBadge = isWinner ? (
        <span className="badge bg-success">Won</span>
      ) : (
        <span className="badge bg-danger">Lost</span>
      );

      // Format history time
      const matchTime = match.completedDate ? new Date(match.completedDate) : null;
      const historyText = matchTime ? formatDistanceToNow(matchTime, { addSuffix: true }) : 'N/A';

      return {
        id: match.id,
        activity: activityMessage,
        history: historyText,
        status: statusBadge,
        fullMatch: match,
        opponent: opponent,
      };
    });
  }, [recentMatches, allUsers, currentUserId, currentUserProfile, displayUser]);

  // Define columns for GenericTable
  const columns = useMemo(() => [
    {
      header: 'Activity',
      accessor: 'activity',
      Cell: ({ row }) => {
        console.log("🎨 RENDERING AVATAR for opponent:", row.opponent);
        
        return (
          <div className="d-flex align-items-center">
            {row.opponent && (
              <UserAvatar
                user={{
                  // ✅ FIXED: Handle useDefaultAvatar logic properly
                  profileImage: (!row.opponent.useDefaultAvatar && row.opponent.photoURL) ? row.opponent.photoURL : null,
                  displayName: row.opponent.displayName || row.opponent.name,
                  email: row.opponent.email,
                  // ✅ OPTION: Pass useDefaultAvatar to let UserAvatar handle it
                  useDefaultAvatar: row.opponent.useDefaultAvatar,
                }}
                size="small"
                className="me-2"
              />
            )}
            <span>{row.activity}</span>
          </div>
        );
      },
    },
    {
      header: 'History',
      accessor: 'history',
      cellClassName: 'text-muted',
    },
    {
      header: 'Status',
      accessor: 'status',
      cellClassName: 'text-center',
    },
  ], []);

  // Include current user profile loading in loading state
  if (isLoadingMatches || isLoadingUsers || isLoadingCurrentUser) {
    return (
      <DashboardCard title="Recent Activity">
        <div className="d-flex justify-content-center align-items-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </DashboardCard>
    );
  }

  // Handle error states
  if (isErrorMatches || isErrorUsers) {
    console.error("Error loading recent activity:", matchesError || usersError);
    return (
      <DashboardCard title="Recent Activity">
        <div className="alert alert-danger" role="alert">
          Error loading recent activity. Please try again.
        </div>
      </DashboardCard>
    );
  }

  return (
    <DashboardCard
      title="Recent Activity"
      footerAction={
        <button
          className="btn btn-outline-primary btn-sm"
          onClick={() => console.log("Navigate to full Match History")}
          disabled={tableData.length === 0}
        >
          View All
        </button>
      }
    >
      <GenericTable
        columns={columns}
        data={tableData}
        emptyMessage="No recent matches played yet. Play a match to see your activity here!"
      />
    </DashboardCard>
  );
};

export default RecentActivityCard;

