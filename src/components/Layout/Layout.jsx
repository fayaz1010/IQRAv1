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
  Collapse,
  useTheme,
  useMediaQuery,
  Tooltip,
  alpha,
} from '@mui/material';
import {
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon,
  Dashboard as DashboardIcon,
  School as SchoolIcon,
  Book as BookIcon,
  AccountCircle as AccountIcon,
  Schedule as ScheduleIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
  ExpandLess,
  ExpandMore,
  LiveTv as LiveTvIcon,
  Assignment as AssignmentIcon,
  Assessment as AssessmentIcon,
  Notifications as NotificationsIcon,
  Message as MessageIcon,
  AdminPanelSettings as AdminIcon,
  Class as ClassIcon,
  CalendarMonth as CalendarIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import DashboardHeader from '../dashboard/DashboardHeader';

const drawerWidth = 280;

const menuItems = {
  student: [
    {
      title: 'Home',
      icon: <DashboardIcon />,
      path: '/dashboard',
    },
    {
      title: 'Schedule & Classes',
      icon: <ScheduleIcon />,
      path: '/schedule',
      items: [
        { title: 'My Class Calendar', path: '/schedule/calendar' },
        { title: 'Join Live Class', path: '/schedule/join' },
        { title: 'Available Teachers', path: '/schedule/teachers' },
        { title: 'Request Class', path: '/schedule/request' },
      ],
    },
    {
      title: 'Learn',
      icon: <BookIcon />,
      path: '/learn',
      items: [
        { title: 'Arabic Alphabets', path: '/learn/alphabets' },
        { title: 'Iqra Books', path: '/learn/iqra' },
        { title: 'Practice', path: '/learn/practice' },
      ],
    },
    {
      title: 'Profile',
      icon: <PersonIcon />,
      path: '/profile',
      items: [
        { title: 'Personal Info', path: '/profile/info' },
        { title: 'Learning Stats', path: '/profile/stats' },
        { title: 'Settings', path: '/profile/settings' },
      ],
    },
  ],
  teacher: [
    {
      title: 'Home',
      icon: <DashboardIcon />,
      path: '/dashboard',
    },
    {
      title: 'Schedule Management',
      icon: <CalendarIcon />,
      path: '/schedule',
      items: [
        { title: 'Teaching Calendar', path: '/schedule/calendar' },
        { title: 'Available Slots', path: '/schedule/slots' },
        { title: 'Class Requests', path: '/schedule/requests' },
        { title: 'Templates', path: '/schedule/templates' },
      ],
    },
    {
      title: 'Classes',
      icon: <ClassIcon />,
      path: '/classes',
      items: [
        { title: 'Start Live Class', path: '/classes/live' },
        { title: 'Preparation', path: '/classes/prep' },
        { title: 'Whiteboard', path: '/classes/whiteboard' },
        { title: 'Recordings', path: '/classes/recordings' },
      ],
    },
    {
      title: 'Students',
      icon: <PeopleIcon />,
      path: '/students',
      items: [
        { title: 'Student List', path: '/students/list' },
        { title: 'Progress Tracking', path: '/students/progress' },
        { title: 'Attendance', path: '/students/attendance' },
      ],
    },
    {
      title: 'Profile',
      icon: <PersonIcon />,
      path: '/profile',
      items: [
        { title: 'Teaching Profile', path: '/profile/teaching' },
        { title: 'Calendar Settings', path: '/profile/calendar' },
        { title: 'Availability', path: '/profile/availability' },
      ],
    },
  ],
  admin: [
    {
      title: 'Home',
      icon: <DashboardIcon />,
      path: '/admin',
    },
    {
      title: 'User Management',
      icon: <PeopleIcon />,
      path: '/admin/users',
      items: [
        { title: 'Teachers', path: '/admin/users/teachers' },
        { title: 'Students', path: '/admin/users/students' },
        { title: 'Parents', path: '/admin/users/parents' },
        { title: 'Admins', path: '/admin/users/admins' },
      ],
    },
    {
      title: 'Course Management',
      icon: <SchoolIcon />,
      path: '/admin/courses',
      items: [
        { title: 'Course Approval', path: '/admin/courses/approval' },
        { title: 'Curriculum', path: '/admin/courses/curriculum' },
        { title: 'Quality Control', path: '/admin/courses/quality' },
      ],
    },
    {
      title: 'Settings',
      icon: <SettingsIcon />,
      path: '/admin/settings',
      items: [
        { title: 'System Settings', path: '/admin/settings/system' },
        { title: 'Notifications', path: '/admin/settings/notifications' },
        { title: 'Backup', path: '/admin/settings/backup' },
      ],
    },
  ],
};

const Layout = ({ children }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const [open, setOpen] = useState(true);
  const [expandedItem, setExpandedItem] = useState('');
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

  const handleItemClick = (path) => {
    navigate(path);
    if (isMobile) {
      setOpen(false);
    }
  };

  const handleExpandClick = (title) => {
    setExpandedItem(expandedItem === title ? '' : title);
  };

  const isPathActive = (path) => {
    return location.pathname.startsWith(path);
  };

  const renderMenuItem = (item) => {
    const isActive = isPathActive(item.path);
    const isExpanded = expandedItem === item.title;

    return (
      <Box key={item.title} sx={{ mb: 0.5 }}>
        <ListItemButton
          onClick={() => {
            if (item.items) {
              handleExpandClick(item.title);
            } else {
              handleItemClick(item.path);
            }
          }}
          sx={{
            borderRadius: 1,
            mb: 0.5,
            backgroundColor: isActive
              ? alpha(theme.palette.primary.main, 0.1)
              : 'transparent',
            color: isActive ? theme.palette.primary.main : theme.palette.text.primary,
            '&:hover': {
              backgroundColor: alpha(theme.palette.primary.main, 0.05),
            },
          }}
        >
          <ListItemIcon
            sx={{
              color: isActive ? theme.palette.primary.main : theme.palette.text.primary,
            }}
          >
            {item.icon}
          </ListItemIcon>
          <ListItemText primary={item.title} />
          {item.items && (isExpanded ? <ExpandLess /> : <ExpandMore />)}
        </ListItemButton>
        {item.items && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.items.map((subItem) => (
                <ListItemButton
                  key={subItem.title}
                  onClick={() => handleItemClick(subItem.path)}
                  sx={{
                    pl: 4,
                    py: 0.5,
                    borderRadius: 1,
                    ml: 2,
                    backgroundColor: location.pathname === subItem.path
                      ? alpha(theme.palette.primary.main, 0.1)
                      : 'transparent',
                    color: location.pathname === subItem.path
                      ? theme.palette.primary.main
                      : theme.palette.text.primary,
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.05),
                    },
                  }}
                >
                  <ListItemText 
                    primary={subItem.title}
                    primaryTypographyProps={{
                      variant: 'body2',
                      sx: { fontWeight: location.pathname === subItem.path ? 600 : 400 }
                    }}
                  />
                </ListItemButton>
              ))}
            </List>
          </Collapse>
        )}
      </Box>
    );
  };

  const userRole = currentUser?.role || 'student';
  const currentMenuItems = menuItems[userRole] || [];

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        sx={{
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.primary,
          boxShadow: 1,
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
            aria-label="toggle drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: 'flex' }}
          >
            <MenuIcon />
          </IconButton>
          <DashboardHeader />
        </Toolbar>
      </AppBar>

      <Drawer
        variant={isMobile ? 'temporary' : 'persistent'}
        anchor="left"
        open={open}
        onClose={handleDrawerToggle}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            backgroundColor: theme.palette.background.default,
            borderRight: `1px solid ${theme.palette.divider}`,
          },
        }}
      >
        <Toolbar
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: [1],
          }}
        >
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, ml: 2 }}>
            IQRA
          </Typography>
          <IconButton onClick={handleDrawerToggle}>
            <ChevronLeftIcon />
          </IconButton>
        </Toolbar>
        <Divider />
        <List sx={{ px: 2, py: 1 }}>
          {currentMenuItems.map(renderMenuItem)}
        </List>
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: 8,
          backgroundColor: theme.palette.background.default,
          minHeight: '100vh',
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default Layout;
