import React, { useContext, useMemo } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import {
  useGetRecentMatchesQuery,
  useGetAllUsersQuery,
} from '../../store/slices/apiSlice';
import DashboardCard from '../common/Card'; // Assuming your DashboardCard is a Bootstrap Card wrapper
import GenericTable from '../common/Table/GenericTable'; // Corrected import path
import UserAvatar from '../common/UserAvatar'; // Assuming you have this component
import { formatDistanceToNow } from 'date-fns'; // For relative time formatting

const RecentActivityCard = () => {
  const { currentUser } = useContext(AuthContext);
  const currentUserId = currentUser?.uid;

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

  // Combine data and prepare for GenericTable
  const tableData = useMemo(() => {
    // --- START DEBUGGING LOGS ---
    console.log("DEBUG: Recent Matches (raw):", recentMatches);
    console.log("DEBUG: All Users (map):", allUsers);
    console.log("DEBUG: Current User ID:", currentUserId);
    // --- END DEBUGGING LOGS ---
    if (!recentMatches.length || !Object.keys(allUsers).length) {
      return [];
    }

    return recentMatches.map((match) => {
      const isWinner = match.winnerId === currentUserId;
      const opponentId = isWinner ? match.loserId : match.winnerId;
     // --- START DEBUGGING LOGS PER MATCH ---
      console.log("DEBUG: Processing Match ID:", match.id);
      console.log("DEBUG: Match Winner ID:", match.winnerId);
      console.log("DEBUG: Match Loser ID:", match.loserId);
      console.log("DEBUG: Calculated Opponent ID:", opponentId);
     // --- END DEBUGGING LOGS PER MATCH ---



      const opponent = allUsers[opponentId];
      // --- START DEBUGGING LOGS FOR OPPONENT ---
      console.log("DEBUG: Opponent Object from allUsers:", opponent);
      // --- END DEBUGGING LOGS FOR OPPONENT ---

      
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
        id: match.id, // Important for table key
        activity: activityMessage,
        history: historyText,
        status: statusBadge,
        // Include full match data for potential future use in details/modal
        fullMatch: match,
        opponent: opponent,
      };
    });
  }, [recentMatches, allUsers, currentUserId]);

  // Define columns for GenericTable
  const columns = useMemo(() => [
    {
      header: 'Activity',
      accessor: 'activity',
      Cell: ({ row }) => (
        <div className="d-flex align-items-center">
          {row.opponent && (
            <UserAvatar
              user={{
                profileImage: row.opponent.profileImage,
                displayName: row.opponent.displayName,
                email: row.opponent.email,
              }}
              size="small" // Assuming UserAvatar supports size prop
              className="me-2"
            />
          )}
          <span>{row.activity}</span>
        </div>
      ),
    },
    {
      header: 'History',
      accessor: 'history',
      cellClassName: 'text-muted', // Bootstrap class for muted text
    },
    {
      header: 'Status',
      accessor: 'status',
      cellClassName: 'text-center', // Center badge
    },
  ], []);

  // Handle loading states
  if (isLoadingMatches || isLoadingUsers) {
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
          className="btn btn-outline-primary btn-sm" // Bootstrap button classes
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
