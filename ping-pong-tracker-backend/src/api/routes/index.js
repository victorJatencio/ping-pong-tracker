const express = require('express');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const matchRoutes = require('./match.routes');
const statsRoutes = require('./stats.routes');
const notificationRoutes = require('./notification.routes');

const router = express.Router();

// API version and health check
router.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Ping Pong Tracker API v1.0',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        endpoints: {
            auth: '/api/auth',
            users: '/api/users',
            matches: '/api/matches',
            stats: '/api/stats',
            notifications: '/api/notifications'
        }
    });
});

// Health check endpoint
router.get('/health', (req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.version
    });
});

// Mount route modules
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/matches', matchRoutes);
router.use('/stats', statsRoutes);
router.use('/notifications', notificationRoutes);

module.exports = router;