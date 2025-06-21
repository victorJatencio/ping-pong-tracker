const jwt = require('jsonwebtoken');

/**
 * Generate a test JWT token
 */
const generateTestToken = (payload = {}) => {
    const defaultPayload = {
        uid: 'test-user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        ...payload
    };
    
    return jwt.sign(defaultPayload, process.env.JWT_SECRET || 'test-secret', {
        expiresIn: '1h'
    });
};

/**
 * Generate a test Firebase ID token (mock)
 */
const generateTestFirebaseToken = (payload = {}) => {
    const defaultPayload = {
        uid: 'test-user-123',
        email: 'test@example.com',
        name: 'Test User',
        ...payload
    };
    
    return jwt.sign(defaultPayload, 'firebase-secret', {
        expiresIn: '1h',
        issuer: 'https://securetoken.google.com/test-project'
    } );
};

/**
 * Create test user data
 */
const createTestUser = (overrides = {}) => {
    return {
        id: 'test-user-123',
        email: 'test@example.com',
        name: 'Test User',
        photoURL: 'https://example.com/photo.jpg',
        createdAt: new Date( ),
        updatedAt: new Date(),
        statistics: {
            totalMatches: 0,
            wins: 0,
            losses: 0,
            winRate: 0,
            currentStreak: 0,
            longestWinStreak: 0,
            totalPoints: 0,
            averagePointsPerMatch: 0
        },
        preferences: {
            privacy: {
                showEmail: false,
                showLocation: false,
                showStatistics: true
            }
        },
        notificationPreferences: {
            matchInvitations: true,
            matchUpdates: true,
            scoreUpdates: true,
            achievements: true,
            pushNotifications: true
        },
        ...overrides
    };
};

/**
 * Create test match data
 */
const createTestMatch = (overrides = {}) => {
    return {
        id: 'test-match-123',
        player1Id: 'test-user-123',
        player2Id: 'test-user-456',
        player1Score: 0,
        player2Score: 0,
        status: 'scheduled',
        scheduledDate: new Date(),
        location: 'Test Location',
        notes: 'Test match',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'test-user-123',
        participants: ['test-user-123', 'test-user-456'],
        scoreUpdateHistory: [],
        ...overrides
    };
};

/**
 * Create test notification data
 */
const createTestNotification = (overrides = {}) => {
    return {
        id: 'test-notification-123',
        recipientId: 'test-user-123',
        senderId: 'test-user-456',
        type: 'match_invitation',
        title: 'Test Notification',
        message: 'This is a test notification',
        data: {},
        read: false,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        ...overrides
    };
};

/**
 * Mock Firebase Admin SDK methods
 */
const mockFirebaseAdmin = () => {
    const admin = require('firebase-admin');
    
    const mockDoc = {
        get: jest.fn(),
        set: jest.fn(),
        update: jest.fn(),
        delete: jest.fn()
    };
    
    const mockCollection = {
        doc: jest.fn(() => mockDoc),
        add: jest.fn(),
        get: jest.fn(),
        where: jest.fn(() => mockCollection),
        orderBy: jest.fn(() => mockCollection),
        limit: jest.fn(() => mockCollection)
    };
    
    admin.firestore().collection.mockReturnValue(mockCollection);
    admin.firestore().doc.mockReturnValue(mockDoc);
    
    admin.auth().verifyIdToken.mockResolvedValue({
        uid: 'test-user-123',
        email: 'test@example.com'
    });
    
    return { mockDoc, mockCollection };
};

/**
 * Create mock Express request
 */
const createMockRequest = (overrides = {}) => {
    return {
        body: {},
        params: {},
        query: {},
        headers: {},
        user: createTestUser(),
        ...overrides
    };
};

/**
 * Create mock Express response
 */
const createMockResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.cookie = jest.fn().mockReturnValue(res);
    res.clearCookie = jest.fn().mockReturnValue(res);
    return res;
};

/**
 * Create mock Express next function
 */
const createMockNext = () => jest.fn();

/**
 * Database test utilities
 */
const dbTestUtils = {
    mockSuccessfulOperations: () => {
        const admin = require('firebase-admin');
        const { mockDoc, mockCollection } = mockFirebaseAdmin();
        
        mockDoc.get.mockResolvedValue({
            exists: true,
            data: () => createTestUser(),
            id: 'test-user-123'
        });
        
        mockDoc.set.mockResolvedValue();
        mockDoc.update.mockResolvedValue();
        mockDoc.delete.mockResolvedValue();
        
        mockCollection.add.mockResolvedValue({
            id: 'new-doc-123'
        });
        
        mockCollection.get.mockResolvedValue({
            docs: [
                {
                    id: 'test-doc-1',
                    data: () => createTestUser(),
                    exists: true
                }
            ]
        });
        
        return { mockDoc, mockCollection };
    },
    
    mockFailedOperations: (error = new Error('Database error')) => {
        const admin = require('firebase-admin');
        const { mockDoc, mockCollection } = mockFirebaseAdmin();
        
        mockDoc.get.mockRejectedValue(error);
        mockDoc.set.mockRejectedValue(error);
        mockDoc.update.mockRejectedValue(error);
        mockDoc.delete.mockRejectedValue(error);
        
        mockCollection.add.mockRejectedValue(error);
        mockCollection.get.mockRejectedValue(error);
        
        return { mockDoc, mockCollection };
    }
};

module.exports = {
    generateTestToken,
    generateTestFirebaseToken,
    createTestUser,
    createTestMatch,
    createTestNotification,
    mockFirebaseAdmin,
    createMockRequest,
    createMockResponse,
    createMockNext,
    dbTestUtils
};
