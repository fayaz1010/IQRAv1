import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
} from '@mui/material';
import { useSession } from '../../contexts/SessionContext';
import { useAuth } from '../../../../contexts/AuthContext';
import IqraBookViewer from '../IqraBookViewer';

const TeachingSession = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    activeSession,
    startSession,
    updateStudentProgress,
    endSession,
    error: sessionError,
    loading: sessionLoading
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

  useEffect(() => {
    const initSession = async () => {
      if (!activeSession && !sessionLoading) {
        try {
          await startSession(classId, 'iqra-book-1');
        } catch (error) {
          setError(error.message);
        } finally {
          setIsInitializing(false);
        }
      } else {
        setIsInitializing(false);
      }
    };

    initSession();
  }, [classId, sessionLoading]);

  const handleStudentSelect = (studentId) => {
    setSelectedStudent(studentId);
  };

  const handleAssessment = (studentId) => {
    setSelectedStudent(studentId);
    setAssessmentDialog(true);
  };

  const handleSaveAssessment = async () => {
    try {
      await updateStudentProgress(selectedStudent, activeSession.currentPage, assessment);
      setAssessmentDialog(false);
    } catch (error) {
      setError(error.message);
    }
  };

  const handleEndSession = async () => {
    try {
      await endSession();
      navigate('/teacher'); // Navigate back to teacher dashboard after ending session
    } catch (error) {
      setError(error.message);
    }
  };

  if (error || sessionError) {
    return (
      <Box p={2}>
        <Paper elevation={2} sx={{ p: 2, bgcolor: 'error.light', color: 'error.contrastText' }}>
          <Typography>{error || sessionError}</Typography>
        </Paper>
      </Box>
    );
  }

  if (sessionLoading || isInitializing) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!activeSession) {
    return (
      <Box p={2}>
        <Paper elevation={2} sx={{ p: 2 }}>
          <Typography>Failed to start teaching session. Please try again.</Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate('/teacher')}
            sx={{ mt: 2 }}
          >
            Return to Dashboard
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box p={2}>
      <Grid container spacing={2}>
        {/* Student List */}
        <Grid item xs={3}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Students
            </Typography>
            <List>
              {Object.entries(activeSession.studentProgress).map(([studentId, progress]) => (
                <ListItem
                  key={studentId}
                  button
                  selected={selectedStudent === studentId}
                  onClick={() => handleStudentSelect(studentId)}
                >
                  <ListItemText
                    primary={`Student ${studentId}`}
                    secondary={`Page ${progress.currentPage}`}
                  />
                  <ListItemSecondaryAction>
                    <Button
                      size="small"
                      onClick={() => handleAssessment(studentId)}
                    >
                      Assess
                    </Button>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Book Viewer */}
        <Grid item xs={9}>
          <Paper elevation={2}>
            <IqraBookViewer
              bookId="iqra-1"
              studentId={selectedStudent}
              readOnly={!selectedStudent}
              showSaveButton
            />
          </Paper>
        </Grid>
      </Grid>

      {/* Session Controls */}
      <Box mt={2} display="flex" justifyContent="flex-end">
        <Button
          variant="contained"
          color="secondary"
          onClick={handleEndSession}
        >
          End Session
        </Button>
      </Box>

      {/* Assessment Dialog */}
      <Dialog open={assessmentDialog} onClose={() => setAssessmentDialog(false)}>
        <DialogTitle>Assess Student</DialogTitle>
        <DialogContent>
          <Box p={2}>
            <Typography gutterBottom>Reading</Typography>
            <Rating
              value={assessment.reading}
              onChange={(_, value) => setAssessment(prev => ({ ...prev, reading: value }))}
            />

            <Typography gutterBottom>Pronunciation</Typography>
            <Rating
              value={assessment.pronunciation}
              onChange={(_, value) => setAssessment(prev => ({ ...prev, pronunciation: value }))}
            />

            <Typography gutterBottom>Memorization</Typography>
            <Rating
              value={assessment.memorization}
              onChange={(_, value) => setAssessment(prev => ({ ...prev, memorization: value }))}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssessmentDialog(false)}>Cancel</Button>
          <Button onClick={handleSaveAssessment} variant="contained" color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeachingSession;
