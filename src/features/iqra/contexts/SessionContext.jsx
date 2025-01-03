import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { db } from '../../../config/firebase';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';

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

      // Combine class and course data
      const combinedData = {
        ...classData,
        id: classId,
        course: {
          id: classData.courseId,
          ...courseData
        }
      };

      setActiveClass(combinedData);
      return combinedData;
    } catch (error) {
      console.error('Error loading class data:', error);
      throw error;
    }
  };

  // Start a new teaching session
  const startSession = async (classId, bookId, initialPage = 1) => {
    try {
      // Load class and course data first
      const classData = await loadClassData(classId);
      
      if (!classData.course?.iqraBooks?.includes(bookId)) {
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

      const sessionData = {
        teacherId: currentUser.uid,
        classId,
        date: new Date().toISOString(),
        startTime: new Date().toLocaleTimeString(),
        book: bookId,
        startPage: initialPage,
        currentPage: initialPage,
        endPage: initialPage,
        status: 'active',
        studentProgress,
        groupMode: true // Indicates this is a class-wide session
      };

      // Create new session document
      const sessionRef = doc(collection(db, 'sessions'));
      await setDoc(sessionRef, sessionData);

      const session = {
        id: sessionRef.id,
        ...sessionData,
        classData: classData
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

  const endSession = async (feedback) => {
    if (!activeSession) {
      throw new Error('No active session');
    }

    try {
      const sessionRef = doc(db, 'sessions', activeSession.id);
      
      // Generate a readable session ID
      const sessionId = `${activeSession.book}-${new Date().toISOString().split('T')[0]}-${activeSession.id.slice(-6)}`;
      
      // Update session with end time, status and feedback
      await updateDoc(sessionRef, {
        endTime: new Date().toISOString(),
        status: 'completed',
        sessionId,
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
