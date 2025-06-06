import React, { useState, useRef, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const LoginPage = () => {
    // Track component mount state to prevent state updates after unmount
    const isMounted = useRef(true);
    
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login, currentUser, loading: authLoading } = useAuth();

    const navigate = useNavigate();
    const location = useLocation();
    
    // Get the redirect path from location state or default to dashboard
    const from = location.state?.from?.pathname || '/dashboard';
    
    // Cleanup function to prevent memory leaks
    useEffect(() => {
        return () => {
            isMounted.current = false;
        };
    }, []);

    // Monitor auth state for automatic navigation
    useEffect(() => {
        if (currentUser && !authLoading) {
            console.log("LoginPage: User is authenticated, navigating to:", from);
            navigate(from, { replace: true });
        }
    }, [currentUser, authLoading, navigate, from]);
    
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevData => ({
            ...prevData,
            [name]: value
        }));
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        try {
            if (isMounted.current) {
                setError('');
                setLoading(true);
            }
            
            console.log("LoginPage: Attempting login...");
            await login(formData.email, formData.password);
            console.log("LoginPage: Login successful, about to navigate to:", from);

            // Force a small delay to ensure auth state is updated
            setTimeout(() => {
                if (isMounted.current) {
                console.log("LoginPage: Executing navigation to:", from);
                navigate(from, { replace: true });
                }
            }, 500);
            
            // Redirect to the page they were trying to access, or dashboard
            navigate(from, { replace: true });
        } catch (error) {
            if (isMounted.current) {
                setError('Failed to log in. Please check your credentials.');
                console.error('Login error:', error);
            }
        } finally {
            if (isMounted.current) {
                setLoading(false);
            }
        }
    };
    
    return (
        <Container>
            <Row className="justify-content-center align-items-center min-vh-100">
                <Col xs={12} sm={10}>  
                
        <Card className="shadow-sm">
            <Card.Body className="p-4 p-sm-5">
                <div className="text-center mb-4">
                    <h1 className="h3">Ping-Pong Score Tracker</h1>
                    <p className="text-muted">Sign in to your account</p>
                </div>
                
                {error && <Alert variant="danger">{error}</Alert>}
                
                <Form onSubmit={handleSubmit}>
                    <Form.Group className="mb-3" controlId="email">
                        <Form.Label>Email</Form.Label>
                        <Form.Control
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="Enter your email"
                            autoComplete="email"
                            required
                        />
                    </Form.Group>
                    
                    <Form.Group className="mb-4" controlId="password">
                        <Form.Label>Password</Form.Label>
                        <Form.Control
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="Enter your password"
                            autoComplete="current-password"
                            required
                        />
                    </Form.Group>
                    
                    <div className="d-grid">
                        <Button 
                            variant="primary" 
                            type="submit"
                            disabled={loading}
                            aria-label="Sign in"
                        >
                            {loading ? (
                                <>
                                    <Spinner
                                        as="span"
                                        animation="border"
                                        size="sm"
                                        role="status"
                                        aria-hidden="true"
                                        className="me-2"
                                    />
                                    Signing in...
                                </>
                            ) : 'Sign In'}
                        </Button>
                    </div>
                    
                    <div className="text-center mt-3">
                        <p>
                            <Link to="/forgot-password">Forgot password?</Link>
                        </p>
                        <p className="mb-0">
                            Don't have an account? <Link to="/register">Register</Link>
                        </p>
                    </div>
                </Form>
            </Card.Body>
        </Card>
        </Col>
        </Row>
        </Container>
    );
};

export default LoginPage;
