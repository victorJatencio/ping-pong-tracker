import React from "react";
import { Nav, Container, Button } from 'react-bootstrap';
import { NavLink, useLocation, Link } from "react-router-dom";

const TabNavigation = () => {
    const location = useLocation();

    // Define tabs with their routes and labels
    const tabs = [
        { path: '/dashboard', label: 'Dashboard'},
        { path: '/matches', label: 'Matches'},
        { path: '/leaderboard', label: 'Leaderboard'},
        { path: '/history', label: 'History'},
        { path: '/profile', label: 'Profile'},
    ];

    // Prevent navigation if already on the same route
    const handleTabClick = (e, path) => {
        if (location.pathname === path) {
            e.preventDefault();
            return false;
        }
    };

    return (
        <Container fluid className="border-bottom tab-navigation">
            <Container>
                <div className="d-flex justify-content-between align-items-center">
                    {/* Navigation tabs on the left */}
                    <Nav className="nav nav-underline">
                        {tabs.map((tab) => (
                          <Nav.Item key={tab.path}>
                             <Nav.Link
                                 as={NavLink}
                                 to={tab.path}
                                 onClick={(e) => handleTabClick(e, tab.path)}
                                 end 
                                 >
                                 {tab.label}
                             </Nav.Link>
                          </Nav.Item>
                        ))}
                    </Nav>
                    
                    {/* Create Match button on the right */}
                    <Button 
                        variant="success" 
                        size="sm" 
                        className="create-match-btn"
                        as={Link}
                        to="/matches/create"
                    >
                        <i className="bi bi-plus-circle me-1"></i>
                        CREATE MATCH
                    </Button>
                </div>
            </Container>
        </Container>
    );
};

export default React.memo(TabNavigation);
