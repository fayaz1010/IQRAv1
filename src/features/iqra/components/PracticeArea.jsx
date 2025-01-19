import React, { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useSession } from '../contexts/SessionContext';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Alert,
  Avatar,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';
import { Refresh as RefreshIcon, Add as AddIcon } from '@mui/icons-material';
import DrawingCanvas from './DrawingCanvas';

const PracticeArea = ({ 
  activeSession, 
  selectedStudent, 
  onlineStudents, 
  classData 
}) => {
  const { currentUser } = useAuth();
  const [currentTab, setCurrentTab] = useState(0);
  const [saveStatus, setSaveStatus] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [openNewPage, setOpenNewPage] = useState(false);
  const [newPageNumber, setNewPageNumber] = useState('');
  const [canvasKey, setCanvasKey] = useState(0);
  const { saveDrawing, loadSessionDrawings, updateSessionPage } = useSession();

  const isTeacher = currentUser?.role === 'teacher';
  const students = classData?.students || [];
  const currentPage = activeSession?.currentPage;

  // Get student progress from session
  const getStudentProgress = (studentId) => {
    return activeSession?.studentProgress?.[studentId] || {};
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  // Get current student's drawing data
  const getCurrentDrawing = () => {
    const studentId = students[currentTab]?.id;
    if (!studentId || !activeSession) return null;
    
    // Get drawing from session's drawings collection
    const studentDrawings = activeSession.drawings?.[studentId] || {};
    const pageDrawing = studentDrawings[currentPage];
    
    if (pageDrawing?.lines) {
      console.log('Found drawing for student:', studentId, 'page:', currentPage, 'lines:', pageDrawing.lines);
      // Validate the drawing data
      const validLines = pageDrawing.lines.filter(line => 
        line && 
        Array.isArray(line.points) && 
        line.points.length >= 2 &&
        typeof line.color === 'string' &&
        typeof line.strokeWidth === 'number'
      );
      console.log('Valid lines:', validLines.length, 'of', pageDrawing.lines.length);
      return validLines;
    }
    
    console.log('No drawing found for student:', studentId, 'page:', currentPage, 'available pages:', Object.keys(studentDrawings));
    return null;
  };

  // Handle drawing save
  const handleSaveDrawing = async (studentId, drawingData) => {
    if (!activeSession || !currentPage) return;

    try {
      setSaveStatus('saving');
      console.log('Saving drawing for student:', studentId, 'page:', currentPage, 'data:', drawingData);
      await saveDrawing(studentId, currentPage, drawingData);
      
      // Force refresh drawings after save
      await loadSessionDrawings(activeSession.id, true);
      
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(''), 2000);
    } catch (error) {
      console.error('Error saving drawing:', error);
      setSaveStatus('error');
      setError('Failed to save drawing');
    }
  };

  // Handle refresh drawings
  const handleRefreshDrawings = async () => {
    if (!activeSession) return;
    
    try {
      setLoading(true);
      setError(null);
      const drawings = await loadSessionDrawings(activeSession.id, true);
      console.log('Refreshed drawings:', drawings);
      // Force a re-render by updating the key
      setCanvasKey(prev => prev + 1);
    } catch (error) {
      console.error('Error refreshing drawings:', error);
      setError('Failed to refresh drawings');
    } finally {
      setLoading(false);
    }
  };

  // Handle new page dialog
  const handleOpenNewPage = () => {
    setNewPageNumber('');
    setOpenNewPage(true);
  };

  const handleCloseNewPage = () => {
    setOpenNewPage(false);
  };

  const handleAddNewPage = async () => {
    const page = parseInt(newPageNumber);
    if (isNaN(page) || page < 1) {
      setError('Please enter a valid page number');
      return;
    }

    try {
      setLoading(true);
      // First update the session's current page
      await updateSessionPage(page);
      
      // Then save any existing drawing if there is one
      const studentId = students[currentTab]?.id;
      const currentDrawing = getCurrentDrawing();
      if (studentId && currentDrawing) {
        await saveDrawing(studentId, page, currentDrawing);
      }
      
      setOpenNewPage(false);
      setError(null);
    } catch (error) {
      console.error('Error adding new page:', error);
      setError('Failed to add new page');
    } finally {
      setLoading(false);
    }
  };

  if (!activeSession) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100%">
        <Typography color="text.secondary">
          Start a session to enable practice area
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ 
        borderBottom: 1, 
        borderColor: 'divider',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="student tabs"
          sx={{ flex: 1 }}
        >
          {students.map((student, index) => {
            const progress = getStudentProgress(student.id);
            const isOnline = onlineStudents.some(s => s.id === student.id);
            
            return (
              <Tab
                key={student.id}
                label={
                  <Box display="flex" alignItems="center" gap={1}>
                    <Avatar
                      src={student.photoURL}
                      alt={student.displayName}
                      sx={{ 
                        width: 24, 
                        height: 24,
                        border: isOnline ? '2px solid #4caf50' : 'none'
                      }}
                    >
                      {student.displayName?.charAt(0)}
                    </Avatar>
                    <Typography>
                      {student.displayName}
                    </Typography>
                  </Box>
                }
                disabled={!isTeacher && student.id !== currentUser?.uid}
              />
            );
          })}
        </Tabs>
        
        <Box sx={{ display: 'flex', gap: 1, p: 1 }}>
          <Button
            startIcon={<RefreshIcon />}
            onClick={handleRefreshDrawings}
            disabled={loading}
          >
            Refresh Drawings
          </Button>
          <Button
            startIcon={<AddIcon />}
            onClick={handleOpenNewPage}
            disabled={loading}
          >
            Add Page
          </Button>
        </Box>
      </Box>

      <Box flex={1} position="relative">
        {students.map((student, index) => (
          <Box
            key={student.id}
            role="tabpanel"
            hidden={currentTab !== index}
            sx={{
              height: '100%',
              display: currentTab === index ? 'block' : 'none'
            }}
          >
            {currentTab === index && (
              <DrawingCanvas
                key={canvasKey}
                initialDrawing={getCurrentDrawing()}
                onSave={(drawingData) => handleSaveDrawing(student.id, drawingData)}
                readOnly={!isTeacher && student.id !== currentUser?.uid}
              />
            )}
          </Box>
        ))}
      </Box>

      {(saveStatus || error) && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 16,
            right: 16,
            zIndex: 1
          }}
        >
          <Alert 
            severity={error ? 'error' : (saveStatus === 'error' ? 'error' : 'success')}
            variant="filled"
            onClose={() => {
              setError(null);
              setSaveStatus('');
            }}
          >
            {error || (
              saveStatus === 'saving' ? 'Saving drawing...' :
              saveStatus === 'saved' ? 'Drawing saved!' :
              saveStatus === 'error' ? 'Failed to save drawing' : ''
            )}
          </Alert>
        </Box>
      )}

      <Dialog open={openNewPage} onClose={handleCloseNewPage}>
        <DialogTitle>Add New Page</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Page Number"
            type="number"
            fullWidth
            value={newPageNumber}
            onChange={(e) => setNewPageNumber(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseNewPage}>Cancel</Button>
          <Button onClick={handleAddNewPage} variant="contained">Add</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PracticeArea;
