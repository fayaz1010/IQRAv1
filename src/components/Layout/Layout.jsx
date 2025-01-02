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
  Collapse,
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
  LibraryBooks as LibraryBooksIcon,
  MenuBook as MenuBookIcon,
  Assignment as AssignmentIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import DashboardHeader from '../dashboard/DashboardHeader';

const drawerWidth = 280;

// Enhanced menu structure with sub-items and categories
const menuItems = {
  student: [
    { title: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { title: 'My Classes', icon: <ClassIcon />, path: '/classes' },
    { title: 'Learn', icon: <BookIcon />, path: '/learn' },
    { title: 'Profile', icon: <PersonIcon />, path: '/profile' },
  ],
  teacher: [
    { 
      title: 'Dashboard', 
      icon: <DashboardIcon />, 
      path: '/teacher' 
    },
    {
      title: 'Teaching',
      icon: <SchoolIcon />,
      children: [
        { 
          title: 'Active Sessions', 
          icon: <MenuBookIcon />, 
          path: '/classes/iqra' 
        },
        { 
          title: 'Courses', 
          icon: <LibraryBooksIcon />, 
          path: '/courses' 
        },
        { 
          title: 'Materials', 
          icon: <AssignmentIcon />, 
          path: '/materials' 
        },
      ]
    },
    {
      title: 'Management',
      icon: <ClassIcon />,
      children: [
        { 
          title: 'Classes', 
          icon: <ClassIcon />, 
          path: '/classes' 
        },
        { 
          title: 'Schedule', 
          icon: <CalendarIcon />, 
          path: '/schedule' 
        },
      ]
    },
    { 
      title: 'Profile', 
      icon: <PersonIcon />, 
      path: '/profile' 
    },
  ],
  admin: [
    { title: 'Dashboard', icon: <DashboardIcon />, path: '/admin' },
    { title: 'Settings', icon: <SettingsIcon />, path: '/admin/settings' },
    { title: 'Users', icon: <AdminIcon />, path: '/admin/users' },
  ],
};

const Layout = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [open, setOpen] = useState(!isMobile);
  const [expandedMenus, setExpandedMenus] = useState({});
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const userRole = currentUser?.role || 'student';

  useEffect(() => {
    setOpen(!isMobile);
  }, [isMobile]);

  const handleDrawerToggle = () => {
    setOpen(!open);
  };

  const handleMenuClick = (path) => {
    navigate(path);
    if (isMobile) {
      setOpen(false);
    }
  };

  const handleExpandClick = (title) => {
    setExpandedMenus(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  const renderMenuItem = (item) => {
    if (item.children) {
      return (
        <div key={item.title}>
          <ListItemButton onClick={() => handleExpandClick(item.title)}>
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.title} />
            {expandedMenus[item.title] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </ListItemButton>
          <Collapse in={expandedMenus[item.title]} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.children.map((child) => (
                <ListItemButton
                  key={child.title}
                  sx={{ pl: 4 }}
                  selected={location.pathname === child.path}
                  onClick={() => handleMenuClick(child.path)}
                >
                  <ListItemIcon>{child.icon}</ListItemIcon>
                  <ListItemText primary={child.title} />
                </ListItemButton>
              ))}
            </List>
          </Collapse>
        </div>
      );
    }

    return (
      <ListItemButton
        key={item.title}
        selected={location.pathname === item.path}
        onClick={() => handleMenuClick(item.path)}
      >
        <ListItemIcon>{item.icon}</ListItemIcon>
        <ListItemText primary={item.title} />
      </ListItemButton>
    );
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.primary,
          borderBottom: `1px solid ${theme.palette.divider}`,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          transition: theme.transitions.create(['margin', 'width'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
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
        ModalProps={{
          keepMounted: true,
        }}
        sx={{
          display: { xs: 'block', sm: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
            backgroundColor: theme.palette.background.default,
            borderRight: `1px solid ${theme.palette.divider}`,
          },
        }}
      >
        <Toolbar 
          sx={{ 
            display: 'flex', 
            justifyContent: 'center',
            alignItems: 'center',
            py: 1
          }}
        >
          <Box
            component="img"
            src="/assets/logo.png"
            alt="Iqra App Logo"
            sx={{
              height: 64,
              width: 'auto',
              mb: 2
            }}
          />
        </Toolbar>
        <Box sx={{ overflow: 'auto' }}>
          <List>
            {menuItems[userRole] && menuItems[userRole].map((item) => renderMenuItem(item))}
          </List>
        </Box>
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          mt: '64px',
          transition: theme.transitions.create(['margin', 'width'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default Layout;
