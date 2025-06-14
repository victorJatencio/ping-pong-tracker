import React from "react";
import { Navbar, Container, Nav, Button, Dropdown } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import ThemeToggle from '../ThemeToggle';
import NotificationBell from '../NotificationBell';
import UserAvatar from '../UserAvatar';

const Navigation = () => {
    const { currentUser, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    return (
    <Navbar bg="primary" variant="dark" expand="lg">
      <Container>
        <Navbar.Brand as={Link} to={currentUser ? '/dashboard' : '/'}>
          Ping-Pong Tracker
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav" className="justify-content-end">
          {currentUser ? (
            <Nav>
              {/* Header controls in order: Theme Toggle, Notifications, User Profile */}
              <div className="d-flex align-items-center gap-2">
                {/* Theme Toggle */}
                <ThemeToggle />

                {/* Notification Bell */}
                <NotificationBell />

                {/* User Profile Dropdown with Avatar */}
                <Dropdown align="end">
                  <Dropdown.Toggle 
                    variant="link" 
                    className="nav-link text-white d-flex align-items-center gap-2 text-decoration-none"
                    id="user-dropdown"
                  >
                    <UserAvatar user={currentUser} size={32} />
                    <span className="d-none d-md-inline">
                      {currentUser.displayName || currentUser.email}
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
          ) : (
            <Nav>
              <Nav.Link as={Link} to="/login">Login</Nav.Link>
              <Nav.Link as={Link} to="/register">Register</Nav.Link>
            </Nav>
          )}
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default Navigation;
