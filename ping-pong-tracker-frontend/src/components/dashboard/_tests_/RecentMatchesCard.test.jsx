// src/components/dashboard/_tests_/RecentMatchesCard.test.jsx

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { store } from "../../../store";
import RecentMatchesCard from "../RecentMatchesCard";

// Mock the useAuth hook module
jest.mock('../../../hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));

// Import the mocked useAuth
import { useAuth } from '../../../hooks/useAuth';

// A simple wrapper for tests that need Redux and Router
const TestWrapper = ({ children }) => (
  <Provider store={store}>
    <BrowserRouter>{children}</BrowserRouter>
  </Provider>
);

describe("RecentMatchesCard", () => {
  beforeEach(() => {
    // Set up a mock current user for each test
    useAuth.mockReturnValue({
      currentUser: { uid: 'user1', email: 'test@example.com' },
      loading: false,
      error: null,
      login: jest.fn(),
      signup: jest.fn(),
      logout: jest.fn(),
    });
  });

  // Test for rendering with valid data
  test("renders with valid data", async () => {
    render(
      <TestWrapper>
        <RecentMatchesCard />
      </TestWrapper>
    );

    // Check for the card title first
    expect(screen.getByText("Recent Matches")).toBeInTheDocument();
    
    // Wait for the data to load and check match display
    await waitFor(() => {
      // Check for opponent names (based on our mock data)
      expect(screen.getByText("vs. Charlie")).toBeInTheDocument();
    }, { timeout: 5000 });
    
    // Check for other elements that should be present
    expect(screen.getByText("vs. John Doe")).toBeInTheDocument();
    expect(screen.getByText("21-19")).toBeInTheDocument();
    expect(screen.getByText("21-18")).toBeInTheDocument();
    
    // Check for win/loss badges
    const wonBadges = screen.getAllByText("Won");
    const lostBadges = screen.getAllByText("Lost");
    expect(wonBadges.length).toBeGreaterThan(0);
    expect(lostBadges.length).toBeGreaterThan(0);
  });

  // Test for component structure
  test("displays component structure correctly", async () => {
    render(
      <TestWrapper>
        <RecentMatchesCard />
      </TestWrapper>
    );

    // Check for the main title
    expect(screen.getByText("Recent Matches")).toBeInTheDocument();
    
    // Check for the footer link
    expect(screen.getByText("View All Matches")).toBeInTheDocument();
    
    // Verify the component renders without crashing
    const cardElement = screen.getByText("Recent Matches").closest('.dashboard-card');
    expect(cardElement).toBeInTheDocument();
  });

  // Test for handling data gracefully
  test("handles component rendering gracefully", async () => {
    render(
      <TestWrapper>
        <RecentMatchesCard />
      </TestWrapper>
    );

    // Ensure the component renders without crashing
    expect(screen.getByText("Recent Matches")).toBeInTheDocument();
    
    // Check that we have some match content (at least one "vs." text)
    const vsElements = screen.getAllByText(/vs\./);
    expect(vsElements.length).toBeGreaterThan(0);
  });
});