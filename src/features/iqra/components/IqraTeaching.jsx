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
  ListItemAvatar,
  IconButton,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Alert,
  Collapse,
  Badge,
  Avatar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  Snackbar,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Edit as EditIcon,
  Assessment as AssessmentIcon,
  Close as CloseIcon,
  Save as SaveIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  People as PeopleIcon,
  Undo as UndoIcon,
  Delete as DeleteIcon,
  Fullscreen,
  FullscreenExit,
  NavigateBefore,
  NavigateNext,
  Stop as StopIcon,
  History as HistoryIcon,
  VideoCall as VideoCallIcon,
} from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import { useSession } from '../contexts/SessionContext';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import IqraBookViewer from './IqraBookViewer';
import PracticeArea from './PracticeArea';
import { Stage, Layer, Line } from 'react-konva';
import EndSessionDialog from './EndSessionDialog';
import { Link } from 'react-router-dom';
import GoogleMeetControls from './GoogleMeetControls';

const IqraTeaching = () => {
  const { currentUser } = useAuth();
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [error, setError] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  const { 
    startSession, 
    activeSession, 
    activeClass,
    updateClassProgress,
    endSession
  } = useSession();

  const [classes, setClasses] = useState([]);
  const [expandedClass, setExpandedClass] = useState(null);
  const [showStudentDetails, setShowStudentDetails] = useState(false);
  const [selectedClassForStudents, setSelectedClassForStudents] = useState(null);
  const [canUndo, setCanUndo] = useState(false);
  const [lines, setLines] = useState([]);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentLine, setCurrentLine] = useState([]);
  const [drawingHistory, setDrawingHistory] = useState([]);
  const practiceAreaRef = React.createRef();
  const stageRef = React.createRef();

  const [openEndSession, setOpenEndSession] = useState(false);
  const [endingSession, setEndingSession] = useState(false);
  const [showMeetControls, setShowMeetControls] = useState(false);
  const [meetError, setMeetError] = useState(null);

  useEffect(() => {
    if (currentUser) {
      loadClasses();
    }
  }, [currentUser]);

  useEffect(() => {
    if (practiceAreaRef.current) {
      const updateSize = () => {
        const { width, height } = practiceAreaRef.current.getBoundingClientRect();
        setStageSize({ width, height });
      };

      updateSize();
      window.addEventListener('resize', updateSize);

      return () => window.removeEventListener('resize', updateSize);
    }
  }, []);

  useEffect(() => {
    setCanUndo(lines.length > 0);
  }, [lines]);

  useEffect(() => {
    if (activeSession) {
      loadSavedDrawing();
    }
  }, [activeSession?.currentPage, activeSession?.book]);

  useEffect(() => {
    if (activeClass?.course?.iqraBooks?.length > 0 && !activeSession) {
      // Extract book number from "Iqra Book X" format
      const firstBook = activeClass.course.iqraBooks[0];
      const bookNumber = firstBook.match(/\d+/)[0];
      console.log('Starting session with first book:', bookNumber);
      handleStartSession(activeClass.id, bookNumber);
    }
  }, [activeClass]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
      if (!document.fullscreenElement && activeSession) {
        updateClassProgress(activeSession.currentPage)
          .catch(error => console.error('Error syncing page:', error));
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [activeSession]);

  useEffect(() => {
    console.log('Active session updated:', activeSession);
    if (activeSession?.meet?.link) {
      console.log('Meet link found:', activeSession.meet.link);
      setShowMeetControls(true);
    } else {
      console.log('No Meet link found in session');
      setShowMeetControls(false);
    }
  }, [activeSession?.meet?.link]);

  const loadSavedDrawing = async () => {
    try {
      if (!activeSession) return;

      const drawingsRef = collection(db, 'drawings');
      let queryRef = query(
        drawingsRef,
        where('classId', '==', activeSession.classId),
        where('page', '==', activeSession.currentPage),
        where('book', '==', activeSession.book)
      );

      if (selectedStudent) {
        queryRef = query(queryRef, where('studentId', '==', selectedStudent.id));
      }

      const querySnapshot = await getDocs(queryRef);
      if (!querySnapshot.empty) {
        // Get the most recent drawing
        const sortedDrawings = querySnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        const mostRecentDrawing = sortedDrawings[0];
        setLines(mostRecentDrawing.lines);
      } else {
        // No saved drawing found, clear the canvas
        setLines([]);
      }
    } catch (error) {
      console.error('Error loading drawing:', error);
      setError('Failed to load saved drawing');
    }
  };

  const loadClasses = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const classesRef = collection(db, 'classes');
      const q = query(classesRef, where('teacherId', '==', currentUser.uid));
      const querySnapshot = await getDocs(q);
      
      const classesData = [];
      for (const docSnapshot of querySnapshot.docs) {
        const classData = docSnapshot.data();
        
        // Fetch course details
        let courseData = null;
        if (classData.courseId) {
          const courseDocRef = doc(db, 'courses', classData.courseId);
          const courseDocSnapshot = await getDoc(courseDocRef);
          if (courseDocSnapshot.exists()) {
            courseData = courseDocSnapshot.data();
            // Ensure book IDs are in the correct format
            if (courseData.iqraBooks) {
              courseData.iqraBooks = courseData.iqraBooks.map(bookId => {
                if (/^iqra-\d+$/i.test(bookId)) {
                  return bookId.toLowerCase();
                }
                const match = bookId.match(/^iqra\s*book\s*(\d+)$/i);
                return match ? `iqra-${match[1]}` : bookId;
              });
            }
          }
        }
        
        // Fetch student details and progress
        const students = [];
        for (const studentId of (classData.studentIds || [])) {
          const studentDocRef = doc(db, 'users', studentId);
          const studentDocSnapshot = await getDoc(studentDocRef);
          if (studentDocSnapshot.exists()) {
            const studentData = studentDocSnapshot.data();
            
            // Get student's progress
            const progressDocRef = doc(db, 'progress', studentId);
            const progressDocSnapshot = await getDoc(progressDocRef);
            const progress = progressDocSnapshot.exists() ? progressDocSnapshot.data() : {};
            
            students.push({
              id: studentId,
              name: studentData.displayName || studentData.email,
              email: studentData.email,
              photoURL: studentData.photoURL,
              progress: progress[classData.courseId] || {
                currentBook: courseData?.iqraBooks?.[0] || 'iqra-1',
                currentPage: 1,
                lastUpdated: null
              }
            });
          }
        }
        
        classesData.push({
          id: docSnapshot.id,
          name: classData.name,
          course: courseData,
          students,
          description: classData.description
        });
      }
      
      setClasses(classesData);
    } catch (error) {
      console.error('Error fetching classes:', error);
      setError('Failed to load classes');
    } finally {
      setLoading(false);
    }
  };

  const handleStartSession = async (classId, bookId) => {
    try {
      // Clean book ID - remove 'iqra-' prefix if present
      const cleanBookId = bookId.replace('iqra-', '');
      console.log('Starting session with book:', cleanBookId);
      await startSession(classId, cleanBookId);
    } catch (error) {
      console.error('Error starting session:', error);
      setError('Failed to start session');
    }
  };

  const handleBookChange = async (newBook) => {
    if (!activeSession || !activeClass) return;
    
    try {
      // Extract book number and clean it
      const bookNumber = newBook.includes('Iqra Book ') 
        ? newBook.match(/\d+/)[0]
        : newBook.replace('iqra-', '');
      
      console.log('Changing to book:', bookNumber);
      await handleStartSession(activeClass.id, bookNumber);
    } catch (error) {
      console.error('Error changing book:', error);
      setError('Failed to change book');
    }
  };

  const handlePageChange = async (newPage) => {
    if (!activeSession) return;

    try {
      await updateClassProgress(newPage);
    } catch (error) {
      console.error('Error updating page:', error);
      setError('Failed to update page');
    }
  };

  const handleStudentIconClick = (classData) => {
    setSelectedClassForStudents(classData);
    setShowStudentDetails(true);
  };

  const loadStudents = async (classData) => {
    try {
      const studentPromises = classData.studentIds.map(async (studentId) => {
        const studentDoc = await getDoc(doc(db, 'users', studentId));
        if (studentDoc.exists()) {
          const studentData = studentDoc.data();
          return {
            id: studentDoc.id,
            displayName: studentData.displayName || 'Unnamed Student',
            photoURL: studentData.photoURL,
            email: studentData.email,
            role: studentData.role,
            phoneNumber: studentData.phoneNumber,
            address: studentData.address,
            bio: studentData.bio,
            progress: classData.studentProgress?.[studentId] || {}
          };
        }
        return null;
      });

      const students = (await Promise.all(studentPromises)).filter(Boolean);
      return students;
    } catch (error) {
      console.error('Error loading students:', error);
      setError('Failed to load student information');
      return [];
    }
  };

  const renderStudentList = (students) => (
    <List>
      {students.map((student) => (
        <ListItem
          key={student.id}
          selected={selectedStudent?.id === student.id}
          onClick={() => setSelectedStudent(student)}
          sx={{ cursor: 'pointer' }}
        >
          <ListItemAvatar>
            <Avatar src={student.photoURL} alt={student.displayName}>
              {student.displayName?.charAt(0)}
            </Avatar>
          </ListItemAvatar>
          <ListItemText
            primary={student.displayName}
            secondary={
              <Box component="div">
                <Box component="span" sx={{ display: 'block' }}>
                  {student.email}
                </Box>
                {student.progress?.currentBook && (
                  <Box component="span" sx={{ display: 'block', fontSize: '0.75rem' }}>
                    Current: Book {student.progress.currentBook}, Page {student.progress.currentPage || 1}
                  </Box>
                )}
              </Box>
            }
          />
        </ListItem>
      ))}
    </List>
  );

  const renderStudentDetailsDialog = () => {
    if (!selectedClassForStudents) return null;

    return (
      <Dialog 
        open={showStudentDetails} 
        onClose={() => setShowStudentDetails(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              Students in {selectedClassForStudents.name}
            </Typography>
            <IconButton onClick={() => setShowStudentDetails(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {renderStudentList(selectedClassForStudents.students)}
        </DialogContent>
      </Dialog>
    );
  };

  const renderClassList = () => (
    <Grid container spacing={3}>
      {classes.map((classData) => (
        <Grid item xs={12} key={classData.id}>
          <Card 
            elevation={3}
            sx={{
              background: 'linear-gradient(to right bottom, #2c3e50, #3498db)',
              color: 'white',
              transition: 'transform 0.2s',
              '&:hover': {
                transform: 'scale(1.01)',
              }
            }}
          >
            <CardContent>
              <Box 
                display="flex" 
                justifyContent="space-between" 
                alignItems="center"
                mb={2}
              >
                <Box>
                  <Typography 
                    variant="h5" 
                    component="h2" 
                    sx={{ 
                      fontWeight: 'bold',
                      mb: 1
                    }}
                  >
                    {classData.name}
                  </Typography>
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      color: 'rgba(255, 255, 255, 0.8)',
                      fontWeight: 500
                    }}
                  >
                    {classData.course?.title || 'No course assigned'}
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={2}>
                  <Box 
                    component="button"
                    onClick={() => handleStudentIconClick(classData)}
                    display="flex" 
                    alignItems="center" 
                    sx={{ 
                      bgcolor: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: 2,
                      px: 2,
                      py: 1,
                      border: 'none',
                      cursor: 'pointer',
                      color: 'inherit',
                      transition: 'all 0.2s',
                      '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 0.2)',
                        transform: 'scale(1.05)'
                      }
                    }}
                  >
                    <PeopleIcon sx={{ mr: 1 }} />
                    <Typography variant="h6">
                      {classData.students.length}
                    </Typography>
                  </Box>
                  <IconButton
                    onClick={() => setExpandedClass(expandedClass === classData.id ? null : classData.id)}
                    sx={{ 
                      color: 'white',
                      bgcolor: 'rgba(255, 255, 255, 0.1)',
                      '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 0.2)'
                      }
                    }}
                  >
                    {expandedClass === classData.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </IconButton>
                </Box>
              </Box>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: 'rgba(255, 255, 255, 0.7)',
                  mb: 2
                }}
              >
                {classData.description}
              </Typography>
            </CardContent>
            <Collapse in={expandedClass === classData.id}>
              <CardContent 
                sx={{ 
                  bgcolor: 'rgba(255, 255, 255, 0.9)',
                  color: 'text.primary',
                  borderRadius: '0 0 4px 4px'
                }}
              >
                <Typography variant="h6" gutterBottom color="primary">
                  Students
                </Typography>
                {renderStudentList(classData.students)}
                <Divider sx={{ my: 2 }} />
                <ListItem>
                  <ListItemText 
                    primary={
                      <Typography variant="subtitle1" color="primary" fontWeight="medium">
                        To use Google Meet, Go to Settings and Connect to Google Calendar before starting a session
                      </Typography>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<PlayIcon />}
                      onClick={() => handleStartSession(classData.id, classData.course.iqraBooks[0])}
                      sx={{
                        boxShadow: 2,
                        '&:hover': {
                          boxShadow: 4
                        }
                      }}
                    >
                      Start Class Session
                    </Button>
                  </ListItemSecondaryAction>
                </ListItem>
              </CardContent>
            </Collapse>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  const handleFullScreen = () => {
    const viewerElement = document.getElementById('book-viewer-container');
    if (!document.fullscreenElement) {
      viewerElement?.requestFullscreen();
      setIsFullScreen(true);
    } else {
      document.exitFullscreen();
      setIsFullScreen(false);
    }
  };

  const renderTeachingSession = () => {
    if (!activeSession) return null;

    const currentClass = classes.find(c => c.id === activeSession.classId);
    const availableBooks = currentClass?.course?.iqraBooks || [];

    return (
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        
        {meetError && (
          <Snackbar 
            open={!!meetError} 
            autoHideDuration={6000} 
            onClose={() => setMeetError(null)}
          >
            <Alert severity="error" onClose={() => setMeetError(null)}>
              {meetError}
            </Alert>
          </Snackbar>
        )}

        {showMeetControls && activeSession?.meet?.link && (
          <GoogleMeetControls 
            meetLink={activeSession.meet.link}
            onError={setMeetError}
          />
        )}

        <Paper sx={{ p: 2, mb: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h6" gutterBottom>
                Teaching Session: {activeClass?.name}
              </Typography>
              <Stack direction="row" spacing={2} alignItems="center">
                <FormControl sx={{ minWidth: 200 }}>
                  <InputLabel id="book-select-label">Book</InputLabel>
                  <Select
                    labelId="book-select-label"
                    id="book-select"
                    value={activeSession.book || ''}
                    label="Book"
                    onChange={(e) => handleBookChange(e.target.value)}
                  >
                    {availableBooks.map((book) => (
                      <MenuItem key={book} value={book}>
                        {book}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Typography variant="subtitle1" color="text.secondary">
                  Page {activeSession?.currentPage}
                </Typography>
              </Stack>
            </Box>
            <Box display="flex" alignItems="center" gap={2}>
              <Box display="flex" alignItems="center">
                {isFullScreen ? (
                  <Tooltip title="Exit Fullscreen">
                    <IconButton onClick={handleFullScreen}>
                      <FullscreenExit />
                    </IconButton>
                  </Tooltip>
                ) : (
                  <Tooltip title="Fullscreen">
                    <IconButton onClick={handleFullScreen}>
                      <Fullscreen />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>

              <Button
                variant="contained"
                color="error"
                onClick={() => setOpenEndSession(true)}
                startIcon={<StopIcon />}
              >
                End Session
              </Button>
            </Box>
          </Box>
        </Paper>

        <Box flex={1} id="book-viewer-container">
          <IqraBookViewer
            bookId={activeSession.book.replace('Iqra Book ', '')}
            currentPage={activeSession.currentPage}
            onPageChange={handlePageChange}
            readOnly={false}
          />
        </Box>
      </Box>
    );
  };

  const handleMouseDown = (e) => {
    setIsDrawing(true);
    const pos = e.target.getStage().getPointerPosition();
    setCurrentLine([pos.x, pos.y]);
    setDrawingHistory([...lines]);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;

    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    setCurrentLine([...currentLine, point.x, point.y]);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    if (currentLine.length > 0) {
      setLines([
        ...lines,
        {
          points: currentLine
        },
      ]);
      setCurrentLine([]);
    }
  };

  const handleUndo = () => {
    if (drawingHistory.length > 0) {
      setLines(drawingHistory);
      setDrawingHistory([]);
    }
  };

  const handleClear = () => {
    setDrawingHistory([...lines]);
    setLines([]);
  };

  const handleSaveDrawing = async () => {
    try {
      if (!activeSession) return;

      const drawingData = {
        lines,
        page: activeSession.currentPage,
        book: activeSession.book,
        timestamp: new Date().toISOString(),
        classId: activeSession.classId,
        studentId: selectedStudent?.id
      };

      // Save to Firestore
      const drawingsRef = collection(db, 'drawings');
      await addDoc(drawingsRef, drawingData);

      // Show success message
      setError('Drawing saved successfully!');
      setTimeout(() => setError(null), 3000);
    } catch (error) {
      console.error('Error saving drawing:', error);
      setError('Failed to save drawing');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          Iqra Teaching Dashboard
        </Typography>
        <Button
          component={Link}
          to="/sessions/history"
          startIcon={<HistoryIcon />}
          variant="outlined"
        >
          View Session History
        </Button>
      </Stack>
      
      {activeSession ? renderTeachingSession() : renderClassList()}
      {renderStudentDetailsDialog()}
      <EndSessionDialog
        open={openEndSession}
        onClose={() => setOpenEndSession(false)}
        students={activeClass?.students?.map(student => ({
          id: student.id,
          name: student.name,
          email: student.email,
          photoURL: student.photoURL,
          role: student.role,
          displayName: student.displayName || student.name
        })) || []}
        currentBook={activeSession?.book}
        startPage={activeSession?.startPage}
        endPage={activeSession?.currentPage}
        loading={endingSession}
        error={error}
        onSave={async (feedback) => {
          try {
            setEndingSession(true);
            await endSession(feedback);
            setOpenEndSession(false);
            // Redirect to dashboard or show success message
          } catch (error) {
            console.error('Error ending session:', error);
            setError('Failed to end session: ' + error.message);
          } finally {
            setEndingSession(false);
          }
        }}
      />
    </Box>
  );
};

export default IqraTeaching;
