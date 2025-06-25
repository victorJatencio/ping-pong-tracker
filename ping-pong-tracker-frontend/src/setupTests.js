// src/setupTests.js

import { Response, Headers, fetch } from 'node-fetch';

if (!global.fetch) {
  global.fetch = fetch;
}
if (!global.Request) {
  global.Request = Request;
}
if (!global.Response) {
  global.Response = Response;
}
if (!global.Headers) {
  global.Headers = Headers;
}

// Polyfill TextEncoder and TextDecoder for Jest's JSDOM environment
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

import '@testing-library/jest-dom';
import { server } from './mocks/servers.js';

// Establish API mocking before all tests.
beforeAll(() => server.listen());

// Reset any request handlers that we may add during the tests,
// so they don't affect other tests.
afterEach(() => server.resetHandlers());

// Clean up after the tests are finished.
afterAll(() => server.close());

// Mock the actual Firebase config file to avoid import.meta.env issues
jest.mock('./config/firebase', () => ({
  db: {}, // Mock a dummy Firestore instance
  app: {}, // Mock a dummy Firebase app instance
}));

// Mock Firebase for Jest tests (these might be redundant if MSW handles all HTTP)
// but keep them if you have direct Firebase calls not going through RTK Query.
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

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  collection: jest.fn(),
  doc: jest.fn(),
  // Keep this getDocs mock for any direct Firebase calls not intercepted by MSW
  getDocs: jest.fn(() => Promise.resolve({
    docs: [],
    forEach: (callback) => {}, // Provide a dummy forEach
  })),
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
    currentUser: { uid: 'user1', email: 'test@example.com' }, // Ensure currentUser matches a mock user
    loading: false,
    error: null,
    login: jest.fn(),
    signup: jest.fn(),
    logout: jest.fn(),
  }),
}));
