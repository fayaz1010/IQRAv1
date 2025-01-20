import { db } from '../config/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

export const progressService = {
  // Get student's progress for a specific course
  async getStudentProgress(studentId, courseId) {
    try {
      const progressRef = doc(db, 'progress', studentId);
      const progressDoc = await getDoc(progressRef);
      
      if (!progressDoc.exists()) {
        return null;
      }
      
      const progressData = progressDoc.data();
      return progressData[courseId] || null;
    } catch (error) {
      console.error('Error getting student progress:', error);
      throw error;
    }
  },

  // Update student's progress
  async updateProgress(studentId, courseId, progressData) {
    try {
      const progressRef = doc(db, 'progress', studentId);
      const progressDoc = await getDoc(progressRef);
      
      if (!progressDoc.exists()) {
        // Create new progress document
        await setDoc(progressRef, {
          [courseId]: {
            ...progressData,
            lastUpdated: new Date().toISOString()
          }
        });
      } else {
        // Update existing progress
        await updateDoc(progressRef, {
          [`${courseId}`]: {
            ...progressData,
            lastUpdated: new Date().toISOString()
          }
        });
      }
    } catch (error) {
      console.error('Error updating student progress:', error);
      throw error;
    }
  },

  // Save teaching session
  async saveSession(sessionData) {
    try {
      const { studentId, courseId, classId, ...sessionDetails } = sessionData;
      const sessionRef = doc(db, 'classes', classId, 'sessions', new Date().toISOString());
      
      await setDoc(sessionRef, {
        studentId,
        courseId,
        ...sessionDetails,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error saving teaching session:', error);
      throw error;
    }
  },

  // Get student's session history
  async getSessionHistory(classId, studentId) {
    try {
      const sessionsRef = collection(db, 'classes', classId, 'sessions');
      const q = query(
        sessionsRef,
        where('studentId', '==', studentId),
        orderBy('timestamp', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting session history:', error);
      throw error;
    }
  }
};
