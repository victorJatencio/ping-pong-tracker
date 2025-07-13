import React from "react";
import { Navbar, Container, Nav, Button, Dropdown } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth";
import { useGetUserProfileQuery } from "../../../store/slices/apiSlice";
import ThemeToggle from "../ThemeToggle";
import NotificationBell from "../NotificationBell";
import UserAvatar from "../UserAvatar";

const Navigation = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  
  // Use RTK Query to get user profile data for display
  const { 
    data: userProfile, 
    isLoading: profileLoading,
    error: profileError 
  } = useGetUserProfileQuery(currentUser?.uid, {
    skip: !currentUser?.uid
  });

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Use profile data from RTK Query if available, fallback to currentUser
  const displayUser = userProfile || currentUser;
  const displayName = displayUser?.displayName || displayUser?.email;
  const photoURL = displayUser?.photoURL;

  return (
    <Navbar bg="primary" variant="dark" expand="lg">
      <Container>
        <Navbar.Brand as={Link} to={currentUser ? '/dashboard' : '/'}>
          Ping-Pong Tracker
        </Navbar.Brand>
        
        {currentUser && (
          <Nav>
            {/* Header controls in order: Theme Toggle, Notifications, User Profile Dropdown */}
            <div className="d-flex align-items-center gap-2">
              {/* Theme Toggle */}
              <ThemeToggle />
              
              {/* Notification Bell */}
              <NotificationBell />
              
              {/* User Profile Dropdown with Avatar */}
              <Dropdown align="end">
                <Dropdown.Toggle
                  variant="link"
                  className="nav-link text-white d-flex align-items-center gap-2 text-decoration-none border-0 bg-transparent"
                  id="user-dropdown"
                >
                  <UserAvatar 
                    user={displayUser} 
                    size={32} 
                    showOnlineStatus={false}
                  />
                  <span className="d-none d-md-inline">
                    {profileLoading ? 'Loading...' : displayName}
                  </span>
                </Dropdown.Toggle>
                
                <Dropdown.Menu>
                  <Dropdown.Item as={Link} to="/profile">
                    <i className="bi bi-person-circle me-2"></i>
                    Profile
                  </Dropdown.Item>
                  <Dropdown.Item as={Link} to="/settings">
                    <i className="bi bi-gear me-2"></i>
                    Settings
                  </Dropdown.Item>
                  <Dropdown.Divider />
                  <Dropdown.Item onClick={handleLogout}>
                    <i className="bi bi-box-arrow-right me-2"></i>
                    Logout
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </div>
          </Nav>
        )}
      </Container>
    </Navbar>
  );
};

export default React.memo(Navigation);

