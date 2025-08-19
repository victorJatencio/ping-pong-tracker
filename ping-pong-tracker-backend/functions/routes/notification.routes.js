const express = require("express");
const {authenticate, userRateLimit} = require("../middlewares/auth.middleware");
const {validateRequest} = require("../middlewares/validation.middleware");
const {asyncErrorHandler} = require("../middlewares/error.middleware");
const notificationController = require("../controllers/notification.controller");
const {notificationSchemas} = require("../../utils/validation");

const router = express.Router();

/**
 * @route   GET /api/notifications
 * @desc    Get user notifications (paginated)
 * @access  Private
 */
router.get("/",
    authenticate,
    validateRequest(notificationSchemas.queryNotifications, "query"),
    asyncErrorHandler(notificationController.getNotifications),
);

/**
 * @route   POST /api/notifications
 * @desc    Create a new notification
 * @access  Private
 */
router.post("/",
    authenticate,
    userRateLimit(20, 60000), // 20 notifications per minute
    validateRequest(notificationSchemas.createNotification),
    asyncErrorHandler(notificationController.createNotification),
);

/**
 * @route   GET /api/notifications/unread-count
 * @desc    Get count of unread notifications
 * @access  Private
 */
router.get("/unread-count",
    authenticate,
    asyncErrorHandler(notificationController.getUnreadCount),
);

/**
 * @route   PUT /api/notifications/:notificationId/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.put("/:notificationId/read",
    authenticate,
    asyncErrorHandler(notificationController.markAsRead),
);

/**
 * @route   PUT /api/notifications/mark-all-read
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.put("/mark-all-read",
    authenticate,
    asyncErrorHandler(notificationController.markAllAsRead),
);

/**
 * @route   DELETE /api/notifications/:notificationId
 * @desc    Delete a notification
 * @access  Private
 */
router.delete("/:notificationId",
    authenticate,
    asyncErrorHandler(notificationController.deleteNotification),
);

/**
 * @route   POST /api/notifications/match-invitation
 * @desc    Send match invitation notification
 * @access  Private
 */
router.post("/match-invitation",
    authenticate,
    userRateLimit(10, 60000), // 10 invitations per minute
    validateRequest(notificationSchemas.matchInvitation),
    asyncErrorHandler(notificationController.sendMatchInvitation),
);

/**
 * @route   POST /api/notifications/match-update
 * @desc    Send match update notification
 * @access  Private
 */
router.post("/match-update",
    authenticate,
    validateRequest(notificationSchemas.matchUpdate),
    asyncErrorHandler(notificationController.sendMatchUpdate),
);

/**
 * @route   GET /api/notifications/preferences
 * @desc    Get user notification preferences
 * @access  Private
 */
router.get("/preferences",
    authenticate,
    asyncErrorHandler(notificationController.getNotificationPreferences),
);

/**
 * @route   PUT /api/notifications/preferences
 * @desc    Update user notification preferences
 * @access  Private
 */
router.put("/preferences",
    authenticate,
    validateRequest(notificationSchemas.updatePreferences),
    asyncErrorHandler(notificationController.updateNotificationPreferences),
);

module.exports = router;
