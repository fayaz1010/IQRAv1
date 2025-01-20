import React, { Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { SessionProvider } from '../contexts/SessionContext';

// Lazy load components
const IqraTeaching = React.lazy(() => import('../components/IqraTeaching'));
const IqraBookViewer = React.lazy(() => import('../components/IqraBookViewer'));
const TeachingSession = React.lazy(() => import('../components/teaching/TeachingSession'));

// Loading screen shown while components are loading
const LoadingScreen = () => (
  <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
    <CircularProgress />
  </Box>
);

const IqraRoutes = () => {
  return (
    <SessionProvider>
      <Routes>
        {/* Main teaching dashboard */}
        <Route
          path="/"
          element={
            <Suspense fallback={<LoadingScreen />}>
              <IqraTeaching />
            </Suspense>
          }
        />

        {/* Active teaching session */}
        <Route
          path="/teaching/:studentId"
          element={
            <Suspense fallback={<LoadingScreen />}>
              <IqraTeaching />
            </Suspense>
          }
        />

        {/* Book viewer */}
        <Route
          path="/book/:bookId"
          element={
            <Suspense fallback={<LoadingScreen />}>
              <IqraBookViewer />
            </Suspense>
          }
        />

        {/* Teaching session */}
        <Route
          path="/teach/:classId"
          element={
            <Suspense fallback={<LoadingScreen />}>
              <TeachingSession />
            </Suspense>
          }
        />
      </Routes>
    </SessionProvider>
  );
};

export default IqraRoutes;
