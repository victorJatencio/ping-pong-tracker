const request = require('supertest');
const app = require('../../src/app');
const { 
    generateTestToken,
    createTestUser,
    createTestMatch,
    dbTestUtils
} = require('../utils/testHelpers');

describe('Matches Integration Tests', () => {
    let authToken;
    let testUser;

    beforeEach(() => {
        testUser = createTestUser();
        authToken = generateTestToken({ uid: testUser.id });
        jest.clearAllMocks();
    });

    describe('POST /api/matches', () => {
        it('should create a new match', async () => {
            // Arrange
            const matchData = {
                opponentId: 'test-user-456',
                scheduledDate: new Date().toISOString(),
                location: 'Test Location',
                notes: 'Test match'
            };
            
            dbTestUtils.mockSuccessfulOperations();

            // Act & Assert
            const response = await request(app)
                .post('/api/matches')
                .set('Authorization', `Bearer ${authToken}`)
                .send(matchData)
                .expect(201);

            expect(response.body).toMatchObject({
                success: true,
                message: 'Match created successfully',
                data: {
                    match: expect.objectContaining({
                        player1Id: testUser.id,
                        player2Id: matchData.opponentId,
                        location: matchData.location
                    })
                }
            });
        });

        it('should return 400 for invalid match data', async () => {
            const response = await request(app)
                .post('/api/matches')
                .set('Authorization', `Bearer ${authToken}`)
                .send({})
                .expect(400);

            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/matches', () => {
        it('should return user matches with pagination', async () => {
            // Arrange
            dbTestUtils.mockSuccessfulOperations();

            // Act & Assert
            const response = await request(app)
                .get('/api/matches?page=1&limit=10')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                data: {
                    matches: expect.any(Array),
                    pagination: expect.objectContaining({
                        page: 1,
                        limit: 10,
                        total: expect.any(Number)
                    })
                }
            });
        });
    });

    describe('PUT /api/matches/:matchId/score', () => {
        it('should update match score', async () => {
            // Arrange
            const testMatch = createTestMatch({
                player1Id: testUser.id,
                status: 'in-progress'
            });
            
            const { mockDoc } = dbTestUtils.mockSuccessfulOperations();
            mockDoc.get.mockResolvedValue({
                exists: true,
                data: () => testMatch,
                id: testMatch.id
            });

            // Act & Assert
            const response = await request(app)
                .put(`/api/matches/${testMatch.id}/score`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    player1Score: 21,
                    player2Score: 18,
                    notes: 'Great match!'
                })
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                message: 'Match score updated successfully'
            });
        });
    });
});