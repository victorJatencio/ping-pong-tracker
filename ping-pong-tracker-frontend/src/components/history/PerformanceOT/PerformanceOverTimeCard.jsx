// src/components/history/PerformanceOverTimeCard.jsx
import React, { useContext, useMemo, useState } from 'react';
import { ButtonGroup, Button } from 'react-bootstrap';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { AuthContext } from '../../../contexts/AuthContext';
import { useGetUserMatchHistoryQuery } from '../../../store/slices/apiSlice';
import DashboardCard from '../../common/Card';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const PerformanceOverTimeCard = ({ title = "Performance Over Time" }) => {
  const { currentUser } = useContext(AuthContext);
  const [timeRange, setTimeRange] = useState('3months'); // '1month', '3months', '6months', 'all'

  // Fetch user's match history
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
      sortOrder: 'asc' // Chronological order for chart
    },
    pagination: { page: 1, pageSize: 1000 } // Get all matches for analysis
  }, {
    skip: !currentUser?.uid
  });

  // Process data for chart
  const chartData = useMemo(() => {
    if (!matchHistoryResponse?.matches || matchHistoryResponse.matches.length === 0) {
      return {
        labels: [],
        datasets: []
      };
    }

    const matches = matchHistoryResponse.matches;
    
    // Filter matches based on time range
    const now = new Date();
    let startDate = new Date();
    
    switch (timeRange) {
      case '1month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case '3months':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case '6months':
        startDate.setMonth(now.getMonth() - 6);
        break;
      case 'all':
      default:
        startDate = new Date(0); // Beginning of time
        break;
    }

    const filteredMatches = matches.filter(match => {
      const matchDate = new Date(match.completedDate);
      return matchDate >= startDate;
    });

    if (filteredMatches.length === 0) {
      return {
        labels: [],
        datasets: []
      };
    }

    // Sort matches chronologically
    const sortedMatches = [...filteredMatches].sort((a, b) => {
      const dateA = new Date(a.completedDate);
      const dateB = new Date(b.completedDate);
      return dateA - dateB;
    });

    // Group matches by week for better visualization
    const weeklyData = {};
    
    sortedMatches.forEach(match => {
      const matchDate = new Date(match.completedDate);
      // Get the start of the week (Sunday)
      const weekStart = new Date(matchDate);
      weekStart.setDate(matchDate.getDate() - matchDate.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = {
          wins: 0,
          total: 0,
          date: weekStart
        };
      }
      
      weeklyData[weekKey].total++;
      if (match.winnerId === currentUser?.uid) {
        weeklyData[weekKey].wins++;
      }
    });

    // Convert to arrays for chart
    const weeks = Object.keys(weeklyData).sort();
    const labels = weeks.map(week => {
      const date = new Date(week);
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    });

    const winRates = weeks.map(week => {
      const data = weeklyData[week];
      return data.total > 0 ? Math.round((data.wins / data.total) * 100) : 0;
    });

    // Calculate running average for smoother trend line
    const runningAverage = [];
    let sum = 0;
    winRates.forEach((rate, index) => {
      sum += rate;
      runningAverage.push(Math.round(sum / (index + 1)));
    });

    return {
      labels,
      datasets: [
        {
          label: 'Weekly Win Rate',
          data: winRates,
          borderColor: 'rgb(54, 162, 235)',
          backgroundColor: 'rgba(54, 162, 235, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
        {
          label: 'Trend Line',
          data: runningAverage,
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'transparent',
          borderDash: [5, 5],
          fill: false,
          tension: 0.4,
          pointRadius: 2,
          pointHoverRadius: 4,
        }
      ]
    };
  }, [matchHistoryResponse, currentUser, timeRange]);

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 20
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${context.parsed.y}%`;
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Time Period'
        },
        grid: {
          display: false
        }
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Win Rate (%)'
        },
        min: 0,
        max: 100,
        ticks: {
          callback: function(value) {
            return value + '%';
          }
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
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
          Error loading performance data
        </div>
      </DashboardCard>
    );
  }

  if (chartData.labels.length === 0) {
    return (
      <DashboardCard title={title}>
        <div className="text-center py-4">
          <h5 className="text-muted mb-2">No Data Available</h5>
          <p className="text-muted mb-0 small">
            Play more matches to see your performance trends!
          </p>
        </div>
      </DashboardCard>
    );
  }

  return (
    <DashboardCard title={title}>
      <div className="py-3">
        {/* Time Range Selector */}
        <div className="d-flex justify-content-center mb-3">
          <ButtonGroup size="sm">
            <Button
              variant={timeRange === '1month' ? 'primary' : 'outline-primary'}
              onClick={() => setTimeRange('1month')}
            >
              1M
            </Button>
            <Button
              variant={timeRange === '3months' ? 'primary' : 'outline-primary'}
              onClick={() => setTimeRange('3months')}
            >
              3M
            </Button>
            <Button
              variant={timeRange === '6months' ? 'primary' : 'outline-primary'}
              onClick={() => setTimeRange('6months')}
            >
              6M
            </Button>
            <Button
              variant={timeRange === 'all' ? 'primary' : 'outline-primary'}
              onClick={() => setTimeRange('all')}
            >
              All
            </Button>
          </ButtonGroup>
        </div>

        {/* Chart Container */}
        <div style={{ height: '300px', position: 'relative' }}>
          <Line data={chartData} options={chartOptions} />
        </div>

        {/* Chart Legend */}
        <div className="text-center mt-3">
          <small className="text-muted">
            📈 Blue line shows weekly win rates • 📊 Red dashed line shows overall trend
          </small>
        </div>
      </div>
    </DashboardCard>
  );
};

export default PerformanceOverTimeCard;

