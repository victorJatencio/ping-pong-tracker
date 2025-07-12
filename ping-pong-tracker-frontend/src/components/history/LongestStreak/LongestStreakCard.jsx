// src/components/history/LongestStreakCard.jsx
import React, { useContext, useMemo } from 'react';
import { AuthContext } from '../../../contexts/AuthContext';
import { useGetUserMatchHistoryQuery } from '../../../store/slices/apiSlice';
import DashboardCard from '../../common/Card';

const LongestStreakCard = ({ title = "Longest Streak" }) => {
  const { currentUser } = useContext(AuthContext);

  // Fetch user's match history to calculate longest streak
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
      sortOrder: 'asc' // Order by oldest first to calculate streak chronologically
    },
    pagination: { page: 1, pageSize: 1000 } // Get all matches for accurate calculation
  }, {
    skip: !currentUser?.uid
  });

  // Calculate longest winning streak
  const longestStreak = useMemo(() => {
    if (!matchHistoryResponse?.matches || matchHistoryResponse.matches.length === 0) {
      return 0;
    }

    const matches = matchHistoryResponse.matches;
    let currentStreak = 0;
    let maxStreak = 0;

    // Sort matches by date to ensure chronological order
    const sortedMatches = [...matches].sort((a, b) => {
      const dateA = new Date(a.completedDate);
      const dateB = new Date(b.completedDate);
      return dateA - dateB;
    });

    // Calculate streaks
    for (const match of sortedMatches) {
      if (match.winnerId === currentUser?.uid) {
        // User won this match - increment current streak
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        // User lost this match - reset current streak
        currentStreak = 0;
      }
    }

    return maxStreak;
  }, [matchHistoryResponse, currentUser]);

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
            {longestStreak === 0 ? '😐' : longestStreak < 3 ? '🔥' : longestStreak < 5 ? '🚀' : longestStreak < 10 ? '⚡' : '👑'}
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

