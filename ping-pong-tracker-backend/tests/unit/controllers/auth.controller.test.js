const authController = require('../../../src/api/controllers/auth.controller');
const { 
    createMockRequest, 
    createMockResponse, 
    createMockNext,
    generateTestToken,
    generateTestFirebaseToken,
    createTestUser,
    dbTestUtils
} = require('../../utils/testHelpers');

describe('Auth Controller', () => {
    let mockReq, mockRes, mockNext;

    beforeEach(() => {
        mockReq = createMockRequest();
        mockRes = createMockResponse();
        mockNext = createMockNext();
        jest.clearAllMocks();
    });

    describe('login', () => {
        it('should login user with valid Firebase token', async () => {
            // Arrange
            const testUser = createTestUser();
            const firebaseToken = generateTestFirebaseToken();
            mockReq.body = { idToken: firebaseToken };
            
            dbTestUtils.mockSuccessfulOperations();
            const admin = require('firebase-admin');
            admin.auth().verifyIdToken.mockResolvedValue({
                uid: testUser.id,
                email: testUser.email,
                name: testUser.name
            });

            // Act
            await authController.login(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    message: 'Login successful',
                    data: expect.objectContaining({
                        user: expect.any(Object),
                        token: expect.any(String)
                    })
                })
            );
        });

        it('should return 400 for missing token', async () => {
            // Arrange
            mockReq.body = {};

            // Act
            await authController.login(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: 'ID token is required'
                })
            );
        });

        it('should return 401 for invalid token', async () => {
            // Arrange
            mockReq.body = { idToken: 'invalid-token' };
            
            const admin = require('firebase-admin');
            admin.auth().verifyIdToken.mockRejectedValue(new Error('Invalid token'));

            // Act
            await authController.login(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: 'Invalid or expired token'
                })
            );
        });
    });

    describe('refreshToken', () => {
        it('should refresh valid JWT token', async () => {
            // Arrange
            const testUser = createTestUser();
            const validToken = generateTestToken({ uid: testUser.id });
            mockReq.body = { token: validToken };
            
            dbTestUtils.mockSuccessfulOperations();

            // Act
            await authController.refreshToken(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: expect.objectContaining({
                        token: expect.any(String)
                    })
                })
            );
        });

        it('should return 401 for expired token', async () => {
            // Arrange
            const expiredToken = generateTestToken({}, { expiresIn: '-1h' });
            mockReq.body = { token: expiredToken };

            // Act
            await authController.refreshToken(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(401);
        });
    });

    describe('getProfile', () => {
        it('should return user profile', async () => {
            // Arrange
            const testUser = createTestUser();
            mockReq.user = testUser;
            
            dbTestUtils.mockSuccessfulOperations();

            // Act
            await authController.getProfile(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: expect.objectContaining({
                        user: expect.any(Object)
                    })
                })
            );
        });
    });
});