import { Box, Grid, Paper, Typography, useTheme } from '@mui/material';
import {
  TrendingUp as ProgressIcon,
  School as ClassesIcon,
  Event as NextClassIcon,
  Assignment as AssignmentsIcon,
  Group as StudentsIcon,
  CalendarMonth as TotalClassesIcon,
  CheckCircle as CompletedIcon,
  Schedule as UpcomingIcon
} from '@mui/icons-material';

const StatCard = ({ title, value, icon: Icon, color, subtitle }) => {
  const theme = useTheme();
  
  return (
    <Paper
      sx={{
        p: 2,
        height: '100%',
        borderRadius: 2,
        background: `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)`,
        display: 'flex',
        alignItems: 'center',
        transition: 'transform 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[4]
        }
      }}
    >
      <Box
        sx={{
          width: 56,
          height: 56,
          borderRadius: 2,
          backgroundColor: `${color}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mr: 2
        }}
      >
        <Icon sx={{ fontSize: 32, color: color }} />
      </Box>
      <Box>
        <Typography variant="body2" color="textSecondary">
          {title}
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 'medium', color: 'text.primary' }}>
          {value}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="textSecondary">
            {subtitle}
          </Typography>
        )}
      </Box>
    </Paper>
  );
};

const DashboardStats = ({ stats }) => {
  const theme = useTheme();

  const formatNextClass = (nextClass) => {
    if (nextClass === 'No classes') return 'No upcoming classes';
    return nextClass;
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Total Students"
          value={stats.totalStudents || 0}
          subtitle={`${stats.activeStudents || 0} active`}
          icon={StudentsIcon}
          color={theme.palette.primary.main}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Total Classes"
          value={stats.totalClasses || 0}
          subtitle="All scheduled classes"
          icon={TotalClassesIcon}
          color={theme.palette.warning.main}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Today's Classes"
          value={stats.totalClassesToday || 0}
          subtitle={`${stats.completedClasses || 0} completed`}
          icon={ClassesIcon}
          color={theme.palette.success.main}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Assignments"
          value={stats.assignments || 0}
          subtitle="Pending assignments"
          icon={AssignmentsIcon}
          color={theme.palette.error.main}
        />
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Next Class"
          value={formatNextClass(stats.nextClass)}
          icon={NextClassIcon}
          color={theme.palette.info.main}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Completed Today"
          value={stats.completedClasses || 0}
          subtitle={`${((stats.completedClasses / stats.totalClassesToday) * 100 || 0).toFixed(0)}% completion rate`}
          icon={CompletedIcon}
          color={theme.palette.success.main}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Upcoming Classes"
          value={stats.upcomingClasses || 0}
          subtitle="Scheduled ahead"
          icon={UpcomingIcon}
          color={theme.palette.warning.main}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Progress"
          value={`${stats.progress || 0}%`}
          subtitle="Overall completion"
          icon={ProgressIcon}
          color={theme.palette.primary.main}
        />
      </Grid>
    </Grid>
  );
};

export default DashboardStats;
