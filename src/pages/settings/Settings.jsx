import React, { useState } from 'react';
import { Container, Typography, Box, Button, Paper, Alert } from '@mui/material';
import { signInWithGoogle } from '../../config/googleMeet';
import { Google as GoogleIcon } from '@mui/icons-material';

const Settings = () => {
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleGoogleSignIn = async () => {
    try {
      setError(null);
      setSuccess(null);
      await signInWithGoogle();
      setSuccess('Successfully connected Google Calendar');
    } catch (error) {
      console.error('Google Sign-In error:', error);
      setError(error.message);
    }
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Settings
        </Typography>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Google Calendar Integration
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Connect your Google Calendar to enable creating Google Meet sessions for your classes.
          </Typography>
          
          <Button
            variant="contained"
            color="primary"
            startIcon={<GoogleIcon />}
            onClick={handleGoogleSignIn}
            sx={{ mt: 2 }}
          >
            Connect Google Calendar
          </Button>

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert severity="success" sx={{ mt: 2 }}>
              {success}
            </Alert>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default Settings;
