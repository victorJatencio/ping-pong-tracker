import { useState, useMemo, useCallback } from 'react';
import { format } from 'date-fns'; // For consistent date formatting

const useMatchFilters = (currentUserId) => {
  // Filter States
  const [selectedPlayerId, setSelectedPlayerId] = useState(''); // Filter by specific opponent/player
  const [selectedStatus, setSelectedStatus] = useState('all'); // 'all', 'completed', 'scheduled', 'in-progress'
  const [selectedResult, setSelectedResult] = useState('all'); // 'all', 'won', 'lost'
  const [startDate, setStartDate] = useState(null); // Date object
  const [endDate, setEndDate] = useState(null);     // Date object
  const [showAllMatches, setShowAllMatches] = useState(false); // NEW: Toggle between user's matches and all matches

  // Pagination States
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10); // Default page size

  // Memoized filter parameters for RTK Query
  const filterParams = useMemo(() => {
    const params = {
      page,
      pageSize,
    };

    // Only include userId if NOT showing all matches
    if (!showAllMatches && currentUserId) {
      params.userId = currentUserId;
    }

    if (selectedPlayerId && selectedPlayerId !== 'all') {
      params.opponentId = selectedPlayerId;
    }
    if (selectedStatus && selectedStatus !== 'all') {
      params.status = selectedStatus;
    }
    // Only include result filter if NOT showing all matches (result is relative to current user)
    if (!showAllMatches && selectedResult && selectedResult !== 'all') {
      params.result = selectedResult;
    }
    if (startDate) {
      params.startDate = format(startDate, 'yyyy-MM-dd'); // Format to ISO string
    }
    if (endDate) {
      params.endDate = format(endDate, 'yyyy-MM-dd'); // Format to ISO string
    }

    return params;
  }, [
    currentUserId,
    selectedPlayerId,
    selectedStatus,
    selectedResult,
    startDate,
    endDate,
    showAllMatches, // NEW DEPENDENCY
    page,
    pageSize,
  ]);

  // Callbacks for updating filters and resetting page
  const handlePlayerChange = useCallback((id) => {
    setSelectedPlayerId(id);
    setPage(1); // Reset to first page on filter change
  }, []);

  const handleStatusChange = useCallback((status) => {
    setSelectedStatus(status);
    setPage(1);
  }, []);

  const handleResultChange = useCallback((result) => {
    setSelectedResult(result);
    setPage(1);
  }, []);

  const handleStartDateChange = useCallback((date) => {
    setStartDate(date);
    setPage(1);
  }, []);

  const handleEndDateChange = useCallback((date) => {
    setEndDate(date);
    setPage(1);
  }, []);

  // NEW: Handle show all matches toggle
  const handleShowAllMatchesChange = useCallback((checked) => {
    setShowAllMatches(checked);
    // Reset result filter when switching to "all matches" mode since result is user-specific
    if (checked) {
      setSelectedResult('all');
    }
    setPage(1); // Reset to first page
  }, []);

  const handlePageChange = useCallback((newPage) => {
    setPage(newPage);
  }, []);

  const handlePageSizeChange = useCallback((newSize) => {
    setPageSize(newSize);
    setPage(1); // Reset to first page on page size change
  }, []);

  // Function to reset all filters
  const resetFilters = useCallback(() => {
    setSelectedPlayerId('');
    setSelectedStatus('all');
    setSelectedResult('all');
    setStartDate(null);
    setEndDate(null);
    setShowAllMatches(false); // NEW: Reset to "My Matches Only"
    setPage(1);
  }, []);

  return {
    // Filter states
    selectedPlayerId,
    selectedStatus,
    selectedResult,
    startDate,
    endDate,
    showAllMatches, // NEW RETURN VALUE
    // Pagination states
    page,
    pageSize,
    // Filter update handlers
    handlePlayerChange,
    handleStatusChange,
    handleResultChange,
    handleStartDateChange,
    handleEndDateChange,
    handleShowAllMatchesChange, // NEW RETURN VALUE
    handlePageChange,
    handlePageSizeChange,
    resetFilters,
    // Parameters for RTK Query
    filterParams,
  };
};

export default useMatchFilters;
