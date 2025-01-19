import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Stack,
  CircularProgress,
  Alert,
  Tooltip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  IconButton
} from '@mui/material';
import {
  School as SchoolIcon,
  Schedule as ScheduleIcon,
  Assignment as AssignmentIcon,
  TrendingUp as TrendingUpIcon,
  PlayCircle as PlayCircleIcon,
  VideoCall as VideoCallIcon,
  Book as BookIcon,
  Mic as MicIcon,
  Stop as StopIcon,
  NavigateBefore,
  NavigateNext,
  Save as SaveIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useSession } from '../../features/iqra/contexts/SessionContext';
import { useNavigate } from 'react-router-dom';
import { db, storage } from '../../config/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit, 
  doc, 
  getDoc, 
  onSnapshot,
  serverTimestamp,
  setDoc,
  writeBatch,
  updateDoc,
  arrayUnion
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { format, addMinutes, isBefore, isAfter } from 'date-fns';
import DashboardStats from '../../components/dashboard/DashboardStats';
import DrawingCanvas from '../../features/iqra/components/DrawingCanvas';
import IqraBookViewer from '../../features/iqra/components/IqraBookViewer';
import IqraBookService from '../../features/iqra/services/IqraBookService';
import { StudentStatsService } from '../../services/StudentStatsService';

// Stats Card Component
const StatsCard = ({ title, value, icon: Icon, color = 'primary' }) => (
  <Card component={motion.div} whileHover={{ scale: 1.02 }}>
    <CardContent>
      <Box display="flex" alignItems="center" mb={2}>
        <Icon color={color} />
        <Typography variant="h6" ml={1}>{title}</Typography>
      </Box>
      <Typography variant="h4">{value}</Typography>
    </CardContent>
  </Card>
);

// Learning Progress Component
const LearningProgress = ({ progress, classesCount }) => (
  <Paper sx={{ p: 3, height: '100%' }}>
    <Typography variant="h6" gutterBottom>Learning Progress</Typography>
    <Grid container spacing={2}>
      <Grid item xs={6}>
        <Box textAlign="center">
          <Typography variant="h4">{progress}%</Typography>
          <Typography variant="body2" color="text.secondary">Overall Progress</Typography>
        </Box>
      </Grid>
      <Grid item xs={6}>
        <Box textAlign="center">
          <Typography variant="h4">{classesCount}</Typography>
          <Typography variant="body2" color="text.secondary">Active Classes</Typography>
        </Box>
      </Grid>
    </Grid>
  </Paper>
);

