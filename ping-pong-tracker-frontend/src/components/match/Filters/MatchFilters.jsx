import React from 'react';
import { Form, Row, Col, Button } from 'react-bootstrap';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useGetAllUsersQuery } from '../../../store/slices/apiSlice';

const MatchFilters = ({
  selectedPlayerId,
  handlePlayerChange,
  selectedStatus,
  handleStatusChange,
  selectedResult,
  handleResultChange,
  startDate,
  handleStartDateChange,
  endDate,
  handleEndDateChange,
  showAllMatches, // NEW PROP
  handleShowAllMatchesChange, // NEW PROP
  resetFilters,
}) => {
  const { data: allUsersMap = {}, isLoading: isLoadingUsers } = useGetAllUsersQuery();

  // Convert users map to an array for dropdown
  const allUsers = React.useMemo(() => {
    return Object.values(allUsersMap).sort((a, b) => (a.displayName || a.name).localeCompare(b.displayName || b.name));
  }, [allUsersMap]);

  return (
    <div className="p-3 mb-3 bg-light rounded shadow-sm">
      <Form>
        <Row className="g-3 align-items-end">
          {/* Show All Matches Toggle - NEW */}
          <Col md={6} lg={3}>
            <Form.Group controlId="filterShowAllMatches">
              <Form.Label className="fw-bold">View Mode</Form.Label>
              <Form.Check
                type="switch"
                id="show-all-matches-switch"
                label={showAllMatches ? "All Matches" : "My Matches Only"}
                checked={showAllMatches}
                onChange={(e) => handleShowAllMatchesChange(e.target.checked)}
                className="mt-2"
              />
            </Form.Group>
          </Col>

          {/* Player Filter */}
          <Col md={6} lg={3}>
            <Form.Group controlId="filterPlayer">
              <Form.Label className="fw-bold">
                {showAllMatches ? "Player" : "Opponent"}
              </Form.Label>
              <Form.Select value={selectedPlayerId} onChange={(e) => handlePlayerChange(e.target.value)} disabled={isLoadingUsers}>
                <option value="">All Players</option>
                {isLoadingUsers ? (
                  <option disabled>Loading players...</option>
                ) : (
                  allUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.displayName || user.name || user.email}
                    </option>
                  ))
                )}
              </Form.Select>
            </Form.Group>
          </Col>

          {/* Status Filter */}
          <Col md={4} lg={2}>
            <Form.Group controlId="filterStatus">
              <Form.Label className="fw-bold">Status</Form.Label>
              <Form.Select value={selectedStatus} onChange={(e) => handleStatusChange(e.target.value)}>
                <option value="all">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="scheduled">Scheduled</option>
                <option value="in-progress">In Progress</option>
              </Form.Select>
            </Form.Group>
          </Col>

          {/* Result Filter - Only show when NOT showing all matches */}
          {!showAllMatches && (
            <Col md={4} lg={2}>
              <Form.Group controlId="filterResult">
                <Form.Label className="fw-bold">Result</Form.Label>
                <Form.Select value={selectedResult} onChange={(e) => handleResultChange(e.target.value)}>
                  <option value="all">All Results</option>
                  <option value="won">Won</option>
                  <option value="lost">Lost</option>
                </Form.Select>
              </Form.Group>
            </Col>
          )}

          {/* Date Range Start */}
          <Col md={6} lg={2}>
            <Form.Group controlId="filterStartDate">
              <Form.Label className="fw-bold">From Date</Form.Label>
              <DatePicker
                selected={startDate}
                onChange={handleStartDateChange}
                selectsStart
                startDate={startDate}
                endDate={endDate}
                placeholderText="Select start date"
                className="form-control"
                dateFormat="yyyy-MM-dd"
                isClearable
              />
            </Form.Group>
          </Col>

          {/* Date Range End */}
          <Col md={6} lg={2}>
            <Form.Group controlId="filterEndDate">
              <Form.Label className="fw-bold">To Date</Form.Label>
              <DatePicker
                selected={endDate}
                onChange={handleEndDateChange}
                selectsEnd
                startDate={startDate}
                endDate={endDate}
                minDate={startDate}
                placeholderText="Select end date"
                className="form-control"
                dateFormat="yyyy-MM-dd"
                isClearable
              />
            </Form.Group>
          </Col>

          {/* Reset Button */}
          <Col xs={12} md={6} lg={1}>
            <Button variant="outline-secondary" onClick={resetFilters} className="w-100">
              Reset
            </Button>
          </Col>
        </Row>
      </Form>
    </div>
  );
};

export default MatchFilters;
