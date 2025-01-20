import { useState } from 'react';
import {
  Box,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  useTheme,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  ExitToApp as LogoutIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  Menu as MenuIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme as useAppTheme } from '../../contexts/ThemeContext';
import User from '../user/User';

const DashboardHeader = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const { mode, toggleMode } = useAppTheme();
  const [anchorEl, setAnchorEl] = useState(null);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
      }}
    >
      <Box sx={{ visibility: 'hidden' }}>
        {/* Placeholder to help with centering */}
        <IconButton disabled>
          <MenuIcon />
        </IconButton>
      </Box>

      <Typography
        variant="h4"
        component="div"
        sx={{
          fontWeight: 700,
          textAlign: 'center',
          background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: '0.1em'
        }}
      >
        IQRA
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Tooltip title={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}>
          <IconButton onClick={toggleMode} color="inherit">
            {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
        </Tooltip>

        <User
          userData={currentUser}
          variant="compact"
          showProgress={false}
          onClick={handleMenu}
        />

        <Menu
          anchorEl={anchorEl}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          keepMounted
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          open={Boolean(anchorEl)}
          onClose={handleClose}
        >
          <MenuItem onClick={() => {
            handleClose();
            navigate('/profile');
          }}>
            Profile
          </MenuItem>
          <MenuItem onClick={() => {
            handleClose();
            navigate('/settings');
          }}>
            Settings
          </MenuItem>
          <Divider />
          <MenuItem onClick={() => {
            handleClose();
            handleLogout();
          }}>
            Logout
          </MenuItem>
        </Menu>
      </Box>
    </Box>
  );
};

export default DashboardHeader;
