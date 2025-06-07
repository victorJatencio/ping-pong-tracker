// src/components/auth/AuthTest/index.jsx
import React from 'react';
import { Button, Card } from 'react-bootstrap';
import { useAuth } from '../../../hooks/useAuth';

const AuthTest = () => {
  const { currentUser, loading, error } = useAuth();
  
  return (
    <Card className="my-4">
      <Card.Header>Auth Context Test</Card.Header>
      <Card.Body>
        <h5>Auth Status:</h5>
        {loading ? (
          <p>Loading authentication state...</p>
        ) : currentUser ? (
          <div>
            <p>Logged in as: {currentUser.displayName || currentUser.email}</p>
            <p>User ID: {currentUser.uid}</p>
          </div>
        ) : (
          <p>Not logged in</p>
        )}
        
        {error && (
          <div className="alert alert-danger mt-3">
            Error: {error}
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default AuthTest;
