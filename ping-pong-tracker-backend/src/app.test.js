const express = require('express');
const app = express();

app.use(express.json());

// Simple test routes
app.post('/api/auth/login', (req, res) => {
    res.json({ success: true, message: 'Login successful', data: { user: {}, token: 'test-token' } });
});

app.post('/api/auth/refresh', (req, res) => {
    res.json({ success: true, data: { token: 'new-test-token' } });
});

app.get('/api/auth/profile', (req, res) => {
    res.json({ success: true, data: { user: {} } });
});

module.exports = app;

