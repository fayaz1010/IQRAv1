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
      console.log('Getting metadata for book:', bookId);
      const bookRef = doc(db, 'iqra-books', bookId);
      const bookDoc = await getDoc(bookRef);
      console.log('Book metadata exists:', bookDoc.exists(), bookDoc.data());
      return bookDoc.exists() ? bookDoc.data() : null;
    } catch (error) {
      console.error('Error getting book metadata:', error);
      throw error;
    }
  },

  // Get page URL from Storage
  async getPageUrl(bookId, pageNumber) {
    try {
      console.log('Getting page URL for book:', bookId, 'page:', pageNumber);
      const pageRef = ref(storage, `iqra-books/${bookId}/pages/page_${pageNumber}.png`);
      console.log('Page storage path:', pageRef.fullPath);
      const url = await getDownloadURL(pageRef);
      console.log('Page URL retrieved successfully');
      return url;
    } catch (error) {
      console.error('Error getting page URL:', error);
      throw error;
    }
  },

  // Get PDF URL from Storage
  async getPdfUrl(bookId) {
    try {
      console.log('Getting PDF URL for book:', bookId);
      const pdfRef = ref(storage, `iqra-books/${bookId}/book.pdf`);
      console.log('PDF storage path:', pdfRef.fullPath);
      const url = await getDownloadURL(pdfRef);
      console.log('PDF URL retrieved successfully');
      return url;
    } catch (error) {
      console.error('Error getting PDF URL:', error);
      throw error;
    }
  },

  // Get all books metadata
  async getAllBooks() {
    try {
      console.log('Getting all books');
      const booksRef = collection(db, 'iqra-books');
      const booksSnapshot = await getDocs(booksRef);
      const books = [];
      booksSnapshot.forEach(doc => {
        books.push({
          id: doc.id,
          ...doc.data()
        });
      });
      console.log('Found books:', books);
      return books;
    } catch (error) {
      console.error('Error getting all books:', error);
      throw error;
    }
  },

  // Get student's current progress
  async getStudentProgress(studentId, bookId) {
    try {
      console.log('Getting student progress for student:', studentId, 'book:', bookId);
      const progressRef = doc(db, 'student-progress', `${studentId}_${bookId}`);
      const progressDoc = await getDoc(progressRef);
      console.log('Student progress exists:', progressDoc.exists(), progressDoc.data());
      return progressDoc.exists() ? progressDoc.data() : null;
    } catch (error) {
      console.error('Error getting student progress:', error);
      throw error;
    }
  },

  // Update student's progress
  async updateStudentProgress(studentId, bookId, progressData) {
    try {
      console.log('Updating student progress for student:', studentId, 'book:', bookId);
      const progressRef = doc(db, 'student-progress', `${studentId}_${bookId}`);
      const progressDoc = await getDoc(progressRef);
      
      if (!progressDoc.exists()) {
        console.log('Creating new progress document');
        await setDoc(progressRef, {
          studentId,
          bookId,
          createdAt: serverTimestamp(),
          ...progressData,
          updatedAt: serverTimestamp()
        });
      } else {
        console.log('Updating existing progress document');
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
      console.log('Saving teaching session:', sessionData);
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
      console.log('Getting student sessions for student:', studentId);
      const sessionsRef = collection(db, 'teaching-sessions');
      const q = query(sessionsRef, where('studentId', '==', studentId));
      const sessionsSnapshot = await getDocs(q);
      const sessions = [];
      sessionsSnapshot.forEach(doc => {
        sessions.push({
          id: doc.id,
          ...doc.data()
        });
      });
      console.log('Found student sessions:', sessions);
      return sessions;
    } catch (error) {
      console.error('Error getting student sessions:', error);
      throw error;
    }
  },

  // Get teacher's sessions
  async getTeacherSessions(teacherId) {
    try {
      console.log('Getting teacher sessions for teacher:', teacherId);
      const sessionsRef = collection(db, 'teaching-sessions');
      const q = query(sessionsRef, where('teacherId', '==', teacherId));
      const sessionsSnapshot = await getDocs(q);
      const sessions = [];
      sessionsSnapshot.forEach(doc => {
        sessions.push({
          id: doc.id,
          ...doc.data()
        });
      });
      console.log('Found teacher sessions:', sessions);
      return sessions;
    } catch (error) {
      console.error('Error getting teacher sessions:', error);
      throw error;
    }
  }
};

export default IqraBookService;
