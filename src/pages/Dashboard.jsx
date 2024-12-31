import { useEffect, useState } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  CardActionArea,
} from '@mui/material';
import {
  School as SchoolIcon,
  Schedule as ScheduleIcon,
  Assignment as AssignmentIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();
  const [upcomingClasses, setUpcomingClasses] = useState([]);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // TODO: Fetch upcoming classes and progress from Firebase
    // This is placeholder data
    setUpcomingClasses([
      { id: 1, title: 'Basic Arabic', time: '2:00 PM', teacher: 'Mr. Ahmad' },
      { id: 2, title: 'Iqra Book 1', time: '3:30 PM', teacher: 'Mrs. Fatima' },
    ]);
    setProgress(65);
  }, []);

  const DashboardCard = ({ title, icon, value, color }) => (
    <Card
      component={motion.div}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      sx={{ height: '100%' }}
    >
      <CardActionArea sx={{ height: '100%' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            {icon}
            <Typography variant="h6" sx={{ ml: 1 }}>
              {title}
            </Typography>
          </Box>
          <Typography variant="h4" color={color}>
            {value}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Welcome back, {user?.email}
      </Typography>

      <Grid container spacing={3}>
        {/* Stats Cards */}
        <Grid item xs={12} sm={6} md={3}>
          <DashboardCard
            title="Progress"
            icon={<TrendingUpIcon color="primary" />}
            value={`${progress}%`}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <DashboardCard
            title="Classes Today"
            icon={<SchoolIcon color="secondary" />}
            value="2"
            color="secondary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <DashboardCard
            title="Next Class"
            icon={<ScheduleIcon color="success" />}
            value="2:00 PM"
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <DashboardCard
            title="Assignments"
            icon={<AssignmentIcon color="warning" />}
            value="3"
            color="warning"
          />
        </Grid>

        {/* Upcoming Classes */}
        <Grid item xs={12}>
          <Paper
            sx={{ p: 2 }}
            component={motion.div}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Typography variant="h6" gutterBottom>
              Upcoming Classes
            </Typography>
            <Grid container spacing={2}>
              {upcomingClasses.map((class_) => (
                <Grid item xs={12} sm={6} md={4} key={class_.id}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6">{class_.title}</Typography>
                      <Typography color="textSecondary">
                        Time: {class_.time}
                      </Typography>
                      <Typography color="textSecondary">
                        Teacher: {class_.teacher}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard;
