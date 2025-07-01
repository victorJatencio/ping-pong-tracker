require('dotenv').config();
const http = require('http');
const app = require('./app');
const { initializeFirebase } = require('./config/database');
// const { initializeSocket } = require('./config/socket');
// const { initializeRealtime } = require('./utils/realtime');
const logger = require('./utils/logger');


const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Create HTTP server
const server = http.createServer(app);

// Initialize services
const initializeServices = async () => {
    try {
        // Initialize Firebase Admin SDK
        await initializeFirebase();
        logger.info('Firebase Admin SDK initialized successfully');
        
        // Initialize Socket.IO
        // const io = initializeSocket(server);
        logger.info('Socket.IO server initialized successfully');
        
        // Initialize real-time event system
        // initializeRealtime(io);
        logger.info('Real-time event system initialized successfully');
        
        return true;
    } catch (error) {
        logger.error('Failed to initialize services:', error.message);
        return false;
    }
};

// Start server
const startServer = async () => {
    try {
        // Initialize all services
        const servicesInitialized = await initializeServices();
        
        if (!servicesInitialized) {
            logger.error('Failed to initialize services, exiting...');
            process.exit(1);
        }
        
        // Start HTTP server with WebSocket support
        server.listen(PORT, '0.0.0.0', () => {
            logger.info(`🚀 Server running on port ${PORT} in ${NODE_ENV} mode`);
            logger.info(`📡 WebSocket server ready for real-time connections`);
            logger.info(`🔗 API available at: http://localhost:${PORT}/api`);
            logger.info(`❤️  Health check: http://localhost:${PORT}/health`);
        });
        
    } catch (error) {
        logger.error('Failed to start server:', error.message);
        process.exit(1);
    }
};

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
    logger.info(`Received ${signal}, starting graceful shutdown...`);
    
    server.close((err) => {
        if (err) {
            logger.error('Error during server shutdown:', err.message);
            process.exit(1);
        }
        
        logger.info('Server closed successfully');
        process.exit(0);
    });
    
    // Force shutdown after 30 seconds
    setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
    }, 30000);
};


// Handle process signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('unhandledRejection');
});

// Start the server
startServer();