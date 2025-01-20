import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Box, Typography, CircularProgress, Button, Alert } from '@mui/material';

const Session = () => {
  const { sessionId } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSession = async () => {
      if (!currentUser) {
        setError('You must be logged in to view this session');
        setLoading(false);
        return;
      }

      try {
        const sessionDoc = await getDoc(doc(db, 'sessions', sessionId));
        if (!sessionDoc.exists()) {
          setError('Session not found');
          return;
        }

        const sessionData = sessionDoc.data();
        // Check if student is enrolled in the class
        if (!sessionData.attendees?.includes(currentUser.uid)) {
          setError('You are not enrolled in this session');
          return;
        }

        setSession(sessionData);
      } catch (error) {
        console.error('Error fetching session:', error);
        setError('Failed to load session');
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [sessionId, currentUser]);

  const handleLeaveSession = async () => {
    try {
      await updateDoc(doc(db, 'sessions', sessionId), {
        [`studentStatus.${currentUser.uid}`]: 'left',
      });
      navigate('/dashboard');
    } catch (error) {
      console.error('Error leaving session:', error);
      setError('Failed to leave session');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
        <Button variant="contained" onClick={() => navigate('/dashboard')} sx={{ mt: 2 }}>
          Return to Dashboard
        </Button>
      </Box>
    );
  }

  if (!session) {
    return (
      <Box p={3}>
        <Alert severity="warning">Session not found</Alert>
        <Button variant="contained" onClick={() => navigate('/dashboard')} sx={{ mt: 2 }}>
          Return to Dashboard
        </Button>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Active Session
      </Typography>
      
      <Box mb={3}>
        <Typography variant="h6">Class: {session.className}</Typography>
        <Typography>Teacher: {session.teacherName}</Typography>
        <Typography>Current Page: {session.currentPage}</Typography>
      </Box>

      {session.meet?.link && (
        <Button
          variant="contained"
          color="primary"
          href={session.meet.link}
          target="_blank"
          rel="noopener noreferrer"
          sx={{ mr: 2 }}
        >
          Join Meeting
        </Button>
      )}

      <Button variant="outlined" color="secondary" onClick={handleLeaveSession}>
        Leave Session
      </Button>
    </Box>
  );
};

export default Session;
