const admin = require('firebase-admin');
const statsService = require('./src/services/stats.service');

// Initialize Firebase (if not already done)
if (!admin.apps.length) {
    require('dotenv').config();
    const { initializeFirebase } = require('./src/config/database');
    initializeFirebase();
}

async function testStatsSync() {
    try {
        console.log('🧪 Testing Enhanced Stats Service...\n');

        // Test with your actual user ID
        const testUserId = '57kkD844KVWab8LZ0JxbK8iglhi2';

        console.log('1. Testing individual player sync...');
        const stats = await statsService.syncPlayerStats(testUserId);
        console.log('✅ Player stats synced:', stats);
        console.log('');

        console.log('2. Testing stats retrieval...');
        const retrievedStats = await statsService.getPlayerStats(testUserId);
        console.log('✅ Retrieved stats:', retrievedStats);
        console.log('');

        console.log('3. Testing bulk sync (all players)...');
        const bulkResults = await statsService.syncAllPlayerStats();
        console.log('✅ Bulk sync results:');
        bulkResults.forEach(result => {
            if (result.success) {
                console.log(`   Player ${result.playerId}: ${result.stats.totalWins} wins, ${result.stats.gamesPlayed} games`);
            } else {
                console.log(`   Player ${result.playerId}: ERROR - ${result.error}`);
            }
        });

        console.log('\n🎉 All tests completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run the test
testStatsSync();