// Import only what we need for the core app structure
import { BrowserRouter as Router } from 'react-router-dom';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import getTheme from './theme/theme';
import AppRoutes from './routes/AppRoutes';
import ErrorBoundary from './components/ErrorBoundary';

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
// 3. Providing Theme context for consistent styling
function App() {
  return (
    // Router wraps the entire app to enable navigation
    <ErrorBoundary>
      <Router>
        {/* AuthProvider makes authentication state available throughout the app */}
        <AuthProvider>
          {/* ThemeProvider enables theme customization */}
          <ThemeProvider>
            <AppContent />
          </ThemeProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

// AppContent component
// This component:
// 1. Gets the current theme settings
// 2. Applies the Material-UI theme
// 3. Renders the main app routes
function AppContent() {
  // Get theme settings from ThemeContext
  const { mode, settings } = useTheme();
  const muiTheme = getTheme(mode, settings?.fontSize);

  return (
    // Apply Material-UI theme
    <MuiThemeProvider theme={muiTheme}>
      {/* CssBaseline normalizes browser styles */}
      <CssBaseline />
      {/* AppRoutes contains all the routing logic */}
      <AppRoutes />
    </MuiThemeProvider>
  );
}

export default App;
