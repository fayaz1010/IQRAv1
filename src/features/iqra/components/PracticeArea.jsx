import React, { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useSession } from '../contexts/SessionContext';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Alert,
} from '@mui/material';
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
  const { saveDrawing } = useSession();

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

  // Handle drawing save
  const handleSaveDrawing = async (studentId, drawingData) => {
    if (!activeSession || !currentPage) return;

    try {
      setSaveStatus('saving');
      await saveDrawing(studentId, currentPage, drawingData);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(''), 2000);
    } catch (error) {
      console.error('Error saving drawing:', error);
      setSaveStatus('error');
      setError('Failed to save drawing');
    }
  };

  // Get current student's drawing data
  const getCurrentDrawing = () => {
    const studentId = students[currentTab]?.id;
    if (!studentId || !activeSession) return null;
    return getStudentProgress(studentId)?.drawings?.[currentPage];
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
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="student tabs"
        >
          {students.map((student, index) => {
            const progress = getStudentProgress(student.id);
            const isOnline = onlineStudents.some(s => s.id === student.id);
            
            return (
              <Tab
                key={student.id}
                label={
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography>
                      {student.name}
                    </Typography>
                    {isOnline && (
                      <Box
                        component="span"
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          bgcolor: 'success.main'
                        }}
                      />
                    )}
                  </Box>
                }
                disabled={!isTeacher && student.id !== currentUser?.uid}
              />
            );
          })}
        </Tabs>
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
                initialDrawing={getCurrentDrawing()}
                onSave={(drawingData) => handleSaveDrawing(student.id, drawingData)}
                readOnly={!isTeacher && student.id !== currentUser?.uid}
              />
            )}
          </Box>
        ))}
      </Box>

      {saveStatus && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 16,
            right: 16,
            zIndex: 1
          }}
        >
          <Alert 
            severity={saveStatus === 'error' ? 'error' : 'success'}
            variant="filled"
          >
            {saveStatus === 'saving' && 'Saving drawing...'}
            {saveStatus === 'saved' && 'Drawing saved!'}
            {saveStatus === 'error' && 'Failed to save drawing'}
          </Alert>
        </Box>
      )}
    </Box>
  );
};

export default PracticeArea;
