import { useState, useMemo, useCallback } from 'react';

const useLeaderboardFilters = () => {
  // Filter states
  const [search, setSearch] = useState('');
  const [winRateRange, setWinRateRange] = useState([0, 100]);
  const [matchesMin, setMatchesMin] = useState('');
  const [streakMin, setStreakMin] = useState('');
  const [timePeriod, setTimePeriod] = useState('all-time');
  const [sortBy, setSortBy] = useState('rank');
  const [sortOrder, setSortOrder] = useState('asc');
  
  // Pagination states
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filter change handlers
  const handleSearchChange = useCallback((value) => {
    setSearch(value);
    setPage(1); // Reset to first page when filtering
  }, []);

  const handleWinRateRangeChange = useCallback((range) => {
    setWinRateRange(range);
    setPage(1);
  }, []);

  const handleMatchesMinChange = useCallback((value) => {
    setMatchesMin(value);
    setPage(1);
  }, []);

  const handleStreakMinChange = useCallback((value) => {
    setStreakMin(value);
    setPage(1);
  }, []);

  const handleTimePeriodChange = useCallback((value) => {
    setTimePeriod(value);
    setPage(1);
  }, []);

  const handleSortChange = useCallback((field, order) => {
    setSortBy(field);
    setSortOrder(order);
    setPage(1);
  }, []);

  const handlePageChange = useCallback((newPage) => {
    setPage(newPage);
  }, []);

  const handlePageSizeChange = useCallback((newPageSize) => {
    setPageSize(newPageSize);
    setPage(1);
  }, []);

  // Reset filters
  const resetFilters = useCallback(() => {
    setSearch('');
    setWinRateRange([0, 100]);
    setMatchesMin('');
    setStreakMin('');
    setTimePeriod('all-time');
    setSortBy('rank');
    setSortOrder('asc');
    setPage(1);
  }, []);

  // Memoized filter parameters for the API
  const filterParams = useMemo(() => ({
    search: search.trim(),
    winRateMin: winRateRange[0],
    winRateMax: winRateRange[1],
    matchesMin: matchesMin ? parseInt(matchesMin) : 0,
    streakMin: streakMin ? parseInt(streakMin) : 0,
    timePeriod,
    sortBy,
    sortOrder
  }), [search, winRateRange, matchesMin, streakMin, timePeriod, sortBy, sortOrder]);

  // Memoized pagination parameters
  const paginationParams = useMemo(() => ({
    page,
    pageSize
  }), [page, pageSize]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return search.trim() !== '' ||
           winRateRange[0] > 0 ||
           winRateRange[1] < 100 ||
           matchesMin !== '' ||
           streakMin !== '' ||
           timePeriod !== 'all-time';
  }, [search, winRateRange, matchesMin, streakMin, timePeriod]);

  return {
    // Filter states
    search,
    winRateRange,
    matchesMin,
    streakMin,
    timePeriod,
    sortBy,
    sortOrder,
    
    // Pagination states
    page,
    pageSize,
    
    // Filter change handlers
    handleSearchChange,
    handleWinRateRangeChange,
    handleMatchesMinChange,
    handleStreakMinChange,
    handleTimePeriodChange,
    handleSortChange,
    handlePageChange,
    handlePageSizeChange,
    
    // Utility functions
    resetFilters,
    hasActiveFilters,
    
    // API parameters
    filterParams,
    paginationParams
  };
};

export default useLeaderboardFilters;