import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Alert,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Edit as EditIcon,
  Assessment as AssessmentIcon,
  Close as CloseIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import IqraBookViewer from './IqraBookViewer';
import { IqraBookService } from '../services/iqraBookService';

const IqraTeaching = () => {
  const [currentStudents, setCurrentStudents] = useState([
    {
      id: 1,
      name: 'Ahmad',
      currentBook: 'Iqra Book 1',
      currentPage: 15,
      lastClass: '2024-12-30',
    },
    {
      id: 2,
      name: 'Fatima',
      currentBook: 'Iqra Book 2',
      currentPage: 8,
      lastClass: '2024-12-29',
    },
  ]);

  const [teachingSession, setTeachingSession] = useState(null);
  const [sessionNotes, setSessionNotes] = useState('');
  const [saveStatus, setSaveStatus] = useState(null);

  const startTeachingSession = (student) => {
    setTeachingSession({
      student,
      bookId: `iqra-${student.currentBook.split(' ')[2]}`,
      initialPage: student.currentPage,
      startTime: new Date(),
    });
  };

  const handlePageChange = async (studentId, bookId, newPage) => {
    try {
      // Update student's progress
      const updatedStudents = currentStudents.map(student => {
        if (student.id === studentId) {
          return {
            ...student,
            currentPage: newPage,
            lastClass: new Date().toISOString().split('T')[0],
          };
        }
        return student;
      });
      setCurrentStudents(updatedStudents);

      // Save progress to Firestore
      await IqraBookService.updateStudentProgress(studentId, bookId, {
        currentPage: newPage,
        lastUpdated: new Date(),
      });
    } catch (error) {
      console.error('Error updating progress:', error);
      setSaveStatus({
        type: 'error',
        message: 'Failed to save progress'
      });
    }
  };

  const endTeachingSession = async () => {
    if (!teachingSession) return;

    try {
      // Save session data
      await IqraBookService.saveTeachingSession({
        studentId: teachingSession.student.id,
        bookId: teachingSession.bookId,
        startTime: teachingSession.startTime,
        endTime: new Date(),
        notes: sessionNotes,
        endPage: teachingSession.student.currentPage,
      });

      setSaveStatus({
        type: 'success',
        message: 'Session saved successfully'
      });

      // Reset session state
      setTeachingSession(null);
      setSessionNotes('');
    } catch (error) {
      console.error('Error saving session:', error);
      setSaveStatus({
        type: 'error',
        message: 'Failed to save session'
      });
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Iqra Teaching Dashboard
      </Typography>

      {saveStatus && (
        <Alert 
          severity={saveStatus.type} 
          sx={{ mb: 2 }}
          onClose={() => setSaveStatus(null)}
        >
          {saveStatus.message}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Quick Actions */}
        <Grid item xs={12} md={4}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexDirection: 'column' }}>
              <Button
                variant="contained"
                startIcon={<PlayIcon />}
                fullWidth
                onClick={() => startTeachingSession(currentStudents[0])}
              >
                Start New Session
              </Button>
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                fullWidth
                onClick={() => console.log('Manage materials')}
              >
                Manage Teaching Materials
              </Button>
              <Button
                variant="outlined"
                startIcon={<AssessmentIcon />}
                fullWidth
                onClick={() => console.log('View reports')}
              >
                View Progress Reports
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Current Students */}
        <Grid item xs={12} md={8}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Current Students
            </Typography>
            <List>
              {currentStudents.map((student, index) => (
                <React.Fragment key={student.id}>
                  {index > 0 && <Divider />}
                  <ListItem>
                    <ListItemText
                      primary={student.name}
                      secondary={`${student.currentBook} - Page ${student.currentPage}`}
                    />
                    <ListItemSecondaryAction>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<PlayIcon />}
                        onClick={() => startTeachingSession(student)}
                      >
                        Start Session
                      </Button>
                    </ListItemSecondaryAction>
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          </Paper>
        </Grid>
      </Grid>

      {/* Teaching Session Dialog */}
      <Dialog
        open={Boolean(teachingSession)}
        onClose={endTeachingSession}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              Teaching Session: {teachingSession?.student.name}
            </Typography>
            <IconButton onClick={endTeachingSession}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {teachingSession && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <IqraBookViewer
                  bookId={teachingSession.bookId}
                  initialPage={teachingSession.initialPage}
                  onPageChange={(newPage) => 
                    handlePageChange(
                      teachingSession.student.id,
                      teachingSession.bookId,
                      newPage
                    )
                  }
                />
              </Grid>
              <Grid item xs={12}>
                <Paper elevation={1} sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Session Notes
                  </Typography>
                  <textarea
                    value={sessionNotes}
                    onChange={(e) => setSessionNotes(e.target.value)}
                    style={{
                      width: '100%',
                      minHeight: '100px',
                      padding: '8px',
                      marginBottom: '16px',
                    }}
                    placeholder="Add notes about the student's progress..."
                  />
                </Paper>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={endTeachingSession}>Cancel</Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={endTeachingSession}
          >
            End & Save Session
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default IqraTeaching;
