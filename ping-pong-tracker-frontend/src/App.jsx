import React, { Suspense } from 'react';

import { BrowserRouter, useRoutes } from 'react-router-dom';
import Loader from './components/common/Loader';
import ErrorBoundary from './components/common/ErrorBoundary';
import { Provider } from 'react-redux';
import { store } from './store';
import routes from './config/routes';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import 'react-toastify/dist/ReactToastify.css';
import ModalManager from './components/common/ModalManagement'; 

import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale
} from 'chart.js';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale
);



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
      <Provider store={store}>
      <AuthProvider>
        <ThemeProvider>
          <BrowserRouter>
            <AppRoutes />
            <ModalManager />
          </BrowserRouter>
        </ThemeProvider>
      </AuthProvider>
      </Provider>
    </ErrorBoundary>
  );
}

export default App;
