import React from "react";
import { Navbar, Container, Nav, Button, Dropdown } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import ThemeToggle from '../ThemeToggle';

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
            {/* This Button will need to be removed */}
              <Button 
                variant="success" 
                size="sm" 
                className="me-3"
                as={Link}
                to="/matches/create"
              >
                CREATE MATCH
              </Button>

              {/* Inside Navbar component's return statement: */}

              <div className="d-flex align-items-center">
                <ThemeToggle />

                <Dropdown align="end">
                  <Dropdown.Toggle variant="link" className="nav-link text-white">
                    {currentUser.displayName || currentUser.email}
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <Dropdown.Item as={Link} to="/profile">Profile</Dropdown.Item>
                    <Dropdown.Divider />
                    <Dropdown.Item onClick={handleLogout}>Logout</Dropdown.Item>
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