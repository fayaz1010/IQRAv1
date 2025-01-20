import { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  Button,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  VideoCall as VideoCallIcon,
  Event as EventIcon,
} from '@mui/icons-material';
import { useAuth } from '../../../../contexts/AuthContext';
import { collection, query, where, getDocs, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../../../../config/firebase';
import { format } from 'date-fns';
import { useSession } from '../../contexts/SessionContext';

const ScheduleView = ({ compact = false }) => {
  const { user, userRole } = useAuth();
  const { joinSession } = useSession();
  const [classes, setClasses] = useState([]);
  const [activeSessions, setActiveSessions] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const classesRef = collection(db, 'classes');
        let q;
        
        if (userRole === 'student') {
          q = query(classesRef, where('studentIds', 'array-contains', user.uid));
        } else if (userRole === 'teacher') {
          q = query(classesRef, where('teacherId', '==', user.uid));
        }

        const querySnapshot = await getDocs(q);
        const fetchedClasses = [];
        
        // Set up listeners for active sessions
        querySnapshot.forEach((classDoc) => {
          const classData = classDoc.data();
          fetchedClasses.push({ id: classDoc.id, ...classData });
          
          // Listen for active session updates
          onSnapshot(doc(db, 'classes', classDoc.id), async (updatedDoc) => {
            const updatedData = updatedDoc.data();
            if (updatedData.activeSession) {
              // Fetch session details
              const sessionRef = doc(db, 'sessions', updatedData.activeSession);
              const sessionDoc = await getDoc(sessionRef);
              
              if (sessionDoc.exists()) {
                const sessionData = sessionDoc.data();
                setActiveSessions(prev => ({
                  ...prev,
                  [classDoc.id]: {
                    id: sessionDoc.id,
                    ...sessionData
                  }
                }));
              }
            } else {
              // Remove session if it's no longer active
              setActiveSessions(prev => {
                const updated = { ...prev };
                delete updated[classDoc.id];
                return updated;
              });
            }
          });
        });

        // Sort classes by start time
        fetchedClasses.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
        setClasses(fetchedClasses);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching classes:', error);
        setError('Failed to load classes');
        setLoading(false);
      }
    };

    if (user) {
      fetchClasses();
    }
  }, [user, userRole]);

  const handleJoinSession = async (classId, sessionData) => {
    try {
      await joinSession(sessionData.id);
      
      // Open Google Meet if available
      if (sessionData.meet?.link) {
        window.open(sessionData.meet.link, '_blank');
      }
    } catch (error) {
      console.error('Error joining session:', error);
      setError('Failed to join session');
    }
  };

  const renderClassItem = (classItem) => {
    const activeSession = activeSessions[classItem.id];
    const isActive = !!activeSession;

    return (
      <ListItem
        key={classItem.id}
        sx={{
          mb: 1,
          borderRadius: 1,
          bgcolor: isActive ? 'action.selected' : 'background.paper',
          '&:hover': { bgcolor: 'action.hover' },
        }}
      >
        <ListItemText
          primary={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {classItem.name}
              {isActive && (
                <Chip
                  size="small"
                  color="success"
                  label="Active Now"
                />
              )}
            </Box>
          }
          secondary={
            <>
              {format(new Date(classItem.startTime), 'MMM dd, yyyy hh:mm a')}
              {classItem.description && (
                <Typography variant="body2" color="text.secondary">
                  {classItem.description}
                </Typography>
              )}
              {isActive && activeSession.meet?.link && (
                <Chip
                  size="small"
                  icon={<VideoCallIcon />}
                  label="Meet Available"
                  color="primary"
                  variant="outlined"
                  sx={{ mt: 1 }}
                />
              )}
            </>
          }
        />
        <ListItemSecondaryAction>
          {isActive ? (
            <Button
              variant="contained"
              color="primary"
              onClick={() => handleJoinSession(classItem.id, activeSession)}
              startIcon={<VideoCallIcon />}
            >
              Join Now
            </Button>
          ) : (
            <Chip
              label={format(new Date(classItem.startTime), 'hh:mm a')}
              variant="outlined"
            />
          )}
        </ListItemSecondaryAction>
      </ListItem>
    );
  };

  return (
    <Box>
      {!compact && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Class Schedule</Typography>
          <Button
            variant="outlined"
            startIcon={<EventIcon />}
            onClick={() => window.open('/schedule', '_blank')}
          >
            View Full Calendar
          </Button>
        </Box>
      )}
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      )}
      
      {loading ? (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress />
        </Box>
      ) : classes.length > 0 ? (
        <List sx={{ width: '100%' }}>
          {classes.map(renderClassItem)}
        </List>
      ) : (
        <Typography color="text.secondary">
          No upcoming classes scheduled.
        </Typography>
      )}
    </Box>
  );
};

export default ScheduleView;
