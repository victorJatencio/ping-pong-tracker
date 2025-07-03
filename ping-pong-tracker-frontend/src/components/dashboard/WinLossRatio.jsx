import React, { useContext, useMemo } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { AuthContext } from '../../contexts/AuthContext';
import { useGetPlayerStatsFromBackendQuery } from '../../store/slices/apiSlice';
import './WinLossRatio.scss';

const WinLossRatio = () => {
  const { currentUser } = useContext(AuthContext);
  
  const {
    data: playerStats,
    isLoading,
    error,
    refetch
  } = useGetPlayerStatsFromBackendQuery(currentUser?.uid, {
    skip: !currentUser?.uid,
  });

  // Calculate chart data from player stats
  const chartData = useMemo(() => {
    if (!playerStats) {
      return null;
    }

    const wins = playerStats.totalWins || 0;
    const losses = playerStats.totalLosses || 0;
    const total = wins + losses;

    if (total === 0) {
      return null;
    }

    return {
      labels: ["Wins", "Losses"],
      datasets: [
        {
          data: [wins, losses],
          backgroundColor: ["#28a745", "#dc3545"],
          borderWidth: 0,
          cutout: "70%",
        },
      ],
    };
  }, [playerStats]);

  // Chart options
  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            const label = context.label || "";
            const value = context.parsed;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
            return `${label}: ${value} (${percentage}%)`;
          },
        },
      },
    },
  }), []);

  // Calculate win percentage
  const winPercentage = useMemo(() => {
    if (!playerStats) return 0;
    
    const wins = playerStats.totalWins || 0;
    const losses = playerStats.totalLosses || 0;
    const total = wins + losses;
    
    if (total === 0) return 0;
    
    return ((wins / total) * 100).toFixed(1);
  }, [playerStats]);

  if (isLoading) {
    return (
      <div className="win-loss-ratio">
        <div className="win-loss-ratio__header">
          <h3 className="win-loss-ratio__title">Win/Loss Ratio</h3>
        </div>
        <div className="win-loss-ratio__content">
          <div className="win-loss-ratio__loading">
            <div className="loading-spinner"></div>
            <span>Loading stats...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="win-loss-ratio">
        <div className="win-loss-ratio__header">
          <h3 className="win-loss-ratio__title">Win/Loss Ratio</h3>
        </div>
        <div className="win-loss-ratio__content">
          <div className="win-loss-ratio__error">
            <p>Failed to load stats</p>
            <button 
              className="retry-button"
              onClick={refetch}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!playerStats || !chartData) {
    return (
      <div className="win-loss-ratio">
        <div className="win-loss-ratio__header">
          <h3 className="win-loss-ratio__title">Win/Loss Ratio</h3>
        </div>
        <div className="win-loss-ratio__content">
          <div className="win-loss-ratio__empty">
            <p>No matches played yet</p>
            <span>Play some matches to see your win/loss ratio!</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="win-loss-ratio">
      <div className="win-loss-ratio__header">
        <h3 className="win-loss-ratio__title">Win/Loss Ratio</h3>
      </div>
      
      <div className="win-loss-ratio__content">
        <div className="win-loss-ratio__chart-container">
          <div className="win-loss-ratio__chart">
            <Doughnut data={chartData} options={chartOptions} />
          </div>
          
          <div className="win-loss-ratio__percentage">
            <div className="win-loss-ratio__percentage-value">
              {winPercentage}%
            </div>
            <div className="win-loss-ratio__percentage-label">
              Win Rate
            </div>
          </div>
        </div>
        
        <div className="win-loss-ratio__legend">
          <div className="win-loss-ratio__legend-item">
            <div className="win-loss-ratio__legend-color win-loss-ratio__legend-color--wins"></div>
            <div className="win-loss-ratio__legend-info">
              <span className="win-loss-ratio__legend-label">Wins</span>
              <span className="win-loss-ratio__legend-value">{playerStats.totalWins || 0}</span>
            </div>
          </div>
          
          <div className="win-loss-ratio__legend-item">
            <div className="win-loss-ratio__legend-color win-loss-ratio__legend-color--losses"></div>
            <div className="win-loss-ratio__legend-info">
              <span className="win-loss-ratio__legend-label">Losses</span>
              <span className="win-loss-ratio__legend-value">{playerStats.totalLosses || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WinLossRatio;

