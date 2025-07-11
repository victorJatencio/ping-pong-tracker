// src/components/leaderboard/TotalPlayersCard.jsx
import React from 'react';
import { useGetAllUsersQuery } from '../../store/slices/apiSlice';
import DashboardCard from '../common/Card';

const TotalPlayersCard = ({ title = "Total Players" }) => {
  const { data: allUsers, error, isLoading } = useGetAllUsersQuery();

  // Calculate total players
  const totalPlayers = allUsers ? Object.keys(allUsers).length : 0;

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
          Error loading player count
        </div>
      </DashboardCard>
    );
  }

  return (
    <DashboardCard title={title}>
      <div className="text-center py-3">
        <h1 className="display-4 fw-bold text-primary mb-2">{totalPlayers}</h1>
        <p className="text-muted mb-0">Registered Players</p>
      </div>
    </DashboardCard>
  );
};

export default TotalPlayersCard;
