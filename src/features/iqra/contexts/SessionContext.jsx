import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { db } from '../../../config/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

export const SessionContext = createContext(null);

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}

export function SessionProvider({ children }) {
  const { user } = useAuth();
  const [activeSession, setActiveSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Set loading to false when component mounts
    setLoading(false);
  }, []);

  // Start a new teaching session
  const startSession = async (classId, bookId, initialPage = 1) => {
    try {
      const sessionData = {
        date: new Date().toISOString(),
        startTime: new Date().toLocaleTimeString(),
        book: bookId,
        startPage: initialPage,
        endPage: initialPage,
        studentProgress: {}
      };

      // Get class data to initialize student progress
      const classRef = doc(db, 'classes', classId);
      const classDoc = await getDoc(classRef);
      
      if (!classDoc.exists()) {
        throw new Error('Class not found');
      }

      const classData = classDoc.data();
      classData.students.forEach(studentId => {
        sessionData.studentProgress[studentId] = {
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

      // Create new session document
      const sessionRef = doc(classRef, 'sessions', new Date().toISOString());
      await setDoc(sessionRef, sessionData);

      setActiveSession({
        id: sessionRef.id,
        classId,
        ...sessionData
      });

      return sessionRef.id;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  // Save drawing for a student
  const saveDrawing = async (studentId, pageNumber, drawingData) => {
    if (!activeSession) {
      throw new Error('No active session');
    }

    try {
      const sessionRef = doc(db, 'classes', activeSession.classId, 'sessions', activeSession.id);
      await updateDoc(sessionRef, {
        [`studentProgress.${studentId}.drawings.${pageNumber}`]: drawingData
      });
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  // Update student progress
  const updateStudentProgress = async (studentId, pageNumber, assessmentData = null) => {
    if (!activeSession) {
      throw new Error('No active session');
    }

    try {
      const sessionRef = doc(db, 'classes', activeSession.classId, 'sessions', activeSession.id);
      const updates = {
        [`studentProgress.${studentId}.currentPage`]: pageNumber
      };

      if (assessmentData) {
        updates[`studentProgress.${studentId}.assessment`] = assessmentData;
      }

      await updateDoc(sessionRef, updates);

      // Update session end page if this is the furthest page
      if (pageNumber > activeSession.endPage) {
        await updateDoc(sessionRef, {
          endPage: pageNumber
        });
        setActiveSession(prev => ({
          ...prev,
          endPage: pageNumber
        }));
      }
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  // End the session
  const endSession = async () => {
    if (!activeSession) {
      throw new Error('No active session');
    }

    try {
      const sessionRef = doc(db, 'classes', activeSession.classId, 'sessions', activeSession.id);
      await updateDoc(sessionRef, {
        endTime: new Date().toLocaleTimeString()
      });
      setActiveSession(null);
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  const value = {
    activeSession,
    startSession,
    saveDrawing,
    updateStudentProgress,
    endSession,
    error,
    loading
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}
