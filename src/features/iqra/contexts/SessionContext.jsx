import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { db } from '../../../config/firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  Timestamp,
  serverTimestamp,
  writeBatch,
  addDoc,
  orderBy
} from 'firebase/firestore';
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
    const loadActiveSession = async () => {
      if (!currentUser) return;
      
      try {
        const sessionsQuery = query(
          collection(db, 'sessions'),
          where('teacherId', '==', currentUser.uid),
          where('status', '==', 'active'),
          where('endTime', '==', null)
        );

        const snapshot = await getDocs(sessionsQuery);
        if (!snapshot.empty) {
          const sessionDoc = snapshot.docs[0];
          const sessionData = { id: sessionDoc.id, ...sessionDoc.data() };
          
          // Load associated class data
          const classData = await loadClassData(sessionData.classId);
          setActiveClass(classData);
          setActiveSession(sessionData);
        }
      } catch (error) {
        console.error('Error loading active session:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    loadActiveSession();
  }, [currentUser]);

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

  const loadSessionDrawings = async (sessionId, forceRefresh = false) => {
    try {
      console.log('Loading drawings for session:', sessionId, 'force:', forceRefresh);
      
      // If not forcing refresh and we already have drawings, return them
      if (!forceRefresh && activeSession?.drawings) {
        console.log('Using cached drawings:', activeSession.drawings);
        return activeSession.drawings;
      }

      const drawingsRef = collection(db, 'drawings');
      const q = query(
        drawingsRef,
        where('sessionId', '==', sessionId),
        orderBy('lastModified', 'desc') // Get most recent drawings first
      );
      
      const snapshot = await getDocs(q);
      const drawings = {};
      const processedPages = new Set(); // Track which pages we've already processed
      
      snapshot.forEach(doc => {
        const data = doc.data();
        console.log('Raw drawing data from Firestore:', data);
        
        const studentId = data.studentId;
        const page = data.page;
        
        // Skip if we've already processed a more recent drawing for this page
        const pageKey = `${studentId}-${page}`;
        if (processedPages.has(pageKey)) {
          console.log(`Skipping older drawing for student ${studentId} page ${page}`);
          return;
        }
        processedPages.add(pageKey);

        if (!drawings[studentId]) {
          drawings[studentId] = {};
        }

        // Convert Firestore Timestamp to Date
        const timestamp = data.timestamp?.toDate?.() || new Date();
        const lastModified = data.lastModified?.toDate?.() || timestamp;

        // Extract lines from the data, handling both formats
        let lines = [];
        if (Array.isArray(data.lines)) {
          lines = data.lines;
        } else {
          // Convert numbered properties to array
          const numberedLines = Object.keys(data)
            .filter(key => !isNaN(key))
            .sort((a, b) => parseInt(a) - parseInt(b))
            .map(key => data[key]);
          if (numberedLines.length > 0) {
            lines = numberedLines;
          }
        }

        console.log(`Extracted ${lines.length} lines from drawing data for ${pageKey}`);

        drawings[studentId][page] = {
          id: doc.id,
          sessionId,
          studentId,
          page,
          lines,
          timestamp,
          lastModified,
          width: data.width,
          height: data.height
        };
        console.log(`Processed most recent drawing for student ${studentId} page ${page}:`, drawings[studentId][page]);
      });
      
      console.log('All loaded drawings:', drawings);

      // Update session with loaded drawings
      if (activeSession) {
        console.log('Updating session with drawings');
        setActiveSession(prev => {
          const updated = {
            ...prev,
            drawings
          };
          console.log('Updated session:', updated);
          return updated;
        });
      }

      return drawings;
    } catch (error) {
      console.error('Error loading drawings:', error);
      throw error;
    }
  };

  const saveDrawing = async (studentId, page, drawingData) => {
    try {
      if (!activeSession) {
        throw new Error('No active session');
      }

      console.log('Saving drawing:', { studentId, page, drawingLines: drawingData });

      // Always create a new drawing document
      const drawingsRef = collection(db, 'drawings');
      
      // Ensure drawing data is an array
      const lines = Array.isArray(drawingData) ? drawingData : [];

      // Create new drawing
      console.log('Creating new drawing version');
      const drawingDoc = {
        sessionId: activeSession.id,
        studentId,
        page,
        lines,
        timestamp: serverTimestamp(),
        lastModified: serverTimestamp(),
        width: window.innerWidth,
        height: window.innerHeight
      };
      
      const docRef = await addDoc(drawingsRef, drawingDoc);
      drawingDoc.id = docRef.id;
      console.log('Created new drawing:', docRef.id);

      // Update local state
      setActiveSession(prev => {
        const newDrawings = {
          ...prev.drawings || {},
          [studentId]: {
            ...(prev.drawings?.[studentId] || {}),
            [page]: {
              ...drawingDoc,
              lines,
              timestamp: new Date(),
              lastModified: new Date()
            }
          }
        };
        console.log('Updated local state with new drawing:', newDrawings);
        return {
          ...prev,
          drawings: newDrawings
        };
      });

      console.log('Drawing saved successfully');
      return drawingDoc;
    } catch (error) {
      console.error('Error saving drawing:', error);
      throw error;
    }
  };

  const checkExistingSession = async (teacherId, classId) => {
    try {
      const sessionsQuery = query(
        collection(db, 'sessions'),
        where('teacherId', '==', teacherId),
        where('status', '==', 'active'),
        where('endTime', '==', null)
      );

      const snapshot = await getDocs(sessionsQuery);
      let existingSession = null;

      snapshot.forEach(doc => {
        const session = { id: doc.id, ...doc.data() };
        if (session.classId === classId) {
          existingSession = session;
        } else {
          // Auto-end other active sessions
          updateDoc(doc.ref, {
            status: 'completed',
            endTime: serverTimestamp(),
            endedAutomatically: true
          });
        }
      });

      return existingSession;
    } catch (error) {
      console.error('Error checking existing sessions:', error);
      throw error;
    }
  };

  const updateSessionBook = async (newBook) => {
    if (!activeSession) {
      throw new Error('No active session');
    }

    try {
      console.log('Updating session book to:', newBook);
      const sessionRef = doc(db, 'sessions', activeSession.id);
      
      await updateDoc(sessionRef, {
        book: newBook,
        currentPage: 1, // Reset to page 1 when changing books
        endPage: 1
      });

      setActiveSession(prev => ({
        ...prev,
        book: newBook,
        currentPage: 1,
        endPage: 1
      }));

      console.log('Successfully updated session book');
    } catch (error) {
      console.error('Error updating session book:', error);
      throw error;
    }
  };

  const startSession = async (classId, bookId, initialPage = 1) => {
    try {
      setError(null);
      
      // Load class and course data first
      const classData = await loadClassData(classId);
      
      // Check for existing active session
      const existingSession = await checkExistingSession(currentUser.uid, classId);
      if (existingSession) {
        console.log('Found existing active session:', existingSession);
        
        // Load drawings for existing session
        const drawings = await loadSessionDrawings(existingSession.id);
        console.log('Loaded drawings for existing session:', drawings);
        
        // Update session with latest class data and drawings
        const updatedSession = {
          ...existingSession,
          classData: {
            course: classData.course,
            name: classData.name,
            students: classData.students,
            schedule: classData.schedule
          },
          drawings: drawings
        };
        
        setActiveSession(updatedSession);
        return updatedSession;
      }

      // If no bookId provided, use the first book from the course
      if (!bookId && classData?.course?.iqraBooks?.length > 0) {
        bookId = classData.course.iqraBooks[0];
      }

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
      try {
        const meetLink = await createMeetLink();
        meetData = {
          link: meetLink.link,
          eventId: meetLink.eventId,
          startTime: meetLink.startTime,
          endTime: meetLink.endTime
        };
      } catch (meetError) {
        console.error('Failed to create Google Meet:', meetError);
      }

      const sessionData = {
        teacherId: currentUser.uid,
        classId,
        startTime: serverTimestamp(),  // Use serverTimestamp for consistency
        book: bookId,
        startPage: initialPage,
        currentPage: initialPage,
        studentProgress,
        status: 'active',
        endTime: null,
        studentIds: classData.studentIds || [],
        classData: {
          course: classData.course,
          name: classData.name,
          students: classData.students,
          schedule: classData.schedule
        },
        ...(meetData && { meet: meetData })
      };

      console.log('Creating session with data:', sessionData);

      // Create new session document
      const sessionRef = doc(collection(db, 'sessions'));
      await setDoc(sessionRef, sessionData);

      // For the local state, we need to use a client-side timestamp
      const localSessionData = {
        ...sessionData,
        startTime: Timestamp.now(), // Use Timestamp.now() for immediate local state
      };

      const session = {
        id: sessionRef.id,
        ...localSessionData
      };

      console.log('Session created successfully:', session);
      setActiveSession(session);
      return session;
    } catch (error) {
      console.error('Error starting session:', error);
      setError(error.message);
      throw error;
    }
  };

  const createMeetLink = async () => {
    try {      
      console.log('Creating Google Meet for session...');
      const meetData = await createGoogleMeet(
        `Iqra Teaching Session - ${new Date().toLocaleDateString()}`,
        null, // startTime will be set to now in createGoogleMeet
        60    // Duration in minutes
      );
      console.log('Meet created successfully:', meetData);
      
      return {
        link: meetData.meetLink,
        eventId: meetData.eventId,
        startTime: meetData.startTime,
        endTime: meetData.endTime
      };
    } catch (error) {
      console.error('Failed to create Google Meet - Full error:', error);
      throw new Error('Unexpected error creating Meet: ' + error.message);
    }
  };

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

  const updateSessionPage = async (pageNumber) => {
    if (!activeSession) {
      throw new Error('No active session');
    }

    try {
      const sessionRef = doc(db, 'sessions', activeSession.id);
      await updateDoc(sessionRef, {
        currentPage: pageNumber
      });

      setActiveSession(prev => ({
        ...prev,
        currentPage: pageNumber
      }));

      console.log('Updated session page to:', pageNumber);
    } catch (error) {
      console.error('Error updating session page:', error);
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
      
      // Get the current timestamp once to use consistently
      const currentTimestamp = Timestamp.now();
      
      // Update session with end time, status and feedback
      await updateDoc(sessionRef, {
        status: 'completed',
        endTime: serverTimestamp(),  // Use serverTimestamp for the main session end time
        sessionId,
        endPage: activeSession.currentPage,
        feedback: {
          classNotes: feedback.classNotes,
          studentFeedback: Object.entries(feedback.studentFeedback).reduce((acc, [studentId, data]) => {
            acc[studentId] = {
              ...data,
              pageNotes: data.pageNotes || {}, 
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
            date: currentTimestamp.toDate().toISOString(), // Use ISO string for array items
            book: activeSession.book,
            startPage: activeSession.startPage,
            endPage: activeSession.currentPage,
            assessment: data.assessment,
            pageNotes: data.pageNotes || {},
            areasOfImprovement: data.areasOfImprovement,
            strengths: data.strengths,
            notes: data.notes
          });

          // Add session reference
          updatedProgress[studentId].sessions.push({
            sessionId,
            date: currentTimestamp.toDate().toISOString(), // Use ISO string for array items
            book: activeSession.book,
            startPage: activeSession.startPage,
            endPage: activeSession.currentPage
          });
        });

        // Update class document
        await updateDoc(classRef, {
          studentProgress: updatedProgress,
          lastUpdated: serverTimestamp() // Use serverTimestamp for the main document update
        });
      }

      // Clear local session state
      setActiveSession(null);
      setActiveClass(null);
      
      console.log('Session ended successfully');
    } catch (error) {
      console.error('Error ending session:', error);
      throw error;
    }
  };

  const closeAllSessions = async () => {
    try {
      setError(null);
      console.log('Starting closeAllSessions...');
      
      // Query all active sessions for the current teacher
      const sessionsQuery = query(
        collection(db, 'sessions'),
        where('teacherId', '==', currentUser.uid),
        where('status', '==', 'active')
      );

      const snapshot = await getDocs(sessionsQuery);
      console.log('Found sessions to close:', snapshot.size);
      
      // Create a batch to update all sessions at once
      const batch = writeBatch(db);
      let closedCount = 0;
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        // Only close sessions that are truly active
        if (data.status === 'active' && !data.endTime) {
          console.log('Closing session:', doc.id);
          const sessionRef = doc.ref;
          batch.update(sessionRef, {
            status: 'completed',
            endTime: serverTimestamp(),
            endedAutomatically: true,
            endReason: 'bulk_close'
          });
          closedCount++;
        } else {
          console.log('Skipping already closed session:', doc.id);
        }
      });

      if (closedCount > 0) {
        console.log(`Committing batch to close ${closedCount} sessions...`);
        await batch.commit();
        
        // Clear the active session in context
        setActiveSession(null);
        
        console.log(`Successfully closed ${closedCount} sessions`);
      } else {
        console.log('No active sessions to close');
      }
      
      return closedCount;
    } catch (error) {
      console.error('Error closing all sessions:', error);
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
    endSession,
    updateClassProgress,
    updateSessionBook,
    closeAllSessions,
    saveDrawing,
    loadSessionDrawings,
    updateSessionPage
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}
