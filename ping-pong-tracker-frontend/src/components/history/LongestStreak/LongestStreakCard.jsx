// src/components/history/LongestStreakCard.jsx
// Fixed version using the EXACT same data extraction logic as MonthlySummaryCard

import React, { useContext, useMemo } from 'react';
import { AuthContext } from '../../../contexts/AuthContext';
import { useGetPlayerStatsFromBackendQuery } from '../../../store/slices/apiSlice';
import DashboardCard from '../../common/Card';

const LongestStreakCard = ({ title = "Longest Streak" }) => {
  const { currentUser } = useContext(AuthContext);

  // ✅ EXACT SAME QUERY AS MONTHLYSUMMARYCARD
  const { 
    data: userStats, 
    error, 
    isLoading 
  } = useGetPlayerStatsFromBackendQuery(currentUser?.uid, {
    skip: !currentUser?.uid
  });

  // ✅ EXACT SAME DATA EXTRACTION LOGIC AS MONTHLYSUMMARYCARD
  const streakStats = useMemo(() => {
    // Handle the case where userStats might be the full response object
    const stats = userStats?.data || userStats;
    
    console.log('🔍 LongestStreakCard - Raw userStats:', userStats);
    console.log('🔍 LongestStreakCard - Processed stats:', stats);

    if (!stats) {
      return {
        maxStreak: 0,
        currentStreak: 0
      };
    }

    const result = {
      maxStreak: stats.maxWinStreak || 0,
      currentStreak: stats.winStreak || 0
    };

    console.log('🔍 LongestStreakCard - Final streakStats:', result);
    console.log('🔍 LongestStreakCard - Available fields:', Object.keys(stats));
    
    return result;
  }, [userStats]);

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
    if (streak === 0) return 'text-primary';
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
          <div>Error loading streak data</div>
          <small className="text-muted">Error: {error.message || 'Unknown error'}</small>
        </div>
      </DashboardCard>
    );
  }

  return (
    <DashboardCard title={title}>
      <div className="text-center py-3">

        <h1 className={`display-4 fw-bold mb-2 ${getStreakColor(streakStats.maxStreak)}`}>
          {streakStats.maxStreak}
        </h1>

        {/* Streak Description */}
        <p className="text-muted mb-1">
          {getStreakDescription(streakStats.maxStreak)}
        </p>
      </div>
    </DashboardCard>
  );
};

export default LongestStreakCard;

