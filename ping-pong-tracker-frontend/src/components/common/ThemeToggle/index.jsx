import React, { useContext } from 'react';
import { Button } from 'react-bootstrap';
import { ThemeContext } from '../../../contexts/ThemeContext';

const ThemeToggle = () => {
    const { darkMode, toggleTheme } = useContext(ThemeContext);

    return (
        <Button
            variant="link"
            size="sm"
            className="theme-toggle-btn rounded-circle p-2"
            onClick={toggleTheme}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
            {darkMode ? (
                <i className="bi bi-sun-fill text-white fs-5"></i>
            ) : (
                <i className="bi bi-moon-fill text-white fs-5"></i>
            )}
        </Button>
    );
};

export default ThemeToggle;
