import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
} from '@mui/material';
import {
  PlayArrow as PlayArrowIcon,
  Book as BookIcon,
  Group as GroupIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../../../features/iqra/contexts/SessionContext';
import { formatDistanceToNow } from 'date-fns';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';

const ActiveSessionCard = ({ session }) => {
  const navigate = useNavigate();
  const { startSession } = useSession();

  // Add debug logging for incoming session data
  console.log('ActiveSessionCard received session:', {
    id: session?.id,
    startTime: session?.startTime,
    classData: session?.classData,
    book: session?.book,
    currentPage: session?.currentPage
  });

  // Format the session duration
  const formatSessionDuration = () => {
    if (!session?.startTime) {
      console.log('No startTime in session:', session);
      return 'Just started';
    }
    
    try {
      let startTime;
      
      // Handle Firestore Timestamp
      if (session.startTime && typeof session.startTime.toDate === 'function') {
        startTime = session.startTime.toDate();
      } 
      // Handle ISO string
      else if (typeof session.startTime === 'string') {
        startTime = new Date(session.startTime);
      } 
      // Handle Date object
      else if (session.startTime instanceof Date) {
        startTime = session.startTime;
      } 
      // Handle seconds timestamp
      else if (typeof session.startTime === 'number') {
        startTime = new Date(session.startTime * 1000);
      }
      else {
        console.error('Unhandled startTime format:', session.startTime);
        return 'Time unknown';
      }

      if (!startTime || isNaN(startTime.getTime())) {
        console.error('Invalid date value:', startTime);
        return 'Time unknown';
      }

      // Add logging to debug the time calculation
      console.log('Calculating time elapsed:', {
        startTime,
        now: new Date(),
        sessionData: session
      });

      return formatDistanceToNow(startTime, { addSuffix: true, includeSeconds: true });
    } catch (error) {
      console.error('Error formatting session duration:', error, session.startTime);
      return 'Time unknown';
    }
  };

  // Get session stats with proper null checks and debug logging
  const classData = session?.classData || {};
  const studentProgress = session?.studentProgress || {};
  const totalStudents = classData?.studentIds?.length || 0;
  const activeStudents = Object.keys(studentProgress || {}).length;
  const currentPage = session?.currentPage || 1;
  const book = session?.book || 'Iqra Book 1';
  const className = classData?.name || 'Untitled Class';

  console.log('ActiveSessionCard computed values:', {
    className,
    totalStudents,
    activeStudents,
    currentPage,
    book
  });

  // Handle null or invalid session data
  if (!session || !session.classId) {
    console.log('Invalid session data:', session);
    return null;
  }

  const handleResumeSession = async () => {
    try {
      // First check if the session is still active
      const sessionRef = doc(db, 'sessions', session.id);
      const sessionDoc = await getDoc(sessionRef);
      
      if (!sessionDoc.exists()) {
        console.error('Session no longer exists');
        return;
      }
      
      const sessionData = sessionDoc.data();
      if (sessionData.status !== 'active' || sessionData.endTime) {
        console.error('Session is no longer active');
        return;
      }

      // Resume the session with the current book
      await startSession(session.classId, session.book || 'Iqra Book 1');
      navigate(`/classes/iqra`);
    } catch (error) {
      console.error('Error resuming session:', error);
    }
  };

  return (
    <Paper 
      sx={{ 
        p: 3,
        bgcolor: 'success.light',
        color: 'white',
        position: 'relative',
        overflow: 'hidden'
      }}
      tabIndex={-1}
    >
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          {className}
        </Typography>
        <Typography variant="body2" color="inherit" sx={{ opacity: 0.9 }}>
          {formatSessionDuration()}
        </Typography>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <Box display="flex" alignItems="center" gap={1}>
            <BookIcon fontSize="small" />
            <Typography variant="body2">
              {book} • Page {currentPage}
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={12}>
          <Box display="flex" alignItems="center" gap={1}>
            <GroupIcon fontSize="small" />
            <Typography variant="body2">
              {activeStudents} of {totalStudents} Students Present
            </Typography>
          </Box>
        </Grid>
      </Grid>

      <Box display="flex" gap={2}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<PlayArrowIcon />}
          onClick={handleResumeSession}
          sx={{
            boxShadow: 2,
            '&:hover': {
              boxShadow: 4
            }
          }}
          fullWidth
          tabIndex={0}
        >
          Resume
        </Button>
      </Box>
    </Paper>
  );
};

export default ActiveSessionCard;
