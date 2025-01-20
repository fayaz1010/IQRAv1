import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { db } from '../../../config/firebase';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, addDoc, arrayUnion } from 'firebase/firestore';
import { createGoogleMeet } from '../../../config/googleMeet';

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
      
      // Create Google Meet link with proper date formatting
      let meetData = null;
      try {
        const now = new Date();
        const startTime = now.toISOString();
        const endTime = new Date(now.getTime() + 60 * 60 * 1000).toISOString(); // 1 hour later
        
        const meetLink = await createGoogleMeet(
          `${classData.name} - Iqra Teaching Session`,
          startTime,
          endTime
        );
        
        if (meetLink) {
          meetData = {
            link: meetLink.link,
            eventId: meetLink.eventId,
            startTime: meetLink.startTime,
            endTime: meetLink.endTime
          };
        }
      } catch (meetError) {
        console.error('Failed to create Google Meet:', meetError);
        // Continue without meet if it fails
      }

      // Initialize student progress for all students
      const studentProgress = {};
      if (classData.studentIds) {
        classData.studentIds.forEach(studentId => {
          studentProgress[studentId] = {
            currentPage: initialPage,
            lastActive: null,
            status: 'pending'
          };
        });
      }

      // Create a new session document
      const sessionRef = collection(db, 'sessions');
      const sessionDoc = await addDoc(sessionRef, {
        classId,
        teacherId: currentUser.uid,
        startTime: new Date().toISOString(),
        status: 'active',
        book: bookId || classData.course.currentBook,
        currentPage: initialPage,
        attendees: [currentUser.uid],
        studentProgress, // Add initialized student progress
        studentStatus: {},
        meet: meetData,
        className: classData.name,
        courseId: classData.course.id
      });

      // Update class with active session
      const classRef = doc(db, 'classes', classId);
      await updateDoc(classRef, {
        activeSession: sessionDoc.id,
        'schedule.lastSession': {
          date: new Date().toISOString(),
          sessionId: sessionDoc.id,
          book: bookId || classData.course.currentBook,
          page: initialPage
        }
      });

      // Set the active session
      const newSession = {
        id: sessionDoc.id,
        classId,
        teacherId: currentUser.uid,
        startTime: new Date().toISOString(),
        status: 'active',
        book: bookId || classData.course.currentBook,
        currentPage: initialPage,
        attendees: [currentUser.uid],
        studentProgress, // Include student progress in session object
        studentStatus: {},
        meet: meetData,
        className: classData.name,
        courseId: classData.course.id
      };

      setActiveSession(newSession);
      return newSession;
    } catch (error) {
      console.error('Error starting session:', error);
      setError(error.message);
      throw error;
    }
  };

  // Update session activity timestamp
  const updateSessionActivity = async (sessionId) => {
    if (!sessionId) return;
    
    try {
      const sessionRef = doc(db, 'sessions', sessionId);
      await updateDoc(sessionRef, {
        lastActivity: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating session activity:', error);
    }
  };

  const createMeetLink = async () => {
    try {
      const startTime = new Date().toISOString();
      const endTime = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour from now
      
      console.log('Creating Google Meet for session...');
      const meetData = await createGoogleMeet(
        `Iqra Teaching Session - ${new Date().toLocaleDateString()}`,
        startTime,
        endTime
      );
      console.log('Meet created successfully:', meetData);
      
      return meetData;
    } catch (error) {
      console.error('Failed to create Google Meet - Full error:', error);
      throw new Error('Unexpected error creating Meet: ' + error.message);
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

  // Join an active session as a student
  const joinSession = async (sessionId) => {
    try {
      setError(null);
      
      const sessionRef = doc(db, 'sessions', sessionId);
      const sessionDoc = await getDoc(sessionRef);
      
      if (!sessionDoc.exists()) {
        throw new Error('Session not found');
      }
      
      const sessionData = sessionDoc.data();
      
      // Check if student is in the class
      const classRef = doc(db, 'classes', sessionData.classId);
      const classDoc = await getDoc(classRef);
      
      if (!classDoc.exists()) {
        throw new Error('Class not found');
      }
      
      const classData = classDoc.data();
      if (!classData.studentIds.includes(currentUser.uid)) {
        throw new Error('You are not enrolled in this class');
      }
      
      // Update session with student's attendance and activity
      await updateDoc(sessionRef, {
        attendees: arrayUnion(currentUser.uid),
        lastActivity: new Date().toISOString(),
        [`studentStatus.${currentUser.uid}`]: {
          joined: new Date().toISOString(),
          status: 'active',
          currentPage: sessionData.currentPage
        }
      });
      
      // Set active session
      const newSession = {
        id: sessionId,
        ...sessionData,
        classData
      };
      
      setActiveSession(newSession);
      return newSession;
    } catch (error) {
      console.error('Error joining session:', error);
      setError(error.message);
      throw error;
    }
  };

  // Update student progress in the session
  const updateProgress = async (progress) => {
    if (!activeSession) return;

    try {
      const sessionRef = doc(db, 'sessions', activeSession.id);
      await updateDoc(sessionRef, {
        [`studentProgress.${currentUser.uid}`]: progress,
        lastActivity: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating progress:', error);
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
      
      // Note: Meet cleanup is now handled by Google Calendar's automatic cleanup

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
    loading,
    error,
    startSession,
    joinSession,
    endSession,
    loadClassData,
    updateClassProgress,
    updateProgress,
    updateSessionActivity
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}
