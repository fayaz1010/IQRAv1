import { useState, useEffect } from 'react';
import { Box, Container, Grid, Paper, Typography, Card, CardContent, Chip } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import DashboardStats from '../../components/dashboard/DashboardStats';
import ActiveSessions from '../../components/dashboard/ActiveSessions'; // Import ActiveSessions component
import { db, query, collection, where, getDocs } from '../../firebase'; // Import firebase modules

// Components for each section
const LearningProgress = () => (
  <Paper sx={{ p: 3, height: '100%' }}>
    <Typography variant="h6" gutterBottom>Learning Progress</Typography>
    {/* Add learning progress content */}
  </Paper>
);

const TodayClasses = () => (
  <Paper sx={{ p: 3, height: '100%' }}>
    <Typography variant="h6" gutterBottom>Today's Classes</Typography>
    {/* Add today's classes content */}
  </Paper>
);

const UpcomingSchedule = () => (
  <Paper sx={{ p: 3, height: '100%' }}>
    <Typography variant="h6" gutterBottom>Upcoming Schedule</Typography>
    {/* Add upcoming schedule content */}
  </Paper>
);

const RecentActivities = () => (
  <Paper sx={{ p: 3, height: '100%' }}>
    <Typography variant="h6" gutterBottom>Recent Activities</Typography>
    {/* Add recent activities content */}
  </Paper>
);

const Dashboard = () => {
  const { currentUser } = useAuth();
  const [upcomingClasses, setUpcomingClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUpcomingClasses = async () => {
      if (!currentUser) return;

      try {
        // Get classes where user is the teacher
        const classesQuery = query(
          collection(db, 'classes'),
          where('teacherId', '==', currentUser.uid),
          where('status', '==', 'active')
        );

        const classesSnapshot = await getDocs(classesQuery);
        const classesData = [];

        for (const doc of classesSnapshot.docs) {
          const classData = doc.data();
          
          // If class has a schedule, process it
          if (classData.schedule) {
            const now = new Date();
            const nextClass = new Date(classData.schedule.nextSession);
            
            if (nextClass > now) {
              classesData.push({
                id: doc.id,
                ...classData,
                nextSession: nextClass
              });
            }
          }
        }

        // Sort by next session date
        classesData.sort((a, b) => a.nextSession - b.nextSession);
        setUpcomingClasses(classesData);
      } catch (error) {
        console.error('Error fetching upcoming classes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUpcomingClasses();
  }, [currentUser]);

  return (
    <Box
      component="main"
      sx={{
        flexGrow: 1,
        py: 4
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <DashboardStats />
          </Grid>

          {/* Active Sessions */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Active Sessions
              </Typography>
              <ActiveSessions isTeacher={true} />
            </Paper>
          </Grid>

          {/* Upcoming Classes */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Upcoming Classes
              </Typography>
              <Grid container spacing={2}>
                {upcomingClasses.map((classItem) => (
                  <Grid item xs={12} sm={6} md={4} key={classItem.id}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          {classItem.name}
                        </Typography>
                        <Typography variant="body2" color="textSecondary" gutterBottom>
                          Next Session: {classItem.nextSession.toLocaleString()}
                        </Typography>
                        <Box sx={{ mt: 1 }}>
                          <Chip
                            label={`Book ${classItem.course?.currentBook || 'Not set'}`}
                            size="small"
                            sx={{ mr: 1 }}
                          />
                          <Chip
                            label={`Page ${classItem.course?.currentPage || 'Not set'}`}
                            size="small"
                            color="primary"
                          />
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
                {!loading && upcomingClasses.length === 0 && (
                  <Grid item xs={12}>
                    <Typography variant="body1" color="textSecondary" align="center">
                      No upcoming classes scheduled
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <LearningProgress />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TodayClasses />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <UpcomingSchedule />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <RecentActivities />
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default Dashboard;
