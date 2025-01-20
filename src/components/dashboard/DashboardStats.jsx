import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs, getFirestore, onSnapshot } from 'firebase/firestore';
import { 
  Box, 
  Grid, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemSecondaryAction, 
  Button, 
  Typography, 
  IconButton,
  Card,
  CardActionArea 
} from '@mui/material';
import StatsCard from './StatsCard';
import { useAuth } from '../../contexts/AuthContext';
import { useSession } from '../../features/iqra/contexts/SessionContext';
import { Close as CloseIcon, VideoCall as VideoCallIcon } from '@mui/icons-material';
import {
  People as UsersIcon,
  School as ClassesIcon,
  Assignment as AssignmentsIcon,
  AccessTime as TimeIcon,
  Pending as PendingIcon,
  CheckCircle as HealthIcon,
  TrendingUp as ProgressIcon,
  Group as StudentsIcon,
} from '@mui/icons-material';

const DashboardStats = () => {
  const [stats, setStats] = useState({
    activeUsers: 0,
    activeClasses: 0,
    pendingApprovals: 0,
    systemHealth: 'Good',
    progress: 0,
    classesToday: 0,
    nextClass: '',
    assignments: 0,
    totalStudents: 0,
    averageProgress: 0,
  });

  const [activeSessions, setActiveSessions] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { currentUser } = useAuth();
  const { joinSession } = useSession();
  const db = getFirestore();

  useEffect(() => {
    if (!currentUser) return;

    // Listen for active sessions
    const sessionsRef = collection(db, 'sessions');
    const activeSessionsQuery = query(
      sessionsRef,
      where('status', '==', 'active'),
      where('studentIds', 'array-contains', currentUser.uid)
    );

    const unsubscribe = onSnapshot(activeSessionsQuery, async (snapshot) => {
      console.log('Active sessions snapshot received:', snapshot.size);
      const sessions = [];
      for (const doc of snapshot.docs) {
        const sessionData = doc.data();
        // Get class details
        const classRef = collection(db, 'classes');
        const classDoc = await getDocs(query(classRef, where('id', '==', sessionData.classId)));
        if (!classDoc.empty) {
          const classData = classDoc.docs[0].data();
          sessions.push({
            id: doc.id,
            classId: sessionData.classId,
            className: classData.name,
            ...sessionData
          });
        }
      }
      console.log('Processed active sessions:', sessions);
      setActiveSessions(sessions);
      setStats(prev => ({ ...prev, activeClasses: sessions.length }));
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleJoinSession = async (session) => {
    try {
      await joinSession(session.id);
      
      // Open Google Meet if available
      if (session.meet?.link) {
        window.open(session.meet.link, '_blank');
      }
      setDialogOpen(false);
    } catch (error) {
      console.error('Error joining session:', error);
    }
  };

  const handleActiveClassesClick = useCallback(() => {
    console.log('Active classes card clicked');
    setDialogOpen(true);
  }, []);

  const handleCloseDialog = useCallback(() => {
    console.log('Dialog close clicked');
    setDialogOpen(false);
  }, []);

  // Student dashboard stats
  return (
    <>
      <Box sx={{ width: '100%' }}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Box
              onClick={handleActiveClassesClick}
              sx={{ 
                cursor: 'pointer',
                '&:hover': {
                  transform: 'scale(1.02)',
                  transition: 'transform 0.2s ease-in-out'
                }
              }}
            >
              <StatsCard
                title="Active Classes"
                value={stats.activeClasses}
                icon={<ClassesIcon />}
                color="#2196f3"
              />
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard
              title="Progress"
              value={stats.progress}
              icon={<ProgressIcon />}
              color="#4caf50"
              suffix="%"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard
              title="Classes Today"
              value={stats.classesToday}
              icon={<TimeIcon />}
              color="#ff9800"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard
              title="Assignments"
              value={stats.assignments}
              icon={<AssignmentsIcon />}
              color="#f44336"
            />
          </Grid>
        </Grid>
      </Box>

      <Dialog 
        open={dialogOpen} 
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        sx={{ 
          zIndex: 1500,
          '& .MuiDialog-paper': {
            margin: 2,
            maxHeight: 'calc(100% - 64px)'
          }
        }}
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Active Classes</Typography>
            <IconButton onClick={handleCloseDialog} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {activeSessions.length > 0 ? (
            <List>
              {activeSessions.map((session) => (
                <ListItem
                  key={session.id}
                  sx={{
                    mb: 1,
                    borderRadius: 1,
                    bgcolor: 'background.paper',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <ListItemText
                    primary={session.className}
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        {session.meet?.link && (
                          <Typography
                            variant="body2"
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.5,
                              color: 'primary.main'
                            }}
                          >
                            <VideoCallIcon fontSize="small" />
                            Meet Available
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => handleJoinSession(session)}
                      startIcon={<VideoCallIcon />}
                      size="small"
                    >
                      Join Now
                    </Button>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          ) : (
            <Box py={2} textAlign="center">
              <Typography color="text.secondary">
                No active classes at the moment
              </Typography>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DashboardStats;
