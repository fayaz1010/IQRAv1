import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  IconButton,
  Tooltip,
  Grid,
} from '@mui/material';
import {
  VideocamOutlined as VideocamIcon,
  Book as BookIcon,
  Group as GroupIcon,
  Timer as TimerIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

const ActiveSessionCard = ({ session }) => {
  const navigate = useNavigate();

  if (!session) return null;

  const {
    id,
    classData,
    startTime,
    currentPage,
    book,
    studentProgress,
    meet
  } = session;

  const startedAgo = startTime ? formatDistanceToNow(
    startTime.toDate(),
    { addSuffix: true }
  ) : 'Just now';

  const totalStudents = classData?.students?.length || 0;
  const activeStudents = Object.keys(studentProgress || {}).length;

  return (
    <Paper 
      sx={{ 
        p: 3,
        bgcolor: 'success.light',
        color: 'white',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Active Teaching Session</Typography>
        <Chip 
          label={startedAgo}
          icon={<TimerIcon />}
          sx={{ 
            bgcolor: 'rgba(255,255,255,0.2)',
            color: 'white',
            '& .MuiChip-icon': { color: 'white' }
          }}
        />
      </Box>

      {/* Class Info */}
      <Box mb={2}>
        <Typography variant="h5" gutterBottom>
          {classData?.course?.name || 'Class Session'}
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Box display="flex" alignItems="center" gap={1}>
              <BookIcon />
              <Typography>
                Page {currentPage} • {book}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Box display="flex" alignItems="center" gap={1}>
              <GroupIcon />
              <Typography>
                {activeStudents}/{totalStudents} Students Active
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Actions */}
      <Box display="flex" gap={2}>
        <Button
          variant="contained"
          color="primary"
          onClick={() => navigate(`/teaching/session/${id}`)}
          sx={{ flex: 1 }}
        >
          Resume Teaching
        </Button>
        {meet?.link && (
          <Tooltip title="Join Video Call">
            <IconButton
              color="primary"
              onClick={() => window.open(meet.link, '_blank')}
              sx={{ bgcolor: 'background.paper' }}
            >
              <VideocamIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Paper>
  );
};

export default ActiveSessionCard;
