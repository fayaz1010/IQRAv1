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
  LinearProgress
} from '@mui/material';
import {
  PlayArrow as ResumeIcon,
  VideoCall as VideoIcon,
  Chat as ChatIcon,
  Book as BookIcon
} from '@mui/icons-material';

const TeachingPanel = ({ activeSessions, onResumeSession }) => {
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
        <Typography variant="body2" color="textSecondary">
          Start a new session from your schedule or quick actions
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
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="subtitle1" fontWeight="medium">
                    {session.className}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Started {new Date(session.startTime).toLocaleTimeString()}
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<ResumeIcon />}
                  onClick={() => onResumeSession(session.id)}
                  sx={{ mr: 1 }}
                >
                  Resume
                </Button>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Chip
                  icon={<BookIcon />}
                  label={`Book ${session.book}`}
                  size="small"
                  sx={{ mr: 1 }}
                />
                <Chip
                  label={`Page ${session.currentPage}`}
                  size="small"
                  color="primary"
                />
                <Box sx={{ flexGrow: 1 }} />
                <Tooltip title="Video Call">
                  <IconButton
                    color="primary"
                    size="small"
                    onClick={() => window.open(session.meet?.link, '_blank')}
                  >
                    <VideoIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Chat">
                  <IconButton color="primary" size="small">
                    <ChatIcon />
                  </IconButton>
                </Tooltip>
              </Box>

              <Box sx={{ mb: 1 }}>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Student Progress
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={70}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <AvatarGroup max={4} sx={{ mr: 2 }}>
                  {(session.attendees || []).map((attendee) => (
                    <Avatar
                      key={attendee}
                      alt={attendee}
                      src={`/avatars/${attendee}.jpg`}
                      sx={{ width: 32, height: 32 }}
                    />
                  ))}
                </AvatarGroup>
                <Typography variant="body2" color="textSecondary">
                  {session.attendees?.length || 0} students present
                </Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Paper>
  );
};

export default TeachingPanel;
