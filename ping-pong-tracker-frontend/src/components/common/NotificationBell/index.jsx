import React, { useState } from 'react';
import { Button, Badge, Dropdown } from 'react-bootstrap';

const NotificationBell = () => {
    // Mock notification count - replace with actual data from your state management
    const [notificationCount, setNotificationCount] = useState(3);
    
    // Mock notifications - replace with actual data
    const notifications = [
        { id: 1, message: "John invited you to a match", time: "2 min ago", read: false },
        { id: 2, message: "Your match with Sarah is starting soon", time: "5 min ago", read: false },
        { id: 3, message: "You won against Mike!", time: "1 hour ago", read: true }
    ];

    const handleMarkAsRead = (notificationId) => {
        // Implement mark as read functionality
        console.log('Mark notification as read:', notificationId);
    };

    const handleMarkAllAsRead = () => {
        // Implement mark all as read functionality
        setNotificationCount(0);
        console.log('Mark all notifications as read');
    };

    return (
        <Dropdown align="end">
            <Dropdown.Toggle 
                as={Button}
                variant="link" 
                className="notification-bell-toggle position-relative p-2"
                id="notification-dropdown"
            >
                <i className="bi bi-bell-fill text-white fs-5"></i>
                {notificationCount > 0 && (
                    <Badge 
                        bg="danger" 
                        pill 
                        className="position-absolute top-0 start-100 translate-middle"
                        style={{ fontSize: '0.7rem' }}
                    >
                        {notificationCount > 9 ? '9+' : notificationCount}
                    </Badge>
                )}
            </Dropdown.Toggle>

            <Dropdown.Menu className="notification-dropdown-menu" style={{ width: '300px' }}>
                <Dropdown.Header className="d-flex justify-content-between align-items-center">
                    <span>Notifications</span>
                    {notificationCount > 0 && (
                        <Button 
                            variant="link" 
                            size="sm" 
                            className="p-0 text-primary"
                            onClick={handleMarkAllAsRead}
                        >
                            Mark all as read
                        </Button>
                    )}
                </Dropdown.Header>
                
                {notifications.length > 0 ? (
                    notifications.map((notification) => (
                        <Dropdown.Item 
                            key={notification.id}
                            className={`notification-item ${!notification.read ? 'unread' : ''}`}
                            onClick={() => handleMarkAsRead(notification.id)}
                        >
                            <div className="d-flex flex-column">
                                <span className="notification-message">{notification.message}</span>
                                <small className="text-muted">{notification.time}</small>
                            </div>
                            {!notification.read && (
                                <div className="notification-indicator"></div>
                            )}
                        </Dropdown.Item>
                    ))
                ) : (
                    <Dropdown.Item disabled>
                        <div className="text-center text-muted py-3">
                            <i className="bi bi-bell-slash fs-4 d-block mb-2"></i>
                            No notifications
                        </div>
                    </Dropdown.Item>
                )}
                
                <Dropdown.Divider />
                <Dropdown.Item className="text-center">
                    <Button variant="link" size="sm" className="p-0">
                        View all notifications
                    </Button>
                </Dropdown.Item>
            </Dropdown.Menu>
        </Dropdown>
    );
};

export default NotificationBell;
