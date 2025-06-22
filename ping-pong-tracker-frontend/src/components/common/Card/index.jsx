import React from "react";
import { Card, Spinner, Alert } from "react-bootstrap";
import PropTypes from "prop-types";

/**
 * Shared DashboardCard component that provides consistent styling and behavior
 * for all dashboard cards with loading states, error handling, and optional actions
 */
const DashboardCard = ({
  title,
  children,
  isLoading = false,
  error = null,
  footerAction = null,
  className = "",
  height = "auto",
  ...props
}) => {
  return (
    <Card
      className={`dashboard-card h-100 ${className}`}
      style={{ height }}
      {...props}
    >
      {/* Card Header */}
      <Card.Header className="bg-white border-bottom">
        <div className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">{title}</h5>
        </div>
      </Card.Header>

      {/* Card Body */}
      <Card.Body className="d-flex flex-column">
        {/* Loading State */}
        {isLoading && (
          <div className="d-flex justify-content-center align-items-center flex-grow-1">
            <div className="text-center">
              <Spinner animation="border" size="sm" className="mb-2" />
              <p className="text-muted small mb-0">Loading...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="d-flex justify-content-center align-items-center flex-grow-1">
            <Alert variant="light" className="text-center border-0 bg-light">
              <i className="bi bi-exclamation-triangle text-warning me-2"></i>
              <small className="text-muted">
                {typeof error === "string" ? error : "Unable to load data"}
              </small>
            </Alert>
          </div>
        )}

        {/* Content */}
        {!isLoading && !error && <div className="flex-grow-1">{children}</div>}
      </Card.Body>

      {/* Card Footer */}
      {footerAction && !isLoading && !error && (
        <Card.Footer className="bg-light border-top-0 pt-3">
          {footerAction}
        </Card.Footer>
      )}
    </Card>
  );
};

DashboardCard.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node,
  isLoading: PropTypes.bool,
  error: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  footerAction: PropTypes.node,
  className: PropTypes.string,
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export default React.memo(DashboardCard);
