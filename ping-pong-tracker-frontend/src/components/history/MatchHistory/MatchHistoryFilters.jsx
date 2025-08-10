import React from 'react';
import { Row, Col, Form, Button, Badge } from 'react-bootstrap';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const MatchHistoryFilters = ({
  result,
  startDate,
  endDate,
  onResultChange,
  onStartDateChange,
  onEndDateChange,
  onResetFilters,
  hasActiveFilters
}) => {
  return (
    <div className="mb-4">
      <Row className="g-3">
        {/* Result Filter */}
        <Col md={2}>
          <Form.Group controlId="filterResult">
            <Form.Label className="fw-bold">Result</Form.Label>
            <Form.Select
              value={result}
              onChange={(e) => onResultChange(e.target.value)}
            >
              <option value="all">All Matches</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
            </Form.Select>
          </Form.Group>
        </Col>

        {/* Start Date Filter */}
        <Col md={2}>
          <Form.Group controlId="filterStartDate">
            <Form.Label className="fw-bold">From Date</Form.Label>
            <DatePicker
              selected={startDate}
              onChange={onStartDateChange}
              selectsStart
              startDate={startDate}
              endDate={endDate}
              maxDate={endDate || new Date()}
              placeholderText="Select start date"
              className="form-control"
              dateFormat="MMM d, yyyy"
              isClearable
            />
          </Form.Group>
        </Col>

        {/* End Date Filter */}
        <Col md={2}>
          <Form.Group controlId="filterEndDate">
            <Form.Label className="fw-bold">To Date</Form.Label>
            <DatePicker
              selected={endDate}
              onChange={onEndDateChange}
              selectsEnd
              startDate={startDate}
              endDate={endDate}
              minDate={startDate}
              maxDate={new Date()}
              placeholderText="Select end date"
              className="form-control"
              dateFormat="MMM d, yyyy"
              isClearable
            />
          </Form.Group>
        </Col>

        {/* Reset Button */}
        <Col md={2} className="d-flex align-items-end">
          <Button
            variant="outline-secondary"
            onClick={onResetFilters}
            disabled={!hasActiveFilters}
            className="w-100"
          >
            Reset
          </Button>
        </Col>
      </Row>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <Row className="mt-3">
          <Col>
            <div className="d-flex align-items-center gap-2">
              <span className="text-muted small">Active filters:</span>
              {result !== 'all' && (
                <Badge bg="primary" className="text-capitalize">
                  {result} matches
                </Badge>
              )}
              {startDate && (
                <Badge bg="info">
                  From: {startDate.toLocaleDateString()}
                </Badge>
              )}
              {endDate && (
                <Badge bg="info">
                  To: {endDate.toLocaleDateString()}
                </Badge>
              )}
            </div>
          </Col>
        </Row>
      )}
    </div>
  );
};

export default MatchHistoryFilters;

