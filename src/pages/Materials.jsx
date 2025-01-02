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
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  YouTube as YouTubeIcon,
  Link as LinkIcon,
  Book as BookIcon,
  Description as DescriptionIcon,
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
    id={`material-tabpanel-${index}`}
    {...other}
  >
    {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
  </div>
);

const Materials = () => {
  const theme = useTheme();
  const { currentUser } = useAuth();
  const [materials, setMaterials] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'document', // document, video, link, book
    content: '',
    tags: [],
  });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMaterials();
  }, [currentUser]);

  const fetchMaterials = async () => {
    try {
      const materialsRef = collection(db, 'materials');
      const q = query(
        materialsRef,
        where('teacherId', '==', currentUser.uid)
      );
      
      const querySnapshot = await getDocs(q);
      const fetchedMaterials = [];
      querySnapshot.forEach((doc) => {
        fetchedMaterials.push({ id: doc.id, ...doc.data() });
      });
      setMaterials(fetchedMaterials);
    } catch (error) {
      console.error('Error fetching materials:', error);
      setError('Failed to load materials');
    }
  };

  const handleOpenDialog = (material = null) => {
    if (material) {
      setSelectedMaterial(material);
      setFormData({
        title: material.title,
        description: material.description,
        type: material.type,
        content: material.content,
        tags: material.tags || [],
      });
    } else {
      setSelectedMaterial(null);
      setFormData({
        title: '',
        description: '',
        type: 'document',
        content: '',
        tags: [],
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedMaterial(null);
    setError('');
  };

  const handleSubmit = async () => {
    try {
      if (!formData.title) {
        setError('Title is required');
        return;
      }

      const materialData = {
        ...formData,
        teacherId: currentUser.uid,
        updatedAt: new Date().toISOString(),
      };

      if (selectedMaterial) {
        await updateDoc(doc(db, 'materials', selectedMaterial.id), materialData);
      } else {
        materialData.createdAt = new Date().toISOString();
        await addDoc(collection(db, 'materials'), materialData);
      }

      handleCloseDialog();
      fetchMaterials();
    } catch (error) {
      console.error('Error saving material:', error);
      setError('Failed to save material');
    }
  };

  const handleDelete = async (materialId) => {
    try {
      await deleteDoc(doc(db, 'materials', materialId));
      fetchMaterials();
    } catch (error) {
      console.error('Error deleting material:', error);
      setError('Failed to delete material');
    }
  };

  const getMaterialIcon = (type) => {
    switch (type) {
      case 'video':
        return <YouTubeIcon />;
      case 'link':
        return <LinkIcon />;
      case 'book':
        return <BookIcon />;
      default:
        return <DescriptionIcon />;
    }
  };

  const filterMaterialsByType = (type) => {
    return materials.filter(material => material.type === type);
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
          <Typography variant="h4">Teaching Materials</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add Material
          </Button>
        </Box>

        <Paper sx={{ width: '100%', bgcolor: 'background.paper' }}>
          <Tabs
            value={tabValue}
            onChange={(_, newValue) => setTabValue(newValue)}
            indicatorColor="primary"
            textColor="primary"
            centered
          >
            <Tab label="Documents" />
            <Tab label="Videos" />
            <Tab label="Links" />
            <Tab label="Books" />
          </Tabs>

          <TabPanel value={tabValue} index={0}>
            <Grid container spacing={3}>
              {filterMaterialsByType('document').map((material) => (
                <Grid item xs={12} md={6} key={material.id}>
                  <Card
                    component={motion.div}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <DescriptionIcon sx={{ mr: 1 }} />
                          <Typography variant="h6">{material.title}</Typography>
                        </Box>
                        <Box>
                          <IconButton
                            size="small"
                            onClick={() => handleOpenDialog(material)}
                            sx={{ mr: 1 }}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(material.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </Box>
                      <Typography color="textSecondary" gutterBottom>
                        {material.description}
                      </Typography>
                      {material.tags?.length > 0 && (
                        <Box sx={{ mt: 2 }}>
                          {material.tags.map((tag) => (
                            <Chip
                              key={tag}
                              label={tag}
                              size="small"
                              sx={{ mr: 1, mb: 1 }}
                            />
                          ))}
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Grid container spacing={3}>
              {filterMaterialsByType('video').map((material) => (
                <Grid item xs={12} md={6} key={material.id}>
                  <Card
                    component={motion.div}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <YouTubeIcon sx={{ mr: 1 }} />
                          <Typography variant="h6">{material.title}</Typography>
                        </Box>
                        <Box>
                          <IconButton
                            size="small"
                            onClick={() => handleOpenDialog(material)}
                            sx={{ mr: 1 }}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(material.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </Box>
                      <Typography color="textSecondary" gutterBottom>
                        {material.description}
                      </Typography>
                      <Button
                        variant="outlined"
                        startIcon={<YouTubeIcon />}
                        href={material.content}
                        target="_blank"
                        sx={{ mt: 2 }}
                      >
                        Watch Video
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <Grid container spacing={3}>
              {filterMaterialsByType('link').map((material) => (
                <Grid item xs={12} md={6} key={material.id}>
                  <Card
                    component={motion.div}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <LinkIcon sx={{ mr: 1 }} />
                          <Typography variant="h6">{material.title}</Typography>
                        </Box>
                        <Box>
                          <IconButton
                            size="small"
                            onClick={() => handleOpenDialog(material)}
                            sx={{ mr: 1 }}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(material.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </Box>
                      <Typography color="textSecondary" gutterBottom>
                        {material.description}
                      </Typography>
                      <Button
                        variant="outlined"
                        startIcon={<LinkIcon />}
                        href={material.content}
                        target="_blank"
                        sx={{ mt: 2 }}
                      >
                        Visit Link
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </TabPanel>

          <TabPanel value={tabValue} index={3}>
            <Grid container spacing={3}>
              {filterMaterialsByType('book').map((material) => (
                <Grid item xs={12} md={6} key={material.id}>
                  <Card
                    component={motion.div}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <BookIcon sx={{ mr: 1 }} />
                          <Typography variant="h6">{material.title}</Typography>
                        </Box>
                        <Box>
                          <IconButton
                            size="small"
                            onClick={() => handleOpenDialog(material)}
                            sx={{ mr: 1 }}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(material.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </Box>
                      <Typography color="textSecondary" gutterBottom>
                        {material.description}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </TabPanel>
        </Paper>
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
          {selectedMaterial ? 'Edit Material' : 'Add New Material'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {error && (
              <Typography color="error" sx={{ mb: 2 }}>
                {error}
              </Typography>
            )}
            
            <TextField
              fullWidth
              label="Title"
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
              select
              fullWidth
              label="Type"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              sx={{ mb: 2 }}
              SelectProps={{
                native: true,
              }}
            >
              <option value="document">Document</option>
              <option value="video">Video</option>
              <option value="link">Link</option>
              <option value="book">Book</option>
            </TextField>

            <TextField
              fullWidth
              label="Content"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              multiline={formData.type === 'document'}
              rows={formData.type === 'document' ? 4 : 1}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Tags (comma-separated)"
              value={formData.tags.join(', ')}
              onChange={(e) => setFormData({
                ...formData,
                tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
              })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {selectedMaterial ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Materials;
