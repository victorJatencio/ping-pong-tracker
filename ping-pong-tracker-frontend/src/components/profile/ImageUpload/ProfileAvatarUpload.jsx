// src/components/profile/ProfileAvatarUpload.jsx
import React, { useState, useRef } from 'react';
import { Modal, Button, Form, Alert, Spinner, Row, Col } from 'react-bootstrap';
import { 
  useUploadProfileImageMutation, 
  useRemoveProfileImageMutation 
} from '../../../store/slices/apiSlice';
import UserAvatar from '../../common/UserAvatar';

const ProfileAvatarUpload = ({ 
  show, 
  onHide, 
  userId, 
  currentUser 
}) => {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploadError, setUploadError] = useState(null);

  // RTK Query mutations
  const [
    uploadImage, 
    { isLoading: uploading }
  ] = useUploadProfileImageMutation();

  const [
    removeImage, 
    { isLoading: removing }
  ] = useRemoveProfileImageMutation();

  // Handle file selection
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    setUploadError(null);

    if (!file) {
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (JPG, PNG, GIF)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image size must be less than 5MB');
      return;
    }

    setSelectedFile(file);

    // Create preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  // Handle image upload
  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      await uploadImage({
        userId,
        imageFile: selectedFile
      }).unwrap();

      // Reset state and close modal
      setSelectedFile(null);
      setPreviewUrl(null);
      setUploadError(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onHide();
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadError(error.message || 'Failed to upload image. Please try again.');
    }
  };

  // Handle image removal
  const handleRemoveImage = async () => {
    try {
      await removeImage({ userId }).unwrap();
      onHide();
    } catch (error) {
      console.error('Remove failed:', error);
      setUploadError(error.message || 'Failed to remove image. Please try again.');
    }
  };

  // Handle modal close
  const handleClose = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onHide();
  };

  // Get user initials for fallback
  const getUserInitials = (user) => {
    if (!user?.displayName) return '?';
    return user.displayName
      .split(' ')
      .map(name => name.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Update Profile Picture</Modal.Title>
      </Modal.Header>
      
      <Modal.Body>
        {uploadError && (
          <Alert variant="danger" className="mb-3">
            {uploadError}
          </Alert>
        )}

        {/* Current Avatar Display */}
        <div className="d-flex flex-column align-items-center mb-4">
          <h6 className="mb-3">Current Avatar</h6>
          <UserAvatar
            user={currentUser}
            size="xl"
            className="mb-2"
          />
          <div className="small text-muted">
            {currentUser?.photoURL ? 'Custom Image' : `Initials: ${getUserInitials(currentUser)}`}
          </div>
        </div>

        {/* File Upload Section */}
        <Form.Group className="mb-3">
          <Form.Label>Choose New Image</Form.Label>
          <Form.Control
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleFileSelect}
            disabled={uploading || removing}
          />
          <Form.Text className="text-muted">
            Supported formats: JPG, PNG, GIF. Maximum size: 5MB.
          </Form.Text>
        </Form.Group>

        {/* Preview Section */}
        {previewUrl && (
          <div className="text-center mb-3">
            <h6 className="mb-3">Preview</h6>
            <div 
              className="rounded-circle mx-auto mb-2"
              style={{
                width: '100px',
                height: '100px',
                backgroundImage: `url(${previewUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                border: '3px solid #dee2e6'
              }}
            />
            <div className="small text-muted">New Image Preview</div>
          </div>
        )}

        {/* Action Buttons */}
        <Row className="g-2">
          {/* Upload New Image */}
          <Col xs={6}>
            <div className="d-grid">
              <Button
                variant="primary"
                onClick={handleUpload}
                disabled={!selectedFile || uploading || removing}
              >
                {uploading ? (
                  <>
                    <Spinner size="sm" className="me-2" />
                    Uploading...
                  </>
                ) : (
                  'Upload Image'
                )}
              </Button>
            </div>
          </Col>

          {/* Remove Current Image */}
          <Col xs={6}>
            <div className="d-grid">
              <Button
                variant="outline-danger"
                onClick={handleRemoveImage}
                disabled={!currentUser?.photoURL || uploading || removing}
              >
                {removing ? (
                  <>
                    <Spinner size="sm" className="me-2" />
                    Removing...
                  </>
                ) : (
                  'Use Initials'
                )}
              </Button>
            </div>
          </Col>
        </Row>

        {/* Help Text */}
        <div className="mt-3 p-3 rounded">
          <h6 className="small fw-bold mb-2">💡 Avatar Options:</h6>
          <ul className="small mb-0 ps-3">
            <li><strong>Upload Image:</strong> Choose a custom photo from your device</li>
            <li><strong>Use Initials:</strong> Display your name initials as avatar</li>
            <li><strong>Auto Fallback:</strong> If no image is uploaded, initials are used automatically</li>
          </ul>
        </div>
      </Modal.Body>

      <Modal.Footer>
        <Button 
          variant="secondary" 
          onClick={handleClose}
          disabled={uploading || removing}
        >
          Cancel
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ProfileAvatarUpload;

