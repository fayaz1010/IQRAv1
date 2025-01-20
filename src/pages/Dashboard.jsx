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
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { format, addMinutes, isBefore, isAfter } from 'date-fns';

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
    progress: 0
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
      
      console.log('Fetching classes for user:', user.uid);
      // Fetch classes where student is enrolled
      const classesQuery = query(
        collection(db, 'classes'),
        where('studentIds', 'array-contains', user.uid)
      );
      const classesSnapshot = await getDocs(classesQuery);
      const classIds = classesSnapshot.docs.map(doc => doc.id);
      
      console.log('Found classes for student:', classIds);
      
      if (classIds.length === 0) {
        setStats({
          activeClasses: 0,
          todayClasses: 0,
          nextClass: null,
          assignments: 0,
          progress: 0
        });
        setUpcomingClasses([]);
        setLoading(false);
        return;
      }

      // Fetch today's schedule
      console.log('Fetching sessions...');
      const today = new Date('2025-01-05T18:01:47+08:00'); // Using the provided current time
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      // First get all classes where student is enrolled
      const classesQuery2 = query(
        collection(db, 'classes'),
        where('studentIds', 'array-contains', user.uid)
      );
      const classesSnapshot2 = await getDocs(classesQuery2);
      const classIds2 = classesSnapshot2.docs.map(doc => doc.id);
      
      console.log('Found classes for student:', classIds2);
      
      if (classIds2.length === 0) {
        setStats({
          activeClasses: 0,
          todayClasses: 0,
          nextClass: null,
          assignments: 0,
          progress: 0
        });
        setUpcomingClasses([]);
        setLoading(false);
        return;
      }

      // Query sessions instead of schedules
      const sessionsRef = collection(db, 'sessions');
      const sessionsQuery = query(
        sessionsRef,
        where('classId', 'in', classIds2),
        where('date', '>=', startOfToday.toISOString()),
        where('status', '==', 'scheduled'),
        orderBy('date'),
        limit(10)
      );
      
      const sessionSnapshot = await getDocs(sessionsQuery);
      
      // Use a Map to keep only unique sessions by date/time
      const uniqueSessions = new Map();
      
      await Promise.all(sessionSnapshot.docs.map(async doc => {
        const sessionData = doc.data();
        const classDoc = classesSnapshot2.docs.find(c => c.id === sessionData.classId);
        const classData = classDoc?.data() || {};
        
        // Parse the session date
        const sessionDateTime = new Date(sessionData.date);
        const sessionKey = `${sessionData.classId}_${sessionDateTime.toISOString()}`;
        
        // Only keep the first occurrence of each unique session
        if (!uniqueSessions.has(sessionKey)) {
          uniqueSessions.set(sessionKey, {
            id: doc.id,
            ...sessionData,
            className: classData.name || 'Unknown Class',
            teacherName: classData.teacherName || 'Unknown Teacher',
            courseId: classData.courseId,
            meetLink: sessionData.meetLink || classData.meetLink,
            dateTime: sessionDateTime,
            startTime: format(sessionDateTime, 'HH:mm')
          });
        }
      }));
      
      // Convert Map to array and sort by date
      const sessions = Array.from(uniqueSessions.values())
        .sort((a, b) => a.dateTime - b.dateTime)
        .slice(0, 5) // Only take the first 5 sessions
        .map(session => {
          const now = new Date('2025-01-05T18:11:27+08:00'); // Using provided current time
          const sessionStart = new Date(session.date);
          const joinWindow = addMinutes(sessionStart, -15); // 15 mins before session
          const canJoin = isAfter(now, joinWindow) && isBefore(now, addMinutes(sessionStart, session.duration));
          
          return {
            ...session,
            canJoin
          };
        });
      
      console.log('Found unique sessions:', sessions);
      
      // Set upcoming classes with formatted dates and times
      setUpcomingClasses(sessions.map(session => ({
        ...session,
        formattedDate: format(session.dateTime, 'EEEE, MMMM d'),
        formattedTime: session.startTime
      })));

      // Calculate stats
      console.log('Calculating stats...');
      const todayClasses = sessions.filter(s => 
        s.dateTime.toDateString() === today.toDateString()
      ).length;

      const nextClass = sessions[0];

      // Fetch active sessions
      console.log('Checking for active sessions...');
      const activeSessionQuery = query(
        collection(db, 'classes'),
        where('studentIds', 'array-contains', user.uid),
        where('hasActiveSession', '==', true)
      );
      const activeSessionSnapshot = await getDocs(activeSessionQuery);
      const activeSessionClass = activeSessionSnapshot.docs[0];
      
      if (activeSessionClass) {
        console.log('Found active class, checking for active session...');
        const sessionsQuery = query(
          collection(db, `classes/${activeSessionClass.id}/sessions`),
          where('status', '==', 'active'),
          limit(1)
        );
        const sessionSnapshot = await getDocs(sessionsQuery);
        if (!sessionSnapshot.empty) {
          console.log('Found active session');
          setActiveSession({
            classId: activeSessionClass.id,
            className: activeSessionClass.data().name,
            sessionId: sessionSnapshot.docs[0].id,
            ...sessionSnapshot.docs[0].data()
          });
        }
      }

      // Fetch assignments
      console.log('Fetching assignments...');
      let assignmentsCount = 0;
      try {
        const assignmentsQuery = query(
          collection(db, 'assignments'),
          where('classId', 'in', classIds2),
          where('dueDate', '>=', today.toISOString())
        );
        const assignmentsSnapshot = await getDocs(assignmentsQuery);
        assignmentsCount = assignmentsSnapshot.size;
        console.log('Found assignments:', assignmentsCount);
      } catch (err) {
        console.warn('Error fetching assignments:', err);
        // Continue with 0 assignments instead of failing completely
      }

      console.log('Setting final stats...');
      setStats({
        activeClasses: classIds2.length,
        todayClasses,
        nextClass,
        assignments: assignmentsCount,
        progress: await calculateOverallProgress(classIds2)
      });

      console.log('Dashboard data fetch complete');
      setLoading(false);
    } catch (err) {
      console.error('Error in fetchDashboardData:', err);
      setError('Failed to load dashboard data. Please try again.');
      setLoading(false);
    }
  };

  const calculateOverallProgress = async (classIds) => {
    if (classIds.length === 0) return 0;
    
    let totalProgress = 0;
    for (const classId of classIds) {
      const classDoc = await getDoc(doc(db, 'classes', classId));
      if (classDoc.exists()) {
        const classData = classDoc.data();
        totalProgress += classData.studentProgress?.[user.uid] || 0;
      }
    }
    
    return Math.round(totalProgress / classIds.length);
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
      <Typography variant="h4" gutterBottom>
        Welcome back, {user?.displayName || user?.email}
      </Typography>

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
                        primary={classItem.className}
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              {classItem.formattedDate}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {classItem.formattedTime}
                            </Typography>
                          </Box>
                        }
                      />
                      {classItem.meetLink && (
                        <ListItemSecondaryAction>
                          <Tooltip title={
                            classItem.canJoin 
                              ? "Join the session now"
                              : "Join button will be enabled 15 minutes before the session starts"
                          }>
                            <span>
                              <Button
                                startIcon={<VideoCameraFrontIcon />}
                                href={classItem.meetLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                size="small"
                                disabled={!classItem.canJoin}
                                sx={{
                                  opacity: classItem.canJoin ? 1 : 0.6,
                                  '&.Mui-disabled': {
                                    color: 'text.disabled',
                                    backgroundColor: 'action.disabledBackground',
                                  }
                                }}
                              >
                                Join
                              </Button>
                            </span>
                          </Tooltip>
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
