const request = require('supertest');
const app = require('../../src/app.test');
const { 
    generateTestFirebaseToken,
    generateTestToken,
    createTestUser,
    dbTestUtils
} = require('../utils/testHelpers');

describe('Auth Integration Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/auth/login', () => {
        it('should login user with valid Firebase token', async () => {
            // Arrange
            const testUser = createTestUser();
            const firebaseToken = generateTestFirebaseToken();
            
            dbTestUtils.mockSuccessfulOperations();
            const admin = require('firebase-admin');
            admin.auth().verifyIdToken.mockResolvedValue({
                uid: testUser.id,
                email: testUser.email,
                name: testUser.name
            });

            // Act & Assert
            const response = await request(app)
                .post('/api/auth/login')
                .send({ idToken: firebaseToken })
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                message: 'Login successful',
                data: {
                    user: expect.any(Object),
                    token: expect.any(String)
                }
            });
        });

        it('should return 400 for missing token', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({})
                .expect(400);

            expect(response.body).toMatchObject({
                success: false,
                message: 'ID token is required'
            });
        });
    });

    describe('POST /api/auth/refresh', () => {
        it('should refresh valid JWT token', async () => {
            // Arrange
            const testUser = createTestUser();
            const validToken = generateTestToken({ uid: testUser.id });
            
            dbTestUtils.mockSuccessfulOperations();

            // Act & Assert
            const response = await request(app)
                .post('/api/auth/refresh')
                .send({ token: validToken })
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                data: {
                    token: expect.any(String)
                }
            });
        });
    });

    describe('GET /api/auth/profile', () => {
        it('should return user profile with valid token', async () => {
            // Arrange
            const testUser = createTestUser();
            const validToken = generateTestToken({ uid: testUser.id });
            
            dbTestUtils.mockSuccessfulOperations();

            // Act & Assert
            const response = await request(app)
                .get('/api/auth/profile')
                .set('Authorization', `Bearer ${validToken}`)
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                data: {
                    user: expect.any(Object)
                }
            });
        });

        it('should return 401 for missing token', async () => {
            const response = await request(app)
                .get('/api/auth/profile')
                .expect(401);

            expect(response.body).toMatchObject({
                success: false,
                message: 'Access token is required'
            });
        });
    });
});