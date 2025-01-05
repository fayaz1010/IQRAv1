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
import { collection, query, where, getDocs, doc, getDoc, updateDoc, setDoc, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import DrawingCanvas from '../features/iqra/components/DrawingCanvas';
import IqraBookViewer from '../features/iqra/components/IqraBookViewer';

const MAX_RECORDING_SIZE = 5 * 1024 * 1024; // 5MB limit per recording
const MAX_RECORDINGS_PER_LESSON = 3; // Maximum 3 recordings per lesson

const Practice = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [enrolledClasses, setEnrolledClasses] = useState([]);
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
  const bookViewerRef = React.useRef(null);

  useEffect(() => {
    loadEnrolledClasses();
  }, [currentUser]);

  useEffect(() => {
    const loadBooks = async () => {
      if (selectedClass?.course?.id) {
        try {
          // Get course data
          const courseRef = doc(db, 'courses', selectedClass.course.id);
          const courseDoc = await getDoc(courseRef);
          
          if (courseDoc.exists()) {
            const courseData = courseDoc.data();
            if (courseData.books && courseData.books.length > 0) {
              setCourseBooks(courseData.books);
              // Set the first book as selected if none is selected
              if (!selectedBook) {
                setSelectedBook(courseData.books[0]);
              }
            }
          }
        } catch (err) {
          console.error('Error loading books:', err);
          setError('Failed to load books');
        }
      }
    };

    loadBooks();
  }, [selectedClass]);

  useEffect(() => {
    const loadTeacherData = async () => {
      if (selectedClass?.teacherId) {
        try {
          const teacherRef = doc(db, 'users', selectedClass.teacherId);
          const teacherDoc = await getDoc(teacherRef);
          if (teacherDoc.exists()) {
            setTeacherData(teacherDoc.data());
          }
        } catch (err) {
          console.error('Error loading teacher data:', err);
        }
      }
    };
    loadTeacherData();
  }, [selectedClass]);

  const loadEnrolledClasses = async () => {
    try {
      const classesRef = collection(db, 'classes');
      const q = query(classesRef, where('studentIds', 'array-contains', currentUser.uid));
      const querySnapshot = await getDocs(q);
      
      const classes = [];
      for (const classDoc of querySnapshot.docs) {
        const classData = classDoc.data();
        const progressRef = doc(db, 'classes', classDoc.id, 'progress', currentUser.uid);
        const progressDoc = await getDoc(progressRef);
        
        // Fetch course data
        const courseRef = doc(db, 'courses', classData.courseId);
        const courseDoc = await getDoc(courseRef);
        const courseData = courseDoc.exists() ? courseDoc.data() : null;
        
        classes.push({
          id: classDoc.id,
          ...classData,
          course: courseData,
          progress: progressDoc.exists() ? progressDoc.data() : { currentPage: 1, completed: false }
        });
      }
      
      setEnrolledClasses(classes);
      if (classes.length > 0) {
        handleSelectClass(classes[0]);
      }
      setLoading(false);
    } catch (err) {
      console.error('Error loading classes:', err);
      setError('Failed to load your classes. Please try again.');
      setLoading(false);
    }
  };

  const handleSelectClass = async (classData) => {
    setSelectedClass(classData);
    setCurrentPage(classData.progress?.currentPage || 1);
    setCourseData(classData.course);

    try {
      // Load teacher data
      const teacherRef = doc(db, 'users', classData.teacherId);
      const teacherDoc = await getDoc(teacherRef);
      if (teacherDoc.exists()) {
        setTeacherData(teacherDoc.data());
      }

      // Initialize session context
      const classRef = doc(db, 'classes', classData.id);
      const classDoc = await getDoc(classRef);
      const classDetails = classDoc.data();
      
      // Load existing recordings
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
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load class data');
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
          handleSelectClass(selectedClass);
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
    <SessionProvider initialSession={selectedClass ? {
      id: `practice_${selectedClass.id}`,
      classId: selectedClass.id,
      currentPage: currentPage,
      studentProgress: {
        [currentUser.uid]: {
          currentPage: currentPage,
          drawings: selectedClass.progress?.drawings || {}
        }
      },
      teacherId: selectedClass.teacherId,
      type: 'practice',
      startTime: new Date().toISOString(),
      status: 'active'
    } : null}>
      <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 } }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Paper sx={{ p: 2, mb: 2 }}>
              <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} gap={2}>
                {/* Course and Teacher Info */}
                <Box flex={1}>
                  <Typography variant="h6" component="div">
                    {selectedClass?.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedClass?.course?.name || 'Loading course...'} • Teacher: {teacherData?.displayName || 'Loading...'}
                  </Typography>
                </Box>

                {/* Book Selection and Navigation */}
                <Box display="flex" flexWrap="wrap" gap={2} alignItems="center">
                  <BookSelector />
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
                          max: selectedBook?.totalPages || courseData?.totalPages || 1,
                          style: { textAlign: 'center' }
                        }}
                        sx={{ width: '100%' }}
                      />
                    </Box>
                    
                    <Typography variant="body2" sx={{ minWidth: 30 }}>
                      / {selectedBook?.totalPages || courseData?.totalPages || 1}
                    </Typography>

                    <Tooltip title="Next Page">
                      <IconButton
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage >= (selectedBook?.totalPages || courseData?.totalPages || 1)}
                      >
                        <NavigateNext />
                      </IconButton>
                    </Tooltip>
                  </Box>

                  {/* Control Buttons */}
                  <Box display="flex" gap={1}>
                    <Tooltip title="Show Recordings">
                      <IconButton
                        color={showRecordings ? 'primary' : 'default'}
                        onClick={() => setShowRecordings(!showRecordings)}
                      >
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
              </Box>
            </Paper>
          </Grid>

          <Grid container item spacing={2} xs={12} md={showRecordings ? 8 : 12}>
            <Grid item xs={12} md={6}>
              <Box ref={bookViewerRef} sx={{ height: '70vh' }}>
                <Paper sx={{ p: 2, height: '100%' }}>
                  {courseData ? (
                    <IqraBookViewer
                      bookId={selectedBook?.id || courseData.bookId || 'Iqra Book 1'}
                      initialPage={currentPage}
                      onPageChange={handlePageChange}
                      totalPages={selectedBook?.totalPages || courseData.totalPages || 1}
                      studentId={currentUser.uid}
                      readOnly={false}
                      showSaveButton={true}
                    />
                  ) : (
                    <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                      <Typography color="text.secondary">
                        No book content available
                      </Typography>
                    </Box>
                  )}
                </Paper>
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, height: '70vh' }}>
                <DrawingCanvas
                  width={500}
                  height={500}
                  onSave={handleSaveDrawing}
                  savedDrawing={selectedClass?.progress?.drawings?.[currentPage]}
                />
              </Paper>
            </Grid>
          </Grid>

          {/* Recordings Panel */}
          {showRecordings && (
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2, height: '70vh', overflow: 'auto' }}>
                <Typography variant="h6" gutterBottom>
                  Recordings
                </Typography>
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
              </Paper>
            </Grid>
          )}
        </Grid>
      </Container>
    </SessionProvider>
  );
};

export default Practice;
