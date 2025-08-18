const { dbUtils, admin } = require('../../config/database');
const { responseHandler } = require('../../utils/response');
const { sendPushNotification } = require('../../config/messaging');
const logger = require('../../utils/logger');

/**
 * Get user notifications (paginated)
 */
const getNotifications = async (req, res) => {
    try {
        const currentUserId = req.user.uid;
        const {
            page = 1,
            limit = 20,
            type,
            read,
            startDate,
            endDate
        } = req.query;
        
        // Build query filters
        const filters = [
            { field: 'recipientId', operator: '==', value: currentUserId }
        ];
        
        if (type) {
            filters.push({ field: 'type', operator: '==', value: type });
        }
        
        if (read !== undefined) {
            filters.push({ field: 'read', operator: '==', value: read === 'true' });
        }
        
        if (startDate) {
            filters.push({ field: 'createdAt', operator: '>=', value: new Date(startDate) });
        }
        
        if (endDate) {
            filters.push({ field: 'createdAt', operator: '<=', value: new Date(endDate) });
        }
        
        // Get notifications
        const allNotifications = await dbUtils.queryDocuments('notifications', filters,
            { field: 'createdAt', direction: 'desc' }
        );
        
        // Apply pagination
        const offset = (page - 1) * limit;
        const total = allNotifications.length;
        const notifications = allNotifications.slice(offset, offset + limit);
        
        // Enrich notifications with sender information
        const enrichedNotifications = await enrichNotificationsWithSenderInfo(notifications);
        
        const pagination = {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / limit)
        };
        
        logger.info(`Retrieved ${notifications.length} notifications for user ${currentUserId}`);
        return responseHandler.paginated(res, enrichedNotifications, pagination, 'Notifications retrieved successfully');
        
    } catch (error) {
        logger.error('Get notifications failed:', error.message);
        return responseHandler.error(res, 'Failed to retrieve notifications');
    }
};

/**
 * Create a new notification
 */
const createNotification = async (req, res) => {
    try {
        const currentUserId = req.user.uid;
        const { recipientId, type, title, message, data = {} } = req.body;
        
        // Validate recipient exists
        const recipient = await dbUtils.getDocument('users', recipientId);
        if (!recipient) {
            return responseHandler.notFound(res, 'Recipient not found');
        }
        
        // Check if recipient allows this type of notification
        const preferences = recipient.notificationPreferences || {};
        if (!shouldSendNotification(type, preferences)) {
            return responseHandler.success(res, null, 'Notification blocked by user preferences');
        }
        
        // Create notification
        const notificationData = {
            recipientId,
            senderId: currentUserId,
            type,
            title,
            message,
            data,
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            expiresAt: calculateExpirationDate(type)
        };
        
        const notificationId = await dbUtils.createDocument('notifications', notificationData);
        
        // Send push notification if enabled
        if (preferences.pushNotifications !== false) {
            await sendPushNotification(recipient, {
                title,
                body: message,
                data: {
                    notificationId,
                    type,
                    ...data
                }
            });
        }
        
        // Get created notification with sender info
        const createdNotification = await dbUtils.getDocument('notifications', notificationId);
        const enrichedNotification = await enrichNotificationWithSenderInfo(createdNotification);
        
        logger.info(`Notification created: ${notificationId} from ${currentUserId} to ${recipientId}`);
        return responseHandler.created(res, enrichedNotification, 'Notification created successfully');
        
    } catch (error) {
        logger.error('Create notification failed:', error.message);
        return responseHandler.error(res, 'Failed to create notification');
    }
};

/**
 * Get count of unread notifications
 */
const getUnreadCount = async (req, res) => {
    try {
        const currentUserId = req.user.uid;
        
        // Get unread notifications count
        const unreadNotifications = await dbUtils.queryDocuments('notifications', [
            { field: 'recipientId', operator: '==', value: currentUserId },
            { field: 'read', operator: '==', value: false }
        ]);
        
        const count = unreadNotifications.length;
        
        logger.debug(`Unread notification count for user ${currentUserId}: ${count}`);
        return responseHandler.success(res, { count }, 'Unread count retrieved successfully');
        
    } catch (error) {
        logger.error('Get unread count failed:', error.message);
        return responseHandler.error(res, 'Failed to retrieve unread count');
    }
};

/**
 * Mark notification as read
 */
