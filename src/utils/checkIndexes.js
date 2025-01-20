import { getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

async function listCollectionIndexes() {
  try {
    const app = getApp();
    const auth = getAuth(app);
    const projectId = app.options.projectId;
    
    // Firestore REST API endpoint for listing indexes
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/collectionGroups/-/indexes`;
    
    // Get the current auth token
    const token = await auth.currentUser.getIdToken();
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    console.log('Existing Firestore Indexes:', data);
    return data;
  } catch (error) {
    console.error('Error fetching indexes:', error);
    return null;
  }
}

export default listCollectionIndexes;
