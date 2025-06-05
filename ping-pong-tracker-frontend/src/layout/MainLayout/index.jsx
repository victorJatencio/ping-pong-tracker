import React from 'react';
import { Outlet } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import Navigation from '../../components/common/Navbar';
import TabNavigation from '../../components/common/TabNavigation';

const MainLayout = () => {
    return (
        <div className="d-flex flex-column min-vh-100">
            <Navigation />
            <TabNavigation />
            <Container className="flex-grow-1 py-4">
                <Outlet />
            </Container>
            <footer className="bg-light py-3 border-top">
                <Container className="text-center text-muted">
                    <small>© {new Date().getFullYear()} Ping-Pong Score Tracker</small>
                </Container>
            </footer>
        </div>
    );
};

export default MainLayout;