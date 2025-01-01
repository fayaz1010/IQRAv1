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
  Snackbar,
  Alert,
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
import { collection, query, where, getDocs, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';

const AdminDashboard = () => {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState({
    activeUsers: 0,
    activeClasses: 0,
    pendingApprovals: 0,
    systemHealth: 'Good',
  });
  const [pendingTeachers, setPendingTeachers] = useState([]);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'success' });

  // Fetch dashboard data
  useEffect(() => {
    if (!currentUser?.role === 'admin') return;

    // Listen for changes in pending teachers
    const pendingTeachersQuery = query(
      collection(db, 'users'),
      where('role', '==', 'teacher'),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(pendingTeachersQuery, (snapshot) => {
      const teachersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPendingTeachers(teachersData);
      setStats(prev => ({ ...prev, pendingApprovals: teachersData.length }));
    }, (error) => {
      console.error('Error fetching pending teachers:', error);
      setAlert({
        open: true,
        message: 'Error fetching pending teachers',
        severity: 'error'
      });
    });

    // Fetch other stats
    const fetchStats = async () => {
      try {
        // Get all active users
        const usersQuery = query(
          collection(db, 'users'),
          where('status', '==', 'active')
        );
        const usersSnapshot = await getDocs(usersQuery);
        const totalUsers = usersSnapshot.size;

        // Get active classes
        const classesQuery = query(
          collection(db, 'classes'),
          where('status', '==', 'active')
        );
        const classesSnapshot = await getDocs(classesQuery);
        const totalClasses = classesSnapshot.size;

        // Update stats
        setStats(prev => ({
          ...prev,
          activeUsers: totalUsers,
          activeClasses: totalClasses,
        }));
      } catch (error) {
        console.error('Error fetching stats:', error);
        setAlert({
          open: true,
          message: 'Error fetching dashboard statistics',
          severity: 'error'
        });
      }
    };

    fetchStats();
    return () => unsubscribe();
  }, [currentUser]);

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

  const handleApprove = async (teacherId) => {
    try {
      const teacherRef = doc(db, 'users', teacherId);
      await updateDoc(teacherRef, {
        status: 'active'
      });
      setAlert({
        open: true,
        message: 'Teacher approved successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error approving teacher:', error);
      setAlert({
        open: true,
        message: 'Error approving teacher',
        severity: 'error'
      });
    }
  };

  const handleReject = async (teacherId) => {
    try {
      const teacherRef = doc(db, 'users', teacherId);
      await updateDoc(teacherRef, {
        status: 'rejected'
      });
      setAlert({
        open: true,
        message: 'Teacher rejected',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error rejecting teacher:', error);
      setAlert({
        open: true,
        message: 'Error rejecting teacher',
        severity: 'error'
      });
    }
  };

  const handleCloseAlert = () => {
    setAlert(prev => ({ ...prev, open: false }));
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
                    primary={teacher.email}
                    secondary={`Role: ${teacher.role} - Status: ${teacher.status}`}
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
              {pendingTeachers.length === 0 && (
                <ListItem>
                  <ListItemText primary="No pending teacher approvals" />
                </ListItem>
              )}
            </List>
          </Paper>
        </Grid>
      </Grid>

      <Snackbar 
        open={alert.open} 
        autoHideDuration={6000} 
        onClose={handleCloseAlert}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseAlert} severity={alert.severity}>
          {alert.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default AdminDashboard;
