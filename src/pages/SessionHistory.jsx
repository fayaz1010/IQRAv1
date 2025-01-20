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

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Session History
      </Typography>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          {/* Class Filter */}
          <Grid item xs={12} md={currentUser.role === 'student' ? 4 : 3}>
            <FormControl fullWidth size="small">
              <InputLabel>Class</InputLabel>
              <Select
                value={selectedClass}
                label="Class"
                onChange={(e) => setSelectedClass(e.target.value)}
              >
                <MenuItem value="">All Classes</MenuItem>
                {classes.map((class_) => (
                  <MenuItem key={class_.id} value={class_.id}>
                    {class_.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Student Filter - Only show for teachers and admins */}
          {currentUser.role !== 'student' && (
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Student</InputLabel>
                <Select
                  value={selectedStudent}
                  label="Student"
                  onChange={(e) => setSelectedStudent(e.target.value)}
                >
                  <MenuItem value="">All Students</MenuItem>
                  {selectedClass && classes
                    .find(c => c.id === selectedClass)?.students
                    ?.map((student) => (
                      <MenuItem key={student.id} value={student.id}>
                        {student.displayName || student.email}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Grid>
          )}

          {/* Date Filters */}
          <Grid item xs={12} md={currentUser.role === 'student' ? 4 : 3}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="From Date"
                value={startDate}
                onChange={setStartDate}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
              />
            </LocalizationProvider>
          </Grid>

          <Grid item xs={12} md={currentUser.role === 'student' ? 4 : 3}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="To Date"
                value={endDate}
                onChange={setEndDate}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
              />
            </LocalizationProvider>
          </Grid>
        </Grid>

        {/* Search Bar */}
        <Box sx={{ mt: 2 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search sessions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: searchQuery && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchQuery('')}>
                    <ClearIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Box>
      </Paper>

      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : (
        <SessionHistoryView
          classId={selectedClass}
          studentId={currentUser.role === 'student' ? currentUser.uid : selectedStudent}
          currentUser={currentUser}
        />
      )}
    </Container>
  );
};

export default SessionHistory;
