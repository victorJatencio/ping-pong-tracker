import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { Spinner } from 'react-bootstrap';

const ProtectedRoute = () => {
    const { currentUser, loading } = useAuth();
    const location = useLocation();

    // Show loading spinner while checking authentication
    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center vh-100">
                <Spinner animation="border" role="status" variant="primary">
                    <span className="visually-hidden">Loading...</span>
                </Spinner>
            </div>
        );
    }

    // Redirect to login if not authenticated
    if (!currentUser) {
        // Save the location they were trying to access for later redirect
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Render child routes if authenticated
    return <Outlet />;
};

export default ProtectedRoute;