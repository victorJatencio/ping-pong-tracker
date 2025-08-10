import React, { useState, useEffect } from "react";
import { Card, Button, Badge, Row, Col, Spinner, Alert } from "react-bootstrap";
import { useDispatch } from "react-redux";
import { useAuth } from "../../hooks/useAuth";
import { db } from "../../config/firebase";
import { Link } from "react-router-dom";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
} from "firebase/firestore";
import { openMatchCreationModal } from "../../store/slices/uiSlice";
import UpdateScoreModal from "../match/MatchCreate/UpdatedScoreModal";
import DashboardCard from "../common/Card";
import GradientButton from "../common/Button";

/**
 * Updated OngoingMatches component that properly passes data to the modal
 */
const OngoingMatchesCard = () => {
  const { currentUser } = useAuth();
  const dispatch = useDispatch();
  const [matches, setMatches] = useState([]);
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  // Fetch ongoing matches for current user (using working Firebase queries)
  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const matchesRef = collection(db, "matches");

    // Query for matches where current user is a participant and status is not completed
    const q = query(
      matchesRef,
      where("status", "in", ["scheduled", "in-progress"]),
      orderBy("scheduledDate", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const fetchedMatches = querySnapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .filter(
            (match) =>
              match.player1Id === currentUser.uid ||
              match.player2Id === currentUser.uid
          );

        setMatches(fetchedMatches);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching ongoing matches:", error);
        setError("Failed to load ongoing matches.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  // Fetch user data for display names (using working Firebase queries)
  useEffect(() => {
    const fetchUsers = async () => {
      if (matches.length === 0) return;

      try {
        const usersRef = collection(db, "users");
        const unsubscribe = onSnapshot(usersRef, (querySnapshot) => {
          const usersData = {};
          querySnapshot.docs.forEach((doc) => {
            usersData[doc.id] = {
              id: doc.id,
              ...doc.data(),
            };
          });
          setUsers(usersData);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    fetchUsers();
  }, [matches]);

  // Redux modal integration (from new component)
  const handleScheduleNewMatch = () => {
    dispatch(openMatchCreationModal());
  };

  const handleUpdateScore = (match) => {
    // Prepare match data with proper structure for the modal
    const opponentId =
      match.player1Id === currentUser.uid ? match.player2Id : match.player1Id;
    const opponent = users[opponentId];

    const enrichedMatch = {
      ...match,
      currentUser: currentUser,
      opponent: opponent
        ? {
            id: opponent.id,
            name: opponent.name || opponent.displayName || opponent.email,
            displayName:
              opponent.displayName || opponent.name || opponent.email,
            email: opponent.email,
            photoURL: opponent.photoURL || null,
          }
        : {
            id: opponentId,
            name: `Player ${opponentId?.substring(0, 8) || "Unknown"}`,
            displayName: `Player ${opponentId?.substring(0, 8) || "Unknown"}`,
            email: null,
            photoURL: null,
          },
    };

    setSelectedMatch(enrichedMatch);
    setShowUpdateModal(true);
  };

  const handleCloseUpdateModal = () => {
    setShowUpdateModal(false);
    setSelectedMatch(null);
  };

  const handleScoreUpdated = () => {
    // The real-time listener will automatically update the matches
    console.log("Score updated, matches will refresh automatically");
  };

  // Helper functions (from old component)
  const getOpponentName = (match) => {
    const opponentId =
      match.player1Id === currentUser.uid ? match.player2Id : match.player1Id;
    const opponent = users[opponentId];
    return (
      opponent?.name ||
      opponent?.displayName ||
      opponent?.email ||
      "Unknown Player"
    );
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      scheduled: { variant: "primary", text: "Scheduled" },
      "in-progress": { variant: "warning", text: "In Progress" },
      completed: { variant: "success", text: "Completed" },
    };

    const config = statusConfig[status] || {
      variant: "secondary",
      text: status,
    };
    return <Badge bg={config.variant}>{config.text}</Badge>;
  };

  const canUpdateScore = (match) => {
    // Only allow the match creator (player1) to update scores initially
    // This can be expanded to allow both players if needed
    return currentUser.uid === match.player1Id;
  };

  // Footer action button
  const footerAction = (
    <Link to="/history" className="text-decoration-none">
      View All <i className="bi bi-arrow-right"></i>
    </Link>
  );

  // Loading state
  if (loading) {
    return (
      <Card className="h-100">
        <Card.Header>
          <h5 className="mb-0">Ongoing Matches</h5>
        </Card.Header>
        <Card.Body>
          <div className="text-center py-4">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">
                Loading ongoing matches...
              </span>
            </Spinner>
            <p className="mt-2 text-muted">Loading your ongoing matches...</p>
          </div>
        </Card.Body>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="h-100">
        <Card.Header>
          <h5 className="mb-0">Ongoing Matches</h5>
        </Card.Header>
        <Card.Body>
          <Alert variant="danger">{error}</Alert>
        </Card.Body>
      </Card>
    );
  }

  // Empty state with Redux modal integration
  if (matches.length === 0) {
    return (
      <DashboardCard
        title="Ongoing Matches"
        footerAction={footerAction}
        className="recent-matches-card"
      >
        <div className="no-invitations">
          <div className="mb-3">
            <i
              className="bi bi-calendar-x"
              style={{ fontSize: "3rem", color: "#6c757d" }}
            ></i>
          </div>
          <h5 className="standard__card_title">No Ongoing Matches</h5>
          <p className="standard__card_message">
            You don't have any scheduled or in-progress matches at the moment.
          </p>
          <GradientButton
            variant="success"
            size="sm"
            onClick={handleScheduleNewMatch}
          >
            🏓 Create New Match
          </GradientButton>
        </div>
      </DashboardCard>
    );
  }

  // Matches display (from old component with working functionality)
  return (
    <DashboardCard
      title="Ongoing Matches"
      footerAction={footerAction}
      className="recent-matches-card"
    >
      {/* <Badge bg="info">{matches.length} active</Badge> */}
      <div className="match__item">
        {matches.map((match) => (
          <Col key={match.id} className="mb-3">
            <Card className="h-100 match__item_content">
              <Card.Header className="d-flex justify-content-between align-items-center">
                <small className="text-muted">
                  {match.date} at {match.time}
                </small>
                {getStatusBadge(match.status)}
              </Card.Header>
              <Card.Body>
                <div className="text-center mb-3">
                  <h6 className="mb-2">vs {getOpponentName(match)}</h6>
                  <div className="fs-4 fw-bold text-primary">
                    {match.player1Score || 0} - {match.player2Score || 0}
                  </div>
                </div>

                <div className="mb-3">
                  <small className="text-muted d-block">
                    <strong>Location:</strong> {match.location}
                  </small>
                  {match.notes && (
                    <small className="text-muted d-block">
                      <strong>Notes:</strong> {match.notes}
                    </small>
                  )}
                </div>

                <div className="d-grid gap-2">
                  {canUpdateScore(match) ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleUpdateScore(match)}
                    >
                      🏓 Update Score
                    </Button>
                  ) : (
                    <Button variant="outline-secondary" size="sm" disabled>
                      Waiting for opponent to update
                    </Button>
                  )}
                </div>
              </Card.Body>
              <Card.Footer className="text-muted">
                <small>
                  Created{" "}
                  {new Date(match.scheduledDate?.toDate()).toLocaleDateString()}
                </small>
              </Card.Footer>
            </Card>
          </Col>
        ))}
      </div>

      {/* Update Score Modal with proper data structure */}
      {selectedMatch && (
        <UpdateScoreModal
          show={showUpdateModal}
          handleClose={handleCloseUpdateModal}
          match={selectedMatch}
          onScoreUpdated={handleScoreUpdated}
        />
      )}
    </DashboardCard>
  );
};

export default OngoingMatchesCard;
