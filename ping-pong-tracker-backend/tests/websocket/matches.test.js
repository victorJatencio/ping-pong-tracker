const {
    createTestSocketServer,
    createMultipleClients,
    waitForEvent,
    emitAndWaitFor,
    cleanupSockets,
    cleanupServer,
    createTestSocketEvents
} = require('../utils/socketHelpers');
const { createTestMatch, createTestUser } = require('../utils/testHelpers');

describe('WebSocket Match Tests', () => {
    let server, io, httpServer, serverUrl;

    beforeAll(async () => {
        const serverData = await createTestSocketServer();
        server = serverData;
        io = serverData.io;
        httpServer = serverData.httpServer;
        serverUrl = serverData.url;

        // Set up authentication middleware
        io.use((socket, next) => {
            const token = socket.handshake.auth.token;
            if (token) {
                socket.user = createTestUser({ id: `user-${Math.random()}` });
                next();
            } else {
                next(new Error('Authentication required'));
            }
        });

        // Set up match event handlers
        io.on('connection', (socket) => {
            // Join match room
            socket.on('join-match', (data) => {
                const { matchId } = data;
                socket.join(`match-${matchId}`);
                socket.emit('joined-match', { matchId, userId: socket.user.id });
                
                // Notify others in the room
                socket.to(`match-${matchId}`).emit('user-joined-match', {
                    matchId,
                    userId: socket.user.id,
                    userName: socket.user.name
                });
            });

            // Leave match room
            socket.on('leave-match', (data) => {
                const { matchId } = data;
                socket.leave(`match-${matchId}`);
                socket.emit('left-match', { matchId, userId: socket.user.id });
                
                // Notify others in the room
                socket.to(`match-${matchId}`).emit('user-left-match', {
                    matchId,
                    userId: socket.user.id,
                    userName: socket.user.name
                });
            });

            // Update match score
            socket.on('update-match-score', (data) => {
                const { matchId, player1Score, player2Score, updatedBy } = data;
                
                const updateData = {
                    matchId,
                    player1Score,
                    player2Score,
                    updatedBy: socket.user.id,
                    timestamp: new Date().toISOString()
                };

                // Broadcast to all users in the match room
                io.to(`match-${matchId}`).emit('match-score-updated', updateData);
            });

            // Match status change
            socket.on('update-match-status', (data) => {
                const { matchId, status } = data;
                
                const statusData = {
                    matchId,
                    status,
                    updatedBy: socket.user.id,
                    timestamp: new Date().toISOString()
                };

                io.to(`match-${matchId}`).emit('match-status-changed', statusData);
            });
        });
    });

    afterAll(async () => {
        await cleanupServer(httpServer);
    });

    describe('Match Room Management', () => {
        it('should allow users to join match rooms', async () => {
            const [client1] = await createMultipleClients(serverUrl, 1);
            const matchId = 'test-match-123';

            const joinResponse = await emitAndWaitFor(
                client1.client,
                'join-match',
                { matchId },
                'joined-match'
            );

            expect(joinResponse).toMatchObject({
                matchId,
                userId: client1.user.id
            });

            cleanupSockets(client1.client);
        });

        it('should notify other users when someone joins a match', async () => {
            const [client1, client2] = await createMultipleClients(serverUrl, 2);
            const matchId = 'test-match-456';

            // Client 1 joins first
            await emitAndWaitFor(
                client1.client,
                'join-match',
                { matchId },
                'joined-match'
            );

            // Client 2 joins and client 1 should be notified
            const notificationPromise = waitForEvent(client1.client, 'user-joined-match');
            
            await emitAndWaitFor(
                client2.client,
                'join-match',
                { matchId },
                'joined-match'
            );

            const notification = await notificationPromise;
            
            expect(notification).toMatchObject({
                matchId,
                userId: client2.user.id,
                userName: client2.user.name
            });

            cleanupSockets(client1.client, client2.client);
        });

        it('should allow users to leave match rooms', async () => {
            const [client1] = await createMultipleClients(serverUrl, 1);
            const matchId = 'test-match-789';

            // Join first
            await emitAndWaitFor(
                client1.client,
                'join-match',
                { matchId },
                'joined-match'
            );

            // Then leave
            const leaveResponse = await emitAndWaitFor(
                client1.client,
                'leave-match',
                { matchId },
                'left-match'
            );

            expect(leaveResponse).toMatchObject({
                matchId,
                userId: client1.user.id
            });

            cleanupSockets(client1.client);
        });
    });

    describe('Real-time Score Updates', () => {
        it('should broadcast score updates to all match participants', async () => {
            const [client1, client2] = await createMultipleClients(serverUrl, 2);
            const matchId = 'test-match-score';

            // Both clients join the match
            await Promise.all([
                emitAndWaitFor(client1.client, 'join-match', { matchId }, 'joined-match'),
                emitAndWaitFor(client2.client, 'join-match', { matchId }, 'joined-match')
            ]);

            // Client 2 listens for score updates
            const scoreUpdatePromise = waitForEvent(client2.client, 'match-score-updated');

            // Client 1 updates the score
            client1.client.emit('update-match-score', {
                matchId,
                player1Score: 15,
                player2Score: 10
            });

            const scoreUpdate = await scoreUpdatePromise;

            expect(scoreUpdate).toMatchObject({
                matchId,
                player1Score: 15,
                player2Score: 10,
                updatedBy: client1.user.id
            });
            expect(scoreUpdate.timestamp).toBeDefined();

            cleanupSockets(client1.client, client2.client);
        });

        it('should handle multiple rapid score updates', async () => {
            const [client1, client2] = await createMultipleClients(serverUrl, 2);
            const matchId = 'test-match-rapid';

            // Join match
            await Promise.all([
                emitAndWaitFor(client1.client, 'join-match', { matchId }, 'joined-match'),
                emitAndWaitFor(client2.client, 'join-match', { matchId }, 'joined-match')
            ]);

            const scoreUpdates = [];
            client2.client.on('match-score-updated', (data) => {
                scoreUpdates.push(data);
            });

            // Send multiple rapid updates
            const updates = [
                { player1Score: 1, player2Score: 0 },
                { player1Score: 1, player2Score: 1 },
                { player1Score: 2, player2Score: 1 },
                { player1Score: 2, player2Score: 2 }
            ];

            for (const update of updates) {
                client1.client.emit('update-match-score', {
                    matchId,
                    ...update
                });
            }

            // Wait for all updates to be received
            await new Promise(resolve => setTimeout(resolve, 500));

            expect(scoreUpdates).toHaveLength(4);
            expect(scoreUpdates[3]).toMatchObject({
                matchId,
                player1Score: 2,
                player2Score: 2
            });

            cleanupSockets(client1.client, client2.client);
        });
    });

    describe('Match Status Updates', () => {
        it('should broadcast match status changes', async () => {
            const [client1, client2] = await createMultipleClients(serverUrl, 2);
            const matchId = 'test-match-status';

            // Join match
            await Promise.all([
                emitAndWaitFor(client1.client, 'join-match', { matchId }, 'joined-match'),
                emitAndWaitFor(client2.client, 'join-match', { matchId }, 'joined-match')
            ]);

            // Client 2 listens for status changes
            const statusChangePromise = waitForEvent(client2.client, 'match-status-changed');

            // Client 1 changes match status
            client1.client.emit('update-match-status', {
                matchId,
                status: 'completed'
            });

            const statusChange = await statusChangePromise;

            expect(statusChange).toMatchObject({
                matchId,
                status: 'completed',
                updatedBy: client1.user.id
            });
            expect(statusChange.timestamp).toBeDefined();

            cleanupSockets(client1.client, client2.client);
        });
    });

    describe('Error Scenarios', () => {
        it('should handle invalid match data gracefully', async () => {
            const [client1] = await createMultipleClients(serverUrl, 1);

            // Send invalid match data
            client1.client.emit('join-match', { invalidData: true });
            client1.client.emit('update-match-score', { invalidScore: 'not-a-number' });

            // Connection should remain stable
            await new Promise(resolve => setTimeout(resolve, 100));
            expect(client1.client.connected).toBe(true);

            cleanupSockets(client1.client);
        });

        it('should handle disconnection during match', async () => {
            const [client1, client2] = await createMultipleClients(serverUrl, 2);
            const matchId = 'test-match-disconnect';

            // Join match
            await Promise.all([
                emitAndWaitFor(client1.client, 'join-match', { matchId }, 'joined-match'),
                emitAndWaitFor(client2.client, 'join-match', { matchId }, 'joined-match')
            ]);

            // Disconnect client 1
            client1.client.disconnect();

            // Client 2 should still be able to receive updates
            await new Promise(resolve => setTimeout(resolve, 100));
            expect(client2.client.connected).toBe(true);

            cleanupSockets(client2.client);
        });
    });
});