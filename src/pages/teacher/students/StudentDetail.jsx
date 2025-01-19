import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Avatar,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Button
} from '@mui/material';
import {
  School as SchoolIcon,
  AccessTime as AccessTimeIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import { db } from '../../../config/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { format, formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const StudentDetail = () => {
  const { studentId } = useParams();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState(null);
  const [classes, setClasses] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser && studentId) {
      const fetchData = async () => {
        try {
          setLoading(true);
          
          // Get student data
          const studentDoc = await getDoc(doc(db, 'users', studentId));
          if (!studentDoc.exists()) {
            throw new Error('Student not found');
          }
          setStudent({ id: studentDoc.id, ...studentDoc.data() });

          // Get student's sessions
          const sessionsQuery = query(
            collection(db, 'sessions'),
            where('studentIds', 'array-contains', studentId),
            where('teacherId', '==', currentUser.uid)
          );
          const sessionsSnapshot = await getDocs(sessionsQuery);
          const sessionsData = sessionsSnapshot.docs.map(doc => {
            const session = doc.data();
            let sessionDate = null;
            let startTime = null;
            let endTime = null;

            // Handle date fields
            if (session.date) {
              if (typeof session.date.toDate === 'function') {
                sessionDate = session.date.toDate();
              } else if (session.date._seconds) {
                sessionDate = new Date(session.date._seconds * 1000);
              } else if (typeof session.date === 'string') {
                sessionDate = new Date(session.date);
              }
            }

            if (session.startTime) {
              if (typeof session.startTime.toDate === 'function') {
                startTime = session.startTime.toDate();
              } else if (session.startTime._seconds) {
                startTime = new Date(session.startTime._seconds * 1000);
              } else {
                startTime = sessionDate; // Fall back to session date
              }
            }

            if (session.endTime) {
              if (typeof session.endTime.toDate === 'function') {
                endTime = session.endTime.toDate();
              } else if (session.endTime._seconds) {
                endTime = new Date(session.endTime._seconds * 1000);
              }
            }

            // Ensure we have valid dates
            sessionDate = sessionDate || new Date();
            startTime = startTime || sessionDate;
            endTime = endTime || (session.status === 'completed' ? startTime : new Date());

            return {
              id: doc.id,
              ...session,
              date: sessionDate,
              startTime,
              endTime,
              progress: session.studentProgress?.[studentId] || null
            };
          }).sort((a, b) => b.date.getTime() - a.date.getTime());

          setSessions(sessionsData);

          // Get student's classes
          const classesQuery = query(
            collection(db, 'classes'),
            where('studentIds', 'array-contains', studentId),
            where('teacherId', '==', currentUser.uid)
          );
          const classesSnapshot = await getDocs(classesQuery);
          const classesData = classesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setClasses(classesData);

          setLoading(false);
        } catch (error) {
          console.error('Error fetching data:', error);
          setError(error.message);
          setLoading(false);
        }
      };

      fetchData();
    }
  }, [currentUser, studentId]);

  // Calculate statistics
  const activeSessions = sessions.filter(session => session.status === 'active');
  const completedSessions = sessions.filter(session => session.status === 'completed');
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentSessions = sessions.filter(session => 
    session.status === 'completed' && session.date >= oneWeekAgo
  );

  const totalSessions = sessions.length;
  const averageProgress = completedSessions.reduce((acc, session) => {
    if (session.progress?.assessment) {
      const total = (
        session.progress.assessment.reading +
        session.progress.assessment.pronunciation +
        session.progress.assessment.memorization
      ) / 3;
      return acc + total;
    }
    return acc;
  }, 0) / (completedSessions.length || 1);

  const totalHours = completedSessions.reduce((acc, session) => {
    if (session.startTime && session.endTime) {
      return acc + (session.endTime.getTime() - session.startTime.getTime()) / (1000 * 60 * 60);
    }
    return acc;
  }, 0);

  const completionRate = completedSessions.length > 0 
    ? (completedSessions.length / totalSessions) * 100 
    : 0;

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!student) {
    return (
      <Box textAlign="center" py={4}>
        <Typography variant="h6" color="text.secondary">
          Student not found
        </Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Student Header */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" alignItems="center" mb={3}>
          <Avatar
            src={student.photoURL}
            alt={student.name}
            sx={{ width: 80, height: 80, mr: 3 }}
          />
          <Box>
            <Typography variant="h4" gutterBottom>
              {student.name}
            </Typography>
            <Box display="flex" gap={1}>
              {classes.map((cls) => (
                <Chip
                  key={cls.id}
                  icon={<SchoolIcon />}
                  label={cls.name}
                  variant="outlined"
                />
              ))}
            </Box>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Statistics */}
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Total Sessions
              </Typography>
              <Typography variant="h4">
                {totalSessions}
              </Typography>
              {activeSessions.length > 0 && (
                <Typography variant="body2" color="success.main">
                  {activeSessions.length} Active
                </Typography>
              )}
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Average Progress
              </Typography>
              <Typography variant="h4">
                {Math.round(averageProgress)}%
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Total Hours
              </Typography>
              <Typography variant="h4">
                {Math.round(totalHours * 10) / 10}h
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Completion Rate
              </Typography>
              <Typography variant="h4">
                {Math.round(completionRate)}%
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Active Sessions */}
      {activeSessions.length > 0 && (
        <Paper sx={{ p: 3, mb: 3, bgcolor: 'success.light' }}>
          <Typography variant="h6" gutterBottom color="white">
            Active Sessions
          </Typography>
          <Box>
            {activeSessions.map((session) => (
              <Box
                key={session.id}
                sx={{
                  p: 2,
                  mb: 2,
                  borderRadius: 1,
                  bgcolor: 'background.paper',
                  '&:last-child': { mb: 0 }
                }}
              >
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="subtitle1">
                      Started {formatDistanceToNow(session.startTime, { addSuffix: true })}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Current Page: {session.currentPage}
                    </Typography>
                  </Box>
                  <Button 
                    variant="contained" 
                    color="primary"
                    onClick={() => navigate(`/session/${session.id}`)}
                  >
                    Join Session
                  </Button>
                </Box>
              </Box>
            ))}
          </Box>
        </Paper>
      )}

      {/* Recent Sessions */}
      {recentSessions.length > 0 && (
        <Paper sx={{ p: 3, mb: 3, bgcolor: 'info.light' }}>
          <Typography variant="h6" gutterBottom color="white">
            Recent Sessions
          </Typography>
          <Box>
            {recentSessions.map((session) => (
              <Box
                key={session.id}
                sx={{
                  p: 2,
                  mb: 2,
                  borderRadius: 1,
                  bgcolor: 'background.paper',
                  '&:last-child': { mb: 0 }
                }}
              >
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="subtitle1">
                      {format(session.date, 'PPP')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Duration: {session.startTime && session.endTime 
                        ? Math.round((session.endTime.getTime() - session.startTime.getTime()) / (1000 * 60)) 
                        : 0} minutes
                    </Typography>
                  </Box>
                  {session.progress?.assessment && (
                    <Box textAlign="right">
                      <Typography variant="h6">
                        {Math.round((
                          (session.progress.assessment.reading || 0) +
                          (session.progress.assessment.pronunciation || 0) +
                          (session.progress.assessment.memorization || 0)
                        ) / 3)}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Average Score
                      </Typography>
                    </Box>
                  )}
                </Box>
                {session.feedback && (
                  <Box mt={2}>
                    <Typography variant="body2" color="text.secondary">
                      Feedback
                    </Typography>
                    <Typography variant="body1">
                      {session.feedback}
                    </Typography>
                  </Box>
                )}
              </Box>
            ))}
          </Box>
        </Paper>
      )}

      {/* All Sessions Timeline */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          All Sessions
        </Typography>
        
        {sessions.length === 0 ? (
          <Box textAlign="center" py={4}>
            <Typography variant="body1" color="text.secondary">
              No sessions found
            </Typography>
          </Box>
        ) : (
          <Box>
            {sessions.map((session) => (
              <Box
                key={session.id}
                sx={{
                  p: 2,
                  mb: 2,
                  borderRadius: 1,
                  bgcolor: 'background.default',
                  '&:last-child': { mb: 0 }
                }}
              >
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="subtitle1">
                      {session.date ? format(session.date, 'PPP') : 'Date not available'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {session.status === 'completed' ? 'Completed' : 'Active'}
                    </Typography>
                    {session.currentPage && (
                      <Typography variant="body2" color="text.secondary">
                        Page {session.currentPage}
                      </Typography>
                    )}
                  </Box>
                  {session.progress?.assessment && (
                    <Box textAlign="right">
                      <Box display="flex" gap={2}>
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Reading
                          </Typography>
                          <Typography variant="body1">
                            {session.progress.assessment.reading || 0}%
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Pronunciation
                          </Typography>
                          <Typography variant="body1">
                            {session.progress.assessment.pronunciation || 0}%
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Memorization
                          </Typography>
                          <Typography variant="body1">
                            {session.progress.assessment.memorization || 0}%
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  )}
                </Box>
                {session.feedback && (
                  <Box mt={2}>
                    <Typography variant="body2" color="text.secondary">
                      Feedback
                    </Typography>
                    <Typography variant="body1">
                      {session.feedback}
                    </Typography>
                  </Box>
                )}
              </Box>
            ))}
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default StudentDetail;
