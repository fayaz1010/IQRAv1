import { useState, useEffect } from 'react';
import { Box, Container, Grid, Typography } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import DashboardStats from '../../components/dashboard/DashboardStats';
import TeacherApproval from '../../components/admin/TeacherApproval';
import DashboardHeader from '../../components/dashboard/DashboardHeader';

const AdminDashboard = () => {
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
            <DashboardStats isAdmin />
          </Grid>
          <Grid item xs={12}>
            <TeacherApproval />
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default AdminDashboard;
