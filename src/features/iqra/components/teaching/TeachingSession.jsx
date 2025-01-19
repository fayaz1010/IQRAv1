import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Paper,
  Grid,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Rating,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  useTheme,
  Card,
  CardContent,
  IconButton,
  Divider,
  Tooltip,
  LinearProgress,
  Alert,
} from '@mui/material';
import {
  Person as PersonIcon,
  Star as StarIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  PlayArrow as PlayArrowIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  Timer as TimerIcon,
  Book as BookIcon,
  Videocam as VideocamIcon,
} from '@mui/icons-material';
import { useSession } from '../../contexts/SessionContext';
import { useAuth } from '../../../../contexts/AuthContext';
import IqraBookViewer from '../IqraBookViewer';
import { motion, AnimatePresence } from 'framer-motion';

const TeachingSession = () => {
  const theme = useTheme();
  const { classId, sessionId: urlSessionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const {
    activeSession,
    startSession,
    updateStudentProgress,
    joinSession,
    lastBook,
    lastPage,
  } = useSession();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sessionMode, setSessionMode] = useState('teacher');
  const [currentPage, setCurrentPage] = useState(1);
  const [initialized, setInitialized] = useState(false);

  // Initialize session only once
  useEffect(() => {
    if (initialized) return;

    const initializeSession = async () => {
      try {
        setLoading(true);
        const mode = location.state?.mode || 'teacher';
        const sid = urlSessionId || location.state?.sessionId;
        setSessionMode(mode);

        if (mode === 'student' && sid) {
          console.log('Student joining session:', sid);
          await joinSession(sid);
        } else if (mode === 'teacher' && classId) {
          console.log('Teacher starting session for class:', classId);
          await startSession(classId);
        } else {
          throw new Error('Invalid session configuration');
        }

        setInitialized(true);
        setLoading(false);
      } catch (error) {
        console.error('Error initializing session:', error);
        setError(error.message);
        setLoading(false);
      }
    };

    initializeSession();
  }, []); // Empty dependency array since we use initialized flag

  // Update current page when session changes
  useEffect(() => {
    if (!activeSession) return;

    if (activeSession.currentPage && activeSession.currentPage !== currentPage) {
      console.log('Updating current page to:', activeSession.currentPage);
      setCurrentPage(activeSession.currentPage);
    }

    if (activeSession.book) {
      console.log('Active session book:', activeSession.book);
    }
  }, [activeSession]);

  useEffect(() => {
    // Load last book and page if no active session
    if (!loading && !activeSession) {
      setCurrentPage(lastPage || 1);
    }
    // Load from active session if exists
    else if (activeSession) {
      setCurrentPage(activeSession.currentPage);
    }
  }, [loading, activeSession, lastPage]);

  const handlePageChange = async (newPage) => {
    if (sessionMode === 'teacher' && activeSession) {
      try {
        setCurrentPage(newPage);
        await updateStudentProgress(activeSession.id, { currentPage: newPage });
      } catch (error) {
        console.error('Error updating page:', error);
        setError('Failed to update page');
      }
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">
          {error}
          <Button color="inherit" size="small" onClick={() => navigate(-1)}>
            Go Back
          </Button>
        </Alert>
      </Box>
    );
  }

  if (!activeSession) {
    return (
      <Box p={3}>
        <Alert severity="warning">
          No active session found
          <Button color="inherit" size="small" onClick={() => navigate(-1)}>
            Go Back
          </Button>
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Grid container spacing={3}>
        {/* Header */}
        <Grid item xs={12}>
          <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h5">
                {sessionMode === 'teacher' ? 'Teaching Session' : 'Learning Session'}
              </Typography>
              <Box>
                {activeSession?.meet?.link && (
                  <Tooltip title="Join Video Call">
                    <IconButton
                      color="primary"
                      onClick={() => window.open(activeSession.meet.link, '_blank')}
                      sx={{ mr: 1 }}
                    >
                      <VideocamIcon />
                    </IconButton>
                  </Tooltip>
                )}
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={() => navigate(-1)}
                >
                  Exit Session
                </Button>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Main Content */}
        <Grid item xs={12} md={8}>
          <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
            <IqraBookViewer
              bookId={lastBook || activeSession.book}
              currentPage={currentPage}
              onPageChange={sessionMode === 'teacher' ? handlePageChange : undefined}
              readOnly={sessionMode === 'student'}
              studentId={currentUser.uid}
              showSaveButton={sessionMode === 'student'}
            />
          </Paper>
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
            {sessionMode === 'teacher' ? (
              <TeacherControls
                session={activeSession}
                onUpdateProgress={updateStudentProgress}
              />
            ) : (
              <StudentView
                session={activeSession}
                studentId={currentUser.uid}
              />
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

const TeacherControls = ({ session, onUpdateProgress }) => {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Teaching Controls
      </Typography>
      <List>
        <ListItem>
          <ListItemText 
            primary="Current Page"
            secondary={session?.currentPage || 'Not started'}
          />
        </ListItem>
        <ListItem>
          <ListItemText 
            primary="Students"
            secondary={`${session?.studentIds?.length || 0} enrolled`}
          />
        </ListItem>
      </List>
    </Box>
  );
};

const StudentView = ({ session, studentId }) => {
  const progress = session?.studentProgress?.[studentId] || {};
  
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Your Progress
      </Typography>
      <List>
        <ListItem>
          <ListItemText 
            primary="Current Page"
            secondary={progress.currentPage || 'Not started'}
          />
        </ListItem>
        <ListItem>
          <ListItemText 
            primary="Assessment"
            secondary={
              <Box>
                <Typography component="span" display="block">
                  Reading: {progress.assessment?.reading || 0}/5
                </Typography>
                <Typography component="span" display="block">
                  Pronunciation: {progress.assessment?.pronunciation || 0}/5
                </Typography>
                <Typography component="span" display="block">
                  Memorization: {progress.assessment?.memorization || 0}/5
                </Typography>
              </Box>
            }
          />
        </ListItem>
      </List>
    </Box>
  );
};

export default TeachingSession;
