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
  Link,
  ImageList,
  ImageListItem,
  Dialog,
  DialogContent,
  Button
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  CalendarToday as CalendarIcon,
  MenuBook as BookIcon,
  School as SchoolIcon,
  Person as PersonIcon,
  Download as DownloadIcon,
  VideoCall as VideoCallIcon,
  Draw as DrawIcon,
  ZoomIn as ZoomInIcon,
  NavigateBefore as PrevIcon,
  NavigateNext as NextIcon
} from '@mui/icons-material';
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  orderBy
} from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { format } from 'date-fns';

const SessionHistoryView = ({ classId, studentId, currentUser }) => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedSession, setExpandedSession] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedDrawing, setSelectedDrawing] = useState(null);
  const [currentSessionIndex, setCurrentSessionIndex] = useState(0);

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
          orderBy('date', 'desc')
        );
      }

      if (!sessionsQuery) {
        setError('Unauthorized access');
        return;
      }

      const sessionsSnapshot = await getDocs(sessionsQuery);
      const sessionsData = [];

      for (const sessionDoc of sessionsSnapshot.docs) {
        const sessionData = {
          id: sessionDoc.id,
          ...sessionDoc.data()
        };

        if (currentUser.role === 'student') {
          if (!sessionData.studentProgress?.[currentUser.uid] || 
              (classId && sessionData.classId !== classId)) {
            continue;
          }
        }

        if (sessionData.classId) {
          const classDocRef = doc(db, 'classes', sessionData.classId);
          const classDocSnapshot = await getDoc(classDocRef);
          if (classDocSnapshot.exists()) {
            sessionData.class = {
              id: classDocSnapshot.id,
              ...classDocSnapshot.data()
            };
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
          {session.class?.name} • {session.class?.course?.name} • Book {session.book}
        </Typography>
      </Grid>
      <Grid item>
        <Chip 
          label={`Pages ${session.startPage}-${session.endPage}`}
          size="small"
          color="primary"
        />
      </Grid>
    </Grid>
  );

  const TabPanel = (props) => {
    const { children, value, index, ...other } = props;
    return (
      <div
        role="tabpanel"
        hidden={value !== index}
        id={`tabpanel-${index}`}
        aria-labelledby={`tab-${index}`}
        {...other}
      >
        {value === index && (
          <Box sx={{ p: 2 }}>
            {children}
          </Box>
        )}
      </div>
    );
  };

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

  const renderDrawings = (session) => {
    if (!session.drawings || !session.drawings[currentUser.uid]) {
      return (
        <Typography color="text.secondary">No drawings available for this session</Typography>
      );
    }

    const drawings = session.drawings[currentUser.uid];
    
    return (
      <Box>
        <Typography variant="subtitle2" gutterBottom>Your Drawings</Typography>
        <ImageList cols={3} gap={8}>
          {drawings.map((drawing, index) => (
            <ImageListItem 
              key={index}
              onClick={() => setSelectedDrawing(drawing)}
              sx={{ cursor: 'pointer' }}
            >
              <img
                src={drawing.url}
                alt={`Drawing ${index + 1}`}
                loading="lazy"
                style={{ borderRadius: 4 }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  bgcolor: 'rgba(0,0,0,0.5)',
                  color: 'white',
                  p: 0.5,
                  textAlign: 'center',
                  borderBottomLeftRadius: 4,
                  borderBottomRightRadius: 4
                }}
              >
                <Typography variant="caption">Page {drawing.page}</Typography>
              </Box>
            </ImageListItem>
          ))}
        </ImageList>
      </Box>
    );
  };

  const renderSessionContent = (session) => {
    const isStudent = currentUser.role === 'student';
    
    return (
      <Box>
        {/* Session Overview */}
        <Stack direction="row" spacing={2} alignItems="center" mb={2}>
          <BookIcon color="primary" />
          <Typography>
            {session.book} - Pages {session.startPage} to {session.endPage}
          </Typography>
          {!isStudent && (
            <Tooltip title="Download Report">
              <IconButton size="small">
                <DownloadIcon />
              </IconButton>
            </Tooltip>
          )}
        </Stack>

        <Divider sx={{ mb: 2 }} />

        {/* Tabs for different views */}
        <Box sx={{ width: '100%' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} aria-label="session tabs">
              {isStudent ? (
                <>
                  <Tab 
                    icon={<PersonIcon />} 
                    label="My Feedback" 
                    iconPosition="start"
                    id="tab-0"
                    aria-controls="tabpanel-0"
                  />
                  <Tab 
                    icon={<DrawIcon />} 
                    label="My Writing" 
                    iconPosition="start"
                    id="tab-1"
                    aria-controls="tabpanel-1"
                  />
                </>
              ) : (
                <>
                  <Tab 
                    icon={<SchoolIcon />} 
                    label="Class Feedback" 
                    iconPosition="start"
                    id="tab-0"
                    aria-controls="tabpanel-0"
                  />
                  <Tab 
                    icon={<PersonIcon />} 
                    label="Student Feedback" 
                    iconPosition="start"
                    id="tab-1"
                    aria-controls="tabpanel-1"
                  />
                </>
              )}
            </Tabs>
          </Box>

          {isStudent ? (
            <>
              <TabPanel value={activeTab} index={0}>
                {renderStudentFeedback(session, { id: currentUser.uid })}
              </TabPanel>
              <TabPanel value={activeTab} index={1}>
                {renderDrawings(session)}
              </TabPanel>
            </>
          ) : (
            <>
              <TabPanel value={activeTab} index={0}>
                {session.feedback?.classNotes ? (
                  <Typography>{session.feedback.classNotes}</Typography>
                ) : (
                  <Typography color="text.secondary">No class feedback provided</Typography>
                )}
              </TabPanel>
              <TabPanel value={activeTab} index={1}>
                <Stack spacing={2}>
                  {session.students?.map((student) => (
                    <Paper key={student.id} sx={{ p: 2 }}>
                      {renderStudentFeedback(session, student)}
                    </Paper>
                  ))}
                </Stack>
              </TabPanel>
            </>
          )}
        </Box>
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

      {/* Session Navigation */}
      {sessions.length > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 2, mb: 2 }}>
          <Button
            startIcon={<PrevIcon />}
            disabled={currentSessionIndex === 0}
            onClick={() => setCurrentSessionIndex(prev => prev - 1)}
          >
            Previous Session
          </Button>
          <Typography color="text.secondary">
            Session {currentSessionIndex + 1} of {sessions.length}
          </Typography>
          <Button
            endIcon={<NextIcon />}
            disabled={currentSessionIndex === sessions.length - 1}
            onClick={() => setCurrentSessionIndex(prev => prev + 1)}
          >
            Next Session
          </Button>
        </Box>
      )}

      {sessions.length > 0 ? (
        <Box sx={{ px: 2 }}>
          <Accordion
            expanded={expandedSession === sessions[currentSessionIndex].id}
            onChange={handleAccordionChange(sessions[currentSessionIndex].id)}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              {renderSessionHeader(sessions[currentSessionIndex])}
            </AccordionSummary>
            <AccordionDetails>
              {renderSessionContent(sessions[currentSessionIndex])}
            </AccordionDetails>
          </Accordion>
        </Box>
      ) : (
        <Typography color="text.secondary" sx={{ p: 2 }}>
          No sessions found
        </Typography>
      )}

      {/* Drawing Preview Dialog */}
      <Dialog
        open={!!selectedDrawing}
        onClose={() => setSelectedDrawing(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogContent>
          {selectedDrawing && (
            <img
              src={selectedDrawing.url}
              alt="Drawing Preview"
              style={{ width: '100%', height: 'auto' }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default SessionHistoryView;
