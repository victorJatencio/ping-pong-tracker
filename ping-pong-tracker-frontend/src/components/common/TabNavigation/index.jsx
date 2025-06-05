import React from "react";
import { Nav, Container } from 'react-bootstrap';
import { NavLink, useLocation } from "react-router-dom";

const TabNavigation = () => {
    const location = useLocation();

    // Define tabs with their routes and labels
    const tabs = [
        { path: '/dasboard', label: 'Dashboard'},
        { path: '/matches', label: 'Matches'},
        { path: '/leaderboard', label: 'Leaderboard'},
        { path: '/history', label: 'History'},
        { path: '/profile', label: 'Profile'},
    ];

    return (
        <Container fluid className="border-bottom bg-white">
            <Container>
                <Nav className="nav-tabs border-bottom-0">
                    {tabs.map((tab) => (
                      <Nav.Item key={tab.path}>
                         <Nav.Link
                             as={NavLink}
                             to={tab.path}
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

export default TabNavigation;