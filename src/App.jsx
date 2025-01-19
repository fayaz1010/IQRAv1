// Import only what we need for the core app structure
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { useTheme } from './contexts/ThemeContext';
import getTheme from './theme/theme';
import AppRoutes from './routes/AppRoutes';
import ErrorBoundary from './components/ErrorBoundary';
import React from 'react';

// Firebase configuration - needed for the entire app to work with Firebase
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase - this sets up Firebase for the entire app
import { initializeApp } from 'firebase/app';
initializeApp(firebaseConfig);

// Main App component
// This component is responsible for:
// 1. Setting up the Router for navigation
// 2. Providing Authentication context to all child components
function App() {
  const { mode, settings } = useTheme();
  const theme = React.useMemo(() => getTheme(mode, settings), [mode, settings]);

  return (
    // Apply Material-UI theme
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorBoundary>
        <AppRoutes />
      </ErrorBoundary>
    </MuiThemeProvider>
  );
}

export default App;
