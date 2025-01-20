import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Paper,
  Stack,
  Divider,
  Rating,
  FormControl,
  Select,
  MenuItem,
  Chip,
  Alert,
  Avatar,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  InputLabel
} from '@mui/material';
import {
  School as SchoolIcon,
  Person as PersonIcon,
  MenuBook as MenuBookIcon,
  RecordVoiceOver as VoiceIcon,
  Psychology as MemoryIcon,
  Close as CloseIcon,
  Save as SaveIcon
} from '@mui/icons-material';

const AREAS_OF_IMPROVEMENT = [
  'Letter Recognition',
  'Letter Sounds',
  'Fluency',
  'Attention Span',
  'Confidence',
  'Following Instructions'
];

const STRENGTHS = [
  'Quick Learning',
  'Good Memory',
  'Clear Pronunciation',
  'Focused',
  'Enthusiastic',
  'Good Listening'
];

const TabPanel = (props) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`session-feedback-tabpanel-${index}`}
      aria-labelledby={`session-feedback-tab-${index}`}
      {...other}
      style={{ padding: value === index ? '24px 0' : 0 }}
    >
      {value === index && children}
    </div>
  );
};

function a11yProps(index) {
  return {
    id: `session-feedback-tab-${index}`,
    'aria-controls': `session-feedback-tabpanel-${index}`,
  };
}

const EndSessionDialog = ({
  open,
  onClose,
  onSave,
  students = [],
  currentBook,
  startPage,
  endPage,
  loading = false,
  error
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [feedback, setFeedback] = useState({
    classNotes: '',
    studentFeedback: {}
  });

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
            strengths: [],
            pageNotes: {} 
          };
          
          // Initialize page notes for each page covered
          if (startPage && endPage) {
            for (let page = startPage; page <= endPage; page++) {
              initialStudentFeedback[student.id].pageNotes[page] = '';
            }
          }
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
  }, [students, startPage, endPage]);

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

  const handlePageNoteChange = (studentId, page, value) => {
    setFeedback(prev => ({
      ...prev,
      studentFeedback: {
        ...prev.studentFeedback,
        [studentId]: {
          ...prev.studentFeedback[studentId],
          pageNotes: {
            ...prev.studentFeedback[studentId].pageNotes,
            [page]: value
          }
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
    if (!student) return null;
    
    const studentFeedback = feedback.studentFeedback[student.id] || {};
    const pages = [];
    if (startPage && endPage) {
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }
    
    return (
      <Box sx={{ mt: 2 }}>
        <Paper sx={{ p: 3, backgroundColor: (theme) => 
          theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)' 
        }}>
          <Stack spacing={3}>
            {/* Student Header */}
            <Box display="flex" alignItems="center" gap={2}>
              <Avatar 
                src={student?.photoURL}
                sx={{ bgcolor: 'primary.main' }}
              >
                {(student?.displayName || student?.name || 'S')?.charAt(0)}
              </Avatar>
              <Typography variant="h6">
                {student?.displayName || student?.name || `Student ${student?.id || ''}`}
              </Typography>
            </Box>

            <Divider />

            {/* Page-specific Feedback */}
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Page-by-Page Feedback
              </Typography>
              <Stack spacing={2}>
                {pages.map(page => (
                  <Box key={page}>
                    <Typography variant="subtitle2" color="primary" gutterBottom>
                      Page {page}
                    </Typography>
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      placeholder={`Enter feedback for page ${page}...`}
                      value={studentFeedback.pageNotes?.[page] || ''}
                      onChange={(e) => handlePageNoteChange(student.id, page, e.target.value)}
                      disabled={loading}
                      size="small"
                    />
                  </Box>
                ))}
              </Stack>
            </Box>

            <Divider />

            {/* Assessment Ratings */}
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Overall Assessment
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
                <InputLabel id="areas-of-improvement-label">Areas of Improvement</InputLabel>
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
                <InputLabel id="strengths-label">Strengths</InputLabel>
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

            {/* Additional Notes */}
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
                placeholder="Add overall notes about the student's performance..."
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
      maxWidth="lg" 
      fullWidth
      PaperProps={{
        sx: {
          minHeight: '80vh',
          maxHeight: '90vh'
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

          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
              <Button
                variant={activeTab === 0 ? "contained" : "outlined"}
                onClick={() => setActiveTab(0)}
                startIcon={<SchoolIcon />}
                sx={{ textTransform: 'none' }}
              >
                Class Feedback
              </Button>
              {students?.map((student, index) => (
                <Button
                  key={student.id}
                  variant={activeTab === index + 1 ? "contained" : "outlined"}
                  onClick={() => setActiveTab(index + 1)}
                  startIcon={
                    <Avatar 
                      src={student?.photoURL}
                      sx={{ width: 24, height: 24 }}
                    >
                      {(student?.displayName || student?.name || 'S')?.charAt(0)}
                    </Avatar>
                  }
                  sx={{ textTransform: 'none' }}
                >
                  {student?.displayName || student?.name || `Student ${index + 1}`}
                </Button>
              ))}
            </Stack>
          </Box>

          <Box sx={{ mt: 2 }}>
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
              />
            </TabPanel>

            {students?.map((student, index) => (
              <TabPanel key={student.id} value={activeTab} index={index + 1}>
                {renderStudentFeedback(student)}
              </TabPanel>
            ))}
          </Box>
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
