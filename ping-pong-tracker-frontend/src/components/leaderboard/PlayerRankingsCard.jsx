import React, { useContext, useMemo, useState, useEffect } from "react";
import { Badge, Pagination } from "react-bootstrap";
import { AuthContext } from "../../contexts/AuthContext";
import {
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
  } = useLeaderboardFilters();

  // Get all users
  const {
    data: allUsers = {},
    error: usersError,
    isLoading: usersLoading,
  } = useGetAllUsersQuery();

  // State for player data
  const [allPlayersData, setAllPlayersData] = useState([]);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [statsError, setStatsError] = useState(null);

  // Fetch stats for all users
  useEffect(() => {
    const fetchAllPlayersData = async () => {
      if (!allUsers || Object.keys(allUsers).length === 0) {
        return;
      }

      setIsLoadingStats(true);
      setStatsError(null);

      try {
        const userIds = Object.keys(allUsers);
        const playersWithStats = [];

        // Fetch stats for each user
        for (const userId of userIds) {
          try {
            const response = await fetch(`http://localhost:5000/api/stats/player/${userId}`);
            
            if (response.ok) {
              const result = await response.json();
              const user = allUsers[userId];
              
              if (result.success && user && result.data.gamesPlayed > 0) {
                const stats = result.data;
                playersWithStats.push({
                  id: userId,
                  name: user.displayName || user.email?.split('@')[0] || 'Unknown Player',
                  avatar: user.photoURL,
                  useDefaultAvatar: user.useDefaultAvatar,
                  wins: stats.totalWins || 0,
                  totalMatches: stats.gamesPlayed || 0,
                  losses: stats.totalLosses || 0,
                  winRate: stats.gamesPlayed > 0 ? (stats.totalWins / stats.gamesPlayed) : 0,
                  currentStreak: stats.winStreak || 0,
                  maxWinStreak: stats.maxWinStreak || 0,
                  // Calculate score (simple formula: wins * 10 + win rate * 100)
                  score: (stats.totalWins * 10) + ((stats.totalWins / stats.gamesPlayed) * 100)
                });
              }
            } else {
              console.warn(`Failed to fetch stats for user ${userId}:`, response.status);
            }
          } catch (error) {
            console.warn(`Error fetching stats for user ${userId}:`, error);
          }
        }

        // Sort players by wins (primary), then by win rate (secondary)
        const sortedPlayers = playersWithStats.sort((a, b) => {
          if (b.wins !== a.wins) {
            return b.wins - a.wins;
          }
          if (b.winRate !== a.winRate) {
            return b.winRate - a.winRate;
          }
          return a.totalMatches - b.totalMatches;
        });

        // Add rank to each player
        const playersWithRank = sortedPlayers.map((player, index) => ({
          ...player,
          rank: index + 1
        }));

        setAllPlayersData(playersWithRank);
      } catch (error) {
        console.error('Error fetching players data:', error);
        setStatsError(error);
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchAllPlayersData();
  }, [allUsers]);

  // Apply filters and pagination to the data
  const { tableData, pagination } = useMemo(() => {
    if (!allPlayersData.length) {
      return { tableData: [], pagination: null };
    }

    let filteredData = [...allPlayersData];

    // Apply search filter
    if (search.trim()) {
      filteredData = filteredData.filter(player =>
        player.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Apply win rate filter
    if (winRateRange[0] > 0 || winRateRange[1] < 100) {
      filteredData = filteredData.filter(player => {
        const winRatePercent = player.winRate * 100;
        return winRatePercent >= winRateRange[0] && winRatePercent <= winRateRange[1];
      });
    }

    // Apply matches minimum filter
    if (matchesMin > 0) {
      filteredData = filteredData.filter(player => player.totalMatches >= matchesMin);
    }

    // Apply streak minimum filter
    if (streakMin > 0) {
      filteredData = filteredData.filter(player => player.currentStreak >= streakMin);
    }

    // Calculate pagination
    const totalCount = filteredData.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedData = filteredData.slice(startIndex, endIndex);

    // Process data for table
    const processedData = paginatedData.map((player) => {
      const isCurrentUser = currentUser?.uid === player.id;
      return {
        id: player.id,
        rank: `#${player.rank}${isCurrentUser ? " (You)" : ""}`,
        playerName: player.name,
        matches: player.totalMatches,
        winRate: `${Math.round(player.winRate * 100)}%`,
        record: `${player.wins}-${player.losses}`,
        streak: player.currentStreak,
        score: Math.round(player.score),
      };
    });

    const paginationInfo = totalPages > 1 ? {
      currentPage: page,
      totalPages,
      totalCount,
      pageSize,
      hasPreviousPage: page > 1,
      hasNextPage: page < totalPages
    } : null;

    return {
      tableData: processedData,
      pagination: paginationInfo,
    };
  }, [allPlayersData, search, winRateRange, matchesMin, streakMin, page, pageSize, currentUser]);

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
                  useDefaultAvatar: user?.useDefaultAvatar
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

  // Loading and error states
  const isLoading = usersLoading || isLoadingStats;
  const error = usersError || statsError;

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

