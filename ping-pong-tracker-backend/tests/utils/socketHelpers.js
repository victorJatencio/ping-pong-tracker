const { createServer } = require('http');
const { Server } = require('socket.io');
const Client = require('socket.io-client');
const { generateTestToken, createTestUser } = require('./testHelpers');

/**
 * Create a test Socket.IO server
 */
const createTestSocketServer = (port = 0) => {
    const httpServer = createServer();
    const io = new Server(httpServer, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    return new Promise((resolve) => {
        httpServer.listen(port, () => {
            const actualPort = httpServer.address().port;
            resolve({
                io,
                httpServer,
                port: actualPort,
                url: `http://localhost:${actualPort}`
            });
        });
    });
};

/**
 * Create authenticated Socket.IO client
 */
const createAuthenticatedClient = (serverUrl, user = null) => {
    const testUser = user || createTestUser();
    const token = generateTestToken({ uid: testUser.id });
    
    return new Promise((resolve, reject) => {
        const client = Client(serverUrl, {
            auth: {
                token: token
            },
            transports: ['websocket']
        });

        client.on('connect', () => {
            resolve({ client, user: testUser, token });
        });

        client.on('connect_error', (error) => {
            reject(error);
        });

        // Timeout after 5 seconds
        setTimeout(() => {
            if (!client.connected) {
                client.disconnect();
                reject(new Error('Connection timeout'));
            }
        }, 5000);
    });
};

/**
 * Create unauthenticated Socket.IO client
 */
const createUnauthenticatedClient = (serverUrl) => {
    return new Promise((resolve, reject) => {
        const client = Client(serverUrl, {
            transports: ['websocket']
        });

        client.on('connect', () => {
            resolve(client);
        });

        client.on('connect_error', (error) => {
            resolve({ client, error });
        });

        setTimeout(() => {
            resolve({ client, error: new Error('Connection timeout') });
        }, 2000);
    });
};

/**
 * Wait for a specific socket event
 */
const waitForEvent = (socket, eventName, timeout = 5000) => {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error(`Event '${eventName}' not received within ${timeout}ms`));
        }, timeout);

        socket.once(eventName, (data) => {
            clearTimeout(timer);
            resolve(data);
        });
    });
};

/**
 * Wait for multiple events in order
 */
const waitForEvents = async (socket, events, timeout = 5000) => {
    const results = [];
    
    for (const eventName of events) {
        const data = await waitForEvent(socket, eventName, timeout);
        results.push({ event: eventName, data });
    }
    
    return results;
};

/**
 * Emit event and wait for response
 */
const emitAndWaitFor = (socket, emitEvent, emitData, waitEvent, timeout = 5000) => {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error(`Response event '${waitEvent}' not received within ${timeout}ms`));
        }, timeout);

        socket.once(waitEvent, (data) => {
            clearTimeout(timer);
            resolve(data);
        });

        socket.emit(emitEvent, emitData);
    });
};

/**
 * Create multiple authenticated clients
 */
const createMultipleClients = async (serverUrl, count = 2) => {
    const clients = [];
    
    for (let i = 0; i < count; i++) {
        const user = createTestUser({ 
            id: `test-user-${i + 1}`,  // Use predictable IDs
            email: `test${i + 1}@example.com`,
            name: `Test User ${i + 1}`
        });
        
        const clientData = await createAuthenticatedClient(serverUrl, user);
        clients.push(clientData);
    }
    
    return clients;
};


/**
 * Clean up socket connections
 */
const cleanupSockets = (...sockets) => {
    sockets.forEach(socket => {
        if (socket && socket.connected) {
            socket.disconnect();
        }
    });
};

/**
 * Clean up server
 */
const cleanupServer = (server) => {
    return new Promise((resolve) => {
        if (server && server.listening) {
            server.close(() => {
                setTimeout(resolve, 100); // Give it time to fully close
            });
        } else {
            resolve();
        }
    });
};


/**
 * Mock Socket.IO server with authentication
 */
const createMockSocketServer = () => {
    const mockIo = {
        on: jest.fn(),
        emit: jest.fn(),
        to: jest.fn(() => mockIo),
        in: jest.fn(() => mockIo),
        use: jest.fn(),
        engine: {
            generateId: jest.fn(() => 'mock-socket-id')
        }
    };

    const mockSocket = {
        id: 'mock-socket-id',
        user: createTestUser(),
        join: jest.fn(),
        leave: jest.fn(),
        emit: jest.fn(),
        broadcast: {
            emit: jest.fn(),
            to: jest.fn(() => ({ emit: jest.fn() }))
        },
        to: jest.fn(() => ({ emit: jest.fn() })),
        on: jest.fn(),
        once: jest.fn(),
        off: jest.fn(),
        disconnect: jest.fn(),
        connected: true,
        rooms: new Set()
    };

    return { mockIo, mockSocket };
};

/**
 * Test data generators for WebSocket events
 */
const createTestSocketEvents = {
    matchUpdate: (matchId = 'test-match-123') => ({
        matchId,
        player1Score: 15,
        player2Score: 12,
        status: 'in-progress',
        updatedBy: 'test-user-123',
        timestamp: new Date().toISOString()
    }),

    notification: (recipientId = 'test-user-123') => ({
        id: 'test-notification-123',
        recipientId,
        senderId: 'test-user-456',
        type: 'match_invitation',
        title: 'New Match Invitation',
        message: 'You have been invited to a ping-pong match',
        data: { matchId: 'test-match-123' },
        timestamp: new Date().toISOString()
    }),

    userPresence: (userId = 'test-user-123') => ({
        userId,
        status: 'online',
        lastSeen: new Date().toISOString(),
        currentActivity: 'browsing'
    }),

    leaderboardUpdate: () => ({
        leaderboard: [
            { userId: 'test-user-123', name: 'Test User 1', wins: 10, losses: 5 },
            { userId: 'test-user-456', name: 'Test User 2', wins: 8, losses: 7 }
        ],
        timestamp: new Date().toISOString()
    })
};

module.exports = {
    createTestSocketServer,
    createAuthenticatedClient,
    createUnauthenticatedClient,
    waitForEvent,
    waitForEvents,
    emitAndWaitFor,
    createMultipleClients,
    cleanupSockets,
    cleanupServer,
    createMockSocketServer,
    createTestSocketEvents
};