import React, { useContext } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import Jumbotron from '../../components/common/Jumbotron';
import ProfileInformationCard from '../../components/profile/ProfileInfo/ProfileInformationCard';
import AccountManagementCard from '../../components/profile/AccountManagement/AccountManagementCard';
import { AuthContext } from '../../contexts/AuthContext';

const Profile = () => {
  const { currentUser } = useContext(AuthContext);

  return (
    <div className="profile-page">
      {/* Standard Jumbotron */}
      <Jumbotron
        title="Profile"
        subtitle="Manage your account settings and personal information"
        backgroundImage="https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80"
        height="300px"
        overlay={true}
        textAlign="left"
        fullWidth={true}
      />

      {/* Profile Content with Overlap Effect */}
      <div className="jumbotron-overlap-container">
        <Container className="py-5">
          <Row className="g-4">
            {/* Profile Information */}
            <Col lg={6}>
              <ProfileInformationCard />
            </Col>

            {/* Account Management */}
            <Col lg={6}>
              <AccountManagementCard />
            </Col>
          </Row>
        </Container>
      </div>
    </div>
  );
};

export default Profile;

