import React from 'react';
import { Container } from 'react-bootstrap';

const PageContainer = ({ 
  children, 
  fluid = false, 
  className = '', 
  ...props 
}) => {
  return (
    <Container 
      fluid={fluid} 
      className={`py-4 ${className}`} 
      {...props}
    >
      {children}
    </Container>
  );
};

export default PageContainer;