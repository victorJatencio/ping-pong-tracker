import React from 'react';
import { Outlet } from 'react-router-dom';
import { Container, Row, Col } from 'react-bootstrap';

const AuthLayout = () => {
    return (
        <Container fluid className='vh-100 bg-light'>
            <Row className='justify-content-center align-items-center h-100'>
                <Col xs={12} sm={10} md={8} lg={6} xl={5}>
                    <Outlet />
                </Col>
            </Row>
        </Container>
    )
}

export default AuthLayout;