import React from 'react';
import {
  Avatar,
  Box,
  Typography,
  Chip,
  LinearProgress,
  Tooltip,
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';

const MANDATORY_FIELDS = ['displayName', 'phoneNumber'];

export const calculateProfileCompletion = (userData) => {
  const totalFields = MANDATORY_FIELDS.length;
  const completedFields = MANDATORY_FIELDS.filter(
    field => userData[field] && userData[field].trim() !== ''
  ).length;
  return (completedFields / totalFields) * 100;
};

const User = ({ 
  userData,
  variant = 'full', // 'full', 'compact', or 'avatar-only'
  showProgress = true,
  onClick,
}) => {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';
  
  const profileCompletion = calculateProfileCompletion(userData);

  const renderAvatar = () => (
    <Avatar
      src={userData.photoURL}
      alt={userData.displayName || 'User'}
      sx={{ 
        width: variant === 'compact' ? 32 : 40,
        height: variant === 'compact' ? 32 : 40,
        cursor: onClick ? 'pointer' : 'default'
      }}
      onClick={onClick}
    />
  );

  if (variant === 'avatar-only') {
    return renderAvatar();
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        p: variant === 'compact' ? 1 : 2,
        cursor: onClick ? 'pointer' : 'default'
      }}
      onClick={onClick}
    >
      {renderAvatar()}
      
      <Box sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant={variant === 'compact' ? 'body2' : 'body1'} fontWeight="medium">
            {userData.displayName || 'Unnamed User'}
          </Typography>
          <Chip
            label={userData.role}
            size="small"
            color={userData.role === 'admin' ? 'error' : userData.role === 'teacher' ? 'primary' : 'default'}
          />
          {userData.status && (
            <Chip
              label={userData.status}
              size="small"
              color={userData.status === 'active' ? 'success' : 'warning'}
            />
          )}
        </Box>
        
        {variant === 'full' && (
          <>
            <Typography variant="body2" color="text.secondary">
              {userData.email}
            </Typography>
            {userData.phoneNumber && (
              <Typography variant="body2" color="text.secondary">
                {userData.phoneNumber}
              </Typography>
            )}
          </>
        )}

        {showProgress && (isAdmin || currentUser.uid === userData.id) && (
          <Tooltip title={`Profile ${profileCompletion}% complete`}>
            <LinearProgress
              variant="determinate"
              value={profileCompletion}
              sx={{ 
                mt: 1,
                height: 4,
                borderRadius: 2,
                bgcolor: 'background.paper'
              }}
            />
          </Tooltip>
        )}
      </Box>
    </Box>
  );
};

export default User;
