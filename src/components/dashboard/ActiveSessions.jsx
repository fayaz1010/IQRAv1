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
    if (!currentUser) {
      console.log('No current user, skipping active sessions fetch');
      return;
    }

    console.log('Starting to fetch active sessions for user:', currentUser.uid, 'isTeacher:', isTeacher);

    try {
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

      const unsubscribe = onSnapshot(sessionsQuery, 
        (snapshot) => {
          console.log('Active sessions snapshot received:', {
            total: snapshot.size,
            empty: snapshot.empty,
            currentUser: currentUser.uid,
            isTeacher
          });
          
          const sessionData = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            console.log('Examining session:', {
              id: doc.id,
              status: data.status,
              startTime: data.startTime,
              endTime: data.endTime,
              teacherId: data.teacherId
            });
            
            // Only include sessions that are actually active (have a start time but no end time)
            if (data.startTime && !data.endTime) {
              console.log('Found active session in component:', { id: doc.id, ...data });
              sessionData.push({
                id: doc.id,
                ...data
              });
            } else {
              console.log('Session excluded because:', !data.startTime ? 'no startTime' : 'has endTime');
            }
          });
          console.log('Final Active Sessions:', {
            count: sessionData.length,
            sessions: sessionData
          });
          setSessions(sessionData);
        },
        (error) => {
          console.error('Error in active sessions subscription:', error);
          setSessions([]); // Reset sessions on error
        }
      );

      return () => {
        console.log('Cleaning up active sessions subscription');
        unsubscribe();
      };
    } catch (error) {
      console.error('Error setting up active sessions query:', error);
      setSessions([]); // Reset sessions on error
    }
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
