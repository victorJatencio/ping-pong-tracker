const functions = require("firebase-functions");
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Create Express application
const app = express();

// Security middleware
app.use(helmet());

// CORS configuration - Updated for production
app.use(cors({
    origin: [
        'http://localhost:5173',  // Development
        'https://pingpongapp-a.web.app',  // Production Firebase Hosting
        'https://pingpongapp-a.firebaseapp.com'  // Alternative Firebase URL
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Simple logging for Firebase Functions
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path} - ${req.ip}`);
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: 'production',
        platform: 'Firebase Functions'
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Ping Pong Tracker API',
        version: '1.0.0',
        platform: 'Firebase Functions',
        endpoints: {
            health: '/health',
            matches: '/api/matches',
            stats: '/api/stats'
        }
    });
});

// Try to import your API routes (you'll need to copy the api folder)
try {
    const apiRoutes = require('./api/routes');
    app.use('/api', apiRoutes);
} catch (error) {
    console.error('API routes not found, using fallback routes');
    
    // Fallback API routes if your routes file isn't copied yet
    app.get('/api/test', (req, res) => {
        res.json({ message: 'API is working!', timestamp: new Date().toISOString() });
    });
    
    app.get('/api/stats/player/:userId', (req, res) => {
        res.json({ 
            message: 'Stats endpoint working', 
            userId: req.params.userId,
            note: 'Copy your actual routes to get real data'
        });
    });
}

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.originalUrl} not found`,
        availableRoutes: [
            'GET /',
            'GET /health',
            'GET /api/test',
            'GET /api/stats/*'
        ]
    });
});

// Global error handler
app.use((error, req, res, next) => {
    console.error('Global error handler:', error);
    
    res.status(error.status || 500).json({
        error: error.message || 'Internal Server Error',
        platform: 'Firebase Functions'
    });
});

// Export the Express app as a Firebase Function
exports.api = functions.https.onRequest(app);

// Optional: Export individual functions if needed
exports.healthCheck = functions.https.onRequest((req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        message: 'Firebase Functions health check'
    });
});
