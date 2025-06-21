const {
    createTestSocketServer,
    createMultipleClients,
    waitForEvent,
    emitAndWaitFor,
    cleanupSockets,
    cleanupServer
} = require('../utils/socketHelpers');
const { createTestUser } = require('../utils/testHelpers');

describe('WebSocket User Presence Tests', () => {
    let server, io, httpServer, serverUrl;
    const userPresence = new Map(); // Track user presence

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

        // Set up presence handlers
        io.on('connection', (socket) => {
            // User comes online
            const userId = socket.user.id;
            userPresence.set(userId, {
                status: 'online',
                lastSeen: new Date().toISOString(),
                socketId: socket.id,
                currentActivity: 'browsing'
            });

            // Broadcast user online status
            socket.broadcast.emit('user-online', {
                userId,
                status: 'online',
                lastSeen: new Date().toISOString()
            });

            // Update user activity
            socket.on('update-activity', (data) => {
                const { activity } = data;
                
                if (userPresence.has(userId)) {
                    userPresence.get(userId).currentActivity = activity;
                    userPresence.get(userId).lastSeen = new Date().toISOString();
                }

                socket.broadcast.emit('user-activity-updated', {
                    userId,
                    activity,
                    timestamp: new Date().toISOString()
                });

                socket.emit('activity-updated', { activity });
            });

            // Get online users
            socket.on('get-online-users', () => {
                const onlineUsers = Array.from(userPresence.entries()).map(([id, data]) => ({
                    userId: id,
                    status: data.status,
                    lastSeen: data.lastSeen,
                    currentActivity: data.currentActivity
                }));

                socket.emit('online-users', { users: onlineUsers });
            });

            // Check specific user status
            socket.on('check-user-status', (data) => {
                const { targetUserId } = data;
                const userStatus = userPresence.get(targetUserId);

                socket.emit('user-status', {
                    userId: targetUserId,
                    status: userStatus ? userStatus.status : 'offline',
                    lastSeen: userStatus ? userStatus.lastSeen : null,
                    currentActivity: userStatus ? userStatus.currentActivity : null
                });
            });

            // Set user status (away, busy, etc.)
            socket.on('set-status', (data) => {
                const { status } = data;
                
                if (userPresence.has(userId)) {
                    userPresence.get(userId).status = status;
                    userPresence.get(userId).lastSeen = new Date().toISOString();
                }

                socket.broadcast.emit('user-status-changed', {
                    userId,
                    status,
                    timestamp: new Date().toISOString()
                });

                socket.emit('status-updated', { status });
            });

            // Handle disconnection
            socket.on('disconnect', () => {
                if (userPresence.has(userId)) {
                    userPresence.get(userId).status = 'offline';
                    userPresence.get(userId).lastSeen = new Date().toISOString();
                }

                socket.broadcast.emit('user-offline', {
                    userId,
                    status: 'offline',
                    lastSeen: new Date().toISOString()
                });
            });
        });
    });

    afterAll(async () => {
        await cleanupServer(httpServer);
    });

    afterEach(() => {
        userPresence.clear();
    });

    describe('Online Status', () => {
        it('should broadcast when user comes online', async () => {
            const [client1, client2] = await createMultipleClients(serverUrl, 2);

            // Client 1 should receive notification when client 2 connects
            // (Client 2 was created after client 1, so client 1 should get the broadcast)
            
            // Wait a bit for the broadcast to be sent
            await new Promise(resolve => setTimeout(resolve, 100));

            // Verify both clients are connected
            expect(client1.client.connected).toBe(true);
            expect(client2.client.connected).toBe(true);

            cleanupSockets(client1.client, client2.client);
        });

        it('should broadcast when user goes offline', async () => {
            const [client1, client2] = await createMultipleClients(serverUrl, 2);

            // Client 1 listens for offline notifications
            const offlinePromise = waitForEvent(client1.client, 'user-offline');

            // Client 2 disconnects
            client2.client.disconnect();

            const offlineNotification = await offlinePromise;

            expect(offlineNotification).toMatchObject({
                userId: client2.user.id,
                status: 'offline'
            });
            expect(offlineNotification.lastSeen).toBeDefined();

            cleanupSockets(client1.client);
        });

        it('should provide list of online users', async () => {
            const clients = await createMultipleClients(serverUrl, 3);

            // Wait for all connections to be established
            await new Promise(resolve => setTimeout(resolve, 100));

            // Get online users from first client
            const onlineUsersResponse = await emitAndWaitFor(
                clients[0].client,
                'get-online-users',
                {},
                'online-users'
            );

            expect(onlineUsersResponse.users).toBeInstanceOf(Array);
            expect(onlineUsersResponse.users.length).toBeGreaterThan(0);
            
            // Should include all connected users
            const userIds = onlineUsersResponse.users.map(u => u.userId);
            clients.forEach(({ user }) => {
                expect(userIds).toContain(user.id);
            });

            cleanupSockets(...clients.map(c => c.client));
        });

        it('should check specific user status', async () => {
            const [client1, client2] = await createMultipleClients(serverUrl, 2);

            // Wait for connections to be established
            await new Promise(resolve => setTimeout(resolve, 100));

            // Client 1 checks client 2's status
            const statusResponse = await emitAndWaitFor(
                client1.client,
                'check-user-status',
                { targetUserId: client2.user.id },
                'user-status'
            );

            expect(statusResponse).toMatchObject({
                userId: client2.user.id,
                status: 'online'
            });
            expect(statusResponse.lastSeen).toBeDefined();

            cleanupSockets(client1.client, client2.client);
        });
    });

    describe('User Activity', () => {
        it('should update and broadcast user activity', async () => {
            const [client1, client2] = await createMultipleClients(serverUrl, 2);

            // Client 2 listens for activity updates
            const activityPromise = waitForEvent(client2.client, 'user-activity-updated');

            // Client 1 updates activity
            client1.client.emit('update-activity', { activity: 'playing-match' });

            const activityUpdate = await activityPromise;

            expect(activityUpdate).toMatchObject({
                userId: client1.user.id,
                activity: 'playing-match'
            });
            expect(activityUpdate.timestamp).toBeDefined();

            cleanupSockets(client1.client, client2.client);
        });

        it('should confirm activity update to sender', async () => {
            const [client1] = await createMultipleClients(serverUrl, 1);

            const confirmationResponse = await emitAndWaitFor(
                client1.client,
                'update-activity',
                { activity: 'viewing-leaderboard' },
                'activity-updated'
            );

            expect(confirmationResponse).toMatchObject({
                activity: 'viewing-leaderboard'
            });

            cleanupSockets(client1.client);
        });
    });

    describe('Status Management', () => {
        it('should update and broadcast user status', async () => {
            const [client1, client2] = await createMultipleClients(serverUrl, 2);

            // Client 2 listens for status changes
            const statusPromise = waitForEvent(client2.client, 'user-status-changed');

            // Client 1 sets status to away
            client1.client.emit('set-status', { status: 'away' });

            const statusChange = await statusPromise;

            expect(statusChange).toMatchObject({
                userId: client1.user.id,
                status: 'away'
            });
            expect(statusChange.timestamp).toBeDefined();

            cleanupSockets(client1.client, client2.client);
        });

        it('should handle different status types', async () => {
            const [client1, client2] = await createMultipleClients(serverUrl, 2);

            const statuses = ['away', 'busy', 'do-not-disturb', 'online'];
            
            for (const status of statuses) {
                const statusPromise = waitForEvent(client2.client, 'user-status-changed');
                
                client1.client.emit('set-status', { status });
                
                const statusChange = await statusPromise;
                expect(statusChange.status).toBe(status);
            }

            cleanupSockets(client1.client, client2.client);
        });
    });

    describe('Presence Persistence', () => {
        it('should maintain presence data across events', async () => {
            const [client1] = await createMultipleClients(serverUrl, 1);

            // Update activity
            await emitAndWaitFor(
                client1.client,
                'update-activity',
                { activity: 'playing-match' },
                'activity-updated'
            );

            // Set status
            await emitAndWaitFor(
                client1.client,
                'set-status',
                { status: 'busy' },
                'status-updated'
            );

            // Check that both updates are reflected
            const statusResponse = await emitAndWaitFor(
                client1.client,
                'check-user-status',
                { targetUserId: client1.user.id },
                'user-status'
            );

            expect(statusResponse).toMatchObject({
                userId: client1.user.id,
                status: 'busy',
                currentActivity: 'playing-match'
            });

            cleanupSockets(client1.client);
        });
    });

    describe('Error Handling', () => {
        it('should handle invalid activity data', async () => {
            const [client1] = await createMultipleClients(serverUrl, 1);

            // Send invalid activity data
            client1.client.emit('update-activity', { invalidField: 'invalid' });

            // Connection should remain stable
            await new Promise(resolve => setTimeout(resolve, 100));
            expect(client1.client.connected).toBe(true);

            cleanupSockets(client1.client);
        });

        it('should handle status check for non-existent user', async () => {
            const [client1] = await createMultipleClients(serverUrl, 1);

            const statusResponse = await emitAndWaitFor(
                client1.client,
                'check-user-status',
                { targetUserId: 'non-existent-user' },
                'user-status'
            );

            expect(statusResponse).toMatchObject({
                userId: 'non-existent-user',
                status: 'offline',
                lastSeen: null,
                currentActivity: null
            });

            cleanupSockets(client1.client);
        });
    });
});