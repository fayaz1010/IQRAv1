import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemText,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  Close as CloseIcon,
  Link as LinkIcon,
  AccessTime as TimeIcon,
  Group as GroupIcon,
  Book as BookIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { formatDistanceToNow, format } from 'date-fns';

const formatTimeString = (timeStr) => {
  try {
    const [hours, minutes, seconds] = timeStr.split(':').map(Number);
    const today = new Date();
    today.setHours(hours, minutes, seconds || 0);
    return today;
  } catch (error) {
    console.error('Error parsing time string:', error);
    return null;
  }
};

const formatSessionDuration = (startTime) => {
  if (!startTime) return 'Unknown';

  try {
    let date;
    if (startTime instanceof Timestamp) {
      date = startTime.toDate();
    } else if (typeof startTime === 'object' && startTime.seconds) {
      date = new Date(startTime.seconds * 1000);
    } else if (typeof startTime === 'string') {
      // Check if it's a time-only string (HH:mm:ss)
      if (startTime.match(/^\d{2}:\d{2}(:\d{2})?$/)) {
        date = formatTimeString(startTime);
        if (!date) return format(new Date(), 'HH:mm');
      } else {
        date = new Date(startTime);
      }
    } else {
      console.warn('Unexpected startTime format:', startTime);
      return 'Unknown';
    }

    // For time-only values, just return the formatted time
    if (typeof startTime === 'string' && startTime.match(/^\d{2}:\d{2}(:\d{2})?$/)) {
      return format(date, 'HH:mm');
    }

    return formatDistanceToNow(date, { addSuffix: true });
  } catch (error) {
    console.error('Error formatting duration:', error, 'startTime:', startTime);
    return 'Unknown';
  }
};

