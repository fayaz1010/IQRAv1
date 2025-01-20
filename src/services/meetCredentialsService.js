import { db } from '../config/firebase';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';

const COLLECTION_NAME = 'meetCredentials';

/**
 * Get stored Meet credentials for a user
 * @param {string} userId - The user's ID
 * @returns {Promise<Object|null>} The credentials object or null if not found
 */
export const getMeetCredentials = async (userId) => {
  try {
    const credentialsRef = doc(db, COLLECTION_NAME, userId);
    const credentialsDoc = await getDoc(credentialsRef);
    return credentialsDoc.exists() ? credentialsDoc.data() : null;
  } catch (error) {
    console.error('Error getting Meet credentials:', error);
    return null;
  }
};

/**
 * Store Meet credentials for a user
 * @param {string} userId - The user's ID
 * @param {Object} credentials - The credentials object
 * @param {string} credentials.googleAccessToken - Google OAuth access token
 * @param {string} credentials.googleRefreshToken - Google OAuth refresh token
 * @param {string} credentials.expiresAt - Token expiration timestamp
 * @param {string} credentials.associatedEmail - Email associated with the Google account
 * @returns {Promise<void>}
 */
export const storeMeetCredentials = async (userId, credentials) => {
  try {
    const credentialsRef = doc(db, COLLECTION_NAME, userId);
    await setDoc(credentialsRef, {
      ...credentials,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error storing Meet credentials:', error);
    throw error;
  }
};

/**
 * Remove Meet credentials for a user
 * @param {string} userId - The user's ID
 * @returns {Promise<void>}
 */
export const removeMeetCredentials = async (userId) => {
  try {
    const credentialsRef = doc(db, COLLECTION_NAME, userId);
    await deleteDoc(credentialsRef);
  } catch (error) {
    console.error('Error removing Meet credentials:', error);
    throw error;
  }
};

/**
 * Check if Meet credentials are valid (not expired)
 * @param {Object} credentials - The credentials object
 * @returns {boolean} True if credentials are valid
 */
export const areMeetCredentialsValid = (credentials) => {
  if (!credentials || !credentials.expiresAt) return false;
  
  // Add 5 minute buffer before expiration
  const expirationTime = new Date(credentials.expiresAt).getTime() - (5 * 60 * 1000);
  return Date.now() < expirationTime;
};
