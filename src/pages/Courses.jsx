import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  useTheme,
  Tabs,
  Tab,
  Autocomplete,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Link as LinkIcon,
  YouTube as YouTubeIcon,
  Book as BookIcon,
  MenuBook as MenuBookIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

const IQRA_BOOKS = [
  'Iqra Book 1',
  'Iqra Book 2',
  'Iqra Book 3',
  'Iqra Book 4',
  'Iqra Book 5',
  'Iqra Book 6',
];

const QURAN_SURAHS = [
  'Al-Fatiha',
  'Al-Baqarah',
  'Al-Imran',
  // Add more surahs
];

const TabPanel = ({ children, value, index, ...other }) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`course-tabpanel-${index}`}
    {...other}
  >
    {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
  </div>
);

const Courses = () => {
  const theme = useTheme();
  const { currentUser } = useAuth();
  const [courses, setCourses] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    objectives: '',
    iqraBooks: [],
    iqraPages: '',
    youtubeLinks: [],
    websiteLinks: [],
    quranContent: [],
    materials: [],
  });
  const [materialInput, setMaterialInput] = useState({
    youtubeLink: '',
    websiteLink: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCourses();
  }, [currentUser]);

  const fetchCourses = async () => {
    try {
      const coursesRef = collection(db, 'courses');
      const q = query(
        coursesRef,
        where('teacherId', '==', currentUser.uid)
      );
      
      const querySnapshot = await getDocs(q);
      const fetchedCourses = [];
      querySnapshot.forEach((doc) => {
        fetchedCourses.push({ id: doc.id, ...doc.data() });
      });
      
      setCourses(fetchedCourses);
    } catch (error) {
      console.error('Error fetching courses:', error);
      setError('Failed to load courses');
    }
  };

  const handleOpenDialog = (course = null) => {
    if (course) {
      setSelectedCourse(course);
      setFormData({
        title: course.title,
        description: course.description,
        objectives: course.objectives,
        iqraBooks: course.iqraBooks || [],
        iqraPages: course.iqraPages || '',
        youtubeLinks: course.youtubeLinks || [],
        websiteLinks: course.websiteLinks || [],
        quranContent: course.quranContent || [],
        materials: course.materials || [],
      });
    } else {
      setSelectedCourse(null);
      setFormData({
        title: '',
        description: '',
        objectives: '',
        iqraBooks: [],
        iqraPages: '',
        youtubeLinks: [],
        websiteLinks: [],
        quranContent: [],
        materials: [],
      });
    }
    setOpenDialog(true);
    setTabValue(0);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedCourse(null);
    setError('');
  };

  const handleAddLink = (type) => {
    const link = materialInput[type];
    if (!link) return;

    setFormData(prev => ({
      ...prev,
      [type === 'youtubeLink' ? 'youtubeLinks' : 'websiteLinks']: [
        ...prev[type === 'youtubeLink' ? 'youtubeLinks' : 'websiteLinks'],
        link
      ]
    }));
    setMaterialInput(prev => ({ ...prev, [type]: '' }));
  };

  const handleRemoveLink = (type, index) => {
    setFormData(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async () => {
    try {
      if (!formData.title) {
        setError('Title is required');
        return;
      }

      const courseData = {
        ...formData,
        teacherId: currentUser.uid,
        updatedAt: new Date().toISOString(),
      };

      if (selectedCourse) {
        await updateDoc(doc(db, 'courses', selectedCourse.id), courseData);
      } else {
        courseData.createdAt = new Date().toISOString();
        await addDoc(collection(db, 'courses'), courseData);
      }

      handleCloseDialog();
      fetchCourses();
    } catch (error) {
      console.error('Error saving course:', error);
      setError('Failed to save course');
    }
  };

  const handleDelete = async (courseId) => {
    try {
      await deleteDoc(doc(db, 'courses', courseId));
      fetchCourses();
    } catch (error) {
      console.error('Error deleting course:', error);
      setError('Failed to delete course');
    }
  };

  return (
    <Container maxWidth="lg" sx={{ 
      mt: 4, 
      mb: 4,
      minHeight: '100vh',
      backgroundColor: theme.palette.background.default,
      color: theme.palette.text.primary,
    }}>
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h4">Course Management</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Create Course
          </Button>
        </Box>

        <Grid container spacing={3}>
          {courses.map((course) => (
            <Grid item xs={12} md={6} key={course.id}>
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
                    <Typography variant="h6">{course.title}</Typography>
                    <Box>
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(course)}
                        sx={{ mr: 1 }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(course.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>
                  <Typography color="textSecondary" gutterBottom>
                    {course.description}
                  </Typography>
                  {course.iqraBooks?.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Iqra Books:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {course.iqraBooks.map((book, index) => (
                          <Chip
                            key={index}
                            label={book}
                            size="small"
                            icon={<BookIcon />}
                          />
                        ))}
                      </Box>
                    </Box>
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
          {selectedCourse ? 'Edit Course' : 'Create New Course'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
              <Tab label="Basic Info" />
              <Tab label="Materials" />
              <Tab label="Content" />
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
              label="Course Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={3}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Course Objectives"
              value={formData.objectives}
              onChange={(e) => setFormData({ ...formData, objectives: e.target.value })}
              multiline
              rows={3}
            />
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Autocomplete
              multiple
              options={IQRA_BOOKS}
              value={formData.iqraBooks}
              onChange={(_, newValue) => setFormData({ ...formData, iqraBooks: newValue })}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Iqra Books"
                  sx={{ mb: 2 }}
                />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    icon={<MenuBookIcon />}
                    label={option}
                    {...getTagProps({ index })}
                  />
                ))
              }
            />
            <TextField
              fullWidth
              label="Specific Pages (optional)"
              value={formData.iqraPages}
              onChange={(e) => setFormData({ ...formData, iqraPages: e.target.value })}
              helperText="Enter page numbers or ranges (e.g., 1-5, 7, 10-12)"
              sx={{ mb: 2 }}
            />
            <Autocomplete
              multiple
              freeSolo
              options={QURAN_SURAHS}
              value={formData.quranContent}
              onChange={(_, newValue) => setFormData({ ...formData, quranContent: newValue })}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Quran Content"
                  helperText="Enter Surah names or specific verses"
                />
              )}
            />
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                YouTube Links
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Enter YouTube URL"
                  value={materialInput.youtubeLink}
                  onChange={(e) => setMaterialInput({ ...materialInput, youtubeLink: e.target.value })}
                />
                <Button
                  variant="contained"
                  onClick={() => handleAddLink('youtubeLink')}
                  startIcon={<YouTubeIcon />}
                >
                  Add
                </Button>
              </Box>
              <List dense>
                {formData.youtubeLinks.map((link, index) => (
                  <ListItem key={index}>
                    <ListItemText primary={link} />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={() => handleRemoveLink('youtubeLinks', index)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </Box>

            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Website Links
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Enter website URL"
                  value={materialInput.websiteLink}
                  onChange={(e) => setMaterialInput({ ...materialInput, websiteLink: e.target.value })}
                />
                <Button
                  variant="contained"
                  onClick={() => handleAddLink('websiteLink')}
                  startIcon={<LinkIcon />}
                >
                  Add
                </Button>
              </Box>
              <List dense>
                {formData.websiteLinks.map((link, index) => (
                  <ListItem key={index}>
                    <ListItemText primary={link} />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={() => handleRemoveLink('websiteLinks', index)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </Box>
          </TabPanel>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {selectedCourse ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Courses;
