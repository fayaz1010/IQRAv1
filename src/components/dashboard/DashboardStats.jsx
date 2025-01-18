import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, getFirestore } from 'firebase/firestore';
import { Box, Grid } from '@mui/material';
import StatsCard from './StatsCard';
import { useAuth } from '../../contexts/AuthContext';
import {
  School as ClassesIcon,
  Assignment as AssignmentsIcon,
  TrendingUp as ProgressIcon,
  Event as NextClassIcon
} from '@mui/icons-material';

const DashboardStats = () => {
  const [stats, setStats] = useState({
    progress: 0,
    classesToday: 0,
    nextClass: 'No classes',
    assignments: 0
  });

  const { currentUser } = useAuth();
  const db = getFirestore();

  useEffect(() => {
    const fetchTeacherStats = async () => {
      if (!currentUser) return;

      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Fetch today's classes
        const todayClassesQuery = query(
          collection(db, 'classes'),
          where('teacherId', '==', currentUser.uid),
          where('schedule.nextSession', '>=', today),
          where('schedule.nextSession', '<', tomorrow)
        );
        const todayClassesSnapshot = await getDocs(todayClassesQuery);
        const classesToday = todayClassesSnapshot.size;

        // Find next class
        const nextClassQuery = query(
          collection(db, 'classes'),
          where('teacherId', '==', currentUser.uid),
          where('schedule.nextSession', '>=', new Date()),
          where('status', '==', 'active')
        );
        const nextClassSnapshot = await getDocs(nextClassQuery);
        let nextClass = 'No classes';
        let earliestTime = null;

        nextClassSnapshot.forEach(doc => {
          const classData = doc.data();
          const nextSession = classData.schedule?.nextSession?.toDate();
          if (nextSession && (!earliestTime || nextSession < earliestTime)) {
            earliestTime = nextSession;
            nextClass = classData.name;
          }
        });

        // Fetch assignments
        const assignmentsQuery = query(
          collection(db, 'assignments'),
          where('teacherId', '==', currentUser.uid),
          where('status', '==', 'active')
        );
        const assignmentsSnapshot = await getDocs(assignmentsQuery);
        const assignments = assignmentsSnapshot.size;

        // Calculate progress
        const classesQuery = query(
          collection(db, 'classes'),
          where('teacherId', '==', currentUser.uid)
        );
        const classesSnapshot = await getDocs(classesQuery);
        let totalProgress = 0;
        let classCount = 0;

        classesSnapshot.forEach(doc => {
          const classData = doc.data();
          if (classData.progress) {
            totalProgress += classData.progress;
            classCount++;
          }
        });

        const averageProgress = classCount > 0 ? Math.round(totalProgress / classCount) : 0;

        setStats({
          progress: averageProgress,
          classesToday,
          nextClass,
          assignments
        });

      } catch (error) {
        console.error('Error fetching teacher stats:', error);
      }
    };

    fetchTeacherStats();
    // Set up real-time listener for changes
    const interval = setInterval(fetchTeacherStats, 60000); // Refresh every minute

    return () => clearInterval(interval);
  }, [currentUser, db]);

  return (
    <Box sx={{ width: '100%' }}>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Progress"
            value={`${stats.progress}%`}
            icon={<ProgressIcon />}
            color="info"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Classes Today"
            value={stats.classesToday}
            icon={<ClassesIcon />}
            color="warning"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Next Class"
            value={stats.nextClass}
            icon={<NextClassIcon />}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Assignments"
            value={stats.assignments}
            icon={<AssignmentsIcon />}
            color="error"
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardStats;
