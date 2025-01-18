import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Tooltip,
  Divider,
  useTheme
} from '@mui/material';
import {
  PlayArrow as StartIcon,
  Schedule as TimeIcon,
  Book as BookIcon,
  Person as StudentIcon,
  NavigateBefore as PrevIcon,
  NavigateNext as NextIcon
} from '@mui/icons-material';

const TimeSlot = ({ time, isActive }) => {
  const theme = useTheme();
  return (
    <Box
      sx={{
        position: 'relative',
        height: '100%',
        width: 2,
        backgroundColor: isActive ? theme.palette.primary.main : theme.palette.divider,
        '&::before': {
          content: '""',
          position: 'absolute',
          top: -4,
          left: -4,
          width: 10,
          height: 10,
          borderRadius: '50%',
          backgroundColor: isActive ? theme.palette.primary.main : theme.palette.divider
        }
      }}
    >
      <Typography
        variant="caption"
        sx={{
          position: 'absolute',
          left: 16,
          top: -10,
          color: isActive ? theme.palette.primary.main : 'text.secondary'
        }}
      >
        {time}
      </Typography>
    </Box>
  );
};

const ClassCard = ({ classData, isActive, onStartSession }) => {
  const theme = useTheme();
  const startTime = new Date(classData.schedule.nextSession.toDate()).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <Paper
      elevation={isActive ? 2 : 0}
      sx={{
        p: 2,
        ml: 4,
        borderRadius: 2,
        backgroundColor: isActive ? 'background.paper' : 'background.default',
        border: isActive ? `1px solid ${theme.palette.primary.main}` : 'none',
        '&:hover': {
          backgroundColor: 'background.paper'
        }
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle1" sx={{ flexGrow: 1, fontWeight: 'medium' }}>
          {classData.name}
        </Typography>
        <Button
          variant={isActive ? 'contained' : 'outlined'}
          color="primary"
          startIcon={<StartIcon />}
          size="small"
          onClick={() => onStartSession(classData.id)}
        >
          Start Class
        </Button>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <TimeIcon fontSize="small" color="action" sx={{ mr: 0.5 }} />
          <Typography variant="body2" color="textSecondary">
            {startTime}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <BookIcon fontSize="small" color="action" sx={{ mr: 0.5 }} />
          <Typography variant="body2" color="textSecondary">
            Book {classData.book?.name || 'Not set'}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <StudentIcon fontSize="small" color="action" sx={{ mr: 0.5 }} />
          <Typography variant="body2" color="textSecondary">
            {classData.studentIds?.length || 0} students
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
};

const ScheduleTimeline = ({ classes, onStartSession }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const sortedClasses = [...(classes || [])].sort((a, b) => {
    return a.schedule.nextSession.toDate() - b.schedule.nextSession.toDate();
  });

  return (
    <Paper sx={{ p: 3, borderRadius: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Today's Schedule
        </Typography>
        <IconButton size="small">
          <PrevIcon />
        </IconButton>
        <IconButton size="small">
          <NextIcon />
        </IconButton>
      </Box>

      {sortedClasses.length === 0 ? (
        <Box
          sx={{
            py: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}
        >
          <Typography variant="body1" color="textSecondary" gutterBottom>
            No classes scheduled for today
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Use the calendar to schedule new classes
          </Typography>
        </Box>
      ) : (
        <Box sx={{ position: 'relative' }}>
          {sortedClasses.map((classData, index) => {
            const classTime = classData.schedule.nextSession.toDate();
            const isActive = Math.abs(classTime - currentTime) < 30 * 60 * 1000; // Within 30 minutes

            return (
              <Box
                key={classData.id}
                sx={{
                  display: 'flex',
                  mb: index < sortedClasses.length - 1 ? 3 : 0
                }}
              >
                <TimeSlot
                  time={classTime.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                  isActive={isActive}
                />
                <Box sx={{ flexGrow: 1 }}>
                  <ClassCard
                    classData={classData}
                    isActive={isActive}
                    onStartSession={onStartSession}
                  />
                </Box>
              </Box>
            );
          })}
        </Box>
      )}
    </Paper>
  );
};

export default ScheduleTimeline;
