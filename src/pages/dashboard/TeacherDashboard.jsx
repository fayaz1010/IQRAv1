import React from 'react';
import { useState, useEffect } from 'react';
import { useTheme } from '@mui/material/styles';
import { Container, Grid, Box, Typography } from '@mui/material';
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
  onSnapshot
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
  const { activeSession } = useSession();
  
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
          // For each day in the schedule
          if (schedule.daysOfWeek && schedule.duration) {
            const daysPerWeek = schedule.daysOfWeek.length;
            const durationHours = schedule.duration / 60; // Convert minutes to hours
            weeklyScheduledHours += daysPerWeek * durationHours;
          }
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
          
          try {
            // Get base date from session or use current date
            const baseDate = session.date ? 
              (session.date.toDate ? session.date.toDate() : new Date(session.date)) : 
              new Date();
            
            // Get start time
            const startTime = parseTime(session.startTime, baseDate);
            
            // Get end time
            let endTime = null;
            if (session.status === 'active') {
              endTime = new Date();
              activeSessions++;
            } else {
              endTime = parseTime(session.endTime, baseDate);
            }

            // Log processed times for debugging
            console.log('Processed times:', {
              id: doc.id,
              status: session.status,
              startTime: startTime?.toISOString(),
              endTime: endTime?.toISOString(),
              rawStart: session.startTime,
              rawEnd: session.endTime
            });

            // Calculate duration if we have both times
            if (startTime && endTime) {
              const duration = (endTime - startTime) / (1000 * 60 * 60); // Convert to hours

              // Only count positive durations less than 24 hours
              if (duration > 0 && duration < 24) {
                if (session.status === 'completed' || session.status === 'active') {
                  completedSessions++;
                  totalHours += duration;
                  
                  if (startTime >= oneWeekAgo) {
                    weeklyHours += duration;
                  }

                  console.log('Added duration:', {
                    id: doc.id,
                    status: session.status,
                    duration: duration.toFixed(2),
                    start: startTime.toISOString(),
                    end: endTime.toISOString(),
                    isThisWeek: startTime >= oneWeekAgo
                  });
                }
              } else if (duration >= 24) {
                console.warn('Skipping suspiciously long session:', {
                  id: doc.id,
                  duration: duration.toFixed(2),
                  start: startTime.toISOString(),
                  end: endTime.toISOString()
                });
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

        console.log('Teaching hours summary:', {
          total: totalHours,
          weekly: weeklyHours,
          completedSessions,
          activeSessions,
          averageHoursPerSession: completedSessions > 0 ? (totalHours / completedSessions).toFixed(2) : 0
        });

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

    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
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

  const handleStartSession = (classId) => {
    navigate(`/teaching/session/${classId}`);
  };

  const handleResumeSession = (sessionId) => {
    navigate(`/teaching/session/${sessionId}`);
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

          {/* Quick Actions and Today's Overview */}
          <Grid item xs={12} md={4}>
            <QuickActions todayStats={dashboardStats} />
          </Grid>

          {/* Live Teaching Panel */}
          <Grid item xs={12} md={8}>
            <TeachingPanel
              activeSessions={activeSessions}
              onResumeSession={handleResumeSession}
            />
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

          {/* Active Session */}
          <Grid item xs={12}>
            {activeSession ? (
              <ActiveSessionCard session={activeSession} />
            ) : (
              <Typography variant="body1" color="text.secondary" textAlign="center" py={4}>
                No active teaching session.
                <br />
                Start a new session from your schedule or quick actions.
              </Typography>
            )}
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
