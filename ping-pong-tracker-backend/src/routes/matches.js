const express = require('express');
const router = express.Router();
const matchService = require('../services/match.service');

// Update match score (CRITICAL - this fixes playerStats sync)
router.put('/:matchId/score', async (req, res) => {
    try {
        const { matchId } = req.params;
        const { player1Score, player2Score } = req.body;
        const updatedBy = req.user.uid; // From auth middleware
        
        await matchService.updateMatchScore(matchId, {
            player1Score,
            player2Score
        }, updatedBy);
        
        res.json({ success: true, message: 'Match completed and stats synced' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Other endpoints...
router.get('/upcoming/:userId', async (req, res) => {
    try {
        const matches = await matchService.getUpcomingMatches(req.params.userId);
        res.json(matches);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/recent/:userId', async (req, res) => {
    try {
        const matches = await matchService.getRecentMatches(req.params.userId);
        res.json(matches);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;