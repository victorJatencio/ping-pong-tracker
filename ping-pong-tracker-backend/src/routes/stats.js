const express = require('express');
const router = express.Router();
const statsService = require('../services/stats.service');

// Get player stats (for Achievements card)
router.get('/player/:playerId', async (req, res) => {
    try {
        const stats = await statsService.getPlayerProfileStats(req.params.playerId);
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Manual sync (for testing)
router.post('/sync/:playerId', async (req, res) => {
    try {
        const stats = await statsService.syncPlayerStats(req.params.playerId);
        res.json({ success: true, stats });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;