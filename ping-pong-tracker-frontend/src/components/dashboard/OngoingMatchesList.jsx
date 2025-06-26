import React from 'react';
import { Row, Col, Spinner, Alert, Button } from 'react-bootstrap';
import { useDispatch } from 'react-redux';
import { openMatchCreationModal } from '../../store/slices/uiSlice';
import OngoingMatchItem from './OngoingMatchItem';

/**
 * List container component for ongoing matches
 * Handles layout, empty states, and loading indicators
 */
const OngoingMatchesList = React.memo(({ 
  matches, 
  loading, 
  error, 
  onUpdateScore, 
  currentUser 
}) => {
  const dispatch = useDispatch();
  
  const handleScheduleNewMatch = () => {
    dispatch(openMatchCreationModal());
  };

  // Loading state
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
        <div className="text-center">
          <Spinner animation="border" variant="primary" />
          <div className="mt-2 text-muted">Loading ongoing matches...</div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert variant="danger" className="text-center">
        <Alert.Heading>Unable to Load Matches</Alert.Heading>
        <p>There was an error loading your ongoing matches. Please try again.</p>
        <Button variant="outline-danger" size="sm" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </Alert>
    );
  }

  // Empty state
  if (!matches || matches.length === 0) {
    return (
      <div className="text-center py-4">
        <div className="mb-3">
          <i className="bi bi-calendar-x" style={{ fontSize: '3rem', color: '#6c757d' }}></i>
        </div>
        <h5 className="text-muted">No Ongoing Matches</h5>
        <p className="text-muted mb-3">
          You don't have any scheduled or in-progress matches at the moment.
        </p>
        <Button variant="success" size="sm" onClick={handleScheduleNewMatch}>
          <i className="bi bi-plus-circle me-1"></i>
          Create New Match
        </Button>
      </div>
    );
  }

  // Render matches in responsive grid
  return (
    <Row className="g-3">
      {matches.map((match) => (
        <Col key={match.id} xs={12} md={6} lg={4}>
          <OngoingMatchItem
            match={match}
            currentUser={currentUser}
            onUpdateScore={onUpdateScore}
          />
        </Col>
      ))}
    </Row>
  );
});

OngoingMatchesList.displayName = 'OngoingMatchesList';

export default OngoingMatchesList;