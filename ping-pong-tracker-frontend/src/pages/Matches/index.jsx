import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Form,
  Table,
  Badge,
  Dropdown,
  Spinner,
} from "react-bootstrap";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import Jumbotron from "../../components/common/Jumbotron";
import UserAvatar from "../../components/common/UserAvatar";
import matchService from "../../services/matchService";
import userService from "../../services/userService";
import { formatScheduledDateTime } from "../../utils/dateUtils";
import createTestMatch from "../../utils/createTestMatch";
import invitationService from "../../services/invitationService";
import createTestInvitation from "../../utils/createTestInvitation";
import { toast } from "react-toastify";

import AllMatchesCard from "../../components/match/AllMatches/AllMatchesCard";
import RecentActivityCard from '../../components/dashboard/RecentActivityCard';
import OngoingMatchesCard from '../../components/dashboard/OngoingMatchesCard'; 

const Matches = () => {
  return (
    <div className="matches-page">
      {/* Standard Jumbotron */}
      <Jumbotron
        title="Matches"
        subtitle="Manage your ping-pong matches and invitations"
        backgroundImage="https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80"
        height="300px"
        overlay={true}
        textAlign="left"
        fullWidth={true}
      />

      {/* Matches Content with Overlap Effect */}
      <div className="jumbotron-overlap-container">
        <Container fluid className="py-5">
          <Row className="g-4">
            {/* All Matches Table Card (main feature) */}
            <Col lg={12}>
              <AllMatchesCard />
            </Col>

            {/* Reused Cards from Dashboard */}
            <Col lg={6} xl={4}>
              {" "}
              {/* Adjust column sizes as needed */}
              <RecentActivityCard />
            </Col>
            <Col lg={6} xl={8}>
              {" "}
              {/* Adjust column sizes as needed */}
              <OngoingMatchesCard />
            </Col>
          </Row>
        </Container>
      </div>
    </div>
  );
};

export default Matches;
