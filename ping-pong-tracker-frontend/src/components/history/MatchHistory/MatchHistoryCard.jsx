import React, { useContext, useMemo } from 'react';
import { Badge, Pagination } from 'react-bootstrap';
import { AuthContext } from '../../../contexts/AuthContext';
import { 
  useGetUserMatchHistoryQuery, 
  useGetAllUsersQuery 
} from '../../../store/slices/apiSlice';
import DashboardCard from '../../common/Card';
import GenericTable from '../../common/Table/GenericTable';
import UserAvatar from '../../common/UserAvatar';
import MatchHistoryFilters from './MatchHistoryFilters';
import useMatchHistoryFilters from '../../../hooks/useMatchHistoryFilters';

const MatchHistoryCard = ({ title = "Match History" }) => {
  const { currentUser } = useContext(AuthContext);
  
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
    filterParams,
    paginationParams,
    hasActiveFilters
  } = useMatchHistoryFilters();

  // Fetch match history data
  const { 
    data: matchHistoryResponse, 
    error, 
    isLoading 
  } = useGetUserMatchHistoryQuery({
    userId: currentUser?.uid,
    filters: filterParams,
    pagination: paginationParams
  }, {
    skip: !currentUser?.uid
  });

  // Fetch user data for opponent names and avatars
  const { 
    data: allUsers, 
    error: usersError, 
    isLoading: usersLoading 
  } = useGetAllUsersQuery();

  // Process table data
  const { tableData, pagination } = useMemo(() => {
    if (!matchHistoryResponse?.matches || !allUsers) {
      return { tableData: [], pagination: null };
    }

    const processedData = matchHistoryResponse.matches.map((match) => {
      // Determine opponent
      const isPlayer1 = match.player1Id === currentUser?.uid;
      const opponentId = isPlayer1 ? match.player2Id : match.player1Id;
      const opponent = allUsers[opponentId];
      
      // Determine result
      const isWinner = match.winnerId === currentUser?.uid;
      const userScore = isPlayer1 ? match.player1Score : match.player2Score;
      const opponentScore = isPlayer1 ? match.player2Score : match.player1Score;
      
      return {
        id: match.id,
        date: match.completedDate,
        opponent: {
          id: opponentId,
          name: opponent?.displayName || opponent?.name || 'Unknown Player',
          avatar: opponent?.photoURL || null
        },
        result: isWinner ? 'won' : 'lost',
        userScore,
        opponentScore,
        location: match.location || 'Not specified',
        details: match.notes || 'No notes'
      };
    });

    return {
      tableData: processedData,
      pagination: matchHistoryResponse.pagination
    };
  }, [matchHistoryResponse, allUsers, currentUser]);

  // Define table columns
  const columns = useMemo(() => [
    {
      accessor: 'date',
      header: 'Date',
      sortable: true,
      Cell: ({ row }) => {
        const date = new Date(row.date);
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
              displayName: row.opponent.name
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
      accessor: 'score',
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
  if (isLoading || usersLoading) {
    return (
      <DashboardCard title={title}>
        <div className="text-center py-4">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
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
          Error loading match history: {error?.error || usersError?.error || 'Unknown error'}
        </div>
      </DashboardCard>
    );
  }

  return (
    <DashboardCard title={title}>
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
        loading={isLoading}
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

