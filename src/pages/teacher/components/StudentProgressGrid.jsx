import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Avatar,
  LinearProgress,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Tab,
  Tabs,
  useTheme
} from '@mui/material';
import {
  MoreVert as MoreIcon,
  CheckCircle as CompletedIcon,
  Schedule as PendingIcon,
  Warning as AttentionIcon
} from '@mui/icons-material';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../config/firebase';

const StudentCard = ({ student, classData, isActive }) => {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState(null);
  const [progress, setProgress] = useState({
    completed: 0,
    total: 100,
    status: 'on-track' // 'on-track', 'behind', 'ahead'
  });

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const progressQuery = query(
          collection(db, 'progress'),
          where('studentId', '==', student.id),
          where('classId', '==', classData.id)
        );
        const snapshot = await getDocs(progressQuery);
        if (!snapshot.empty) {
          const progressData = snapshot.docs[0].data();
          setProgress({
            completed: progressData.completed || 0,
            total: progressData.total || 100,
            status: progressData.status || 'on-track'
          });
        }
      } catch (error) {
        console.error('Error fetching student progress:', error);
      }
    };

    fetchProgress();
  }, [student.id, classData.id]);

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ahead':
        return theme.palette.success.main;
      case 'behind':
        return theme.palette.warning.main;
      default:
        return theme.palette.primary.main;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'ahead':
        return <CompletedIcon fontSize="small" />;
      case 'behind':
        return <AttentionIcon fontSize="small" />;
      default:
        return <PendingIcon fontSize="small" />;
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        backgroundColor: 'background.default',
        borderRadius: 2,
        border: isActive ? `1px solid ${theme.palette.primary.main}` : 'none'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Avatar
          src={student.photoURL}
          alt={student.name}
          sx={{ width: 40, height: 40, mr: 2 }}
        />
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="subtitle1">{student.name}</Typography>
          <Typography variant="body2" color="textSecondary">
            {classData.name}
          </Typography>
        </Box>
        <IconButton size="small" onClick={handleMenuClick}>
          <MoreIcon />
        </IconButton>
      </Box>

      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Typography variant="body2" color="textSecondary" sx={{ flexGrow: 1 }}>
            Progress
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {progress.completed}%
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={progress.completed}
          sx={{
            height: 6,
            borderRadius: 3,
            backgroundColor: theme.palette.grey[200],
            '& .MuiLinearProgress-bar': {
              backgroundColor: getStatusColor(progress.status)
            }
          }}
        />
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Chip
          icon={getStatusIcon(progress.status)}
          label={progress.status.replace('-', ' ')}
          size="small"
          sx={{
            backgroundColor: `${getStatusColor(progress.status)}20`,
            color: getStatusColor(progress.status),
            textTransform: 'capitalize'
          }}
        />
        {isActive && (
          <Chip
            label="In Class"
            size="small"
            color="primary"
            sx={{ ml: 1 }}
          />
        )}
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleMenuClose}>View Details</MenuItem>
        <MenuItem onClick={handleMenuClose}>Message Student</MenuItem>
        <MenuItem onClick={handleMenuClose}>View History</MenuItem>
      </Menu>
    </Paper>
  );
};

const StudentProgressGrid = ({ classes, activeSessions }) => {
  const [currentTab, setCurrentTab] = useState(0);
  const [students, setStudents] = useState([]);

  useEffect(() => {
    const fetchStudents = async () => {
      if (!classes?.length) return;

      try {
        const studentIds = new Set();
        classes.forEach(classData => {
          classData.studentIds?.forEach(id => studentIds.add(id));
        });

        const studentsQuery = query(
          collection(db, 'users'),
          where('uid', 'in', Array.from(studentIds))
        );
        const snapshot = await getDocs(studentsQuery);
        const studentsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setStudents(studentsData);
      } catch (error) {
        console.error('Error fetching students:', error);
      }
    };

    fetchStudents();
  }, [classes]);

  const activeStudentIds = new Set(
    activeSessions.flatMap(session => session.attendees || [])
  );

  return (
    <Box>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={currentTab}
          onChange={(_, newValue) => setCurrentTab(newValue)}
          variant="fullWidth"
        >
          <Tab label="All Students" />
          <Tab label="Active Now" />
          <Tab label="Needs Attention" />
        </Tabs>
      </Box>

      <Grid container spacing={2}>
        {students.map((student) => (
          <Grid item xs={12} sm={6} md={4} key={student.id}>
            <StudentCard
              student={student}
              classData={classes.find(c => c.studentIds?.includes(student.id))}
              isActive={activeStudentIds.has(student.id)}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default StudentProgressGrid;
