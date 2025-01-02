import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, getFirestore } from 'firebase/firestore';
import { Box, Grid } from '@mui/material';
import StatsCard from './StatsCard';
import { useAuth } from '../../contexts/AuthContext';
import {
  People as UsersIcon,
  School as ClassesIcon,
  Assignment as AssignmentsIcon,
  AccessTime as TimeIcon,
  Pending as PendingIcon,
  CheckCircle as HealthIcon,
  TrendingUp as ProgressIcon,
  Group as StudentsIcon,
} from '@mui/icons-material';

const DashboardStats = () => {
  const [stats, setStats] = useState({
    activeUsers: 0,
    activeClasses: 0,
    pendingApprovals: 0,
    systemHealth: 'Good',
    progress: 0,
    classesToday: 0,
    nextClass: '',
    assignments: 0,
    totalStudents: 0,
    averageProgress: 0,
  });

  const { currentUser } = useAuth();
  const db = getFirestore();

  const fetchTeacherStats = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Fetch teacher's classes for today
      const classesQuery = query(
        collection(db, 'classes'),
        where('teacherId', '==', currentUser.uid),
        where('date', '>=', today)
      );
      const classesSnapshot = await getDocs(classesQuery);
      const classesToday = classesSnapshot.size;

      // Find next class
      let nextClass = '';
      const now = new Date();
      classesSnapshot.forEach(doc => {
        const classData = doc.data();
        if (classData.date?.toDate() > now) {
          if (!nextClass || classData.date?.toDate() < nextClass) {
            nextClass = classData.date?.toDate().toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            });
          }
        }
      });

      // Fetch total number of students
      const studentsQuery = query(
        collection(db, 'enrollments'),
        where('teacherId', '==', currentUser.uid)
      );
      const studentsSnapshot = await getDocs(studentsQuery);
      const totalStudents = studentsSnapshot.size;

      // Fetch students' progress
      let totalProgress = 0;
      const progressPromises = studentsSnapshot.docs.map(async doc => {
        const progressQuery = query(
          collection(db, 'progress'),
          where('studentId', '==', doc.data().studentId)
        );
        const progressSnapshot = await getDocs(progressQuery);
        let studentProgress = 0;
        progressSnapshot.forEach(doc => {
          studentProgress += doc.data().progress || 0;
        });
        return progressSnapshot.size > 0 ? studentProgress / progressSnapshot.size : 0;
      });

      const progressResults = await Promise.all(progressPromises);
      const averageProgress = progressResults.length > 0
        ? Math.round(progressResults.reduce((a, b) => a + b, 0) / progressResults.length * 100)
        : 0;

      // Fetch pending assignments
      const assignmentsQuery = query(
        collection(db, 'assignments'),
        where('teacherId', '==', currentUser.uid),
        where('status', '==', 'pending')
      );
      const assignmentsSnapshot = await getDocs(assignmentsQuery);
      const assignments = assignmentsSnapshot.size;

      setStats(prev => ({
        ...prev,
        classesToday,
        nextClass,
        totalStudents,
        averageProgress,
        assignments,
      }));
    } catch (error) {
      console.error('Error fetching teacher stats:', error);
    }
  };

  const fetchAdminStats = async () => {
    try {
      // Fetch active users
      const usersQuery = query(collection(db, 'users'), where('status', '==', 'active'));
      const usersSnapshot = await getDocs(usersQuery);
      const activeUsers = usersSnapshot.size;

      // Fetch active classes
      const classesQuery = query(collection(db, 'classes'), where('status', '==', 'active'));
      const classesSnapshot = await getDocs(classesQuery);
      const activeClasses = classesSnapshot.size;

      // Fetch pending teacher approvals
      const teachersQuery = query(collection(db, 'users'), 
        where('role', '==', 'teacher'),
        where('status', '==', 'pending')
      );
      const teachersSnapshot = await getDocs(teachersQuery);
      const pendingApprovals = teachersSnapshot.size;

      setStats(prev => ({
        ...prev,
        activeUsers,
        activeClasses,
        pendingApprovals,
      }));
    } catch (error) {
      console.error('Error fetching admin stats:', error);
    }
  };

  const fetchStudentStats = async () => {
    try {
      // Fetch student's progress
      const progressQuery = query(
        collection(db, 'progress'),
        where('studentId', '==', currentUser.uid)
      );
      const progressSnapshot = await getDocs(progressQuery);
      let totalProgress = 0;
      progressSnapshot.forEach(doc => {
        totalProgress += doc.data().progress || 0;
      });
      const averageProgress = progressSnapshot.size > 0 
        ? Math.round((totalProgress / progressSnapshot.size) * 100) 
        : 0;

      // Fetch today's classes
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const classesQuery = query(
        collection(db, 'classes'),
        where('studentIds', 'array-contains', currentUser.uid),
        where('date', '>=', today)
      );
      const classesSnapshot = await getDocs(classesQuery);
      const classesToday = classesSnapshot.size;

      // Find next class
      let nextClass = '';
      const now = new Date();
      classesSnapshot.forEach(doc => {
        const classData = doc.data();
        if (classData.date?.toDate() > now) {
          if (!nextClass || classData.date?.toDate() < nextClass) {
            nextClass = classData.date?.toDate().toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            });
          }
        }
      });

      // Fetch pending assignments
      const assignmentsQuery = query(
        collection(db, 'assignments'),
        where('studentId', '==', currentUser.uid),
        where('status', '==', 'pending')
      );
      const assignmentsSnapshot = await getDocs(assignmentsQuery);
      const assignments = assignmentsSnapshot.size;

      setStats(prev => ({
        ...prev,
        progress: averageProgress,
        classesToday,
        nextClass,
        assignments,
      }));
    } catch (error) {
      console.error('Error fetching student stats:', error);
    }
  };

  useEffect(() => {
    if (!currentUser) return;

    if (currentUser.role === 'admin') {
      fetchAdminStats();
    } else if (currentUser.role === 'student') {
      fetchStudentStats();
    } else if (currentUser.role === 'teacher') {
      fetchTeacherStats();
    }
  }, [currentUser]);

  if (currentUser?.role === 'admin') {
    return (
      <Box sx={{ flexGrow: 1, p: 2 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard
              title="Active Users"
              value={stats.activeUsers}
              icon={<UsersIcon />}
              color="#2196f3"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard
              title="Active Classes"
              value={stats.activeClasses}
              icon={<ClassesIcon />}
              color="#ff9800"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard
              title="Pending Approvals"
              value={stats.pendingApprovals}
              icon={<PendingIcon />}
              color="#f44336"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard
              title="System Health"
              value={stats.systemHealth}
              icon={<HealthIcon />}
              color="#4caf50"
            />
          </Grid>
        </Grid>
      </Box>
    );
  }

  if (currentUser?.role === 'teacher') {
    return (
      <Box sx={{ flexGrow: 1, p: 2 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard
              title="Classes Today"
              value={stats.classesToday}
              icon={<ClassesIcon />}
              color="#ff9800"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard
              title="Next Class"
              value={stats.nextClass || 'No classes'}
              icon={<TimeIcon />}
              color="#4caf50"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard
              title="Total Students"
              value={stats.totalStudents}
              icon={<StudentsIcon />}
              color="#2196f3"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard
              title="Average Progress"
              value={`${stats.averageProgress}%`}
              icon={<ProgressIcon />}
              color="#9c27b0"
            />
          </Grid>
        </Grid>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, p: 2 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Progress"
            value={`${stats.progress}%`}
            icon={<ProgressIcon />}
            color="#2196f3"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Classes Today"
            value={stats.classesToday}
            icon={<ClassesIcon />}
            color="#ff9800"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Next Class"
            value={stats.nextClass || 'No classes'}
            icon={<TimeIcon />}
            color="#4caf50"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Assignments"
            value={stats.assignments}
            icon={<AssignmentsIcon />}
            color="#f44336"
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardStats;
