import { useState } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Divider,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
} from '@mui/material';
import {
  Palette as PaletteIcon,
  Notifications as NotificationsIcon,
  Language as LanguageIcon,
  Lock as LockIcon,
  Person as PersonIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';

const Settings = () => {
  const { mode, toggleTheme, settings, updateSettings } = useTheme();
  const { currentUser } = useAuth();
  const [activeSection, setActiveSection] = useState('appearance');
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  const handleThemeToggle = () => {
    toggleTheme();
    setSaveSuccess('Theme updated successfully');
  };

  const handleSettingChange = async (key, value) => {
    try {
      await updateSettings({ [key]: value });
      setSaveSuccess('Settings updated successfully');
      setSaveError('');
    } catch (error) {
      setSaveError('Failed to update settings');
      console.error('Settings update error:', error);
    }
  };

  const sections = [
    {
      id: 'appearance',
      title: 'Appearance',
      icon: <PaletteIcon />,
      content: (
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Theme Settings
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={mode === 'dark'}
                onChange={handleThemeToggle}
                name="themeMode"
              />
            }
            label="Dark Mode"
          />
          <Box sx={{ mt: 3 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Font Size</InputLabel>
              <Select
                value={settings.fontSize}
                label="Font Size"
                onChange={(e) => handleSettingChange('fontSize', e.target.value)}
              >
                <MenuItem value="small">Small</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="large">Large</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>
      ),
    },
    {
      id: 'notifications',
      title: 'Notifications',
      icon: <NotificationsIcon />,
      content: (
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Notification Preferences
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={settings.notifications?.email}
                onChange={(e) => 
                  handleSettingChange('notifications', {
                    ...settings.notifications,
                    email: e.target.checked,
                  })
                }
                name="emailNotifications"
              />
            }
            label="Email Notifications"
          />
          <FormControlLabel
            control={
              <Switch
                checked={settings.notifications?.push}
                onChange={(e) =>
                  handleSettingChange('notifications', {
                    ...settings.notifications,
                    push: e.target.checked,
                  })
                }
                name="pushNotifications"
              />
            }
            label="Push Notifications"
          />
          <FormControlLabel
            control={
              <Switch
                checked={settings.notifications?.classReminders}
                onChange={(e) =>
                  handleSettingChange('notifications', {
                    ...settings.notifications,
                    classReminders: e.target.checked,
                  })
                }
                name="classReminders"
              />
            }
            label="Class Reminders"
          />
        </Box>
      ),
    },
    {
      id: 'language',
      title: 'Language',
      icon: <LanguageIcon />,
      content: (
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Language Settings
          </Typography>
          <FormControl fullWidth>
            <InputLabel>Language</InputLabel>
            <Select
              value={settings.language}
              label="Language"
              onChange={(e) => handleSettingChange('language', e.target.value)}
            >
              <MenuItem value="en">English</MenuItem>
              <MenuItem value="ar">Arabic</MenuItem>
              <MenuItem value="ms">Malay</MenuItem>
            </Select>
          </FormControl>
        </Box>
      ),
    },
  ];

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3}>
        <Box sx={{ display: 'flex' }}>
          {/* Settings Navigation */}
          <Box sx={{ width: 240, borderRight: 1, borderColor: 'divider' }}>
            <List>
              {sections.map((section) => (
                <ListItemButton
                  key={section.id}
                  selected={activeSection === section.id}
                  onClick={() => setActiveSection(section.id)}
                >
                  <ListItemIcon>{section.icon}</ListItemIcon>
                  <ListItemText primary={section.title} />
                </ListItemButton>
              ))}
            </List>
          </Box>

          {/* Settings Content */}
          <Box sx={{ flexGrow: 1 }}>
            {saveError && (
              <Alert severity="error" sx={{ m: 2 }}>
                {saveError}
              </Alert>
            )}
            {saveSuccess && (
              <Alert severity="success" sx={{ m: 2 }}>
                {saveSuccess}
              </Alert>
            )}
            {sections.find((s) => s.id === activeSection)?.content}
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default Settings;
