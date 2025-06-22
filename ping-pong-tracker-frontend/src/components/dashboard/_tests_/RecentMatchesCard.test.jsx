import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import { apiSlice } from "../../../store/slices/apiSlice";
import RecentMatchesCard from "../RecentMatchesCard";

// Mock data for testing
const mockMatches = [
  {
    id: "match1",
    player1Id: "user1",
    player2Id: "user2",
    winnerId: "user1",
    player1Score: 21,
    player2Score: 18,
    status: "completed",
    completedDate: new Date("2023-06-20T10:00:00Z"),
  },
  {
    id: "match2",
    player1Id: "user2",
    player2Id: "user3",
    winnerId: "user3",
    player1Score: 15,
    player2Score: 21,
    status: "completed",
    completedDate: new Date("2023-06-19T14:30:00Z"),
  },
];

const mockUsers = {
  user1: {
    id: "user1",
    displayName: "John Doe",
    email: "john@example.com",
    profileImageUrl: "https://example.com/avatar1.jpg",
  },
  user2: {
    id: "user2",
    displayName: "Jane Smith",
    email: "jane@example.com",
    profileImageUrl: null,
  },
  user3: {
    id: "user3",
    displayName: "Bob Johnson",
    email: "bob@example.com",
    profileImageUrl: "https://example.com/avatar3.jpg",
  },
};

// Test store setup
const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      [apiSlice.reducerPath]: apiSlice.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(apiSlice.middleware),
    preloadedState: {
      api: {
        queries: {
          "getAllRecentMatches(undefined)": {
            status: "fulfilled",
            data: mockMatches,
            ...initialState.matches,
          },
          "getAllUsers(undefined)": {
            status: "fulfilled",
            data: mockUsers,
            ...initialState.users,
          },
        },
      },
    },
  });
};

// Test wrapper component
const TestWrapper = ({ children, store }) => (
  <Provider store={store}>
    <BrowserRouter>{children}</BrowserRouter>
  </Provider>
);

describe("RecentMatchesCard", () => {
  test("renders with valid data", async () => {
    const store = createTestStore();

    render(
      <TestWrapper store={store}>
        <RecentMatchesCard />
      </TestWrapper>
    );

    // Check that the card title is rendered
    expect(screen.getByText("Recent Matches")).toBeInTheDocument();

    // Wait for data to load and check match display
    await waitFor(() => {
      expect(screen.getByText("vs. John Doe")).toBeInTheDocument();
      expect(screen.getByText("vs. Bob Johnson")).toBeInTheDocument();
    });

    // Check that scores are displayed
    expect(screen.getByText("21-18")).toBeInTheDocument();
    expect(screen.getByText("15-21")).toBeInTheDocument();

    // Check that the footer action is present
    expect(screen.getByText("View All Matches")).toBeInTheDocument();
  });

  test("displays loading state", () => {
    const store = createTestStore({
      matches: { status: "pending" },
      users: { status: "pending" },
    });

    render(
      <TestWrapper store={store}>
        <RecentMatchesCard />
      </TestWrapper>
    );

    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  test("displays error state", () => {
    const store = createTestStore({
      matches: {
        status: "rejected",
        error: { message: "Failed to fetch matches" },
      },
    });

    render(
      <TestWrapper store={store}>
        <RecentMatchesCard />
      </TestWrapper>
    );

    expect(screen.getByText("Unable to load data")).toBeInTheDocument();
  });

  test("displays empty state when no matches available", async () => {
    const store = createTestStore({
      matches: { status: "fulfilled", data: [] },
    });

    render(
      <TestWrapper store={store}>
        <RecentMatchesCard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("No recent matches")).toBeInTheDocument();
    });
  });

  test("handles missing user data gracefully", async () => {
    const store = createTestStore({
      users: { status: "fulfilled", data: {} },
    });

    render(
      <TestWrapper store={store}>
        <RecentMatchesCard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("vs. Unknown Player")).toBeInTheDocument();
    });
  });
});
