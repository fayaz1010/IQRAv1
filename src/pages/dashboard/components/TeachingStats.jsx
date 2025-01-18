import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Divider,
  IconButton,
  CircularProgress,
  useTheme
} from '@mui/material';
import {
  School as ClassesIcon,
  CheckCircle as CompletedIcon,
  Schedule as UpcomingIcon,
  Group as StudentsIcon,
  Info as InfoIcon
} from '@mui/icons-material';

const StatItem = ({ icon: Icon, label, value, color }) => {
  const theme = useTheme();
  
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: `${color}15`,
          mr: 2
        }}
      >
        <Icon sx={{ color }} />
      </Box>
      <Box sx={{ flexGrow: 1 }}>
        <Typography variant="body2" color="textSecondary">
          {label}
        </Typography>
        <Typography variant="h6">
          {value}
        </Typography>
      </Box>
    </Box>
  );
};

const CircularProgressWithLabel = ({ value, size = 120, thickness = 4 }) => {
  const theme = useTheme();
  
  return (
    <Box sx={{ position: 'relative', display: 'inline-flex' }}>
      <CircularProgress
        variant="determinate"
        value={100}
        size={size}
        thickness={thickness}
        sx={{ color: theme.palette.grey[200] }}
      />
      <CircularProgress
        variant="determinate"
        value={value}
        size={size}
        thickness={thickness}
        sx={{
          color: theme.palette.primary.main,
          position: 'absolute',
          left: 0
        }}
      />
      <Box
        sx={{
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
          position: 'absolute',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Typography variant="h4" component="div" color="text.primary">
          {value}%
        </Typography>
      </Box>
    </Box>
  );
};

const TeachingStats = ({ stats }) => {
  const theme = useTheme();
  const [completionRate, setCompletionRate] = useState(0);

  useEffect(() => {
    if (stats.totalClassesToday > 0) {
      const rate = Math.round((stats.completedClasses / stats.totalClassesToday) * 100);
      setCompletionRate(rate);
    }
  }, [stats]);

  return (
    <Paper sx={{ p: 3, height: '100%', borderRadius: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Teaching Stats
        </Typography>
        <IconButton size="small">
          <InfoIcon />
        </IconButton>
      </Box>

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          mb: 4
        }}
      >
        <CircularProgressWithLabel value={completionRate} />
        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
          Today's Completion Rate
        </Typography>
      </Box>

      <Divider sx={{ my: 3 }} />

      <StatItem
        icon={ClassesIcon}
        label="Total Classes Today"
        value={stats.totalClassesToday}
        color={theme.palette.primary.main}
      />

      <StatItem
        icon={CompletedIcon}
        label="Completed Classes"
        value={stats.completedClasses}
        color={theme.palette.success.main}
      />

      <StatItem
        icon={UpcomingIcon}
        label="Upcoming Classes"
        value={stats.upcomingClasses}
        color={theme.palette.warning.main}
      />

      <StatItem
        icon={StudentsIcon}
        label="Active Students"
        value={stats.activeStudents}
        color={theme.palette.info.main}
      />
    </Paper>
  );
};

export default TeachingStats;
