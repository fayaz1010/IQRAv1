import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Paper,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  CircularProgress
} from '@mui/material';
import {
  Search as SearchIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  AccessTime as AccessTimeIcon
} from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import StudentCard from './components/StudentCard';

const StudentsList = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [performanceFilter, setPerformanceFilter] = useState('all');
  const [activityFilter, setActivityFilter] = useState('all');

  useEffect(() => {
    if (currentUser) {
      fetchTeacherData();
    }
  }, [currentUser]);

  // Helper function to parse various time formats
  const parseTime = (timeStr, baseDate = new Date()) => {
    if (!timeStr) return null;

    try {
      // If it's a Firestore Timestamp
      if (typeof timeStr === 'object') {
        if (timeStr.seconds) {
          return new Date(timeStr.seconds * 1000);
        }
        if (timeStr.toDate && typeof timeStr.toDate === 'function') {
          return timeStr.toDate();
        }
        return null;
      }

      // If it's an ISO string
      if (timeStr.includes('T')) {
        return new Date(timeStr);
      }

      // If it's just a time string (HH:mm:ss or h:mm:ss AM/PM)
      if (timeStr.includes(':')) {
        const date = new Date(baseDate);
        date.setHours(0, 0, 0, 0); // Reset to start of day
        
        // Handle AM/PM format
        if (timeStr.toLowerCase().includes('am') || timeStr.toLowerCase().includes('pm')) {
          const [time, period] = timeStr.split(' ');
          const [hours, minutes, seconds = '0'] = time.split(':');
          let hour = parseInt(hours);
          
          if (period.toLowerCase() === 'pm' && hour !== 12) {
            hour += 12;
          } else if (period.toLowerCase() === 'am' && hour === 12) {
            hour = 0;
          }
          
          date.setHours(hour, parseInt(minutes), parseInt(seconds));
        } else {
          // Handle 24-hour format
          const [hours, minutes, seconds = '0'] = timeStr.split(':');
          date.setHours(parseInt(hours), parseInt(minutes), parseInt(seconds));
        }
        
        return date;
      }
    } catch (error) {
      console.warn('Error parsing time:', { timeStr, error: error.message });
      return null;
    }
    
    return null;
  };

  const fetchTeacherData = async () => {
    try {
      setLoading(true);
      
      // First get all classes taught by this teacher
      const classesQuery = query(
        collection(db, 'classes'),
        where('teacherId', '==', currentUser.uid)
      );
      const classesSnapshot = await getDocs(classesQuery);
      const classesData = classesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setClasses(classesData);

      // Get all unique students from these classes
      const studentIds = new Set();
      const studentClassMap = new Map();
      
      classesData.forEach(cls => {
        cls.studentIds?.forEach(studentId => {
          studentIds.add(studentId);
          if (!studentClassMap.has(studentId)) {
            studentClassMap.set(studentId, []);
          }
          studentClassMap.get(studentId).push({
            id: cls.id,
            name: cls.name
          });
        });
      });

      // Fetch student details and sessions
      const studentsData = [];
      const now = new Date();
      const oneWeekAgo = new Date(now);
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      for (const studentId of studentIds) {
        const studentDoc = await getDocs(query(
          collection(db, 'users'),
          where('__name__', '==', studentId)
        ));
        
        if (!studentDoc.empty) {
          const studentData = studentDoc.docs[0].data();
          
          // Get student's sessions with improved querying
          const sessionsQuery = query(
            collection(db, 'sessions'),
            where('studentIds', 'array-contains', studentId),
            where('teacherId', '==', currentUser.uid)
          );
          const sessionsSnapshot = await getDocs(sessionsQuery);
          const sessions = sessionsSnapshot.docs.map(doc => {
            const session = doc.data();
            let sessionDate = null;
            
            // Handle different date formats
            if (session.date) {
              if (typeof session.date.toDate === 'function') {
                // Firestore Timestamp
                sessionDate = session.date.toDate();
              } else if (session.date._seconds) {
                // Timestamp object
                sessionDate = new Date(session.date._seconds * 1000);
              } else if (typeof session.date === 'string') {
                // ISO string
                sessionDate = new Date(session.date);
              }
            }

            // Handle start and end times
            let startTime = null;
            let endTime = null;

            if (session.startTime) {
              if (typeof session.startTime.toDate === 'function') {
                startTime = session.startTime.toDate();
              } else {
                startTime = parseTime(session.startTime, sessionDate);
              }
            }

            if (session.endTime) {
              if (typeof session.endTime.toDate === 'function') {
                endTime = session.endTime.toDate();
              } else {
                endTime = parseTime(session.endTime, sessionDate);
              }
            }

            return {
              id: doc.id,
              ...session,
              date: sessionDate || new Date(),
              startTime,
              endTime,
              progress: session.studentProgress?.[studentId] || null
            };
          }).sort((a, b) => b.date.getTime() - a.date.getTime());

          // Calculate statistics
          const completedSessions = sessions.filter(s => s.status === 'completed');
          const activeSessions = sessions.filter(s => s.status === 'active');
          const recentSessions = sessions.filter(s => {
            return s.date && s.date >= oneWeekAgo;
          });

          const averageProgress = completedSessions.reduce((acc, session) => {
            const studentProgress = session.progress;
            if (studentProgress?.assessment) {
              const total = (
                studentProgress.assessment.reading +
                studentProgress.assessment.pronunciation +
                studentProgress.assessment.memorization
              ) / 3;
              return acc + total;
            }
            return acc;
          }, 0) / (completedSessions.length || 1);

          const totalHours = completedSessions.reduce((acc, session) => {
            if (session.startTime && session.endTime) {
              return acc + (session.endTime.getTime() - session.startTime.getTime()) / (1000 * 60 * 60);
            }
            return acc;
          }, 0);

          studentsData.push({
            id: studentId,
            ...studentData,
            classes: studentClassMap.get(studentId),
            statistics: {
              averageProgress,
              sessionsCompleted: completedSessions.length,
              activeSessions: activeSessions.length,
              recentSessions: recentSessions.length,
              totalHours: Math.round(totalHours * 10) / 10,
              lastSessionDate: sessions[0]?.date || null
            }
          });
        }
      }

      setStudents(studentsData);
    } catch (error) {
      console.error('Error fetching teacher data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterStudents = () => {
    return students.filter(student => {
      // Search filter
      const searchMatch = searchTerm === '' || 
        student.name?.toLowerCase().includes(searchTerm.toLowerCase());

      // Class filter
      const classMatch = classFilter === 'all' || 
        student.classes.some(cls => cls.id === classFilter);

      // Performance filter
      let performanceMatch = true;
      if (performanceFilter === 'high') {
        performanceMatch = student.statistics.averageProgress >= 80;
      } else if (performanceFilter === 'low') {
        performanceMatch = student.statistics.averageProgress < 60;
      }

      // Activity filter
      let activityMatch = true;
      if (activityFilter === 'recent') {
        const lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 7);
        activityMatch = student.statistics.lastSessionDate?.getTime() >= lastWeek.getTime();
      } else if (activityFilter === 'inactive') {
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        activityMatch = !student.statistics.lastSessionDate || 
          student.statistics.lastSessionDate.getTime() < lastMonth.getTime();
      }

      return searchMatch && classMatch && performanceMatch && activityMatch;
    });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Students
      </Typography>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} sm={8}>
            <Box display="flex" gap={2}>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Class</InputLabel>
                <Select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  label="Class"
                >
                  <MenuItem value="all">All Classes</MenuItem>
                  {classes.map((cls) => (
                    <MenuItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Performance</InputLabel>
                <Select
                  value={performanceFilter}
                  onChange={(e) => setPerformanceFilter(e.target.value)}
                  label="Performance"
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="high">
                    <Box display="flex" alignItems="center">
                      <TrendingUpIcon sx={{ color: 'success.main', mr: 1 }} />
                      High
                    </Box>
                  </MenuItem>
                  <MenuItem value="low">
                    <Box display="flex" alignItems="center">
                      <TrendingDownIcon sx={{ color: 'error.main', mr: 1 }} />
                      Needs Help
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Activity</InputLabel>
                <Select
                  value={activityFilter}
                  onChange={(e) => setActivityFilter(e.target.value)}
                  label="Activity"
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="recent">Recent</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Students Grid */}
      <Grid container spacing={3}>
        {filterStudents().map((student) => (
          <Grid item key={student.id} xs={12} sm={6} md={4}>
            <StudentCard student={student} />
          </Grid>
        ))}
      </Grid>

      {filterStudents().length === 0 && (
        <Box textAlign="center" py={4}>
          <Typography variant="h6" color="text.secondary">
            No students found matching the filters
          </Typography>
        </Box>
      )}
    </Container>
  );
};

export default StudentsList;
