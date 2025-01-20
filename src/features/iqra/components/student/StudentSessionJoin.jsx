import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Alert,
  Paper,
  CircularProgress,
  Card,
  CardContent,
  CardActions,
  Stack,
  Chip,
  Avatar,
  Divider,
} from '@mui/material';
import {
  VideoCall as VideoCallIcon,
  People as PeopleIcon,
  Book as BookIcon,
} from '@mui/icons-material';
import { useSession } from '../../contexts/SessionContext';
import { useAuth } from '../../../../contexts/AuthContext';
import { db } from '../../../../config/firebase';
import { doc, onSnapshot, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';

const StudentSessionJoin = ({ classId }) => {
  const { currentUser } = useAuth();
  const { joinSession } = useSession();
  const [sessionData, setSessionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [teacherName, setTeacherName] = useState('');
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!classId || !currentUser) return;

    // Listen for active sessions for this class
    const unsubscribe = onSnapshot(
      doc(db, 'classes', classId),
      async (docSnapshot) => {
        if (docSnapshot.exists()) {
          const classData = docSnapshot.data();
          if (classData.activeSession) {
            // Get session details
            const sessionRef = doc(db, 'sessions', classData.activeSession);
            const sessionDoc = await getDoc(sessionRef);
            
            if (sessionDoc.exists()) {
              const sessionData = sessionDoc.data();
              
              // Get teacher details
              const teacherRef = doc(db, 'users', sessionData.teacherId);
              const teacherDoc = await getDoc(teacherRef);
              
              if (teacherDoc.exists()) {
                setTeacherName(teacherDoc.data().displayName || 'Teacher');
              }
              
              setSessionData({
                id: sessionDoc.id,
                ...sessionData,
              });
            }
          } else {
            setSessionData(null);
          }
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error listening for session:', error);
        setError('Failed to listen for active sessions');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [classId, currentUser]);

  const handleJoinSession = async () => {
    if (!sessionData) return;
    
    setJoining(true);
    try {
      // Join the Iqra session
      await joinSession(sessionData.id);
      
      // Open Google Meet in a new tab if available
      if (sessionData.meet?.link) {
        window.open(sessionData.meet.link, '_blank');
      }
    } catch (error) {
      console.error('Error joining session:', error);
      setError('Failed to join session');
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!sessionData) {
    return (
      <Paper elevation={3} sx={{ p: 3, m: 2 }}>
        <Typography variant="body1" color="text.secondary">
          No active session at the moment.
        </Typography>
      </Paper>
    );
  }

  return (
    <Card elevation={3} sx={{ m: 2 }}>
      <CardContent>
        <Stack spacing={2}>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h6" component="div">
              Active Class Session
            </Typography>
            <Chip
              color="success"
              label="In Progress"
              size="small"
            />
          </Box>
          
          <Divider />
          
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar>{teacherName[0]}</Avatar>
            <Box>
              <Typography variant="subtitle1">
                {teacherName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Teacher
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={2}>
            <Chip
              icon={<PeopleIcon />}
              label={`${sessionData.attendees?.length || 1} Joined`}
              variant="outlined"
            />
            {sessionData.meet?.link && (
              <Chip
                icon={<VideoCallIcon />}
                label="Google Meet Available"
                variant="outlined"
                color="primary"
              />
            )}
            <Chip
              icon={<BookIcon />}
              label={`Page ${sessionData.currentPage}`}
              variant="outlined"
            />
          </Stack>
        </Stack>
      </CardContent>

      <CardActions sx={{ justifyContent: 'flex-end', p: 2 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleJoinSession}
          disabled={joining}
          startIcon={<VideoCallIcon />}
        >
          {joining ? 'Joining...' : 'Join Class Session'}
        </Button>
      </CardActions>
    </Card>
  );
};

export default StudentSessionJoin;
