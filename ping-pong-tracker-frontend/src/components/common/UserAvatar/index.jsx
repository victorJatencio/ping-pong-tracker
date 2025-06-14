import React, { useState } from 'react';

const UserAvatar = ({ 
    user, 
    size = 32, 
    className = '', 
    showOnlineStatus = false 
}) => {
    const [imageError, setImageError] = useState(false);
    
    // Get user's avatar URL
    const avatarUrl = user?.photoURL || user?.avatarUrl;
    
    // Get user's display name or email for alt text
    const displayName = user?.displayName || user?.name || user?.email || 'User';
    
    // Get initials for fallback
    const getInitials = (name) => {
        if (!name) return 'U';
        return name
            .split(' ')
            .map(word => word.charAt(0))
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const initials = getInitials(displayName);

    const handleImageError = () => {
        setImageError(true);
    };

    // If no avatar URL or image failed to load, show initials
    const showInitials = !avatarUrl || imageError;

    return (
        <div 
            className={`user-avatar position-relative ${className}`}
            style={{ width: size, height: size }}
        >
            {!showInitials ? (
                /* Profile Image */
                <img
                    src={avatarUrl}
                    alt={`${displayName}'s avatar`}
                    className="rounded-circle"
                    style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover',
                        border: '2px solid rgba(255, 255, 255, 0.2)'
                    }}
                    onError={handleImageError}
                />
            ) : (
                /* Fallback with initials */
                <div
                    className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
                    style={{
                        width: '100%',
                        height: '100%',
                        backgroundColor: '#5C6BC0',
                        fontSize: size > 40 ? '1rem' : '0.8rem',
                        border: '2px solid rgba(255, 255, 255, 0.2)'
                    }}
                >
                    {initials}
                </div>
            )}

            {/* Online status indicator */}
            {showOnlineStatus && (
                <div
                    className="position-absolute rounded-circle bg-success border border-white"
                    style={{
                        width: size * 0.25,
                        height: size * 0.25,
                        bottom: 0,
                        right: 0,
                        borderWidth: '2px !important'
                    }}
                ></div>
            )}
        </div>
    );
};

export default UserAvatar;
