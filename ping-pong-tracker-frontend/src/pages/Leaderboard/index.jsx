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
import Jumbotron from "../../components/common/Jumbotron";
import TotalPlayersCard from "../../components/leaderboard/TotalPlayerCard";
import YourRankCard from "../../components/leaderboard/YourRankCard";
import TopPlayerCard from "../../components/leaderboard/TopPlayerCard";
import HallOfFameCard from "../../components/leaderboard/HallOfFameCard";
import PlayerRankingsCard from "../../components/leaderboard/PlayerRankingsCard";

const Leaderboard = () => {
  return (
    <div className="leaderboard-page">
      
      <Jumbotron
        title="Leaderboard"
        subtitle="See how you rank against other players"
        backgroundImage="images/Leaderboard-Banner_web.jpg"
        height="300px"
        overlay={true}
        textAlign="left"
        fullWidth={true}
        className="jumbotron-success"
      />

      
      <div className="jumbotron-overlap-container">
        <Container className="py-5 mobile__position_grid">
          <Row className="g-4 mb-4">
            <Col lg={4}>
              <TotalPlayersCard />
            </Col>
            <Col lg={4}>
              <YourRankCard />
            </Col>
            <Col lg={4}>
            <TopPlayerCard/>
            </Col>
          </Row>
          <Row className="g-4">
            <Col lg={6}>
              <PlayerRankingsCard />
            </Col>
            <Col lg={6}>
            <HallOfFameCard/>
            </Col>
          </Row>
        </Container>
      </div>
    </div>
  );
};

export default Leaderboard;
