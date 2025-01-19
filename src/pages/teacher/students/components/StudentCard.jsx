import React from 'react';
import {
  Card,
  CardContent,
  CardActionArea,
  Typography,
  Box,
  Avatar,
  Chip,
  LinearProgress,
  Tooltip
} from '@mui/material';
import {
  AccessTime as AccessTimeIcon,
  School as SchoolIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';

const StudentCard = ({ student }) => {
  const navigate = useNavigate();
  const {
    id,
    name,
    photoURL,
    classes,
    statistics
  } = student;

  const getProgressColor = (progress) => {
    if (progress >= 80) return 'success';
    if (progress >= 60) return 'warning';
    return 'error';
  };

  const formatLastActive = (date) => {
    if (!date) return 'Never';
    return formatDistanceToNow(date instanceof Date ? date : new Date(date), { addSuffix: true });
  };

  return (
    <Card 
      sx={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        '&:hover': {
          boxShadow: 6
        }
      }}
    >
      <CardActionArea 
        onClick={() => navigate(`/teacher/students/${id}`)}
        sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
      >
        <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Student Header */}
          <Box display="flex" alignItems="center" mb={2}>
            <Avatar
              src={photoURL}
              alt={name}
              sx={{ width: 56, height: 56, mr: 2 }}
            />
            <Box>
              <Typography variant="h6" component="div">
                {name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {classes.length} {classes.length === 1 ? 'Class' : 'Classes'}
              </Typography>
            </Box>
          </Box>

          {/* Classes */}
          <Box mb={2}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Enrolled In
            </Typography>
            <Box display="flex" gap={1} flexWrap="wrap">
              {classes.map((cls) => (
                <Chip
                  key={cls.id}
                  size="small"
                  icon={<SchoolIcon />}
                  label={cls.name}
                  variant="outlined"
                />
              ))}
            </Box>
          </Box>

          {/* Progress */}
          <Box mb={2}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="body2" color="text.secondary">
                Overall Progress
              </Typography>
              <Typography variant="body2" color="text.primary">
                {Math.round(statistics.averageProgress)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={statistics.averageProgress}
              color={getProgressColor(statistics.averageProgress)}
              sx={{ height: 6, borderRadius: 3 }}
            />
          </Box>

          {/* Stats */}
          <Box 
            display="flex" 
            justifyContent="space-between"
            mt="auto"
            pt={2}
            borderTop={1}
            borderColor="divider"
          >
            <Tooltip title="Sessions">
              <Box>
                <Box display="flex" alignItems="center">
                  <TrendingUpIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    {statistics.sessionsCompleted} Sessions
                  </Typography>
                </Box>
                {statistics.activeSessions > 0 && (
                  <Typography variant="caption" color="success.main" sx={{ display: 'block' }}>
                    {statistics.activeSessions} Active
                  </Typography>
                )}
                {statistics.recentSessions > 0 && (
                  <Typography variant="caption" color="info.main" sx={{ display: 'block' }}>
                    {statistics.recentSessions} Recent
                  </Typography>
                )}
              </Box>
            </Tooltip>

            <Box>
              <Tooltip title="Last Active">
                <Box display="flex" alignItems="center">
                  <AccessTimeIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    {formatLastActive(statistics.lastSessionDate)}
                  </Typography>
                </Box>
              </Tooltip>
              {statistics.totalHours > 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  {statistics.totalHours}h Total
                </Typography>
              )}
            </Box>
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

export default StudentCard;
