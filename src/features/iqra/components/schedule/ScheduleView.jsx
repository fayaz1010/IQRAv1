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
} from '@mui/material';
import {
  VideoCall as VideoCallIcon,
  Event as EventIcon,
} from '@mui/icons-material';
import { useAuth } from '../../../../contexts/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../../config/firebase';
import { format } from 'date-fns';

const ScheduleView = ({ compact = false }) => {
  const { user, userRole } = useAuth();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

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
        querySnapshot.forEach((doc) => {
          fetchedClasses.push({ id: doc.id, ...doc.data() });
        });

        // Sort classes by start time
        fetchedClasses.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
        setClasses(fetchedClasses);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching classes:', error);
        setLoading(false);
      }
    };

    fetchClasses();
  }, [user, userRole]);

  const renderClassItem = (classItem) => (
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
        primary={classItem.title}
        secondary={
          <>
            {format(new Date(classItem.startTime), 'MMM dd, yyyy hh:mm a')}
            {classItem.description && (
              <Typography variant="body2" color="text.secondary">
                {classItem.description}
              </Typography>
            )}
          </>
        }
      />
      <ListItemSecondaryAction>
        {classItem.meetLink && (
          <IconButton
            edge="end"
            aria-label="join meeting"
            onClick={() => window.open(classItem.meetLink, '_blank')}
          >
            <VideoCallIcon />
          </IconButton>
        )}
      </ListItemSecondaryAction>
    </ListItem>
  );

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
      
      {loading ? (
        <Typography>Loading schedule...</Typography>
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
