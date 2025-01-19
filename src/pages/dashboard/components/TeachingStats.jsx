import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  useTheme
} from '@mui/material';
import {
  School as CoursesIcon,
  AccessTime as TeachingIcon,
  Group as StudentsIcon,
  Assignment as SessionsIcon,
  TrendingUp as WeeklyIcon,
  Class as TotalClassesIcon,
  ShowChart as ProgressIcon,
  CheckCircle as CompletionIcon
} from '@mui/icons-material';

const TeachingStats = ({ stats }) => {
  const theme = useTheme();

  const statCards = [
    {
      title: 'Total Courses',
      value: stats.totalCourses || 0,
      icon: <CoursesIcon sx={{ color: theme.palette.primary.main }} />,
      subtitle: null
    },
    {
      title: 'Teaching Hours',
      value: stats.totalTeachingHours || 0,
      icon: <TeachingIcon sx={{ color: theme.palette.success.main }} />,
      subtitle: 'Total hours'
    },
    {
      title: 'Total Students',
      value: stats.totalStudents || 0,
      icon: <StudentsIcon sx={{ color: theme.palette.info.main }} />,
      subtitle: null
    },
    {
      title: 'Total Sessions',
      value: stats.totalSessions || 0,
      icon: <SessionsIcon sx={{ color: theme.palette.warning.main }} />,
      subtitle: null
    },
    {
      title: 'Weekly Hours',
      value: stats.weeklyHours || 0,
      icon: <WeeklyIcon sx={{ color: theme.palette.primary.main }} />,
      subtitle: 'This week'
    },
    {
      title: 'Total Classes',
      value: stats.totalClasses || 0,
      icon: <TotalClassesIcon sx={{ color: theme.palette.error.main }} />,
      subtitle: 'All time'
    },
    {
      title: 'Average Progress',
      value: `${stats.averageProgress || 0}%`,
      icon: <ProgressIcon sx={{ color: theme.palette.info.main }} />,
      subtitle: null
    },
    {
      title: 'Completion Rate',
      value: `${stats.completionRate || 0}%`,
      icon: <CompletionIcon sx={{ color: theme.palette.success.main }} />,
      subtitle: null
    }
  ];

  return (
    <Grid container spacing={3}>
      {statCards.map((stat, index) => (
        <Grid item xs={12} sm={6} md={3} key={index}>
          <Card 
            sx={{ 
              height: '100%',
              backgroundColor: theme.palette.background.default,
              '&:hover': {
                backgroundColor: theme.palette.action.hover,
              }
            }}
          >
            <CardContent>
              <Grid container spacing={2} alignItems="center">
                <Grid item>
                  {stat.icon}
                </Grid>
                <Grid item xs>
                  <Typography variant="h6" component="div">
                    {stat.value}
                  </Typography>
                  <Typography variant="subtitle2" color="textSecondary">
                    {stat.title}
                  </Typography>
                  {stat.subtitle && (
                    <Typography variant="caption" color="textSecondary">
                      {stat.subtitle}
                    </Typography>
                  )}
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

export default TeachingStats;
