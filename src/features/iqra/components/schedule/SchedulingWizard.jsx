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
import { LocalizationProvider, DateTimePicker } from '@mui/x-date-pickers';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../../config/firebase';
import { useAuth } from '../../../../contexts/AuthContext';
import { createSchedule, updateSchedule } from '../../../../services/scheduleService';

const steps = [
  'Select Class',
  'Set Schedule Pattern',
  'Choose Time Slots',
  'Review & Confirm'
];

const SchedulingWizard = ({ onComplete, initialData, isEditing }) => {
  const { currentUser } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const [classes, setClasses] = useState([]);
  const [formData, setFormData] = useState(initialData || {
    classId: '',
    startDate: new Date(),
    recurrencePattern: 'weekly',
    daysOfWeek: [],
    duration: 60,
    timeSlots: {}, // Map of day index to time slot
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
    setFormData({ ...formData, [field]: newValue });
  };

  const handleDayToggle = (day) => {
    const currentDays = formData.daysOfWeek;
    const newDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day];
    setFormData({ ...formData, daysOfWeek: newDays });
  };

  const handleTimeSlotChange = (day) => (newValue) => {
    setFormData(prev => ({
      ...prev,
      timeSlots: {
        ...prev.timeSlots,
        [day]: newValue
      }
    }));
  };

  const validateStep = (step) => {
    switch (step) {
      case 0:
        return !!formData.classId;
      case 1:
        return !!formData.startDate && !!formData.recurrencePattern;
      case 2:
        return formData.daysOfWeek.length > 0 && formData.duration > 0 &&
          formData.daysOfWeek.every(day => formData.timeSlots[day]);
      default:
        return true;
    }
  };

  const handleSubmit = async () => {
    try {
      if (!validateStep(activeStep)) {
        setError('Please fill in all required fields');
        return;
      }

      if (loading) return; // Prevent multiple submissions
      setLoading(true);
      setError('');
      
      if (isEditing) {
        await updateSchedule(initialData.id, formData);
      } else {
        await createSchedule(formData);
      }
      
      if (onComplete) {
        onComplete();
      }
    } catch (err) {
      setError('Failed to ' + (isEditing ? 'update' : 'create') + ' schedule: ' + err.message);
      console.error('Error ' + (isEditing ? 'updating' : 'creating') + ' schedule:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Select Class</InputLabel>
              <Select
                value={formData.classId}
                onChange={handleInputChange('classId')}
                label="Select Class"
              >
                {classes.map((cls) => (
                  <MenuItem key={cls.id} value={cls.id}>
                    {cls.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        );

      case 1:
        return (
          <Box sx={{ mt: 2 }}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DateTimePicker
                label="Start Date"
                value={formData.startDate}
                onChange={handleDateChange('startDate')}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </LocalizationProvider>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Recurrence Pattern</InputLabel>
              <Select
                value={formData.recurrencePattern}
                onChange={handleInputChange('recurrencePattern')}
                label="Recurrence Pattern"
              >
                <MenuItem value="weekly">Weekly</MenuItem>
                <MenuItem value="custom">Custom</MenuItem>
              </Select>
            </FormControl>
          </Box>
        );

      case 2:
        return (
          <Box sx={{ mt: 2 }}>
            <FormGroup row sx={{ mb: 2 }}>
              {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, index) => (
                <FormControlLabel
                  key={day}
                  control={
                    <Checkbox
                      checked={formData.daysOfWeek.includes(index)}
                      onChange={() => handleDayToggle(index)}
                    />
                  }
                  label={day}
                />
              ))}
            </FormGroup>
            <TextField
              fullWidth
              type="number"
              label="Duration (minutes)"
              value={formData.duration}
              onChange={handleInputChange('duration')}
              sx={{ mb: 2 }}
            />
            {formData.daysOfWeek.map((day) => (
              <Box key={day} sx={{ mb: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day]}
                </Typography>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DateTimePicker
                    label="Time Slot"
                    value={formData.timeSlots[day] || null}
                    onChange={handleTimeSlotChange(day)}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                  />
                </LocalizationProvider>
              </Box>
            ))}
          </Box>
        );

      case 3:
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>Schedule Summary</Typography>
            <Typography>
              Class: {classes.find(c => c.id === formData.classId)?.name}
            </Typography>
            <Typography>
              Start Date: {formData.startDate.toLocaleDateString()}
            </Typography>
            <Typography>
              Pattern: {formData.recurrencePattern}
            </Typography>
            <Typography>
              Duration: {formData.duration} minutes
            </Typography>
            {formData.daysOfWeek.map(day => (
              <Typography key={day}>
                {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day]}: {
                  formData.timeSlots[day]?.toLocaleTimeString()
                }
              </Typography>
            ))}
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Container maxWidth="md">
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h5" gutterBottom>
          {isEditing ? 'Edit Schedule' : 'Schedule Class Sessions'}
        </Typography>
        
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
          <Button
            disabled={activeStep === 0}
            onClick={handleBack}
            sx={{ mr: 1 }}
          >
            Back
          </Button>
          <Button
            variant="contained"
            onClick={activeStep === steps.length - 1 ? handleSubmit : handleNext}
            disabled={!validateStep(activeStep) || loading}
          >
            {activeStep === steps.length - 1 
              ? (loading ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update Schedule' : 'Schedule Sessions')) 
              : 'Next'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default SchedulingWizard;
