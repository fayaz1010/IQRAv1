import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Tooltip,
  useTheme,
} from '@mui/material';
import {
  PlayArrow as StartIcon,
  Schedule as TimeIcon,
  Book as BookIcon,
  Person as StudentIcon,
  Repeat as RecurringIcon
} from '@mui/icons-material';

const TimeSlot = ({ time, isActive, isRecurring, dayName }) => {
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
      <Box
        sx={{
          position: 'absolute',
          left: 16,
          top: -10,
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <Typography
          variant="caption"
          sx={{
            color: isActive ? theme.palette.primary.main : 'text.secondary',
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            fontWeight: 'medium'
          }}
        >
          {dayName}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            display: 'flex',
            alignItems: 'center',
            gap: 0.5
          }}
        >
          {time}
          {isRecurring && (
            <Tooltip title="Recurring Class">
              <RecurringIcon sx={{ fontSize: 12 }} />
            </Tooltip>
          )}
        </Typography>
      </Box>
    </Box>
  );
};

const ClassCard = ({ classData, isActive, onStartSession, nextOccurrence, isRecurring }) => {
  const theme = useTheme();

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
          backgroundColor: 'background.paper',
          transform: 'translateY(-2px)',
          transition: 'transform 0.2s ease-in-out'
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
            {nextOccurrence.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <BookIcon fontSize="small" color="action" sx={{ mr: 0.5 }} />
          <Typography variant="body2" color="textSecondary">
            {classData.book?.name || 'Not set'}
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

const ScheduleTimeline = ({ classes = [], recurringClasses = [], onStartSession }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [nextClasses, setNextClasses] = useState([]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Get next occurrence for recurring classes
    const getNextOccurrence = (recurringClass) => {
      const now = new Date();
      const daysToAdd = ((recurringClass.dayOfWeek - now.getDay() + 7) % 7);
      const nextDate = new Date(now);
      nextDate.setDate(nextDate.getDate() + daysToAdd);
      nextDate.setHours(recurringClass.hour || 0, recurringClass.minute || 0, 0, 0);
      if (nextDate < now) {
        nextDate.setDate(nextDate.getDate() + 7);
      }
      return nextDate;
    };

    // Combine and sort all classes
    const allClasses = [
      // Regular classes
      ...classes.map(c => ({
        ...c,
        nextOccurrence: new Date(c.date),
        isRecurring: false
      })),
      // Recurring classes
      ...recurringClasses.map(c => ({
        ...c,
        nextOccurrence: getNextOccurrence(c),
        isRecurring: true
      }))
    ];

    // Sort by next occurrence and filter past classes
    const sortedClasses = allClasses
      .filter(c => c.nextOccurrence > currentTime)
      .sort((a, b) => a.nextOccurrence - b.nextOccurrence)
      .slice(0, 5); // Get next 5 classes

    setNextClasses(sortedClasses);
  }, [classes, recurringClasses, currentTime]);

  const getDayName = (date) => {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  };

  if (nextClasses.length === 0) {
    return (
      <Box
        sx={{
          py: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}
      >
        <Typography variant="body1" color="textSecondary" gutterBottom>
          No upcoming classes scheduled
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Use the calendar to schedule new classes
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {nextClasses.map((classData, index) => {
        const isActive = Math.abs(classData.nextOccurrence - currentTime) < 30 * 60 * 1000; // Within 30 minutes

        return (
          <Box
            key={classData.id}
            sx={{
              display: 'flex',
              mb: index < nextClasses.length - 1 ? 3 : 0
            }}
          >
            <TimeSlot
              time={classData.nextOccurrence.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })}
              dayName={getDayName(classData.nextOccurrence)}
              isActive={isActive}
              isRecurring={classData.isRecurring}
            />
            <Box sx={{ flexGrow: 1 }}>
              <ClassCard
                classData={classData}
                isActive={isActive}
                onStartSession={onStartSession}
                nextOccurrence={classData.nextOccurrence}
                isRecurring={classData.isRecurring}
              />
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};

export default ScheduleTimeline;
