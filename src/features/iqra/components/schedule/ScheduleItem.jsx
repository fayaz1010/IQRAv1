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

      // Parse HH:mm format
      const [hours, minutes] = timeString.split(':').map(Number);
      if (isNaN(hours) || isNaN(minutes)) {
        return 'Invalid format';
      }

      // Format in 12-hour format
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
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
      <Card sx={{ mb: 2, position: 'relative' }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                  <EventIcon />
                </Avatar>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" component="div">
                    {classData?.name || 'Untitled Class'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {formatRecurrence()}
                  </Typography>
                </Box>
                <IconButton
                  aria-label="schedule actions"
                  aria-controls="schedule-menu"
                  aria-haspopup="true"
                  onClick={handleMenuClick}
                  sx={{ ml: 1 }}
                >
                  <MoreVertIcon />
                </IconButton>
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {schedule.daysOfWeek.map((day) => (
                  <Chip
                    key={day}
                    icon={<AccessTimeIcon />}
                    label={`${WEEKDAYS[day]} - ${formatTimeSlot(day)}`}
                    variant="outlined"
                    sx={{ mb: 1 }}
                  />
                ))}
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Chip
                  icon={<AccessTimeIcon />}
                  label={`${schedule.duration} minutes`}
                  variant="outlined"
                  size="small"
                />
                {classData?.studentIds?.length > 0 && (
                  <Chip
                    icon={<PeopleIcon />}
                    label={`${classData.studentIds.length} Students`}
                    variant="outlined"
                    size="small"
                  />
                )}
                <Chip
                  icon={<RepeatIcon />}
                  label={schedule.recurrencePattern}
                  variant="outlined"
                  size="small"
                />
              </Box>
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
