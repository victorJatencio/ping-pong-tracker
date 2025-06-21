const {
    createTestSocketServer,
    createMultipleClients,
    waitForEvent,
    emitAndWaitFor,
    cleanupSockets,
    cleanupServer,
    createTestSocketEvents
} = require('../utils/socketHelpers');
const { createTestUser, createTestNotification } = require('../utils/testHelpers');

describe('WebSocket Notification Tests', () => {
    let server, io, httpServer, serverUrl;

    beforeAll(async () => {
    const serverData = await createTestSocketServer();
    server = serverData;
    io = serverData.io;
    httpServer = serverData.httpServer;
    serverUrl = serverData.url;

    // Set up authentication middleware
    io.use((socket, next ) => {
        const token = socket.handshake.auth.token;
        if (token) {
            socket.user = createTestUser({ 
                id: `test-user-${Math.random().toString(36).substr(2, 9)}`,
                name: 'Test User',
                email: 'test@example.com'
            });
            next();
        } else {
            next(new Error('Authentication required'));
        }
    });

    // Set up notification handlers
    io.on('connection', (socket) => {
        // Join user's personal notification room
        socket.join(`user-${socket.user.id}`);

        // Simple notification handler
        socket.on('send-notification', (data) => {
            const { recipientId, type, title, message } = data;
            
            const notification = {
                id: `notification-${Date.now()}`,
                recipientId,
                senderId: socket.user.id,
                type,
                title,
                message,
                timestamp: new Date().toISOString(),
                read: false
            };

            // Send to recipient
            socket.to(`user-${recipientId}`).emit('notification-received', notification);
            
            // Confirm to sender
            socket.emit('notification-sent', { 
                notificationId: notification.id,
                recipientId 
            });
        });
    });
});


    afterAll(async () => {
        await cleanupServer(httpServer);
    });

    describe('Personal Notifications', () => {
        it('should deliver notifications to specific users', async () => {
            const [client1, client2] = await createMultipleClients(serverUrl, 2);

            // Client 2 listens for notifications
            const notificationPromise = waitForEvent(client2.client, 'notification-received');

            // Client 1 sends notification to Client 2
            const notificationData = {
                recipientId: client2.user.id,
                type: 'match_invitation',
                title: 'Match Invitation',
                message: 'You have been invited to a ping-pong match',
                data: { matchId: 'test-match-123' }
            };

            client1.client.emit('send-notification', notificationData);

            const receivedNotification = await notificationPromise;

            expect(receivedNotification).toMatchObject({
                recipientId: client2.user.id,
                senderId: client1.user.id,
                type: 'match_invitation',
                title: 'Match Invitation',
                message: 'You have been invited to a ping-pong match',
                data: { matchId: 'test-match-123' }
            });
            expect(receivedNotification.id).toBeDefined();
            expect(receivedNotification.timestamp).toBeDefined();
            expect(receivedNotification.read).toBe(false);

            cleanupSockets(client1.client, client2.client);
        });

        it('should confirm notification delivery to sender', async () => {
            const [client1, client2] = await createMultipleClients(serverUrl, 2);

            // Client 1 listens for confirmation
            const confirmationPromise = waitForEvent(client1.client, 'notification-sent');

            // Send notification
            client1.client.emit('send-notification', {
                recipientId: client2.user.id,
                type: 'achievement',
                title: 'Achievement Unlocked',
                message: 'You unlocked a new achievement!'
            });

            const confirmation = await confirmationPromise;

            expect(confirmation).toMatchObject({
                recipientId: client2.user.id
            });
            expect(confirmation.notificationId).toBeDefined();

            cleanupSockets(client1.client, client2.client);
        });

        it('should handle notification read status', async () => {
            const [client1, client2] = await createMultipleClients(serverUrl, 2);

            // Client 1 listens for read confirmation
            const readConfirmationPromise = waitForEvent(client1.client, 'notification-marked-read');

            // Mark notification as read
            const notificationId = 'test-notification-123';
            client1.client.emit('mark-notification-read', { notificationId });

            const readConfirmation = await readConfirmationPromise;

            expect(readConfirmation).toMatchObject({
                notificationId
            });

            cleanupSockets(client1.client, client2.client);
        });

        it('should provide unread notification count', async () => {
            const [client1] = await createMultipleClients(serverUrl, 1);

            const unreadCountResponse = await emitAndWaitFor(
                client1.client,
                'get-unread-count',
                {},
                'unread-count'
            );

            expect(unreadCountResponse).toHaveProperty('count');
            expect(typeof unreadCountResponse.count).toBe('number');
            expect(unreadCountResponse.count).toBeGreaterThanOrEqual(0);

            cleanupSockets(client1.client);
        });
    });

    describe('System Notifications', () => {
        it('should broadcast system notifications to all users', async () => {
            const clients = await createMultipleClients(serverUrl, 3);

            // Set first client as admin
            clients[0].user.role = 'admin';

            // All clients listen for system notifications
            const notificationPromises = clients.slice(1).map(({ client }) => 
                waitForEvent(client, 'system-notification')
            );

            // Admin sends system notification
            const systemNotificationData = {
                title: 'System Maintenance',
                message: 'The system will be under maintenance tonight',
                type: 'maintenance'
            };

            clients[0].client.emit('broadcast-system-notification', systemNotificationData);

            const receivedNotifications = await Promise.all(notificationPromises);

            receivedNotifications.forEach(notification => {
                expect(notification).toMatchObject({
                    title: 'System Maintenance',
                    message: 'The system will be under maintenance tonight',
                    type: 'maintenance',
                    isSystem: true
                });
                expect(notification.id).toBeDefined();
                expect(notification.timestamp).toBeDefined();
            });

            cleanupSockets(...clients.map(c => c.client));
        });

        it('should reject system notifications from non-admin users', async () => {
            const [client1] = await createMultipleClients(serverUrl, 1);

            // Regular user (not admin) tries to send system notification
            const errorPromise = waitForEvent(client1.client, 'error');

            client1.client.emit('broadcast-system-notification', {
                title: 'Unauthorized Notification',
                message: 'This should not work'
            });

            const error = await errorPromise;

            expect(error).toMatchObject({
                message: 'Unauthorized to send system notifications'
            });

            cleanupSockets(client1.client);
        });
    });

    describe('Notification Types', () => {
        it('should handle match invitation notifications', async () => {
            const [client1, client2] = await createMultipleClients(serverUrl, 2);

            const notificationPromise = waitForEvent(client2.client, 'notification-received');

            client1.client.emit('send-notification', {
                recipientId: client2.user.id,
                type: 'match_invitation',
                title: 'New Match Invitation',
                message: `${client1.user.name} invited you to a match`,
                data: {
                    matchId: 'match-456',
                    scheduledDate: new Date().toISOString(),
                    location: 'Office Ping Pong Table'
                }
            });

            const notification = await notificationPromise;

            expect(notification.type).toBe('match_invitation');
            expect(notification.data).toMatchObject({
                matchId: 'match-456',
                location: 'Office Ping Pong Table'
            });

            cleanupSockets(client1.client, client2.client);
        });

        it('should handle achievement notifications', async () => {
            const [client1, client2] = await createMultipleClients(serverUrl, 2);

            const notificationPromise = waitForEvent(client2.client, 'notification-received');

            client1.client.emit('send-notification', {
                recipientId: client2.user.id,
                type: 'achievement',
                title: 'Achievement Unlocked!',
                message: 'You won 10 matches in a row!',
                data: {
                    achievementId: 'win-streak-10',
                    points: 100,
                    badge: 'champion'
                }
            });

            const notification = await notificationPromise;

            expect(notification.type).toBe('achievement');
            expect(notification.data).toMatchObject({
                achievementId: 'win-streak-10',
                points: 100,
                badge: 'champion'
            });

            cleanupSockets(client1.client, client2.client);
        });

        it('should handle match update notifications', async () => {
            const [client1, client2] = await createMultipleClients(serverUrl, 2);

            const notificationPromise = waitForEvent(client2.client, 'notification-received');

            client1.client.emit('send-notification', {
                recipientId: client2.user.id,
                type: 'match_update',
                title: 'Match Score Updated',
                message: 'Your match score has been updated',
                data: {
                    matchId: 'match-789',
                    player1Score: 21,
                    player2Score: 18,
                    status: 'completed'
                }
            });

            const notification = await notificationPromise;

            expect(notification.type).toBe('match_update');
            expect(notification.data).toMatchObject({
                matchId: 'match-789',
                player1Score: 21,
                player2Score: 18,
                status: 'completed'
            });

            cleanupSockets(client1.client, client2.client);
        });
    });

    describe('Error Handling', () => {
        it('should handle malformed notification data', async () => {
            const [client1] = await createMultipleClients(serverUrl, 1);

            // Send malformed notification
            client1.client.emit('send-notification', {
                // Missing required fields
                invalidField: 'invalid'
            });

            // Connection should remain stable
            await new Promise(resolve => setTimeout(resolve, 100));
            expect(client1.client.connected).toBe(true);

            cleanupSockets(client1.client);
        });

        it('should handle notifications to non-existent users', async () => {
            const [client1] = await createMultipleClients(serverUrl, 1);

            // Send notification to non-existent user
            client1.client.emit('send-notification', {
                recipientId: 'non-existent-user',
                type: 'test',
                title: 'Test',
                message: 'This user does not exist'
            });

            // Should still confirm sending (even if no one receives it)
            const confirmation = await waitForEvent(client1.client, 'notification-sent');
            expect(confirmation.recipientId).toBe('non-existent-user');

            cleanupSockets(client1.client);
        });
    });

    describe('Performance', () => {
        it('should handle multiple simultaneous notifications', async () => {
            const clients = await createMultipleClients(serverUrl, 5);
            const [sender, ...recipients] = clients;

            // All recipients listen for notifications
            const notificationPromises = recipients.map(({ client }) => 
                waitForEvent(client, 'notification-received')
            );

            // Send notifications to all recipients simultaneously
            recipients.forEach(({ user }) => {
                sender.client.emit('send-notification', {
                    recipientId: user.id,
                    type: 'bulk_test',
                    title: 'Bulk Notification Test',
                    message: 'Testing simultaneous notifications'
                });
            });

            const receivedNotifications = await Promise.all(notificationPromises);

            expect(receivedNotifications).toHaveLength(4);
            receivedNotifications.forEach(notification => {
                expect(notification.type).toBe('bulk_test');
                expect(notification.senderId).toBe(sender.user.id);
            });

            cleanupSockets(...clients.map(c => c.client));
        });
    });
});