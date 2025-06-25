// src/setupTests.js

import '@testing-library/jest-dom';

// Mock the actual Firebase config file to avoid import.meta.env issues
jest.mock('./config/firebase', () => ({
  db: {}, // Mock a dummy Firestore instance
  app: {}, // Mock a dummy Firebase app instance
}));

// Mock Firebase for Jest tests
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(),
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(),
  onAuthStateChanged: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
}));

// Create mock data that matches the expected structure
const mockMatches = [
  {
    id: 'match1',
    player1Id: 'user1',
    player2Id: 'user2',
    winnerId: 'user1',
    player1Score: 21,
    player2Score: 15,
    completedDate: new Date('2023-06-22T10:00:00.000Z'),
    status: 'completed',
  },
  {
    id: 'match2',
    player1Id: 'user3',
    player2Id: 'user1',
    winnerId: 'user3',
    player1Score: 21,
    player2Score: 19,
    completedDate: new Date('2023-06-21T15:30:00.000Z'),
    status: 'completed',
  },
  {
    id: 'match3',
    player1Id: 'user1',
    player2Id: 'user4',
    winnerId: 'user1',
    player1Score: 21,
    player2Score: 18,
    completedDate: new Date('2023-06-20T09:00:00.000Z'),
    status: 'completed',
  },
];

const mockUsers = [
  {
    id: 'user1',
    displayName: 'Alice',
    email: 'alice@example.com',
    profileImageUrl: 'https://i.pravatar.cc/150?u=alice',
  },
  {
    id: 'user2',
    displayName: 'Bob Johnson',
    email: 'bob@example.com',
    profileImageUrl: 'https://i.pravatar.cc/150?u=bob',
  },
  {
    id: 'user3',
    displayName: 'Charlie',
    email: 'charlie@example.com',
    profileImageUrl: 'https://i.pravatar.cc/150?u=charlie',
  },
  {
    id: 'user4',
    displayName: 'John Doe',
    email: 'john@example.com',
    profileImageUrl: 'https://i.pravatar.cc/150?u=john',
  },
];

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  collection: jest.fn(),
  doc: jest.fn(),
  getDocs: jest.fn(() => {
    // Return different data based on the collection being queried
    // This is a simplified approach - in a real scenario you'd want more sophisticated mocking
    const mockSnapshot = {
      forEach: (callback) => {
        // Determine what data to return based on the query
        // For now, return matches by default
        mockMatches.forEach((match) => {
          callback({
            id: match.id,
            data: () => match,
          });
        });
      },
    };
    return Promise.resolve(mockSnapshot);
  }),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  onSnapshot: jest.fn(() => () => {}),
}));

jest.mock('firebase/storage', () => ({
  getStorage: jest.fn(),
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn(),
}));

// Mock react-router-dom's useNavigate hook
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

// Mock the useAuth hook
jest.mock('./contexts/AuthContext', () => ({
  useAuth: () => ({
    currentUser: { uid: 'test-uid', email: 'test@example.com' },
    loading: false,
    error: null,
    login: jest.fn(),
    signup: jest.fn(),
    logout: jest.fn(),
  }),
}));

jest.mock('./hooks/useAuth', () => ({
  useAuth: () => ({
    currentUser: { uid: 'user1', email: 'test@example.com' },
    loading: false,
    error: null,
    login: jest.fn(),
    signup: jest.fn(),
    logout: jest.fn(),
  }),
}));

// Mock the RTK Query API slice to return our mock data
jest.mock('./store/slices/apiSlice', () => ({
  ...jest.requireActual('./store/slices/apiSlice'),
  useGetAllRecentMatchesQuery: () => ({
    data: mockMatches,
    isLoading: false,
    error: null,
  }),
  useGetAllUsersQuery: () => ({
    data: {
      user1: mockUsers[0],
      user2: mockUsers[1],
      user3: mockUsers[2],
      user4: mockUsers[3],
    },
    isLoading: false,
    error: null,
  }),
}));