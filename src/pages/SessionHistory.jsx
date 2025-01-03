import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  TextField,
  IconButton,
  InputAdornment,
  CircularProgress,
  Alert,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import SessionHistoryView from '../features/iqra/components/SessionHistoryView';
import { useAuth } from '../contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';

const SessionHistory = () => {
  const { currentUser } = useAuth();
  const [searchParams] = useSearchParams();
  const classIdFromUrl = searchParams.get('class');
  const studentIdFromUrl = searchParams.get('student');

  const [selectedClass, setSelectedClass] = useState(classIdFromUrl || '');
  const [selectedStudent, setSelectedStudent] = useState(studentIdFromUrl || '');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Data for filters
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load classes and students based on user role
  useEffect(() => {
    const loadFilterData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        let classesQuery;
        if (currentUser.role === 'admin') {
          classesQuery = query(collection(db, 'classes'));
        } else if (currentUser.role === 'teacher') {
          classesQuery = query(
            collection(db, 'classes'),
            where('teacherId', '==', currentUser.uid)
          );
        } else if (currentUser.role === 'student') {
          classesQuery = query(
            collection(db, 'classes'),
            where('studentIds', 'array-contains', currentUser.uid)
          );
        }

        if (classesQuery) {
          const classesSnapshot = await getDocs(classesQuery);
          const classesData = [];
          
          for (const classDoc of classesSnapshot.docs) {
            const classData = {
              id: classDoc.id,
              ...classDoc.data()
            };
            
            // Load course details
            if (classData.courseId) {
              const courseDocRef = doc(db, 'courses', classData.courseId);
              const courseDocSnap = await getDoc(courseDocRef);
              if (courseDocSnap.exists()) {
                classData.course = courseDocSnap.data();
              }
            }
            
            // Load student details if teacher or admin
            if (['admin', 'teacher'].includes(currentUser.role)) {
              const studentPromises = classData.studentIds.map(sid => 
                getDoc(doc(db, 'users', sid))
              );
              const studentDocs = await Promise.all(studentPromises);
              classData.students = studentDocs
                .filter(docSnapshot => docSnapshot.exists())
                .map(docSnapshot => ({
                  id: docSnapshot.id,
                  ...docSnapshot.data()
                }));
            }
            
            classesData.push(classData);
          }
          
          setClasses(classesData);
          
          // If a class is selected, load its students
          if (selectedClass) {
            const selectedClassData = classesData.find(c => c.id === selectedClass);
            if (selectedClassData?.students) {
              setStudents(selectedClassData.students);
            }
          }
        }
      } catch (err) {
        console.error('Error loading filter data:', err);
        setError('Failed to load classes and students: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      loadFilterData();
    }
  }, [currentUser, selectedClass]);

  const handleClassChange = (event) => {
    const classId = event.target.value;
    setSelectedClass(classId);
    setSelectedStudent(''); // Reset student selection
    
    // Update students list
    if (classId) {
      const selectedClassData = classes.find(c => c.id === classId);
      if (selectedClassData?.students) {
        setStudents(selectedClassData.students);
      }
    } else {
      setStudents([]);
    }
  };

  const handleClearFilters = () => {
    setSelectedClass('');
    setSelectedStudent('');
    setStartDate(null);
    setEndDate(null);
    setSearchQuery('');
    setStudents([]);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          Session History
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
        )}

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Class</InputLabel>
                <Select
                  value={selectedClass}
                  onChange={handleClassChange}
                  label="Class"
                >
                  <MenuItem value="">All Classes</MenuItem>
                  {classes.map((classItem) => (
                    <MenuItem key={classItem.id} value={classItem.id}>
                      {classItem.name} {classItem.course?.name ? `- ${classItem.course.name}` : ''}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Student</InputLabel>
                <Select
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  label="Student"
                  disabled={!selectedClass}
                >
                  <MenuItem value="">All Students</MenuItem>
                  {students.map((student) => (
                    <MenuItem key={student.id} value={student.id}>
                      {student.displayName || student.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={2}>
              <DatePicker
                label="From Date"
                value={startDate}
                onChange={setStartDate}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={2}>
              <DatePicker
                label="To Date"
                value={endDate}
                onChange={setEndDate}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
              />
            </Grid>

            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                size="small"
                label="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  endAdornment: searchQuery && (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => setSearchQuery('')}
                      >
                        <ClearIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>
        </Paper>

        {/* Session History View */}
        <Paper>
          <SessionHistoryView
            classId={selectedClass || undefined}
            studentId={selectedStudent || undefined}
            currentUser={currentUser}
            startDate={startDate}
            endDate={endDate}
            searchQuery={searchQuery}
          />
        </Paper>
      </Container>
    </LocalizationProvider>
  );
};

export default SessionHistory;
