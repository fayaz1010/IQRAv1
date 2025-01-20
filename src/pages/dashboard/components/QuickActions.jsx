import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  useTheme
} from '@mui/material';
import {
  PlayArrow as StartIcon,
  Schedule as ScheduleIcon,
  Group as StudentsIcon,
  Book as BookIcon,
  Assignment as AssignmentIcon,
  Settings as SettingsIcon,
  Class as ClassIcon,
  CheckCircle as CompletedIcon,
  Upcoming as UpcomingIcon,
  People as ActiveStudentsIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const QuickActions = ({ todayStats }) => {
  const theme = useTheme();
  const navigate = useNavigate();

  const todayCards = [
    {
      title: "Today's Classes",
      value: todayStats?.totalClassesToday || 0,
      icon: <ClassIcon sx={{ color: theme.palette.primary.main }} />,
      color: theme.palette.primary.main
    },
    {
      title: 'Completed',
      value: todayStats?.completedClasses || 0,
      icon: <CompletedIcon sx={{ color: theme.palette.success.main }} />,
      color: theme.palette.success.main
    },
    {
      title: 'Upcoming',
      value: todayStats?.upcomingClasses || 0,
      icon: <UpcomingIcon sx={{ color: theme.palette.warning.main }} />,
      color: theme.palette.warning.main
    },
    {
      title: 'Active Students',
      value: todayStats?.activeStudents || 0,
      icon: <ActiveStudentsIcon sx={{ color: theme.palette.info.main }} />,
      color: theme.palette.info.main
    }
  ];

  const actions = [
    {
      title: 'Start Teaching',
      icon: <StartIcon />,
      onClick: () => navigate('/teaching/active-sessions'),
      color: theme.palette.success.main
    },
    {
      title: 'Schedule',
      icon: <ScheduleIcon />,
      onClick: () => navigate('/schedule'),
      color: theme.palette.primary.main
    },
    {
      title: 'Students',
      icon: <StudentsIcon />,
      onClick: () => navigate('/teacher/students'),
      color: theme.palette.info.main
    },
    {
      title: 'Materials',
      icon: <BookIcon />,
      onClick: () => navigate('/materials'),
      color: theme.palette.warning.main
    },
    {
      title: 'Assessments',
      icon: <AssignmentIcon />,
      onClick: () => navigate('/assessments'),
      color: theme.palette.error.main
    },
    {
      title: 'Settings',
      icon: <SettingsIcon />,
      onClick: () => navigate('/settings'),
      color: theme.palette.grey[600]
    }
  ];

  return (
    <Box>
      {/* Today's Stats */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Today's Overview
        </Typography>
        <Grid container spacing={2}>
          {todayCards.map((stat) => (
            <Grid item xs={6} key={stat.title}>
              <Card sx={{ height: '100%', boxShadow: 'none', bgcolor: `${stat.color}08` }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    {stat.icon}
                    <Typography
                      variant="body2"
                      sx={{
                        ml: 1,
                        color: stat.color,
                        fontWeight: 500
                      }}
                    >
                      {stat.title}
                    </Typography>
                  </Box>
                  <Typography variant="h4" sx={{ color: stat.color }}>
                    {stat.value}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Quick Actions */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Quick Actions
        </Typography>
        <Grid container spacing={2}>
          {actions.map((action) => (
            <Grid item xs={4} key={action.title}>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center'
                }}
              >
                <Tooltip title={action.title}>
                  <IconButton
                    onClick={action.onClick}
                    sx={{
                      color: action.color,
                      bgcolor: `${action.color}08`,
                      '&:hover': {
                        bgcolor: `${action.color}15`
                      },
                      mb: 1
                    }}
                  >
                    {action.icon}
                  </IconButton>
                </Tooltip>
                <Typography
                  variant="caption"
                  sx={{
                    color: theme.palette.text.primary,
                    fontWeight: 500,
                    maxWidth: '100%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    display: 'block'
                  }}
                >
                  {action.title}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Paper>
    </Box>
  );
};

export default QuickActions;
