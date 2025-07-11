import React from 'react';
import { Form, Row, Col, Button, Badge } from 'react-bootstrap';

const LeaderboardFilters = ({
  search,
  winRateRange,
  matchesMin,
  streakMin,
  timePeriod,
  onSearchChange,
  onWinRateRangeChange,
  onMatchesMinChange,
  onStreakMinChange,
  onTimePeriodChange,
  onResetFilters,
  hasActiveFilters
}) => {
  
  const handleWinRateMinChange = (e) => {
    const newMin = parseInt(e.target.value) || 0;
    onWinRateRangeChange([newMin, winRateRange[1]]);
  };

  const handleWinRateMaxChange = (e) => {
    const newMax = parseInt(e.target.value) || 100;
    onWinRateRangeChange([winRateRange[0], newMax]);
  };

  return (
    <div className="mb-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h6 className="mb-0 fw-bold">Filters</h6>
        {hasActiveFilters && (
          <Button 
            variant="outline-secondary" 
            size="sm" 
            onClick={onResetFilters}
          >
            Clear All
          </Button>
        )}
      </div>

      <Row className="g-3">
        {/* Player Search */}
        <Col md={6} lg={3}>
          <Form.Group controlId="filterSearch">
            <Form.Label className="fw-bold">Player Search</Form.Label>
            <Form.Control
              type="text"
              placeholder="Search by player name..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </Form.Group>
        </Col>

        {/* Win Rate Range */}
        <Col md={6} lg={3}>
          <Form.Group controlId="filterWinRate">
            <Form.Label className="fw-bold">
              Win Rate Range
              {(winRateRange[0] > 0 || winRateRange[1] < 100) && (
                <Badge bg="primary" className="ms-2">
                  {winRateRange[0]}% - {winRateRange[1]}%
                </Badge>
              )}
            </Form.Label>
            <Row className="g-2">
              <Col>
                <Form.Control
                  type="number"
                  placeholder="Min %"
                  min="0"
                  max="100"
                  value={winRateRange[0]}
                  onChange={handleWinRateMinChange}
                />
              </Col>
              <Col>
                <Form.Control
                  type="number"
                  placeholder="Max %"
                  min="0"
                  max="100"
                  value={winRateRange[1]}
                  onChange={handleWinRateMaxChange}
                />
              </Col>
            </Row>
          </Form.Group>
        </Col>

        {/* Minimum Matches */}
        <Col md={6} lg={2}>
          <Form.Group controlId="filterMatches">
            <Form.Label className="fw-bold">Min Matches</Form.Label>
            <Form.Control
              type="number"
              placeholder="0"
              min="0"
              value={matchesMin}
              onChange={(e) => onMatchesMinChange(e.target.value)}
            />
          </Form.Group>
        </Col>

        {/* Minimum Streak */}
        <Col md={6} lg={2}>
          <Form.Group controlId="filterStreak">
            <Form.Label className="fw-bold">Min Streak</Form.Label>
            <Form.Control
              type="number"
              placeholder="0"
              min="0"
              value={streakMin}
              onChange={(e) => onStreakMinChange(e.target.value)}
            />
          </Form.Group>
        </Col>

        {/* Time Period */}
        <Col md={6} lg={2}>
          <Form.Group controlId="filterTimePeriod">
            <Form.Label className="fw-bold">Time Period</Form.Label>
            <Form.Select
              value={timePeriod}
              onChange={(e) => onTimePeriodChange(e.target.value)}
            >
              <option value="all-time">All Time</option>
              <option value="last-month">Last Month</option>
              <option value="last-week">Last Week</option>
              <option value="last-3-months">Last 3 Months</option>
            </Form.Select>
          </Form.Group>
        </Col>
      </Row>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="mt-3">
          <small className="text-muted">Active filters:</small>
          <div className="mt-1">
            {search && (
              <Badge bg="info" className="me-2">
                Search: "{search}"
              </Badge>
            )}
            {(winRateRange[0] > 0 || winRateRange[1] < 100) && (
              <Badge bg="info" className="me-2">
                Win Rate: {winRateRange[0]}%-{winRateRange[1]}%
              </Badge>
            )}
            {matchesMin && (
              <Badge bg="info" className="me-2">
                Min Matches: {matchesMin}
              </Badge>
            )}
            {streakMin && (
              <Badge bg="info" className="me-2">
                Min Streak: {streakMin}
              </Badge>
            )}
            {timePeriod !== 'all-time' && (
              <Badge bg="info" className="me-2">
                Period: {timePeriod.replace('-', ' ')}
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaderboardFilters;