import React, { useState } from 'react';
import { Container, Row, Col, Card, Button, Form, Alert } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Jumbotron from '../../components/common/Jumbotron';
import UserAvatar from '../../components/common/UserAvatar';

const Profile = () => {
    const { currentUser } = useAuth();
    const [formData, setFormData] = useState({
        name: currentUser?.displayName || '',
        email: currentUser?.email || '',
        password: '••••••'
    });
    const [deactivateConfirm, setDeactivateConfirm] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSaveEdits = (e) => {
        e.preventDefault();
        // TODO: Implement save functionality
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
    };

    const handleResetPassword = () => {
        // TODO: Implement password reset functionality
        alert('Password reset email sent!');
    };

    const handleDeactivateAccount = () => {
        if (deactivateConfirm) {
            // TODO: Implement account deactivation
            alert('Account deactivation initiated');
        } else {
            alert('Please confirm account deactivation by checking the box');
        }
    };

    const handleAvatarChange = () => {
        // TODO: Implement avatar change functionality
        alert('Avatar change functionality coming soon!');
    };

    return (
        <div className="profile-page">
            {/* Standard Jumbotron */}
            <Jumbotron
                title="Account Overview"
                subtitle={
                    <nav aria-label="breadcrumb">
                        <ol className="breadcrumb mb-0">
                            <li className="breadcrumb-item">
                                <Link to="/dashboard" className="text-white-50">Dashboard</Link>
                            </li>
                            <li className="breadcrumb-item active text-white" aria-current="page">
                                Profile
                            </li>
                        </ol>
                    </nav>
                }
                backgroundImage="https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80"
                height="300px"
                overlay={true}
                textAlign="left"
                fullWidth={true}
            />

            {/* Profile Content with Overlap Effect */}
            <div className="jumbotron-overlap-container">
                <Container className="py-5">
                    {/* Success Alert */}
                    {showSuccess && (
                        <Alert variant="success" className="mb-4">
                            <i className="bi bi-check-circle me-2"></i>
                            Profile updated successfully!
                        </Alert>
                     )}

                    <Row>
                        <Col lg={8}>
                            {/* Profile Card with Banner and Overlapping Avatar */}
                            <Card className="mb-4 profile-banner-card">
                                {/* Card Banner */}
                                <div className="profile-banner">
                                    <img 
                                        src="https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80" 
                                        alt="Profile Banner" 
                                        className="profile-banner-image"
                                    />
                                    {/* Avatar overlapping the banner */}
                                    <div className="profile-avatar-container">
                                        <UserAvatar 
                                            user={currentUser} 
                                            size={100} 
                                            className="profile-avatar-large"
                                        />
                                    </div>
                                </div>
                                
                                {/* Card Content */}
                                <Card.Body className="pt-5">
                                    <Row className="align-items-center">
                                        <Col md={6}>
                                            <h4 className="mb-1">
                                                {currentUser?.displayName || 'User'}
                                            </h4>
                                            <p className="text-muted mb-0">
                                                Member since {currentUser?.metadata?.creationTime ? 
                                                    new Date(currentUser.metadata.creationTime ).toLocaleDateString() : 
                                                    'Recently'
                                                }
                                            </p>
                                        </Col>
                                        <Col md={6} className="text-md-end">
                                            <Button 
                                                variant="outline-primary" 
                                                onClick={handleAvatarChange}
                                                className="mb-2"
                                            >
                                                <i className="bi bi-camera me-2"></i>
                                                Change Avatar Image
                                            </Button>
                                            <div className="small text-muted">
                                                File Types: JPEG, PNG, GIF<br />
                                                Max dimensions: 500×500 pixels
                                            </div>
                                        </Col>
                                    </Row>
                                </Card.Body>
                            </Card>

                            {/* Profile Details Card */}
                            <Card className="mb-4">
                                <Card.Header>
                                    <h5 className="mb-0">Profile Details</h5>
                                </Card.Header>
                                <Card.Body className="p-4">
                                    <Form onSubmit={handleSaveEdits}>
                                        <Row>
                                            <Col md={6}>
                                                <Form.Group className="mb-3">
                                                    <Form.Label>Name:</Form.Label>
                                                    <Form.Control
                                                        type="text"
                                                        name="name"
                                                        value={formData.name}
                                                        onChange={handleInputChange}
                                                        placeholder="Enter your name"
                                                    />
                                                </Form.Group>
                                            </Col>
                                            <Col md={6}>
                                                <Form.Group className="mb-3">
                                                    <Form.Label>Email:</Form.Label>
                                                    <Form.Control
                                                        type="email"
                                                        name="email"
                                                        value={formData.email}
                                                        disabled
                                                        className="bg-light"
                                                    />
                                                    <Form.Text className="text-muted">
                                                        Email can not be changed.
                                                    </Form.Text>
                                                </Form.Group>
                                            </Col>
                                        </Row>
                                        
                                        <Form.Group className="mb-4">
                                            <Form.Label>Password:</Form.Label>
                                            <Form.Control
                                                type="password"
                                                name="password"
                                                value={formData.password}
                                                disabled
                                                className="bg-light"
                                            />
                                        </Form.Group>

                                        <div className="d-flex gap-3 justify-content-end">
                                            <Button 
                                                variant="outline-secondary"
                                                type="button"
                                                onClick={handleResetPassword}
                                            >
                                                Reset Password
                                            </Button>
                                            <Button 
                                                variant="primary"
                                                type="submit"
                                            >
                                                Save Edits
                                            </Button>
                                        </div>
                                    </Form>
                                </Card.Body>
                            </Card>

                            {/* Deactivate Account Card */}
                            <Card className="border-warning">
                                <Card.Header className="bg-warning bg-opacity-10">
                                    <h5 className="mb-0 text-warning">
                                        <i className="bi bi-exclamation-triangle me-2"></i>
                                        Deactivate Account
                                    </h5>
                                </Card.Header>
                                <Card.Body className="p-4">
                                    <Alert variant="warning" className="mb-3">
                                        <h6 className="alert-heading">You Are Deactivating Your Account</h6>
                                        <p className="mb-0">
                                            By deactivating your account, you will effectively loose all your progress. 
                                            Check the box below to confirm this action.
                                        </p>
                                    </Alert>

                                    <Form.Check
                                        type="checkbox"
                                        id="deactivate-confirm"
                                        label="Yes, I want to deactivate this account"
                                        checked={deactivateConfirm}
                                        onChange={(e) => setDeactivateConfirm(e.target.checked)}
                                        className="mb-3"
                                    />

                                    <div className="text-end">
                                        <Button 
                                            variant="danger"
                                            onClick={handleDeactivateAccount}
                                            disabled={!deactivateConfirm}
                                        >
                                            <i className="bi bi-trash me-2"></i>
                                            Deactivate Account
                                        </Button>
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>

                        <Col lg={4}>
                            {/* Quick Stats Card */}
                            <Card className="mb-4">
                                <Card.Header>
                                    <h5 className="mb-0">Account Statistics</h5>
                                </Card.Header>
                                <Card.Body>
                                    <div className="text-center mb-3">
                                        <h2 className="text-primary">0</h2>
                                        <p className="text-muted">Matches Played</p>
                                    </div>
                                    <hr />
                                    <div className="d-flex justify-content-between mb-2">
                                        <span>Wins:</span>
                                        <strong className="text-success">0</strong>
                                    </div>
                                    <div className="d-flex justify-content-between mb-2">
                                        <span>Losses:</span>
                                        <strong className="text-danger">0</strong>
                                    </div>
                                    <div className="d-flex justify-content-between mb-2">
                                        <span>Win Rate:</span>
                                        <strong>0%</strong>
                                    </div>
                                    <div className="d-flex justify-content-between">
                                        <span>Current Rank:</span>
                                        <strong>Unranked</strong>
                                    </div>
                                </Card.Body>
                            </Card>

                            {/* Account Info Card */}
                            <Card>
                                <Card.Header>
                                    <h5 className="mb-0">Account Information</h5>
                                </Card.Header>
                                <Card.Body>
                                    <div className="d-flex justify-content-between mb-2">
                                        <span>Account Type:</span>
                                        <strong>Free</strong>
                                    </div>
                                    <div className="d-flex justify-content-between mb-2">
                                        <span>Status:</span>
                                        <span className="badge bg-success">Active</span>
                                    </div>
                                    <div className="d-flex justify-content-between mb-3">
                                        <span>Last Login:</span>
                                        <strong>Today</strong>
                                    </div>
                                    <Button variant="outline-primary" size="sm" className="w-100">
                                        <i className="bi bi-download me-2"></i>
                                        Export Data
                                    </Button>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>
                </Container>
            </div>
        </div>
    );
};

export default Profile;
