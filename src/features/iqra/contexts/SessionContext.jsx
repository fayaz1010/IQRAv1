import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { db } from '../../../config/firebase';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { createGoogleMeet, deleteGoogleMeet } from '../../../config/googleMeet';

export const SessionContext = createContext(null);

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}

export function SessionProvider({ children }) {
  const { currentUser } = useAuth();
  const [activeSession, setActiveSession] = useState(null);
  const [activeClass, setActiveClass] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Set loading to false when component mounts
    setLoading(false);
  }, []);

  const loadClassData = async (classId) => {
    try {
      // Get class data
      const classRef = doc(db, 'classes', classId);
      const classDoc = await getDoc(classRef);
      
      if (!classDoc.exists()) {
        throw new Error('Class not found');
      }

      const classData = classDoc.data();

      // Get course data
      const courseRef = doc(db, 'courses', classData.courseId);
      const courseDoc = await getDoc(courseRef);
      
      if (!courseDoc.exists()) {
        throw new Error('Course not found');
      }

      const courseData = courseDoc.data();

      // Load student data
      let students = [];
      if (classData.studentIds?.length > 0) {
        const studentPromises = classData.studentIds.map(async (studentId) => {
          try {
            const studentRef = doc(db, 'users', studentId);
            const studentDoc = await getDoc(studentRef);
            if (studentDoc.exists()) {
              return {
                id: studentId,
                ...studentDoc.data()
              };
            }
          } catch (err) {
            console.error(`Error loading student ${studentId}:`, err);
          }
          return null;
        });
        
        const studentResults = await Promise.all(studentPromises);
        students = studentResults.filter(s => s !== null);
      }

      // Combine class and course data
      const combinedData = {
        ...classData,
        id: classId,
        course: {
          id: classData.courseId,
          ...courseData
        },
        students,
        studentIds: classData.studentIds || [] // Keep the original studentIds array
      };

      setActiveClass(combinedData);
      return combinedData;
    } catch (error) {
      console.error('Error loading class data:', error);
      setError(error.message);
      throw error;
    }
  };

  // Start a new teaching session
  const startSession = async (classId, bookId, initialPage = 1) => {
    try {
      setError(null);
      // Load class and course data first
      const classData = await loadClassData(classId);
      
      if (!classData?.course?.iqraBooks?.includes(bookId)) {
        throw new Error('Selected book is not in the course');
      }

      const studentProgress = {};

      // Initialize progress for all students in the class
      (classData.studentIds || []).forEach(studentId => {
        studentProgress[studentId] = {
          currentPage: initialPage,
          drawings: {},
          notes: {},
          assessment: {
            reading: 0,
            pronunciation: 0,
            memorization: 0
          }
        };
      });

      let meetData = null;
      // Try to create Google Meet, but don't block session creation if it fails
      try {
        const studentEmails = classData.students?.map(student => student.email) || [];
        const meetTitle = `${classData.name} - Iqra Session`;
        const meetResponse = await createGoogleMeet(
          meetTitle,
          new Date().toISOString(),
          60,
          studentEmails
        );
        meetData = {
          link: meetResponse.meetLink,
          eventId: meetResponse.eventId,
          startTime: meetResponse.startTime,
          endTime: meetResponse.endTime
        };
      } catch (meetError) {
        console.warn('Failed to create Google Meet:', meetError);
        // Continue without Meet integration
      }

      const sessionData = {
        teacherId: currentUser.uid,
        classId,
        date: new Date().toISOString(),
        startTime: new Date().toLocaleTimeString(),
        book: bookId,
        startPage: initialPage,
        currentPage: initialPage,
        studentProgress,
        status: 'active',
        ...(meetData && { meet: meetData }) // Only include meet data if available
      };

      // Create new session document
      const sessionRef = doc(collection(db, 'sessions'));
      await setDoc(sessionRef, sessionData);

      const session = {
        id: sessionRef.id,
        ...sessionData,
        classData
      };

      setActiveSession(session);
      return session;
    } catch (error) {
      console.error('Error starting session:', error);
      setError(error.message);
      throw error;
    }
  };

  // Update page for the entire class
  const updateClassProgress = async (pageNumber) => {
    if (!activeSession) {
      throw new Error('No active session');
    }

    try {
      const sessionRef = doc(db, 'sessions', activeSession.id);
      await updateDoc(sessionRef, {
        currentPage: pageNumber,
        endPage: pageNumber,
        'studentProgress': activeSession.studentProgress
      });

      setActiveSession(prev => ({
        ...prev,
        currentPage: pageNumber,
        endPage: pageNumber
      }));
    } catch (error) {
      console.error('Error updating class progress:', error);
      throw error;
    }
  };

  const saveDrawing = async (studentId, pageNumber, lines) => {
    if (!activeSession) {
      throw new Error('No active session');
    }

    try {
      const sessionRef = doc(db, 'sessions', activeSession.id);
      const drawingPath = `studentProgress.${studentId}.drawings.${pageNumber}`;
      
      await updateDoc(sessionRef, {
        [drawingPath]: lines
      });

      setActiveSession(prev => ({
        ...prev,
        studentProgress: {
          ...prev.studentProgress,
          [studentId]: {
            ...prev.studentProgress[studentId],
            drawings: {
              ...prev.studentProgress[studentId].drawings,
              [pageNumber]: lines
            }
          }
        }
      }));
    } catch (error) {
      console.error('Error saving drawing:', error);
      throw error;
    }
  };

  // End the current teaching session
  const endSession = async (feedback) => {
    if (!activeSession) {
      throw new Error('No active session');
    }

    try {
      const sessionRef = doc(db, 'sessions', activeSession.id);
      
      // Generate a readable session ID
      const sessionId = `${activeSession.book}-${new Date().toISOString().split('T')[0]}-${activeSession.id.slice(-6)}`;
      
      // Try to delete Google Meet event if it exists
      if (activeSession.meet?.eventId) {
        try {
          await deleteGoogleMeet(activeSession.meet.eventId);
        } catch (meetError) {
          console.error('Failed to delete Google Meet:', meetError);
          // Continue with session end even if Meet deletion fails
        }
      }

      // Update session with end time, status and feedback
      await updateDoc(sessionRef, {
        status: 'completed',
        endTime: new Date().toISOString(),
        sessionId,
        endPage: activeSession.currentPage,
        feedback: {
          classNotes: feedback.classNotes,
          studentFeedback: Object.entries(feedback.studentFeedback).reduce((acc, [studentId, data]) => {
            acc[studentId] = {
              ...data,
              pageNotes: data.pageNotes || {}, // Store page-specific feedback
              assessment: {
                reading: data.assessment?.reading || 0,
                pronunciation: data.assessment?.pronunciation || 0,
                memorization: data.assessment?.memorization || 0
              },
              areasOfImprovement: data.areasOfImprovement || [],
              strengths: data.strengths || [],
              notes: data.notes || ''
            };
            return acc;
          }, {})
        }
      });

      // Update student progress in the class document
      const classRef = doc(db, 'classes', activeSession.classId);
      const classDoc = await getDoc(classRef);
      
      if (classDoc.exists()) {
        const classData = classDoc.data();
        const updatedProgress = { ...classData.studentProgress };

        // Update each student's progress
        Object.entries(feedback.studentFeedback).forEach(([studentId, data]) => {
          if (!updatedProgress[studentId]) {
            updatedProgress[studentId] = {
              sessions: [],
              assessments: []
            };
          }

          // Add session assessment with page-specific notes
          updatedProgress[studentId].assessments.push({
            sessionId,
            date: new Date().toISOString(),
            book: activeSession.book,
            startPage: activeSession.startPage,
            endPage: activeSession.currentPage,
            assessment: data.assessment,
            pageNotes: data.pageNotes || {}, // Include page-specific notes
            areasOfImprovement: data.areasOfImprovement,
            strengths: data.strengths,
            notes: data.notes
          });

          // Add session reference
          updatedProgress[studentId].sessions.push({
            sessionId,
            date: new Date().toISOString(),
            book: activeSession.book,
            startPage: activeSession.startPage,
            endPage: activeSession.currentPage
          });
        });

        // Update class document
        await updateDoc(classRef, {
          studentProgress: updatedProgress
        });
      }

      // Clear active session
      setActiveSession(null);
      setActiveClass(null);
    } catch (error) {
      console.error('Error ending session:', error);
      setError(error.message);
      throw error;
    }
  };

  const value = {
    activeSession,
    activeClass,
    startSession,
    updateClassProgress,
    saveDrawing,
    endSession,
    loading,
    error
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}
