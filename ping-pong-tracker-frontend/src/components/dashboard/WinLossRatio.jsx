import React, { useContext, useMemo } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { AuthContext } from '../../contexts/AuthContext';
import { useGetPlayerStatsFromBackendQuery } from '../../store/slices/apiSlice';
import { RiPingPongFill } from "react-icons/ri";
import CardMessage from "../../components/common/cardMessages";

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

  // ✅ CUSTOMIZABLE CHART COLORS
  const chartColors = {
    // Option 1: Brand colors (using your app's theme)
    wins: '#5C6BC0',      // Your brand blue
    losses: '#bfd7e3',    // Red for losses
    
    // Option 2: Success/Danger colors
    // wins: '#4caf50',      // Green for wins
    // losses: '#f44336',    // Red for losses
    
    // Option 3: Custom gradient-inspired colors
    // wins: '#ff6b9d',      // Pink (from your gradient button)
    // losses: '#ff8a56',    // Orange (from your gradient button)
    
    // Option 4: Professional blue tones
    // wins: '#2196f3',      // Blue
    // losses: '#607d8b',    // Blue-gray
    
    // Option 5: Modern purple/pink theme
    // wins: '#9c27b0',      // Purple
    // losses: '#e91e63',    // Pink
  };

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
          backgroundColor: [chartColors.wins, chartColors.losses],
          borderWidth: 0,
          cutout: "70%",
          hoverBackgroundColor: [
            chartColors.wins + 'CC', // Add transparency on hover
            chartColors.losses + 'CC'
          ],
          hoverBorderWidth: 2,
          hoverBorderColor: '#ffffff',
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
        // ✅ OPTIONAL: Customize tooltip appearance
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: chartColors.wins,
        borderWidth: 1,
      },
    },
    // ✅ OPTIONAL: Add animation
    animation: {
      animateRotate: true,
      animateScale: true,
      duration: 1000,
    },
    // ✅ OPTIONAL: Add interaction
    interaction: {
      intersect: false,
      mode: 'index',
    },
  }), [chartColors]);

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
      <div className="card">
        <div className="card-body">
          <h5 className="card-title">Win/Loss Ratio</h5>
          <div className="loading-spinner"></div>
          <p className="card-text">
            <span>Loading stats...</span>
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    
    return (
      <div className="card">
        <div className="card-body">
          <h5 className="card-title">Win/Loss Ratio</h5>
          <div className="loading-spinner"></div>
          <p className="card-text">
            <span>Failed to load stats...</span>
          </p>
        </div>
      </div>
    )
  }

  if (!playerStats || !chartData) {

    return (
      <div className="card win-loss-ratio">
        <div className="card-body">
          <h5 className="card-title">Win/Loss Ratio</h5>

          <div className='win-loss-ratio__content'>
            <div className="loading-spinner"></div>

            <CardMessage
              icon= {<RiPingPongFill />}
              text="No matches played yet. Play some matches to see your win/loss ratio!"
            />

          </div>
        </div>
      </div>
    )
  }


  return (
    <div className="card win-loss-ratio">
        <div className="card-body">
          <h5 className="card-title">Win/Loss Ratio</h5>

          <div className='win-loss-ratio__content'>
            <div className="win-loss-ratio__chart">
              <Doughnut data={chartData} options={chartOptions} />
            </div>
          </div>

          <div className='win-loss-ratio__percentage'>
            <div className='win-loss-ratio__percentage-value'>
              {winPercentage}%
            </div>
            <div className='win-loss-ratio__percentage-label'>
              Win Rate
            </div>
          </div>

          <div className='win-loss-ratio__legend'>
          <div className='win-loss-ratio__legend-item'>
            <div className='win-loss-ratio__legend-color win-loss-ratio__legend-color--wins' style={{ backgroundColor: chartColors.wins }}></div>
            <div className='win-loss-ratio__legend-info'>
              <span className='win-loss-ratio__legend-label'>Wins</span>
              <span className='win-loss-ratio__legend-value'>{playerStats.totalWins || 0}</span>
            </div>
          </div>
          
          <div className='win-loss-ratio__legend-item'>
            <div className='win-loss-ratio__legend-color win-loss-ratio__legend-color--losses' style={{ backgroundColor: chartColors.losses }}></div>
            <div className='win-loss-ratio__legend-info'>
              <span className='win-loss-ratio__legend-label'>Losses</span>
              <span className='win-loss-ratio__legend-value'>{playerStats.totalLosses || 0}</span>
            </div>
          </div>
        </div>

        </div>
      </div>
  )
};

export default WinLossRatio;

