import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Button, Form, Alert, Spinner, Modal, Badge, Collapse } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../config/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import statsService from '../../services/statsService';
import profileImageService from '../../services/profileImageService';
import Jumbotron from '../../components/common/Jumbotron';
import UserAvatar from '../../components/common/UserAvatar';

const Profile = () => {
  const { currentUser } = useAuth();
  
  // Original Profile State
  const [formData, setFormData] = useState({
    name: currentUser?.displayName || '',
    email: currentUser?.email || '',
    password: '••••••'
  });
  const [deactivateConfirm, setDeactivateConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Statistics State
  const [profileStats, setProfileStats] = useState(null);
  const [userData, setUserData] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState('');
  const [showStats, setShowStats] = useState(false);
  
  // Avatar Upload State
  const [showImageModal, setShowImageModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  // Original Profile Functions
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

  // Enhanced Avatar Functions
  const handleAvatarChange = () => {
    setShowImageModal(true);
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setUploading(true);
      setUploadError('');
      
      await profileImageService.uploadProfileImage(file, currentUser.uid);
      setShowImageModal(false);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      setUploadError(error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleAvatarSwitch = async (useDefault) => {
    try {
      if (useDefault) {
        await profileImageService.useDefaultAvatar(currentUser.uid);
      } else {
        await profileImageService.useUploadedPhoto(currentUser.uid);
      }
    } catch (error) {
      console.error('Error switching avatar:', error);
    }
  };

  // Statistics Functions
  const loadStatistics = async () => {
    if (!currentUser?.uid) return;

    try {
      setStatsLoading(true);
      setStatsError('');
      
      const stats = await statsService.getPlayerProfileStats(currentUser.uid);
      setProfileStats(stats);
    } catch (error) {
      console.error('Error loading statistics:', error);
      setStatsError('Failed to load statistics.');
    } finally {
      setStatsLoading(false);
    }
  };

  // Fetch user data
  useEffect(() => {
    if (!currentUser?.uid) return;

    const userRef = doc(db, 'users', currentUser.uid);
    const unsubscribeUser = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        setUserData({ id: doc.id, ...doc.data() });
      }
    });

    return () => unsubscribeUser();
  }, [currentUser?.uid]);

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
                    {userData ? (
                      <img
                        src={profileImageService.getCurrentAvatarURL(userData)}
                        alt="Profile"
                        className="profile-avatar-large rounded-circle"
                        width="100"
                        height="100"
                        style={{ objectFit: 'cover' }}
                      />
                    ) : (
                      <UserAvatar
                        user={currentUser}
                        size={100}
                        className="profile-avatar-large"
                      />
                    )}
                  </div>
                </div>

                {/* Card Content */}
                <Card.Body className="pt-5">
                  <Row className="align-items-center">
                    <Col md={6}>
                      <h4 className="mb-1">
                        {currentUser?.displayName || userData?.name || 'User'}
                      </h4>
                      <p className="text-muted mb-0">
                        Member since {currentUser?.metadata?.creationTime
                          ? new Date(currentUser.metadata.creationTime).toLocaleDateString()
                          : 'Recently'
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
                      <Form.Text className="text-muted">
                        Password can not be changed here.{' '}
                        <Button
                          variant="link"
                          className="p-0 text-decoration-none"
                          onClick={handleResetPassword}
                        >
                          Reset Password
                        </Button>
                      </Form.Text>
                    </Form.Group>

                    <div className="d-flex justify-content-between">
                      <Button variant="primary" type="submit">
                        Save Edits
                      </Button>
                      <Button
                        variant="outline-secondary"
                        onClick={handleResetPassword}
                      >
                        Reset Password
                      </Button>
                    </div>
                  </Form>
                </Card.Body>
              </Card>

              {/* Optional Statistics Card */}
              <Card className="mb-4">
                <Card.Header>
                  <div className="d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">Performance Statistics</h5>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => {
                        if (!showStats && !profileStats) {
                          loadStatistics();
                        }
                        setShowStats(!showStats);
                      }}
                    >
                      {showStats ? 'Hide Stats' : 'Show Stats'}
                    </Button>
                  </div>
                </Card.Header>
                <Collapse in={showStats}>
                  <Card.Body>
                    {statsLoading && (
                      <div className="text-center py-4">
                        <Spinner animation="border" size="sm" className="me-2" />
                        Loading statistics...
                      </div>
                    )}

                    {statsError && (
                      <Alert variant="warning" className="mb-3">
                        {statsError}
                        <Button
                          variant="outline-warning"
                          size="sm"
                          className="ms-2"
                          onClick={loadStatistics}
                        >
                          Retry
                        </Button>
                      </Alert>
                    )}

                    {profileStats && !statsLoading && (
                      <Row>
                        <Col md={3} className="mb-3">
                          <div className="text-center">
                            <h4 className="text-primary mb-0">{profileStats.totalMatches || 0}</h4>
                            <small className="text-muted">Total Matches</small>
                          </div>
                        </Col>
                        <Col md={3} className="mb-3">
                          <div className="text-center">
                            <h4 className="text-success mb-0">{profileStats.winRate || 0}%</h4>
                            <small className="text-muted">Win Rate</small>
                          </div>
                        </Col>
                        <Col md={3} className="mb-3">
                          <div className="text-center">
                            <h4 className="text-warning mb-0">#{profileStats.rank || '--'}</h4>
                            <small className="text-muted">Current Rank</small>
                          </div>
                        </Col>
                        <Col md={3} className="mb-3">
                          <div className="text-center">
                            <h4 className="text-info mb-0">{profileStats.currentStreak || 0}</h4>
                            <small className="text-muted">
                              {profileStats.streakType === 'wins' ? 'Win' : 'Loss'} Streak
                            </small>
                          </div>
                        </Col>
                      </Row>
                    )}

                    {profileStats?.achievements?.length > 0 && (
                      <div className="mt-4">
                        <h6 className="mb-3">Recent Achievements</h6>
                        <Row>
                          {profileStats.achievements.slice(0, 3).map((achievement, index) => (
                            <Col md={4} key={index} className="mb-2">
                              <div className="d-flex align-items-center">
                                <Badge bg="warning" className="me-2">🏆</Badge>
                                <div>
                                  <div className="fw-bold small">{achievement.name}</div>
                                  <small className="text-muted">{achievement.description}</small>
                                </div>
                              </div>
                            </Col>
                          ))}
                        </Row>
                      </div>
                    )}
                  </Card.Body>
                </Collapse>
              </Card>
            </Col>

            <Col lg={4}>
              {/* Deactivate Account Card */}
              <Card className="border-danger">
                <Card.Header className="bg-danger text-white">
                  <h5 className="mb-0">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    Deactivate Account
                  </h5>
                </Card.Header>
                <Card.Body>
                  <p className="text-muted mb-3">
                    Once you deactivate your account, there is no going back.
                    Please be certain.
                  </p>

                  <Form.Group className="mb-3">
                    <Form.Check
                      type="checkbox"
                      id="deactivate-confirm"
                      label="I understand that this action cannot be undone"
                      checked={deactivateConfirm}
                      onChange={(e) => setDeactivateConfirm(e.target.checked)}
                    />
                  </Form.Group>

                  <Button
                    variant="danger"
                    onClick={handleDeactivateAccount}
                    disabled={!deactivateConfirm}
                    className="w-100"
                  >
                    <i className="bi bi-trash me-2"></i>
                    Deactivate Account
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>

      {/* Profile Image Modal */}
      <Modal show={showImageModal} onHide={() => setShowImageModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Update Profile Picture</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {uploadError && (
            <Alert variant="danger" className="mb-3">
              {uploadError}
            </Alert>
          )}
          
          <div className="text-center mb-4">
            <img
              src={userData ? profileImageService.getCurrentAvatarURL(userData) : ''}
              alt="Current Profile"
              className="rounded-circle mb-3"
              width="100"
              height="100"
              style={{ objectFit: 'cover' }}
            />
          </div>

          <Form.Group className="mb-3">
            <Form.Label>Upload New Image</Form.Label>
            <Form.Control
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              ref={fileInputRef}
              disabled={uploading}
            />
            <Form.Text className="text-muted">
              Maximum file size: 100KB. Supported formats: JPG, PNG, GIF
            </Form.Text>
          </Form.Group>

          <div className="d-grid gap-2">
            {userData?.photoURL && !userData?.useDefaultAvatar && (
              <Button
                variant="outline-secondary"
                onClick={() => handleAvatarSwitch(true)}
                disabled={uploading}
              >
                Use Default Avatar
              </Button>
            )}
            {userData?.photoURL && userData?.useDefaultAvatar && (
              <Button
                variant="outline-primary"
                onClick={() => handleAvatarSwitch(false)}
                disabled={uploading}
              >
                Use Uploaded Photo
              </Button>
            )}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowImageModal(false)} disabled={uploading}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Profile;

