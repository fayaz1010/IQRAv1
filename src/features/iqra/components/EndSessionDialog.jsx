import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Tabs,
  Tab,
  Typography,
  Rating,
  Paper,
  Alert,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack
} from '@mui/material';
import {
  School as SchoolIcon,
  Person as PersonIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  MenuBook as MenuBookIcon,
  RecordVoiceOver as VoiceIcon,
  Psychology as MemoryIcon
} from '@mui/icons-material';

const TabPanel = ({ children, value, index, ...other }) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`session-feedback-tabpanel-${index}`}
    {...other}
  >
    {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
  </div>
);

const AREAS_OF_IMPROVEMENT = [
  'Pronunciation accuracy',
  'Reading fluency',
  'Letter recognition',
  'Memorization speed',
  'Focus and attention',
  'Practice consistency'
];

const STRENGTHS = [
  'Clear pronunciation',
  'Smooth reading flow',
  'Quick memorization',
  'Good focus',
  'Regular practice',
  'Positive attitude'
];

const EndSessionDialog = ({ 
  open, 
  onClose, 
  onSave, 
  students = [], 
  loading = false, 
  error = null,
  currentBook,
  startPage,
  endPage
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [feedback, setFeedback] = useState({
    classNotes: '',
    studentFeedback: {}
  });

  // Initialize student feedback if not already set
  useEffect(() => {
    if (students?.length > 0) {
      const initialStudentFeedback = {};
      students.forEach(student => {
        if (!feedback.studentFeedback[student.id]) {
          initialStudentFeedback[student.id] = {
            notes: '',
            assessment: {
              reading: 0,
              pronunciation: 0,
              memorization: 0
            },
            areasOfImprovement: [],
            strengths: []
          };
        }
      });

      if (Object.keys(initialStudentFeedback).length > 0) {
        setFeedback(prev => ({
          ...prev,
          studentFeedback: {
            ...prev.studentFeedback,
            ...initialStudentFeedback
          }
        }));
      }
    }
  }, [students]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleClassNotesChange = (event) => {
    setFeedback(prev => ({
      ...prev,
      classNotes: event.target.value
    }));
  };

  const handleStudentFeedbackChange = (studentId, field, value) => {
    setFeedback(prev => ({
      ...prev,
      studentFeedback: {
        ...prev.studentFeedback,
        [studentId]: {
          ...prev.studentFeedback[studentId],
          [field]: value
        }
      }
    }));
  };

  const handleAssessmentChange = (studentId, category, value) => {
    setFeedback(prev => ({
      ...prev,
      studentFeedback: {
        ...prev.studentFeedback,
        [studentId]: {
          ...prev.studentFeedback[studentId],
          assessment: {
            ...prev.studentFeedback[studentId].assessment,
            [category]: value
          }
        }
      }
    }));
  };

  const handleArrayFieldChange = (studentId, field, value) => {
    setFeedback(prev => ({
      ...prev,
      studentFeedback: {
        ...prev.studentFeedback,
        [studentId]: {
          ...prev.studentFeedback[studentId],
          [field]: value
        }
      }
    }));
  };

  const handleSave = () => {
    onSave({
      ...feedback,
      book: currentBook,
      startPage,
      endPage,
      timestamp: new Date().toISOString()
    });
  };

  const renderStudentFeedback = (student) => {
    const studentFeedback = feedback.studentFeedback[student.id] || {};
    
    return (
      <Box sx={{ mt: 2 }}>
        <Paper sx={{ p: 3, backgroundColor: (theme) => 
          theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)' 
        }}>
          <Stack spacing={3}>
            {/* Student Header */}
            <Box display="flex" alignItems="center" gap={2}>
              <Avatar sx={{ bgcolor: 'primary.main' }}>
                {student.name.charAt(0)}
              </Avatar>
              <Typography variant="h6">{student.name}</Typography>
            </Box>

            <Divider />

            {/* Assessment Ratings */}
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Performance Assessment
              </Typography>
              <Stack spacing={2}>
                <Box>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <MenuBookIcon color="primary" />
                    <Typography component="legend">Reading</Typography>
                  </Box>
                  <Rating
                    name={`reading-${student.id}`}
                    value={studentFeedback.assessment?.reading || 0}
                    onChange={(event, value) => handleAssessmentChange(student.id, 'reading', value)}
                    disabled={loading}
                  />
                </Box>

                <Box>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <VoiceIcon color="primary" />
                    <Typography component="legend">Pronunciation</Typography>
                  </Box>
                  <Rating
                    name={`pronunciation-${student.id}`}
                    value={studentFeedback.assessment?.pronunciation || 0}
                    onChange={(event, value) => handleAssessmentChange(student.id, 'pronunciation', value)}
                    disabled={loading}
                  />
                </Box>

                <Box>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <MemoryIcon color="primary" />
                    <Typography component="legend">Memorization</Typography>
                  </Box>
                  <Rating
                    name={`memorization-${student.id}`}
                    value={studentFeedback.assessment?.memorization || 0}
                    onChange={(event, value) => handleAssessmentChange(student.id, 'memorization', value)}
                    disabled={loading}
                  />
                </Box>
              </Stack>
            </Box>

            <Divider />

            {/* Areas of Improvement */}
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Areas of Improvement
              </Typography>
              <FormControl fullWidth>
                <Select
                  multiple
                  value={studentFeedback.areasOfImprovement || []}
                  onChange={(e) => handleArrayFieldChange(student.id, 'areasOfImprovement', e.target.value)}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                  disabled={loading}
                >
                  {AREAS_OF_IMPROVEMENT.map((area) => (
                    <MenuItem key={area} value={area}>
                      {area}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Strengths */}
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Strengths
              </Typography>
              <FormControl fullWidth>
                <Select
                  multiple
                  value={studentFeedback.strengths || []}
                  onChange={(e) => handleArrayFieldChange(student.id, 'strengths', e.target.value)}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                  disabled={loading}
                >
                  {STRENGTHS.map((strength) => (
                    <MenuItem key={strength} value={strength}>
                      {strength}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Individual Notes */}
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Additional Notes
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                value={studentFeedback.notes || ''}
                onChange={(e) => handleStudentFeedbackChange(student.id, 'notes', e.target.value)}
                placeholder="Add specific notes about the student's performance..."
                disabled={loading}
              />
            </Box>
          </Stack>
        </Paper>
      </Box>
    );
  };

  return (
    <Dialog 
      open={open} 
      onClose={loading ? undefined : onClose}
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: {
          minHeight: '80vh'
        }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">End Teaching Session</Typography>
          <Typography variant="subtitle2" color="text.secondary">
            {currentBook} - Pages {startPage} to {endPage}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ width: '100%' }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Tabs 
            value={activeTab} 
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab 
              icon={<SchoolIcon />} 
              label="Class Feedback" 
              id="session-feedback-tab-0"
            />
            {students?.map((student, index) => (
              <Tab
                key={student.id}
                icon={<PersonIcon />}
                label={student.name}
                id={`session-feedback-tab-${index + 1}`}
              />
            ))}
          </Tabs>

          <TabPanel value={activeTab} index={0}>
            <TextField
              label="Class Feedback"
              multiline
              rows={4}
              fullWidth
              value={feedback.classNotes}
              onChange={handleClassNotesChange}
              disabled={loading}
              placeholder="Enter general feedback for the entire class..."
              sx={{ mt: 2 }}
            />
          </TabPanel>

          {students?.map((student, index) => (
            <TabPanel key={student.id} value={activeTab} index={index + 1}>
              {renderStudentFeedback(student)}
            </TabPanel>
          ))}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, backgroundColor: (theme) => 
        theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(0, 0, 0, 0.05)'
      }}>
        <Button 
          onClick={onClose} 
          startIcon={<CloseIcon />}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          color="primary"
          startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save & End Session'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EndSessionDialog;
