import { getStorage, ref, uploadBytes, getDownloadURL, listAll } from 'firebase/storage';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { auth } from '../../../config/firebase';

const storage = getStorage();
const db = getFirestore();

const IqraBookService = {
  // Helper function to convert bookId to a storage-safe path
  getStorageSafePath(bookId) {
    // If already has iqra- prefix, return as is
    if (bookId.startsWith('iqra-')) {
      console.log('Using existing iqra- prefix:', bookId);
      return bookId;
    }

    // Extract number from "Iqra Book X" format
    const match = bookId.match(/Iqra Book (\d+)/i);
    if (match) {
      bookId = match[1];
    }

    // Add iqra- prefix if not present
    const safePath = `iqra-${bookId}`;
    console.log('Added iqra- prefix:', safePath);
    return safePath;
  },

  // Get book metadata from Firestore
  async getBookMetadata(bookId) {
    console.log('Getting metadata for book:', bookId);
    const safePath = this.getStorageSafePath(bookId);
    const docRef = doc(db, 'iqra-books', safePath);
    
    try {
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: safePath, ...docSnap.data() };
      }
      console.log('Book metadata does not exist, creating it');
      // Create basic metadata if it doesn't exist
      const metadata = {
        id: safePath,
        title: bookId.toLowerCase().startsWith('iqra book ') ? bookId : `Iqra Book ${bookId}`,
        totalPages: 30,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await setDoc(docRef, metadata);
      return metadata;
    } catch (error) {
      console.error('Error getting book metadata:', error);
      throw error;
    }
  },

  // Get page URL from Storage
  async getPageUrl(bookId, pageNumber) {
    console.log('Getting page URL for book:', bookId, 'page:', pageNumber);
    const safePath = this.getStorageSafePath(bookId);
    
    // Don't pad page number with zeros since files are named page_1.png, page_2.png etc.
    const storagePath = `iqra-books/${safePath}/pages/page_${pageNumber}.png`;
    console.log('Page storage path:', storagePath);
    
    try {
      const pageRef = ref(storage, storagePath);
      const url = await getDownloadURL(pageRef);
      console.log('Page URL retrieved successfully');
      return url;
    } catch (error) {
      console.error('Error getting page URL:', error);
      throw error;
    }
  },

  // Initialize book pages for a new book
  async initializeBookPages(bookId) {
    try {
      console.log('Initializing book pages for:', bookId);
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      if (user.role !== 'admin' && user.role !== 'teacher') {
        throw new Error('Unauthorized - Only teachers and admins can initialize books');
      }

      const safePath = this.getStorageSafePath(bookId);
      const bookRef = doc(db, 'iqra-books', safePath);
      const bookDoc = await getDoc(bookRef);
      
      if (!bookDoc.exists()) {
        console.log('Creating new book metadata');
        const metadata = {
          id: safePath,
          title: bookId.toLowerCase().startsWith('iqra book ') ? bookId : `Iqra Book ${bookId}`,
          totalPages: 64,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        await setDoc(bookRef, metadata);
      }

      console.log('Book metadata initialized');
      return true;
    } catch (error) {
      console.error('Error initializing book pages:', error);
      throw error;
    }
  },
};

export default IqraBookService;
