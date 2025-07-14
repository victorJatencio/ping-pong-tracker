import React from "react";
import { Container, Row, Col } from "react-bootstrap";

import Jumbotron from "../../components/common/Jumbotron";
import MatchHistoryCard from "../../components/history/MatchHistory/MatchHistoryCard";
import TotalMatchesCard from "../../components/history/TotalMatchesCard/TotalMatchesCard";
import WinLossRatio from "../../components/dashboard/WinLossRatio";
import LongestStreakCard from "../../components/history/LongestStreak/LongestStreakCard";
import MonthlySummaryCard from "../../components/history/MonthlySummary/MonthlySummaryCard";
import PerformanceOverTimeCard from "../../components/history/PerformanceOT/PerformanceOverTimeCard";

const History = () => {
  return (
    <div className="history-page">
      {/* Standard Jumbotron */}
      <Jumbotron
        title="Match History"
        subtitle={`View your # matches and performance over time`}
        backgroundImage="https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80"
        height="300px"
        overlay={true}
        textAlign="left"
        fullWidth={true}
        className="jumbotron-primary"
      />

      {/* History Content with Overlap Effect */}
      <div className="jumbotron-overlap-container">
        <Container className="py-5">
          <Row className="g-4">
            <Col lg={4}>
              <TotalMatchesCard />
            </Col>
            <Col lg={4}>
              <WinLossRatio />
            </Col>
            <Col lg={4}>
              <LongestStreakCard />
            </Col>
          </Row>

          <Row className="lg-12">
            <Col lg={12}>
              <MonthlySummaryCard />
            </Col>
          </Row>

          <Row className="lg-12">
            <Col lg={12}>
              <MatchHistoryCard />
            </Col>
          </Row>
        </Container>
      </div>
    </div>
  );
};

export default History;
