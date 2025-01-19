import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Avatar,
  LinearProgress,
  Chip,
  useTheme
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Star as StarIcon
} from '@mui/icons-material';

const StudentCard = ({ student, isTopPerformer }) => {
  const theme = useTheme();
  const progress = student.progress || 0;
  
  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 1,
        bgcolor: 'background.paper',
        boxShadow: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 2
      }}
    >
      <Avatar
        src={student.photoURL}
        alt={student.name}
        sx={{
          width: 48,
          height: 48,
          bgcolor: isTopPerformer ? 'warning.light' : 'error.light'
        }}
      >
        {student.name?.[0]}
      </Avatar>
      
      <Box sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
            {student.name}
          </Typography>
          {isTopPerformer ? (
            <Chip
              size="small"
              icon={<StarIcon />}
              label="Top Performer"
              color="warning"
              variant="outlined"
            />
          ) : (
            <Chip
              size="small"
              icon={<TrendingDownIcon />}
              label="Needs Attention"
              color="error"
              variant="outlined"
            />
          )}
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              flexGrow: 1,
              height: 8,
              borderRadius: 4,
              bgcolor: theme.palette.grey[200],
              '& .MuiLinearProgress-bar': {
                bgcolor: isTopPerformer ? 'warning.main' : 'error.main',
                borderRadius: 4
              }
            }}
          />
          <Typography
            variant="body2"
            color="textSecondary"
            sx={{ minWidth: 45 }}
          >
            {progress}%
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

const StudentProgressGrid = ({ topPerformers = [], needAttention = [], averageProgress = 0 }) => {
  const theme = useTheme();

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Student Progress Overview
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Class Average Progress: {averageProgress}%
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Top Performers */}
        <Grid item xs={12} md={6}>
          <Typography
            variant="subtitle1"
            sx={{
              mb: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              color: theme.palette.warning.dark
            }}
          >
            <TrendingUpIcon />
            Top Performing Students
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {topPerformers.map((student) => (
              <StudentCard
                key={student.id}
                student={student}
                isTopPerformer={true}
              />
            ))}
            {topPerformers.length === 0 && (
              <Typography variant="body2" color="textSecondary">
                No top performers to display
              </Typography>
            )}
          </Box>
        </Grid>

        {/* Needs Attention */}
        <Grid item xs={12} md={6}>
          <Typography
            variant="subtitle1"
            sx={{
              mb: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              color: theme.palette.error.dark
            }}
          >
            <TrendingDownIcon />
            Students Needing Attention
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {needAttention.map((student) => (
              <StudentCard
                key={student.id}
                student={student}
                isTopPerformer={false}
              />
            ))}
            {needAttention.length === 0 && (
              <Typography variant="body2" color="textSecondary">
                No students need attention at this time
              </Typography>
            )}
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default StudentProgressGrid;
