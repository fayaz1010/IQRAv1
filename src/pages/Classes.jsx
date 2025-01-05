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
  ListItemAvatar,
  Stack,
  Link,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Book as BookIcon,
  History as HistoryIcon,
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
  getDoc,
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
    if (currentUser?.uid) {
      fetchClasses();
      fetchCourses();
      fetchStudents();
    }
  }, [currentUser]);

  const fetchClasses = async () => {
    if (!currentUser?.uid) return;
    
    try {
      const classesRef = collection(db, 'classes');
      let q;
      
      // Different queries for teachers and students
      if (currentUser.role === 'teacher') {
        q = query(classesRef, where('teacherId', '==', currentUser.uid));
      } else if (currentUser.role === 'student') {
        q = query(classesRef, where('studentIds', 'array-contains', currentUser.uid));
      } else if (currentUser.role === 'admin') {
        q = query(classesRef);
      } else {
        setClasses([]);
        return;
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
    if (!currentUser?.uid) return;

    try {
      // Only fetch students if user is a teacher or admin
      if (!['teacher', 'admin'].includes(currentUser.role)) {
        setStudents([]);
        return;
      }

      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('role', '==', 'student'));
      const querySnapshot = await getDocs(q);
      const fetchedStudents = querySnapshot.docs.map(doc => ({
        id: doc.id,
        email: doc.data().email,
        displayName: doc.data().displayName || doc.data().email,
        photoURL: doc.data().photoURL
      }));
      setStudents(fetchedStudents);
    } catch (error) {
      console.error('Error fetching students:', error);
      setError('Failed to load students');
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
      console.log('Starting class submission...', { formData, currentUser });
      
      if (!formData.name) {
        setError('Class name is required');
        return;
      }

      // Validate that all studentIds exist and are actually students
      const studentIds = Array.isArray(formData.studentIds) ? formData.studentIds : [];
      const validStudents = students.filter(s => studentIds.includes(s.id));
      
      console.log('Student validation:', {
        providedIds: studentIds,
        validStudents: validStudents.map(s => ({ id: s.id, name: s.name })),
        allStudents: students.map(s => ({ id: s.id, name: s.name }))
      });
      
      if (studentIds.length !== validStudents.length) {
        setError('Some selected users are not valid students');
        return;
      }

      // Validate course if selected
      if (formData.courseId) {
        const courseExists = courses.some(c => c.id === formData.courseId);
        console.log('Course validation:', { courseId: formData.courseId, exists: courseExists });
        if (!courseExists) {
          setError('Selected course is not valid');
          return;
        }
      }

      if (selectedClass) {
        console.log('Updating existing class:', selectedClass.id);
        // For updates, we need to get the existing class data first
        const classRef = doc(db, 'classes', selectedClass.id);
        const classDoc = await getDoc(classRef);
        
        console.log('Fetched class document:', {
          exists: classDoc.exists(),
          data: classDoc.exists() ? classDoc.data() : null
        });
        
        if (!classDoc.exists()) {
          setError('Class not found');
          return;
        }

        const existingData = classDoc.data();
        
        console.log('Permission check:', {
          teacherId: existingData.teacherId,
          currentUserId: currentUser.uid,
          userRole: currentUser.role,
          hasPermission: existingData.teacherId === currentUser.uid || currentUser.role === 'admin'
        });
        
        // Verify ownership
        if (existingData.teacherId !== currentUser.uid && currentUser.role !== 'admin') {
          setError('You do not have permission to update this class');
          return;
        }

        // Merge existing data with updates
        const updatedData = {
          ...existingData,
          name: formData.name.trim(),
          description: (formData.description || '').trim(),
          courseId: formData.courseId || null,
          studentIds: validStudents.map(s => s.id),
          updatedAt: new Date().toISOString()
        };

        console.log('Updating with data:', updatedData);

        // Update the document
        await updateDoc(classRef, updatedData);
        console.log('Update successful');

      } else {
        console.log('Creating new class');
        // For new classes
        const classData = {
          name: formData.name.trim(),
          teacherId: currentUser.uid,
          description: (formData.description || '').trim(),
          courseId: formData.courseId || null,
          studentIds: validStudents.map(s => s.id),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        console.log('Creating with data:', classData);
        await addDoc(collection(db, 'classes'), classData);
        console.log('Creation successful');
      }

      handleCloseDialog();
      fetchClasses();
    } catch (error) {
      console.error('Error saving class:', {
        error,
        errorCode: error.code,
        errorMessage: error.message,
        errorDetails: error.details
      });
      setError('Failed to save class: ' + error.message);
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

  const renderStudentList = () => (
    <List>
      {formData.studentIds.map((studentId) => {
        const student = students.find((s) => s.id === studentId);
        if (!student) return null;
        
        return (
          <ListItem key={studentId}>
            <ListItemAvatar>
              <Avatar src={student.photoURL} alt={student.displayName}>
                {student.displayName?.charAt(0)}
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={student.displayName}
              secondary={
                <Typography variant="body2" color="text.secondary">
                  {student.email}
                </Typography>
              }
            />
            <ListItemSecondaryAction>
              <IconButton
                edge="end"
                aria-label="remove student"
                onClick={() => handleRemoveStudent(studentId)}
              >
                <DeleteIcon />
              </IconButton>
            </ListItemSecondaryAction>
          </ListItem>
        );
      })}
    </List>
  );

  const renderStudentSelect = () => (
    <Autocomplete
      multiple
      value={students.filter((student) => formData.studentIds.includes(student.id))}
      options={students}
      getOptionLabel={(option) => option.displayName}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Select Students"
          placeholder="Search students..."
          variant="outlined"
        />
      )}
      renderOption={(props, option) => (
        <Box component="li" {...props}>
          <Avatar
            src={option.photoURL}
            alt={option.displayName}
            sx={{ width: 24, height: 24, mr: 1 }}
          >
            {option.displayName?.charAt(0)}
          </Avatar>
          <Box>
            <Typography>{option.displayName}</Typography>
            <Typography variant="caption" color="text.secondary">
              {option.email}
            </Typography>
          </Box>
        </Box>
      )}
      renderTags={(value, getTagProps) =>
        value.map((option, index) => (
          <Chip
            {...getTagProps({ index })}
            key={option.id}
            avatar={
              <Avatar src={option.photoURL} alt={option.displayName}>
                {option.displayName?.charAt(0)}
              </Avatar>
            }
            label={option.displayName}
            size="small"
          />
        ))
      }
      onChange={(event, newValue) => {
        setFormData({
          ...formData,
          studentIds: newValue.map((student) => student.id),
        });
      }}
      sx={{ width: '100%', mb: 2 }}
    />
  );

  const handleRemoveStudent = (studentId) => {
    setFormData({
      ...formData,
      studentIds: formData.studentIds.filter((id) => id !== studentId),
    });
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
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
          <Typography variant="h4">Classes</Typography>
          <Stack direction="row" spacing={2}>
            <Button
              component={Link}
              to="/sessions/history"
              startIcon={<HistoryIcon />}
              variant="outlined"
            >
              Session History
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
            >
              Add Class
            </Button>
          </Stack>
        </Stack>

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
                      <Button
                        size="small"
                        startIcon={<HistoryIcon />}
                        component={Link}
                        to={`/sessions/history?class=${class_.id}`}
                        sx={{ mr: 1 }}
                      >
                        View History
                      </Button>
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
              onChange={(_, newValue) => setFormData({ ...formData, courseId: newValue?.id || null })}
              renderInput={(params) => (
                <TextField {...params} label="Select Course" />
              )}
              renderOption={(props, option) => {
                const { key, ...otherProps } = props;
                return (
                  <li key={option.id} {...otherProps}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <BookIcon sx={{ mr: 1 }} />
                      <Box>
                        <Typography variant="body1">{option.title}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {option.description}
                        </Typography>
                      </Box>
                    </Box>
                  </li>
                );
              }}
            />
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            {renderStudentSelect()}
            {renderStudentList()}
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
