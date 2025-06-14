import React from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';

const NotFound = () => {
  const { darkMode } = useTheme?.() || { darkMode: false }; // Use the theme if available
  
  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col md={8} lg={6}>
          <Card className="shadow-sm border-0">
            <Card.Body className="p-5 text-center">
              <h1 className="display-1 fw-bold">404</h1>
              <h2 className="mb-4">Page Not Found</h2>
              
              <div className="mb-4">
                <img 
                  src={darkMode ? "/images/ping-pong-dark.svg" : "/images/ping-pong.svg"} 
                  alt="Ping Pong Paddle" 
                  style={{ 
                    width: '120px', 
                    height: 'auto',
                    opacity: 0.8
                  }}
                  onError={(e) => {
                    // Fallback if image doesn't exist
                    e.target.style.display = 'none';
                  }}
                />
              </div>
              
              <p className="text-muted mb-4">
                Oops! The page you're looking for seems to have bounced away.
              </p>
              
              <div className="d-grid gap-2">
                <Button 
                  as={Link} 
                  to="/dashboard" 
                  variant="primary" 
                  size="lg"
                >
                  Return to Dashboard
                </Button>
                <Button 
                  as={Link} 
                  to="/" 
                  variant="outline-secondary"
                >
                  Go to Home
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default NotFound;