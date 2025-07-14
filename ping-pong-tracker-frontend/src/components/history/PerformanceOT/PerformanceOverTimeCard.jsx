// src/components/history/PerformanceOverTimeCard.jsx
import React, { useContext, useMemo, useState } from 'react';
import { ButtonGroup, Button, Row, Col } from 'react-bootstrap';
import { Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { AuthContext } from '../../../contexts/AuthContext';
import { useGetPlayerStatsFromBackendQuery } from '../../../store/slices/apiSlice';
import DashboardCard from '../../common/Card';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const PerformanceOverTimeCard = ({ title = "Performance Overview" }) => {
  const { currentUser } = useContext(AuthContext);
  const [chartType, setChartType] = useState('overview'); // 'overview', 'breakdown', 'progress'

  // Use the working stats endpoint
  const { 
    data: userStats, 
    error, 
    isLoading 
  } = useGetPlayerStatsFromBackendQuery(currentUser?.uid, {
    skip: !currentUser?.uid
  });

  // Process data for different chart types
  const chartData = useMemo(() => {
    const stats = userStats?.data || userStats;
    
    if (!stats) {
      return null;
    }

    const wins = stats.totalWins || 0;
    const losses = stats.totalLosses || 0;
    const total = stats.gamesPlayed || 0;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
    const currentStreak = stats.winStreak || 0;
    const maxStreak = stats.maxWinStreak || 0;

    switch (chartType) {
      case 'breakdown':
        // Win/Loss breakdown doughnut chart
        return {
          type: 'doughnut',
          data: {
            labels: ['Wins', 'Losses'],
            datasets: [{
              data: [wins, losses],
              backgroundColor: [
                'rgba(40, 167, 69, 0.8)',   // Success green
                'rgba(220, 53, 69, 0.8)'    // Danger red
              ],
              borderColor: [
                'rgba(40, 167, 69, 1)',
                'rgba(220, 53, 69, 1)'
              ],
              borderWidth: 2,
              hoverOffset: 4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'bottom',
                labels: {
                  padding: 20,
                  usePointStyle: true
                }
              },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    const percentage = total > 0 ? Math.round((context.parsed / total) * 100) : 0;
                    return `${context.label}: ${context.parsed} (${percentage}%)`;
                  }
                }
              }
            }
          }
        };

      case 'progress':
        // Performance metrics bar chart
        return {
          type: 'bar',
          data: {
            labels: ['Win Rate', 'Current Streak', 'Best Streak'],
            datasets: [{
              label: 'Performance Metrics',
              data: [winRate, currentStreak, maxStreak],
              backgroundColor: [
                'rgba(54, 162, 235, 0.8)',   // Primary blue
                'rgba(255, 193, 7, 0.8)',    // Warning yellow
                'rgba(220, 53, 69, 0.8)'     // Danger red
              ],
              borderColor: [
                'rgba(54, 162, 235, 1)',
                'rgba(255, 193, 7, 1)',
                'rgba(220, 53, 69, 1)'
              ],
              borderWidth: 2
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false
              },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    if (context.dataIndex === 0) {
                      return `Win Rate: ${context.parsed.y}%`;
                    }
                    return `${context.label}: ${context.parsed.y}`;
                  }
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  callback: function(value, index) {
                    if (index === 0) return value + '%';
                    return value;
                  }
                }
              }
            }
          }
        };

      default: // 'overview'
        // Performance overview with key metrics
        return {
          type: 'overview',
          stats: {
            totalMatches: total,
            wins,
            losses,
            winRate,
            currentStreak,
            maxStreak
          }
        };
    }
  }, [userStats, chartType]);

  // Get performance level
  const getPerformanceLevel = (winRate, totalMatches) => {
    if (totalMatches === 0) return { level: 'Getting Started', color: 'secondary', icon: '🎯' };
    if (winRate >= 80) return { level: 'Elite Player', color: 'danger', icon: '🏆' };
    if (winRate >= 70) return { level: 'Advanced', color: 'success', icon: '🚀' };
    if (winRate >= 60) return { level: 'Skilled', color: 'primary', icon: '👍' };
    if (winRate >= 50) return { level: 'Developing', color: 'info', icon: '📈' };
    return { level: 'Learning', color: 'warning', icon: '💪' };
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

  if (!chartData) {
    return (
      <DashboardCard title={title}>
        <div className="text-center py-4">
          <h5 className="text-muted mb-2">No Data Available</h5>
          <p className="text-muted mb-0 small">
            Play some matches to see your performance overview!
          </p>
        </div>
      </DashboardCard>
    );
  }

  const performance = getPerformanceLevel(
    chartData.stats?.winRate || 0, 
    chartData.stats?.totalMatches || 0
  );

  return (
    <DashboardCard title={title}>
      <div className="py-3">
        {/* Chart Type Selector */}
        <div className="d-flex justify-content-center mb-3">
          <ButtonGroup size="sm">
            <Button
              variant={chartType === 'overview' ? 'primary' : 'outline-primary'}
              onClick={() => setChartType('overview')}
            >
              Overview
            </Button>
            <Button
              variant={chartType === 'breakdown' ? 'primary' : 'outline-primary'}
              onClick={() => setChartType('breakdown')}
            >
              W/L Split
            </Button>
            <Button
              variant={chartType === 'progress' ? 'primary' : 'outline-primary'}
              onClick={() => setChartType('progress')}
            >
              Metrics
            </Button>
          </ButtonGroup>
        </div>

        {/* Chart Content */}
        {chartType === 'overview' && chartData.stats && (
          <div>
            {/* Performance Level */}
            <div className="text-center mb-4">
              <span className="fs-1 me-2">{performance.icon}</span>
              <div>
                <h4 className={`text-${performance.color} mb-1`}>
                  {performance.level}
                </h4>
                <small className="text-muted">
                  {chartData.stats.winRate}% win rate • {chartData.stats.totalMatches} matches
                </small>
              </div>
            </div>

            {/* Key Metrics Grid */}
            <Row className="text-center g-3">
              <Col xs={6}>
                <div className="border rounded p-3">
                  <h3 className="text-success mb-1">{chartData.stats.wins}</h3>
                  <small className="text-muted">Total Wins</small>
                </div>
              </Col>
              <Col xs={6}>
                <div className="border rounded p-3">
                  <h3 className="text-danger mb-1">{chartData.stats.losses}</h3>
                  <small className="text-muted">Total Losses</small>
                </div>
              </Col>
              <Col xs={6}>
                <div className="border rounded p-3">
                  <h3 className="text-warning mb-1">{chartData.stats.currentStreak}</h3>
                  <small className="text-muted">Current Streak</small>
                </div>
              </Col>
              <Col xs={6}>
                <div className="border rounded p-3">
                  <h3 className="text-info mb-1">{chartData.stats.maxStreak}</h3>
                  <small className="text-muted">Best Streak</small>
                </div>
              </Col>
            </Row>

            {/* Performance Message */}
            <div className="text-center mt-4">
              <small className="text-muted">
                {chartData.stats.totalMatches === 0 
                  ? "Start playing to build your performance profile!"
                  : chartData.stats.winRate >= 70
                  ? "Excellent performance! You're dominating the table! 🔥"
                  : chartData.stats.winRate >= 50
                  ? "Solid performance! Keep improving your game! 💪"
                  : "Every match is progress! Keep playing and learning! 🚀"
                }
              </small>
            </div>
          </div>
        )}

        {/* Chart Visualizations */}
        {(chartType === 'breakdown' || chartType === 'progress') && (
          <div style={{ height: '300px', position: 'relative' }}>
            {chartData.type === 'doughnut' && (
              <Doughnut data={chartData.data} options={chartData.options} />
            )}
            {chartData.type === 'bar' && (
              <Bar data={chartData.data} options={chartData.options} />
            )}
          </div>
        )}

        {/* Chart Description */}
        {chartType !== 'overview' && (
          <div className="text-center mt-3">
            <small className="text-muted">
              {chartType === 'breakdown' 
                ? "📊 Visual breakdown of your wins vs losses"
                : "📈 Key performance metrics and achievements"
              }
            </small>
          </div>
        )}
      </div>
    </DashboardCard>
  );
};

export default PerformanceOverTimeCard;

