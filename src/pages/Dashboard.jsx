import { useEffect, useState } from 'react';
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
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { format } from 'date-fns';

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
      const classes = classesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log('Found classes:', classes.length);

      // If no classes found, set empty state and return
      if (classes.length === 0) {
        console.log('No classes found, setting empty state');
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
      console.log('Fetching schedules...');
      const today = new Date();
      const scheduleQuery = query(
        collection(db, 'schedules'),
        where('classId', 'in', classes.map(c => c.id)),
        where('date', '>=', today.toISOString().split('T')[0]),
        orderBy('date'),
        orderBy('startTime'),
        limit(5)
      );
      const scheduleSnapshot = await getDocs(scheduleQuery);
      const schedules = scheduleSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        className: classes.find(c => c.id === doc.data().classId)?.name || 'Unknown Class'
      }));
      console.log('Found schedules:', schedules.length);

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

      // Calculate stats
      console.log('Calculating stats...');
      const todayClasses = schedules.filter(s => 
        s.date === today.toISOString().split('T')[0]
      ).length;

      const nextClass = schedules[0];

      // Fetch assignments
      console.log('Fetching assignments...');
      let assignmentsCount = 0;
      try {
        const assignmentsQuery = query(
          collection(db, 'assignments'),
          where('classId', 'in', classes.map(c => c.id)),
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
        activeClasses: classes.length,
        todayClasses,
        nextClass,
        assignments: assignmentsCount,
        progress: calculateOverallProgress(classes)
      });

      setUpcomingClasses(schedules);
      console.log('Dashboard data fetch complete');
      setLoading(false);
    } catch (err) {
      console.error('Error in fetchDashboardData:', err);
      setError('Failed to load dashboard data. Please try again.');
      setLoading(false);
    }
  };

  const calculateOverallProgress = (classes) => {
    if (classes.length === 0) return 0;
    const totalProgress = classes.reduce((sum, cls) => {
      const studentProgress = cls.studentProgress?.[user.uid] || 0;
      return sum + studentProgress;
    }, 0);
    return Math.round(totalProgress / classes.length);
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
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Upcoming Classes
            </Typography>
            {upcomingClasses.length > 0 ? (
              <List>
                {upcomingClasses.map((cls, index) => (
                  <React.Fragment key={cls.id}>
                    <ListItem>
                      <ListItemText
                        primary={cls.className}
                        secondary={`${format(new Date(cls.date), 'MMM dd')} at ${cls.startTime}`}
                      />
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<PlayCircleIcon />}
                        onClick={() => navigate(`/classes/${cls.classId}`)}
                      >
                        View Class
                      </Button>
                    </ListItem>
                    {index < upcomingClasses.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            ) : (
              <Typography color="textSecondary">
                No upcoming classes scheduled
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Practice Area */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Practice Area
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<PlayCircleIcon />}
                fullWidth
                onClick={() => navigate('/classes/iqra/practice')}
                sx={{ mb: 2 }}
              >
                Start Practice Session
              </Button>
              <Typography variant="body2" color="textSecondary">
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
