import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Avatar,
  IconButton,
  useTheme,
} from '@mui/material';
import { Settings as SettingsIcon } from '@mui/icons-material';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import TeachingPanel from './components/TeachingPanel';
import ScheduleTimeline from './components/ScheduleTimeline';
import StudentProgressGrid from './components/StudentProgressGrid';
import TeachingStats from './components/TeachingStats';
import DashboardStats from './components/DashboardStats';

const Dashboard = () => {
  const theme = useTheme();
  const { currentUser } = useAuth();
  const [activeSessions, setActiveSessions] = useState([]);
  const [todayClasses, setTodayClasses] = useState([]);
  const [recurringClasses, setRecurringClasses] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [teachingStats, setTeachingStats] = useState({
    totalClassesToday: 0,
    completedClasses: 0,
    upcomingClasses: 0,
    activeStudents: 0,
    totalStudents: 0,
    totalClasses: 0,
    progress: 0,
    nextClass: 'No classes',
    assignments: 0
  });

  // Function to calculate the date range for today
  const getTodayRange = () => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    return { startOfDay, endOfDay };
  };

  useEffect(() => {
    if (!currentUser?.uid) return;

    const { startOfDay, endOfDay } = getTodayRange();

    // Query for active sessions
    const sessionsQuery = query(
      collection(db, 'sessions'),
      where('teacherId', '==', currentUser.uid),
      where('status', '==', 'active'),
      where('endTime', '==', null)  // Only truly active sessions
    );

    // Query for recurring classes
    const recurringQuery = query(
      collection(db, 'schedules'),
      where('teacherId', '==', currentUser.uid),
      where('recurrencePattern', '==', 'weekly')
    );

    // Query for today's classes
    const classesQuery = query(
      collection(db, 'sessions'),
      where('teacherId', '==', currentUser.uid),
      where('date', '>=', startOfDay.toISOString()),
      where('date', '<=', endOfDay.toISOString())
    );

    // Query for all classes
    const allClassesQuery = query(
      collection(db, 'classes'),
      where('teacherId', '==', currentUser.uid)
    );

    // Query for assignments
    const assignmentsQuery = query(
      collection(db, 'assignments'),
      where('teacherId', '==', currentUser.uid),
      where('status', '==', 'pending')
    );

    // Subscribe to recurring classes
    const unsubscribeRecurring = onSnapshot(recurringQuery, async (snapshot) => {
      const recurring = [];
      for (const doc of snapshot.docs) {
        const scheduleData = { id: doc.id, ...doc.data() };
        
        // Get class details for each schedule
        const classRef = collection(db, 'classes');
        const classSnap = await getDocs(query(classRef, where('__name__', '==', scheduleData.classId)));
        if (!classSnap.empty) {
          const classData = { id: classSnap.docs[0].id, ...classSnap.docs[0].data() };
          recurring.push({
            ...scheduleData,
            name: classData.name,
            studentIds: classData.studentIds,
            book: classData.book,
            dayOfWeek: scheduleData.daysOfWeek[0], // Assuming one day per schedule for now
            hour: new Date(scheduleData.timeSlots[scheduleData.daysOfWeek[0]]).getHours(),
            minute: new Date(scheduleData.timeSlots[scheduleData.daysOfWeek[0]]).getMinutes()
          });
        }
      }
      setRecurringClasses(recurring);
    });

    // Subscribe to active sessions
    const unsubscribeSessions = onSnapshot(sessionsQuery, (snapshot) => {
      const sessions = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        // Only include sessions that are actually active (have a start time but no end time)
        if (data.startTime && !data.endTime) {
          sessions.push({ id: doc.id, ...data });
          console.log('Found active session:', { id: doc.id, ...data });
        }
      });
      console.log('Teacher Dashboard active sessions:', sessions);
      setActiveSessions(sessions);
    });

    // Subscribe to today's classes
    const unsubscribeClasses = onSnapshot(classesQuery, async (snapshot) => {
      const classes = [];
      for (const doc of snapshot.docs) {
        const sessionData = { id: doc.id, ...doc.data() };
        
        // Get class details for each session
        const classRef = collection(db, 'classes');
        const classSnap = await getDocs(query(classRef, where('__name__', '==', sessionData.classId)));
        if (!classSnap.empty) {
          const classData = { id: classSnap.docs[0].id, ...classSnap.docs[0].data() };
          classes.push({
            ...sessionData,
            name: classData.name,
            studentIds: classData.studentIds,
            book: classData.book,
            date: sessionData.date
          });
        }
      }
      setTodayClasses(classes);
      
      // Update teaching stats
      const now = new Date();
      const completed = classes.filter(c => new Date(c.date) < now).length;
      const upcoming = classes.filter(c => new Date(c.date) > now).length;
      const nextClass = classes
        .filter(c => new Date(c.date) > now)
        .sort((a, b) => new Date(a.date) - new Date(b.date))[0];

      setTeachingStats(prev => ({
        ...prev,
        totalClassesToday: classes.length,
        completedClasses: completed,
        upcomingClasses: upcoming,
        nextClass: nextClass ? nextClass.name : 'No classes'
      }));
    });

    // Subscribe to assignments
    const unsubscribeAssignments = onSnapshot(assignmentsQuery, (snapshot) => {
      setTeachingStats(prev => ({
        ...prev,
        assignments: snapshot.size
      }));
    });

    // Fetch all students
    const fetchStudents = async () => {
      try {
        // Get unique student IDs from both regular and recurring classes
        const studentIds = new Set();
        
        // From regular classes
        const regularClassesSnap = await getDocs(allClassesQuery);
        regularClassesSnap.forEach(doc => {
          const classData = doc.data();
          classData.studentIds?.forEach(id => studentIds.add(id));
        });
        
        // From recurring classes
        recurringClasses.forEach(rc => {
          rc.studentIds?.forEach(id => studentIds.add(id));
        });

        // Fetch student details
        if (studentIds.size > 0) {
          const studentsQuery = query(
            collection(db, 'users'),
            where('role', '==', 'student'),
            where('__name__', 'in', Array.from(studentIds))
          );
          
          const studentsSnap = await getDocs(studentsQuery);
          const students = [];
          studentsSnap.forEach(doc => {
            students.push({ id: doc.id, ...doc.data() });
          });
          setAllStudents(students);
          
          // Update teaching stats with student count
          setTeachingStats(prev => ({
            ...prev,
            totalStudents: students.length,
            activeStudents: students.filter(s => s.status !== 'inactive').length || students.length
          }));
        }
      } catch (error) {
        console.error('Error fetching students:', error);
      }
    };

    // Fetch all classes to get total count
    const fetchAllClasses = async () => {
      try {
        const snapshot = await getDocs(allClassesQuery);
        setTeachingStats(prev => ({
          ...prev,
          totalClasses: snapshot.size
        }));
      } catch (error) {
        console.error('Error fetching all classes:', error);
      }
    };

    // Initial fetches
    fetchStudents();
    fetchAllClasses();

    // Cleanup subscriptions
    return () => {
      unsubscribeRecurring();
      unsubscribeSessions();
      unsubscribeClasses();
      unsubscribeAssignments();
    };
  }, [currentUser]);

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        {/* Stats Overview */}
        <Grid item xs={12}>
          <DashboardStats stats={teachingStats} />
        </Grid>

        {/* Teaching Stats */}
        <Grid item xs={12} md={4}>
          <TeachingStats stats={teachingStats} />
        </Grid>

        {/* Schedule Timeline */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%', borderRadius: 2 }}>
            <ScheduleTimeline
              classes={todayClasses}
              recurringClasses={recurringClasses}
            />
          </Paper>
        </Grid>

        {/* Active Teaching Panel */}
        <Grid item xs={12} md={8}>
          <TeachingPanel
            activeSessions={activeSessions}
          />
        </Grid>

        {/* Student Progress */}
        <Grid item xs={12} md={4}>
          <StudentProgressGrid
            classes={todayClasses}
            activeSessions={activeSessions}
          />
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard;
