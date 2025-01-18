import React, { useState, useEffect } from 'react';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  Paper,
  Container,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormGroup,
  FormControlLabel,
  Alert,
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DateTimePicker, TimePicker } from '@mui/x-date-pickers';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../../config/firebase';
import { useAuth } from '../../../../contexts/AuthContext';
import { createSchedule, updateSchedule } from '../../../../services/scheduleService';
import { startOfDay, format, parse, addDays } from 'date-fns';

const steps = [
  'Select Class',
  'Set Schedule Pattern',
  'Choose Time Slots',
  'Review & Confirm'
];

const weekDays = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' }
];

const SchedulingWizard = ({ onComplete, initialData, isEditing }) => {
  const { currentUser } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const [classes, setClasses] = useState([]);
  const [formData, setFormData] = useState(initialData || {
    classId: '',
    startDate: startOfDay(new Date()),
    recurrencePattern: 'weekly',
    daysOfWeek: [],
    duration: 60,
    timeSlots: {}, // Map of day index to time
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchClasses();
  }, [currentUser]);

  const fetchClasses = async () => {
    try {
      const classesRef = collection(db, 'classes');
      const q = query(classesRef, where('teacherId', '==', currentUser.uid));
      const querySnapshot = await getDocs(q);
      const fetchedClasses = [];
      querySnapshot.forEach((doc) => {
        fetchedClasses.push({ id: doc.id, ...doc.data() });
      });
      setClasses(fetchedClasses);
    } catch (error) {
      setError('Failed to fetch classes');
      console.error('Error fetching classes:', error);
    }
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep((prevStep) => prevStep + 1);
      setError('');
    } else {
      setError('Please fill in all required fields');
    }
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleInputChange = (field) => (event) => {
    setFormData({ ...formData, [field]: event.target.value });
  };

  const handleDateChange = (field) => (newValue) => {
    setFormData({ ...formData, [field]: startOfDay(newValue) });
  };

  const handleTimeChange = (day) => (newValue) => {
    if (!newValue) return;
    
    setFormData(prev => ({
      ...prev,
      timeSlots: {
        ...prev.timeSlots,
        [day]: format(newValue, 'HH:mm')
      }
    }));
  };

  const handleDayToggle = (day) => {
    const currentDays = formData.daysOfWeek;
    const newDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day].sort();

    // Remove time slot if day is unchecked
    const newTimeSlots = { ...formData.timeSlots };
    if (!currentDays.includes(day)) {
      // Initialize time slot for new day
      if (!newTimeSlots[day]) {
        const defaultTime = new Date();
        defaultTime.setHours(9, 0, 0, 0);
        newTimeSlots[day] = format(defaultTime, 'HH:mm');
      }
    } else {
      delete newTimeSlots[day];
    }

    setFormData({
      ...formData,
      daysOfWeek: newDays,
      timeSlots: newTimeSlots
    });
  };

  const validateStep = (step) => {
    switch (step) {
      case 0:
        return formData.classId !== '';
      case 1:
        return formData.startDate && formData.recurrencePattern;
      case 2:
        return formData.daysOfWeek.length > 0 &&
          formData.daysOfWeek.every(day => formData.timeSlots[day]);
      default:
        return true;
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError('');

      // Convert time slots to Date objects for the schedule service
      const timeSlots = {};
      for (const [day, time] of Object.entries(formData.timeSlots)) {
        const [hours, minutes] = time.split(':');
        const timeDate = addDays(startOfDay(formData.startDate), Number(day));
        timeDate.setHours(Number(hours), Number(minutes), 0, 0);
        timeSlots[day] = timeDate;
      }

      const scheduleData = {
        ...formData,
        timeSlots
      };

      if (isEditing) {
        await updateSchedule(initialData.id, scheduleData);
      } else {
        await createSchedule(scheduleData);
      }

      onComplete();
    } catch (error) {
      console.error('Error saving schedule:', error);
      setError('Failed to save schedule. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <FormControl fullWidth>
            <InputLabel>Class</InputLabel>
            <Select
              value={formData.classId}
              onChange={handleInputChange('classId')}
              label="Class"
            >
              {classes.map((cls) => (
                <MenuItem key={cls.id} value={cls.id}>
                  {cls.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );
      case 1:
        return (
          <Box>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DateTimePicker
                label="Start Date"
                value={formData.startDate}
                onChange={handleDateChange('startDate')}
                renderInput={(params) => <TextField {...params} fullWidth sx={{ mb: 2 }} />}
              />
            </LocalizationProvider>
            <FormControl fullWidth>
              <InputLabel>Recurrence Pattern</InputLabel>
              <Select
                value={formData.recurrencePattern}
                onChange={handleInputChange('recurrencePattern')}
                label="Recurrence Pattern"
              >
                <MenuItem value="weekly">Weekly</MenuItem>
                <MenuItem value="biweekly">Bi-weekly</MenuItem>
                <MenuItem value="monthly">Monthly</MenuItem>
              </Select>
            </FormControl>
          </Box>
        );
      case 2:
        return (
          <Box>
            <FormGroup>
              {weekDays.map(({ value, label }) => (
                <Box key={value} sx={{ mb: 2 }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.daysOfWeek.includes(value)}
                        onChange={() => handleDayToggle(value)}
                      />
                    }
                    label={label}
                  />
                  {formData.daysOfWeek.includes(value) && (
                    <LocalizationProvider dateAdapter={AdapterDateFns}>
                      <TimePicker
                        label={`Time for ${label}`}
                        value={formData.timeSlots[value] ? 
                          parse(formData.timeSlots[value], 'HH:mm', new Date()) :
                          null
                        }
                        onChange={handleTimeChange(value)}
                        renderInput={(params) => <TextField {...params} sx={{ ml: 4 }} />}
                      />
                    </LocalizationProvider>
                  )}
                </Box>
              ))}
            </FormGroup>
            <TextField
              type="number"
              label="Duration (minutes)"
              value={formData.duration}
              onChange={handleInputChange('duration')}
              fullWidth
              sx={{ mt: 2 }}
            />
          </Box>
        );
      case 3:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Schedule Summary
            </Typography>
            <Typography>
              Start Date: {format(formData.startDate, 'PPP')}
            </Typography>
            <Typography>
              Recurrence: {formData.recurrencePattern}
            </Typography>
            <Typography>
              Days and Times:
            </Typography>
            {formData.daysOfWeek.map((day) => (
              <Typography key={day} sx={{ ml: 2 }}>
                {weekDays.find(d => d.value === day).label}: {formData.timeSlots[day]}
              </Typography>
            ))}
            <Typography>
              Duration: {formData.duration} minutes
            </Typography>
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <Container maxWidth="sm">
      <Paper sx={{ p: 3, mt: 3 }}>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {renderStepContent(activeStep)}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
          {activeStep > 0 && (
            <Button onClick={handleBack} sx={{ mr: 1 }}>
              Back
            </Button>
          )}
          {activeStep === steps.length - 1 ? (
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? 'Saving...' : isEditing ? 'Update' : 'Create'}
            </Button>
          ) : (
            <Button variant="contained" onClick={handleNext}>
              Next
            </Button>
          )}
        </Box>
      </Paper>
    </Container>
  );
};

export default SchedulingWizard;
