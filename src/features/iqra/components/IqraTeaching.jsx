import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Divider,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Edit as EditIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';

const IqraTeaching = () => {
  const [currentStudents] = useState([
    {
      id: 1,
      name: 'Ahmad',
      currentBook: 'Iqra Book 1',
      currentPage: 15,
      lastClass: '2024-12-30',
    },
    {
      id: 2,
      name: 'Fatima',
      currentBook: 'Iqra Book 2',
      currentPage: 8,
      lastClass: '2024-12-29',
    },
  ]);

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Iqra Teaching Dashboard
      </Typography>

      <Grid container spacing={3}>
        {/* Quick Actions */}
        <Grid item xs={12} md={4}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexDirection: 'column' }}>
              <Button
                variant="contained"
                startIcon={<PlayIcon />}
                fullWidth
                onClick={() => console.log('Start new session')}
              >
                Start New Session
              </Button>
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                fullWidth
                onClick={() => console.log('Manage materials')}
              >
                Manage Teaching Materials
              </Button>
              <Button
                variant="outlined"
                startIcon={<AssessmentIcon />}
                fullWidth
                onClick={() => console.log('View reports')}
              >
                View Progress Reports
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Current Students */}
        <Grid item xs={12} md={8}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Current Students
            </Typography>
            <List>
              {currentStudents.map((student, index) => (
                <React.Fragment key={student.id}>
                  {index > 0 && <Divider />}
                  <ListItem>
                    <ListItemText
                      primary={student.name}
                      secondary={`${student.currentBook} - Page ${student.currentPage}`}
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        onClick={() => console.log('Start session with', student.name)}
                      >
                        <PlayIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Teaching Stats */}
        <Grid item xs={12}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Teaching Statistics
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Total Sessions
                    </Typography>
                    <Typography variant="h5">48</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Active Students
                    </Typography>
                    <Typography variant="h5">12</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Average Progress
                    </Typography>
                    <Typography variant="h5">85%</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default IqraTeaching;
