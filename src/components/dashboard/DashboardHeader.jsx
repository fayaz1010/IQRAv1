import { useState } from 'react';
import {
  Box,
  Typography,
  Avatar,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  useTheme,
  Tooltip,
} from '@mui/material';
import {
  AccountCircle as AccountIcon,
  Settings as SettingsIcon,
  ExitToApp as LogoutIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  Menu as MenuIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme as useAppTheme } from '../../contexts/ThemeContext';

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

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin':
        return theme.palette.error.main;
      case 'teacher':
        return theme.palette.primary.main;
      default:
        return theme.palette.grey[500];
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

        <IconButton
          onClick={handleMenu}
          color="inherit"
          sx={{
            padding: 0.5,
            borderRadius: 1,
          }}
        >
          <Avatar
            sx={{
              width: 32,
              height: 32,
              bgcolor: theme.palette.primary.main,
              color: theme.palette.primary.contrastText,
            }}
          >
            {currentUser?.email?.charAt(0).toUpperCase() || 'U'}
          </Avatar>
        </IconButton>

        <Menu
          id="menu-appbar"
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
          <MenuItem onClick={() => navigate('/profile')}>
            <AccountIcon sx={{ mr: 1 }} />
            Profile
          </MenuItem>
          <MenuItem onClick={() => navigate('/settings')}>
            <SettingsIcon sx={{ mr: 1 }} />
            Settings
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleLogout}>
            <LogoutIcon sx={{ mr: 1 }} />
            Logout
          </MenuItem>
        </Menu>
      </Box>
    </Box>
  );
};

export default DashboardHeader;
