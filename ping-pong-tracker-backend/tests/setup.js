// Mock Firebase Admin SDK
jest.mock('firebase-admin', () => {
    const mockFirestore = {
        collection: jest.fn(() => mockFirestore),
        doc: jest.fn(() => mockFirestore),
        get: jest.fn(),
        set: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        add: jest.fn(),
        where: jest.fn(() => mockFirestore),
        orderBy: jest.fn(() => mockFirestore),
        limit: jest.fn(() => mockFirestore),
        batch: jest.fn(() => ({
            set: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            commit: jest.fn()
        })),
        FieldValue: {
            serverTimestamp: jest.fn(() => new Date()),
            increment: jest.fn((value) => value),
            arrayUnion: jest.fn((value) => value),
            arrayRemove: jest.fn((value) => value)
        }
    };

    const mockAuth = {
        verifyIdToken: jest.fn(),
        createCustomToken: jest.fn(),
        getUser: jest.fn(),
        createUser: jest.fn(),
        updateUser: jest.fn(),
        deleteUser: jest.fn()
    };

    return {
        initializeApp: jest.fn(),
        credential: {
            cert: jest.fn()
        },
        firestore: jest.fn(() => mockFirestore),
        auth: jest.fn(() => mockAuth),
        apps: []
    };
});

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '5001';
process.env.FIREBASE_PROJECT_ID = 'test-project';
process.env.FIREBASE_CLIENT_EMAIL = 'test@test-project.iam.gserviceaccount.com';
process.env.FIREBASE_PRIVATE_KEY = 'test-private-key';
process.env.FIREBASE_DATABASE_URL = 'https://test-project-default-rtdb.firebaseio.com/';
process.env.JWT_SECRET = 'test-jwt-secret';

// Global test setup
beforeAll(async ( ) => {
    console.log('🧪 Test environment initialized');
});

// Clean up after each test
afterEach(async () => {
    jest.clearAllMocks();
});

// Global test cleanup
afterAll(async () => {
    console.log('🧹 Test environment cleaned up');
});

// Global error handler for tests
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