// Active and Upcoming Sessions Component
const SessionsList = ({ activeSessions, upcomingClasses, onJoinSession }) => {
  const now = new Date();

  if (!activeSessions?.length && !upcomingClasses?.length) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        No active or upcoming classes at the moment.
      </Alert>
    );
  }

  const formatSessionTime = (timeValue) => {
    try {
      if (!timeValue) {
        console.log('Debug - No time value provided');
        return 'Time not set';
      }
      const date = new Date(timeValue);
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.log('Debug - Invalid date:', timeValue);
        return 'Invalid time';
      }
      return format(date, 'h:mm a');
    } catch (error) {
      console.error('Error formatting time:', error, timeValue);
      return 'Invalid time';
    }
  };

  console.log('Debug - Rendering SessionsList with:', {
    activeSessions: activeSessions?.length,
    upcomingClasses: upcomingClasses?.length,
    firstClass: upcomingClasses?.[0]
  });

  if (!activeSessions?.length && !upcomingClasses?.length) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        No active or upcoming classes at the moment.
      </Alert>
    );
  }

  return (
    <List>
      {/* Active Sessions */}
      {activeSessions.map((session) => (
        <ListItem
          key={session.id}
          sx={{
            mb: 1,
            borderRadius: 1,
            bgcolor: 'action.selected',
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          <ListItemText
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {session.className}
                <Chip
                  size="small"
                  color="success"
                  label="Active Now"
                />
              </Box>
            }
            secondary={
              <Stack direction="column" spacing={1}>
                <Typography variant="body2">
                  Started at {formatSessionTime(session.startTime)}
                </Typography>
                {session.currentPage && (
                  <Typography variant="body2">
                    Current Page: {session.currentPage}
                  </Typography>
                )}
                {session.meetLink && (
                  <Chip
                    size="small"
                    icon={<VideoCallIcon />}
                    label="Meet Available"
                    color="primary"
                    variant="outlined"
                  />
                )}
              </Stack>
            }
          />
          <ListItemSecondaryAction>
            <Button
              variant="contained"
              color="primary"
              onClick={() => onJoinSession(session)}
              startIcon={<VideoCallIcon />}
            >
              Join Now
            </Button>
          </ListItemSecondaryAction>
        </ListItem>
      ))}

      {/* Divider if both types present */}
      {activeSessions.length > 0 && upcomingClasses.length > 0 && (
        <Divider sx={{ my: 2 }}>Upcoming Classes</Divider>
      )}

      {/* Upcoming Classes */}
      {upcomingClasses.map((classItem) => {
        const sessionStart = new Date(classItem.startTime);
        const now = new Date('2025-01-07T01:19:00+08:00');
        const joinWindow = addMinutes(sessionStart, -15);
        const canJoin = isAfter(now, joinWindow) && isBefore(now, addMinutes(sessionStart, classItem.duration || 60));

        return (
          <ListItem
            key={classItem.id}
            sx={{
              mb: 1,
              borderRadius: 1,
              bgcolor: canJoin ? 'action.hover' : 'background.paper',
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            <ListItemText
              primary={classItem.className}
              secondary={
                <Stack direction="column" spacing={0.5}>
                  <Typography variant="body2">
                    {formatSessionTime(classItem.startTime)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Teacher: {classItem.teacherName || 'Not assigned'}
                  </Typography>
                </Stack>
              }
            />
            <ListItemSecondaryAction>
              {canJoin ? (
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={() => onJoinSession(classItem)}
                  startIcon={<VideoCallIcon />}
                >
                  Join Early
                </Button>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {formatSessionTime(classItem.startTime)}
                </Typography>
              )}
            </ListItemSecondaryAction>
          </ListItem>
        );
      })}
    </List>
  );
};

// Upcoming Sessions Schedule Component
const UpcomingSessionsSchedule = ({ upcomingClasses, onJoinSession }) => {
  const now = new Date();
  const today = new Date(now);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Group sessions by date
  const groupedSessions = upcomingClasses.reduce((acc, session) => {
    const sessionDate = new Date(session.startTime); // Changed from session.date
    const isToday = sessionDate.toDateString() === today.toDateString();
    const isTomorrow = sessionDate.toDateString() === tomorrow.toDateString();
    
    let key;
    if (isToday) key = 'Today';
    else if (isTomorrow) key = 'Tomorrow';
    else key = format(sessionDate, 'EEEE, MMM dd');

    if (!acc[key]) acc[key] = [];
    acc[key].push(session);
    return acc;
  }, {});

  if (!upcomingClasses.length) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        No upcoming classes scheduled.
      </Alert>
    );
  }

  return (
    <Box>
      {Object.entries(groupedSessions).map(([date, sessions]) => (
        <Box key={date} mb={3}>
          <Typography variant="h6" color="primary" gutterBottom>
            {date}
          </Typography>
          <List>
            {sessions.map((session) => {
              const sessionStart = new Date(session.startTime);
              const joinWindow = addMinutes(sessionStart, -15);
              const canJoin = isAfter(now, joinWindow) && isBefore(now, addMinutes(sessionStart, session.duration || 60));
              const isStartingSoon = isAfter(now, addMinutes(joinWindow, 10)); // 5 mins before join window

              return (
                <ListItem
                  key={session.id}
                  sx={{
                    mb: 1,
                    borderRadius: 1,
                    bgcolor: canJoin ? 'success.light' : isStartingSoon ? 'warning.light' : 'background.paper',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1">
                          {session.className}
                        </Typography>
                        {canJoin && (
                          <Chip
                            size="small"
                            color="success"
                            label="Join Now"
                          />
                        )}
                        {isStartingSoon && !canJoin && (
                          <Chip
                            size="small"
                            color="warning"
                            label="Starting Soon"
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Stack spacing={1}>
                        <Typography variant="body2" color="text.secondary">
                          {format(sessionStart, 'h:mm a')} - {format(addMinutes(sessionStart, session.duration || 60), 'h:mm a')}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Teacher: {session.teacherName}
                        </Typography>
                        {session.currentPage && (
                          <Typography variant="body2" color="text.secondary">
                            Current Page: {session.currentPage}
                          </Typography>
                        )}
                        {session.meetLink && (
                          <Chip
                            size="small"
                            icon={<VideoCallIcon />}
                            label="Google Meet"
                            color="primary"
                            variant="outlined"
                          />
                        )}
                      </Stack>
                    }
                  />
                  <ListItemSecondaryAction>
                    {canJoin ? (
                      <Button
                        variant="contained"
                        color="success"
                        onClick={() => onJoinSession(session)}
                        startIcon={<VideoCallIcon />}
                      >
                        Join Now
                      </Button>
                    ) : isStartingSoon ? (
                      <Button
                        variant="outlined"
                        color="warning"
                        onClick={() => onJoinSession(session)}
                        startIcon={<VideoCallIcon />}
                      >
                        Join Early
                      </Button>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        {format(sessionStart, 'h:mm a')}
                      </Typography>
                    )}
                  </ListItemSecondaryAction>
                </ListItem>
              );
            })}
          </List>
        </Box>
      ))}
    </Box>
  );
};

// Practice Section Component
const PracticeSection = ({ 
  availableCourses, 
  selectedCourse,
  onSelectCourse,
  selectedBook,
  onSelectBook,
  currentPage,
  onPageChange,
  isRecording,
  onStartRecording,
  onStopRecording,
  onSaveDrawing,
  loading,
  error 
}) => {
  const canvasRef = useRef(null);

  if (loading) {
    return <CircularProgress />;
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>Practice Area</Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          {/* Course Selection */}
          <Box mb={3}>
            <Typography variant="subtitle2" gutterBottom>Select Course</Typography>
            <Select
              fullWidth
              value={selectedCourse?.id || ''}
              onChange={(e) => {
                const course = availableCourses.find(c => c.id === e.target.value);
                onSelectCourse(course);
              }}
            >
              {availableCourses.map((course) => (
                <MenuItem key={course.id} value={course.id}>
                  {course.name}
                </MenuItem>
              ))}
            </Select>
          </Box>

          {selectedCourse && (
            <>
              {/* Book Selection */}
              <Box mb={3}>
                <Typography variant="subtitle2" gutterBottom>Select Book</Typography>
                <Select
                  fullWidth
                  value={selectedBook?.id || ''}
                  onChange={(e) => {
                    const book = selectedCourse.books.find(b => b.id === e.target.value);
                    onSelectBook(book);
                  }}
                >
                  {selectedCourse.books.map((book) => (
                    <MenuItem key={book.id} value={book.id}>
                      {book.name}
                    </MenuItem>
                  ))}
                </Select>
              </Box>

              {/* Practice Controls */}
              <Stack direction="row" spacing={2} mb={2}>
                <Button
                  variant="contained"
                  color={isRecording ? "error" : "primary"}
                  startIcon={isRecording ? <StopIcon /> : <MicIcon />}
                  onClick={isRecording ? onStopRecording : onStartRecording}
                >
                  {isRecording ? 'Stop Recording' : 'Start Recording'}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<SaveIcon />}
                  onClick={onSaveDrawing}
                >
                  Save Drawing
                </Button>
              </Stack>

              {/* Navigation Controls */}
              <Stack direction="row" spacing={2} justifyContent="center">
                <IconButton 
                  onClick={() => onPageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                >
                  <NavigateBefore />
                </IconButton>
                <Typography variant="body1" sx={{ alignSelf: 'center' }}>
                  Page {currentPage}
                </Typography>
                <IconButton 
                  onClick={() => onPageChange(currentPage + 1)}
                  disabled={currentPage >= (selectedBook?.totalPages || 30)}
                >
                  <NavigateNext />
                </IconButton>
              </Stack>
            </>
          )}
        </Grid>

        <Grid item xs={12} md={8}>
          {selectedBook && (
            <Box sx={{ width: '100%', height: '500px', position: 'relative' }}>
              <IqraBookViewer
                bookId={selectedBook.id}
                page={currentPage}
                onPageChange={onPageChange}
              />
              <DrawingCanvas
                ref={canvasRef}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  zIndex: 2
                }}
              />
            </Box>
          )}
        </Grid>
      </Grid>
    </Paper>
  );
};

const StudentDashboard = () => {
  const { currentUser: user, loading: authLoading } = useAuth();
  const { joinSession } = useSession();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    activeClasses: 0,
    enrolledCourses: 0,
    progress: 0,
    todayClasses: 0,
    assignments: 0,
    lastClass: null,
    currentIqraProgress: {
      book: null,
      page: 0,
      totalPages: 0
    },
    dateJoined: null,
    notifications: [],
    unreadMessages: 0
  });

  // Debug log for stats
  useEffect(() => {
    console.log('Debug - Dashboard Stats:', stats);
  }, [stats]);

  const [upcomingClasses, setUpcomingClasses] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedBook, setSelectedBook] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordingData, setRecordingData] = useState([]);
  const [savingDrawing, setSavingDrawing] = useState(false);
  const [joiningSession, setJoiningSession] = useState(false);

  useEffect(() => {
    let mounted = true;
    let unsubscribeActiveSessions = null;

    const init = async () => {
      if (authLoading) {
        console.log('Debug - Auth still loading, skipping init');
        return;
      }
      
      if (!user) {
        console.log('Debug - No user found, skipping init');
        return;
      }
      
      console.log('Debug - Initializing dashboard for user:', user.uid);
      
      try {
        setLoading(true);
        setError(null);
        
        const statsService = new StudentStatsService(user.uid);
        
        // Get comprehensive stats first
        const newStats = await statsService.getComprehensiveStats();
        if (mounted) {
          console.log('Debug - Setting new stats:', newStats);
          setStats(newStats);
        }
        
        // Get upcoming classes
        const classes = await statsService.getUpcomingClasses();
        if (mounted) {
          console.log('Debug - Setting upcoming classes:', classes);
          setUpcomingClasses(classes);
        }
        
        // Load enrolled courses and setup active sessions listener
        await Promise.all([
          loadEnrolledCoursesAndClasses(),
          setupActiveSessionsListener()
        ]);
        
        if (mounted) {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error initializing dashboard:', error);
        if (mounted) {
          setError('Failed to initialize dashboard');
          setLoading(false);
        }
      }
    };

    const setupActiveSessionsListener = async () => {
      try {
        // First get all classes the student is enrolled in
        const classesRef = collection(db, 'classes');
        const classesQuery = query(
          classesRef,
          where('studentIds', 'array-contains', user.uid)
        );
        const classesSnapshot = await getDocs(classesQuery);
        const classIds = classesSnapshot.docs.map(doc => doc.id);

        if (classIds.length === 0) {
          setActiveSessions([]);
          return;
        }

        // Only show sessions that started in the last 24 hours
        const now = new Date('2025-01-07T00:18:14+08:00');
        const twentyFourHoursAgo = new Date(now);
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

        // Now listen for active sessions from these classes
        const sessionsRef = collection(db, 'sessions');
        const activeSessionsQuery = query(
          sessionsRef,
          where('classId', 'in', classIds.slice(0, 10)), // Limit to first 10 classes
          where('status', '==', 'active'),
          orderBy('startTime', 'desc')
        );

        const unsubscribe = onSnapshot(activeSessionsQuery, async (snapshot) => {
          if (!mounted) return;

          const sessionsMap = new Map(); // Map to store latest session per class
          
          for (const doc of snapshot.docs) {
            const sessionData = doc.data();
            const startTime = new Date(sessionData.startTime);
            const lastActivity = new Date(sessionData.lastActivity || sessionData.startTime);
            
            // Skip sessions that are too old or inactive
            if (startTime <= twentyFourHoursAgo || 
                (now.getTime() - lastActivity.getTime()) > 30 * 60 * 1000) {
              // Mark old sessions as completed
              try {
                await updateDoc(doc.ref, {
                  status: 'completed'
                });
              } catch (error) {
                console.error('Error marking session as completed:', error);
              }
              continue;
            }

            const classDoc = classesSnapshot.docs.find(c => c.id === sessionData.classId);
            if (classDoc) {
              const classData = classDoc.data();
              const session = {
                id: doc.id,
                classId: sessionData.classId,
                className: classData.name,
                teacherName: classData.teacherName,
                startTime: sessionData.startTime,
                currentPage: sessionData.currentPage,
                meet: sessionData.meet,
                lastActivity: sessionData.lastActivity,
                ...sessionData
              };

              // Only keep the most recent session per class
              const existingSession = sessionsMap.get(sessionData.classId);
              if (!existingSession || new Date(session.startTime) > new Date(existingSession.startTime)) {
                sessionsMap.set(sessionData.classId, session);
              }
            }
          }

          // Convert map values to array and sort by start time
          const sessions = Array.from(sessionsMap.values())
            .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
          
          setActiveSessions(sessions);
        }, error => {
          console.error('Error in active sessions listener:', error);
          setError('Failed to load active sessions');
        });

        return () => {
          unsubscribe();
        };
      } catch (error) {
        console.error('Error setting up active sessions listener:', error);
        setError('Failed to load active sessions');
      }
    };

    const loadEnrolledCoursesAndClasses = async () => {
      try {
        const classesRef = collection(db, 'classes');
        const q = query(classesRef, where('studentIds', 'array-contains', user.uid));
        const querySnapshot = await getDocs(q);
        
        const coursesMap = new Map();
        
        for (const classDoc of querySnapshot.docs) {
          const classData = { id: classDoc.id, ...classDoc.data() };
          
          if (!classData.courseId) continue;

          const courseRef = doc(db, 'courses', classData.courseId);
          const courseDoc = await getDoc(courseRef);
          
          if (courseDoc.exists()) {
            const courseData = { id: courseDoc.id, ...courseDoc.data() };
            
            const books = await Promise.all((courseData.iqraBooks || []).map(async (bookName) => {
              const bookId = bookName.toLowerCase().replace(/\s+book\s+/i, '-');
              const bookRef = doc(db, 'iqra-books', bookId);
              const bookDoc = await getDoc(bookRef);
              
              if (!bookDoc.exists()) {
                await setDoc(bookRef, {
                  id: bookId,
                  name: bookName,
                  totalPages: 30,
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp()
                });
              }
              
              return {
                id: bookId,
                name: bookName,
                totalPages: 30
              };
            }));
            
            coursesMap.set(classData.courseId, {
              ...courseData,
              books,
              classes: [...(coursesMap.get(classData.courseId)?.classes || []), classData]
            });
          }
        }
        
        setAvailableCourses(Array.from(coursesMap.values()));
      } catch (err) {
        console.error('Error loading courses:', err);
        setError('Failed to load your courses. Please try again.');
      }
    };

    init();

    return () => {
      mounted = false;
      if (unsubscribeActiveSessions) {
        unsubscribeActiveSessions();
      }
    };
  }, [user, authLoading]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;

      try {
        setLoading(true);
        const statsService = new StudentStatsService(user.uid);
        const dashboardStats = await statsService.getComprehensiveStats();
        setStats(dashboardStats);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  // Function to handle joining a session
  const handleJoinSession = async (session) => {
    try {
      // Update session with student status
      await updateDoc(doc(db, 'sessions', session.id), {
        [`studentStatus.${user.uid}`]: 'joined',
        lastActivity: new Date().toISOString(),
        attendees: arrayUnion(user.uid)
      });

      // Navigate to session
      navigate(`/session/${session.id}`);
    } catch (error) {
      console.error('Error joining session:', error);
      setError('Failed to join session. Please try again.');
    }
  };

  // Function to handle selecting a course
  const handleSelectCourse = async (course) => {
    try {
      // Update progress in Firestore
      const progressRef = doc(db, 'classes', course.id, 'progress', user.uid);
      await setDoc(progressRef, {
        currentBook: course.books[0].id,
        currentPage: 1,
        lastUpdated: new Date().toISOString(),
        studentId: user.uid
      }, { merge: true });
    } catch (error) {
      console.error('Error selecting course:', error);
      setError('Failed to select course');
    }
  };

  // Function to handle starting a recording
  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        // Save recording to Firebase Storage
        if (stats.currentIqraProgress.book) {
          const recordingRef = ref(storage, `recordings/${user.uid}/${stats.currentIqraProgress.book}/page-${stats.currentIqraProgress.page}-${Date.now()}.webm`);
          await uploadBytes(recordingRef, blob);
        }
      };

      recorder.start();
    } catch (error) {
      console.error('Error starting recording:', error);
      setError('Failed to start recording');
    }
  };

  // Function to handle stopping a recording
  const handleStopRecording = () => {
    // Stop recording
  };

  // Function to handle saving a drawing
  const handleSaveDrawing = async () => {
    try {
      // Implementation for saving drawing will go here
    } catch (error) {
      console.error('Error saving drawing:', error);
      setError('Failed to save drawing');
    }
  };

  if (loading || authLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        {/* Stats Cards */}
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Active Classes"
            value={stats.activeClasses}
            icon={SchoolIcon}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Progress"
            value={`${stats.progress}%`}
            icon={TrendingUpIcon}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Classes Today"
            value={stats.todayClasses}
            icon={ScheduleIcon}
            color="info"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Assignments"
            value={stats.assignments}
            icon={AssignmentIcon}
            color="warning"
          />
        </Grid>

        {/* Current Progress */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>Current Progress</Typography>
            <Box mt={2}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="subtitle1">
                    Current Book: {stats.currentIqraProgress.book || 'Not started'}
                  </Typography>
                  <Typography variant="subtitle1">
                    Page: {stats.currentIqraProgress.page} / {stats.currentIqraProgress.totalPages}
                  </Typography>
                  {stats.dateJoined && (
                    <Typography variant="body2" color="text.secondary" mt={1}>
                      Member since: {stats.dateJoined ? format(new Date(stats.dateJoined), 'MMMM dd, yyyy') : 'Unknown'}
                    </Typography>
                  )}
                </Grid>
              </Grid>
            </Box>
          </Paper>
        </Grid>

        {/* Last Class */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>Last Class</Typography>
            {stats.lastClass ? (
              <Box mt={2}>
                <Typography variant="subtitle1">{stats.lastClass.className}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Ended: {stats.lastClass.endTime ? format(new Date(stats.lastClass.endTime), 'PPp') : 'Unknown'}
                </Typography>
                
                {/* Structured Feedback */}
                {stats.lastClass.feedback && typeof stats.lastClass.feedback === 'object' && 
                 Object.keys(stats.lastClass.feedback).length > 0 && (
                  <>
                    <Typography variant="subtitle2" mt={2}>Feedback:</Typography>
                    <Box mt={1}>
                      {typeof stats.lastClass.feedback.assessment === 'string' && (
                        <Typography variant="body2">
                          <strong>Assessment:</strong> {stats.lastClass.feedback.assessment}
                        </Typography>
                      )}
                      {typeof stats.lastClass.feedback.strengths === 'string' && (
                        <Typography variant="body2">
                          <strong>Strengths:</strong> {stats.lastClass.feedback.strengths}
                        </Typography>
                      )}
                      {typeof stats.lastClass.feedback.areasOfImprovement === 'string' && (
                        <Typography variant="body2">
                          <strong>Areas to Improve:</strong> {stats.lastClass.feedback.areasOfImprovement}
                        </Typography>
                      )}
                      {typeof stats.lastClass.feedback.notes === 'string' && (
                        <Typography variant="body2">
                          <strong>Notes:</strong> {stats.lastClass.feedback.notes}
                        </Typography>
                      )}
                      {typeof stats.lastClass.feedback.pageNotes === 'string' && (
                        <Typography variant="body2">
                          <strong>Page Notes:</strong> {stats.lastClass.feedback.pageNotes}
                        </Typography>
                      )}
                    </Box>
                  </>
                )}

                {/* Simple Feedback */}
                {typeof stats.lastClass.rating !== 'undefined' && stats.lastClass.rating !== null && (
                  <Typography variant="body2" mt={1}>
                    <strong>Rating:</strong> {stats.lastClass.rating}
                  </Typography>
                )}
                {typeof stats.lastClass.comment === 'string' && stats.lastClass.comment && (
                  <Typography variant="body2">
                    <strong>Comment:</strong> {stats.lastClass.comment}
                  </Typography>
                )}

                {/* Progress */}
                {stats.lastClass.progress && typeof stats.lastClass.progress === 'object' && 
                 Object.keys(stats.lastClass.progress).length > 0 && (
                  <Typography variant="body2" mt={1}>
                    Progress: {typeof stats.lastClass.progress.currentPage === 'number' || typeof stats.lastClass.progress.currentPage === 'string' 
                      ? `Page ${stats.lastClass.progress.currentPage}` 
                      : 'No page recorded'}
                  </Typography>
                )}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No classes completed yet
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Active Sessions */}
        <Grid item xs={12}>
          <SessionsList
            activeSessions={activeSessions}
            upcomingClasses={upcomingClasses}
            onJoinSession={handleJoinSession}
          />
        </Grid>

        {/* Notifications */}
        {stats.notifications.length > 0 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>Notifications</Typography>
              <List>
                {stats.notifications.map((notification) => (
                  <ListItem key={notification.id}>
                    <ListItemText
                      primary={notification.title}
                      secondary={notification.message}
                    />
                    <ListItemSecondaryAction>
                      <Typography variant="caption" color="text.secondary">
                        {format(new Date(notification.createdAt), 'PPp')}
                      </Typography>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Container>
  );
};

export default StudentDashboard;
