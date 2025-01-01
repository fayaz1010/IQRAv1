import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where,
  updateDoc,
  addDoc,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import { db } from '../../../config/firebase';

const storage = getStorage();

export const IqraBookService = {
  // Get book metadata from Firestore
  async getBookMetadata(bookId) {
    try {
      const bookRef = doc(db, 'iqra-books', bookId);
      const bookDoc = await getDoc(bookRef);
      return bookDoc.exists() ? bookDoc.data() : null;
    } catch (error) {
      console.error('Error getting book metadata:', error);
      throw error;
    }
  },

  // Get page URL from Storage
  async getPageUrl(bookId, pageNumber) {
    try {
      const pageRef = ref(storage, `iqra-books/${bookId}/pages/page_${pageNumber}.png`);
      return await getDownloadURL(pageRef);
    } catch (error) {
      console.error('Error getting page URL:', error);
      throw error;
    }
  },

  // Get PDF URL from Storage
  async getPdfUrl(bookId) {
    try {
      const pdfRef = ref(storage, `iqra-books/${bookId}/book.pdf`);
      return await getDownloadURL(pdfRef);
    } catch (error) {
      console.error('Error getting PDF URL:', error);
      throw error;
    }
  },

  // Get all books metadata
  async getAllBooks() {
    try {
      const booksRef = collection(db, 'iqra-books');
      const booksSnapshot = await getDocs(booksRef);
      return booksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting all books:', error);
      throw error;
    }
  },

  // Get student's current progress
  async getStudentProgress(studentId, bookId) {
    try {
      const progressRef = doc(db, 'student-progress', `${studentId}_${bookId}`);
      const progressDoc = await getDoc(progressRef);
      return progressDoc.exists() ? progressDoc.data() : null;
    } catch (error) {
      console.error('Error getting student progress:', error);
      throw error;
    }
  },

  // Update student's progress
  async updateStudentProgress(studentId, bookId, progressData) {
    try {
      const progressRef = doc(db, 'student-progress', `${studentId}_${bookId}`);
      const progressDoc = await getDoc(progressRef);
      
      if (!progressDoc.exists()) {
        // Create new progress document if it doesn't exist
        await setDoc(progressRef, {
          studentId,
          bookId,
          createdAt: serverTimestamp(),
          ...progressData,
          updatedAt: serverTimestamp()
        });
      } else {
        // Update existing document
        await updateDoc(progressRef, {
          ...progressData,
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error updating student progress:', error);
      throw error;
    }
  },

  // Save teaching session
  async saveTeachingSession(sessionData) {
    try {
      const sessionsRef = collection(db, 'teaching-sessions');
      await addDoc(sessionsRef, {
        ...sessionData,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error saving teaching session:', error);
      throw error;
    }
  },

  // Get student's teaching sessions
  async getStudentSessions(studentId) {
    try {
      const sessionsRef = collection(db, 'teaching-sessions');
      const q = query(sessionsRef, where('studentId', '==', studentId));
      const sessionsSnapshot = await getDocs(q);
      return sessionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting student sessions:', error);
      throw error;
    }
  },

  // Get teacher's sessions
  async getTeacherSessions(teacherId) {
    try {
      const sessionsRef = collection(db, 'teaching-sessions');
      const q = query(sessionsRef, where('teacherId', '==', teacherId));
      const sessionsSnapshot = await getDocs(q);
      return sessionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting teacher sessions:', error);
      throw error;
    }
  }
};

export default IqraBookService;
