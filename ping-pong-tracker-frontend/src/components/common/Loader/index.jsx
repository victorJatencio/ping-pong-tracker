import React from 'react';
import { Spinner } from 'react-bootstrap';

const Loader = ({ 
  size = 'md', 
  variant = 'primary',
  fullPage = false,
  text = 'Loading...',
  ...props 
} ) => {
  if (fullPage) {
    return (
      <div className="d-flex flex-column justify-content-center align-items-center vh-100">
        <Spinner 
          animation="border" 
          variant={variant} 
          role="status"
          className={`spinner-${size}`}
          {...props}
        />
        {text && <p className="mt-3 text-muted">{text}</p>}
      </div>
    );
  }

  return (
    <div className="d-flex flex-column justify-content-center align-items-center p-4">
      <Spinner 
        animation="border" 
        variant={variant} 
        role="status"
        className={`spinner-${size}`}
        {...props}
      />
      {text && <p className="mt-2 text-muted small">{text}</p>}
    </div>
  );
};

export default Loader;