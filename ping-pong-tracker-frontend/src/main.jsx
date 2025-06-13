// import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/custom-theme.scss';
import 'bootstrap/dist/js/bootstrap.bundle.min.js'

import App from './App.jsx'
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';

createRoot(document.getElementById('root')).render(
  // <StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ThemeProvider>
  // </StrictMode>,
)
