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
  TextField,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  VideoCall as VideoCallIcon,
} from '@mui/icons-material';
import { deleteSchedule, updateSingleSession } from '../../../../services/scheduleService';
import SchedulingWizard from './SchedulingWizard';
import { LocalizationProvider, DateTimePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

const ScheduleItem = ({ schedule, classData, onUpdate, onDelete }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [openEdit, setOpenEdit] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [editSessionTime, setEditSessionTime] = useState(null);

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEditClick = () => {
    setOpenEdit(true);
    handleMenuClose();
  };

  const handleDeleteClick = () => {
    setOpenDelete(true);
    handleMenuClose();
  };

  const handleSessionEditClick = (day) => {
    setEditingSession(day);
    setEditSessionTime(new Date(schedule.timeSlots[day]));
    handleMenuClose();
  };

  const handleSessionEditSave = async () => {
    try {
      setLoading(true);
      await updateSingleSession(schedule.id, editingSession, {
        timeSlot: editSessionTime
      });
      onUpdate();
      setEditingSession(null);
    } catch (error) {
      console.error('Error updating session:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      setLoading(true);
      await deleteSchedule(schedule.id);
      onDelete(schedule.id);
      setOpenDelete(false);
    } catch (error) {
      console.error('Error deleting schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditComplete = () => {
    setOpenEdit(false);
    onUpdate();
  };

  return (
    <Box sx={{ mb: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography variant="h6">{classData?.name || 'Loading...'}</Typography>
          {schedule.daysOfWeek.map((day) => (
            <Box key={day} display="flex" alignItems="center" sx={{ mt: 1 }}>
              {editingSession === day ? (
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <DateTimePicker
                      label="New Time"
                      value={editSessionTime}
                      onChange={(newValue) => setEditSessionTime(newValue)}
                      renderInput={(params) => <TextField {...params} size="small" />}
                    />
                    <Button
                      variant="contained"
                      size="small"
                      onClick={handleSessionEditSave}
                      disabled={loading}
                    >
                      {loading ? 'Saving...' : 'Save'}
                    </Button>
                    <Button
                      size="small"
                      onClick={() => setEditingSession(null)}
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                  </Box>
                </LocalizationProvider>
              ) : (
                <>
                  <Typography>
                    {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day]} - {
                      new Date(schedule.timeSlots[day]).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    }
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => handleSessionEditClick(day)}
                    sx={{ ml: 1 }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  {schedule.meetLinks?.[day] && (
                    <Tooltip title="Join Meet">
                      <IconButton
                        size="small"
                        color="primary"
                        href={schedule.meetLinks[day]}
                        target="_blank"
                        sx={{ ml: 1 }}
                      >
                        <VideoCallIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                </>
              )}
            </Box>
          ))}
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Duration: {schedule.duration} minutes
          </Typography>
        </Box>

        <IconButton onClick={handleMenuClick}>
          <MoreVertIcon />
        </IconButton>
      </Box>

      {/* Menu */}
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

      {/* Edit All Sessions Dialog */}
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

      {/* Delete Confirmation Dialog */}
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
    </Box>
  );
};

export default ScheduleItem;
