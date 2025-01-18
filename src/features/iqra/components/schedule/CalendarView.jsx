import React, { useState, useEffect } from 'react';
import { useTheme } from '@mui/material/styles';
import {
  Box,
  Paper,
  Typography,
  Tooltip,
  alpha,
  List,
  ListItem,
  ListItemText,
  Divider,
  Grid,
  Button,
  IconButton,
} from '@mui/material';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { PickersDay } from '@mui/x-date-pickers/PickersDay';
import { format, parseISO, isSameDay, startOfDay, isToday } from 'date-fns';
import { AccessTime as AccessTimeIcon, Room as RoomIcon, Group as GroupIcon } from '@mui/icons-material';

const CalendarView = ({ schedules = [], onDayClick }) => {
  const theme = useTheme();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [schedulesMap, setSchedulesMap] = useState(new Map());
  const [selectedDaySchedules, setSelectedDaySchedules] = useState([]);

  useEffect(() => {
    const newSchedulesMap = new Map();
    
    console.log('Received schedules:', schedules);
    
    schedules.forEach(schedule => {
      if (!schedule) return;
      
      try {
        console.log('Processing schedule:', schedule);
        
        if (schedule.recurrencePattern && schedule.daysOfWeek && schedule.timeSlots) {
          // Get the first day of the current month
          const firstDayOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
          // Get the last day of the current month
          const lastDayOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
          
          console.log('Processing date range:', firstDayOfMonth, 'to', lastDayOfMonth);
          
          // For each day in the month
          for (let currentDate = new Date(firstDayOfMonth); currentDate <= lastDayOfMonth; currentDate.setDate(currentDate.getDate() + 1)) {
            const currentDayOfWeek = currentDate.getDay(); // 0 is Sunday, 6 is Saturday
            console.log('Checking day:', format(currentDate, 'yyyy-MM-dd'), 'Day of week:', currentDayOfWeek);
            
            // Check if this day of week has a time slot
            if (schedule.timeSlots[currentDayOfWeek] !== undefined) {
              const timeSlot = schedule.timeSlots[currentDayOfWeek];
              console.log('Found time slot for day', currentDayOfWeek, ':', timeSlot);
              
              try {
                // Parse the date string to get hours and minutes
                const timeDate = new Date(timeSlot);
                const scheduleDate = new Date(currentDate);
                scheduleDate.setHours(timeDate.getHours(), timeDate.getMinutes(), 0, 0);
                
                const dateKey = format(startOfDay(scheduleDate), 'yyyy-MM-dd');
                const existing = newSchedulesMap.get(dateKey) || [];
                const newSchedule = {
                  ...schedule,
                  date: format(scheduleDate, "yyyy-MM-dd'T'HH:mm:ss"),
                  className: schedule.className || 'Untitled Class'
                };
                console.log('Adding schedule for date:', dateKey, newSchedule);
                newSchedulesMap.set(dateKey, [...existing, newSchedule]);
              } catch (timeError) {
                console.error('Error parsing time slot:', timeError);
              }
            }
          }
        } else if (schedule.date) {
          const date = parseISO(schedule.date);
          const dateKey = format(startOfDay(date), 'yyyy-MM-dd');
          const existing = newSchedulesMap.get(dateKey) || [];
          newSchedulesMap.set(dateKey, [...existing, schedule]);
        }
      } catch (error) {
        console.error('Error processing schedule:', error, schedule);
      }
    });
    
    console.log('Final schedules map:', Object.fromEntries(newSchedulesMap));
    setSchedulesMap(newSchedulesMap);

    // Update selected day schedules
    const dateKey = format(startOfDay(selectedDate), 'yyyy-MM-dd');
    const selectedSchedules = newSchedulesMap.get(dateKey) || [];
    console.log('Selected date schedules:', dateKey, selectedSchedules);
    setSelectedDaySchedules(selectedSchedules);
  }, [schedules, selectedDate]);

  const handleDateChange = (newDate) => {
    if (!newDate) return;
    
    setSelectedDate(newDate);
    const dateKey = format(startOfDay(newDate), 'yyyy-MM-dd');
    const daySchedules = schedulesMap.get(dateKey) || [];
    setSelectedDaySchedules(daySchedules);
    onDayClick(newDate, daySchedules);
  };

  const ServerDay = (props) => {
    const { day, outsideCurrentMonth, ...other } = props;
    
    try {
      const dateKey = format(startOfDay(day), 'yyyy-MM-dd');
      const daySchedules = schedulesMap.get(dateKey) || [];
      const hasSchedules = daySchedules.length > 0;
      const isSelected = isSameDay(day, selectedDate);
      const dayIsToday = isToday(day);

      return (
        <Box 
          sx={{ 
            position: 'relative',
            '& .MuiPickersDay-root': {
              transition: 'all 0.2s ease-in-out',
              fontWeight: dayIsToday ? 600 : 400,
              border: dayIsToday 
                ? `2px solid ${theme.palette.primary.main}` 
                : 'none',
              bgcolor: isSelected 
                ? `${theme.palette.primary.main} !important`
                : hasSchedules && !outsideCurrentMonth
                  ? alpha(theme.palette.primary.main, 0.1)
                  : 'transparent',
              color: isSelected 
                ? theme.palette.primary.contrastText 
                : outsideCurrentMonth
                  ? theme.palette.text.disabled
                  : theme.palette.text.primary,
              '&:hover': {
                backgroundColor: isSelected
                  ? theme.palette.primary.dark
                  : hasSchedules
                    ? alpha(theme.palette.primary.main, 0.2)
                    : alpha(theme.palette.action.hover, 0.1),
              },
            }
          }}
        >
          <PickersDay 
            {...other} 
            outsideCurrentMonth={outsideCurrentMonth} 
            day={day}
          />
          {hasSchedules && !outsideCurrentMonth && (
            <Box
              sx={{
                position: 'absolute',
                bottom: 4,
                left: '50%',
                transform: 'translateX(-50%)',
                width: '30%',
                height: 3,
                borderRadius: '4px',
                backgroundColor: isSelected 
                  ? theme.palette.primary.contrastText
                  : theme.palette.primary.main,
                opacity: isSelected ? 0.9 : 0.7,
                transition: 'all 0.2s ease-in-out',
              }}
            />
          )}
        </Box>
      );
    } catch (error) {
      console.error('Error rendering day:', error, { day });
      return (
        <PickersDay 
          {...other} 
          outsideCurrentMonth={outsideCurrentMonth} 
          day={day}
        />
      );
    }
  };

  const renderScheduleDetails = () => {
    if (selectedDaySchedules.length === 0) {
      return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            No classes scheduled for this day
          </Typography>
        </Box>
      );
    }

    return (
      <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
        {selectedDaySchedules.map((schedule, index) => {
          const scheduleTime = parseISO(schedule.date);
          return (
            <React.Fragment key={index}>
              <ListItem 
                alignItems="flex-start"
                sx={{
                  py: 2,
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.05),
                  },
                }}
              >
                <ListItemText
                  primary={
                    <Typography variant="subtitle1" component="div" sx={{ fontWeight: 500, mb: 1 }}>
                      {schedule.className}
                    </Typography>
                  }
                  secondary={
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AccessTimeIcon fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                          {format(scheduleTime, 'h:mm a')}
                        </Typography>
                      </Box>
                      {schedule.location && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <RoomIcon fontSize="small" color="action" />
                          <Typography variant="body2" color="text.secondary">
                            {schedule.location}
                          </Typography>
                        </Box>
                      )}
                      {schedule.studentCount && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <GroupIcon fontSize="small" color="action" />
                          <Typography variant="body2" color="text.secondary">
                            {schedule.studentCount} students
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  }
                />
              </ListItem>
              {index < selectedDaySchedules.length - 1 && <Divider />}
            </React.Fragment>
          );
        })}
      </List>
    );
  };

  return (
    <Grid container spacing={3} sx={{ height: '100%' }}>
      <Grid item xs={12} md={7}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <Paper 
            elevation={2}
            sx={{ 
              p: 2,
              height: '100%',
              borderRadius: 2,
              bgcolor: 'background.paper',
              '& .MuiPickersCalendarHeader-root': {
                pl: 2,
                pr: 2,
                mb: 2,
                '& .MuiPickersCalendarHeader-label': {
                  fontSize: '1.1rem',
                  fontWeight: 500,
                },
              },
              '& .MuiDayCalendar-weekDayLabel': {
                width: 40,
                height: 40,
                margin: '0 2px',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: theme.palette.text.secondary,
              },
              '& .MuiPickersDay-root': {
                width: 40,
                height: 40,
                fontSize: '0.9rem',
                margin: '0 2px',
                borderRadius: '50%',
              },
              '& .MuiPickersDay-today': {
                backgroundColor: 'transparent',
              },
            }}
          >
            <DateCalendar
              value={selectedDate}
              onChange={handleDateChange}
              slots={{
                day: ServerDay
              }}
            />
          </Paper>
        </LocalizationProvider>
      </Grid>
      <Grid item xs={12} md={5}>
        <Paper 
          elevation={2}
          sx={{ 
            height: '100%',
            borderRadius: 2,
            bgcolor: 'background.paper',
            overflow: 'hidden',
          }}
        >
          <Box sx={{ 
            p: 2, 
            borderBottom: 1, 
            borderColor: 'divider',
            bgcolor: alpha(theme.palette.primary.main, 0.05),
          }}>
            <Typography variant="h6" sx={{ fontWeight: 500 }}>
              {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </Typography>
          </Box>
          {renderScheduleDetails()}
        </Paper>
      </Grid>
    </Grid>
  );
};

export default CalendarView;
