import React from "react";
import { Navbar, Container, Nav, Button } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';

const Navigation = () => {
    const location = useLocation();
    const isAuthPage = ['/login', '/register'].includes(location.pathname);

    return (
        <Navbar bg="primary" variant="dark" expand="lg">
            <Container>
                <Navbar.Brand as={Link} to="/dashboard">Ping-Pong Tracker</Navbar.Brand>
                <Navbar.Toggle aria-controls="basic-navbar-nav" />
                <Navbar.Collapse id="basic-navbar-nav" className="justify-content-end">
                    {isAuthPage ? (
                        // Show these links on auth pages
                        <Nav>
                            <Nav.Item>
                                <Nav.Link as={Link} to="/login" active={location.pathname === '/login'}>
                                    Login
                                </Nav.Link>
                            </Nav.Item>
                            <Nav.Item>
                                <Nav.Link as={Link} to="/register" active={location.pathname === '/register'}>
                                    Register
                                </Nav.Link>
                            </Nav.Item>
                        </Nav>
                    ) : (
                        // Show these links on main app pages
                        <Nav>
                            <Nav.Item>
                                <Nav.Link as={Link} to="/profile"> Profile </Nav.Link>
                            </Nav.Item>
                            <Nav.Item>
                                <Nav.Link as={Link} to="/login">Logout</Nav.Link>
                            </Nav.Item>
                        </Nav>
                    )}
                </Navbar.Collapse>
            </Container>
        </Navbar>
    )
}

export default Navigation;