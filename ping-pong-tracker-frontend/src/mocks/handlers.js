// src/mocks/handlers.js
import { http, HttpResponse } from 'msw';

// Mock Firebase document structure for matches
const mockMatchDocs = [
  {
    id: 'match1',
    data: ( ) => ({
      player1Id: 'user1',
      player2Id: 'user4', // John Doe
      winnerId: 'user1',
      score: '21-15',
      completedDate: '2023-06-22T10:00:00.000Z', // Ensure this is an ISO string
      status: 'completed',
    }),
  },
  {
    id: 'match2',
    data: () => ({
      player1Id: 'user3', // Charlie
      player2Id: 'user1', // Alice
      winnerId: 'user3',
      score: '21-19',
      completedDate: '2023-06-21T15:30:00.000Z',
      status: 'completed',
    }),
  },
  {
    id: 'match3',
    data: () => ({
      player1Id: 'user1', // Alice
      player2Id: 'user2', // Bob Johnson
      winnerId: 'user2',
      score: '18-21',
      completedDate: '2023-06-20T09:00:00.000Z',
      status: 'completed',
    }),
  },
];

// Mock Firebase document structure for users
const mockUserDocs = [
  {
    id: 'user1',
    data: () => ({
      uid: 'user1',
      displayName: 'Alice',
      profileImageUrl: 'https://i.pravatar.cc/150?u=alice',
    } ),
  },
  {
    id: 'user2',
    data: () => ({
      uid: 'user2',
      displayName: 'Bob Johnson', // Ensure this matches your test expectation
      profileImageUrl: 'https://i.pravatar.cc/150?u=bob',
    } ),
  },
  {
    id: 'user3',
    data: () => ({
      uid: 'user3',
      displayName: 'Charlie',
      profileImageUrl: 'https://i.pravatar.cc/150?u=charlie',
    } ),
  },
  {
    id: 'user4',
    data: () => ({
      uid: 'user4',
      displayName: 'John Doe', // Ensure this matches your test expectation
      profileImageUrl: 'https://i.pravatar.cc/150?u=john',
    } ),
  },
];

export const handlers = [
  // Assuming your apiSlice baseQuery is '/api'
  http.get('/api/matches', ( ) => {
    return HttpResponse.json({ docs: mockMatchDocs }); // Mimic getDocs result
  }),
  http.get('/api/users', ( ) => {
    return HttpResponse.json({ docs: mockUserDocs }); // Mimic getDocs result
  }),
];
