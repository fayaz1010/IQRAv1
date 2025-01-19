import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { db } from '../../../config/firebase';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, Timestamp, addDoc } from 'firebase/firestore';
import { createGoogleMeet } from '../../../config/googleMeet';
import IqraBookService from '../services/iqraBookService';

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
  const [lastBook, setLastBook] = useState(null);
  const [lastPage, setLastPage] = useState(null);

  // Load user's last book and page
  const loadLastBookAndPage = async (userId) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setLastBook(userData.lastBook || '1');
        setLastPage(userData.lastPage || 1);
      } else {
        setLastBook('1');
        setLastPage(1);
      }
    } catch (error) {
      console.error('Error loading last book and page:', error);
      setLastBook('1');
      setLastPage(1);
    }
  };

  // Update user's last book and page
  const updateLastBookAndPage = async (userId, book, page) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        lastBook: book,
        lastPage: page,
        updatedAt: Timestamp.now()
      });
      setLastBook(book);
      setLastPage(page);
    } catch (error) {
      console.error('Error updating last book and page:', error);
    }
  };

  // Check for and recover active session on mount and auth changes
  useEffect(() => {
    if (!currentUser) {
      setActiveSession(null);
      setLoading(false);
      return;
    }

    const recoverSession = async () => {
      try {
        setLoading(true);
        
        // Find any active sessions for this teacher
        const sessionsQuery = query(
          collection(db, 'sessions'),
          where('teacherId', '==', currentUser.uid),
          where('status', '==', 'active')
        );
        const sessionsSnapshot = await getDocs(sessionsQuery);
        
        if (sessionsSnapshot.empty) {
          setLoading(false);
          return;
        }

        // If multiple active sessions found, clean up all but the most recent
        if (sessionsSnapshot.docs.length > 1) {
          console.warn('Multiple active sessions found - cleaning up...');
          
          // Sort by start time, most recent first
          const sortedSessions = sessionsSnapshot.docs.sort((a, b) => {
            const aTime = a.data().startTime.toDate();
            const bTime = b.data().startTime.toDate();
            return bTime - aTime;
          });

          // Keep the most recent session
          const mostRecent = sortedSessions[0];
          
          // End all other sessions
          const cleanup = sortedSessions.slice(1).map(async (doc) => {
            const session = doc.data();
            await updateDoc(doc.ref, {
              status: 'completed',
              endTime: Timestamp.now(),
              endReason: 'auto_cleanup'
            });
            console.log(`Cleaned up orphaned session: ${doc.id}`);
          });

          await Promise.all(cleanup);

          // Load the class data for the recovered session
          const sessionData = mostRecent.data();
          const classData = await loadClassData(sessionData.classId);

          const recoveredSession = {
            id: mostRecent.id,
            ...sessionData,
            classData
          };

          console.log('Recovered active session:', recoveredSession);
          setActiveSession(recoveredSession);
        } else {
          // Just one active session found, recover it
          const sessionDoc = sessionsSnapshot.docs[0];
          const sessionData = sessionDoc.data();
          const classData = await loadClassData(sessionData.classId);

          const recoveredSession = {
            id: sessionDoc.id,
            ...sessionData,
            classData
          };

          console.log('Recovered active session:', recoveredSession);
          setActiveSession(recoveredSession);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error recovering session:', error);
        setLoading(false);
      }
    };

    // Set up session heartbeat
    let heartbeatInterval;
    if (activeSession?.id) {
      heartbeatInterval = setInterval(async () => {
        try {
          const sessionRef = doc(db, 'sessions', activeSession.id);
          await updateDoc(sessionRef, {
            lastHeartbeat: Timestamp.now()
          });
        } catch (error) {
          console.error('Error updating session heartbeat:', error);
        }
      }, 30000); // Update every 30 seconds
    }

    recoverSession();

    // Cleanup on unmount
    return () => {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
    };
  }, [currentUser]);

  // Auto-end sessions that haven't had a heartbeat in 5 minutes
  useEffect(() => {
    if (!currentUser) return;

    const cleanup = async () => {
      try {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        
        // Find active sessions with old heartbeats
        const sessionsQuery = query(
          collection(db, 'sessions'),
          where('teacherId', '==', currentUser.uid),
          where('status', '==', 'active')
        );
        const sessionsSnapshot = await getDocs(sessionsQuery);

        const cleanup = sessionsSnapshot.docs.map(async (doc) => {
          const session = doc.data();
          const lastHeartbeat = session.lastHeartbeat?.toDate();
          
          if (!lastHeartbeat || lastHeartbeat < fiveMinutesAgo) {
            await updateDoc(doc.ref, {
              status: 'completed',
              endTime: Timestamp.now(),
              endReason: 'heartbeat_timeout'
            });
            console.log(`Ended inactive session: ${doc.id}`);
            
            // If this was our active session, clear it
            if (activeSession?.id === doc.id) {
              setActiveSession(null);
            }
          }
        });

        await Promise.all(cleanup);
      } catch (error) {
        console.error('Error cleaning up inactive sessions:', error);
      }
    };

    // Run cleanup every minute
    const cleanupInterval = setInterval(cleanup, 60000);

    // Run once on mount
    cleanup();

    return () => clearInterval(cleanupInterval);
  }, [currentUser, activeSession]);

  // Start a new teaching session
  const startSession = async (classId, bookId, initialPage = 1) => {
    try {
      setError(null);

      // Check for existing active session
      if (activeSession) {
        throw new Error('You already have an active teaching session. Please end it before starting a new one.');
      }

      // Load class and course data first
      const classData = await loadClassData(classId);
      
      // Clean and format book ID
      const cleanBookId = bookId.replace('iqra-', ''); // Remove 'iqra-' prefix if present
      const formattedBookId = cleanBookId.startsWith('Iqra Book ') ? cleanBookId : `Iqra Book ${cleanBookId}`;
      
      console.log('Course books:', classData?.course?.iqraBooks);
      console.log('Formatted book ID:', formattedBookId);

      if (!classData?.course?.iqraBooks?.includes(formattedBookId)) {
        console.error('Available books:', classData?.course?.iqraBooks);
        console.error('Attempted book:', formattedBookId);
        throw new Error('Selected book is not in the course');
      }

      // Initialize book pages if they don't exist
      try {
        await IqraBookService.initializeBookPages(cleanBookId);
      } catch (initError) {
        console.error('Error initializing book pages:', initError);
        // Continue with session creation even if initialization fails
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

      // Create Google Meet link
      let meetLink = null;
      try {
        meetLink = await createGoogleMeet(`${classData.name} - ${formattedBookId}`);
      } catch (meetError) {
        console.error('Error creating Google Meet:', meetError);
        // Continue without meet link if creation fails
      }

      // Create new session document
      const sessionData = {
        teacherId: currentUser.uid,
        classId: classId,
        book: formattedBookId,
        currentPage: initialPage,
        startTime: Timestamp.now(),
        lastHeartbeat: Timestamp.now(),
        status: 'active',
        studentProgress,
        meet: meetLink ? { link: meetLink } : null
      };

      const sessionRef = await addDoc(collection(db, 'sessions'), sessionData);

      const newSession = {
        id: sessionRef.id,
        ...sessionData,
        classData
      };

      setActiveSession(newSession);
      setActiveClass(classData);

      // Update last book and page
      updateLastBookAndPage(currentUser.uid, formattedBookId, initialPage);

      return newSession;
    } catch (error) {
      console.error('Error starting session:', error);
      setError(error.message);
      throw error;
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

      // Update last book and page
      updateLastBookAndPage(currentUser.uid, activeSession.book, pageNumber);
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
      
      // Note: Meet cleanup is now handled by Google Calendar's automatic cleanup

      // Update session with end time, status and feedback
      await updateDoc(sessionRef, {
        status: 'completed',
        endTime: Timestamp.now(),
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
          id: classData.classId,
          course: {
            id: classData.courseId,
            ...courseData
          },
          students,
          studentIds: classData.studentIds || [] // Keep the original studentIds array
        };

        const updatedProgress = { ...combinedData.studentProgress };

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

  const joinSession = async (sessionId) => {
    try {
      console.log('Joining session:', sessionId);
      const sessionRef = doc(db, 'sessions', sessionId);
      const sessionDoc = await getDoc(sessionRef);
      
      if (!sessionDoc.exists()) {
        throw new Error('Session not found');
      }

      const sessionData = sessionDoc.data();
      
      // Verify student is allowed in this session
      if (!sessionData.studentIds.includes(currentUser.uid)) {
        throw new Error('You are not enrolled in this session');
      }

      // Get class data
      const classRef = doc(db, 'classes', sessionData.classId);
      const classDoc = await getDoc(classRef);
      
      if (!classDoc.exists()) {
        throw new Error('Class not found');
      }

      const session = {
        id: sessionDoc.id,
        ...sessionData,
        classData: classDoc.data()
      };

      setActiveSession(session);
      return session;
    } catch (error) {
      console.error('Error joining session:', error);
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
    updateClassProgress,
    saveDrawing,
    setActiveSession,
    setActiveClass,
    lastBook,
    lastPage
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

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

    return combinedData;
  } catch (error) {
    console.error('Error loading class data:', error);
    throw error;
  }
};