const ActiveSessions = () => {
  const { currentUser } = useAuth();
  const [activeSessions, setActiveSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedback, setFeedback] = useState({ classNotes: '', studentFeedback: {} });
  const [sessionStats, setSessionStats] = useState({});
  const [bulkCloseDialogOpen, setBulkCloseDialogOpen] = useState(false);
  const [bulkCloseProgress, setBulkCloseProgress] = useState(0);
  const [isBulkClosing, setIsBulkClosing] = useState(false);

  useEffect(() => {
    if (!currentUser) return;

    const sessionsRef = collection(db, 'sessions');
    const q = query(
      sessionsRef,
      where('teacherId', '==', currentUser.uid),
      where('status', '==', 'active')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      try {
        const sessions = [];
        const stats = {};
        
        for (const docSnapshot of snapshot.docs) {
          const sessionData = docSnapshot.data();
          console.log('Session data:', {
            id: docSnapshot.id,
            startTime: sessionData.startTime,
            startTimeType: typeof sessionData.startTime,
            startTimeIsTimestamp: sessionData.startTime instanceof Timestamp,
          });

          const classRef = doc(db, 'classes', sessionData.classId);
          const classDoc = await getDoc(classRef);
          const classData = classDoc.exists() ? classDoc.data() : null;
          
          const activeStudents = Object.values(sessionData.studentStatus || {})
            .filter(s => s.status === 'active').length;
          const totalStudents = classData?.studentIds?.length || 0;
          const averagePage = Object.values(sessionData.studentProgress || {})
            .reduce((sum, student) => sum + (student.currentPage || 0), 0) / totalStudents || 0;
          
          const sessionWithStats = {
            id: docSnapshot.id,
            ...sessionData,
            className: classData?.name || 'Unknown Class',
            startTime: sessionData.startTime,
            duration: formatSessionDuration(sessionData.startTime),
            activeStudents,
            totalStudents,
            averagePage: Math.round(averagePage),
            attendance: totalStudents ? Math.round((activeStudents / totalStudents) * 100) : 0,
          };
          
          sessions.push(sessionWithStats);
          
          stats[docSnapshot.id] = {
            activeStudents,
            totalStudents,
            attendance: sessionWithStats.attendance,
            averagePage: sessionWithStats.averagePage,
          };
        }
        
        setActiveSessions(sessions);
        setSessionStats(stats);
      } catch (error) {
        console.error('Error processing session data:', error);
      } finally {
        setLoading(false);
      }
    }, (error) => {
      console.error('Error setting up session listener:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleEndSession = (session) => {
    setSelectedSession(session);
    setFeedbackOpen(true);
  };

  const handleSubmitFeedback = async () => {
    try {
      const endTime = Timestamp.now();
      
      // Update session document
      const sessionRef = doc(db, 'sessions', selectedSession.id);
      await updateDoc(sessionRef, {
        status: 'completed',
        endTime,
        feedback: {
          classNotes: feedback.classNotes,
          studentFeedback: feedback.studentFeedback,
        },
      });

      // Only update class document if classId exists
      if (selectedSession.classId) {
        const classRef = doc(db, 'classes', selectedSession.classId);
        const classDoc = await getDoc(classRef);
        
        if (classDoc.exists()) {
          const classData = classDoc.data();
          // Only update if this is the active session for the class
          if (classData.activeSession === selectedSession.id) {
            await updateDoc(classRef, {
              activeSession: null,
              lastSession: {
                endTime,
                sessionId: selectedSession.id
              }
            });
          }
        }
      }

      setFeedbackOpen(false);
      setSelectedSession(null);
      setFeedback({ classNotes: '', studentFeedback: {} });
    } catch (error) {
      console.error('Error ending session:', error);
    }
  };

  const handleBulkClose = async () => {
    try {
      setIsBulkClosing(true);
      const batchSize = 500;
      const batches = [];
      let currentBatch = [];
      
      activeSessions.forEach(session => {
        currentBatch.push(session);
        if (currentBatch.length === batchSize) {
          batches.push([...currentBatch]);
          currentBatch = [];
        }
      });
      if (currentBatch.length > 0) {
        batches.push(currentBatch);
      }

      const totalSessions = activeSessions.length;
      let completedSessions = 0;

      for (const batch of batches) {
        await Promise.all(batch.map(async (session) => {
          try {
            const endTime = Timestamp.now();
            
            // Update session document
            const sessionRef = doc(db, 'sessions', session.id);
            await updateDoc(sessionRef, {
              status: 'completed',
              endTime,
              feedback: {
                classNotes: 'Bulk closed by teacher',
                studentFeedback: {},
              },
            });

            // Only update class document if classId exists
            if (session.classId) {
              const classRef = doc(db, 'classes', session.classId);
              const classDoc = await getDoc(classRef);
              
              if (classDoc.exists()) {
                const classData = classDoc.data();
                // Only update if this is the active session for the class
                if (classData.activeSession === session.id) {
                  await updateDoc(classRef, {
                    activeSession: null,
                    lastSession: {
                      endTime,
                      sessionId: session.id
                    }
                  });
                }
              }
            }

            completedSessions++;
            setBulkCloseProgress(Math.round((completedSessions / totalSessions) * 100));
          } catch (error) {
            console.error(`Error closing session ${session.id}:`, error);
          }
        }));
      }
    } catch (error) {
      console.error('Error in bulk close:', error);
    } finally {
      setIsBulkClosing(false);
      setBulkCloseDialogOpen(false);
      setBulkCloseProgress(0);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">
          Active Sessions ({activeSessions.length})
        </Typography>
        {activeSessions.length > 0 && (
          <Button
            variant="contained"
            color="error"
            onClick={() => setBulkCloseDialogOpen(true)}
            startIcon={<CloseIcon />}
          >
            Close All Sessions
          </Button>
        )}
      </Box>
      
      {activeSessions.length === 0 ? (
        <Box p={2} textAlign="center">
          <Typography color="textSecondary">
            No active sessions at the moment
          </Typography>
        </Box>
      ) : (
        <Box display="flex" flexWrap="wrap" gap={2}>
          {activeSessions.map((session) => (
            <Card key={session.id} sx={{ width: 300, position: 'relative' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {session.className}
                </Typography>
                
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <TimeIcon fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    Started at {session.duration}
                  </Typography>
                </Box>
                
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <GroupIcon fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    {session.activeStudents}/{session.totalStudents} students
                  </Typography>
                  <Chip 
                    size="small" 
                    label={`${session.attendance}%`}
                    color={session.attendance > 75 ? 'success' : session.attendance > 50 ? 'warning' : 'error'}
                  />
                </Box>
                
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <BookIcon fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    Current Page: {session.currentPage || 'N/A'}
                  </Typography>
                </Box>
                
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <AssessmentIcon fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    Class Average: Page {session.averagePage}
                  </Typography>
                </Box>

                {session.meet?.link && (
                  <Button
                    variant="outlined"
                    startIcon={<LinkIcon />}
                    href={session.meet.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    fullWidth
                    sx={{ mb: 1 }}
                  >
                    Join Meeting
                  </Button>
                )}
                
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={() => handleEndSession(session)}
                  fullWidth
                >
                  End Session
                </Button>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      <Dialog open={feedbackOpen} onClose={() => setFeedbackOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          End Session - {selectedSession?.className}
          <IconButton
            aria-label="close"
            onClick={() => setFeedbackOpen(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box p={2}>
            <TextField
              label="Class Notes"
              multiline
              rows={4}
              fullWidth
              value={feedback.classNotes}
              onChange={(e) => setFeedback({ ...feedback, classNotes: e.target.value })}
              sx={{ mb: 2 }}
            />
            
            <List>
              {selectedSession?.attendees?.map((studentId) => (
                <ListItem key={studentId}>
                  <ListItemText 
                    primary={`Student ${studentId}`}
                    secondary={
                      <TextField
                        fullWidth
                        multiline
                        rows={2}
                        placeholder="Enter feedback for this student"
                        value={feedback.studentFeedback[studentId]?.notes || ''}
                        onChange={(e) =>
                          setFeedback({
                            ...feedback,
                            studentFeedback: {
                              ...feedback.studentFeedback,
                              [studentId]: {
                                ...feedback.studentFeedback[studentId],
                                notes: e.target.value,
                              },
                            },
                          })
                        }
                      />
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFeedbackOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmitFeedback} variant="contained" color="primary">
            End Session
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Close Dialog */}
      <Dialog 
        open={bulkCloseDialogOpen} 
        onClose={() => !isBulkClosing && setBulkCloseDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Close All Sessions
          {!isBulkClosing && (
            <IconButton
              aria-label="close"
              onClick={() => setBulkCloseDialogOpen(false)}
              sx={{ position: 'absolute', right: 8, top: 8 }}
            >
              <CloseIcon />
            </IconButton>
          )}
        </DialogTitle>
        <DialogContent>
          {isBulkClosing ? (
            <Box p={2} textAlign="center">
              <CircularProgress variant="determinate" value={bulkCloseProgress} sx={{ mb: 2 }} />
              <Typography>
                Closing sessions... {bulkCloseProgress}% complete
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Please do not close this window
              </Typography>
            </Box>
          ) : (
            <Box p={2}>
              <Typography gutterBottom>
                Are you sure you want to close all {activeSessions.length} active sessions?
              </Typography>
              <Typography color="error" variant="body2">
                This action cannot be undone.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {!isBulkClosing && (
            <>
              <Button onClick={() => setBulkCloseDialogOpen(false)}>Cancel</Button>
              <Button 
                onClick={handleBulkClose} 
                variant="contained" 
                color="error"
                autoFocus
              >
                Close All Sessions
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ActiveSessions;
