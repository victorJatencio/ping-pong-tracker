import React, { useContext, useMemo } from 'react';
import { AuthContext } from '../../../contexts/AuthContext';
import {
  useGetFilteredMatchesQuery,
  useGetAllUsersQuery,
} from '../../../store/slices/apiSlice';
import DashboardCard from '../../common/Card';
import GenericTable from '../../common/Table/GenericTable';
import UserAvatar from '../../common/UserAvatar';
import MatchFilters from '../Filters/MatchFilters'; // Import the filter UI component
import useMatchFilters from '../../../hooks/useMatchFilters'; // Import the filter hook
import { format } from 'date-fns';
import { Pagination, Spinner, Alert, Row, Col } from 'react-bootstrap';

const AllMatchesCard = () => {
  const { currentUser } = useContext(AuthContext);
  const currentUserId = currentUser?.uid;

  // 1. Use the custom filter hook
  const {
    filterParams,
    selectedPlayerId,
    handlePlayerChange,
    selectedStatus,
    handleStatusChange,
    selectedResult,
    handleResultChange,
    startDate,
    handleStartDateChange,
    endDate,
    handleEndDateChange,
    showAllMatches, // NEW PROP
    handleShowAllMatchesChange, // NEW PROP
    page,
    handlePageChange,
    pageSize,
    handlePageSizeChange, // Keep this if you want to add page size selector later
    resetFilters,
  } = useMatchFilters(currentUserId);

  // 2. Fetch filtered matches using the params from the hook
  const {
    data: matches = [],
    isLoading: isLoadingMatches,
    isFetching: isFetchingMatches,
    isError: isErrorMatches,
    error: matchesError,
  } = useGetFilteredMatchesQuery(filterParams);

  // 3. Fetch all users to resolve display names and avatars
  const {
    data: allUsersMap = {},
    isLoading: isLoadingUsers,
    isError: isErrorUsers,
    error: usersError,
  } = useGetAllUsersQuery();

  // Combine data and prepare for GenericTable
  const tableData = useMemo(() => {
    if (!matches.length || !Object.keys(allUsersMap).length) {
      return [];
    }

    return matches.map((match) => {
      // Determine player1 and player2 objects
      const player1 = allUsersMap[match.player1Id];
      const player2 = allUsersMap[match.player2Id];

      const player1DisplayName = player1?.displayName || player1?.name || 'Unknown Player 1';
      const player2DisplayName = player2?.displayName || player2?.name || 'Unknown Player 2';

      // Determine if current user won (only relevant if current user is in the match)
      const isCurrentUserPlayer1 = match.player1Id === currentUserId;
      const isCurrentUserPlayer2 = match.player2Id === currentUserId;
      const currentUserInMatch = isCurrentUserPlayer1 || isCurrentUserPlayer2;
      const currentUserWon = (match.winnerId === currentUserId && match.status === 'completed');

      // Determine result badge
      let resultBadge = null;
      if (match.status === 'completed') {
        if (currentUserInMatch && !showAllMatches) { // If current user participated and we're in "My Matches" mode
          resultBadge = currentUserWon ? (
            <span className="badge bg-success">Won</span>
          ) : (
            <span className="badge bg-danger">Lost</span>
          );
        } else { // Match between other players or in "All Matches" mode
          resultBadge = <span className="badge bg-secondary">Completed</span>; // Neutral badge for other matches
        }
      } else if (match.status === 'scheduled') {
        resultBadge = <span className="badge bg-primary">Scheduled</span>;
      } else if (match.status === 'in-progress') {
        resultBadge = <span className="badge bg-warning">In Progress</span>;
      }

      // Format date
      const matchDate = match.completedDate ? new Date(match.completedDate) : (match.scheduledDate ? new Date(match.scheduledDate) : null);
      const formattedDate = matchDate ? format(matchDate, 'MMM dd, yyyy') : 'N/A';

      // Format score
      const scoreText = match.status === 'completed' ? `${match.player1Score || 0} - ${match.player2Score || 0}` : 'N/A';

      return {
        id: match.id, // Important for table key
        date: formattedDate,
        // NEW: Store both players' info for the 'Players' column
        players: {
          player1: {
            id: match.player1Id,
            displayName: player1DisplayName,
            profileImage: player1?.profileImage,
            email: player1?.email,
          },
          player2: {
            id: match.player2Id,
            displayName: player2DisplayName,
            profileImage: player2?.profileImage,
            email: player2?.email,
          },
        },
        score: scoreText,
        result: resultBadge,
        status: match.status,
        location: match.location,
        notes: match.notes,
        fullMatch: match,
      };
    });
  }, [matches, allUsersMap, currentUserId, showAllMatches]);

  // Define columns for GenericTable
  const columns = useMemo(() => [
    {
      header: 'Date',
      accessor: 'date',
      cellClassName: 'text-muted',
    },
    {
      header: 'Players', // Changed header from 'Opponent' to 'Players'
      accessor: 'players',
      Cell: ({ row }) => (
        <div className="d-flex align-items-center">
          {/* Player 1 */}
          <UserAvatar
            user={{
              profileImage: row.players.player1.profileImage,
              displayName: row.players.player1.displayName,
              email: row.players.player1.email,
            }}
            size="small"
            className="me-2"
          />
          <span className={row.players.player1.id === currentUserId ? 'fw-bold text-primary' : ''}>
            {row.players.player1.id === currentUserId ? 'You' : row.players.player1.displayName}
          </span>

          <span className="mx-2 text-muted">vs.</span> {/* "vs." separator */}

          {/* Player 2 */}
          <UserAvatar
            user={{
              profileImage: row.players.player2.profileImage,
              displayName: row.players.player2.displayName,
              email: row.players.player2.email,
            }}
            size="small"
            className="me-2"
          />
          <span className={row.players.player2.id === currentUserId ? 'fw-bold text-primary' : ''}>
            {row.players.player2.id === currentUserId ? 'You' : row.players.player2.displayName}
          </span>
        </div>
      ),
    },
    {
      header: 'Score',
      accessor: 'score',
      cellClassName: 'fw-bold',
    },
    {
      header: 'Result',
      accessor: 'result',
      cellClassName: 'text-center',
    },
    {
      header: 'Location',
      accessor: 'location',
      cellClassName: 'text-muted',
    },
    {
      header: 'Notes',
      accessor: 'notes',
      cellClassName: 'text-muted fst-italic',
    },
  ], [currentUserId]); // Add currentUserId to columns dependencies

  // Handle loading states
  const isLoading = isLoadingMatches || isLoadingUsers || isFetchingMatches;

  if (isErrorMatches || isErrorUsers) {
    console.error("Error loading matches:", matchesError || usersError);
    return (
      <DashboardCard title="All Matches">
        <Alert variant="danger" className="text-center">
          Error loading matches. Please try again.
        </Alert>
      </DashboardCard>
    );
  }

  // Pagination logic
  const totalPages = Math.ceil(matches.length / pageSize);
  const currentMatchesOnPage = tableData.slice(0, pageSize);

  return (
    <DashboardCard title={showAllMatches ? "All Matches" : "My Matches"}>
      {/* Filter Controls */}
      <MatchFilters
        selectedPlayerId={selectedPlayerId}
        handlePlayerChange={handlePlayerChange}
        selectedStatus={selectedStatus}
        handleStatusChange={handleStatusChange}
        selectedResult={selectedResult}
        handleResultChange={handleResultChange}
        startDate={startDate}
        handleStartDateChange={handleStartDateChange}
        endDate={endDate}
        handleEndDateChange={handleEndDateChange}
        showAllMatches={showAllMatches} // NEW PROP
        handleShowAllMatchesChange={handleShowAllMatchesChange} // NEW PROP
        resetFilters={resetFilters}
      />

      {/* Loading Spinner */}
      {isLoading && (
        <div className="d-flex justify-content-center align-items-center py-5">
          <Spinner animation="border" role="status" className="me-2" />
          <span>Loading matches...</span>
        </div>
      )}

      {/* Table Display */}
      {!isLoading && (
        <>
          <GenericTable
            columns={columns}
            data={currentMatchesOnPage}
            emptyMessage="No matches found matching your criteria."
          />

          {/* Pagination Controls */}
          {tableData.length > pageSize && (
            <div className="d-flex justify-content-center mt-3">
              <Pagination>
                <Pagination.Prev onClick={() => handlePageChange(page - 1)} disabled={page === 1} />
                {[...Array(totalPages)].map((_, index) => (
                  <Pagination.Item
                    key={index + 1}
                    active={index + 1 === page}
                    onClick={() => handlePageChange(index + 1)}
                  >
                    {index + 1}
                  </Pagination.Item>
                ))}
                <Pagination.Next onClick={() => handlePageChange(page + 1)} disabled={page === totalPages} />
              </Pagination>
            </div>
          )}
        </>
      )}
    </DashboardCard>
  );
};

export default AllMatchesCard;
