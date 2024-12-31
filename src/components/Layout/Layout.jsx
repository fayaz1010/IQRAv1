import { useState } from 'react';
import { Box, AppBar, Toolbar, IconButton, Typography, Drawer, List, ListItem, ListItemIcon, ListItemText, useTheme, alpha, Button } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import SchoolIcon from '@mui/icons-material/School';
import BookIcon from '@mui/icons-material/Book';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import ScheduleIcon from '@mui/icons-material/Schedule';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { styled } from '@mui/material/styles';
import { useAuth } from '../../contexts/AuthContext';

const drawerWidth = 240;

const StyledListItem = styled(ListItem)(({ theme, active }) => ({
  margin: '8px 16px',
  borderRadius: theme.shape.borderRadius,
  backgroundColor: active ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
  color: active ? theme.palette.primary.main : theme.palette.text.primary,
  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.05),
  },
}));

const LogoText = styled(Typography)(({ theme }) => ({
  background: theme.palette.mode === 'light'
    ? 'linear-gradient(45deg, #4A90E2 30%, #2171C7 90%)'
    : 'linear-gradient(45deg, #68A6E8 30%, #4A90E2 90%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  fontWeight: 700,
  letterSpacing: '1px',
}));

export default function Layout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout } = useAuth();

  const getMenuItems = () => {
    const commonItems = [
      { text: 'Profile', icon: <AccountCircleIcon />, path: '/profile' },
    ];

    const roleBasedItems = {
      student: [
        { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
        { text: 'My Classes', icon: <SchoolIcon />, path: '/schedule' },
        { text: 'Learn', icon: <BookIcon />, path: '/learn' },
      ],
      teacher: [
        { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
        { text: 'Schedule', icon: <ScheduleIcon />, path: '/schedule' },
        { text: 'Students', icon: <PeopleIcon />, path: '/students' },
        { text: 'Materials', icon: <BookIcon />, path: '/materials' },
      ],
      admin: [
        { text: 'Dashboard', icon: <DashboardIcon />, path: '/admin' },
        { text: 'Users', icon: <PeopleIcon />, path: '/admin/users' },
        { text: 'Courses', icon: <SchoolIcon />, path: '/admin/courses' },
        { text: 'Reports', icon: <AssessmentIcon />, path: '/admin/reports' },
        { text: 'Settings', icon: <SettingsIcon />, path: '/admin/settings' },
      ],
    };

    return [
      ...(roleBasedItems[currentUser?.role || 'student'] || []),
      ...commonItems,
      { text: 'Logout', icon: <LogoutIcon />, path: '/logout' },
    ];
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  const handleMenuClick = (path) => {
    if (path === '/logout') {
      handleLogout();
    } else {
      navigate(path);
      setMobileOpen(false);
    }
  };

  const menuItems = getMenuItems();

  const drawer = (
    <Box sx={{ height: '100%', background: theme.palette.background.default }}>
      <Toolbar sx={{ justifyContent: 'center' }}>
        <LogoText variant="h5" component={motion.div} whileHover={{ scale: 1.05 }}>
          IQRA
        </LogoText>
      </Toolbar>
      <List>
        {menuItems.map((item) => (
          <StyledListItem
            button
            key={item.text}
            active={location.pathname === item.path ? 1 : 0}
            onClick={() => handleMenuClick(item.path)}
            component={motion.div}
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.98 }}
          >
            <ListItemIcon sx={{ color: 'inherit' }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
          </StyledListItem>
        ))}
      </List>
    </Box>
  );

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { xs: '100%', sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          zIndex: theme.zIndex.drawer + 1,
          backgroundColor: theme.palette.mode === 'light' 
            ? 'rgba(255, 255, 255, 0.9)'
            : 'rgba(18, 18, 18, 0.9)',
          backdropFilter: 'blur(8px)',
          color: theme.palette.mode === 'light' ? '#2C3E50' : '#E0E0E0',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ 
              mr: 2, 
              display: { sm: 'none' },
              zIndex: theme.zIndex.drawer + 2,
              backgroundColor: theme.palette.mode === 'light' 
                ? 'rgba(44, 62, 80, 0.1)'
                : 'rgba(255, 255, 255, 0.1)',
              '&:hover': {
                backgroundColor: theme.palette.mode === 'light'
                  ? 'rgba(44, 62, 80, 0.2)'
                  : 'rgba(255, 255, 255, 0.2)',
              },
            }}
          >
            <MenuIcon sx={{ 
              color: theme.palette.mode === 'light' ? '#2C3E50' : '#E0E0E0',
            }} />
          </IconButton>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Typography variant="h6" noWrap component="div">
              IQRA Learning Platform
            </Typography>
          </motion.div>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{
          width: { sm: drawerWidth },
          flexShrink: { sm: 0 },
          zIndex: theme.zIndex.drawer,
        }}
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              backgroundColor: theme.palette.background.default,
              borderRight: 'none',
              boxShadow: '4px 0 8px rgba(0,0,0,0.05)',
            },
            zIndex: theme.zIndex.drawer,
          }}
        >
          {drawer}
        </Drawer>

        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              backgroundColor: theme.palette.background.default,
              borderRight: 'none',
              boxShadow: '4px 0 8px rgba(0,0,0,0.05)',
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          background: theme.palette.mode === 'light'
            ? 'linear-gradient(135deg, #f5f7fa 0%, #e4e7eb 100%)'
            : 'linear-gradient(135deg, #1e1e1e 0%, #2d2d2d 100%)',
          pt: { xs: 8, sm: 9 },
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </Box>
    </Box>
  );
}
