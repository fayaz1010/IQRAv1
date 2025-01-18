import React, { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tooltip,
  Card,
  CardContent,
  Chip,
  Grid,
  Avatar,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  VideoCall as VideoCallIcon,
  Event as EventIcon,
  AccessTime as AccessTimeIcon,
  Book as BookIcon,
  People as PeopleIcon,
  Repeat as RepeatIcon,
} from '@mui/icons-material';
import { deleteSchedule } from '../../../../services/scheduleService';
import SchedulingWizard from './SchedulingWizard';
import { format, parse } from 'date-fns';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const ScheduleItem = ({ schedule, classData, onUpdate, onDelete }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [openEdit, setOpenEdit] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEditClick = () => {
    handleMenuClose();
    setOpenEdit(true);
  };

  const handleDeleteClick = () => {
    handleMenuClose();
    setOpenDelete(true);
  };

  const handleEditComplete = () => {
    setOpenEdit(false);
    if (onUpdate) onUpdate();
  };

  const handleDeleteConfirm = async () => {
    try {
      setLoading(true);
      await deleteSchedule(schedule.id);
      setOpenDelete(false);
      if (onDelete) onDelete();
    } catch (error) {
      console.error('Error deleting schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatRecurrence = () => {
    if (!schedule.recurrencePattern) return null;
    const days = schedule.daysOfWeek.map(day => 
      ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day]
    ).join(', ');
    return `${schedule.recurrencePattern.charAt(0).toUpperCase() + schedule.recurrencePattern.slice(1)} on ${days}`;
  };

  const formatTimeSlot = (dayIndex) => {
    try {
      if (!schedule.timeSlots || !schedule.timeSlots[dayIndex]) {
        return 'No time set';
      }

      const timeString = schedule.timeSlots[dayIndex];
      if (typeof timeString !== 'string') {
        return 'Invalid time';
      }

      // Parse the ISO date string
      const date = new Date(timeString);
      if (isNaN(date.getTime())) {
        return 'Invalid format';
      }

      // Format the time in 12-hour format
      return format(date, 'h:mm a');
    } catch (error) {
      console.error('Error formatting time slot:', error);
      return 'Invalid format';
    }
  };

  const renderScheduleInfo = () => {
    return (
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
        {schedule.daysOfWeek?.map((day, index) => (
          <Chip
            key={index}
            icon={<AccessTimeIcon />}
            label={`${WEEKDAYS[day]} - ${formatTimeSlot(day)}`}
            size="small"
            variant="outlined"
          />
        ))}
        <Chip
          icon={<PeopleIcon />}
          label={`${schedule.studentCount || 0} Student${(schedule.studentCount || 0) !== 1 ? 's' : ''}`}
          size="small"
          variant="outlined"
        />
        {schedule.recurrencePattern && (
          <Chip
            icon={<RepeatIcon />}
            label={formatRecurrence()}
            size="small"
            variant="outlined"
          />
        )}
      </Box>
    );
  };

  if (!schedule || !schedule.daysOfWeek) {
    return null;
  }

  return (
    <>
      <Card 
        sx={{ 
          mb: 2,
          borderLeft: 6,
          borderColor: 'primary.main',
          '&:hover': {
            boxShadow: 6,
          },
        }}
      >
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item>
              <Avatar 
                sx={{ 
                  bgcolor: 'primary.main',
                  width: 56,
                  height: 56,
                }}
              >
                <EventIcon />
              </Avatar>
            </Grid>
            
            <Grid item xs={12} sm>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                  {classData?.name || 'Loading...'}
                </Typography>
                {schedule.meetLinks?.[0] && (
                  <Tooltip title="Join Class">
                    <IconButton 
                      color="primary" 
                      href={schedule.meetLinks[0]} 
                      target="_blank"
                      sx={{ ml: 1 }}
                    >
                      <VideoCallIcon />
                    </IconButton>
                  </Tooltip>
                )}
                <IconButton onClick={handleMenuClick}>
                  <MoreVertIcon />
                </IconButton>
              </Box>

              {renderScheduleInfo()}

              {classData?.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {classData.description}
                </Typography>
              )}

              <Typography variant="body2" color="text.secondary">
                Duration: {schedule.duration} minutes
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEditClick}>
          <EditIcon sx={{ mr: 1 }} fontSize="small" />
          Edit All Sessions
        </MenuItem>
        <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ mr: 1 }} fontSize="small" />
          Delete Schedule
        </MenuItem>
      </Menu>

      <Dialog
        open={openEdit}
        onClose={() => setOpenEdit(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Edit All Sessions</DialogTitle>
        <DialogContent>
          <SchedulingWizard
            onComplete={handleEditComplete}
            initialData={schedule}
            isEditing={true}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={openDelete}
        onClose={() => setOpenDelete(false)}
      >
        <DialogTitle>Delete Schedule</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this schedule? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setOpenDelete(false)} 
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            variant="contained"
            disabled={loading}
          >
            {loading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ScheduleItem;
