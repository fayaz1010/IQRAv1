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
} from '@mui/icons-material';
import { useSession } from '../../contexts/SessionContext';
import { useAuth } from '../../../../contexts/AuthContext';
import IqraBookViewer from '../IqraBookViewer';
import { motion, AnimatePresence } from 'framer-motion';

const TeachingSession = () => {
  const theme = useTheme();
  const { classId } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation();
  const { currentUser } = useAuth();
  const {
    activeSession,
    startSession,
    updateStudentProgress,
    endSession,
    error: sessionError,
    loading: sessionLoading,
  } = useSession();

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [assessmentDialog, setAssessmentDialog] = useState(false);
  const [assessment, setAssessment] = useState({
    reading: 0,
    pronunciation: 0,
    memorization: 0,
  });
  const [error, setError] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [sessionTimer, setSessionTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const [currentPage, setCurrentPage] = useState(state?.currentPage || 1);

  useEffect(() => {
    const initSession = async () => {
      if (!activeSession && !sessionLoading) {
        try {
          // Start or resume session with classId
          await startSession(classId);
          setIsInitializing(false);
        } catch (error) {
          console.error('Error starting session:', error);
          setError('Failed to start session');
          setIsInitializing(false);
        }
      } else {
        setIsInitializing(false);
      }
    };

    initSession();
  }, [classId, activeSession, sessionLoading, startSession]);

  useEffect(() => {
    let interval;
    if (isTimerRunning && !isInitializing) {
      interval = setInterval(() => {
        setSessionTimer((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, isInitializing]);

  useEffect(() => {
    if (activeSession?.currentPage) {
      setCurrentPage(activeSession.currentPage);
    }
  }, [activeSession]);

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStudentSelect = (student) => {
    setSelectedStudent(student);
  };

  const handleAssessment = async () => {
    try {
      await updateStudentProgress(selectedStudent.id, {
        ...assessment,
        timestamp: new Date().toISOString(),
      });
      setAssessmentDialog(false);
      setAssessment({
        reading: 0,
        pronunciation: 0,
        memorization: 0,
      });
    } catch (error) {
      console.error('Error updating progress:', error);
      setError('Failed to update progress');
    }
  };

  const handleEndSession = async () => {
    try {
      await endSession();
      navigate('/classes');
    } catch (error) {
      console.error('Error ending session:', error);
      setError('Failed to end session');
    }
  };

  if (isInitializing || sessionLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          backgroundColor: theme.palette.background.default,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error || sessionError) {
    return (
      <Box
        sx={{
          p: 3,
          backgroundColor: theme.palette.background.default,
          color: theme.palette.error.main,
        }}
      >
        <Typography variant="h6">Error</Typography>
        <Typography>{error || sessionError}</Typography>
        <Button
          variant="contained"
          onClick={() => navigate('/classes')}
          sx={{ mt: 2 }}
        >
          Return to Classes
        </Button>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        backgroundColor: theme.palette.background.default,
        color: theme.palette.text.primary,
        minHeight: '100vh',
        p: 3,
      }}
    >
      <Grid container spacing={3}>
        {/* Session Controls */}
        <Grid item xs={12}>
          <Paper
            sx={{
              p: 2,
              backgroundColor: theme.palette.background.paper,
              color: theme.palette.text.primary,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TimerIcon sx={{ mr: 1 }} />
                <Typography variant="h6">{formatTime(sessionTimer)}</Typography>
                <IconButton
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                  sx={{ ml: 1 }}
                >
                  {isTimerRunning ? <PauseIcon /> : <PlayArrowIcon />}
                </IconButton>
              </Box>
              <Button
                variant="contained"
                color="error"
                startIcon={<StopIcon />}
                onClick={handleEndSession}
              >
                End Session
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Student List */}
        <Grid item xs={12} md={4}>
          <Paper
            sx={{
              height: '70vh',
              overflow: 'auto',
              backgroundColor: theme.palette.background.paper,
              color: theme.palette.text.primary,
            }}
          >
            <List>
              {activeSession?.classData?.students?.map((student) => (
                <ListItem
                  key={student.id}
                  button
                  selected={selectedStudent?.id === student.id}
                  onClick={() => handleStudentSelect(student)}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <PersonIcon sx={{ mr: 1 }} />
                        <Typography>{student.name}</Typography>
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" display="block">
                          Current Page: {student.currentPage || 'Not started'}
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={((student.currentPage || 0) / student.totalPages) * 100}
                          sx={{ mt: 1 }}
                        />
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={() => {
                        setSelectedStudent(student);
                        setAssessmentDialog(true);
                      }}
                    >
                      <StarIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Book Viewer */}
        <Grid item xs={12} md={8}>
          <Paper
            sx={{
              height: '70vh',
              backgroundColor: theme.palette.background.paper,
              color: theme.palette.text.primary,
            }}
          >
            {selectedStudent ? (
              <IqraBookViewer
                bookId={activeSession.bookId}
                currentPage={currentPage}
                onPageChange={(page) =>
                  updateStudentProgress(selectedStudent.id, { currentPage: page })
                }
              />
            ) : (
              <Box
                sx={{
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography variant="h6" color="textSecondary">
                  Select a student to begin
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Assessment Dialog */}
      <Dialog
        open={assessmentDialog}
        onClose={() => setAssessmentDialog(false)}
        PaperProps={{
          sx: {
            backgroundColor: theme.palette.background.paper,
            color: theme.palette.text.primary,
          },
        }}
      >
        <DialogTitle>
          Assess Student: {selectedStudent?.name}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ minWidth: 300 }}>
            <Typography gutterBottom>Reading</Typography>
            <Rating
              value={assessment.reading}
              onChange={(_, value) =>
                setAssessment({ ...assessment, reading: value })
              }
            />
            <Typography gutterBottom sx={{ mt: 2 }}>
              Pronunciation
            </Typography>
            <Rating
              value={assessment.pronunciation}
              onChange={(_, value) =>
                setAssessment({ ...assessment, pronunciation: value })
              }
            />
            <Typography gutterBottom sx={{ mt: 2 }}>
              Memorization
            </Typography>
            <Rating
              value={assessment.memorization}
              onChange={(_, value) =>
                setAssessment({ ...assessment, memorization: value })
              }
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssessmentDialog(false)}>Cancel</Button>
          <Button onClick={handleAssessment} variant="contained">
            Save Assessment
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeachingSession;
