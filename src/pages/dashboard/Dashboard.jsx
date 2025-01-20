import { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Grid, 
  Paper, 
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Stack,
  CircularProgress,
  Alert
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import DashboardStats from '../../components/dashboard/DashboardStats';
import { VideoCall as VideoCallIcon } from '@mui/icons-material';
import { useSession } from '../../features/iqra/contexts/SessionContext';
import { SessionProvider } from '../../features/iqra/contexts/SessionContext';
import { db } from '../../config/firebase';
import { collection, query, where, getDocs, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { format } from 'date-fns';

// Components for each section
const LearningProgress = () => (
  <Paper sx={{ p: 3, height: '100%' }}>
    <Typography variant="h6" gutterBottom>Learning Progress</Typography>
    {/* Add learning progress content */}
  </Paper>
);

const UpcomingClasses = () => {
  const { currentUser } = useAuth();
  const { joinSession } = useSession();
  const [classes, setClasses] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!currentUser) return;

    // Listen for all active sessions
    const sessionsRef = collection(db, 'sessions');
    const activeSessionsQuery = query(
      sessionsRef,
      where('status', '==', 'active'),
      where('studentIds', 'array-contains', currentUser.uid)
    );

    const unsubscribe = onSnapshot(activeSessionsQuery, async (snapshot) => {
      const sessions = [];
      for (const doc of snapshot.docs) {
        const sessionData = doc.data();
        // Get class details
        const classRef = doc(db, 'classes', sessionData.classId);
        const classDoc = await getDoc(classRef);
        if (classDoc.exists()) {
          const classData = classDoc.data();
          sessions.push({
            id: doc.id,
            classId: sessionData.classId,
            className: classData.name,
            ...sessionData
          });
        }
      }
      setActiveSessions(sessions);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching active sessions:', error);
      setError('Failed to load active sessions');
      setLoading(false);
    });

    // Also fetch scheduled classes
    const fetchScheduledClasses = async () => {
      try {
        const classesRef = collection(db, 'classes');
        const q = query(classesRef, where('studentIds', 'array-contains', currentUser.uid));
        const querySnapshot = await getDocs(q);
        const fetchedClasses = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setClasses(fetchedClasses);
      } catch (error) {
        console.error('Error fetching scheduled classes:', error);
        setError('Failed to load scheduled classes');
      }
    };

    fetchScheduledClasses();
    return () => unsubscribe();
  }, [currentUser]);

  const handleJoinSession = async (session) => {
    try {
      await joinSession(session.id);
      
      // Open Google Meet if available
      if (session.meet?.link) {
        window.open(session.meet.link, '_blank');
      }
    } catch (error) {
      console.error('Error joining session:', error);
      setError('Failed to join session');
    }
  };

  // Combine active sessions and scheduled classes
  const renderList = () => {
    return (
      <List>
        {/* Show active sessions first */}
        {activeSessions.map((session) => (
          <ListItem
            key={session.id}
            sx={{
              mb: 1,
              borderRadius: 1,
              bgcolor: 'action.selected',
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {session.className}
                  <Chip
                    size="small"
                    color="success"
                    label="Active Now"
                  />
                </Box>
              }
              secondary={
                <Stack direction="column" spacing={1}>
                  <Typography variant="body2">
                    Started at {format(new Date(session.startTime), 'hh:mm a')}
                  </Typography>
                  {session.meet?.link && (
                    <Chip
                      size="small"
                      icon={<VideoCallIcon />}
                      label="Meet Available"
                      color="primary"
                      variant="outlined"
                    />
                  )}
                </Stack>
              }
            />
            <ListItemSecondaryAction>
              <Button
                variant="contained"
                color="primary"
                onClick={() => handleJoinSession(session)}
                startIcon={<VideoCallIcon />}
              >
                Join Now
              </Button>
            </ListItemSecondaryAction>
          </ListItem>
        ))}

        {/* Then show scheduled classes */}
        {classes
          .filter(classItem => !activeSessions.some(s => s.classId === classItem.id))
          .map((classItem) => (
            <ListItem
              key={classItem.id}
              sx={{
                mb: 1,
                borderRadius: 1,
                bgcolor: 'background.paper',
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <ListItemText
                primary={classItem.name}
                secondary={
                  <Typography variant="body2">
                    {format(new Date(classItem.startTime), 'EEEE, MMM dd - hh:mm a')}
                  </Typography>
                }
              />
              <ListItemSecondaryAction>
                <Chip
                  label={format(new Date(classItem.startTime), 'hh:mm a')}
                  variant="outlined"
                />
              </ListItemSecondaryAction>
            </ListItem>
          ))}
      </List>
    );
  };

  return (
    <Paper sx={{ p: 3, height: '100%' }}>
      <Typography variant="h6" gutterBottom>Classes</Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      )}
      
      {loading ? (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress />
        </Box>
      ) : activeSessions.length > 0 || classes.length > 0 ? (
        renderList()
      ) : (
        <Typography color="text.secondary">
          No classes available.
        </Typography>
      )}
    </Paper>
  );
};

const RecentActivities = () => (
  <Paper sx={{ p: 3, height: '100%' }}>
    <Typography variant="h6" gutterBottom>Recent Activities</Typography>
    {/* Add recent activities content */}
  </Paper>
);

const Dashboard = () => {
  const { currentUser } = useAuth();

  return (
    <SessionProvider>
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
              <DashboardStats />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <LearningProgress />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <UpcomingClasses />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <RecentActivities />
            </Grid>
          </Grid>
        </Container>
      </Box>
    </SessionProvider>
  );
};

export default Dashboard;
