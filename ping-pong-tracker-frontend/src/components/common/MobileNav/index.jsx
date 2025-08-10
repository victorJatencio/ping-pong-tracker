import React from "react";
import { Nav, Container, Button } from 'react-bootstrap';
import { NavLink, useLocation } from "react-router-dom";
import { useDispatch } from 'react-redux';
import { openMatchCreationModal } from '../../../store/slices/uiSlice';
import GradientButton from "../Button";
import { RiPingPongFill } from "react-icons/ri";
import { FaHouse, FaCircleUser, FaCirclePlus  } from "react-icons/fa6";
import { MdLeaderboard } from "react-icons/md";
import { FaHistory } from "react-icons/fa";


const MobileNav = () => {
    const location = useLocation();
    const dispatch = useDispatch();

    const handleShowMatchModal = () => {
        dispatch(openMatchCreationModal());
    };
    

    // Define tabs with their routes and labels
    const tabs = [
        { path: '/dashboard', label: <FaHouse />},
        { path: '/matches', label: <RiPingPongFill />},
        { path: '/leaderboard', label: <MdLeaderboard />},
        { path: '/history', label: <FaHistory />},
        { path: '/profile', label: <FaCircleUser />},
    ];

    // Prevent navigation if already on the same route
    const handleTabClick = (e, path) => {
        if (location.pathname === path) {
            e.preventDefault();
            return false;
        }
    };

    return (
        <Container fluid className="border-bottom tab-navigation mobile__nav">
            
                <div className="d-flex flex-row justify-content-center">
                    {/* Navigation tabs on the left */}
                    <Nav className="nav nav-underline mobile__navMenu">
                        {tabs.map((tab) => (
                          <Nav.Item key={tab.path}>
                             <Nav.Link
                                 as={NavLink}
                                 to={tab.path}
                                 onClick={(e) => handleTabClick(e, tab.path)}
                                 end
                                 className="mobile__nav-item" 
                                 >
                                 {tab.label}
                             </Nav.Link>
                          </Nav.Item>
                        ))}
                    </Nav>
                    
                    {/* Create Match button on the right */}
                    <GradientButton 
                        variant="success" 
                        size="sm" 
                        className="mobile__create-match-btn"
                        onClick={handleShowMatchModal}
                    >
                        <FaCirclePlus />
                        
                    </GradientButton>
                </div>
           
        </Container>
    );
};

export default React.memo(MobileNav);
