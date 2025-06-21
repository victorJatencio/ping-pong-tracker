const matchController = require('../../../src/api/controllers/match.controller');
const { 
    createMockRequest, 
    createMockResponse, 
    createMockNext,
    createTestUser,
    createTestMatch,
    dbTestUtils
} = require('../../utils/testHelpers');

describe('Match Controller', () => {
    let mockReq, mockRes, mockNext;

    beforeEach(() => {
        mockReq = createMockRequest();
        mockRes = createMockResponse();
        mockNext = createMockNext();
        jest.clearAllMocks();
    });

    describe('createMatch', () => {
        it('should create a new match successfully', async () => {
            // Arrange
            const testUser = createTestUser();
            const matchData = {
                opponentId: 'test-user-456',
                scheduledDate: new Date().toISOString(),
                location: 'Test Location',
                notes: 'Test match'
            };
            
            mockReq.user = testUser;
            mockReq.body = matchData;
            
            dbTestUtils.mockSuccessfulOperations();

            // Act
            await matchController.createMatch(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    message: 'Match created successfully',
                    data: expect.objectContaining({
                        match: expect.any(Object)
                    })
                })
            );
        });

        it('should return 400 for missing opponent', async () => {
            // Arrange
            mockReq.body = {
                scheduledDate: new Date().toISOString(),
                location: 'Test Location'
            };

            // Act
            await matchController.createMatch(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(400);
        });

        it('should return 400 for self-match attempt', async () => {
            // Arrange
            const testUser = createTestUser();
            mockReq.user = testUser;
            mockReq.body = {
                opponentId: testUser.id,
                scheduledDate: new Date().toISOString()
            };

            // Act
            await matchController.createMatch(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: 'You cannot create a match against yourself'
                })
            );
        });
    });

    describe('updateMatchScore', () => {
        it('should update match score successfully', async () => {
            // Arrange
            const testUser = createTestUser();
            const testMatch = createTestMatch({
                player1Id: testUser.id,
                status: 'in-progress'
            });
            
            mockReq.user = testUser;
            mockReq.params = { matchId: testMatch.id };
            mockReq.body = {
                player1Score: 21,
                player2Score: 18,
                notes: 'Great match!'
            };
            
            const { mockDoc } = dbTestUtils.mockSuccessfulOperations();
            mockDoc.get.mockResolvedValue({
                exists: true,
                data: () => testMatch,
                id: testMatch.id
            });

            // Act
            await matchController.updateMatchScore(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    message: 'Match score updated successfully'
                })
            );
        });

        it('should return 404 for non-existent match', async () => {
            // Arrange
            mockReq.params = { matchId: 'non-existent-match' };
            mockReq.body = { player1Score: 21, player2Score: 18 };
            
            const { mockDoc } = dbTestUtils.mockSuccessfulOperations();
            mockDoc.get.mockResolvedValue({ exists: false });

            // Act
            await matchController.updateMatchScore(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(404);
        });

        it('should return 403 for unauthorized user', async () => {
            // Arrange
            const testUser = createTestUser();
            const testMatch = createTestMatch({
                player1Id: 'other-user',
                player2Id: 'another-user'
            });
            
            mockReq.user = testUser;
            mockReq.params = { matchId: testMatch.id };
            mockReq.body = { player1Score: 21, player2Score: 18 };
            
            const { mockDoc } = dbTestUtils.mockSuccessfulOperations();
            mockDoc.get.mockResolvedValue({
                exists: true,
                data: () => testMatch,
                id: testMatch.id
            });

            // Act
            await matchController.updateMatchScore(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(403);
        });
    });

    describe('getMatches', () => {
        it('should return user matches with pagination', async () => {
            // Arrange
            const testUser = createTestUser();
            mockReq.user = testUser;
            mockReq.query = { page: '1', limit: '10' };
            
            dbTestUtils.mockSuccessfulOperations();

            // Act
            await matchController.getMatches(mockReq, mockRes);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: expect.objectContaining({
                        matches: expect.any(Array),
                        pagination: expect.any(Object)
                    })
                })
            );
        });
    });
});