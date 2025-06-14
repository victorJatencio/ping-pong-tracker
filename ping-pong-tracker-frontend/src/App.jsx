import React, { Suspense } from 'react';
import { BrowserRouter, useRoutes } from 'react-router-dom';
import Loader from './components/common/Loader';
import ErrorBoundary from './components/common/ErrorBoundary';
import routes from './config/routes';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';


// A separate component that uses useRoutes
const AppRoutes = () => {
  const routing = useRoutes(routes);
  
  return (
    <Suspense fallback={<Loader fullPage text="Loading..." />}>
      {routing}
    </Suspense>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
