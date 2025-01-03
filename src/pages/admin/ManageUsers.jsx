import { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  LinearProgress,
  Snackbar,
  Alert,
  TablePagination,
  Avatar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import {
  Edit as EditIcon,
  PhotoCamera as PhotoIcon,
} from '@mui/icons-material';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import User from '../../components/user/User';
import { useUser } from '../../contexts/UserContext';

const ManageUsers = () => {
  const { currentUser } = useAuth();
  const { users: usersData, loading } = useUser();
  const [editingUser, setEditingUser] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'success' });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [uploadProgress, setUploadProgress] = useState(false);

  const handleEditUser = (user) => {
    setEditingUser({
      ...user,
      displayName: user.displayName || '',
      email: user.email || '',
      phoneNumber: user.phoneNumber || '',
      role: user.role || 'student',
      address: user.address || '',
      bio: user.bio || '',
    });
    setPhotoFile(null);
  };

  const handlePhotoChange = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setPhotoFile(file);
    } else {
      setAlert({
        open: true,
        message: 'Please select a valid image file',
        severity: 'error'
      });
    }
  };

  const uploadPhoto = async (userId, file) => {
    if (!file) return null;
    
    console.log('Current user:', currentUser);
    console.log('Uploading photo for user:', userId);
    
    const fileRef = ref(storage, `userPhotos/${userId}/${file.name}`);
    setUploadProgress(true);
    
    try {
      console.log('Attempting to upload to:', fileRef.fullPath);
      const snapshot = await uploadBytes(fileRef, file);
      console.log('Upload successful:', snapshot);
      const photoURL = await getDownloadURL(snapshot.ref);
      setUploadProgress(false);
      return photoURL;
    } catch (error) {
      console.error('Error uploading photo:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        serverResponse: error.serverResponse
      });
      setUploadProgress(false);
      throw error;
    }
  };

  const handleSaveUser = async () => {
    if (!editingUser.displayName?.trim()) {
      setAlert({
        open: true,
        message: 'Full name is required',
        severity: 'error'
      });
      return;
    }

    try {
      const userRef = doc(db, 'users', editingUser.id);
      const updateData = {
        displayName: editingUser.displayName,
        phoneNumber: editingUser.phoneNumber || '',
        address: editingUser.address || '',
        bio: editingUser.bio || '',
        role: editingUser.role,
      };

      // Only attempt photo upload if a new photo was selected
      if (photoFile) {
        try {
          const photoURL = await uploadPhoto(editingUser.id, photoFile);
          if (photoURL) {
            updateData.photoURL = photoURL;
          }
        } catch (error) {
          setAlert({
            open: true,
            message: 'Error uploading photo. Please try again.',
            severity: 'error'
          });
          return;
        }
      }

      await updateDoc(userRef, updateData);
      setEditingUser(null);
      setAlert({
        open: true,
        message: 'User updated successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error updating user:', error);
      setAlert({
        open: true,
        message: 'Error updating user. Please try again.',
        severity: 'error'
      });
    }
  };

  if (loading) {
    return <LinearProgress />;
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h6" gutterBottom component="div">
          Manage Users
        </Typography>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Object.values(usersData)
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <User 
                        userData={user}
                        variant="compact"
                        showProgress
                      />
                    </TableCell>
                    <TableCell>{user.role}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <IconButton
                        onClick={() => handleEditUser(user)}
                        color="primary"
                      >
                        <EditIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={Object.keys(usersData).length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(event, newPage) => setPage(newPage)}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(parseInt(event.target.value, 10));
            setPage(0);
          }}
        />
      </Paper>

      <Dialog 
        open={!!editingUser} 
        onClose={() => setEditingUser(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit User Profile</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar
                src={photoFile ? URL.createObjectURL(photoFile) : editingUser?.photoURL}
                sx={{ width: 100, height: 100 }}
              >
                {editingUser?.displayName?.[0] || '?'}
              </Avatar>
              <Box>
                <input
                  accept="image/*"
                  style={{ display: 'none' }}
                  id="photo-upload"
                  type="file"
                  onChange={handlePhotoChange}
                />
                <label htmlFor="photo-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<PhotoIcon />}
                  >
                    Change Photo
                  </Button>
                </label>
              </Box>
            </Box>

            <TextField
              label="Full Name"
              value={editingUser?.displayName || ''}
              onChange={(e) => setEditingUser({ ...editingUser, displayName: e.target.value })}
              fullWidth
              required
              error={!editingUser?.displayName?.trim()}
              helperText={!editingUser?.displayName?.trim() ? 'Full name is required' : ''}
            />

            <TextField
              label="Email"
              value={editingUser?.email || ''}
              fullWidth
              disabled
            />

            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={editingUser?.role || 'student'}
                onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                label="Role"
              >
                <MenuItem value="student">Student</MenuItem>
                <MenuItem value="teacher">Teacher</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Phone Number"
              value={editingUser?.phoneNumber || ''}
              onChange={(e) => setEditingUser({ ...editingUser, phoneNumber: e.target.value })}
              fullWidth
            />

            <TextField
              label="Address"
              value={editingUser?.address || ''}
              onChange={(e) => setEditingUser({ ...editingUser, address: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />

            <TextField
              label="Bio"
              value={editingUser?.bio || ''}
              onChange={(e) => setEditingUser({ ...editingUser, bio: e.target.value })}
              fullWidth
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingUser(null)}>Cancel</Button>
          <Button 
            onClick={handleSaveUser} 
            variant="contained"
            disabled={uploadProgress || !editingUser?.displayName?.trim()}
          >
            {uploadProgress ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                Uploading...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={alert.open}
        autoHideDuration={6000}
        onClose={() => setAlert({ ...alert, open: false })}
      >
        <Alert
          onClose={() => setAlert({ ...alert, open: false })}
          severity={alert.severity}
          sx={{ width: '100%' }}
        >
          {alert.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ManageUsers;
