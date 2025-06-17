import { lazy } from 'react';
import MainLayout from '../layouts/MainLayout';
import AuthLayout from '../layouts/AuthLayout';
import ProtectedRoute from '../components/auth/ProtectedRoute';

// Lazy-loaded components
const Dashboard = lazy(() => import('../pages/Dashboard'));
const Matches = lazy(() => import('../pages/Matches'));
const Leaderboard = lazy(() => import('../pages/Leaderboard'));
const History = lazy(() => import('../pages/History'));
const Profile = lazy(() => import('../pages/Profile'));
const Login = lazy(() => import('../pages/Login'));
const Register = lazy(() => import('../pages/Register'));
const NotFound = lazy(() => import('../pages/NotFound'));

const routes = [
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        element: <MainLayout />,
        children: [
          { index: true, element: <Dashboard /> },
          { path: 'dashboard', element: <Dashboard /> },
          { path: 'matches', element: <Matches /> },
          { path: 'leaderboard', element: <Leaderboard /> },
          { path: 'history', element: <History /> },
          { path: 'profile', element: <Profile /> },
        ],
      },
    ],
  },
  {
    element: <AuthLayout />,
    children: [
      { path: 'login', element: <Login /> },
      { path: 'register', element: <Register /> },
    ],
  },
  { path: '*', element: <NotFound /> },
];

export default routes;
