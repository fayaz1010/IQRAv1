import React, { Suspense } from 'react';
import { Route } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import IqraBookViewer from '../components/IqraBookViewer';
import IqraTeaching from '../components/IqraTeaching';

// Loading screen shown while components are loading
const LoadingScreen = () => (
  <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
    <CircularProgress />
  </Box>
);

const IqraRoutes = () => {
  return (
    <>
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
    </>
  );
};

export default IqraRoutes;
