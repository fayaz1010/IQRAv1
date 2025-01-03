import { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  Alert,
  Stack,
  Divider,
} from '@mui/material';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import User from '../components/user/User';
import { Link } from 'react-router-dom';
import HistoryIcon from '@mui/icons-material/History';

const Profile = () => {
  const { currentUser } = useAuth();
  const [profile, setProfile] = useState({
    displayName: '',
    phoneNumber: '',
    address: '',
    bio: '',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const docRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile({
            ...profile,
            ...docSnap.data(),
          });
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        setError('Failed to load profile');
      }
    };

    fetchProfile();
  }, [currentUser]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        displayName: profile.displayName,
        phoneNumber: profile.phoneNumber,
        address: profile.address,
        bio: profile.bio,
      });

      setSuccess('Profile updated successfully');
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Failed to update profile');
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <User
            userData={currentUser}
            variant="full"
            showProgress
          />
        </Box>

        <Divider sx={{ my: 3 }} />

        <form onSubmit={handleSubmit}>
          <Stack spacing={3}>
            {error && <Alert severity="error">{error}</Alert>}
            {success && <Alert severity="success">{success}</Alert>}

            <TextField
              label="Display Name"
              value={profile.displayName || ''}
              onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
              disabled={!isEditing}
              fullWidth
              required
            />

            <TextField
              label="Phone Number"
              value={profile.phoneNumber || ''}
              onChange={(e) => setProfile({ ...profile, phoneNumber: e.target.value })}
              disabled={!isEditing}
              fullWidth
              required
            />

            <TextField
              label="Address"
              value={profile.address || ''}
              onChange={(e) => setProfile({ ...profile, address: e.target.value })}
              disabled={!isEditing}
              fullWidth
              multiline
              rows={2}
            />

            <TextField
              label="Bio"
              value={profile.bio || ''}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              disabled={!isEditing}
              fullWidth
              multiline
              rows={4}
            />

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              {!isEditing ? (
                <Button
                  variant="contained"
                  onClick={() => setIsEditing(true)}
                >
                  Edit Profile
                </Button>
              ) : (
                <>
                  <Button
                    variant="outlined"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                  >
                    Save Changes
                  </Button>
                </>
              )}
            </Box>
          </Stack>
        </form>

        {/* Session History Link for Students */}
        {currentUser?.role === 'student' && (
          <Button
            component={Link}
            to={`/sessions/history?student=${currentUser.id}`}
            startIcon={<HistoryIcon />}
            variant="outlined"
            fullWidth
            sx={{ mt: 2 }}
          >
            View Learning History
          </Button>
        )}

        {/* Session History Link for Teachers */}
        {currentUser?.role === 'teacher' && (
          <Button
            component={Link}
            to="/sessions/history"
            startIcon={<HistoryIcon />}
            variant="outlined"
            fullWidth
            sx={{ mt: 2 }}
          >
            View Teaching History
          </Button>
        )}
      </Paper>
    </Container>
  );
};

export default Profile;
