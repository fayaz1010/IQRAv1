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
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Autocomplete,
  Chip,
  Avatar,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Book as BookIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
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

const TabPanel = ({ children, value, index, ...other }) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`class-tabpanel-${index}`}
    {...other}
  >
    {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
  </div>
);

const Classes = () => {
  const theme = useTheme();
  const { currentUser } = useAuth();
  const [classes, setClasses] = useState([]);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    courseId: null,
    studentIds: [],
  });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchClasses();
    fetchCourses();
    fetchStudents();
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
      console.error('Error fetching classes:', error);
      setError('Failed to load classes');
    }
  };

  const fetchCourses = async () => {
    try {
      const coursesRef = collection(db, 'courses');
      const q = query(coursesRef, where('teacherId', '==', currentUser.uid));
      const querySnapshot = await getDocs(q);
      const fetchedCourses = [];
      querySnapshot.forEach((doc) => {
        fetchedCourses.push({ id: doc.id, ...doc.data() });
      });
      setCourses(fetchedCourses);
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('role', '==', 'student'));
      const querySnapshot = await getDocs(q);
      const fetchedStudents = [];
      querySnapshot.forEach((doc) => {
        fetchedStudents.push({ id: doc.id, ...doc.data() });
      });
      setStudents(fetchedStudents);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const handleOpenDialog = (class_ = null) => {
    if (class_) {
      setSelectedClass(class_);
      setFormData({
        name: class_.name,
        description: class_.description,
        courseId: class_.courseId,
        studentIds: class_.studentIds || [],
      });
    } else {
      setSelectedClass(null);
      setFormData({
        name: '',
        description: '',
        courseId: null,
        studentIds: [],
      });
    }
    setOpenDialog(true);
    setTabValue(0);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedClass(null);
    setError('');
  };

  const handleSubmit = async () => {
    try {
      if (!formData.name) {
        setError('Class name is required');
        return;
      }

      const classData = {
        ...formData,
        teacherId: currentUser.uid,
        updatedAt: new Date().toISOString(),
      };

      if (selectedClass) {
        await updateDoc(doc(db, 'classes', selectedClass.id), classData);
      } else {
        classData.createdAt = new Date().toISOString();
        await addDoc(collection(db, 'classes'), classData);
      }

      handleCloseDialog();
      fetchClasses();
    } catch (error) {
      console.error('Error saving class:', error);
      setError('Failed to save class');
    }
  };

  const handleDelete = async (classId) => {
    try {
      await deleteDoc(doc(db, 'classes', classId));
      fetchClasses();
    } catch (error) {
      console.error('Error deleting class:', error);
      setError('Failed to delete class');
    }
  };

  const getCourseName = (courseId) => {
    const course = courses.find(c => c.id === courseId);
    return course ? course.title : 'No course assigned';
  };

  const getStudentNames = (studentIds) => {
    return studentIds
      ?.map(id => {
        const student = students.find(s => s.id === id);
        return student ? student.name || student.email : '';
      })
      .filter(Boolean)
      .join(', ');
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
          <Typography variant="h4">Class Management</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Create Class
          </Button>
        </Box>

        <Grid container spacing={3}>
          {classes.map((class_) => (
            <Grid item xs={12} md={6} key={class_.id}>
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
                    <Typography variant="h6">{class_.name}</Typography>
                    <Box>
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(class_)}
                        sx={{ mr: 1 }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(class_.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>
                  <Typography color="textSecondary" gutterBottom>
                    {class_.description}
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Chip
                      icon={<BookIcon />}
                      label={getCourseName(class_.courseId)}
                      sx={{ mr: 1 }}
                    />
                    <Chip
                      icon={<PersonIcon />}
                      label={`${class_.studentIds?.length || 0} Students`}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: theme.palette.background.paper,
            color: theme.palette.text.primary,
          }
        }}
      >
        <DialogTitle>
          {selectedClass ? 'Edit Class' : 'Create New Class'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
              <Tab label="Basic Info" />
              <Tab label="Course" />
              <Tab label="Students" />
            </Tabs>
          </Box>

          {error && (
            <Typography color="error" sx={{ mt: 2 }}>
              {error}
            </Typography>
          )}

          <TabPanel value={tabValue} index={0}>
            <TextField
              fullWidth
              label="Class Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={3}
            />
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Autocomplete
              options={courses}
              getOptionLabel={(option) => option.title}
              value={courses.find(c => c.id === formData.courseId) || null}
              onChange={(_, newValue) => setFormData({ ...formData, courseId: newValue?.id })}
              renderInput={(params) => (
                <TextField {...params} label="Select Course" />
              )}
              renderOption={(props, option) => (
                <li {...props}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <BookIcon sx={{ mr: 1 }} />
                    <Box>
                      <Typography variant="body1">{option.title}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        {option.description}
                      </Typography>
                    </Box>
                  </Box>
                </li>
              )}
            />
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <Autocomplete
              multiple
              options={students}
              getOptionLabel={(option) => option.email}
              value={students.filter(s => formData.studentIds.includes(s.id))}
              onChange={(_, newValue) => setFormData({
                ...formData,
                studentIds: newValue.map(student => student.id)
              })}
              renderInput={(params) => (
                <TextField {...params} label="Select Students" />
              )}
              renderOption={(props, option) => (
                <li {...props}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar sx={{ mr: 1 }}>
                      {option.email[0].toUpperCase()}
                    </Avatar>
                    <Typography>{option.email}</Typography>
                  </Box>
                </li>
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    avatar={<Avatar>{option.email[0].toUpperCase()}</Avatar>}
                    label={option.email}
                    {...getTagProps({ index })}
                  />
                ))
              }
            />
          </TabPanel>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {selectedClass ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Classes;
