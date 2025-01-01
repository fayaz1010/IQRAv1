import React from 'react';
import { Box, Container, Grid, Button } from '@mui/material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
  const navigate = useNavigate();

  const handleSignIn = () => {
    navigate('/login');
  };

  const handleSignUp = () => {
    navigate('/register');
  };

  return (
    <Box
      component="main"
      sx={{
        minHeight: '100vh',
        background: (theme) => `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.primary.dark} 90%)`,
        color: 'white',
      }}
    >
      <Container maxWidth="xl">
        <Grid container spacing={4}>
          {/* Hero Section */}
          <Grid item xs={12}>
            <Box
              component={motion.div}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              sx={{
                height: '80vh',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center',
              }}
            >
              <Box sx={{ mb: 4 }}>
                <Button
                  variant="contained"
                  color="secondary"
                  size="large"
                  onClick={handleSignIn}
                  sx={{ mr: 2 }}
                >
                  Sign In
                </Button>
                <Button
                  variant="outlined"
                  color="secondary"
                  size="large"
                  onClick={handleSignUp}
                >
                  Sign Up
                </Button>
              </Box>
            </Box>
          </Grid>

          {/* Placeholder for Features Section */}
          <Grid item xs={12}>
            <Box
              sx={{
                minHeight: '50vh',
                bgcolor: 'background.paper',
                borderRadius: 2,
                p: 4,
              }}
            >
              Features Section Placeholder
            </Box>
          </Grid>

          {/* Placeholder for Quran Section */}
          <Grid item xs={12}>
            <Box
              sx={{
                minHeight: '50vh',
                bgcolor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: 2,
                p: 4,
              }}
            >
              Quran Section Placeholder
            </Box>
          </Grid>

          {/* Placeholder for Contact & Subscribe Section */}
          <Grid item xs={12}>
            <Box
              sx={{
                minHeight: '50vh',
                bgcolor: 'background.paper',
                borderRadius: 2,
                p: 4,
              }}
            >
              Contact & Subscribe Section Placeholder
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default LandingPage;
