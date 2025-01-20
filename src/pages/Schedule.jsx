import React, { useState, useEffect } from 'react';
import { useTheme } from '@mui/material/styles';
import {
  Container,
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  Grid,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Paper,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Tooltip,
  Popover,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Badge
} from '@mui/material';
import {
  Add as AddIcon,
  Event as EventIcon,
  VideoCall as VideoCallIcon,
  People as PeopleIcon,
  Person as PersonIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { getSchedules } from '../services/scheduleService';
import SchedulingWizard from '../features/iqra/components/schedule/SchedulingWizard';
import ScheduleItem from '../features/iqra/components/schedule/ScheduleItem';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);

const Schedule = () => {
  const theme = useTheme();
  const { currentUser } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [openWizard, setOpenWizard] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list');
  const [classDetails, setClassDetails] = useState({});
  const [courses, setCourses] = useState({});
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [currentWeek, setCurrentWeek] = useState(new Date());

  useEffect(() => {
    if (currentUser) {
      const loadData = async () => {
        await fetchSchedules();
        await fetchCourses();
        await fetchClassDetails();
      };
      loadData();
    }
  }, [currentUser]);

  useEffect(() => {
    if (schedules.length > 0) {
      fetchClassDetails();
    }
  }, [schedules]);

  const fetchCourses = async () => {
    try {
      const coursesRef = collection(db, 'courses');
      const querySnapshot = await getDocs(coursesRef);
      const coursesData = {};
      querySnapshot.forEach((doc) => {
        coursesData[doc.id] = { id: doc.id, ...doc.data() };
      });
      setCourses(coursesData);
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      setError('');
      const fetchedSchedules = await getSchedules(currentUser.uid, currentUser.role);
      setSchedules(fetchedSchedules);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      setError('Failed to fetch schedules');
    } finally {
      setLoading(false);
    }
  };

  const fetchClassDetails = async () => {
    try {
      // First get the schedules' class IDs
      const classIds = schedules.map(schedule => schedule.classId);
      
      if (classIds.length === 0) {
        console.log('No schedules found');
        return;
      }

      console.log('Fetching details for classes:', classIds);
      
      // Only fetch the classes that are in the schedules
      const classesRef = collection(db, 'classes');
      const classesQuery = query(classesRef, where('__name__', 'in', classIds));
      const classesSnapshot = await getDocs(classesQuery);
      const details = {};
      
      for (const doc of classesSnapshot.docs) {
        const classData = doc.data();
        console.log('Class data for', doc.id, ':', classData);
        
        // Get student details
        const studentIds = classData.studentIds || [];
        let students = [];
        
        if (studentIds.length > 0) {
          try {
            const usersRef = collection(db, 'users');
            // Fetch all students in one query
            const studentsQuery = query(usersRef, where('__name__', 'in', studentIds));
            const studentsSnapshot = await getDocs(studentsQuery);
            
            students = studentsSnapshot.docs.map(userDoc => {
              const userData = userDoc.data();
              return {
                id: userDoc.id,
                name: userData.displayName || userData.name || userData.email || 'Unknown Student',
                email: userData.email,
                photoURL: userData.photoURL,
              };
            });
            console.log('Fetched students for class', doc.id, ':', students);
          } catch (error) {
            console.error('Error fetching students for class', doc.id, ':', error);
          }
        }

        // Get course name
        let courseName = 'General Course';
        if (classData.courseId && courses[classData.courseId]) {
          courseName = courses[classData.courseId].title || 'General Course';
        }

        details[doc.id] = {
          id: doc.id,
          name: classData.name || 'Untitled Class',
          students: students,
          courseName: courseName,
          description: classData.description || '',
        };
      }
      
      console.log('Final class details:', details);
      setClassDetails(details);
    } catch (error) {
      console.error('Error fetching class details:', error);
    }
  };

  const handleWizardComplete = () => {
    setOpenWizard(false);
    fetchSchedules();
  };

  const formatTime = (timeString) => {
    return new Date(timeString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleStudentsClick = (event, students) => {
    setSelectedStudents(students);
    setAnchorEl(event.currentTarget);
  };

  const handlePopoverClose = () => {
    setAnchorEl(null);
  };

  const renderListView = () => {
    if (loading) {
      return (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      );
    }

    if (error) {
      return (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      );
    }

    if (schedules.length === 0) {
      return (
        <Box textAlign="center" p={4}>
          <Typography color="text.secondary">
            No schedules found. Click the "Schedule New Class" button to create one.
          </Typography>
        </Box>
      );
    }

    // Group schedules by class
    const groupedSchedules = schedules.reduce((acc, schedule) => {
      const classId = schedule.classId;
      if (!acc[classId]) {
        acc[classId] = [];
      }
      acc[classId].push(schedule);
      return acc;
    }, {});

    return Object.entries(groupedSchedules).map(([classId, classSchedules]) => (
      <Box key={classId} sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          {classDetails[classId]?.name || 'Loading...'}
        </Typography>
        {classSchedules.map((schedule) => (
          <ScheduleItem
            key={schedule.id}
            schedule={schedule}
            classData={classDetails[classId]}
            onUpdate={fetchSchedules}
            onDelete={(scheduleId) => {
              setSchedules(schedules.filter(s => s.id !== scheduleId));
            }}
          />
        ))}
      </Box>
    ));
  };

  const renderStudentsList = (students) => (
    <List sx={{ 
      width: 300, 
      maxHeight: 400, 
      overflow: 'auto', 
      bgcolor: 'background.paper',
      borderRadius: 1,
      p: 0
    }}>
      {students.length === 0 ? (
        <ListItem>
          <ListItemText 
            primary="No students enrolled" 
            sx={{ 
              textAlign: 'center',
              color: 'text.secondary'
            }} 
          />
        </ListItem>
      ) : (
        students.map((student) => (
          <ListItem key={student.id} sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <ListItemAvatar>
              <Avatar src={student.photoURL} sx={{ bgcolor: theme.palette.primary.main }}>
                {student.name?.charAt(0) || <PersonIcon />}
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={student.name}
              secondary={student.email}
              primaryTypographyProps={{ 
                sx: { 
                  color: 'white',
                  fontWeight: 'medium'
                } 
              }}
              secondaryTypographyProps={{ 
                sx: { 
                  color: 'text.secondary',
                  fontSize: '0.875rem'
                } 
              }}
            />
          </ListItem>
        ))
      )}
    </List>
  );

  const getWeekDates = () => {
    const dates = [];
    const startOfWeek = new Date(currentWeek);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const renderCalendarView = () => {
    const weekDates = getWeekDates();
    const schedulesByTime = {};

    // Organize schedules by time slot
    schedules.forEach(schedule => {
      const classInfo = classDetails[schedule.classId] || {};
      schedule.daysOfWeek.forEach(day => {
        const time = new Date(schedule.timeSlots[day]);
        const timeKey = time.getHours().toString().padStart(2, '0') + ':00';
        if (!schedulesByTime[timeKey]) {
          schedulesByTime[timeKey] = Array(7).fill(null);
        }
        schedulesByTime[timeKey][day] = {
          className: classInfo.name,
          courseName: classInfo.courseName,
          meetLink: schedule.meetLink,
          duration: schedule.duration,
        };
      });
    });

    return (
      <Box sx={{ mt: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <IconButton onClick={() => {
            const newDate = new Date(currentWeek);
            newDate.setDate(newDate.getDate() - 7);
            setCurrentWeek(newDate);
          }}>
            <ChevronLeftIcon />
          </IconButton>
          <Typography variant="h6">
            {weekDates[0].toLocaleDateString()} - {weekDates[6].toLocaleDateString()}
          </Typography>
          <IconButton onClick={() => {
            const newDate = new Date(currentWeek);
            newDate.setDate(newDate.getDate() + 7);
            setCurrentWeek(newDate);
          }}>
            <ChevronRightIcon />
          </IconButton>
        </Box>
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Time</TableCell>
                {DAYS.map(day => (
                  <TableCell key={day} align="center">{day}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {TIME_SLOTS.map(timeSlot => (
                <TableRow key={timeSlot}>
                  <TableCell>{timeSlot}</TableCell>
                  {Array.from({ length: 7 }, (_, dayIndex) => {
                    const schedule = schedulesByTime[timeSlot]?.[dayIndex];
                    return (
                      <TableCell key={dayIndex} align="center">
                        {schedule && (
                          <Box>
                            <Typography variant="body2" noWrap>
                              {schedule.className}
                            </Typography>
                            {schedule.meetLink && (
                              <Button
                                size="small"
                                startIcon={<VideoCallIcon />}
                                href={schedule.meetLink}
                                target="_blank"
                              >
                                Join
                              </Button>
                            )}
                          </Box>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            Class Schedule
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenWizard(true)}
          >
            Schedule New Class
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={view}
            onChange={(_, newValue) => setView(newValue)}
            indicatorColor="primary"
            textColor="primary"
            centered
          >
            <Tab value="list" label="List View" />
            <Tab value="calendar" label="Calendar View" />
          </Tabs>
        </Paper>

        <Dialog
          open={openWizard}
          onClose={() => setOpenWizard(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Schedule Class Sessions</DialogTitle>
          <DialogContent>
            <SchedulingWizard onComplete={handleWizardComplete} />
          </DialogContent>
        </Dialog>

        <Popover
          open={Boolean(anchorEl)}
          anchorEl={anchorEl}
          onClose={handlePopoverClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'center',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'center',
          }}
        >
          {renderStudentsList(selectedStudents)}
        </Popover>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          view === 'list' ? renderListView() : renderCalendarView()
        )}
      </Box>
    </Container>
  );
};

export default Schedule;
