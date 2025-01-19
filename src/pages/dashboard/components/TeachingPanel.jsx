import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Avatar,
  AvatarGroup,
  Chip,
  IconButton,
  Tooltip,
  LinearProgress,
  Divider
} from '@mui/material';
import {
  PlayArrow as ResumeIcon,
  VideoCall as VideoIcon,
  Chat as ChatIcon,
  Book as BookIcon,
  Timer as TimerIcon,
  Group as StudentsIcon,
  Flag as MilestoneIcon
} from '@mui/icons-material';

const TeachingPanel = ({ activeSessions, onResumeSession }) => {
  const formatDuration = (startTime) => {
    const duration = Math.floor((Date.now() - new Date(startTime)) / 1000 / 60);
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  if (!activeSessions?.length) {
    return (
      <Paper
        sx={{
          p: 3,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'background.default',
          borderRadius: 2
        }}
      >
        <Typography variant="h6" color="textSecondary" gutterBottom>
          No Active Sessions
        </Typography>
        <Typography variant="body2" color="textSecondary" align="center">
          Start a new session from your schedule or quick actions.
          <br />
          Your active teaching sessions will appear here.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, height: '100%', borderRadius: 2 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Live Teaching Sessions
        </Typography>
        <Typography variant="body2" color="textSecondary">
          {activeSessions.length} active {activeSessions.length === 1 ? 'session' : 'sessions'}
        </Typography>
      </Box>

      <Grid container spacing={2}>
        {activeSessions.map((session) => (
          <Grid item xs={12} key={session.id}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                backgroundColor: 'background.default',
                borderRadius: 2,
                '&:hover': {
                  backgroundColor: 'action.hover'
                }
              }}
            >
              {/* Session Header */}
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="subtitle1" fontWeight="medium">
                    {session.className || 'Untitled Class'}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                    <TimerIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                    <Typography variant="body2" color="textSecondary">
                      {formatDuration(session.startTime)} elapsed
                    </Typography>
                  </Box>
                </Box>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<ResumeIcon />}
                  onClick={() => onResumeSession(session.id)}
                >
                  Resume Session
                </Button>
              </Box>

              <Divider sx={{ my: 1.5 }} />

              {/* Session Details */}
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <BookIcon sx={{ fontSize: 20, mr: 1, color: 'primary.main' }} />
                    <Typography variant="body2">
                      Book {session.book || 'Not specified'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <MilestoneIcon sx={{ fontSize: 20, mr: 1, color: 'success.main' }} />
                    <Typography variant="body2">
                      Page {session.currentPage || '0'}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <StudentsIcon sx={{ fontSize: 20, mr: 1, color: 'info.main' }} />
                    <Typography variant="body2">
                      {session.attendees?.length || 0} Students Present
                    </Typography>
                  </Box>
                  {session.attendees?.length > 0 && (
                    <AvatarGroup max={5} sx={{ justifyContent: 'flex-start' }}>
                      {session.attendees.map((student, index) => (
                        <Tooltip key={index} title={student.name || 'Student'}>
                          <Avatar
                            src={student.photoURL}
                            alt={student.name}
                            sx={{ width: 24, height: 24 }}
                          >
                            {student.name?.[0]}
                          </Avatar>
                        </Tooltip>
                      ))}
                    </AvatarGroup>
                  )}
                </Grid>
              </Grid>

              {/* Session Actions */}
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Tooltip title="Start Video Call">
                  <IconButton size="small" color="primary">
                    <VideoIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Open Chat">
                  <IconButton size="small" color="primary">
                    <ChatIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Paper>
  );
};

export default TeachingPanel;
