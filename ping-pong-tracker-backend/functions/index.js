const functions = require("firebase-functions");
const admin = require("firebase-admin"); 
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

admin.initializeApp();

// Create Express application
const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://pingpongapp-a.web.app',
    'https://pingpongapp-a.firebaseapp.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
} ));

app.set('trust proxy', true);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
    platform: 'Firebase Functions'
  });
});

// API routes - Use the same structure as your original app.js
try {
  const apiRoutes = require('./api/routes');
  app.use('/api', apiRoutes);
  console.log('✅ API routes loaded successfully');
} catch (error) {
  console.error('❌ Error loading API routes:', error.message);
}

// Export the Express app as a Firebase Function
exports.api = functions.https.onRequest(app );
