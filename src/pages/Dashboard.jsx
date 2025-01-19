import React, { useEffect, useState } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  CardActionArea,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  CircularProgress,
  Alert,
  Tooltip,
} from '@mui/material';
import {
  School as SchoolIcon,
  Schedule as ScheduleIcon,
  Assignment as AssignmentIcon,
  TrendingUp as TrendingUpIcon,
  PlayCircle as PlayCircleIcon,
  VideoCameraFront as VideoCameraFrontIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { db } from '../config/firebase';
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc, Timestamp } from 'firebase/firestore';
import { format, addMinutes, isBefore, isAfter } from 'date-fns';
import { checkActiveSessions } from '../utils/checkActiveSessions';

const Dashboard = () => {
  const { currentUser: user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    activeClasses: 0,
    todayClasses: 0,
    nextClass: null,
    assignments: 0,
    progress: 0,
    activeSessions: 0
  });
  const [upcomingClasses, setUpcomingClasses] = useState([]);
  const [activeSession, setActiveSession] = useState(null);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      // Don't do anything while auth is loading
      if (authLoading) {
        console.log('Auth is still loading...');
        return;
      }

      // If no user, redirect to login
      if (!user) {
        console.log('No user found, redirecting to login...');
        navigate('/login', { replace: true });
        return;
      }

      // If not a student, redirect to appropriate dashboard
      if (user.role !== 'student') {
        console.log(`User is ${user.role}, redirecting to appropriate dashboard...`);
        navigate(`/${user.role}/dashboard`, { replace: true });
        return;
      }

      // Only fetch data if we're mounted and have a valid student user
      if (mounted && user.role === 'student') {
        console.log('Fetching dashboard data for student:', user.uid);
        await fetchDashboardData();
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, [user, authLoading]);

  const fetchDashboardData = async () => {
    try {
      console.log('Starting dashboard data fetch...');
      setLoading(true);
      setError(null);
      
      if (!user?.uid) {
        console.log('No user UID found');
        setLoading(false);
        return;
      }

      // First get all classes where student is enrolled
      console.log('Fetching enrolled classes...');
      const classesQuery = query(
        collection(db, 'classes'),
        where('studentIds', 'array-contains', user.uid)
      );
      const classesSnapshot = await getDocs(classesQuery);
      const classIds = classesSnapshot.docs.map(doc => doc.id);
      console.log('Found enrolled classes:', classIds);

      // Fetch active sessions for these classes
      console.log('Fetching active sessions...');
      const activeSessions = [];
      
      if (classIds.length > 0) {
        // Query sessions one class at a time to avoid complex queries
        for (const classId of classIds) {
          console.log('Checking sessions for class:', classId);
          const sessionsQuery = query(
            collection(db, 'sessions'),
            where('classId', '==', classId),
            where('status', '==', 'active')
          );
          
          const sessionsSnapshot = await getDocs(sessionsQuery);
          sessionsSnapshot.forEach(doc => {
            const sessionData = doc.data();
            if (sessionData.startTime && !sessionData.endTime) {
              // Find the corresponding class
              const classDoc = classesSnapshot.docs.find(c => c.id === sessionData.classId);
              if (classDoc) {
                const classData = classDoc.data();
                activeSessions.push({
                  id: doc.id,
                  ...sessionData,
                  className: classData.name
                });
              }
            }
          });
        }
      }
      
      console.log('Found active sessions:', activeSessions);
      setActiveSession(activeSessions.length > 0 ? activeSessions[0] : null);

      // Get today's date range
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

      // Fetch today's classes
      console.log('Fetching today\'s classes...');
      const todayClassesQuery = query(
        collection(db, 'classes'),
        where('studentIds', 'array-contains', user.uid),
        where('schedule.nextSession', '>=', Timestamp.fromDate(startOfDay)),
        where('schedule.nextSession', '<=', Timestamp.fromDate(endOfDay))
      );
      const todayClassesSnapshot = await getDocs(todayClassesQuery);
      const todayClasses = todayClassesSnapshot.docs.length;
      console.log('Found today\'s classes:', todayClasses);

      // Calculate progress
      let totalProgress = 0;
      let classCount = 0;
      for (const classDoc of classesSnapshot.docs) {
        const classData = classDoc.data();
        if (classData.studentProgress && classData.studentProgress[user.uid]) {
          totalProgress += classData.studentProgress[user.uid].progress || 0;
          classCount++;
        }
      }

      // Fetch pending assignments
      console.log('Fetching pending assignments...');
      const assignmentsQuery = query(
        collection(db, 'assignments'),
        where('studentId', '==', user.uid),
        where('status', '==', 'pending')
      );
      const assignmentsSnapshot = await getDocs(assignmentsQuery);
      console.log('Found pending assignments:', assignmentsSnapshot.docs.length);

      // Update stats
      setStats({
        activeClasses: classIds.length,
        todayClasses,
        assignments: assignmentsSnapshot.docs.length,
        progress: classCount > 0 ? Math.round(totalProgress / classCount) : 0,
        activeSessions: activeSessions.length
      });

      // Get upcoming classes
      console.log('Fetching upcoming classes...');
      const upcomingClassesQuery = query(
        collection(db, 'classes'),
        where('studentIds', 'array-contains', user.uid),
        where('schedule.nextSession', '>=', Timestamp.fromDate(now))
      );
      const upcomingClassesSnapshot = await getDocs(upcomingClassesQuery);
      
      // Map class data
      const upcomingClassesData = upcomingClassesSnapshot.docs
        .map(doc => {
          const classData = doc.data();
          return {
            id: doc.id,
            name: classData.name,
            schedule: classData.schedule,
            progress: classData.studentProgress?.[user.uid]?.progress || 0
          };
        })
        .sort((a, b) => {
          const aNext = a.schedule?.nextSession?.toDate() || new Date(9999, 11, 31);
          const bNext = b.schedule?.nextSession?.toDate() || new Date(9999, 11, 31);
          return aNext - bNext;
        })
        .slice(0, 5);

      setUpcomingClasses(upcomingClassesData);
      
      setLoading(false);
      console.log('Dashboard data fetch complete');
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError(error.message);
      setLoading(false);
    }
  };

  const handleCheckActiveSessions = async () => {
    console.log('Checking for active sessions...');
    const sessions = await checkActiveSessions(user.uid);
    console.log('Active sessions:', sessions);
  };

  const DashboardCard = ({ title, icon, value, color }) => (
    <Card
      component={motion.div}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      sx={{ height: '100%' }}
    >
      <CardActionArea sx={{ height: '100%' }}>
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
      </CardActionArea>
    </Card>
  );

  const handleJoinSession = (classId, sessionId) => {
    navigate(`/classes/iqra/${classId}/sessions/${sessionId}`);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Welcome back, {user?.displayName || 'Student'}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {activeSession && (
        <Paper sx={{ p: 3, mb: 3, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
          <Grid container alignItems="center" spacing={2}>
            <Grid item xs={12} sm={8}>
              <Typography variant="h6">
                Active Class Session: {activeSession.className}
              </Typography>
              <Typography variant="body1" sx={{ mt: 1 }}>
                Your teacher is waiting for you!
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4} sx={{ textAlign: 'right' }}>
              <Button
                variant="contained"
                color="secondary"
                startIcon={<VideoCameraFrontIcon />}
                onClick={() => handleJoinSession(activeSession.classId, activeSession.sessionId)}
                sx={{ mt: { xs: 2, sm: 0 } }}
              >
                Join Now
              </Button>
            </Grid>
          </Grid>
        </Paper>
      )}

      <Grid container spacing={3}>
        {/* Stats Cards */}
        <Grid item xs={12} sm={6} md={3}>
          <DashboardCard
            title="Progress"
            icon={<TrendingUpIcon color="primary" />}
            value={`${stats.progress}%`}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <DashboardCard
            title="Active Classes"
            icon={<SchoolIcon color="secondary" />}
            value={stats.activeClasses}
            color="secondary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <DashboardCard
            title="Today's Classes"
            icon={<ScheduleIcon color="success" />}
            value={stats.todayClasses}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <DashboardCard
            title="Pending Assignments"
            icon={<AssignmentIcon color="warning" />}
            value={stats.assignments}
            color="warning"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <DashboardCard
            title="Active Sessions"
            icon={<VideoCameraFrontIcon color="info" />}
            value={stats.activeSessions}
            color="info"
          />
        </Grid>

        {/* Upcoming Classes */}
        <Grid item xs={12} md={6}>
          <Paper
            component={motion.div}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            sx={{ p: 2, height: '100%' }}
          >
            <Typography variant="h6" gutterBottom>
              <Box display="flex" alignItems="center" gap={1}>
                <ScheduleIcon color="primary" />
                Upcoming Classes
              </Box>
            </Typography>
            {loading ? (
              <Box display="flex" justifyContent="center" p={3}>
                <CircularProgress />
              </Box>
            ) : error ? (
              <Alert severity="error">{error}</Alert>
            ) : upcomingClasses.length > 0 ? (
              <List>
                {upcomingClasses.map((classItem, index) => (
                  <React.Fragment key={classItem.id}>
                    <ListItem>
                      <ListItemText
                        primary={classItem.name}
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              {format(classItem.schedule.nextSession.toDate(), 'EEEE, MMMM d')}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {format(classItem.schedule.nextSession.toDate(), 'HH:mm')}
                            </Typography>
                          </Box>
                        }
                      />
                      {classItem.schedule?.meetLink && (
                        <ListItemSecondaryAction>
                          <Button
                            startIcon={<VideoCameraFrontIcon />}
                            href={classItem.schedule.meetLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            size="small"
                          >
                            Join
                          </Button>
                        </ListItemSecondaryAction>
                      )}
                    </ListItem>
                    {index < upcomingClasses.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            ) : (
              <Typography color="text.secondary" align="center" sx={{ py: 2 }}>
                No upcoming classes scheduled
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Practice Area */}
        <Grid item xs={12} md={6}>
          <Paper
            component={motion.div}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            sx={{ p: 2, height: '100%' }}
          >
            <Typography variant="h6" gutterBottom>
              <Box display="flex" alignItems="center" gap={1}>
                <PlayCircleIcon color="primary" />
                Practice Area
              </Box>
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<PlayCircleIcon />}
                fullWidth
                onClick={() => navigate('/practice')}
                sx={{ mb: 2 }}
              >
                Start Practice Session
              </Button>
              <Typography variant="body2" color="text.secondary">
                Practice your lessons anytime using our interactive canvas. Your progress will be saved automatically.
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard;
