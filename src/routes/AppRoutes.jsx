import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserProvider } from '../contexts/UserContext';
import Layout from '../components/Layout/Layout';
import { CircularProgress, Box } from '@mui/material';
import { SessionProvider } from '../features/iqra/contexts/SessionContext';

// Lazy load components
const StudentDashboard = React.lazy(() => import('../pages/dashboard/StudentDashboard'));
const TeacherDashboard = React.lazy(() => import('../pages/dashboard/TeacherDashboard'));
const AdminDashboard = React.lazy(() => import('../pages/admin/AdminDashboard'));
const BookManager = React.lazy(() => import('../pages/admin/BookManager'));
const Login = React.lazy(() => import('../pages/auth/Login'));
const Register = React.lazy(() => import('../pages/auth/Register'));
const Profile = React.lazy(() => import('../pages/Profile'));
const Schedule = React.lazy(() => import('../pages/Schedule'));
const Learn = React.lazy(() => import('../pages/Learn'));
const Practice = React.lazy(() => import('../pages/Practice'));
const ManageUsers = React.lazy(() => import('../pages/admin/ManageUsers'));
const LandingPage = React.lazy(() => import('../pages/public/LandingPage'));
const Settings = React.lazy(() => import('../pages/settings/Settings'));
const Classes = React.lazy(() => import('../pages/Classes'));
const Courses = React.lazy(() => import('../pages/Courses'));
const Materials = React.lazy(() => import('../pages/Materials'));
const IqraRoutes = React.lazy(() => import('../features/iqra/routes/IqraRoutes'));
const SessionHistory = React.lazy(() => import('../pages/SessionHistory'));
const TeachingSession = React.lazy(() => import('../features/iqra/components/teaching/TeachingSession'));
const StudentsList = React.lazy(() => import('../pages/teacher/students/StudentsList'));
const StudentDetail = React.lazy(() => import('../pages/teacher/students/StudentDetail'));

// Loading screen
const LoadingScreen = () => (
  <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
    <CircularProgress />
  </Box>
);

const AppRoutes = () => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  const getDashboardRoute = () => {
    if (!currentUser) return '/';
    
    switch (currentUser.role) {
      case 'admin':
        return '/admin/dashboard';
      case 'teacher':
        return '/teacher/dashboard';
      default:
        return '/dashboard';
    }
  };

  // Protected route wrapper
  const ProtectedRoute = ({ children, allowedRoles = [] }) => {
    if (!currentUser) {
      return <Navigate to="/login" />;
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(currentUser.role)) {
      return <Navigate to={getDashboardRoute()} />;
    }

    return <Layout>{children}</Layout>;
  };

  return (
    <UserProvider>
      <Routes>
        {/* Public routes */}
        <Route
          path="/"
          element={
            currentUser ? (
              <Navigate to={getDashboardRoute()} />
            ) : (
              <Suspense fallback={<LoadingScreen />}>
                <LandingPage />
              </Suspense>
            )
          }
        />
        
        {/* Auth routes */}
        <Route
          path="/login"
          element={
            currentUser ? (
              <Navigate to={getDashboardRoute()} />
            ) : (
              <Suspense fallback={<LoadingScreen />}>
                <Login />
              </Suspense>
            )
          }
        />
        <Route
          path="/register"
          element={
            currentUser ? (
              <Navigate to={getDashboardRoute()} />
            ) : (
              <Suspense fallback={<LoadingScreen />}>
                <Register />
              </Suspense>
            )
          }
        />

        {/* Student routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <Suspense fallback={<LoadingScreen />}>
                <StudentDashboard />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/practice"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <Suspense fallback={<LoadingScreen />}>
                <Practice />
              </Suspense>
            </ProtectedRoute>
          }
        />

        {/* Common routes */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute allowedRoles={['student', 'teacher', 'admin']}>
              <Suspense fallback={<LoadingScreen />}>
                <Profile />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/sessions/history"
          element={
            <ProtectedRoute allowedRoles={['student', 'teacher', 'admin']}>
              <Suspense fallback={<LoadingScreen />}>
                <SessionHistory />
              </Suspense>
            </ProtectedRoute>
          }
        />

        {/* Session Routes */}
        <Route
          path="/session/:sessionId"
          element={
            <ProtectedRoute allowedRoles={['student', 'teacher']}>
              <Suspense fallback={<LoadingScreen />}>
                <SessionProvider>
                  <TeachingSession />
                </SessionProvider>
              </Suspense>
            </ProtectedRoute>
          }
        />

        <Route
          path="/teaching/:classId"
          element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <Suspense fallback={<LoadingScreen />}>
                <SessionProvider>
                  <TeachingSession />
                </SessionProvider>
              </Suspense>
            </ProtectedRoute>
          }
        />

        {/* Teacher routes */}
        <Route
          path="/teacher"
          element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <Navigate to="/teacher/dashboard" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/dashboard"
          element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <Suspense fallback={<LoadingScreen />}>
                <SessionProvider>
                  <TeacherDashboard />
                </SessionProvider>
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/students"
          element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <Suspense fallback={<LoadingScreen />}>
                <StudentsList />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/students/:studentId"
          element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <Suspense fallback={<LoadingScreen />}>
                <StudentDetail />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/teaching/active-sessions"
          element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <Suspense fallback={<LoadingScreen />}>
                <SessionProvider>
                  <IqraRoutes />
                </SessionProvider>
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/courses"
          element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <Suspense fallback={<LoadingScreen />}>
                <Courses />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/materials"
          element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <Suspense fallback={<LoadingScreen />}>
                <Materials />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/schedule"
          element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <Suspense fallback={<LoadingScreen />}>
                <Schedule />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/classes"
          element={
            <ProtectedRoute allowedRoles={['teacher', 'student']}>
              <Suspense fallback={<LoadingScreen />}>
                <Classes />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/sessions/history"
          element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <Suspense fallback={<LoadingScreen />}>
                <SessionHistory />
              </Suspense>
            </ProtectedRoute>
          }
        />

        {/* Admin routes */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Suspense fallback={<LoadingScreen />}>
                <AdminDashboard />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Suspense fallback={<LoadingScreen />}>
                <ManageUsers />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Suspense fallback={<LoadingScreen />}>
                <Settings />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute allowedRoles={['teacher', 'admin']}>
              <Suspense fallback={<LoadingScreen />}>
                <Settings />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Routes>
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="users" element={<ManageUsers />} />
                <Route path="books" element={<BookManager />} />
              </Routes>
            </ProtectedRoute>
          }
        />

        {/* Iqra routes */}
        <Route
          path="/classes/iqra/*"
          element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <Suspense fallback={<LoadingScreen />}>
                <IqraRoutes />
              </Suspense>
            </ProtectedRoute>
          }
        />
      </Routes>
    </UserProvider>
  );
};

export default AppRoutes;
