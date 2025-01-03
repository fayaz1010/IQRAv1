import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Tabs,
  Tab,
  IconButton,
  Chip,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  Rating
} from '@mui/material';
import {
  Search as SearchIcon,
  Event as EventIcon,
  Book as BookIcon,
  Group as GroupIcon,
  Assessment as AssessmentIcon,
  Image as ImageIcon,
  Videocam as VideoIcon,
  NavigateNext,
  NavigateBefore,
  ExpandMore,
  ExpandLess
} from '@mui/icons-material';
import { format } from 'date-fns';
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../../firebase';

// Tab Panel Component
const TabPanel = ({ children, value, index, ...other }) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`session-history-tabpanel-${index}`}
    {...other}
  >
    {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
  </div>
);

const SessionHistory = ({ classId }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSession, setSelectedSession] = useState(null);
  const [expandedCards, setExpandedCards] = useState({});

  useEffect(() => {
    loadSessions();
  }, [classId]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const sessionsRef = collection(db, 'sessions');
      const q = query(
        sessionsRef,
        where('classId', '==', classId),
        orderBy('startTime', 'desc'),
        limit(50)
      );

      const querySnapshot = await getDocs(q);
      const sessionData = [];
      querySnapshot.forEach((doc) => {
        sessionData.push({ id: doc.id, ...doc.data() });
      });

      setSessions(sessionData);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSessionDetails = async (session) => {
    try {
      // Load attendee details
      const attendeePromises = session.attendees.map(async (attendee) => {
        const userDoc = await getDoc(doc(db, 'users', attendee.id));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          return {
            ...attendee,
            displayName: userData.displayName || 'Unnamed Student',
            photoURL: userData.photoURL,
            email: userData.email,
            role: userData.role,
            phoneNumber: userData.phoneNumber,
          };
        }
        return attendee;
      });

      const attendees = await Promise.all(attendeePromises);
      return {
        ...session,
        attendees
      };
    } catch (error) {
      console.error('Error loading session details:', error);
      return session;
    }
  };

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
  };

  const filteredSessions = sessions.filter(session => {
    const searchLower = searchTerm.toLowerCase();
    return (
      session.book?.toLowerCase().includes(searchLower) ||
      session.feedback?.classNotes?.toLowerCase().includes(searchLower) ||
      session.attendees?.some(a => a.name.toLowerCase().includes(searchLower))
    );
  });

  const handleExpandCard = (sessionId) => {
    setExpandedCards(prev => ({
      ...prev,
      [sessionId]: !prev[sessionId]
    }));
  };

  const renderSessionCard = async (session) => {
    const sessionWithDetails = await loadSessionDetails(session);
    const isExpanded = expandedCards[session.id];
    const startTime = new Date(sessionWithDetails.startTime);
    const endTime = sessionWithDetails.endTime ? new Date(sessionWithDetails.endTime) : null;
    const duration = endTime 
      ? Math.round((endTime - startTime) / (1000 * 60))
      : null;

    return (
      <Card 
        key={sessionWithDetails.id} 
        sx={{ 
          mb: 2,
          '&:hover': {
            boxShadow: 3
          }
        }}
      >
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              {sessionWithDetails.book} - Page {sessionWithDetails.startPage} to {sessionWithDetails.endPage}
            </Typography>
            <IconButton onClick={() => handleExpandCard(sessionWithDetails.id)}>
              {isExpanded ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Box>

          <Box display="flex" gap={1} mb={2}>
            <Chip 
              icon={<EventIcon />} 
              label={format(startTime, 'PPp')}
              variant="outlined"
            />
            {duration && (
              <Chip 
                icon={<EventIcon />} 
                label={`${duration} minutes`}
                variant="outlined"
              />
            )}
            <Chip 
              icon={<GroupIcon />} 
              label={`${sessionWithDetails.attendees?.length || 0} students`}
              variant="outlined"
            />
          </Box>

          {isExpanded && (
            <>
              <Divider sx={{ my: 2 }} />
              
              {/* Materials Section */}
              <Typography variant="subtitle1" gutterBottom>
                Materials
              </Typography>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}>
                  <Paper variant="outlined" sx={{ p: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      <ImageIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                      {sessionWithDetails.materials?.drawings?.length || 0} Drawings
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper variant="outlined" sx={{ p: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      <VideoIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                      {sessionWithDetails.materials?.recordings?.length || 0} Recordings
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              {/* Attendees Section */}
              <Typography variant="subtitle1" gutterBottom>
                Attendees
              </Typography>
              {renderAttendeeList(sessionWithDetails.attendees)}

              {/* Feedback Section */}
              {sessionWithDetails.feedback?.classNotes && (
                <>
                  <Typography variant="subtitle1" gutterBottom>
                    Class Notes
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                    <Typography variant="body2">
                      {sessionWithDetails.feedback.classNotes}
                    </Typography>
                  </Paper>
                </>
              )}

              <Box display="flex" justifyContent="flex-end">
                <Button
                  variant="outlined"
                  onClick={() => setSelectedSession(sessionWithDetails)}
                >
                  View Full Details
                </Button>
              </Box>
            </>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderAttendeeList = (attendees) => (
    <List dense>
      {attendees.map((attendee) => (
        <ListItem key={attendee.id}>
          <ListItemAvatar>
            <Avatar src={attendee.photoURL} alt={attendee.displayName}>
              {attendee.displayName?.charAt(0)}
            </Avatar>
          </ListItemAvatar>
          <ListItemText
            primary={attendee.displayName}
            secondary={
              <Box>
                <Typography variant="body2" color="text.secondary">
                  {attendee.email}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Progress: Page {attendee.startPage} → {attendee.endPage}
                </Typography>
              </Box>
            }
          />
        </ListItem>
      ))}
    </List>
  );

  return (
    <Box>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab icon={<EventIcon />} label="Recent Sessions" />
          <Tab icon={<AssessmentIcon />} label="Progress" />
          <Tab icon={<BookIcon />} label="Books" />
        </Tabs>
      </Box>

      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search sessions..."
          value={searchTerm}
          onChange={handleSearch}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      <TabPanel value={activeTab} index={0}>
        {filteredSessions.map(renderSessionCard)}
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        <Typography>Progress tracking coming soon...</Typography>
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        <Typography>Book progress coming soon...</Typography>
      </TabPanel>

      {/* Session Details Dialog */}
      <Dialog
        open={!!selectedSession}
        onClose={() => setSelectedSession(null)}
        maxWidth="md"
        fullWidth
      >
        {selectedSession && (
          <>
            <DialogTitle>
              Session Details - {format(new Date(selectedSession.startTime), 'PPp')}
            </DialogTitle>
            <DialogContent>
              <Typography>Detailed view coming soon...</Typography>
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default SessionHistory;