const markAsRead = async (req, res) => {
    try {
        const currentUserId = req.user.uid;
        const { notificationId } = req.params;
        
        // Get notification
        const notification = await dbUtils.getDocument('notifications', notificationId);
        
        if (!notification) {
            return responseHandler.notFound(res, 'Notification not found');
        }
        
        // Check ownership
        if (notification.recipientId !== currentUserId) {
            return responseHandler.forbidden(res, 'You can only mark your own notifications as read');
        }
        
        // Update notification
        await dbUtils.updateDocument('notifications', notificationId, {
            read: true,
            readAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        logger.info(`Notification marked as read: ${notificationId} by user ${currentUserId}`);
        return responseHandler.success(res, null, 'Notification marked as read');
        
    } catch (error) {
        logger.error('Mark as read failed:', error.message);
        return responseHandler.error(res, 'Failed to mark notification as read');
    }
};

/**
 * Mark all notifications as read
 */
const markAllAsRead = async (req, res) => {
    try {
        const currentUserId = req.user.uid;
        
        // Get all unread notifications
        const unreadNotifications = await dbUtils.queryDocuments('notifications', [
            { field: 'recipientId', operator: '==', value: currentUserId },
            { field: 'read', operator: '==', value: false }
        ]);
        
        // Update all notifications in batch
        const batch = admin.firestore().batch();
        const updateData = {
            read: true,
            readAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        unreadNotifications.forEach(notification => {
            const notificationRef = admin.firestore().collection('notifications').doc(notification.id);
            batch.update(notificationRef, updateData);
        });
        
        await batch.commit();
        
        logger.info(`${unreadNotifications.length} notifications marked as read for user ${currentUserId}`);
        return responseHandler.success(res, 
            { updatedCount: unreadNotifications.length }, 
            'All notifications marked as read'
        );
        
    } catch (error) {
        logger.error('Mark all as read failed:', error.message);
        return responseHandler.error(res, 'Failed to mark all notifications as read');
    }
};

/**
 * Delete a notification
 */
const deleteNotification = async (req, res) => {
    try {
        const currentUserId = req.user.uid;
        const { notificationId } = req.params;
        
        // Get notification
        const notification = await dbUtils.getDocument('notifications', notificationId);
        
        if (!notification) {
            return responseHandler.notFound(res, 'Notification not found');
        }
        
        // Check ownership
        if (notification.recipientId !== currentUserId) {
            return responseHandler.forbidden(res, 'You can only delete your own notifications');
        }
        
        // Delete notification
        await dbUtils.deleteDocument('notifications', notificationId);
        
        logger.info(`Notification deleted: ${notificationId} by user ${currentUserId}`);
        return responseHandler.success(res, null, 'Notification deleted successfully');
        
    } catch (error) {
        logger.error('Delete notification failed:', error.message);
        return responseHandler.error(res, 'Failed to delete notification');
    }
};

/**
 * Send match invitation notification
 */
const sendMatchInvitation = async (req, res) => {
    try {
        const currentUserId = req.user.uid;
        const { recipientId, matchId, scheduledDate, location } = req.body;
        
        // Get sender and recipient info
        const [sender, recipient] = await Promise.all([
            dbUtils.getDocument('users', currentUserId),
            dbUtils.getDocument('users', recipientId)
        ]);
        
        if (!recipient) {
            return responseHandler.notFound(res, 'Recipient not found');
        }
        
        // Create notification
        const notificationData = {
            recipientId,
            senderId: currentUserId,
            type: 'match_invitation',
            title: 'New Match Invitation',
            message: `${sender.name} has invited you to a ping-pong match`,
            data: {
                matchId,
                scheduledDate,
                location,
                senderName: sender.name,
                senderPhoto: sender.photoURL
            },
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            expiresAt: calculateExpirationDate('match_invitation')
        };
        
        const notificationId = await dbUtils.createDocument('notifications', notificationData);
        
        // Send push notification
        const preferences = recipient.notificationPreferences || {};
        if (preferences.matchInvitations !== false && preferences.pushNotifications !== false) {
            await sendPushNotification(recipient, {
                title: 'New Match Invitation',
                body: `${sender.name} has invited you to a ping-pong match`,
                data: {
                    notificationId,
                    type: 'match_invitation',
                    matchId
                }
            });
        }
        
        logger.info(`Match invitation sent: ${notificationId} from ${currentUserId} to ${recipientId}`);
        return responseHandler.created(res, { notificationId }, 'Match invitation sent successfully');
        
    } catch (error) {
        logger.error('Send match invitation failed:', error.message);
        return responseHandler.error(res, 'Failed to send match invitation');
    }
};

/**
 * Send match update notification
 */
const sendMatchUpdate = async (req, res) => {
    try {
        const currentUserId = req.user.uid;
        const { recipientId, matchId, updateType, message } = req.body;
        
        // Get sender info
        const sender = await dbUtils.getDocument('users', currentUserId);
        
        // Create notification
        const notificationData = {
            recipientId,
            senderId: currentUserId,
            type: 'match_update',
            title: getMatchUpdateTitle(updateType),
            message: message || `${sender.name} updated your match`,
            data: {
                matchId,
                updateType,
                senderName: sender.name
            },
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            expiresAt: calculateExpirationDate('match_update')
        };
        
        const notificationId = await dbUtils.createDocument('notifications', notificationData);
        
        // Send push notification
        const recipient = await dbUtils.getDocument('users', recipientId);
        const preferences = recipient?.notificationPreferences || {};
        
        if (preferences.matchUpdates !== false && preferences.pushNotifications !== false) {
            await sendPushNotification(recipient, {
                title: getMatchUpdateTitle(updateType),
                body: notificationData.message,
                data: {
                    notificationId,
                    type: 'match_update',
                    matchId
                }
            });
        }
        
        logger.info(`Match update notification sent: ${notificationId} from ${currentUserId} to ${recipientId}`);
        return responseHandler.created(res, { notificationId }, 'Match update notification sent successfully');
        
    } catch (error) {
        logger.error('Send match update failed:', error.message);
        return responseHandler.error(res, 'Failed to send match update notification');
    }
};

/**
 * Get user notification preferences
 */
const getNotificationPreferences = async (req, res) => {
    try {
        const currentUserId = req.user.uid;
        
        // Get user profile
        const user = await dbUtils.getDocument('users', currentUserId);
        
        if (!user) {
            return responseHandler.notFound(res, 'User profile not found');
        }
        
        // Default preferences
        const defaultPreferences = {
            matchInvitations: true,
            matchUpdates: true,
            scoreUpdates: true,
            achievements: true,
            leaderboardChanges: false,
            pushNotifications: true,
            emailNotifications: false
        };
        
        const preferences = {
            ...defaultPreferences,
            ...(user.notificationPreferences || {})
        };
        
        logger.info(`Notification preferences retrieved for user ${currentUserId}`);
        return responseHandler.success(res, preferences, 'Notification preferences retrieved successfully');
        
    } catch (error) {
        logger.error('Get notification preferences failed:', error.message);
        return responseHandler.error(res, 'Failed to retrieve notification preferences');
    }
};

/**
 * Update user notification preferences
 */
const updateNotificationPreferences = async (req, res) => {
    try {
        const currentUserId = req.user.uid;
        const preferences = req.body;
        
        // Update user profile with new preferences
        await dbUtils.updateDocument('users', currentUserId, {
            notificationPreferences: preferences,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        logger.info(`Notification preferences updated for user ${currentUserId}`);
        return responseHandler.success(res, preferences, 'Notification preferences updated successfully');
        
    } catch (error) {
        logger.error('Update notification preferences failed:', error.message);
        return responseHandler.error(res, 'Failed to update notification preferences');
    }
};

// Helper functions

/**
 * Enrich notification with sender information
 */
const enrichNotificationWithSenderInfo = async (notification) => {
    try {
        if (!notification.senderId) return notification;
        
        const sender = await dbUtils.getDocument('users', notification.senderId);
        
        return {
            ...notification,
            sender: sender ? {
                id: sender.id,
                name: sender.name,
                photoURL: sender.photoURL
            } : null
        };
    } catch (error) {
        logger.error('Failed to enrich notification with sender info:', error.message);
        return notification;
    }
};

/**
 * Enrich multiple notifications with sender information
 */
const enrichNotificationsWithSenderInfo = async (notifications) => {
    return Promise.all(notifications.map(notification => 
        enrichNotificationWithSenderInfo(notification)
    ));
};

/**
 * Check if notification should be sent based on user preferences
 */
const shouldSendNotification = (type, preferences) => {
    const typeMapping = {
        'match_invitation': 'matchInvitations',
        'match_update': 'matchUpdates',
        'score_update': 'scoreUpdates',
        'achievement': 'achievements',
        'leaderboard_change': 'leaderboardChanges'
    };
    
    const preferenceKey = typeMapping[type];
    if (!preferenceKey) return true; // Send unknown types by default
    
    return preferences[preferenceKey] !== false;
};

/**
 * Calculate expiration date for notification
 */
const calculateExpirationDate = (type) => {
    const now = new Date();
    const expirationDays = {
        'match_invitation': 7,
        'match_update': 3,
        'score_update': 1,
        'achievement': 30,
        'leaderboard_change': 1,
        'system': 30
    };
    
    const days = expirationDays[type] || 7;
    return new Date(now.getTime() + (days * 24 * 60 * 60 * 1000));
};

/**
 * Get title for match update notification
 */
const getMatchUpdateTitle = (updateType) => {
    const titles = {
        'score_updated': 'Match Score Updated',
        'match_completed': 'Match Completed',
        'match_cancelled': 'Match Cancelled',
        'match_rescheduled': 'Match Rescheduled',
        'match_started': 'Match Started'
    };
    
    return titles[updateType] || 'Match Update';
};

module.exports = {
    getNotifications,
    createNotification,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    sendMatchInvitation,
    sendMatchUpdate,
    getNotificationPreferences,
    updateNotificationPreferences
};