const {
    createTestSocketServer,
    createAuthenticatedClient,
    createUnauthenticatedClient,
    waitForEvent,
    cleanupSockets,
    cleanupServer
} = require('../utils/socketHelpers');
const { createTestUser, generateTestToken } = require('../utils/testHelpers');

describe('WebSocket Connection Tests', () => {
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
            if (!token) { 
                return next(
                    new Error('Authentication token required')
                ); 
            } 
            //More strict token validation 
            if (token === 'invalid-token' || token.length < 10) { 
                return next(
                    new Error('Invalid token')); 
            } 
            // Mock token verification for valid tokens 
            try { 
                const user = createTestUser(); 
                socket.user = user; 
                next(); 
            } catch (error) { 
                next(
                    new Error('Invalid token')
                ); 
            } 
        });

        // Set up connection handler
        io.on('connection', (socket) => {
            console.log(`User ${socket.user.id} connected`);
            
            socket.on('disconnect', () => {
                console.log(`User ${socket.user.id} disconnected`);
            });
        });
    });

    afterAll(async () => {
        await cleanupServer(httpServer);
    });

    describe('Authentication', () => {
        it('should connect with valid authentication token', async () => {
            const { client, user } = await createAuthenticatedClient(serverUrl);
            
            expect(client.connected).toBe(true);
            expect(user).toBeDefined();
            expect(user.id).toBeDefined();
            
            cleanupSockets(client);
        });

        it('should reject connection without authentication token', async () => {
            const { client, error } = await createUnauthenticatedClient(serverUrl);
            
            expect(client.connected).toBe(false);
            expect(error).toBeDefined();
            expect(error.message).toContain('Authentication');
            
            cleanupSockets(client);
        });

        it('should reject connection with invalid token', async () => {
            const client = new (require('socket.io-client'))(serverUrl, {
                auth: { token: 'invalid-token' },
                transports: ['websocket']
            });

            const error = await waitForEvent(client, 'connect_error', 2000).catch(e => e);
            
            expect(client.connected).toBe(false);
            expect(error).toBeDefined();
            
            cleanupSockets(client);
        });
    });

    describe('Connection Management', () => {
        it('should handle multiple simultaneous connections', async () => {
            const clients = [];
            const connectionPromises = [];

            // Create 5 simultaneous connections
            for (let i = 0; i < 5; i++) {
                connectionPromises.push(createAuthenticatedClient(serverUrl));
            }

            const results = await Promise.all(connectionPromises);
            
            results.forEach(({ client, user }) => {
                expect(client.connected).toBe(true);
                expect(user.id).toBeDefined();
                clients.push(client);
            });

            expect(clients).toHaveLength(5);
            
            cleanupSockets(...clients);
        });

        it('should handle connection and disconnection gracefully', async () => {
            const { client } = await createAuthenticatedClient(serverUrl);
            
            expect(client.connected).toBe(true);
            
            // Disconnect and verify
            client.disconnect();
            
            // Wait a bit for disconnection to process
            await new Promise(resolve => setTimeout(resolve, 100));
            
            expect(client.connected).toBe(false);
        });

        it('should handle reconnection after disconnection', async () => {
            const { client, user } = await createAuthenticatedClient(serverUrl);
            
            expect(client.connected).toBe(true);
            
            // Disconnect
            client.disconnect();
            await new Promise(resolve => setTimeout(resolve, 100));
            expect(client.connected).toBe(false);
            
            // Reconnect
            const reconnectPromise = new Promise((resolve) => {
                client.once('connect', resolve);
            });
            
            client.connect();
            await reconnectPromise;
            
            expect(client.connected).toBe(true);
            
            cleanupSockets(client);
        });
    });

    describe('Error Handling', () => {
        it('should handle server errors gracefully', async () => {
            const { client } = await createAuthenticatedClient(serverUrl);
            
            const errorPromise = new Promise((resolve) => {
                client.once('error', resolve);
            });
            
            // Simulate server error
            client.emit('test-error');
            
            // Should not crash the connection
            expect(client.connected).toBe(true);
            
            cleanupSockets(client);
        });

        it('should handle malformed event data', async () => {
            const { client } = await createAuthenticatedClient(serverUrl);
            
            // Send malformed data
            client.emit('test-event', { malformed: 'data', circular: {} });
            
            // Connection should remain stable
            expect(client.connected).toBe(true);
            
            cleanupSockets(client);
        });
    });
});