import React from "react";
import { Nav, Container } from 'react-bootstrap';
import { NavLink, useLocation } from "react-router-dom";

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
            </Container>
        </Container>
    );
};

export default React.memo(TabNavigation);