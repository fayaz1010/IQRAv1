import { useEffect, useState } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
} from '@mui/material';
import {
  Group as GroupIcon,
  Schedule as ScheduleIcon,
  Assessment as AssessmentIcon,
  PlayCircleFilled as StartIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';

const TeacherDashboard = () => {
  const { user } = useAuth();
  const [todayClasses, setTodayClasses] = useState([]);
  const [studentCount, setStudentCount] = useState(0);

  useEffect(() => {
    // TODO: Fetch teacher's classes and students from Firebase
    // This is placeholder data
    setTodayClasses([
      {
        id: 1,
        title: 'Iqra Book 1',
        time: '2:00 PM',
        students: 5,
        status: 'upcoming',
      },
      {
        id: 2,
        title: 'Arabic Basics',
        time: '3:30 PM',
        students: 8,
        status: 'upcoming',
      },
    ]);
    setStudentCount(25);
  }, []);

  const StatCard = ({ title, value, icon, color }) => (
    <Card
      component={motion.div}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
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
    </Card>
  );

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Teacher Dashboard</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<ScheduleIcon />}
          onClick={() => {/* TODO: Open schedule management */}}
        >
          Manage Schedule
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Stats */}
        <Grid item xs={12} md={4}>
          <StatCard
            title="Total Students"
            value={studentCount}
            icon={<GroupIcon color="primary" />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <StatCard
            title="Today's Classes"
            value={todayClasses.length}
            icon={<ScheduleIcon color="secondary" />}
            color="secondary"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <StatCard
            title="Pending Reviews"
            value="5"
            icon={<AssessmentIcon color="warning" />}
            color="warning"
          />
        </Grid>

        {/* Today's Classes */}
        <Grid item xs={12}>
          <Paper
            sx={{ p: 2 }}
            component={motion.div}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Typography variant="h6" gutterBottom>
              Today's Classes
            </Typography>
            <List>
              {todayClasses.map((class_) => (
                <ListItem
                  key={class_.id}
                  secondaryAction={
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<StartIcon />}
                      onClick={() => {/* TODO: Start class */}}
                    >
                      Start Class
                    </Button>
                  }
                >
                  <ListItemAvatar>
                    <Avatar>
                      <SchoolIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={class_.title}
                    secondary={`${class_.time} - ${class_.students} students`}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default TeacherDashboard;
