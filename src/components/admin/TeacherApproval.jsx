import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Paper,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import { CheckCircle as ApproveIcon, Cancel as RejectIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

const TeacherApproval = () => {
  const [pendingTeachers, setPendingTeachers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPendingTeachers = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'users'),
        where('role', '==', 'teacher'),
        where('status', '==', 'pending')
      );
      const querySnapshot = await getDocs(q);
      const teachers = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPendingTeachers(teachers);
    } catch (error) {
      console.error('Error fetching pending teachers:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPendingTeachers();
  }, []);

  const handleApprove = async (teacherId) => {
    try {
      const teacherRef = doc(db, 'users', teacherId);
      await updateDoc(teacherRef, {
        status: 'active',
        approvedAt: new Date().toISOString()
      });
      // Refresh the list
      fetchPendingTeachers();
    } catch (error) {
      console.error('Error approving teacher:', error);
    }
  };

  const handleReject = async (teacherId) => {
    try {
      const teacherRef = doc(db, 'users', teacherId);
      await updateDoc(teacherRef, {
        status: 'rejected',
        rejectedAt: new Date().toISOString()
      });
      // Refresh the list
      fetchPendingTeachers();
    } catch (error) {
      console.error('Error rejecting teacher:', error);
    }
  };

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" component="h2">
            Pending Teacher Approvals
          </Typography>
          <Tooltip title="Refresh list">
            <span>
              <IconButton onClick={fetchPendingTeachers} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Email</TableCell>
                <TableCell>Created At</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pendingTeachers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    {loading ? 'Loading...' : 'No pending teacher approvals'}
                  </TableCell>
                </TableRow>
              ) : (
                pendingTeachers.map((teacher) => (
                  <TableRow key={teacher.id}>
                    <TableCell>{teacher.email}</TableCell>
                    <TableCell>
                      {new Date(teacher.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={teacher.status.toUpperCase()}
                        color="warning"
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Approve">
                        <span>
                          <IconButton
                            color="success"
                            onClick={() => handleApprove(teacher.id)}
                          >
                            <ApproveIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Reject">
                        <span>
                          <IconButton
                            color="error"
                            onClick={() => handleReject(teacher.id)}
                          >
                            <RejectIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};

export default TeacherApproval;
