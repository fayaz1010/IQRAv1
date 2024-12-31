import { useEffect, useState } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
} from '@mui/material';
import {
  People as PeopleIcon,
  School as SchoolIcon,
  Assessment as AssessmentIcon,
  Warning as WarningIcon,
  Check as CheckIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    activeUsers: 0,
    activeClasses: 0,
    pendingApprovals: 0,
    systemHealth: 'Good',
  });
  const [pendingTeachers, setPendingTeachers] = useState([]);

  useEffect(() => {
    // TODO: Fetch admin dashboard data from Firebase
    // This is placeholder data
    setStats({
      activeUsers: 150,
      activeClasses: 25,
      pendingApprovals: 5,
      systemHealth: 'Good',
    });
    setPendingTeachers([
      { id: 1, name: 'John Doe', email: 'john@example.com', qualification: 'Masters in Arabic' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com', qualification: 'Islamic Studies' },
    ]);
  }, []);

  const StatCard = ({ title, value, icon, color }) => (
    <Card
      component={motion.div}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          {icon}
          <Typography variant="h6" sx={{ ml: 1 }}>
            {title}
          </Typography>
        </Box>
        <Typography variant="h4" color={color}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );

  const handleApprove = (teacherId) => {
    // TODO: Implement teacher approval
    console.log('Approve teacher:', teacherId);
  };

  const handleReject = (teacherId) => {
    // TODO: Implement teacher rejection
    console.log('Reject teacher:', teacherId);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Admin Dashboard</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AssessmentIcon />}
          onClick={() => {/* TODO: Open system reports */}}
        >
          System Reports
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Stats */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Users"
            value={stats.activeUsers}
            icon={<PeopleIcon color="primary" />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Classes"
            value={stats.activeClasses}
            icon={<SchoolIcon color="secondary" />}
            color="secondary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Pending Approvals"
            value={stats.pendingApprovals}
            icon={<AssessmentIcon color="warning" />}
            color="warning"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="System Health"
            value={stats.systemHealth}
            icon={<WarningIcon color="success" />}
            color="success"
          />
        </Grid>

        {/* Pending Approvals */}
        <Grid item xs={12}>
          <Paper
            sx={{ p: 2 }}
            component={motion.div}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Typography variant="h6" gutterBottom>
              Pending Teacher Approvals
            </Typography>
            <List>
              {pendingTeachers.map((teacher) => (
                <ListItem key={teacher.id}>
                  <ListItemText
                    primary={teacher.name}
                    secondary={`${teacher.email} - ${teacher.qualification}`}
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      aria-label="approve"
                      onClick={() => handleApprove(teacher.id)}
                      color="success"
                      sx={{ mr: 1 }}
                    >
                      <CheckIcon />
                    </IconButton>
                    <IconButton
                      edge="end"
                      aria-label="reject"
                      onClick={() => handleReject(teacher.id)}
                      color="error"
                    >
                      <CloseIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default AdminDashboard;
