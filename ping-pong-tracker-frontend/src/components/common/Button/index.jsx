import React from 'react';


const GradientButton = ({
  children,
  onClick,
  disabled = false,
  type = 'button',
  size = 'medium',
  variant = 'primary',
  className = '',
  style = {},
  ...props
}) => {
  // Size variants
  const sizeClasses = {
    small: 'gradient-btn-small',
    medium: 'gradient-btn-medium',
    large: 'gradient-btn-large'
  };

  // Variant classes (for future customization)
  const variantClasses = {
    primary: 'gradient-btn-primary',
    secondary: 'gradient-btn-secondary'
  };

  const buttonClasses = [
    'gradient-btn',
    sizeClasses[size],
    variantClasses[variant],
    disabled ? 'gradient-btn-disabled' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      type={type}
      className={buttonClasses}
      onClick={onClick}
      disabled={disabled}
      style={style}
      {...props}
    >
      <span className="gradient-btn-content">
        {children}
      </span>
    </button>
  );
};

export default GradientButton;
