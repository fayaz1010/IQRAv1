import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Avatar,
  Button,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  School as SchoolIcon,
  Book as BookIcon,
  Assignment as AssignmentIcon,
  Timeline as TimelineIcon,
  PlayArrow as JoinIcon,
  AccessTime as TimeIcon,
  PlayCircle as PlayCircleIcon
} from '@mui/icons-material';
import { collection, query, where, getDocs, onSnapshot, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { format, isToday, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const StudentDashboard = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    activeClasses: 0,
    totalProgress: 0,
    todayClasses: 0,
    pendingAssignments: 0,
    activeSessions: 0
  });
  const [activeSessions, setActiveSessions] = useState([]);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const fetchActiveSessions = async () => {
      try {
        console.log('Fetching active sessions for student:', currentUser.uid);
        setError(null);
        
        const sessionsQuery = query(
          collection(db, 'sessions'),
          where('studentIds', 'array-contains', currentUser.uid),
          where('status', '==', 'active'),
          orderBy('startTime', 'desc')
        );

        const snapshot = await getDocs(sessionsQuery);
        console.log('Found active sessions:', snapshot.size);
        
        const sessions = snapshot.docs.map(doc => {
          const data = doc.data();
          let startTime;
          
          try {
            if (data.startTime?.toDate) {
              startTime = data.startTime.toDate();
            } else if (typeof data.startTime === 'string') {
              startTime = new Date(data.startTime);
            } else {
              startTime = new Date();
            }
            
            // Validate the date
            if (isNaN(startTime.getTime())) {
              console.warn('Invalid date detected, using current time');
              startTime = new Date();
            }
          } catch (err) {
            console.warn('Error parsing date:', err);
            startTime = new Date();
          }
            
          return {
            id: doc.id,
            ...data,
            startTime,
            title: data.title || `Session ${doc.id.slice(0, 4)}`
          };
        });
        
        setActiveSessions(sessions);
        setStats(prev => ({ ...prev, activeSessions: sessions.length }));
      } catch (error) {
        console.error('Error fetching active sessions:', error);
        setError('Failed to load active sessions. Please try refreshing the page.');
      } finally {
        setLoading(false);
      }
    };

    fetchActiveSessions();
  }, [currentUser]);

  const formatSessionTime = (date) => {
    try {
      return format(date, 'h:mm a');
    } catch (err) {
      console.warn('Error formatting date:', err);
      return 'Time unavailable';
    }
  };

  const renderActiveSessions = () => (
    <Grid item xs={12}>
      <Paper elevation={3} sx={{ p: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">
            Active Sessions ({activeSessions.length})
          </Typography>
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {!error && activeSessions.length === 0 ? (
          <Typography color="textSecondary">No active sessions available</Typography>
        ) : (
          <Grid container spacing={2}>
            {activeSessions.map((session) => (
              <Grid item xs={12} key={session.id}>
                <Card>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography variant="h6">{session.title}</Typography>
                        <Typography color="textSecondary">
                          Started at {formatSessionTime(session.startTime)}
                        </Typography>
                      </Box>
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<PlayCircleIcon />}
                        onClick={() => navigate(`/session/${session.id}`, {
                          state: { 
                            sessionId: session.id,
                            mode: 'student'
                          }
                        })}
                      >
                        Join Session
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Paper>
    </Grid>
  );

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
        Welcome back, {currentUser?.displayName || 'Student'}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Stats Cards */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={3} sx={{ p: 2 }}>
            <Box display="flex" alignItems="center" mb={1}>
              <SchoolIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6">Active Classes</Typography>
            </Box>
            <Typography variant="h4">{stats.activeClasses}</Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={3} sx={{ p: 2 }}>
            <Box display="flex" alignItems="center" mb={1}>
              <TimelineIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6">Progress</Typography>
            </Box>
            <Typography variant="h4">{stats.totalProgress}%</Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={3} sx={{ p: 2 }}>
            <Box display="flex" alignItems="center" mb={1}>
              <TimeIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6">Today's Classes</Typography>
            </Box>
            <Typography variant="h4">{stats.todayClasses}</Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={3} sx={{ p: 2 }}>
            <Box display="flex" alignItems="center" mb={1}>
              <AssignmentIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6">Pending Tasks</Typography>
            </Box>
            <Typography variant="h4">{stats.pendingAssignments}</Typography>
          </Paper>
        </Grid>

        {/* Active Sessions Section */}
        {renderActiveSessions()}
      </Grid>
    </Container>
  );
};

export default StudentDashboard;
