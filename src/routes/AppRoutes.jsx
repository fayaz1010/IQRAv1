import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout/Layout';
import { CircularProgress, Box } from '@mui/material';

// Lazy load components
const Dashboard = React.lazy(() => import('../pages/Dashboard'));
const Login = React.lazy(() => import('../pages/auth/Login'));
const Register = React.lazy(() => import('../pages/auth/Register'));
const Profile = React.lazy(() => import('../pages/Profile'));
const Schedule = React.lazy(() => import('../pages/Schedule'));
const Learn = React.lazy(() => import('../pages/Learn'));
const AdminDashboard = React.lazy(() => import('../pages/admin/Dashboard'));
const TeacherDashboard = React.lazy(() => import('../pages/teacher/Dashboard'));

// Loading component
const LoadingScreen = () => (
  <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
    <CircularProgress />
  </Box>
);

const AppRoutes = () => {
  const { user, userRole, loading } = useAuth();

  // Show loading screen while auth state is being determined
  if (loading) {
    return <LoadingScreen />;
  }

  // Protected route wrapper
  const ProtectedRoute = ({ children, allowedRoles }) => {
    if (!user) {
      return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(userRole)) {
      // Redirect to appropriate dashboard based on role
      switch (userRole) {
        case 'admin':
          return <Navigate to="/admin" replace />;
        case 'teacher':
          return <Navigate to="/teacher" replace />;
        default:
          return <Navigate to="/dashboard" replace />;
      }
    }

    return <Layout>{children}</Layout>;
  };

  // Auth route wrapper (for login/register pages)
  const AuthRoute = ({ children }) => {
    if (user) {
      // Redirect to appropriate dashboard based on role
      switch (userRole) {
        case 'admin':
          return <Navigate to="/admin" replace />;
        case 'teacher':
          return <Navigate to="/teacher" replace />;
        default:
          return <Navigate to="/dashboard" replace />;
      }
    }
    return children;
  };

  return (
    <Routes>
      {/* Auth Routes */}
      <Route
        path="/login"
        element={
          <Suspense fallback={<LoadingScreen />}>
            <AuthRoute>
              <Login />
            </AuthRoute>
          </Suspense>
        }
      />
      <Route
        path="/register"
        element={
          <Suspense fallback={<LoadingScreen />}>
            <AuthRoute>
              <Register />
            </AuthRoute>
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
        path="/schedule"
        element={
          <Suspense fallback={<LoadingScreen />}>
            <ProtectedRoute allowedRoles={['student']}>
              <Schedule />
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
        path="/teacher/*"
        element={
          <Suspense fallback={<LoadingScreen />}>
            <ProtectedRoute allowedRoles={['teacher']}>
              <TeacherDashboard />
            </ProtectedRoute>
          </Suspense>
        }
      />

      {/* Admin Routes */}
      <Route
        path="/admin/*"
        element={
          <Suspense fallback={<LoadingScreen />}>
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          </Suspense>
        }
      />

      {/* Common Routes */}
      <Route
        path="/profile"
        element={
          <Suspense fallback={<LoadingScreen />}>
            <ProtectedRoute allowedRoles={['student', 'teacher', 'admin']}>
              <Profile />
            </ProtectedRoute>
          </Suspense>
        }
      />

      {/* Default Routes */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default AppRoutes;
