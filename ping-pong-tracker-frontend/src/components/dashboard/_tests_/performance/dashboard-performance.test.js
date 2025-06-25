import React from 'react';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { store } from '../../../../../src/store/index';
import RecentMatchesCard from '../../components/dashboard/RecentMatchesCard';

const TestWrapper = ({ children }) => (
  <Provider store={store}>
    <BrowserRouter>
      {children}
    </BrowserRouter>
  </Provider>
);

describe('Dashboard Performance', () => {
  test('Recent Matches Card renders quickly', () => {
    const startTime = performance.now();
    
    render(
      <TestWrapper>
        <RecentMatchesCard />
      </TestWrapper>
    );

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Assert that rendering completes within 200ms
    expect(renderTime).toBeLessThan(200);
  });
});