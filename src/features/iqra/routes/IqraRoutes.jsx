import React, { Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import IqraBookViewer from '../components/IqraBookViewer';
import IqraTeaching from '../components/IqraTeaching';
import TeachingSession from '../components/teaching/TeachingSession';
import { SessionProvider } from '../contexts/SessionContext';

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
        <Route
          path="/classes/iqra"
          element={
            <Suspense fallback={<LoadingScreen />}>
              <IqraTeaching />
            </Suspense>
          }
        />
        <Route
          path="/classes/iqra/teaching/:studentId"
          element={
            <Suspense fallback={<LoadingScreen />}>
              <IqraTeaching />
            </Suspense>
          }
        />
        <Route
          path="/iqra/book/:bookId"
          element={
            <Suspense fallback={<LoadingScreen />}>
              <IqraBookViewer />
            </Suspense>
          }
        />
        <Route path="/teach/:classId" element={<TeachingSession bookId="iqra-book-1" />} />
      </Routes>
    </SessionProvider>
  );
};

export default IqraRoutes;
