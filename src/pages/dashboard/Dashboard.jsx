import { useState, useEffect } from 'react';
import { Box, Container, Grid } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import DashboardStats from '../../components/dashboard/DashboardStats';
import DashboardHeader from '../../components/dashboard/DashboardHeader';

const Dashboard = () => {
  const { currentUser } = useAuth();

  return (
    <Box
      component="main"
      sx={{
        flexGrow: 1,
        py: 4,
        px: 2
      }}
    >
      <Container maxWidth="lg">
        <DashboardHeader />
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <DashboardStats />
          </Grid>
          {/* Add more dashboard components here */}
        </Grid>
      </Container>
    </Box>
  );
};

export default Dashboard;
