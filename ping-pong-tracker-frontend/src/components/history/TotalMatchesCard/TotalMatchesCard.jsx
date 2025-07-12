// src/components/history/TotalMatchesCard.jsx
import React, { useContext } from 'react';
import { AuthContext } from '../../../contexts/AuthContext';
import { useGetUserMatchHistoryQuery } from '../../../store/slices/apiSlice';
import DashboardCard from '../../common/Card';

const TotalMatchesCard = ({ title = "Total Matches" }) => {
  const { currentUser } = useContext(AuthContext);

  // Fetch user's match history (without pagination to get total count)
  const { 
    data: matchHistoryResponse, 
    error, 
    isLoading 
  } = useGetUserMatchHistoryQuery({
    userId: currentUser?.uid,
    filters: {
      result: 'all',
      startDate: null,
      endDate: null,
      sortBy: 'date',
      sortOrder: 'desc'
    },
    pagination: { page: 1, pageSize: 1000 } // Large page size to get total count
  }, {
    skip: !currentUser?.uid
  });

  // Calculate total matches
  const totalMatches = matchHistoryResponse?.pagination?.totalCount || 0;

  if (isLoading) {
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

  if (error) {
    return (
      <DashboardCard title={title}>
        <div className="alert alert-danger" role="alert">
          Error loading match count
        </div>
      </DashboardCard>
    );
  }

  return (
    <DashboardCard title={title}>
      <div className="text-center py-3">
        <h1 className="display-4 fw-bold text-primary mb-2">{totalMatches}</h1>
        <p className="text-muted mb-0">Matches Played</p>
        {totalMatches > 0 && (
          <small className="text-muted">
            Keep playing to improve your ranking!
          </small>
        )}
      </div>
    </DashboardCard>
  );
};

export default TotalMatchesCard;
