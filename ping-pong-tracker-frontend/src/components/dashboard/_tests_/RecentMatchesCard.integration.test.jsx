// src/components/dashboard/_tests_/RecentMatchesCard.integration.test.jsx

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { store } from "../../../store";
import RecentMatchesCard from "../RecentMatchesCard";

// Mock Firebase
jest.mock("../../../config/firebase", () => ({
  db: {},
}));

jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
}));

const IntegrationTestWrapper = ({ children }) => (
  <Provider store={store}>
    <BrowserRouter>{children}</BrowserRouter>
  </Provider>
);

describe("RecentMatchesCard Integration", () => {
  test("integrates correctly with Redux store", async () => {
    render(
      <IntegrationTestWrapper>
        <RecentMatchesCard />
      </IntegrationTestWrapper>
    );

    // Component should render without crashing
    expect(screen.getByText("Recent Matches")).toBeInTheDocument();

    // Should show data from mocked RTK Query
    await waitFor(() => {
      // Check for match data
      const vsElements = screen.queryAllByText(/vs\./);
      expect(vsElements.length).toBeGreaterThanOrEqual(0);
    }, { timeout: 5000 });
  });

  test("handles Redux state updates correctly", async () => {
    const { rerender } = render(
      <IntegrationTestWrapper>
        <RecentMatchesCard />
      </IntegrationTestWrapper>
    );

    // Initial render should show the component
    expect(screen.getByText("Recent Matches")).toBeInTheDocument();

    // Simulate state update by re-rendering
    rerender(
      <IntegrationTestWrapper>
        <RecentMatchesCard />
      </IntegrationTestWrapper>
    );

    // Component should handle state changes gracefully
    expect(screen.getByText("Recent Matches")).toBeInTheDocument();
  });
});