import React, { useContext, useMemo, useState, useEffect } from 'react';
import { AuthContext } from '../../../contexts/AuthContext';
import { useGetAllUsersQuery } from '../../../store/slices/apiSlice';
import DashboardCard from '../../common/Card';
import GenericTable from '../../common/Table/GenericTable';
import UserAvatar from '../../common/UserAvatar';
import MatchFilters from '../Filters/MatchFilters';
import useMatchFilters from '../../../hooks/useMatchFilters';
import { format } from 'date-fns';
import { Pagination, Spinner, Alert, Row, Col } from 'react-bootstrap';

// Firebase imports
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  or,
  and
} from 'firebase/firestore';
import { db } from '../../../config/firebase';

const AllMatchesCard = () => {
  const { currentUser } = useContext(AuthContext);
  const currentUserId = currentUser?.uid;

  // State for Firebase data
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Use the custom filter hook
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
    showAllMatches,
    handleShowAllMatchesChange,
    page,
    handlePageChange,
    pageSize,
    handlePageSizeChange,
    resetFilters,
  } = useMatchFilters(currentUserId);

  // Fetch all users to resolve display names and avatars
  const {
    data: allUsersMap = {},
    isLoading: isLoadingUsers,
    isError: isErrorUsers,
    error: usersError,
  } = useGetAllUsersQuery();

  // Fetch real matches from Firebase
  useEffect(() => {
    const fetchMatches = async () => {
      if (!currentUserId) return;

      setLoading(true);
      setError(null);

      try {
        // console.log('🔍 Fetching all matches from Firebase...');
        // console.log('🔍 Show all matches:', showAllMatches);
        // console.log('🔍 Current user ID:', currentUserId);

        const matchesRef = collection(db, 'matches');
        let q;

        if (showAllMatches) {
          // Get ALL matches in the system
          q = query(
            matchesRef,
            orderBy('completedDate', 'desc'),
            limit(200) // Limit to prevent too much data
          );
        } else {
          // Get only matches where current user participated
          q = query(
            matchesRef,
            or(
              where('player1Id', '==', currentUserId),
              where('player2Id', '==', currentUserId)
            ),
            orderBy('completedDate', 'desc'),
            limit(100)
          );
        }

        const querySnapshot = await getDocs(q);
        const matchesData = [];

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          matchesData.push({
            id: doc.id,
            ...data
          });
        });

        // console.log('🔍 Real matches fetched:', matchesData.length);
        // console.log('🔍 Sample match:', matchesData[0]);

        setMatches(matchesData);
      } catch (err) {
        console.error('Error fetching matches:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, [currentUserId, showAllMatches]); // Re-fetch when showAllMatches changes

  // Apply client-side filtering to Firebase data
  const filteredMatches = useMemo(() => {
    if (!matches.length) return [];

    let filtered = [...matches];

    console.log('🔍 Applying filters to', filtered.length, 'matches');
    console.log('🔍 Filter params:', {
      selectedPlayerId,
      selectedStatus,
      selectedResult,
      startDate,
      endDate
    });

    // Filter by specific player
    if (selectedPlayerId && selectedPlayerId !== 'all') {
      filtered = filtered.filter(match => 
        match.player1Id === selectedPlayerId || match.player2Id === selectedPlayerId
      );
      // console.log('🔍 After player filter:', filtered.length);
    }

    // Filter by status
    if (selectedStatus && selectedStatus !== 'all') {
      filtered = filtered.filter(match => match.status === selectedStatus);
      // console.log('🔍 After status filter:', filtered.length);
    }

    // Filter by result (only for user's matches)
    if (selectedResult && selectedResult !== 'all' && !showAllMatches) {
      if (selectedResult === 'won') {
        filtered = filtered.filter(match => match.winnerId === currentUserId);
      } else if (selectedResult === 'lost') {
        filtered = filtered.filter(match => 
          match.status === 'completed' && match.winnerId !== currentUserId
        );
      }
      // console.log('🔍 After result filter:', filtered.length);
    }

    // Filter by date range
    if (startDate) {
      const start = new Date(startDate);
      filtered = filtered.filter(match => {
        const matchDate = match.completedDate?.toDate ? 
          match.completedDate.toDate() : 
          new Date(match.completedDate || match.scheduledDate);
        return matchDate >= start;
      });
      // console.log('🔍 After start date filter:', filtered.length);
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(match => {
        const matchDate = match.completedDate?.toDate ? 
          match.completedDate.toDate() : 
          new Date(match.completedDate || match.scheduledDate);
        return matchDate <= end;
      });
      // console.log('🔍 After end date filter:', filtered.length);
    }

    // console.log('🔍 Final filtered matches:', filtered.length);
    return filtered;
  }, [matches, selectedPlayerId, selectedStatus, selectedResult, startDate, endDate, showAllMatches, currentUserId]);

  // Combine data and prepare for GenericTable
  const tableData = useMemo(() => {
    if (!filteredMatches.length || !Object.keys(allUsersMap).length) {
      return [];
    }

    // console.log("🔍 Processing matches for table:", filteredMatches.length);

    return filteredMatches.map((match) => {
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
        if (currentUserInMatch && !showAllMatches) {
          resultBadge = currentUserWon ? (
            <span className="badge bg-success">Won</span>
          ) : (
            <span className="badge bg-danger">Lost</span>
          );
        } else {
          resultBadge = <span className="badge bg-secondary">Completed</span>;
        }
      } else if (match.status === 'scheduled') {
        resultBadge = <span className="badge bg-primary">Scheduled</span>;
      } else if (match.status === 'in-progress') {
        resultBadge = <span className="badge bg-warning">In Progress</span>;
      }

      // Format date - handle both Firestore Timestamp and regular Date
      const matchDate = match.completedDate?.toDate ? 
        match.completedDate.toDate() : 
        (match.completedDate ? new Date(match.completedDate) : 
         (match.scheduledDate?.toDate ? match.scheduledDate.toDate() : 
          (match.scheduledDate ? new Date(match.scheduledDate) : null)));
      
      const formattedDate = matchDate ? format(matchDate, 'MMM dd, yyyy') : 'N/A';

      // Format score
      const scoreText = match.status === 'completed' ? 
        `${match.player1Score || 0} - ${match.player2Score || 0}` : 'N/A';

      const processedMatch = {
        id: match.id,
        date: formattedDate,
        players: {
          player1: {
            id: match.player1Id,
            displayName: player1DisplayName,
            photoURL: (!player1?.useDefaultAvatar && player1?.photoURL) ? player1.photoURL : null,
            email: player1?.email,
          },
          player2: {
            id: match.player2Id,
            displayName: player2DisplayName,
            photoURL: (!player2?.useDefaultAvatar && player2?.photoURL) ? player2.photoURL : null,
            email: player2?.email,
          },
        },
        score: scoreText,
        result: resultBadge,
        status: match.status,
        location: match.location || 'Not specified',
        notes: match.notes || 'No notes',
        fullMatch: match,
      };

      return processedMatch;
    });
  }, [filteredMatches, allUsersMap, currentUserId, showAllMatches]);

  // Define columns for GenericTable
  const columns = useMemo(() => [
    {
      header: 'Date',
      accessor: 'date',
      cellClassName: 'text-muted',
    },
    {
      header: 'Players',
      accessor: 'players',
      Cell: ({ row }) => {
        return (
          <div className="d-flex align-items-center">
            {/* Player 1 */}
            <UserAvatar
              user={{
                photoURL: row.players.player1.photoURL,
                displayName: row.players.player1.displayName,
                email: row.players.player1.email,
              }}
              size="small"
              className="me-2"
            />
            <span className={row.players.player1.id === currentUserId ? 'fw-bold text-primary' : ''}>
              {row.players.player1.id === currentUserId ? 'You' : row.players.player1.displayName}
            </span>

            <span className="mx-2 text-muted">vs.</span>

            {/* Player 2 */}
            <UserAvatar
              user={{
                photoURL: row.players.player2.photoURL,
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
        );
      },
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
  ], [currentUserId]);

  // Handle loading states
  const isLoading = loading || isLoadingUsers;

  if (error || isErrorUsers) {
    console.error("Error loading matches:", error || usersError);
    return (
      <DashboardCard title="All Matches">
        <Alert variant="danger" className="text-center">
          <h6>Error loading matches:</h6>
          <p className="mb-2">{error || usersError?.error || 'Unknown error'}</p>
          <small className="text-muted">
            This might be due to Firebase security rules. Ensure you have permission to read the matches collection.
          </small>
        </Alert>
      </DashboardCard>
    );
  }

  // Pagination logic
  const totalPages = Math.ceil(tableData.length / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentMatchesOnPage = tableData.slice(startIndex, endIndex);

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
        showAllMatches={showAllMatches}
        handleShowAllMatchesChange={handleShowAllMatchesChange}
        resetFilters={resetFilters}
      />

      {/* Loading Spinner */}
      {isLoading && (
        <div className="d-flex justify-content-center align-items-center py-5">
          <Spinner animation="border" role="status" className="me-2" />
          <span>Loading matches from Firebase...</span>
        </div>
      )}

      {/* No matches state */}
      {!isLoading && tableData.length === 0 && (
        <div className="text-center py-5">
          <span className="display-4 text-muted">🏓</span>
          <h4 className="mt-3 mb-2">No Matches Found</h4>
          <p className="text-muted">
            {matches.length === 0 
              ? "No matches found in the database."
              : "No matches found matching your filter criteria."
            }
          </p>
          {matches.length > 0 && (
            <button className="btn btn-outline-primary btn-sm" onClick={resetFilters}>
              Clear Filters
            </button>
          )}
        </div>
      )}

      {/* Table Display */}
      {!isLoading && tableData.length > 0 && (
        <>
          <GenericTable
            columns={columns}
            data={currentMatchesOnPage}
            emptyMessage="No matches found matching your criteria."
            className="all__matches"
          />

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="d-flex justify-content-between align-items-center mt-3">
              <div className="text-muted small">
                Showing {startIndex + 1} to {Math.min(endIndex, tableData.length)} of {tableData.length} matches
              </div>
              <Pagination>
                <Pagination.Prev 
                  onClick={() => handlePageChange(page - 1)} 
                  disabled={page === 1} 
                />
                {[...Array(totalPages)].map((_, index) => (
                  <Pagination.Item
                    key={index + 1}
                    active={index + 1 === page}
                    onClick={() => handlePageChange(index + 1)}
                  >
                    {index + 1}
                  </Pagination.Item>
                ))}
                <Pagination.Next 
                  onClick={() => handlePageChange(page + 1)} 
                  disabled={page === totalPages} 
                />
              </Pagination>
            </div>
          )}
        </>
      )}
    </DashboardCard>
  );
};

export default AllMatchesCard;

