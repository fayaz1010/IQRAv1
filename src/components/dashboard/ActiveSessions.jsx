import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardActions,
  Typography,
  Grid,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import { PlayArrow as PlayIcon, Login as JoinIcon, Book as BookIcon } from '@mui/icons-material';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const ActiveSessions = ({ isTeacher = false }) => {
  const [sessions, setSessions] = useState([]);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) return;

    console.log('Fetching active sessions for user:', currentUser.uid, 'isTeacher:', isTeacher);

    // Query active sessions based on user role
    const sessionsQuery = isTeacher
      ? query(
          collection(db, 'sessions'),
          where('teacherId', '==', currentUser.uid),
          where('status', '==', 'active'),
          where('endTime', '==', null)  // Only truly active sessions
        )
      : query(
          collection(db, 'sessions'),
          where('studentIds', 'array-contains', currentUser.uid),
          where('status', '==', 'active'),
          where('endTime', '==', null)  // Only truly active sessions
        );

    const unsubscribe = onSnapshot(sessionsQuery, (snapshot) => {
      const sessionData = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        // Only include sessions that are actually active (have a start time but no end time)
        if (data.startTime && !data.endTime) {
          console.log('Found active session in component:', { id: doc.id, ...data });
          sessionData.push({
            id: doc.id,
            ...data
          });
        }
      });
      console.log('Active Sessions component sessions:', sessionData);
      setSessions(sessionData);
    });

    return () => unsubscribe();
  }, [currentUser, isTeacher]);

  const handleJoinSession = (sessionId) => {
    navigate(`/session/${sessionId}`);
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Active Sessions ({sessions.length})
      </Typography>
      
      {sessions.length === 0 ? (
        <Typography variant="body2" color="textSecondary">
          No active sessions at the moment
        </Typography>
      ) : (
        <Grid container spacing={2}>
          {sessions.map((session) => (
            <Grid item xs={12} key={session.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle1">
                      {session.className || 'Untitled Class'}
                    </Typography>
                    <Chip 
                      size="small" 
                      color="primary" 
                      label={`Started ${new Date(session.startTime.toDate()).toLocaleTimeString()}`}
                    />
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <BookIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="textSecondary">
                      {session.bookName || 'No book selected'} - Page {session.currentPage || '1'}
                    </Typography>
                  </Box>
                </CardContent>
                <CardActions>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={isTeacher ? <PlayIcon /> : <JoinIcon />}
                    onClick={() => handleJoinSession(session.id)}
                  >
                    {isTeacher ? 'Resume' : 'Join'}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default ActiveSessions;
