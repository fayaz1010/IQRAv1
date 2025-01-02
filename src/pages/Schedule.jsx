import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  useTheme,
  Grid,
  Card,
  CardContent,
  IconButton,
  Autocomplete,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Event as EventIcon,
  Group as GroupIcon,
  Book as BookIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DateTimePicker } from '@mui/x-date-pickers';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';

const Schedule = () => {
  const theme = useTheme();
  const { currentUser } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [classes, setClasses] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [formData, setFormData] = useState({
    classId: null,
    startTime: new Date(),
    endTime: new Date(Date.now() + 3600000), // 1 hour from now
    location: '',
    notes: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSchedules();
    fetchClasses();
  }, [currentUser]);

  const fetchSchedules = async () => {
    try {
      const schedulesRef = collection(db, 'schedules');
      const q = query(
        schedulesRef,
        where('teacherId', '==', currentUser.uid)
      );
      
      const querySnapshot = await getDocs(q);
      const fetchedSchedules = [];
      querySnapshot.forEach((doc) => {
        fetchedSchedules.push({ id: doc.id, ...doc.data() });
      });
      
      // Sort by start time
      fetchedSchedules.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
      setSchedules(fetchedSchedules);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      setError('Failed to load schedules');
    }
  };

  const fetchClasses = async () => {
    try {
      const classesRef = collection(db, 'classes');
      const q = query(
        classesRef,
        where('teacherId', '==', currentUser.uid)
      );
      
      const querySnapshot = await getDocs(q);
      const fetchedClasses = [];
      querySnapshot.forEach((doc) => {
        fetchedClasses.push({ id: doc.id, ...doc.data() });
      });
      setClasses(fetchedClasses);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const handleOpenDialog = (schedule = null) => {
    if (schedule) {
      setSelectedSchedule(schedule);
      setFormData({
        classId: schedule.classId,
        startTime: new Date(schedule.startTime),
        endTime: new Date(schedule.endTime),
        location: schedule.location || '',
        notes: schedule.notes || '',
      });
    } else {
      setSelectedSchedule(null);
      setFormData({
        classId: null,
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000),
        location: '',
        notes: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedSchedule(null);
    setError('');
  };

  const handleSubmit = async () => {
    try {
      if (!formData.classId) {
        setError('Please select a class');
        return;
      }

      if (formData.endTime <= formData.startTime) {
        setError('End time must be after start time');
        return;
      }

      const scheduleData = {
        ...formData,
        teacherId: currentUser.uid,
        status: 'scheduled',
      };

      if (selectedSchedule) {
        await updateDoc(doc(db, 'schedules', selectedSchedule.id), scheduleData);
      } else {
        await addDoc(collection(db, 'schedules'), scheduleData);
      }

      handleCloseDialog();
      fetchSchedules();
    } catch (error) {
      console.error('Error saving schedule:', error);
      setError('Failed to save schedule');
    }
  };

  const handleDelete = async (scheduleId) => {
    try {
      await deleteDoc(doc(db, 'schedules', scheduleId));
      fetchSchedules();
    } catch (error) {
      console.error('Error deleting schedule:', error);
      setError('Failed to delete schedule');
    }
  };

  const getClassName = (classId) => {
    const class_ = classes.find(c => c.id === classId);
    return class_ ? class_.name : 'Unknown Class';
  };

  return (
    <Container
      maxWidth="lg"
      sx={{
        mt: 4,
        mb: 4,
        minHeight: '100vh',
        backgroundColor: theme.palette.background.default,
        color: theme.palette.text.primary,
      }}
    >
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h4">Schedule Management</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Create Schedule
          </Button>
        </Box>

        <Grid container spacing={3}>
          {schedules.map((schedule) => (
            <Grid item xs={12} md={6} key={schedule.id}>
              <Card
                component={motion.div}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                sx={{
                  backgroundColor: theme.palette.background.paper,
                  color: theme.palette.text.primary,
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6">{getClassName(schedule.classId)}</Typography>
                    <Box>
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(schedule)}
                        sx={{ mr: 1 }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(schedule.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">
                      <EventIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                      {new Date(schedule.startTime).toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      <EventIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                      {new Date(schedule.endTime).toLocaleString()}
                    </Typography>
                  </Box>
                  {schedule.location && (
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      Location: {schedule.location}
                    </Typography>
                  )}
                  {schedule.notes && (
                    <Typography variant="body2" color="textSecondary">
                      {schedule.notes}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: theme.palette.background.paper,
            color: theme.palette.text.primary,
          }
        }}
      >
        <DialogTitle>
          {selectedSchedule ? 'Edit Schedule' : 'Create New Schedule'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {error && (
              <Typography color="error" sx={{ mb: 2 }}>
                {error}
              </Typography>
            )}
            
            <Autocomplete
              options={classes}
              getOptionLabel={(option) => option.name}
              value={classes.find(c => c.id === formData.classId) || null}
              onChange={(_, newValue) => setFormData({ ...formData, classId: newValue?.id })}
              renderInput={(params) => (
                <TextField {...params} label="Select Class" sx={{ mb: 2 }} />
              )}
              renderOption={(props, option) => (
                <li {...props}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <GroupIcon sx={{ mr: 1 }} />
                    <Typography>{option.name}</Typography>
                  </Box>
                </li>
              )}
            />

            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DateTimePicker
                label="Start Time"
                value={formData.startTime}
                onChange={(newValue) => setFormData({ ...formData, startTime: newValue })}
                renderInput={(params) => <TextField {...params} fullWidth sx={{ mb: 2 }} />}
              />
              <DateTimePicker
                label="End Time"
                value={formData.endTime}
                onChange={(newValue) => setFormData({ ...formData, endTime: newValue })}
                renderInput={(params) => <TextField {...params} fullWidth sx={{ mb: 2 }} />}
              />
            </LocalizationProvider>

            <TextField
              fullWidth
              label="Location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {selectedSchedule ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Schedule;
