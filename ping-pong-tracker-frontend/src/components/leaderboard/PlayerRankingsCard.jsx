import React, { useContext, useMemo } from "react";
import { Badge, Pagination } from "react-bootstrap";
import { AuthContext } from "../../contexts/AuthContext";
import {
  useGetLeaderboardDataQuery,
  useGetAllUsersQuery,
} from "../../store/slices/apiSlice";
import DashboardCard from "../common/Card";
import GenericTable from "../common/Table/GenericTable";
import UserAvatar from "../common/UserAvatar";
import useLeaderboardFilters from "../../hooks/useLeaderboardFilters";
import LeaderboardFilters from "./LeaderboardFilters";

const PlayerRankingsCard = ({
  title = "Player Rankings",
  showFilters = true,
  defaultPageSize = 10,
}) => {
  const { currentUser } = useContext(AuthContext);

  // Filter hook
  const {
    search,
    winRateRange,
    matchesMin,
    streakMin,
    timePeriod,
    page,
    pageSize,
    handleSearchChange,
    handleWinRateRangeChange,
    handleMatchesMinChange,
    handleStreakMinChange,
    handleTimePeriodChange,
    handlePageChange,
    resetFilters,
    hasActiveFilters,
    filterParams,
    paginationParams,
  } = useLeaderboardFilters();

  // Data fetching
  const {
    data: leaderboardResponse,
    error: leaderboardError,
    isLoading: leaderboardLoading,
  } = useGetLeaderboardDataQuery({
    filters: filterParams,
    pagination: paginationParams,
  });

  console.log("🔍 DEBUG - Leaderboard Query State:", {
    leaderboardResponse,
    leaderboardError,
    leaderboardLoading,
    filterParams,
    paginationParams,
  });

  const {
    data: allUsers,
    error: usersError,
    isLoading: usersLoading,
  } = useGetAllUsersQuery();

  // Process data for table
  //   const { tableData, pagination } = useMemo(() => {
  //     if (!leaderboardResponse?.leaderboard) {
  //       return { tableData: [], pagination: null };
  //     }

  //     const processedData = leaderboardResponse.leaderboard.map((player) => {
  //       const user = allUsers?.[player.playerId];
  //       const isCurrentUser = currentUser?.uid === player.playerId;

  //       return {
  //         id: player.playerId,
  //         rank: player.rank,
  //         player: {
  //           id: player.playerId,
  //           name: user?.displayName || user?.name || "Unknown Player",
  //           avatar: user?.photoURL || null,
  //           isCurrentUser,
  //         },
  //         matches: player.totalMatches,
  //         winRate: `${Math.round(player.winRate * 100)}%`,
  //         record: `${player.wins}-${player.losses}`,
  //         streak: player.currentStreak,
  //         score: player.score,
  //       };
  //     });

  //     return {
  //       tableData: processedData,
  //       pagination: leaderboardResponse.pagination,
  //     };
  //   }, [leaderboardResponse, allUsers, currentUser]);
  const { tableData, pagination } = useMemo(() => {
    if (!leaderboardResponse?.leaderboard) {
      return { tableData: [], pagination: null };
    }

    const processedData = leaderboardResponse.leaderboard.map((player) => {
      const user = allUsers?.[player.playerId];
      const isCurrentUser = currentUser?.uid === player.playerId;
      return {
        id: player.playerId,
        rank: `#${player.rank}${isCurrentUser ? " (You)" : ""}`,
        playerName: user?.displayName || user?.name || "Unknown Player",
        matches: player.totalMatches,
        winRate: `${Math.round(player.winRate * 100)}%`,
        record: `${player.wins}-${player.losses}`,
        streak: player.currentStreak,
        score: Math.round(player.score),
      };
    });

    return {
      tableData: processedData,
      pagination: leaderboardResponse.pagination,
    };
  }, [leaderboardResponse, allUsers, currentUser]);

  // Table columns configuration
  const columns = useMemo(
    () => [
      {
        accessor: "rank",
        header: "Rank",
        sortable: true,
        Cell: ({ row }) => {
          const isCurrentUser = currentUser?.uid === row.id;
          const rankNumber = row.rank.replace("#", "").replace(" (You)", "");
          return (
            <div className="fw-bold">
              #{rankNumber}
              {isCurrentUser && (
                <Badge bg="success" className="ms-2">
                  You
                </Badge>
              )}
            </div>
          );
        },
      },
      {
        accessor: "playerName",
        header: "Player",
        sortable: true,
        Cell: ({ row }) => {
          const user = allUsers?.[row.id];
          const isCurrentUser = currentUser?.uid === row.id;
          return (
            <div className="d-flex align-items-center">
              <UserAvatar
                user={{
                  photoURL: user?.photoURL || null,
                  displayName: row.playerName,
                }}
                size="sm"
                className="me-2"
              />
              <span className={isCurrentUser ? "fw-bold text-success" : ""}>
                {row.playerName}
              </span>
            </div>
          );
        },
      },
      {
        accessor: "matches",
        header: "Matches",
        sortable: true,
        Cell: ({ row }) => <span className="fw-semibold">{row.matches}</span>,
      },
      {
        accessor: "winRate",
        header: "Win Rate",
        sortable: true,
        Cell: ({ row }) => {
          const rate = parseInt(row.winRate);
          const variant =
            rate >= 70 ? "success" : rate >= 50 ? "warning" : "danger";
          return <Badge bg={variant}>{row.winRate}</Badge>;
        },
      },
      {
        accessor: "record",
        header: "Record",
        sortable: false,
        Cell: ({ row }) => <span className="font-monospace">{row.record}</span>,
      },
      {
        accessor: "streak",
        header: "Streak",
        sortable: true,
        Cell: ({ row }) => {
          if (row.streak === 0) return <span className="text-muted">0</span>;
          const variant =
            row.streak >= 5 ? "success" : row.streak >= 3 ? "warning" : "info";
          return <Badge bg={variant}>{row.streak}</Badge>;
        },
      },
      {
        accessor: "score",
        header: "Score",
        sortable: true,
        Cell: ({ row }) => <span className="fw-bold">{row.score}</span>,
      },
    ],
    [allUsers, currentUser]
  );

  // Add this right after the useMemo that creates tableData
  console.log("🔍 DEBUG - Table Data Processing:", {
    leaderboardResponse,
    allUsers,
    currentUser,
    tableData,
    pagination,
  });

  // Loading and error states
  const isLoading = leaderboardLoading || usersLoading;
  const error = leaderboardError || usersError;

  // Pagination component
  const renderPagination = () => {
    if (!pagination || pagination.totalPages <= 1) return null;

    const pages = [];
    const maxVisiblePages = 5;
    const startPage = Math.max(
      1,
      pagination.currentPage - Math.floor(maxVisiblePages / 2)
    );
    const endPage = Math.min(
      pagination.totalPages,
      startPage + maxVisiblePages - 1
    );

    // Previous button
    pages.push(
      <Pagination.Prev
        key="prev"
        onClick={() => handlePageChange(pagination.currentPage - 1)}
        disabled={!pagination.hasPreviousPage}
      />
    );

    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <Pagination.Item
          key={i}
          active={i === pagination.currentPage}
          onClick={() => handlePageChange(i)}
        >
          {i}
        </Pagination.Item>
      );
    }

    // Next button
    pages.push(
      <Pagination.Next
        key="next"
        onClick={() => handlePageChange(pagination.currentPage + 1)}
        disabled={!pagination.hasNextPage}
      />
    );

    return (
      <div className="d-flex justify-content-center mt-3">
        <Pagination>{pages}</Pagination>
      </div>
    );
  };

  return (
    <DashboardCard
      title={title}
      footerAction={
        pagination && (
          <small className="text-muted">
            Showing {(pagination.currentPage - 1) * pagination.pageSize + 1} to{" "}
            {Math.min(
              pagination.currentPage * pagination.pageSize,
              pagination.totalCount
            )}{" "}
            of {pagination.totalCount} players
          </small>
        )
      }
    >
      {showFilters && (
        <LeaderboardFilters
          search={search}
          winRateRange={winRateRange}
          matchesMin={matchesMin}
          streakMin={streakMin}
          timePeriod={timePeriod}
          onSearchChange={handleSearchChange}
          onWinRateRangeChange={handleWinRateRangeChange}
          onMatchesMinChange={handleMatchesMinChange}
          onStreakMinChange={handleStreakMinChange}
          onTimePeriodChange={handleTimePeriodChange}
          onResetFilters={resetFilters}
          hasActiveFilters={hasActiveFilters}
        />
      )}

      {console.log("🔍 DEBUG - Passing to GenericTable:", {
        columns,
        tableData,
        loading: isLoading,
        error,
        emptyMessage: "No players found matching your criteria.",
      })}

      <GenericTable
        columns={columns}
        data={tableData}
        loading={isLoading}
        error={error}
        emptyMessage="No players found matching your criteria."
      />

      {renderPagination()}
    </DashboardCard>
  );
};

export default PlayerRankingsCard;
