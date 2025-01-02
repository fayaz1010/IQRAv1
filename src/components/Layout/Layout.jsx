import { useState, useEffect } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  useTheme,
  useMediaQuery,
  Tooltip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon,
  Dashboard as DashboardIcon,
  School as SchoolIcon,
  Book as BookIcon,
  Person as PersonIcon,
  Class as ClassIcon,
  CalendarMonth as CalendarIcon,
  Settings as SettingsIcon,
  AdminPanelSettings as AdminIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import DashboardHeader from '../dashboard/DashboardHeader';

const drawerWidth = 280;

// Simplified menu structure
const menuItems = {
  student: [
    { title: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { title: 'My Classes', icon: <ClassIcon />, path: '/classes' },
    { title: 'Learn', icon: <BookIcon />, path: '/learn' },
    { title: 'Profile', icon: <PersonIcon />, path: '/profile' },
  ],
  teacher: [
    { title: 'Dashboard', icon: <DashboardIcon />, path: '/teacher' },
    { title: 'Schedule', icon: <CalendarIcon />, path: '/schedule' },
    { title: 'Classes', icon: <ClassIcon />, path: '/classes' },
    { title: 'Teaching', icon: <SchoolIcon />, path: '/classes/iqra' },
    { title: 'Profile', icon: <PersonIcon />, path: '/profile' },
  ],
  admin: [
    { title: 'Dashboard', icon: <AdminIcon />, path: '/admin' },
    { title: 'Users', icon: <PersonIcon />, path: '/admin/users' },
    { title: 'Settings', icon: <SettingsIcon />, path: '/admin/settings' },
  ],
};

const Layout = ({ children }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const [open, setOpen] = useState(true);
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Close drawer on mobile by default
  useEffect(() => {
    if (isMobile) {
      setOpen(false);
    }
  }, [isMobile]);

  const handleDrawerToggle = () => {
    setOpen(!open);
  };

  const handleNavigation = (path) => {
    navigate(path);
    if (isMobile) {
      setOpen(false);
    }
  };

  // Get current role's menu items
  const currentMenuItems = menuItems[currentUser?.role || 'student'] || [];

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${open ? drawerWidth : 0}px)` },
          ml: { md: `${open ? drawerWidth : 0}px` },
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <DashboardHeader />
        </Toolbar>
      </AppBar>

      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        open={open}
        onClose={handleDrawerToggle}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
          },
        }}
      >
        <Toolbar
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            px: [1],
          }}
        >
          <IconButton onClick={handleDrawerToggle}>
            <ChevronLeftIcon />
          </IconButton>
        </Toolbar>
        <Divider />
        <List>
          {currentMenuItems.map((item) => (
            <ListItem key={item.path} disablePadding>
              <ListItemButton
                selected={location.pathname === item.path}
                onClick={() => handleNavigation(item.path)}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.title} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: '64px',
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default Layout;
