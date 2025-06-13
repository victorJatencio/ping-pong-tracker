import React, { useContext } from 'react';
import { Button } from 'react-bootstrap';
import { ThemeContext } from '../../../contexts/ThemeContext';

const ThemeToggle = () => {
    const { darkMode, toggleTheme } = useContext(ThemeContext);

    return (
        <Button
            variant="outline-secondary"
            size="sm"
            className='rounded-circle'
            onClick={toggleTheme}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
            {darkMode ? (
                <i className="bi bi-sun-fill"></i>
            ) : (
                <i className="bi bi-moon-fill"></i>
            )}
        </Button>
    );
};

export default ThemeToggle;