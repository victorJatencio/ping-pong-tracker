import React, { useState, useEffect, useMemo } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Badge,
  Table,
  ProgressBar,
} from "react-bootstrap";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import Jumbotron from "../../components/common/Jumbotron";
import UserAvatar from "../../components/common/UserAvatar";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import OngoingMatches from "../../components/dashboard/OngoingMatchesCard";
import statsService from "../../services/statsService";
import { db } from "../../config/firebase";
import { collection, getDocs } from "firebase/firestore";

// Import the new Recent Matches Card component
import RecentMatchesCard from "../../components/dashboard/RecentMatchesCard";
// Import Pending Invitations Card
import PendingInvitationsCard from '../../components/dashboard/PendingInvitationsCard';
// Import Achievements Card
import AchievementsCard from "../../components/dashboard/AchievementsCard";
// Import Leaderboard Preview Card
import LeaderboardPreview from '../../components/dashboard/LeaderboardPreview';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

const Dashboard = () => {
  const { currentUser } = useAuth();

  // State for real data (keeping existing state for other cards)
  const [dashboardData, setDashboardData] = useState({
    userStats: null,
    recentMatches: [], // This will be replaced by Redux data
    upcomingMatches: [],
    pendingInvitations: [],
    achievements: [],
    leaderboardPreview: [],
    recentActivity: [],
    todaySchedule: [],
    performanceTrends: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Get user's first name for personalized greeting
  const getFirstName = (user) => {
    if (user?.displayName) {
      return user.displayName.split(" ")[0];
    }
    if (user?.email) {
      return user.email.split("@")[0];
    }
    return "Player";
  };

  const firstName = getFirstName(currentUser);

  // Simplified data loading without complex queries (keeping existing logic for other cards)
  useEffect(() => {
    if (!currentUser?.uid) return;

    const loadDashboardData = async () => {
      try {
        setLoading(true);
        setError("");

        console.log("Loading dashboard data for user:", currentUser.uid);

        // Load user statistics
        const userStats = await statsService.getPlayerProfileStats(
          currentUser.uid
        );
        console.log("User stats loaded:", userStats);

        // Load ALL matches and filter in JavaScript (no complex queries)
        const allMatchesSnapshot = await getDocs(collection(db, "matches"));
        const allMatches = [];
        allMatchesSnapshot.forEach((doc) => {
          allMatches.push({ id: doc.id, ...doc.data() });
        });
        console.log("All matches loaded:", allMatches.length);

        // Filter matches for current user
        const userMatches = allMatches.filter(
          (match) =>
            match.player1Id === currentUser.uid ||
            match.player2Id === currentUser.uid
        );
        console.log("User matches found:", userMatches.length);

        // Get recent completed matches (keeping for other cards that might need it)
        const completedMatches = userMatches.filter(
          (match) => match.status === "completed"
        );
        const recentMatches = completedMatches
          .sort((a, b) => {
            const dateA = a.completedDate?.toDate() || new Date(0);
            const dateB = b.completedDate?.toDate() || new Date(0);
            return dateB - dateA;
          })
          .slice(0, 3);
        console.log("Recent matches:", recentMatches.length);

        // Get upcoming matches
        const scheduledMatches = userMatches.filter(
          (match) =>
            match.status === "scheduled" || match.status === "in-progress"
        );
        const upcomingMatches = scheduledMatches
          .sort((a, b) => {
            const dateA = a.scheduledDate?.toDate() || new Date();
            const dateB = b.scheduledDate?.toDate() || new Date();
            return dateA - dateB;
          })
          .slice(0, 3);
        console.log("Upcoming matches:", upcomingMatches.length);

        // Load other data...
        // (keeping existing logic for other dashboard components)

        setDashboardData((prev) => ({
          ...prev,
          userStats,
          recentMatches, // Keep for other components that might need it
          upcomingMatches,
          // ... other data
        }));
      } catch (error) {
        console.error("Error loading dashboard data:", error);
        setError("Failed to load dashboard data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [currentUser?.uid]);

  // Destructure data for easier access
  const {
    userStats,
    recentMatches, // Keep for other components
    upcomingMatches,
    pendingInvitations,
    achievements,
    leaderboardPreview,
    recentActivity,
    todaySchedule,
    performanceTrends,
  } = dashboardData;

  // Mock data for components not yet refactored (keeping existing logic)
  const mockAchievements = [
    { id: 1, name: "First Win", icon: "🏆", unlocked: true },
    { id: 2, name: "10 Wins", icon: "🎯", unlocked: false },
    { id: 3, name: "Win Streak", icon: "🔥", unlocked: false },
  ];

  // Chart data for Win/Loss ratio (keeping existing logic)
  const chartData = useMemo(() => {
    if (!userStats) return null;

    const wins = userStats.totalWins || 0;
    const losses = userStats.totalLosses || 0;
    const total = wins + losses;

    if (total === 0) return null;

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
  }, [userStats]);

  const chartOptions = {
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
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          },
        },
      },
    },
  };

  if (loading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ height: "50vh" }}
      >
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2 text-muted">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Container className="py-5">
        <div className="alert alert-danger" role="alert">
          <h4 className="alert-heading">Error Loading Dashboard</h4>
          <p>{error}</p>
          <hr />
          <p className="mb-0">
            <Button
              variant="outline-danger"
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          </p>
        </div>
      </Container>
    );
  }

  return (
    <div className="dashboard-page">
      {/* Jumbotron Header */}
      <Jumbotron
        title={`Welcome back, ${firstName}!`}
        subtitle="Track your ping-pong progress and compete with friends"
        backgroundImage="https://images.unsplash.com/photo-1551698618-1dfe5d97d256?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80"
        height="300px"
        overlay={true}
        textAlign="left"
        fullWidth={true}
      />

      {/* Dashboard Content with Overlap Effect */}
      <div className="jumbotron-overlap-container">
        <Container className="py-5">
          <Row className="g-4">
            {/* First Row - Main Stats Cards */}
            <Row className="g-4 mb-4">
              {/* Win/Loss Ratio Card */}
              <Col lg={4}>
                <Card className="text-center stat-card h-100">
                  <Card.Header>
                    <h5 className="mb-0">Win/Loss Ratio</h5>
                  </Card.Header>
                  <Card.Body>
                    {chartData ? (
                      <div>
                        <div style={{ height: "200px", position: "relative" }}>
                          <Doughnut data={chartData} options={chartOptions} />
                          <div className="position-absolute top-50 start-50 translate-middle text-center">
                            <div className="h4 mb-0 text-primary">
                              {(
                                (userStats.totalWins /
                                  (userStats.totalWins +
                                    userStats.totalLosses)) *
                                100
                              ).toFixed(1)}
                              %
                            </div>
                            <small className="text-muted">Win Rate</small>
                          </div>
                        </div>
                        <Row className="mt-3">
                          <Col xs={6}>
                            <div className="text-success">
                              <strong>{userStats.totalWins}</strong>
                              <br />
                              <small>Wins</small>
                            </div>
                          </Col>
                          <Col xs={6}>
                            <div className="text-danger">
                              <strong>{userStats.totalLosses}</strong>
                              <br />
                              <small>Losses</small>
                            </div>
                          </Col>
                        </Row>
                      </div>
                    ) : (
                      <div className="py-4">
                        <i className="bi bi-pie-chart fs-1 text-muted d-block mb-2"></i>
                        <p className="text-muted mb-0">
                          No match data available
                        </p>
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </Col>

              {/* NEW: Recent Matches Card - Using Redux Component */}
              <Col lg={4}>
                <RecentMatchesCard />
              </Col>

              {/* Achievements Card */}
              <Col lg={4}>
                <AchievementsCard playerStats={userStats} isLoading={loading} />

              </Col>
            </Row>

            {/* Second Row - Additional Cards */}
            <Row className="g-4">
              {/* Ongoing Matches */}
              <Col lg={4}>
                <OngoingMatches />
              </Col>

              <Col lg={4}>
                <PendingInvitationsCard />
              </Col>

              {/* Placeholder for other cards */}
              <Col lg={4}>
                <LeaderboardPreview />
              </Col>
            </Row>
          </Row>
        </Container>
      </div>
    </div>
  );
};

export default Dashboard;
