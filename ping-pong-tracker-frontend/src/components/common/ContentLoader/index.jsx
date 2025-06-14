// src/components/common/ContentLoader/index.jsx
import React from 'react';
import { Card } from 'react-bootstrap';

const ContentLoader = ({ 
  lines = 3,
  height = '1rem',
  width = '100%',
  className = '',
  ...props 
}) => {
  return (
    <div className={`content-loader ${className}`} {...props}>
      {Array.from({ length: lines }).map((_, index) => (
        <div 
          key={index}
          className="bg-secondary bg-opacity-25 rounded mb-2 animate-pulse"
          style={{ 
            height, 
            width: typeof width === 'function' ? width(index) : width,
            maxWidth: '100%'
          }}
        />
      ))}
    </div>
  );
};

export const CardLoader = ({ lines = 5 }) => (
  <Card>
    <Card.Body>
      <ContentLoader lines={lines} width={(i) => i === 0 ? '60%' : '100%'} />
    </Card.Body>
  </Card>
);

export default ContentLoader;
