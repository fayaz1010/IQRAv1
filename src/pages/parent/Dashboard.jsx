import { useState, useEffect } from 'react';
import { Box, Container, Grid, Paper, Typography, Tabs, Tab } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import DashboardStats from '../../components/dashboard/DashboardStats';

// Components for each section
const ChildProgress = ({ childId }) => (
  <Paper sx={{ p: 3, height: '100%' }}>
    <Typography variant="h6" gutterBottom>Learning Progress</Typography>
    {/* Add child's learning progress content */}
  </Paper>
);

const ChildClasses = ({ childId }) => (
  <Paper sx={{ p: 3, height: '100%' }}>
    <Typography variant="h6" gutterBottom>Today's Classes</Typography>
    {/* Add child's classes content */}
  </Paper>
);

const ChildActivities = ({ childId }) => (
  <Paper sx={{ p: 3, height: '100%' }}>
    <Typography variant="h6" gutterBottom>Recent Activities</Typography>
    {/* Add child's activities content */}
  </Paper>
);

const TeacherMessages = ({ childId }) => (
  <Paper sx={{ p: 3, height: '100%' }}>
    <Typography variant="h6" gutterBottom>Teacher Messages</Typography>
    {/* Add teacher messages content */}
  </Paper>
);

const ParentDashboard = () => {
  const { currentUser } = useAuth();
  const [selectedChild, setSelectedChild] = useState(0);
  const [children, setChildren] = useState([]);

  useEffect(() => {
    // TODO: Fetch children data from Firebase
    // This is placeholder data
    setChildren([
      { id: 1, name: 'Child 1' },
      { id: 2, name: 'Child 2' },
    ]);
  }, []);

  const handleChildChange = (event, newValue) => {
    setSelectedChild(newValue);
  };

  return (
    <Box
      component="main"
      sx={{
        flexGrow: 1,
        py: 4
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <DashboardStats isParent />
          </Grid>

          <Grid item xs={12}>
            <Paper sx={{ mb: 3 }}>
              <Tabs
                value={selectedChild}
                onChange={handleChildChange}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ borderBottom: 1, borderColor: 'divider' }}
              >
                {children.map((child, index) => (
                  <Tab key={child.id} label={child.name} />
                ))}
              </Tabs>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <ChildProgress childId={children[selectedChild]?.id} />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <ChildClasses childId={children[selectedChild]?.id} />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <ChildActivities childId={children[selectedChild]?.id} />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TeacherMessages childId={children[selectedChild]?.id} />
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default ParentDashboard;
