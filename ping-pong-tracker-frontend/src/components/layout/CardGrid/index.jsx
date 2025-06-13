import React from 'react';
import { Row, Col } from 'react-bootstrap';

const CardGrid = ({ 
  children, 
  columns = { xs: 1, md: 2, lg: 3 },
  spacing = 4,
  className = '',
  ...props 
}) => {
  return (
    <Row 
      xs={columns.xs} 
      md={columns.md} 
      lg={columns.lg}
      className={`g-${spacing} ${className}`}
      {...props}
    >
      {React.Children.map(children, child => (
        <Col>{child}</Col>
      ))}
    </Row>
  );
};

export default CardGrid;