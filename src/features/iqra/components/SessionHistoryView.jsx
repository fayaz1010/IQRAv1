import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Stack,
  Divider,
  Avatar,
  Rating,
  Grid,
  IconButton,
  Tooltip,
  Tab,
  Tabs,
  CircularProgress,
  Alert,
  Link
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  CalendarToday as CalendarIcon,
  MenuBook as BookIcon,
  School as SchoolIcon,
  Person as PersonIcon,
  Download as DownloadIcon,
  VideoCall as VideoCallIcon
} from '@mui/icons-material';
import { collection, query, where, getDocs, getDoc, doc, orderBy } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { format } from 'date-fns';

const SessionHistoryView = ({ classId, studentId, currentUser }) => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedSession, setExpandedSession] = useState(null);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    loadSessions();
  }, [classId, studentId, currentUser]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      setError(null);

      let sessionsQuery;
      if (currentUser.role === 'admin') {
        sessionsQuery = query(
          collection(db, 'sessions'),
          where('status', '==', 'completed'),
          orderBy('date', 'desc')
        );
      } else if (currentUser.role === 'teacher') {
        sessionsQuery = query(
          collection(db, 'sessions'),
          where('teacherId', '==', currentUser.uid),
          where('status', '==', 'completed'),
          orderBy('date', 'desc')
        );
      } else if (currentUser.role === 'student') {
        sessionsQuery = query(
          collection(db, 'sessions'),
          where('status', '==', 'completed'),
          where(`studentProgress.${currentUser.uid}`, '!=', null),
          orderBy('date', 'desc')
        );
      }

      if (!sessionsQuery) {
        setError('Unauthorized access');
        return;
      }

      const sessionsSnapshot = await getDocs(sessionsQuery);
      const sessionsData = [];

      for (const docSnapshot of sessionsSnapshot.docs) {
        const sessionData = {
          id: docSnapshot.id,
          ...docSnapshot.data()
        };

        // Load class data
        const classDoc = await getDoc(doc(db, 'classes', sessionData.classId));
        if (classDoc.exists()) {
          sessionData.classData = {
            id: classDoc.id,
            ...classDoc.data()
          };

          // Load course data
          if (sessionData.classData.courseId) {
            const courseDoc = await getDoc(doc(db, 'courses', sessionData.classData.courseId));
            if (courseDoc.exists()) {
              sessionData.classData.course = courseDoc.data();
            }
          }
        }

        sessionsData.push(sessionData);
      }

      setSessions(sessionsData);
    } catch (error) {
      console.error('Error loading sessions:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAccordionChange = (sessionId) => (event, isExpanded) => {
    setExpandedSession(isExpanded ? sessionId : null);
  };

  const renderSessionHeader = (session) => (
    <Grid container spacing={2} alignItems="center">
      <Grid item>
        <CalendarIcon color="action" />
      </Grid>
      <Grid item xs>
        <Typography variant="subtitle1">
          {format(new Date(session.date), 'PPP')} at {session.startTime}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {session.classData?.name} • {session.classData?.course?.name} • Book {session.book}
        </Typography>
      </Grid>
      <Grid item>
        <Chip 
          label={`Pages ${session.startPage}-${session.endPage}`}
          size="small"
          color="primary"
        />
      </Grid>
      {session.meet?.link && (
        <Grid item>
          <Link 
            href={session.meet.link}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ display: 'flex', alignItems: 'center' }}
          >
            <VideoCallIcon sx={{ mr: 1 }} />
            Join Google Meet
          </Link>
        </Grid>
      )}
    </Grid>
  );

  const renderStudentFeedback = (session, student) => {
    const feedback = session.feedback?.studentFeedback?.[student.id];
    if (!feedback) return null;

    return (
      <Box sx={{ mt: 2 }}>
        <Paper sx={{ p: 2, bgcolor: 'background.neutral' }}>
          <Stack spacing={2}>
            <Box display="flex" alignItems="center" gap={2}>
              <Avatar src={student.photoURL} sx={{ bgcolor: 'primary.main' }}>
                {student.displayName?.charAt(0) || student.name?.charAt(0) || 'S'}
              </Avatar>
              <Box>
                <Typography variant="subtitle1">
                  {student.displayName || student.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Student ID: {student.id}
                </Typography>
              </Box>
            </Box>

            {/* Assessment Ratings */}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <Typography component="legend">Reading</Typography>
                <Rating value={feedback.assessment?.reading || 0} readOnly />
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography component="legend">Pronunciation</Typography>
                <Rating value={feedback.assessment?.pronunciation || 0} readOnly />
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography component="legend">Memorization</Typography>
                <Rating value={feedback.assessment?.memorization || 0} readOnly />
              </Grid>
            </Grid>

            {/* Page Notes */}
            {Object.entries(feedback.pageNotes || {}).length > 0 && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>Page Notes</Typography>
                <Stack spacing={1}>
                  {Object.entries(feedback.pageNotes).map(([page, note]) => (
                    note && (
                      <Paper key={page} sx={{ p: 1, bgcolor: 'background.paper' }}>
                        <Typography variant="caption" color="primary">Page {page}</Typography>
                        <Typography variant="body2">{note}</Typography>
                      </Paper>
                    )
                  ))}
                </Stack>
              </Box>
            )}

            {/* Additional Notes */}
            {feedback.notes && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>Additional Notes</Typography>
                <Typography variant="body2">{feedback.notes}</Typography>
              </Box>
            )}
          </Stack>
        </Paper>
      </Box>
    );
  };

  const renderSessionContent = (session) => {
    return (
      <Box>
        {/* Session Overview */}
        <Stack direction="row" spacing={2} alignItems="center" mb={2}>
          <BookIcon color="primary" />
          <Typography>
            {session.book} - Pages {session.startPage} to {session.endPage}
          </Typography>
          <Tooltip title="Download Report">
            <IconButton size="small">
              <DownloadIcon />
            </IconButton>
          </Tooltip>
        </Stack>

        <Divider sx={{ mb: 2 }} />

        {/* Tabs for Class/Individual Feedback */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
            <Tab 
              icon={<SchoolIcon />} 
              label="Class Feedback" 
              iconPosition="start"
            />
            <Tab 
              icon={<PersonIcon />} 
              label="Student Feedback" 
              iconPosition="start"
            />
          </Tabs>
        </Box>

        {/* Class Feedback Tab */}
        {activeTab === 0 && (
          <Box>
            {session.feedback?.classNotes ? (
              <Typography>{session.feedback.classNotes}</Typography>
            ) : (
              <Typography color="text.secondary">No class feedback provided</Typography>
            )}
          </Box>
        )}

        {/* Student Feedback Tab */}
        {activeTab === 1 && (
          <Stack spacing={2}>
            {session.students.map((student) => (
              <Paper key={student.id} sx={{ p: 2 }}>
                {renderStudentFeedback(session, student)}
              </Paper>
            ))}
          </Stack>
        )}
      </Box>
    );
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ px: 2, pt: 2 }}>
        Session History
      </Typography>

      {sessions.length === 0 ? (
        <Alert severity="info" sx={{ m: 2 }}>No sessions found</Alert>
      ) : (
        <Stack spacing={2} sx={{ p: 2 }}>
          {sessions.map((session) => (
            <Accordion
              key={session.id}
              expanded={expandedSession === session.id}
              onChange={handleAccordionChange(session.id)}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                {renderSessionHeader(session)}
              </AccordionSummary>
              <AccordionDetails>
                {renderSessionContent(session)}
              </AccordionDetails>
            </Accordion>
          ))}
        </Stack>
      )}
    </Box>
  );
};

export default SessionHistoryView;
