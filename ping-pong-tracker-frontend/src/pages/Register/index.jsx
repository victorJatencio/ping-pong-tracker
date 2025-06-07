import React, { useState, useRef, useEffect } from "react";
import { useAuth } from '../../hooks/useAuth';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';


const RegisterPage = () => {
    const isMounted = useRef(true);
    const { register } = useAuth();
    const navigate = useNavigate();

    // Form data state
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        acceptTerms: false
    });


    // UI state for error messages and loading
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Helper function for Firebase error messages
    const getFirebaseErrorMessage = (error) => {
        const errorCode = error.code;
        switch (errorCode) {
            case 'auth/email-already-in-use':
                return 'This email is already registered. Please use a different email or try logging in.';
            case 'auth/invalid-email':
                return 'Please enter a valid email address.';
            case 'auth/weak-password':
                return 'Password is too weak. Please use a stronger password.';
            default:
                return error.message || 'An error occurred. Please try again.';
        }
    };

    // Add this function to calculate password strength
    const calculatePasswordStrength = (password) => {
        if (!password) return 0;

        let strength = 0;

        // Length check
        if (password.length >= 6) strength += 1;
        if (password.length >= 10) strength += 1;

        // Character type checks
        if (/[A-Z]/.test(password)) strength += 1; // Has uppercase
        if (/[a-z]/.test(password)) strength += 1; // Has lowercase
        if (/[0-9]/.test(password)) strength += 1; // Has number
        if (/[^A-Za-z0-9]/.test(password)) strength += 1; // Has special char

        return Math.min(strength, 5); // Max strength of 5
    };

    // Password strength
    const passwordStrength = calculatePasswordStrength(formData.password);


    // Handle input changes
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prevData => ({
            ...prevData,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    // Cleanup function to prevent memory leaks
    useEffect(() => {
        return () => {
            isMounted.current = false;
        };
    }, []);


    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        // console.log('Form submitted with data:', formData);
  
        // Validate form inputs
        if (formData.password !== formData.confirmPassword) {
            return setError('Passwords do not match');
        } 

        if (formData.password.length < 6) {
            return setError('Password must be at least 6 characters');
        }

        if (!formData.acceptTerms) {
            return setError('You must agree to the Terms of Service');
        }

        // Create a timeout reference
        let loadingTimeoutId = null;
        
        try {
            if (isMounted.current) {
                // Clear previous errors
                setError('');
                
                // connecting to Firebase
                setLoading(true);

                // Set a timeout to prevent infinite loading
                loadingTimeoutId = setTimeout(() => {
                    if (isMounted.current && loading) {
                        setLoading(false);
                        setError('Request timed out. Please try again.');
                        console.log('Registration request timed out');
                    }
                }, 15000); // 15 seconds timeout
            }

            // For now, just log success (we'll add Firebase integration later)
            // console.log('Validation passed! Ready to register user:', formData);

            // Call the register function from AuthContext
            await register(formData.name, formData.email, formData.password);

            
            // Simulate API call delay
            // await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Reset loading state
            // setLoading(false);
            
            // You would navigate to dashboard here after successful registration
            console.log('Registration successful!, redirecting to dashboard...');

            // Redirect to dashboard on successful registration
            navigate('/dashboard', { replace: true });
    
        } catch (error) {
            if (isMounted.current) {
                // setError(error.message || 'Failed to create an account');
                setError(getFirebaseErrorMessage(error));
            }
            console.error('Registration error:', error);

        } finally {

            // Clear the timeout
            if (loadingTimeoutId) {
                clearTimeout(loadingTimeoutId);
            }

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
                    <h1 className="h3">Create an Account</h1>
                    <p className="text-muted">Join Ping-Pong Score Tracker</p>
                </div>
            

            {error && <Alert variant="danger">{error}</Alert>}

            <Form onSubmit={handleSubmit}>
                {/* Name field */}
                <Form.Group className="mb-3" controlId="name">
                    <Form.Label>Name</Form.Label>
                    <Form.Control
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Enter your name"
                        required
                    />
                </Form.Group>

                {/* Email field */}
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

                {/* Password field */}
                <Form.Group className="mb-3" controlId="password">
                    <Form.Label>Password</Form.Label>
                    <Form.Control
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Create a password"
                        autoComplete="new-password"
                        required
                    />
                    <Form.Text className="text-muted">
                        Password must be at least 6 characters
                    </Form.Text>
                </Form.Group>

                {/* Password strength indicator */}
                <div className="mb-3">
                    <div className="d-flex justify-content-between mb-1">
                        <small>Password Strength:</small>
                        <small>
                            {passwordStrength === 0 && 'Very Weak'}
                            {passwordStrength === 1 && 'Weak'}
                            {passwordStrength === 2 && 'Fair'}
                            {passwordStrength === 3 && 'Good'}
                            {passwordStrength === 4 && 'Strong'}
                            {passwordStrength === 5 && 'Very Strong'}
                        </small>
                    </div>

                    <div className="progress" style={{ height: '6px' }}>
                        <div className={`progress-bar ${
                            passwordStrength <= 1 ? 'bg-danger' :
                            passwordStrength <= 3 ? 'bg-warning' : 
                            'bg-success'
                        }`}
                            role="progressbar"
                            style={{ width: `${(passwordStrength / 5) * 100}%` }}
                            aria-valuenow={passwordStrength} 
                            aria-valuemin="0"
                            aria-valuemax="5"/>
                    </div>
                </div>

                {/* Confirm Password field */}
                <Form.Group className="mb-4" controlId="confirmPassword">
                    <Form.Label>Confirm Password</Form.Label>
                    <Form.Control
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        placeholder="Confirm your password"
                        autoComplete="new-password"
                        required
                    />
                </Form.Group>

                {/* Terms and conditions */}
                <Form.Group className="mb-4" controlId="acceptTerms">
                    <Form.Check
                        type="checkbox"
                        name="acceptTerms"
                        checked={formData.acceptTerms}
                        onChange={handleChange}
                        label="I agree to the Terms of Service and Privacy Policy"
                        required
                    />
                </Form.Group>

                {/* Submit button */}
                <div className="d-grid">
                    <Button 
                        variant="primary" 
                        type="submit"
                        disabled={loading}
                        aria-label="Register"
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
                                    Creating Account...
                            </>
                        ) : 'Create Account'}

                    </Button>
                </div>

                {/* Login link */}
                <div className="text-center mt-3">
                    <p className="mb-0">
                        Already have an account? <Link to="/login">Sign In</Link>
                    </p>
                </div>
            </Form>
            </Card.Body>
        </Card>
                </Col>
            </Row>
        </Container>
    )
}

export default RegisterPage;