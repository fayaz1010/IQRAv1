import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Button,
  Alert,
  CircularProgress,
  Divider,
  Tooltip,
  Select,
  MenuItem,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  PlayArrow,
  Save as SaveIcon,
  Mic as MicIcon,
  Stop as StopIcon,
  NavigateBefore,
  NavigateNext,
  Fullscreen,
  FullscreenExit,
  Headphones,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { SessionProvider } from '../features/iqra/contexts/SessionContext';
import { db, storage } from '../config/firebase';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, setDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import DrawingCanvas from '../features/iqra/components/DrawingCanvas';
import IqraBookViewer from '../features/iqra/components/IqraBookViewer';
import IqraBookService from '../features/iqra/services/IqraBookService';

const MAX_RECORDING_SIZE = 5 * 1024 * 1024; // 5MB limit per recording
const MAX_RECORDINGS_PER_LESSON = 3; // Maximum 3 recordings per lesson

const Practice = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordingData, setRecordingData] = useState([]);
  const [recordings, setRecordings] = useState({});
  const [savingDrawing, setSavingDrawing] = useState(false);
  const [courseData, setCourseData] = useState(null);
  const [selectedBook, setSelectedBook] = useState(null);
  const [courseBooks, setCourseBooks] = useState([]);
  const [teacherData, setTeacherData] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showRecordings, setShowRecordings] = useState(false);
  const [showCourseDialog, setShowCourseDialog] = useState(true);
  const bookViewerRef = React.useRef(null);

  useEffect(() => {
    if (currentUser) {
      loadEnrolledCoursesAndClasses();
    }
  }, [currentUser]);

  const loadEnrolledCoursesAndClasses = async () => {
    try {
      // First get all classes the student is enrolled in
      const classesRef = collection(db, 'classes');
      const q = query(classesRef, where('studentIds', 'array-contains', currentUser.uid));
      const querySnapshot = await getDocs(q);
      
      console.log('Found classes:', querySnapshot.size);
      
      const classes = [];
      const coursesMap = new Map(); // Use map to avoid duplicate courses
      
      for (const classDoc of querySnapshot.docs) {
        const classData = { id: classDoc.id, ...classDoc.data() };
        console.log('Class data:', classData);
        
        if (!classData.courseId) {
          console.log('No courseId for class:', classData.id);
          continue;
        }

        // Fetch course data
        const courseRef = doc(db, 'courses', classData.courseId);
        const courseDoc = await getDoc(courseRef);
        console.log('Course exists:', courseDoc.exists(), 'for courseId:', classData.courseId);
        
        if (courseDoc.exists()) {
          const courseData = { id: courseDoc.id, ...courseDoc.data() };
          console.log('Course data:', courseData);
          console.log('Iqra Books:', courseData.iqraBooks);
          
          // Convert iqraBooks array to books array with proper structure
          const books = await Promise.all((courseData.iqraBooks || []).map(async (bookName) => {
            // Convert "Iqra Book 1" to "iqra-1" format for storage
            const bookId = bookName.toLowerCase().replace(/\s+book\s+/i, '-');
            
            // Check if book metadata exists in Firestore
            const bookRef = doc(db, 'iqra-books', bookId);
            const bookDoc = await getDoc(bookRef);
            
            if (!bookDoc.exists()) {
              // Initialize book metadata in Firestore
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
        } else {
          console.log('Course not found for ID:', classData.courseId);
        }
      }
      
      const courses = Array.from(coursesMap.values());
      console.log('Final courses with books:', courses.map(c => ({ id: c.id, name: c.name, books: c.books })));
      setAvailableCourses(courses);
      setLoading(false);
    } catch (err) {
      console.error('Error loading courses:', err);
      setError('Failed to load your courses. Please try again.');
      setLoading(false);
    }
  };

  const handleSelectCourse = async (course) => {
    try {
      console.log('Selected course:', course);
      setCourseData(course);
      setShowCourseDialog(false);
      
      // Select the first class from this course
      if (course.classes && course.classes.length > 0) {
        const classData = course.classes[0];
        console.log('Selected class:', classData);
        setSelectedClass(classData);
        setCurrentPage(1);

        // Load teacher data
        const teacherRef = doc(db, 'users', classData.teacherId);
        const teacherDoc = await getDoc(teacherRef);
        if (teacherDoc.exists()) {
          const teacherData = teacherDoc.data();
          console.log('Teacher data:', teacherData);
          setTeacherData(teacherDoc.data());
        }

        // Set course books
        if (course.books && course.books.length > 0) {
          console.log('Course books:', course.books);
          setCourseBooks(course.books);
          const firstBook = course.books[0];
          setSelectedBook(firstBook);
          
          // Update progress in Firestore
          const progressRef = doc(db, 'classes', classData.id, 'progress', currentUser.uid);
          await setDoc(progressRef, {
            currentBook: firstBook.id,
            currentPage: 1,
            lastUpdated: new Date(),
            studentId: currentUser.uid
          }, { merge: true });
        } else {
          console.log('No books found in course');
          setError('No books available in this course');
        }

        // Load recordings
        const recordingsRef = collection(db, 'classes', classData.id, 'recordings');
        const q = query(recordingsRef, where('studentId', '==', currentUser.uid));
        const snapshot = await getDocs(q);
        
        const recordingsMap = {};
        snapshot.forEach(doc => {
          const data = doc.data();
          if (!recordingsMap[data.page]) {
            recordingsMap[data.page] = [];
          }
          recordingsMap[data.page].push({
            id: doc.id,
            ...data
          });
        });
        
        setRecordings(recordingsMap);
      } else {
        console.log('No classes found in course:', course);
      }
    } catch (err) {
      console.error('Error selecting course:', err);
      setError('Failed to load course data');
    }
  };

  const startRecording = async () => {
    try {
      const currentRecordings = recordings[currentPage] || [];
      if (currentRecordings.length >= MAX_RECORDINGS_PER_LESSON) {
        setError('Maximum recordings limit reached for this page. Delete some recordings to continue.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => {
        chunks.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        if (blob.size > MAX_RECORDING_SIZE) {
          setError('Recording exceeds size limit of 5MB. Please try a shorter recording.');
          return;
        }

        try {
          const fileName = `recordings/${selectedClass.id}/${currentUser.uid}/${Date.now()}.webm`;
          const storageRef = ref(storage, fileName);
          await uploadBytes(storageRef, blob);
          const url = await getDownloadURL(storageRef);

          const recordingRef = collection(db, 'classes', selectedClass.id, 'recordings');
          await addDoc(recordingRef, {
            studentId: currentUser.uid,
            page: currentPage,
            url,
            timestamp: new Date().toISOString(),
            size: blob.size
          });

          // Refresh recordings
          handleSelectCourse(courseData);
        } catch (err) {
          console.error('Error saving recording:', err);
          setError('Failed to save recording');
        }
      };

      setMediaRecorder(recorder);
      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Failed to start recording. Please check your microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  const handleSaveDrawing = async (drawingData) => {
    if (!selectedClass) return;

    try {
      setSavingDrawing(true);
      const progressRef = doc(db, 'classes', selectedClass.id, 'progress', currentUser.uid);
      
      // Check if document exists first
      const progressDoc = await getDoc(progressRef);
      if (!progressDoc.exists()) {
        // Create initial progress document
        await setDoc(progressRef, {
          currentPage: currentPage,
          drawings: {
            [currentPage]: drawingData
          },
          lastUpdated: new Date().toISOString()
        });
      } else {
        // Update existing document
        await updateDoc(progressRef, {
          [`drawings.${currentPage}`]: drawingData,
          lastUpdated: new Date().toISOString()
        });
      }
      
      setSavingDrawing(false);
    } catch (err) {
      console.error('Error saving drawing:', err);
      setError('Failed to save drawing');
      setSavingDrawing(false);
    }
  };

  const handleBookChange = async (book) => {
    if (!book) return;
    
    setSelectedBook(book);
    setCurrentPage(1);
    
    if (selectedClass?.id && currentUser?.uid) {
      try {
        const progressRef = doc(db, 'classes', selectedClass.id, 'progress', currentUser.uid);
        await setDoc(progressRef, {
          currentBook: book.id,
          currentPage: 1,
          lastUpdated: new Date(),
          studentId: currentUser.uid
        }, { merge: true });
      } catch (err) {
        console.error('Error updating book progress:', err);
        setError('Failed to update book progress');
      }
    }
  };

  const handlePageChange = async (newPage) => {
    if (!selectedClass?.id || !currentUser?.uid) return;
    
    setCurrentPage(newPage);
    
    try {
      const progressRef = doc(db, 'classes', selectedClass.id, 'progress', currentUser.uid);
      const progressDoc = await getDoc(progressRef);
      
      const progressData = {
        currentPage: newPage,
        lastUpdated: new Date(),
        studentId: currentUser.uid
      };

      // Only include book data if it exists
      if (selectedBook?.id) {
        progressData.currentBook = selectedBook.id;
      }
      
      if (!progressDoc.exists()) {
        // Create new document
        await setDoc(progressRef, progressData);
      } else {
        // Update existing document
        await updateDoc(progressRef, {
          currentPage: newPage,
          lastUpdated: new Date()
        });
      }
    } catch (err) {
      console.error('Error updating page progress:', err);
      setError('Failed to update progress');
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      bookViewerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handlePlayRecording = async (recording) => {
    try {
      const url = await getDownloadURL(ref(storage, recording.path));
      const audio = new Audio(url);
      audio.play();
    } catch (err) {
      console.error('Error playing recording:', err);
      setError('Failed to play recording');
    }
  };

  const BookSelector = () => (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle1" gutterBottom>
        Select Book
      </Typography>
      <Select
        fullWidth
        value={selectedBook?.id || ''}
        onChange={(e) => {
          const book = courseBooks.find(b => b.id === e.target.value);
          handleBookChange(book);
        }}
        displayEmpty
      >
        <MenuItem value="" disabled>
          Select a book
        </MenuItem>
        {courseBooks.map((book) => (
          <MenuItem key={book.id} value={book.id}>
            {book.name}
          </MenuItem>
        ))}
      </Select>
    </Box>
  );

  const TeacherInfo = () => (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle1" gutterBottom>
        Teacher: {teacherData?.displayName || 'Loading...'}
      </Typography>
    </Box>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      {/* Course Selection Dialog */}
      <Dialog 
        open={showCourseDialog} 
        maxWidth="sm" 
        fullWidth
        onClose={() => {
          if (courseData) {
            setShowCourseDialog(false);
          }
        }}
      >
        <DialogTitle>Select a Course to Practice</DialogTitle>
        <DialogContent>
          {availableCourses.length === 0 ? (
            <Alert severity="info">
              You are not enrolled in any courses. Please enroll in a course to start practicing.
            </Alert>
          ) : (
            <List>
              {availableCourses.map((course) => (
                <ListItem 
                  key={course.id}
                  component="div"
                  onClick={() => handleSelectCourse(course)}
                  selected={courseData?.id === course.id}
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: 'action.hover'
                    }
                  }}
                >
                  <ListItemText
                    primary={course.title || 'Unnamed Course'}
                    secondary={`${course.books ? `${course.books.length} book(s)` : 'No books'} available`}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            if (!courseData && availableCourses.length > 0) {
              handleSelectCourse(availableCourses[0]);
            }
          }}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Main Practice Area */}
      {selectedClass && (
        <SessionProvider initialSession={{
          id: `practice_${selectedClass.id}`,
          classId: selectedClass.id,
          currentPage: currentPage,
          studentProgress: {
            [currentUser.uid]: {
              currentPage: currentPage,
              currentBook: selectedBook?.id,
              drawings: selectedClass.progress?.drawings || {}
            }
          },
          teacherId: selectedClass.teacherId,
          type: 'practice',
          startTime: new Date().toISOString(),
          status: 'active'
        }}>
          <Container 
            maxWidth={false} 
            disableGutters 
            sx={{ 
              height: '100vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              p: 2
            }}
          >
            {loading ? (
              <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                <CircularProgress />
              </Box>
            ) : error ? (
              <Alert severity="error">{error}</Alert>
            ) : (
              <>
                {/* Top Bar */}
                <Paper 
                  elevation={2}
                  sx={{ 
                    p: 2, 
                    mb: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="h6" component="div">
                      {courseData?.title || 'Select a Course'}
                    </Typography>
                    {teacherData && (
                      <Typography variant="subtitle1" color="text.secondary">
                        Teacher: {teacherData.displayName}
                      </Typography>
                    )}
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {selectedBook && (
                      <>
                        <Select
                          value={selectedBook.id}
                          onChange={(e) => {
                            const book = courseBooks.find(b => b.id === e.target.value);
                            handleBookChange(book);
                          }}
                          size="small"
                          sx={{ minWidth: 200 }}
                        >
                          {courseBooks.map((book) => (
                            <MenuItem key={book.id} value={book.id}>
                              {book.name}
                            </MenuItem>
                          ))}
                        </Select>

                        <Box display="flex" alignItems="center" gap={1}>
                          <Tooltip title="Previous Page">
                            <IconButton
                              onClick={() => handlePageChange(currentPage - 1)}
                              disabled={currentPage <= 1}
                            >
                              <NavigateBefore />
                            </IconButton>
                          </Tooltip>
                          
                          <Box sx={{ width: { xs: 60, sm: 80 } }}>
                            <TextField
                              size="small"
                              type="number"
                              value={currentPage}
                              onChange={(e) => {
                                const newPage = parseInt(e.target.value);
                                if (!isNaN(newPage)) {
                                  handlePageChange(newPage);
                                }
                              }}
                              inputProps={{ 
                                min: 1, 
                                max: selectedBook?.totalPages || 30,
                                style: { textAlign: 'center' }
                              }}
                              sx={{ width: '100%' }}
                            />
                          </Box>
                          
                          <Typography variant="body2" sx={{ minWidth: 30 }}>
                            / {selectedBook?.totalPages || 30}
                          </Typography>

                          <Tooltip title="Next Page">
                            <IconButton
                              onClick={() => handlePageChange(currentPage + 1)}
                              disabled={currentPage >= (selectedBook?.totalPages || 30)}
                            >
                              <NavigateNext />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </>
                    )}
                    
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="Toggle Recordings Panel">
                        <IconButton onClick={() => setShowRecordings(!showRecordings)}>
                          <Headphones />
                        </IconButton>
                      </Tooltip>
                      
                      <span>
                        <Tooltip title={isRecording ? 'Stop Recording' : 'Start Recording'}>
                          <IconButton
                            color={isRecording ? 'error' : 'primary'}
                            onClick={isRecording ? stopRecording : startRecording}
                          >
                            {isRecording ? <StopIcon /> : <MicIcon />}
                          </IconButton>
                        </Tooltip>
                      </span>

                      <Tooltip title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}>
                        <IconButton onClick={toggleFullscreen}>
                          {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                </Paper>

                {/* Main Content Area */}
                <Box sx={{ 
                  flexGrow: 1,
                  minHeight: 0,
                  display: 'flex',
                  overflow: 'hidden'
                }}>
                  <Grid 
                    container 
                    spacing={2} 
                    sx={{ 
                      flexGrow: 1,
                      margin: 0,
                      width: '100%'
                    }}
                  >
                    {/* Book Viewer and Drawing Canvas Container */}
                    <Grid 
                      item 
                      xs={12} 
                      md={showRecordings ? 8 : 12} 
                      sx={{ 
                        height: '100%',
                        paddingTop: '0 !important',
                        paddingLeft: '0 !important'
                      }}
                    >
                      <Grid 
                        container 
                        spacing={2} 
                        sx={{ 
                          height: '100%',
                          margin: 0,
                          width: '100%'
                        }}
                      >
                        {/* Book Viewer */}
                        <Grid 
                          item 
                          xs={12} 
                          md={6} 
                          sx={{ 
                            height: '100%',
                            paddingTop: '0 !important',
                            pl: { xs: '0 !important', md: 2 }
                          }}
                        >
                          <Paper 
                            elevation={3}
                            sx={{ 
                              height: '100%',
                              display: 'flex',
                              flexDirection: 'column',
                              overflow: 'hidden'
                            }}
                          >
                            <Box 
                              ref={bookViewerRef} 
                              sx={{ 
                                flexGrow: 1,
                                minHeight: 0,
                                p: 2
                              }}
                            >
                              {courseData && selectedBook ? (
                                <IqraBookViewer
                                  bookId={selectedBook.id}
                                  initialPage={currentPage}
                                  onPageChange={handlePageChange}
                                  totalPages={selectedBook.totalPages}
                                  studentId={currentUser.uid}
                                  readOnly={false}
                                  showSaveButton={true}
                                />
                              ) : (
                                <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                                  <Typography color="text.secondary">
                                    {courseBooks.length === 0 ? 'No books available in this course' : 'Please select a book'}
                                  </Typography>
                                </Box>
                              )}
                            </Box>
                          </Paper>
                        </Grid>

                        {/* Drawing Canvas */}
                        <Grid 
                          item 
                          xs={12} 
                          md={6} 
                          sx={{ 
                            height: '100%',
                            paddingTop: '0 !important',
                            pr: { xs: '0 !important', md: 2 }
                          }}
                        >
                          <Paper 
                            elevation={3}
                            sx={{ 
                              height: '100%',
                              display: 'flex',
                              flexDirection: 'column',
                              overflow: 'hidden'
                            }}
                          >
                            <Box sx={{ 
                              flexGrow: 1,
                              minHeight: 0,
                              p: 2,
                              display: 'flex',
                              flexDirection: 'column'
                            }}>
                              <DrawingCanvas
                                width="100%"
                                height="100%"
                                onSave={handleSaveDrawing}
                                savedDrawing={selectedClass?.progress?.drawings?.[currentPage]}
                              />
                            </Box>
                          </Paper>
                        </Grid>
                      </Grid>
                    </Grid>

                    {/* Recordings Panel */}
                    {showRecordings && (
                      <Grid 
                        item 
                        xs={12} 
                        md={4} 
                        sx={{ 
                          height: '100%',
                          paddingTop: '0 !important',
                          pr: '0 !important'
                        }}
                      >
                        <Paper 
                          elevation={3}
                          sx={{ 
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                            p: 2
                          }}
                        >
                          <Typography variant="h6" gutterBottom>
                            Recordings
                          </Typography>
                          <Box sx={{ 
                            flexGrow: 1,
                            overflow: 'auto',
                            minHeight: 0
                          }}>
                            {Object.entries(recordings).map(([page, pageRecordings]) => (
                              <Box key={page} sx={{ mb: 2 }}>
                                <Typography variant="subtitle1" gutterBottom>
                                  Page {page}
                                </Typography>
                                <List dense>
                                  {pageRecordings.map((recording, index) => (
                                    <ListItem
                                      key={recording.id}
                                      secondaryAction={
                                        <IconButton edge="end" onClick={() => handlePlayRecording(recording)}>
                                          <PlayArrow />
                                        </IconButton>
                                      }
                                    >
                                      <ListItemText
                                        primary={`Recording ${index + 1}`}
                                        secondary={new Date(recording.timestamp).toLocaleString()}
                                      />
                                    </ListItem>
                                  ))}
                                </List>
                              </Box>
                            ))}
                            {Object.keys(recordings).length === 0 && (
                              <Typography color="text.secondary" align="center">
                                No recordings yet
                              </Typography>
                            )}
                          </Box>
                        </Paper>
                      </Grid>
                    )}
                  </Grid>
                </Box>
              </>
            )}
          </Container>
        </SessionProvider>
      )}
    </>
  );
};

export default Practice;
