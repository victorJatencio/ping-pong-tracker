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
import { useGetPlayerStatsFromBackendQuery } from "../../store/slices/apiSlice";
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
// Import Win/Loss Ratio Card
import WinLossRatio from "../../components/dashboard/WinLossRatio";
// Import Table Card
import RecentActivityCard from '../../components/dashboard/RecentActivityCard';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

const Dashboard = () => {
  const { currentUser } = useAuth();

  // Use backend API for user stats
  const { 
    data: backendUserStats, 
    isLoading: statsLoading, 
    error: statsError 
  } = useGetPlayerStatsFromBackendQuery(currentUser?.uid, {
    skip: !currentUser?.uid
  });

  // State for other dashboard data (not user stats)
  const [dashboardData, setDashboardData] = useState({
    recentMatches: [],
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

  // Load dashboard data (excluding user stats which come from backend API)
  useEffect(() => {
    if (!currentUser?.uid) return;

    const loadDashboardData = async () => {
      try {
        setLoading(true);
        setError("");

        console.log("Loading dashboard data for user:", currentUser.uid);

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

        setDashboardData((prev) => ({
          ...prev,
          recentMatches,
          upcomingMatches,
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
    recentMatches,
    upcomingMatches,
    pendingInvitations,
    achievements,
    leaderboardPreview,
    recentActivity,
    todaySchedule,
    performanceTrends,
  } = dashboardData;

  // Use backend stats as userStats
  const userStats = backendUserStats;

  // Combined loading state
  const isLoading = loading || statsLoading;

  // Combined error state
  const hasError = error || statsError;
  const displayError = error || (statsError ? "Failed to load user statistics" : "");

  // Mock data for components not yet refactored (keeping existing logic)
  const mockAchievements = [
    { id: 1, name: "First Win", icon: "🏆", unlocked: true },
    { id: 2, name: "10 Wins", icon: "🎯", unlocked: false },
    { id: 3, name: "Win Streak", icon: "🔥", unlocked: false },
  ];

  if (isLoading) {
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

  if (hasError) {
    return (
      <Container className="py-5">
        <div className="alert alert-danger" role="alert">
          <h4 className="alert-heading">Error Loading Dashboard</h4>
          <p>{displayError}</p>
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
                <WinLossRatio />
              </Col>

              {/* NEW: Recent Matches Card - Using Redux Component */}
              <Col lg={4}>
                <RecentMatchesCard />
              </Col>

              {/* Achievements Card */}
              <Col lg={4}>
                <AchievementsCard playerStats={userStats} isLoading={isLoading} />
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
            <Row className="g-4">
              <Col lg={12}>
                 <RecentActivityCard />
              </Col>
            </Row>
          </Row>
        </Container>
      </div>
    </div>
  );
};

export default Dashboard;

