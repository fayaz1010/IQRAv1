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
import { PlayArrow as PlayIcon, Login as JoinIcon } from '@mui/icons-material';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const ActiveSessions = ({ isTeacher = false }) => {
  const [sessions, setSessions] = useState([]);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) return;

    // Query active sessions based on user role
    const sessionsQuery = isTeacher
      ? query(
          collection(db, 'sessions'),
          where('teacherId', '==', currentUser.uid),
          where('status', '==', 'active')
        )
      : query(
          collection(db, 'sessions'),
          where('studentIds', 'array-contains', currentUser.uid),
          where('status', '==', 'active')
        );

    const unsubscribe = onSnapshot(sessionsQuery, (snapshot) => {
      const sessionData = [];
      snapshot.forEach((doc) => {
        sessionData.push({
          id: doc.id,
          ...doc.data()
        });
      });
      setSessions(sessionData);
    });

    return () => unsubscribe();
  }, [currentUser, isTeacher]);

  const handleJoinSession = (sessionId) => {
    navigate(`/session/${sessionId}`);
  };

  const handleResumeSession = (sessionId) => {
    navigate(`/teaching/${sessionId}`);
  };

  if (!sessions.length) {
    return (
      <Card sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CardContent>
          <Typography variant="body1" color="textSecondary">
            No active sessions
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Grid container spacing={2}>
      {sessions.map((session) => (
        <Grid item xs={12} sm={6} md={4} key={session.id}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {session.className}
              </Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Started: {new Date(session.startTime).toLocaleTimeString()}
              </Typography>
              <Box sx={{ mt: 1 }}>
                <Chip
                  label={`Book ${session.book}`}
                  size="small"
                  sx={{ mr: 1 }}
                />
                <Chip
                  label={`Page ${session.currentPage}`}
                  size="small"
                  color="primary"
                />
              </Box>
            </CardContent>
            <CardActions>
              {isTeacher ? (
                <Button
                  startIcon={<PlayIcon />}
                  onClick={() => handleResumeSession(session.id)}
                  fullWidth
                  variant="contained"
                  color="primary"
                >
                  Resume Session
                </Button>
              ) : (
                <Button
                  startIcon={<JoinIcon />}
                  onClick={() => handleJoinSession(session.id)}
                  fullWidth
                  variant="contained"
                  color="primary"
                >
                  Join Session
                </Button>
              )}
            </CardActions>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

export default ActiveSessions;
