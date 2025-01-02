import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Avatar,
  Card,
  CardContent,
  IconButton,
  useTheme,
} from '@mui/material';
import { Settings as SettingsIcon, Person as PersonIcon } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';

const StatCard = ({ title, value, icon, color }) => {
  const theme = useTheme();
  
  return (
    <Card
      component={motion.div}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      sx={{
        height: '100%',
        background: `linear-gradient(45deg, ${color}88 30%, ${color}44 90%)`,
        color: theme.palette.mode === 'dark' ? '#fff' : '#000',
      }}
    >
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h6" component="div">
              {title}
            </Typography>
            <Typography variant="h4">{value}</Typography>
          </Box>
          {icon}
        </Box>
      </CardContent>
    </Card>
  );
};

const Dashboard = () => {
  const theme = useTheme();
  const { currentUser } = useAuth();
  const [stats, setStats] = useState({
    progress: 0,
    classesToday: 0,
    nextClass: 'No classes',
    assignments: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Fetch today's classes
        const classesRef = collection(db, 'classes');
        const todayQuery = query(
          classesRef,
          where('teacherId', '==', currentUser.uid),
          where('startTime', '>=', today.toISOString()),
          where('startTime', '<', tomorrow.toISOString())
        );
        
        const todaySnapshot = await getDocs(todayQuery);
        const classesToday = todaySnapshot.size;

        // Fetch next class
        const nextClassQuery = query(
          classesRef,
          where('teacherId', '==', currentUser.uid),
          where('startTime', '>=', new Date().toISOString())
        );
        
        const nextClassSnapshot = await getDocs(nextClassQuery);
        let nextClass = 'No classes';
        if (!nextClassSnapshot.empty) {
          const nextClassData = nextClassSnapshot.docs[0].data();
          nextClass = new Date(nextClassData.startTime).toLocaleTimeString();
        }

        // Fetch assignments
        const assignmentsRef = collection(db, 'assignments');
        const assignmentsQuery = query(
          assignmentsRef,
          where('teacherId', '==', currentUser.uid),
          where('status', '==', 'pending')
        );
        
        const assignmentsSnapshot = await getDocs(assignmentsQuery);
        const assignments = assignmentsSnapshot.size;

        setStats({
          progress: Math.round((classesToday / (classesToday + assignments)) * 100) || 0,
          classesToday,
          nextClass,
          assignments,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    if (currentUser) {
      fetchStats();
    }
  }, [currentUser]);

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4, minHeight: '100vh' }}>
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={3}>
          {/* Profile Section */}
          <Grid item xs={12}>
            <Paper 
              sx={{ 
                p: 2, 
                display: 'flex', 
                alignItems: 'center',
                backgroundColor: theme.palette.background.paper,
                color: theme.palette.text.primary,
              }}
            >
              <Avatar 
                sx={{ 
                  width: 56, 
                  height: 56, 
                  bgcolor: theme.palette.primary.main,
                  color: theme.palette.primary.contrastText,
                }}
              >
                {currentUser?.email?.[0]?.toUpperCase() || 'U'}
              </Avatar>
              <Box sx={{ ml: 2, flex: 1 }}>
                <Typography variant="h5">{currentUser?.email}</Typography>
                <Typography variant="subtitle1" color="textSecondary">
                  Teacher
                </Typography>
              </Box>
              <IconButton>
                <SettingsIcon />
              </IconButton>
            </Paper>
          </Grid>

          {/* Stats Cards */}
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Progress"
              value={`${stats.progress}%`}
              icon={<PersonIcon sx={{ fontSize: 40 }} />}
              color={theme.palette.primary.main}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Classes Today"
              value={stats.classesToday}
              icon={<PersonIcon sx={{ fontSize: 40 }} />}
              color={theme.palette.secondary.main}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Next Class"
              value={stats.nextClass}
              icon={<PersonIcon sx={{ fontSize: 40 }} />}
              color={theme.palette.success.main}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Assignments"
              value={stats.assignments}
              icon={<PersonIcon sx={{ fontSize: 40 }} />}
              color={theme.palette.warning.main}
            />
          </Grid>

          {/* Schedule Section */}
          <Grid item xs={12} md={6}>
            <Paper
              sx={{
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                minHeight: 240,
                backgroundColor: theme.palette.background.paper,
                color: theme.palette.text.primary,
              }}
            >
              <Typography variant="h6" gutterBottom>
                Today's Schedule
              </Typography>
              {/* Add schedule content here */}
            </Paper>
          </Grid>

          {/* Upcoming Classes Section */}
          <Grid item xs={12} md={6}>
            <Paper
              sx={{
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                minHeight: 240,
                backgroundColor: theme.palette.background.paper,
                color: theme.palette.text.primary,
              }}
            >
              <Typography variant="h6" gutterBottom>
                Upcoming Classes
              </Typography>
              {/* Add upcoming classes content here */}
            </Paper>
          </Grid>

          {/* Student Progress Section */}
          <Grid item xs={12}>
            <Paper
              sx={{
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                minHeight: 240,
                backgroundColor: theme.palette.background.paper,
                color: theme.palette.text.primary,
              }}
            >
              <Typography variant="h6" gutterBottom>
                Student Progress
              </Typography>
              {/* Add student progress content here */}
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default Dashboard;
