import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  IconButton,
  Tooltip,
  useTheme
} from '@mui/material';
import {
  PlayArrow as StartIcon,
  Event as EventIcon,
  AccessTime as TimeIcon,
  Group as StudentsIcon
} from '@mui/icons-material';

const UpcomingClasses = ({ classes, onStartSession }) => {
  const theme = useTheme();

  const formatDateTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };

  if (!classes?.length) {
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
          No Upcoming Classes
        </Typography>
        <Typography variant="body2" color="textSecondary" align="center">
          Use the calendar to schedule new classes
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ height: '100%', borderRadius: 2 }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" gutterBottom>
          Upcoming Classes
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Next {classes.length} scheduled {classes.length === 1 ? 'class' : 'classes'}
        </Typography>
      </Box>
      
      <List sx={{ p: 0 }}>
        {classes.map((classItem, index) => (
          <React.Fragment key={classItem.id}>
            {index > 0 && <Divider />}
            <ListItem
              sx={{
                py: 2,
                px: 2,
                '&:hover': {
                  backgroundColor: 'action.hover'
                }
              }}
            >
              <Box sx={{ mr: 2 }}>
                <EventIcon color="primary" />
              </Box>
              <ListItemText
                primary={
                  <Typography variant="subtitle1" component="div">
                    {classItem.className || 'Untitled Class'}
                  </Typography>
                }
                secondary={
                  <Box sx={{ mt: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                      <TimeIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                      <Typography variant="body2" color="textSecondary">
                        {formatDateTime(classItem.schedule?.nextSession)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <StudentsIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                      <Typography variant="body2" color="textSecondary">
                        {classItem.studentIds?.length || 0} students
                      </Typography>
                    </Box>
                  </Box>
                }
              />
              <ListItemSecondaryAction>
                <Tooltip title="Start Class">
                  <IconButton
                    edge="end"
                    color="primary"
                    onClick={() => onStartSession(classItem.id)}
                  >
                    <StartIcon />
                  </IconButton>
                </Tooltip>
              </ListItemSecondaryAction>
            </ListItem>
          </React.Fragment>
        ))}
      </List>
    </Paper>
  );
};

export default UpcomingClasses;
