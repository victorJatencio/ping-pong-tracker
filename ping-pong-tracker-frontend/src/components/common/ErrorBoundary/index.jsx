// src/components/common/ErrorBoundary/index.jsx
import React from 'react';
import { Alert, Button } from 'react-bootstrap';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    // Log error to your monitoring service
    console.error("Error caught by ErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary p-4 text-center">
          <Alert variant="danger">
            <h4>Something went wrong</h4>
            <p>We've encountered an unexpected error.</p>
            <Button 
              variant="outline-danger"
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </Button>
          </Alert>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
