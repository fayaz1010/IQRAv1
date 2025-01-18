import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  IconButton,
  Divider,
  useTheme,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Tooltip,
  Badge
} from '@mui/material';
import {
  PlayArrow as StartIcon,
  Schedule as ScheduleIcon,
  Group as StudentsIcon,
  Book as BookIcon,
  Assignment as AssignmentIcon,
  Notifications as NotificationIcon,
  Timeline as TimelineIcon,
  VideoCall as VideoIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import TeachingPanel from './components/TeachingPanel';
import ScheduleTimeline from './components/ScheduleTimeline';
import StudentProgressGrid from './components/StudentProgressGrid';
import QuickActions from './components/QuickActions';
import TeachingStats from './components/TeachingStats';

const TeacherDashboard = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  // State for live teaching data
  const [activeSessions, setActiveSessions] = useState([]);
  const [todayClasses, setTodayClasses] = useState([]);
  const [studentProgress, setStudentProgress] = useState({});
  const [teachingStats, setTeachingStats] = useState({
    totalClassesToday: 0,
    completedClasses: 0,
    upcomingClasses: 0,
    activeStudents: 0
  });

  // Listen for active sessions
  useEffect(() => {
    if (!currentUser?.uid) return;

    const now = new Date();
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));
    const endOfDay = new Date(now.setHours(23, 59, 59, 999));

    // Query for active sessions
    const sessionsQuery = query(
      collection(db, 'sessions'),
      where('teacherId', '==', currentUser.uid),
      where('status', '==', 'active')
    );

    // Query for today's classes
    const classesQuery = query(
      collection(db, 'classes'),
      where('teacherId', '==', currentUser.uid),
      where('schedule.nextSession', '>=', Timestamp.fromDate(startOfDay)),
      where('schedule.nextSession', '<=', Timestamp.fromDate(endOfDay))
    );

    // Subscribe to active sessions
    const unsubscribeSessions = onSnapshot(sessionsQuery, (snapshot) => {
      const sessions = [];
      snapshot.forEach((doc) => {
        sessions.push({ id: doc.id, ...doc.data() });
      });
      setActiveSessions(sessions);
    });

    // Subscribe to today's classes
    const unsubscribeClasses = onSnapshot(classesQuery, (snapshot) => {
      const classes = [];
      snapshot.forEach((doc) => {
        classes.push({ id: doc.id, ...doc.data() });
      });
      setTodayClasses(classes);
      
      // Update teaching stats
      const now = new Date();
      const stats = {
        totalClassesToday: classes.length,
        completedClasses: classes.filter(c => new Date(c.schedule.nextSession.toDate()) < now).length,
        upcomingClasses: classes.filter(c => new Date(c.schedule.nextSession.toDate()) > now).length,
        activeStudents: new Set(classes.flatMap(c => c.studentIds || [])).size
      };
      setTeachingStats(stats);
    });

    return () => {
      unsubscribeSessions();
      unsubscribeClasses();
    };
  }, [currentUser]);

  const handleStartSession = (classId) => {
    navigate(`/teaching/session/${classId}`);
  };

  const handleResumeSession = (sessionId) => {
    navigate(`/teaching/session/${sessionId}`);
  };

  return (
    <Box
      component="main"
      sx={{
        flexGrow: 1,
        py: 3,
        px: 2,
        backgroundColor: theme.palette.background.default
      }}
    >
      <Container maxWidth="xl">
        <Grid container spacing={3}>
          {/* Live Teaching Section */}
          <Grid item xs={12} md={8}>
            <TeachingPanel
              activeSessions={activeSessions}
              onResumeSession={handleResumeSession}
            />
          </Grid>

          {/* Quick Actions */}
          <Grid item xs={12} md={4}>
            <QuickActions
              stats={teachingStats}
              onStartSession={handleStartSession}
            />
          </Grid>

          {/* Today's Schedule Timeline */}
          <Grid item xs={12}>
            <ScheduleTimeline
              classes={todayClasses}
              onStartSession={handleStartSession}
            />
          </Grid>

          {/* Student Progress Grid */}
          <Grid item xs={12} md={8}>
            <StudentProgressGrid
              classes={todayClasses}
              activeSessions={activeSessions}
            />
          </Grid>

          {/* Teaching Stats */}
          <Grid item xs={12} md={4}>
            <TeachingStats stats={teachingStats} />
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default TeacherDashboard;
