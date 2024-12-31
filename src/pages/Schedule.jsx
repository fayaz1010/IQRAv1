import { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  VideoCall as VideoCallIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { scheduleClass } from '../services/googleCalendar';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DateTimePicker } from '@mui/x-date-pickers';

const Schedule = () => {
  const { user, userRole } = useAuth();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [newClass, setNewClass] = useState({
    title: '',
    description: '',
    startTime: new Date(),
    endTime: new Date(Date.now() + 3600000), // 1 hour from now
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const classesRef = collection(db, 'classes');
        let q;
        
        if (userRole === 'student') {
          q = query(classesRef, where('studentIds', 'array-contains', user.uid));
        } else if (userRole === 'teacher') {
          q = query(classesRef, where('teacherId', '==', user.uid));
        }

        const querySnapshot = await getDocs(q);
        const fetchedClasses = [];
        querySnapshot.forEach((doc) => {
          fetchedClasses.push({ id: doc.id, ...doc.data() });
        });

        setClasses(fetchedClasses);
      } catch (error) {
        console.error('Error fetching classes:', error);
        setError('Failed to load classes');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchClasses();
    }
  }, [user, userRole]);

  const handleCreateClass = async () => {
    try {
      setError('');
      setSuccess('');

      // Validate inputs
      if (!newClass.title || !newClass.startTime || !newClass.endTime) {
        setError('Please fill in all required fields');
        return;
      }

      // Create class in Firestore
      const classRef = await addDoc(collection(db, 'classes'), {
        title: newClass.title,
        description: newClass.description,
        teacherId: user.uid,
        startTime: newClass.startTime.toISOString(),
        endTime: newClass.endTime.toISOString(),
        createdAt: new Date().toISOString(),
        status: 'upcoming',
      });

      // Schedule in Google Calendar and create Meet link
      const result = await scheduleClass(
        {
          id: classRef.id,
          ...newClass,
          students: [], // TODO: Add actual students
        },
        user.accessToken // You'll need to store this after Google OAuth
      );

      if (result.success) {
        setSuccess('Class scheduled successfully');
        setOpenDialog(false);
        // Refresh classes
        const updatedClass = {
          id: classRef.id,
          ...newClass,
          meetLink: result.meetLink,
          status: 'upcoming',
        };
        setClasses((prev) => [...prev, updatedClass]);
      } else {
        setError('Failed to schedule class in calendar');
      }
    } catch (error) {
      console.error('Error creating class:', error);
      setError('Failed to create class');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'upcoming':
        return 'primary';
      case 'ongoing':
        return 'success';
      case 'completed':
        return 'default';
      default:
        return 'default';
    }
  };

  return (
    <Container maxWidth="lg">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Box sx={{ mt: 4, mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
            <Typography variant="h4">
              {userRole === 'teacher' ? 'My Classes' : 'My Schedule'}
            </Typography>
            {userRole === 'teacher' && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setOpenDialog(true)}
              >
                Create Class
              </Button>
            )}
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}

          <Grid container spacing={3}>
            {classes.map((class_) => (
              <Grid item xs={12} md={6} key={class_.id}>
                <Card
                  component={motion.div}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <CardContent>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 2,
                      }}
                    >
                      <Typography variant="h6">{class_.title}</Typography>
                      <Chip
                        label={class_.status}
                        color={getStatusColor(class_.status)}
                        size="small"
                      />
                    </Box>
                    <Typography color="textSecondary" gutterBottom>
                      <ScheduleIcon
                        fontSize="small"
                        sx={{ verticalAlign: 'middle', mr: 1 }}
                      />
                      {new Date(class_.startTime).toLocaleString()}
                    </Typography>
                    {class_.description && (
                      <Typography color="textSecondary" paragraph>
                        {class_.description}
                      </Typography>
                    )}
                    {class_.meetLink && (
                      <Box sx={{ mt: 2 }}>
                        <Button
                          variant="contained"
                          color="primary"
                          startIcon={<VideoCallIcon />}
                          href={class_.meetLink}
                          target="_blank"
                          fullWidth
                        >
                          Join Class
                        </Button>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {classes.length === 0 && !loading && (
            <Paper sx={{ p: 3, textAlign: 'center', mt: 3 }}>
              <Typography color="textSecondary">
                No scheduled classes found.
              </Typography>
            </Paper>
          )}
        </Box>

        {/* Create Class Dialog */}
        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Create New Class</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="Class Title"
                value={newClass.title}
                onChange={(e) =>
                  setNewClass((prev) => ({ ...prev, title: e.target.value }))
                }
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={newClass.description}
                onChange={(e) =>
                  setNewClass((prev) => ({ ...prev, description: e.target.value }))
                }
                sx={{ mb: 2 }}
              />
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DateTimePicker
                  label="Start Time"
                  value={newClass.startTime}
                  onChange={(newValue) =>
                    setNewClass((prev) => ({ ...prev, startTime: newValue }))
                  }
                  sx={{ mb: 2, width: '100%' }}
                />
                <DateTimePicker
                  label="End Time"
                  value={newClass.endTime}
                  onChange={(newValue) =>
                    setNewClass((prev) => ({ ...prev, endTime: newValue }))
                  }
                  sx={{ width: '100%' }}
                  minDateTime={newClass.startTime}
                />
              </LocalizationProvider>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateClass} variant="contained">
              Create
            </Button>
          </DialogActions>
        </Dialog>
      </motion.div>
    </Container>
  );
};

export default Schedule;
