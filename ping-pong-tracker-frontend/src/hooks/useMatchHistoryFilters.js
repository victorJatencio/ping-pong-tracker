import { useState, useMemo, useCallback } from 'react';

const useMatchHistoryFilters = () => {
  // Filter states
  const [result, setResult] = useState('all'); // 'all', 'won', 'lost'
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // Pagination states
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filter handlers
  const handleResultChange = useCallback((newResult) => {
    setResult(newResult);
    setPage(1); // Reset to first page when filter changes
  }, []);

  const handleStartDateChange = useCallback((date) => {
    setStartDate(date);
    setPage(1); // Reset to first page when filter changes
  }, []);

  const handleEndDateChange = useCallback((date) => {
    setEndDate(date);
    // Ensure end date is not before start date
    if (startDate && date && date < startDate) {
      setStartDate(date);
    }
    setPage(1); // Reset to first page when filter changes
  }, [startDate]);

  const handleSortChange = useCallback((field, order) => {
    setSortBy(field);
    setSortOrder(order);
    setPage(1); // Reset to first page when sort changes
  }, []);

  // Pagination handlers
  const handlePageChange = useCallback((newPage) => {
    setPage(newPage);
  }, []);

  const handlePageSizeChange = useCallback((newPageSize) => {
    setPageSize(newPageSize);
    setPage(1); // Reset to first page when page size changes
  }, []);

  // Reset filters
  const resetFilters = useCallback(() => {
    setResult('all');
    setStartDate(null);
    setEndDate(null);
    setSortBy('date');
    setSortOrder('desc');
    setPage(1);
  }, []);

  // Memoized filter parameters for API call
  const filterParams = useMemo(() => ({
    result,
    startDate,
    endDate,
    sortBy,
    sortOrder
  }), [result, startDate, endDate, sortBy, sortOrder]);

  // Memoized pagination parameters for API call
  const paginationParams = useMemo(() => ({
    page,
    pageSize
  }), [page, pageSize]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return result !== 'all' || startDate !== null || endDate !== null;
  }, [result, startDate, endDate]);

  return {
    // Filter states
    result,
    startDate,
    endDate,
    sortBy,
    sortOrder,
    
    // Pagination states
    page,
    pageSize,
    
    // Filter handlers
    handleResultChange,
    handleStartDateChange,
    handleEndDateChange,
    handleSortChange,
    
    // Pagination handlers
    handlePageChange,
    handlePageSizeChange,
    
    // Utility functions
    resetFilters,
    
    // Computed values
    filterParams,
    paginationParams,
    hasActiveFilters
  };
};

export default useMatchHistoryFilters;

