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
import OngoingMatchesCard from "../../components/dashboard/OngoingMatchesCard";

const Matches = () => {
  return (
    <div className="matches-page">
      {/* Standard Jumbotron */}
      <Jumbotron
        title="Matches"
        subtitle="Manage your ping-pong matches and invitations"
        backgroundImage="images/Matches-Banner_web.jpg"
        height="300px"
        overlay={true}
        textAlign="left"
        fullWidth={true}
      />

      {/* Matches Content with Overlap Effect */}
      <div className="jumbotron-overlap-container">
        <Container fluid className="py-5 mobile__position_grid">
          <Row className="g-4">
            {/* All Matches Table Card (main feature) */}
            <Col lg={12}>
              <AllMatchesCard />
            </Col>
            <Col lg={6}>
              <RecentActivityCard />
            </Col>
            <Col lg={6}>
              <OngoingMatchesCard/>
            </Col>
          </Row>
        </Container>
      </div>
    </div>
  );
};

export default Matches;
