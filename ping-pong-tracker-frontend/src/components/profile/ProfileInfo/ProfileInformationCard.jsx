import React, { useState, useContext } from "react";
import { Form, Button, Alert, Spinner } from "react-bootstrap";
import { AuthContext } from "../../../contexts/AuthContext";
import {
  useGetUserProfileQuery,
  useUpdateUserProfileMutation,
} from "../../../store/slices/apiSlice";
import DashboardCard from "../../common/Card";
import UserAvatar from "../../common/UserAvatar";
import ProfileAvatarUpload from "../ImageUpload/ProfileAvatarUpload";

const ProfileInformationCard = ({ title = "Profile Information" }) => {
  const { currentUser } = useContext(AuthContext);
  const [isEditing, setIsEditing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  // Fetch user profile data
  const {
    data: userProfile,
    error: profileError,
    isLoading: profileLoading,
  } = useGetUserProfileQuery(currentUser?.uid, {
    skip: !currentUser?.uid,
  });

  // Update profile mutation
  const [updateProfile, { isLoading: updateLoading, error: updateError }] =
    useUpdateUserProfileMutation();

  // Form state
  const [formData, setFormData] = useState({
    displayName: "",
    email: "",
    bio: "",
  });

  // Initialize form data when profile loads
  React.useEffect(() => {
    if (userProfile) {
      setFormData({
        displayName: userProfile.displayName || "",
        email: userProfile.email || "",
        bio: userProfile.bio || "",
      });
    }
  }, [userProfile]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await updateProfile({
        userId: currentUser.uid,
        profileData: formData,
      }).unwrap();

      setIsEditing(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error("Failed to update profile:", error);
    }
  };

  const handleCancel = () => {
    // Reset form data to original values
    if (userProfile) {
      setFormData({
        displayName: userProfile.displayName || "",
        email: userProfile.email || "",
        bio: userProfile.bio || "",
      });
    }
    setIsEditing(false);
  };

  // Get user initials for display
  const getUserInitials = (user) => {
    if (!user?.displayName) return '?';
    return user.displayName
      .split(' ')
      .map(name => name.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (profileLoading) {
    return (
      <DashboardCard title={title}>
        <div className="text-center py-4">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2 text-muted">Loading profile...</p>
        </div>
      </DashboardCard>
    );
  }

  if (profileError) {
    return (
      <DashboardCard title={title}>
        <Alert variant="danger">Error loading profile information</Alert>
      </DashboardCard>
    );
  }

  return (
    <>
      <DashboardCard title={title}>
        {/* Avatar Section */}
        <div className="text-center mb-4">
          <div className="position-relative d-inline-block">
            <UserAvatar
              user={{
                photoURL: userProfile?.photoURL,
                displayName: userProfile?.displayName,
              }}
              size="xl"
              className="mb-2 profile__image"
            />
            
            {/* Avatar Edit Button */}
            <Button
              variant="primary"
              size="sm"
              className="position-absolute bottom-0 end-0 rounded-circle p-1"
              style={{ 
                width: '32px', 
                height: '32px',
                transform: 'translate(25%, 25%)'
              }}
              onClick={() => setShowAvatarModal(true)}
              title="Change avatar"
            >
              <i className="bi bi-camera" style={{ fontSize: '14px' }}></i>
            </Button>
          </div>
          
          <h5 className="mb-1">{userProfile?.displayName || 'Unknown User'}</h5>
          <p className="text-muted mb-2">{userProfile?.email}</p>
          
          {/* Avatar Type Indicator */}
          <div className="small text-muted">
            {userProfile?.photoURL ? (
              <span className="badge bg-success">
                <i className="bi bi-image me-1"></i>
                Custom Image
              </span>
            ) : (
              <span className="badge bg-secondary">
                <i className="bi bi-person me-1"></i>
                Initials: {getUserInitials(userProfile)}
              </span>
            )}
          </div>
        </div>

        {showSuccess && (
          <Alert variant="success" className="mb-3">
            <i className="bi bi-check-circle me-2"></i>
            Profile updated successfully!
          </Alert>
        )}

        {updateError && (
          <Alert variant="danger" className="mb-3">
            <i className="bi bi-exclamation-triangle me-2"></i>
            Failed to update profile. Please try again.
          </Alert>
        )}

        <Form onSubmit={handleSave}>
          <Form.Group className="mb-3">
            <Form.Label>
              <i className="bi bi-person me-2"></i>
              Display Name
            </Form.Label>
            <Form.Control
              type="text"
              name="displayName"
              value={formData.displayName}
              onChange={handleInputChange}
              disabled={!isEditing}
              placeholder="Enter your display name"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>
              <i className="bi bi-envelope me-2"></i>
              Email
            </Form.Label>
            <Form.Control
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              disabled={!isEditing}
              placeholder="Enter your email"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>
              <i className="bi bi-chat-text me-2"></i>
              Bio
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              name="bio"
              value={formData.bio}
              onChange={handleInputChange}
              disabled={!isEditing}
              placeholder="Tell us about yourself..."
            />
            <Form.Text className="text-muted">
              Share a bit about your ping pong journey!
            </Form.Text>
          </Form.Group>

          <div className="d-grid gap-2">
            {!isEditing ? (
              <Button 
                variant="primary" 
                onClick={() => setIsEditing(true)}
              >
                <i className="bi bi-pencil me-2"></i>
                Edit Profile
              </Button>
            ) : (
              <div className="d-flex gap-2">
                <Button 
                  variant="success" 
                  type="submit"
                  disabled={updateLoading}
                  className="flex-fill"
                >
                  {updateLoading ? (
                    <>
                      <Spinner size="sm" className="me-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-lg me-2"></i>
                      Save Changes
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline-secondary" 
                  onClick={handleCancel}
                  disabled={updateLoading}
                  className="flex-fill"
                >
                  <i className="bi bi-x-lg me-2"></i>
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </Form>

        {/* Quick Avatar Actions */}
        <div className="mt-3 pt-3 border-top">
          <div className="d-flex justify-content-center">
            <Button
              variant="outline-primary"
              size="sm"
              onClick={() => setShowAvatarModal(true)}
            >
              <i className="bi bi-camera me-2"></i>
              Change Avatar
            </Button>
          </div>
        </div>
      </DashboardCard>

      {/* Avatar Upload Modal */}
      <ProfileAvatarUpload
        show={showAvatarModal}
        onHide={() => setShowAvatarModal(false)}
        userId={currentUser?.uid}
        currentUser={{
          ...userProfile,
          photoURL: userProfile?.photoURL,
          displayName: userProfile?.displayName
        }}
      />
    </>
  );
};

export default ProfileInformationCard;

