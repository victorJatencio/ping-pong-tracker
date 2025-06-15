import React from 'react';
import { Container } from 'react-bootstrap';

const Jumbotron = ({
    title,
    subtitle,
    backgroundImage,
    height = "400px",
    overlay = true,
    textAlign = "left", // Changed default to left
    className = "",
    children,
    fullWidth = true // New prop for full-width control
}) => {
    const jumbotronStyle = {
        height: height,
        backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
    };

    return (
        <div 
            className={`jumbotron ${fullWidth ? 'jumbotron-full-width' : ''} ${className}`} 
            style={jumbotronStyle}
        >
            {overlay && backgroundImage && <div className="jumbotron-overlay"></div>}
            
            <Container className="h-100">
                <div className={`jumbotron-content h-100 d-flex flex-column justify-content-center text-${textAlign}`}>
                    {title && (
                        <h1 className="jumbotron-title display-4 fw-bold mb-3">
                            {title}
                        </h1>
                    )}
                    
                    {subtitle && (
                        <p className="jumbotron-subtitle lead mb-4">
                            {subtitle}
                        </p>
                    )}
                    
                    {children && (
                        <div className="jumbotron-actions">
                            {children}
                        </div>
                    )}
                </div>
            </Container>
        </div>
    );
};

export default Jumbotron;
