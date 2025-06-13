// import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// import './index.css'
// import 'bootstrap/dist/css/bootstrap.min.css'
import './styles/custom-theme.scss';
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
// import 'bootstrap-icons/font/bootstrap-icons.css';

import App from './App.jsx'
import { ThemeProvider } from './contexts/ThemeContext';

createRoot(document.getElementById('root')).render(
  // <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  // </StrictMode>,
)
