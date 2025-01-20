import React from 'react';
import { useState, useEffect } from 'react';
import { useTheme } from '@mui/material/styles';
import { Container, Grid, Box, Typography, Button, CircularProgress, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../config/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  doc,
  getDoc,
  orderBy,
  limit,
  onSnapshot,
  updateDoc
} from 'firebase/firestore';
import { startOfDay, endOfDay } from 'date-fns';
import { getSchedules } from '../../services/scheduleService';
import TeachingPanel from './components/TeachingPanel';
import StudentProgressGrid from './components/StudentProgressGrid';
import QuickActions from './components/QuickActions';
import TeachingStats from './components/TeachingStats';
import UpcomingClasses from './components/UpcomingClasses';
import ActiveSessionCard from './components/ActiveSessionCard';
import { useSession } from '../../features/iqra/contexts/SessionContext';
import {
  School as SchoolIcon,
  Group as GroupIcon,
  CheckCircle as CheckCircleIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import StatsCard from './components/StatsCard';

const TeacherDashboard = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { activeSession, startSession, closeAllSessions } = useSession();
  
  // State for dashboard data
  const [activeSessions, setActiveSessions] = useState([]);
  const [upcomingClasses, setUpcomingClasses] = useState([]);
  const [studentProgress, setStudentProgress] = useState({});
  const [dashboardStats, setDashboardStats] = useState({
    totalCourses: 0,
    totalTeachingHours: 0,
    totalStudents: 0,
    totalSessions: 0,
    weeklyHours: 0,
    totalClasses: 0,
    averageProgress: 0,
    completionRate: 0,
    totalClassesToday: 0,
    completedClasses: 0,
    upcomingClasses: 0,
    activeStudents: 0
  });
  const [todayClasses, setTodayClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalClasses: 0,
    activeStudents: 0,
    completedSessions: 0,
    averageProgress: 0
  });
  const [teachingStats, setTeachingStats] = useState({
    totalHours: 0,
    weeklyHours: 0,
    completedSessions: 0,
    activeSessions: 0,
    averageHoursPerSession: 0
  });
  const [isClosingAll, setIsClosingAll] = useState(false);

  useEffect(() => {
    if (!currentUser) return;

    // Listen for active sessions
    const sessionsRef = collection(db, 'sessions');
    const q = query(
      sessionsRef,
      where('teacherId', '==', currentUser.uid),
      where('status', '==', 'active')
    );

    console.log('Setting up sessions listener...');
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      try {
        console.log('Received sessions update, docs count:', snapshot.docs.length);
        const sessionsData = [];
        
        for (const document of snapshot.docs) {
          const data = document.data();
          
          // Skip if it's not truly active
          if (data.status !== 'active' || data.endTime !== null) {
            console.log('Skipping non-active session:', document.id);
            continue;
          }

          console.log('Processing active session:', document.id, data);
          
          // Create base session data
          const sessionData = {
            id: document.id,
            ...data,
            startTime: data.startTime || Timestamp.now(),
            book: data.book || 'Untitled Book',
            currentPage: data.currentPage || 1,
            classData: null // Initialize classData
          };

          // Fetch class data if it exists
          if (sessionData.classId) {
            try {
              const classRef = doc(db, 'classes', sessionData.classId);
              const classDoc = await getDoc(classRef);
              
              if (classDoc.exists()) {
                const classData = classDoc.data();
                // Set class data properly
                sessionData.classData = {
                  id: classDoc.id,
                  name: classData.name || 'Untitled Class',
                  studentIds: classData.studentIds || [],
                  ...classData
                };

                console.log('Class data fetched:', {
                  sessionId: sessionData.id,
                  className: sessionData.classData.name,
                  studentIds: sessionData.classData.studentIds
                });
                
                // Fetch course data if it exists
                if (classData.courseId) {
                  const courseRef = doc(db, 'courses', classData.courseId);
                  const courseDoc = await getDoc(courseRef);
                  if (courseDoc.exists()) {
                    sessionData.classData.course = {
                      id: courseDoc.id,
                      ...courseDoc.data()
                    };
                  }
                }
                
                // Fetch students data
                if (classData.studentIds?.length > 0) {
                  const studentPromises = classData.studentIds.map(async studentId => {
                    try {
                      const studentRef = doc(db, 'users', studentId);
                      const studentDoc = await getDoc(studentRef);
                      if (studentDoc.exists()) {
                        return {
                          id: studentId,
                          ...studentDoc.data()
                        };
                      }
                    } catch (error) {
                      console.error('Error fetching student:', studentId, error);
                    }
                    return null;
                  });
                  
                  const studentResults = await Promise.all(studentPromises);
                  sessionData.classData.students = studentResults.filter(student => student !== null);
                }
              }
            } catch (error) {
              console.error('Error fetching class data:', error);
              // Don't fail the whole operation if class data fetch fails
              sessionData.classData = {
                name: 'Untitled Class',
                studentIds: [],
                error: error.message
              };
            }
          }

          console.log('Adding processed session to list:', {
            id: sessionData.id,
            hasClassData: !!sessionData.classData,
            className: sessionData.classData?.name,
            startTime: sessionData.startTime
          });

          sessionsData.push(sessionData);
        }

        console.log('Setting active sessions:', sessionsData.length);
        setActiveSessions(sessionsData);
        setLoading(false);
      } catch (error) {
        console.error('Error processing sessions:', error);
        setError(error.message);
        setLoading(false);
      }
    }, (error) => {
      console.error('Sessions listener error:', error);
      setError(error.message);
      setLoading(false);
    });

    return () => {
      console.log('Cleaning up sessions listener');
      unsubscribe();
    };
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    const fetchDashboardData = async () => {
      const now = new Date();
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date(now);
      endOfToday.setHours(23, 59, 59, 999);

      try {
        // 1. Query for courses (classes)
        const coursesQuery = query(
          collection(db, 'classes'),
          where('teacherId', '==', currentUser.uid)
        );

        // 2. Query for all sessions
        const allSessionsQuery = query(
          collection(db, 'sessions'),
          where('teacherId', '==', currentUser.uid)
        );

        // Fetch all data in parallel
        const [coursesSnap, sessionsSnap, schedulesData] = await Promise.all([
          getDocs(coursesQuery),
          getDocs(allSessionsQuery),
          getSchedules(currentUser.uid, 'teacher')
        ]);

        // Calculate weekly scheduled hours
        let weeklyScheduledHours = 0;
        schedulesData.forEach(schedule => {
          // Each schedule contributes: number of weeks × classes per week
          const weeksInTerm = 12; // Assuming 12-week term
          const classesPerWeek = schedule.daysOfWeek?.length || 0;
          weeklyScheduledHours += weeksInTerm * classesPerWeek;
        });

        console.log('Weekly scheduled hours:', {
          total: weeklyScheduledHours,
          scheduleCount: schedulesData.length,
          schedules: schedulesData.map(s => ({
            days: s.daysOfWeek?.length || 0,
            duration: s.duration || 0,
            timeSlots: s.timeSlots
          }))
        });

        // Process courses
        const totalCourses = coursesSnap.size;
        let totalStudents = 0;
        const studentSet = new Set();

        // Get unique students from all courses
        coursesSnap.forEach(doc => {
          const classData = doc.data();
          if (classData.studentIds) {
            classData.studentIds.forEach(id => studentSet.add(id));
          }
        });
        totalStudents = studentSet.size;

        // Process all sessions
        const oneWeekAgo = new Date(now);
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        let totalHours = 0;
        let weeklyHours = 0;
        let completedSessions = 0;
        let activeSessions = 0;
        const activeSessionsList = [];

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

        // Process each session
        sessionsSnap.forEach(doc => {
          const session = doc.data();
          session.id = doc.id;
          
          try {
            // Get base date from session or use current date
            const baseDate = session.date ? 
              (session.date.toDate ? session.date.toDate() : new Date(session.date)) : 
              new Date();
            
            // Get start time
            const startTime = parseTime(session.startTime, baseDate);
            
            // Get end time
            let endTime = null;
            
            // Check if session is truly active (has start time but no end time)
            const isActive = session.startTime && !session.endTime && session.status === 'active';
            
            if (isActive) {
              endTime = new Date(); // Use current time for active sessions
              // Only count as active if it's less than 24 hours old
              const sessionAge = (endTime - startTime) / (1000 * 60 * 60); // in hours
              if (sessionAge <= 24) {
                activeSessions++;
                // Only add to activeSessionsList if we don't already have a session for this class
                const existingSessionIndex = activeSessionsList.findIndex(s => s.classId === session.classId);
                if (existingSessionIndex === -1) {
                  activeSessionsList.push(session);
                } else {
                  // If we have an existing session for this class, keep the most recent one
                  const existingSession = activeSessionsList[existingSessionIndex];
                  const existingStartTime = parseTime(existingSession.startTime, baseDate);
                  if (startTime > existingStartTime) {
                    activeSessionsList[existingSessionIndex] = session;
                  }
                }
              } else {
                // Auto-end sessions older than 24 hours
                const sessionRef = doc(db, 'sessions', session.id);
                updateDoc(sessionRef, {
                  status: 'completed',
                  endTime: new Date(),
                  endedAutomatically: true
                }).catch(error => console.error('Error auto-ending old session:', error));
              }
            } else if (session.status === 'completed') {
              endTime = parseTime(session.endTime, baseDate);
            }

            // Log processed times for debugging
            console.log('Processed times:', {
              id: doc.id,
              status: session.status,
              isActive,
              startTime: startTime?.toISOString(),
              endTime: endTime?.toISOString(),
              rawStart: session.startTime,
              rawEnd: session.endTime
            });

            // Calculate duration if we have both times
            if (startTime && endTime) {
              const duration = (endTime - startTime) / (1000 * 60 * 60); // Convert to hours

              // Include all positive durations for active sessions, but filter suspicious completed sessions
              if (duration > 0 && (isActive || duration < 24)) {
                if (session.status === 'completed' || isActive) {
                  completedSessions++;
                  totalHours += duration;
                  
                  if (startTime >= oneWeekAgo) {
                    weeklyHours += duration;
                  }

                  console.log('Added duration:', {
                    id: doc.id,
                    status: session.status,
                    isActive,
                    duration: duration.toFixed(2),
                    start: startTime.toISOString(),
                    end: endTime.toISOString(),
                    isThisWeek: startTime >= oneWeekAgo
                  });
                }
              }
            }
          } catch (error) {
            console.error('Error processing session:', {
              id: doc.id,
              error: error.message,
              sessionData: session
            });
          }
        });

        // Round hours to 1 decimal place
        totalHours = Math.round(totalHours * 10) / 10;
        weeklyHours = Math.round(weeklyHours * 10) / 10;

        setTeachingStats({
          totalHours,
          weeklyHours,
          completedSessions,
          activeSessions,
          averageHoursPerSession: (totalHours / (completedSessions || 1)).toFixed(2)
        });
        
        console.log('Teaching hours summary:', {
          total: totalHours,
          weekly: weeklyHours,
          completedSessions,
          activeSessions: activeSessionsList.length,
          averageHoursPerSession: (totalHours / (completedSessions || 1)).toFixed(2)
        });

        // Update active sessions state
        setActiveSessions(activeSessionsList);

        // Process today's classes using schedules
        const todayClasses = [];
        let activeStudentsSet = new Set();
        let completedToday = 0;
        let upcomingToday = 0;

        // Get today's day of week (0-6, where 0 is Sunday)
        const todayDayOfWeek = now.getDay();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();

        // Process schedules for today's classes
        schedulesData.forEach(schedule => {
          if (schedule.daysOfWeek && schedule.daysOfWeek.includes(todayDayOfWeek)) {
            // This schedule has a class today
            const timeSlot = schedule.timeSlots[todayDayOfWeek];
            if (timeSlot) {
              const [hours, minutes] = timeSlot.split(':').map(Number);
              const classTime = new Date(now);
              classTime.setHours(hours, minutes, 0, 0);

              // Add to today's classes
              todayClasses.push({
                id: schedule.classId,
                scheduleId: schedule.id,
                className: schedule.className,
                timeSlot,
                duration: schedule.duration
              });

              // Check if it's completed or upcoming
              if (classTime < now) {
                completedToday++;
              } else {
                upcomingToday++;
              }
            }
          }
        });

        // Get active students from today's classes
        if (todayClasses.length > 0) {
          const classIds = todayClasses.map(c => c.id);
          const classesQuery = query(
            collection(db, 'classes'),
            where('__name__', 'in', classIds)
          );
          const classesSnap = await getDocs(classesQuery);
          
          classesSnap.forEach(doc => {
            const classData = doc.data();
            if (classData.studentIds) {
              classData.studentIds.forEach(id => activeStudentsSet.add(id));
            }
          });
        }

        // Sort today's classes by time
        todayClasses.sort((a, b) => {
          const [hoursA, minutesA] = a.timeSlot.split(':').map(Number);
          const [hoursB, minutesB] = b.timeSlot.split(':').map(Number);
          return (hoursA * 60 + minutesA) - (hoursB * 60 + minutesB);
        });

        // Calculate completion rate based on schedules
        const totalScheduledClasses = schedulesData.reduce((total, schedule) => {
          // Each schedule contributes: number of weeks × classes per week
          const weeksInTerm = 12; // Assuming 12-week term
          const classesPerWeek = schedule.daysOfWeek?.length || 0;
          return total + (weeksInTerm * classesPerWeek);
        }, 0);
        
        const completionRate = totalScheduledClasses > 0 
          ? (completedSessions / totalScheduledClasses) * 100 
          : 0;

        // Update all stats
        setDashboardStats({
          totalCourses,
          totalTeachingHours: totalHours,
          totalStudents,
          totalSessions: completedSessions,
          weeklyHours: weeklyScheduledHours,
          totalClasses: coursesSnap.size,
          averageProgress: 0,
          completionRate: Math.round(completionRate),
          totalClassesToday: todayClasses.length,
          completedClasses: completedToday,
          upcomingClasses: upcomingToday,
          activeStudents: activeStudentsSet.size
        });

        // Set today's classes for the timeline
        setTodayClasses(todayClasses);

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }
    };

    // Initial fetch
    fetchDashboardData();

    // Set up real-time listener for active sessions using index: status, teacherId, type
    const activesListener = query(
      collection(db, 'sessions'),
      where('status', '==', 'active'),
      where('teacherId', '==', currentUser.uid),
      where('type', '==', 'teaching'),
      orderBy('__name__', 'asc')
    );

    const unsubscribe = onSnapshot(activesListener, (snapshot) => {
      const sessions = [];
      snapshot.forEach((doc) => {
        sessions.push({ id: doc.id, ...doc.data() });
      });
      setActiveSessions(sessions);
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser, navigate]);

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    const fetchStats = async () => {
      try {
        setLoading(true);
        
        // Get active session if exists
        const sessionsQuery = query(
          collection(db, 'sessions'),
          where('teacherId', '==', currentUser.uid),
          where('status', '==', 'active')
        );
        const sessionsSnapshot = await getDocs(sessionsQuery);
        
        // If there's more than one active session, we should probably clean up
        if (sessionsSnapshot.docs.length > 1) {
          console.warn('Multiple active sessions found - this should not happen');
        }

        // Get classes count
        const classesQuery = query(
          collection(db, 'classes'),
          where('teacherId', '==', currentUser.uid)
        );
        const classesSnapshot = await getDocs(classesQuery);
        
        // Get unique active students
        const activeStudents = new Set();
        classesSnapshot.docs.forEach(doc => {
          const studentIds = doc.data().studentIds || [];
          studentIds.forEach(id => activeStudents.add(id));
        });

        // Get completed sessions
        const completedSessionsQuery = query(
          collection(db, 'sessions'),
          where('teacherId', '==', currentUser.uid),
          where('status', '==', 'completed')
        );
        const completedSessionsSnapshot = await getDocs(completedSessionsQuery);
        
        // Calculate average progress
        const totalProgress = completedSessionsSnapshot.docs.reduce((acc, doc) => {
          const session = doc.data();
          const studentProgress = session.studentProgress || {};
          const progressValues = Object.values(studentProgress);
          const sessionAverage = progressValues.reduce((sum, progress) => {
            if (progress?.assessment) {
              const total = (
                progress.assessment.reading +
                progress.assessment.pronunciation +
                progress.assessment.memorization
              ) / 3;
              return sum + total;
            }
            return sum;
          }, 0) / (progressValues.length || 1);
          return acc + sessionAverage;
        }, 0);

        setStats({
          totalClasses: classesSnapshot.docs.length,
          activeStudents: activeStudents.size,
          completedSessions: completedSessionsSnapshot.docs.length,
          averageProgress: Math.round(totalProgress / (completedSessionsSnapshot.docs.length || 1))
        });

        setLoading(false);
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        setLoading(false);
      }
    };

    if (currentUser) {
      fetchStats();
    }
  }, [currentUser]);

  const handleStartSession = async (classId) => {
    try {
      // Get class data to find the first book
      const classRef = doc(db, 'classes', classId);
      const classDoc = await getDoc(classRef);
      if (!classDoc.exists()) {
        console.error('Class not found');
        return;
      }
      
      const classData = classDoc.data();
      const courseRef = doc(db, 'courses', classData.courseId);
      const courseDoc = await getDoc(courseRef);
      if (!courseDoc.exists()) {
        console.error('Course not found');
        return;
      }
      
      const courseData = courseDoc.data();
      const firstBook = courseData.iqraBooks?.[0];
      
      if (!firstBook) {
        console.error('No books found in course');
        return;
      }

      await startSession(classId, firstBook);
      navigate(`/classes/iqra`);
    } catch (error) {
      console.error('Error starting session:', error);
    }
  };

  // Use the same handler for both start and resume
  const handleResumeSession = handleStartSession;

  const handleCloseAllSessions = async () => {
    try {
      setIsClosingAll(true);
      const closedCount = await closeAllSessions();
      console.log(`Successfully closed ${closedCount} sessions`);
    } catch (error) {
      console.error('Failed to close all sessions:', error);
      setError('Failed to close all sessions. Please try again.');
    } finally {
      setIsClosingAll(false);
    }
  };

  const renderActiveSessions = () => {
    console.log('Rendering active sessions section, count:', activeSessions.length);
    
    if (activeSessions.length === 0) {
      return (
        <Typography variant="body1" color="text.secondary" align="center" py={3}>
          No active sessions
        </Typography>
      );
    }

    return activeSessions.map(session => {
      console.log('Rendering session card for:', {
        id: session.id,
        hasClassData: !!session.classData,
        status: session.status
      });
      return (
        <Grid item xs={12} key={session.id}>
          <ActiveSessionCard session={session} />
        </Grid>
      );
    });
  };

  return (
    <Box
      component="main"
      sx={{
        flexGrow: 1,
        py: 3,
        px: 2,
        backgroundColor: theme.palette.background.default
      }}
    >
      <Container maxWidth="xl">
        <Grid container spacing={3}>
          {/* Stats Overview */}
          <Grid item xs={12}>
            <TeachingStats stats={dashboardStats} />
          </Grid>

          {/* Quick Actions */}
          <Grid item xs={12} md={4}>
            <QuickActions todayStats={dashboardStats} />
          </Grid>

          {/* Active Teaching Sessions */}
          <Grid item xs={12} md={8}>
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Active Teaching Sessions
                </Typography>
                <Button
                  variant="outlined"
                  color="warning"
                  onClick={handleCloseAllSessions}
                  disabled={isClosingAll || activeSessions.length === 0}
                >
                  {isClosingAll ? (
                    <>
                      <CircularProgress size={20} sx={{ mr: 1 }} />
                      Closing All Sessions...
                    </>
                  ) : (
                    'Close All Sessions'
                  )}
                </Button>
              </Box>
              <Grid container spacing={2}>
                {renderActiveSessions()}
              </Grid>
            </Box>
          </Grid>

          {/* Upcoming Classes */}
          <Grid item xs={12} md={4}>
            <UpcomingClasses
              classes={upcomingClasses}
              onStartSession={handleStartSession}
            />
          </Grid>

          {/* Student Progress Grid */}
          <Grid item xs={12} md={8}>
            <StudentProgressGrid
              topPerformers={studentProgress.topPerformers}
              needAttention={studentProgress.needAttention}
              averageProgress={dashboardStats.averageProgress}
            />
          </Grid>

          {/* Stats */}
          <Grid item xs={12}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={3}>
                <StatsCard
                  icon={<SchoolIcon />}
                  title="Total Classes"
                  value={stats.totalClasses}
                  subtitle="All time"
                  color="primary"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatsCard
                  icon={<GroupIcon />}
                  title="Active Students"
                  value={stats.activeStudents}
                  subtitle="Currently enrolled"
                  color="success"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatsCard
                  icon={<CheckCircleIcon />}
                  title="Completed Sessions"
                  value={stats.completedSessions}
                  subtitle="All time"
                  color="info"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatsCard
                  icon={<TrendingUpIcon />}
                  title="Average Progress"
                  value={`${stats.averageProgress}%`}
                  subtitle="All students"
                  color="warning"
                />
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default TeacherDashboard;
