import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Badge,
  Form,
  Button,
  Spinner,
  Alert,
} from "react-bootstrap";
// import { Link } from 'react-router-dom';
// import { useAuth } from '../../hooks/useAuth';
// import { db } from '../../config/firebase';
// import { collection, getDocs, onSnapshot } from 'firebase/firestore';
// import statsService from '../../services/statsService';
import Jumbotron from "../../components/common/Jumbotron";
import PlayerRankingsCard from "../../components/leaderboard/PlayerRankingsCard";
// import UserAvatar from '../../components/common/UserAvatar';

const Leaderboard = () => {
  return (
    <div className="leaderboard-page">
      {/* Standard Jumbotron */}
      <Jumbotron
        title="Leaderboard"
        subtitle="See how you rank against other players"
        backgroundImage="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80"
        height="300px"
        overlay={true}
        textAlign="left"
        fullWidth={true}
        className="jumbotron-success"
      />

      {/* Leaderboard Content with Overlap Effect */}
      <div className="jumbotron-overlap-container">
        <Container className="py-5">
          <Row>
            <Col lg={12}>
              <PlayerRankingsCard />
            </Col>
          </Row>
          <Row>
            <Col>
            </Col>
          </Row>
        </Container>
      </div>
    </div>
  );
};

export default Leaderboard;
