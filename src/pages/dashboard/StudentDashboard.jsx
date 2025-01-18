import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Chip
} from '@mui/material';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import ActiveSessions from '../../components/dashboard/ActiveSessions';

const StudentDashboard = () => {
  const { currentUser } = useAuth();
  const [upcomingClasses, setUpcomingClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUpcomingClasses = async () => {
      if (!currentUser) return;

      try {
        // Get classes where student is enrolled
        const classesQuery = query(
          collection(db, 'classes'),
          where('studentIds', 'array-contains', currentUser.uid),
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
          {/* Active Sessions */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Active Sessions
              </Typography>
              <ActiveSessions />
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
        </Grid>
      </Container>
    </Box>
  );
};

export default StudentDashboard;
