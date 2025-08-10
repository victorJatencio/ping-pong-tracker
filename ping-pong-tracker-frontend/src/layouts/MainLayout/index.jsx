import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import Navigation from '../../components/common/Navbar';
import MobileNav from '../../components/common/MobileNav';
import TabNavigation from '../../components/common/TabNavigation';

const MainLayout = () => {
    const location = useLocation();

    return (
        <div className="d-flex flex-column min-vh-100">
            <Navigation />
            <TabNavigation/>
            <MobileNav/>
            <Container className="flex-grow-1">
                <div key={location.pathname}>
                    <Outlet />
                </div>
            </Container>
            <footer className="footer border-top">
                <Container className="text-center text-muted">
                    <small>© {new Date().getFullYear()} Ping-Pong Score Tracker</small>
                </Container>
            </footer>
        </div>
    );
};

export default React.memo(MainLayout);