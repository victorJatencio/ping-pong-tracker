// src/components/history/LongestStreakCard.jsx
import React, { useContext } from 'react';
import { AuthContext } from '../../../contexts/AuthContext';
import { useGetPlayerStatsFromBackendQuery } from '../../../store/slices/apiSlice';
import DashboardCard from '../../common/Card';

const LongestStreakCard = ({ title = "Longest Streak" }) => {
  const { currentUser } = useContext(AuthContext);

  // Use the working stats endpoint that we've already fixed
  const { 
    data: statsResponse, 
    error, 
    isLoading 
  } = useGetPlayerStatsFromBackendQuery(currentUser?.uid, {
    skip: !currentUser?.uid
  });

  // Get longest streak from the backend stats
  const longestStreak = statsResponse?.data?.maxWinStreak || 0;

  // Get streak description
  const getStreakDescription = (streak) => {
    if (streak === 0) return "No winning streak yet";
    if (streak === 1) return "Single win";
    if (streak < 5) return "Good streak!";
    if (streak < 10) return "Great streak!";
    return "Amazing streak!";
  };

  // Get streak color based on length
  const getStreakColor = (streak) => {
    if (streak === 0) return 'text-muted';
    if (streak < 3) return 'text-success';
    if (streak < 5) return 'text-warning';
    if (streak < 10) return 'text-info';
    return 'text-danger'; // For very long streaks
  };

  // Get streak icon based on length
  const getStreakIcon = (streak) => {
    if (streak === 0) return '😐';
    if (streak < 3) return '🔥';
    if (streak < 5) return '🚀';
    if (streak < 10) return '⚡';
    return '👑';
  };

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
          Error loading streak data
        </div>
      </DashboardCard>
    );
  }

  return (
    <DashboardCard title={title}>
      <div className="text-center py-3">
        {/* Streak Icon */}
        <div className="mb-2">
          <span className="fs-1">
            {getStreakIcon(longestStreak)}
          </span>
        </div>

        {/* Streak Number */}
        <h1 className={`display-4 fw-bold mb-2 ${getStreakColor(longestStreak)}`}>
          {longestStreak}
        </h1>

        {/* Streak Description */}
        <p className="text-muted mb-1">
          {getStreakDescription(longestStreak)}
        </p>

        {/* Additional Info */}
        {statsResponse?.data && (
          <small className="text-muted d-block mb-2">
            Current streak: {statsResponse.data.winStreak || 0}
          </small>
        )}

        {/* Encouragement Message */}
        {longestStreak === 0 ? (
          <small className="text-muted">
            Win your first match to start a streak!
          </small>
        ) : (
          <small className="text-muted">
            Keep playing to beat your record!
          </small>
        )}
      </div>
    </DashboardCard>
  );
};

export default LongestStreakCard;

