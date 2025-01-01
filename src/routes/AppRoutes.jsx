import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout/Layout';
import { CircularProgress, Box } from '@mui/material';

// Lazy load components - this improves initial loading performance
const Dashboard = React.lazy(() => import('../pages/Dashboard'));
const Login = React.lazy(() => import('../pages/auth/Login'));
const Register = React.lazy(() => import('../pages/auth/Register'));
const Profile = React.lazy(() => import('../pages/Profile'));
const Schedule = React.lazy(() => import('../pages/Schedule'));
const Learn = React.lazy(() => import('../pages/Learn'));
const AdminDashboard = React.lazy(() => import('../pages/admin/Dashboard'));
const TeacherDashboard = React.lazy(() => import('../pages/teacher/Dashboard'));
const LandingPage = React.lazy(() => import('../pages/public/LandingPage'));
const Settings = React.lazy(() => import('../pages/settings/Settings'));
const IqraBookViewer = React.lazy(() => import('../features/iqra/components/IqraBookViewer'));
const IqraTeaching = React.lazy(() => import('../features/iqra/components/IqraTeaching'));

// Loading screen shown while components are loading
const LoadingScreen = () => (
  <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
    <CircularProgress />
  </Box>
);

const AppRoutes = () => {
  // Get authentication state and user role from AuthContext
  const { currentUser, loading } = useAuth();

  // Show loading screen while checking authentication
  if (loading) {
    return <LoadingScreen />;
  }

  // Get the appropriate dashboard route based on user role
  const getDashboardRoute = () => {
    if (!currentUser) return '/';
    
    switch (currentUser.role) {
      case 'admin':
        return '/admin';
      case 'teacher':
        return '/teacher';
      default:
        return '/dashboard';
    }
  };

  // Protected route wrapper
  // This component:
  // 1. Checks if user is authenticated
  // 2. Verifies user has permission for the route
  // 3. Wraps the content in the Layout component
  const ProtectedRoute = ({ children, allowedRoles = ['student', 'teacher', 'admin'] }) => {
    // Redirect to landing page if not logged in
    if (!currentUser) {
      return <Navigate to="/" replace />;
    }

    // Redirect to appropriate dashboard if user doesn't have permission
    if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
      return <Navigate to={getDashboardRoute()} replace />;
    }

    // Wrap the content in the Layout component
    return <Layout>{children}</Layout>;
  };

  return (
    <Routes>
      {/* Public Routes */}
      {/* Landing Page - shows landing page if not logged in, redirects to dashboard if logged in */}
      <Route
        path="/"
        element={
          <Suspense fallback={<LoadingScreen />}>
            {currentUser ? (
              <Navigate to={getDashboardRoute()} replace />
            ) : (
              <LandingPage />
            )}
          </Suspense>
        }
      />

      {/* Login Page - shows login if not logged in, redirects to dashboard if logged in */}
      <Route
        path="/login"
        element={
          <Suspense fallback={<LoadingScreen />}>
            {currentUser ? (
              <Navigate to={getDashboardRoute()} replace />
            ) : (
              <Login />
            )}
          </Suspense>
        }
      />

      {/* Register Page - shows register if not logged in, redirects to dashboard if logged in */}
      <Route
        path="/register"
        element={
          <Suspense fallback={<LoadingScreen />}>
            {currentUser ? (
              <Navigate to={getDashboardRoute()} replace />
            ) : (
              <Register />
            )}
          </Suspense>
        }
      />

      {/* Student Routes */}
      <Route
        path="/dashboard"
        element={
          <Suspense fallback={<LoadingScreen />}>
            <ProtectedRoute allowedRoles={['student']}>
              <Dashboard />
            </ProtectedRoute>
          </Suspense>
        }
      />

      <Route
        path="/learn"
        element={
          <Suspense fallback={<LoadingScreen />}>
            <ProtectedRoute allowedRoles={['student']}>
              <Learn />
            </ProtectedRoute>
          </Suspense>
        }
      />

      {/* Teacher Routes */}
      <Route
        path="/teacher"
        element={
          <Suspense fallback={<LoadingScreen />}>
            <ProtectedRoute allowedRoles={['teacher']}>
              <TeacherDashboard />
            </ProtectedRoute>
          </Suspense>
        }
      />

      {/* Teacher Iqra Routes */}
      <Route
        path="/classes/iqra"
        element={
          <Suspense fallback={<LoadingScreen />}>
            <ProtectedRoute allowedRoles={['teacher']}>
              <IqraTeaching />
            </ProtectedRoute>
          </Suspense>
        }
      />

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <Suspense fallback={<LoadingScreen />}>
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          </Suspense>
        }
      />

      {/* Iqra Routes */}
      <Route
        path="/learn/iqra/:bookId"
        element={
          <Suspense fallback={<LoadingScreen />}>
            <ProtectedRoute allowedRoles={['student', 'teacher']}>
              <IqraBookViewer />
            </ProtectedRoute>
          </Suspense>
        }
      />

      {/* Common Protected Routes - accessible by all authenticated users */}
      <Route
        path="/profile"
        element={
          <Suspense fallback={<LoadingScreen />}>
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          </Suspense>
        }
      />

      <Route
        path="/schedule"
        element={
          <Suspense fallback={<LoadingScreen />}>
            <ProtectedRoute>
              <Schedule />
            </ProtectedRoute>
          </Suspense>
        }
      />

      <Route
        path="/settings"
        element={
          <Suspense fallback={<LoadingScreen />}>
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          </Suspense>
        }
      />

      {/* Catch all route - redirects to landing page */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
