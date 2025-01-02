import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  Tabs,
  Tab,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Alert,
  Paper,
  InputAdornment,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  School as SchoolIcon,
  Person as PersonIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../../../../config/firebase';
import { useAuth } from '../../../../contexts/AuthContext';

const ClassSettings = ({ open, onClose, classData, onUpdate }) => {
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState(0);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editedClass, setEditedClass] = useState({
    name: classData?.name || '',
    description: classData?.description || '',
  });

  // Reset edited class when classData changes
  useEffect(() => {
    if (classData) {
      setEditedClass({
        name: classData.name || '',
        description: classData.description || '',
      });
    }
  }, [classData]);

  // Fetch students and courses
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.uid || !open) return;
      
      setLoading(true);
      try {
        // Fetch all students
        const studentsRef = collection(db, 'users');
        const studentsQuery = query(studentsRef, where('role', '==', 'student'));
        const studentsSnapshot = await getDocs(studentsQuery);
        const studentsList = [];
        studentsSnapshot.forEach((doc) => {
          studentsList.push({ id: doc.id, ...doc.data() });
        });
        setStudents(studentsList);

        // Fetch teacher's courses
        const coursesRef = collection(db, 'courses');
        const coursesQuery = query(coursesRef, where('teacherId', '==', user.uid));
        const coursesSnapshot = await getDocs(coursesQuery);
        const coursesList = [];
        coursesSnapshot.forEach((doc) => {
          coursesList.push({ id: doc.id, ...doc.data() });
        });
        setCourses(coursesList);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [open, user?.uid]);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const handleSaveDetails = async () => {
    try {
      setError('');
      setSuccess('');

      if (!editedClass.name) {
        setError('Class name is required');
        return;
      }

      const classRef = doc(db, 'classes', classData.id);
      await updateDoc(classRef, {
        name: editedClass.name,
        description: editedClass.description,
      });

      setSuccess('Class details updated successfully');
      onUpdate();
    } catch (error) {
      console.error('Error updating class:', error);
      setError('Failed to update class details');
    }
  };

  const handleAddStudent = async (studentId) => {
    try {
      console.log('Adding student:', {
        studentId,
        classId: classData.id,
        currentStudentIds: classData.studentIds || []
      });
      
      setError('');
      const classRef = doc(db, 'classes', classData.id);
      
      // Only update the studentIds array
      const updateData = {
        studentIds: arrayUnion(studentId),
        updatedAt: new Date().toISOString()
      };
      
      console.log('Update data:', updateData);
      
      await updateDoc(classRef, updateData);
      console.log('Student added successfully');
      
      onUpdate();
    } catch (error) {
      console.error('Error adding student:', {
        error,
        code: error.code,
        message: error.message,
        details: error.details
      });
      setError('Failed to add student');
    }
  };

  const handleRemoveStudent = async (studentId) => {
    try {
      setError('');
      const classRef = doc(db, 'classes', classData.id);
      await updateDoc(classRef, {
        studentIds: arrayRemove(studentId),
      });
      onUpdate();
    } catch (error) {
      console.error('Error removing student:', error);
      setError('Failed to remove student');
    }
  };

  const handleAssignCourse = async (courseId) => {
    try {
      setError('');
      const classRef = doc(db, 'classes', classData.id);
      await updateDoc(classRef, {
        courseId: courseId,
      });
      onUpdate();
    } catch (error) {
      console.error('Error assigning course:', error);
      setError('Failed to assign course');
    }
  };

  const filteredStudents = students.filter(student => 
    student.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderDetailsTab = () => (
    <Box sx={{ p: 2 }}>
      <TextField
        fullWidth
        label="Class Name"
        value={editedClass.name}
        onChange={(e) => setEditedClass({ ...editedClass, name: e.target.value })}
        sx={{ mb: 2 }}
      />
      <TextField
        fullWidth
        label="Description"
        value={editedClass.description}
        onChange={(e) => setEditedClass({ ...editedClass, description: e.target.value })}
        multiline
        rows={3}
        sx={{ mb: 2 }}
      />
      <Button variant="contained" onClick={handleSaveDetails}>
        Save Changes
      </Button>
    </Box>
  );

  const renderStudentsTab = () => (
    <Box sx={{ p: 2 }}>
      <TextField
        fullWidth
        placeholder="Search students..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
        sx={{ mb: 2 }}
      />
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Class Students
      </Typography>
      <List>
        {classData?.studentIds?.map((studentId) => {
          const student = students.find(s => s.id === studentId);
          if (!student) return null;
          return (
            <ListItem key={studentId}>
              <ListItemText 
                primary={student.name}
                secondary={student.email}
              />
              <ListItemSecondaryAction>
                <IconButton edge="end" onClick={() => handleRemoveStudent(studentId)}>
                  <DeleteIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          );
        })}
      </List>
      <Divider sx={{ my: 2 }} />
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Available Students
      </Typography>
      <List>
        {filteredStudents
          .filter(student => !classData?.studentIds?.includes(student.id))
          .map((student) => (
            <ListItem key={student.id}>
              <ListItemText 
                primary={student.name}
                secondary={student.email}
              />
              <ListItemSecondaryAction>
                <IconButton edge="end" onClick={() => handleAddStudent(student.id)}>
                  <AddIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
      </List>
    </Box>
  );

  const renderCourseTab = () => (
    <Box sx={{ p: 2 }}>
      <Typography variant="subtitle2" gutterBottom>
        Current Course
      </Typography>
      {classData?.courseId ? (
        <Paper sx={{ p: 2, mb: 2 }}>
          {courses.find(c => c.id === classData.courseId)?.name || 'Loading...'}
          <IconButton 
            size="small" 
            onClick={() => handleAssignCourse(null)}
            sx={{ ml: 1 }}
          >
            <DeleteIcon />
          </IconButton>
        </Paper>
      ) : (
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          No course assigned
        </Typography>
      )}

      <Typography variant="subtitle2" gutterBottom>
        Available Courses
      </Typography>
      <List>
        {courses
          .filter(course => course.id !== classData?.courseId)
          .map((course) => (
            <ListItem 
              key={course.id}
              button
              onClick={() => handleAssignCourse(course.id)}
            >
              <ListItemText 
                primary={course.name}
                secondary={course.description}
              />
              <ListItemSecondaryAction>
                <IconButton edge="end" onClick={() => handleAssignCourse(course.id)}>
                  <AddIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
      </List>
    </Box>
  );

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        Class Settings - {classData?.name}
      </DialogTitle>
      <DialogContent dividers>
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
        <Tabs value={currentTab} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab icon={<SettingsIcon />} label="Details" />
          <Tab icon={<PersonIcon />} label="Students" />
          <Tab icon={<SchoolIcon />} label="Course" />
        </Tabs>
        <Box sx={{ mt: 2 }}>
          {currentTab === 0 && renderDetailsTab()}
          {currentTab === 1 && renderStudentsTab()}
          {currentTab === 2 && renderCourseTab()}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ClassSettings;
