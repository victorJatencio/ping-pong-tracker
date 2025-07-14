import React, { useContext, useMemo, useState, useEffect } from 'react';
import { Badge, Pagination } from 'react-bootstrap';
import { AuthContext } from '../../../contexts/AuthContext';
import { useGetAllUsersQuery } from '../../../store/slices/apiSlice';
import DashboardCard from '../../common/Card';
import GenericTable from '../../common/Table/GenericTable';
import UserAvatar from '../../common/UserAvatar';
import MatchHistoryFilters from './MatchHistoryFilters';
import useMatchHistoryFilters from '../../../hooks/useMatchHistoryFilters';

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

const MatchHistoryCard = ({ title = "Match History" }) => {
  const { currentUser } = useContext(AuthContext);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Filter and pagination management
  const {
    result,
    startDate,
    endDate,
    page,
    pageSize,
    handleResultChange,
    handleStartDateChange,
    handleEndDateChange,
    handlePageChange,
    resetFilters,
    hasActiveFilters
  } = useMatchHistoryFilters();

  // Fetch user data for opponent names and avatars
  const { 
    data: allUsers, 
    error: usersError, 
    isLoading: usersLoading 
  } = useGetAllUsersQuery();

  // Fetch real matches from Firebase
  useEffect(() => {
    const fetchMatches = async () => {
      if (!currentUser?.uid) return;

      setLoading(true);
      setError(null);

      try {
        console.log('🔍 Fetching real matches for user:', currentUser.uid);

        // Create query to get matches where user is either player1 or player2
        const matchesRef = collection(db, 'matches');
        const q = query(
          matchesRef,
          and(
            or(
              where('player1Id', '==', currentUser.uid),
              where('player2Id', '==', currentUser.uid)
            ),
            where('status', '==', 'completed') // Only get completed matches
          ),
          orderBy('completedDate', 'desc'),
          limit(100) // Limit to last 100 matches
        );

        const querySnapshot = await getDocs(q);
        const matchesData = [];

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          matchesData.push({
            id: doc.id,
            ...data
          });
        });

        console.log('🔍 Real matches fetched:', matchesData.length);
        console.log('🔍 Sample match:', matchesData[0]);

        setMatches(matchesData);
      } catch (err) {
        console.error('Error fetching matches:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, [currentUser?.uid]);

  // Process table data from real Firebase matches
  const { tableData, pagination } = useMemo(() => {
    if (!matches || !allUsers || !currentUser) {
      return { tableData: [], pagination: null };
    }

    console.log('🔍 Processing real matches:', matches.length);

    // Process matches into table format
    const processedMatches = matches.map((match) => {
      // Determine opponent
      const isPlayer1 = match.player1Id === currentUser.uid;
      const opponentId = isPlayer1 ? match.player2Id : match.player1Id;
      const opponent = allUsers[opponentId];
      
      // Determine result
      const isWinner = match.winnerId === currentUser.uid;
      const userScore = isPlayer1 ? match.player1Score : match.player2Score;
      const opponentScore = isPlayer1 ? match.player2Score : match.player1Score;
      
      return {
        id: match.id,
        date: match.completedDate || match.createdAt,
        opponent: {
          id: opponentId,
          name: opponent?.displayName || opponent?.name || 'Unknown Player',
          avatar: (!opponent?.useDefaultAvatar && opponent?.photoURL) ? opponent.photoURL : null,
          email: opponent?.email
        },
        result: isWinner ? 'won' : 'lost',
        userScore: userScore || 0,
        opponentScore: opponentScore || 0,
        location: match.location || 'Not specified',
        details: match.notes || 'No notes',
        // Include original match data for debugging
        originalMatch: match
      };
    });

    console.log('🔍 Processed matches:', processedMatches.length);
    console.log('🔍 Sample processed match:', processedMatches[0]);

    // Apply filters
    let filteredMatches = processedMatches;

    // Result filter
    if (result && result !== 'all') {
      filteredMatches = filteredMatches.filter(match => match.result === result);
    }

    // Date range filter
    if (startDate) {
      const start = new Date(startDate);
      filteredMatches = filteredMatches.filter(match => {
        const matchDate = match.date?.toDate ? match.date.toDate() : new Date(match.date);
        return matchDate >= start;
      });
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filteredMatches = filteredMatches.filter(match => {
        const matchDate = match.date?.toDate ? match.date.toDate() : new Date(match.date);
        return matchDate <= end;
      });
    }

    // Pagination
    const totalCount = filteredMatches.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedMatches = filteredMatches.slice(startIndex, endIndex);

    console.log('🔍 Final paginated matches:', paginatedMatches.length);

    return {
      tableData: paginatedMatches,
      pagination: totalCount > 0 ? {
        currentPage: page,
        pageSize,
        totalCount,
        totalPages,
        hasPreviousPage: page > 1,
        hasNextPage: page < totalPages
      } : null
    };
  }, [matches, allUsers, currentUser, result, startDate, endDate, page, pageSize]);

  // Define table columns for real match data
  const columns = useMemo(() => [
    {
      accessor: 'date',
      header: 'Date',
      sortable: true,
      Cell: ({ row }) => {
        // Handle both Firestore Timestamp and regular Date
        const date = row.date?.toDate ? row.date.toDate() : new Date(row.date);
        return (
          <div>
            <div className="fw-semibold">
              {date.toLocaleDateString()}
            </div>
            <small className="text-muted">
              {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </small>
          </div>
        );
      }
    },
    {
      accessor: 'opponent',
      header: 'Opponent',
      sortable: false,
      Cell: ({ row }) => (
        <div className="d-flex align-items-center">
          <UserAvatar
            user={{
              photoURL: row.opponent.avatar,
              displayName: row.opponent.name,
              email: row.opponent.email
            }}
            size="sm"
            className="me-2"
          />
          <span>{row.opponent.name}</span>
        </div>
      )
    },
    {
      accessor: 'result',
      header: 'Result',
      sortable: true,
      Cell: ({ row }) => (
        <Badge bg={row.result === 'won' ? 'success' : 'danger'} className="text-capitalize">
          {row.result}
        </Badge>
      )
    },
    {
      accessor: 'userScore',
      header: 'Score',
      sortable: false,
      Cell: ({ row }) => (
        <span className="font-monospace fw-bold">
          {row.userScore} - {row.opponentScore}
        </span>
      )
    },
    {
      accessor: 'location',
      header: 'Location',
      sortable: true,
      Cell: ({ row }) => (
        <span className="text-muted">{row.location}</span>
      )
    },
    {
      accessor: 'details',
      header: 'Details',
      sortable: false,
      Cell: ({ row }) => (
        <span 
          className="text-muted small"
          title={row.details}
          style={{ 
            maxWidth: '200px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            display: 'inline-block'
          }}
        >
          {row.details}
        </span>
      )
    }
  ], []);

  // Loading state
  if (loading || usersLoading) {
    return (
      <DashboardCard title={title}>
        <div className="text-center py-4">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading matches...</span>
          </div>
        </div>
      </DashboardCard>
    );
  }

  // Error state
  if (error || usersError) {
    return (
      <DashboardCard title={title}>
        <div className="alert alert-danger" role="alert">
          <h6>Error loading match history:</h6>
          <p className="mb-2">{error || usersError?.error || 'Unknown error'}</p>
          <small className="text-muted">
            This might be due to Firebase security rules. Ensure you have permission to read the matches collection.
          </small>
        </div>
      </DashboardCard>
    );
  }

  // No matches state
  if (matches.length === 0) {
    return (
      <DashboardCard title={title}>
        <MatchHistoryFilters
          result={result}
          startDate={startDate}
          endDate={endDate}
          onResultChange={handleResultChange}
          onStartDateChange={handleStartDateChange}
          onEndDateChange={handleEndDateChange}
          onResetFilters={resetFilters}
          hasActiveFilters={hasActiveFilters}
        />
        
        <div className="text-center py-5">
          <span className="display-4 text-muted">🏓</span>
          <h4 className="mt-3 mb-2">No Matches Found</h4>
          <p className="text-muted">
            No completed matches found in the database for your account.
          </p>
        </div>
      </DashboardCard>
    );
  }

  return (
    <DashboardCard title={title}>
      {/* Real Data Banner */}
      <div className="alert alert-success mb-3">
        <div className="d-flex align-items-center">
          <span className="me-2">✅</span>
          <div>
            <strong>Real Match Data:</strong> Showing {matches.length} actual matches from your Firebase matches collection.
            {tableData.length > 0 && (
              <div className="mt-1">
                <small>
                  Displaying {tableData.length} matches on this page. 
                  Sample match ID: {tableData[0]?.id}
                </small>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <MatchHistoryFilters
        result={result}
        startDate={startDate}
        endDate={endDate}
        onResultChange={handleResultChange}
        onStartDateChange={handleStartDateChange}
        onEndDateChange={handleEndDateChange}
        onResetFilters={resetFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Table */}
      <GenericTable
        columns={columns}
        data={tableData}
        loading={loading}
        error={error}
        emptyMessage="No matches found matching your criteria."
      />

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="d-flex justify-content-between align-items-center mt-3">
          <div className="text-muted small">
            Showing {((pagination.currentPage - 1) * pagination.pageSize) + 1} to{' '}
            {Math.min(pagination.currentPage * pagination.pageSize, pagination.totalCount)} of{' '}
            {pagination.totalCount} matches
          </div>
          <Pagination className="mb-0">
            <Pagination.Prev 
              onClick={() => handlePageChange(pagination.currentPage - 1)}
              disabled={!pagination.hasPreviousPage}
            />
            {Array.from({ length: pagination.totalPages }, (_, index) => (
              <Pagination.Item
                key={index + 1}
                active={index + 1 === pagination.currentPage}
                onClick={() => handlePageChange(index + 1)}
              >
                {index + 1}
              </Pagination.Item>
            ))}
            <Pagination.Next 
              onClick={() => handlePageChange(pagination.currentPage + 1)}
              disabled={!pagination.hasNextPage}
            />
          </Pagination>
        </div>
      )}
    </DashboardCard>
  );
};

export default MatchHistoryCard;

