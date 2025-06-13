import React from 'react';
import { Row, Col } from 'react-bootstrap';

const PageHeader = ({ 
  title, 
  subtitle, 
  actions,
  className = '',
  ...props 
}) => {
  return (
    <Row className={`mb-4 ${className}`} {...props}>
      <Col>
        <h1 className="h3 mb-1">{title}</h1>
        {subtitle && <p className="text-muted">{subtitle}</p>}
      </Col>
      {actions && (
        <Col xs="auto" className="d-flex align-items-center">
          {actions}
        </Col>
      )}
    </Row>
  );
};

export default PageHeader;