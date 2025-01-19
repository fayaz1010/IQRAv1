import { useState, useEffect } from 'react';
import { Box, Container, Grid, Paper, Typography, Button } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import DashboardStats from '../../components/dashboard/DashboardStats';
import TeacherApproval from '../../components/admin/TeacherApproval';
import { Link as RouterLink } from 'react-router-dom';
import { LibraryBooks as BooksIcon } from '@mui/icons-material';

// Components for each section
const SystemOverview = () => (
  <Paper sx={{ p: 3, height: '100%' }}>
    <Typography variant="h6" gutterBottom>System Overview</Typography>
    {/* Add system overview content */}
  </Paper>
);

const ActiveUsers = () => (
  <Paper sx={{ p: 3, height: '100%' }}>
    <Typography variant="h6" gutterBottom>Active Users</Typography>
    {/* Add active users content */}
  </Paper>
);

const SystemHealth = () => (
  <Paper sx={{ p: 3, height: '100%' }}>
    <Typography variant="h6" gutterBottom>System Health</Typography>
    {/* Add system health content */}
  </Paper>
);

const QuickActions = () => (
  <Paper sx={{ p: 3, height: '100%' }}>
    <Typography variant="h6" gutterBottom>Quick Actions</Typography>
    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
      <Button
        component={RouterLink}
        to="/admin/books"
        variant="contained"
        startIcon={<BooksIcon />}
      >
        Manage Books
      </Button>
    </Box>
  </Paper>
);

const AdminDashboard = () => {
  const { currentUser } = useAuth();

  return (
    <Box
      component="main"
      sx={{
        flexGrow: 1,
        py: 4
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <DashboardStats isAdmin />
          </Grid>
          
          <Grid item xs={12}>
            <QuickActions />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <SystemOverview />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <ActiveUsers />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <SystemHealth />
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
