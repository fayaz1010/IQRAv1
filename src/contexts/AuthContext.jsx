import { createContext, useContext, useState, useEffect } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  getIdTokenResult,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { httpsCallable, getFunctions } from 'firebase/functions';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const functions = getFunctions();

  useEffect(() => {
    let mounted = true;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user && mounted) {
          console.log('Auth state changed - user found:', user.uid);
          // Get user data from Firestore
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists() && mounted) {
            const userData = userDoc.data();
            console.log('User data found:', userData.role);
            
            // Get the user's ID token result to check custom claims
            const tokenResult = await getIdTokenResult(user, true);
            const role = tokenResult.claims.role || userData.role || 'student';
            
            if (mounted) {
              setCurrentUser({ 
                ...user, 
                ...userData,
                role: userData.role || 'student'
              });
            }
          } else if (mounted) {
            console.warn('No user document found for:', user.uid);
            setCurrentUser({ ...user, role: 'student' });
          }
        } else if (mounted) {
          console.log('No user found in auth state change');
          setCurrentUser(null);
        }
      } catch (error) {
        console.error('Error in auth state change:', error);
        if (mounted) {
          setCurrentUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  async function signup(email, password, role = 'student') {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Create user profile in Firestore
      const userData = {
        email: user.email,
        role: role,
        status: role === 'teacher' ? 'pending' : 'active',
        createdAt: new Date().toISOString(),
      };

      // Create the user document
      await setDoc(doc(db, 'users', user.uid), userData);

      // If it's a teacher account, sign them out immediately
      if (role === 'teacher') {
        await signOut(auth);
      } else {
        // Update current user state with the new data
        setCurrentUser({ ...user, ...userData });
      }

      return { success: true };
    } catch (error) {
      console.error('Signup error:', error);
      return { success: false, error: error.message };
    }
  }

  async function login(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Get user profile from Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // Check if teacher account is pending or rejected
        if (userData.role === 'teacher' && userData.status !== 'active') {
          await signOut(auth);
          const message = userData.status === 'pending' 
            ? 'Your teacher account is pending approval.' 
            : 'Your teacher account has been rejected.';
          return { success: false, error: message };
        }
        
        // Update current user state
        const updatedUser = { ...user, ...userData };
        setCurrentUser(updatedUser);
        return { success: true, user: updatedUser };
      }

      return { success: true, user };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  }

  async function loginWithGoogle(role = 'student') {
    try {
      // Use the configured provider from firebase.js
      const { googleProvider } = await import('../config/firebase');
      
      const userCredential = await signInWithPopup(auth, googleProvider);
      const user = userCredential.user;

      // Check if user exists in Firestore
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        // Create new user profile
        const userData = {
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          role: role,
          status: role === 'teacher' ? 'pending' : 'active',
          createdAt: new Date().toISOString(),
        };
        
        await setDoc(userRef, userData);

        // If it's a teacher account, sign them out immediately
        if (role === 'teacher') {
          await signOut(auth);
          return { 
            success: false, 
            error: 'Your teacher account has been created and is pending approval.' 
          };
        }

        // Update current user state
        setCurrentUser({ ...user, ...userData });
        return { success: true, user: { ...user, ...userData } };
      } else {
        const userData = userDoc.data();
        
        // Check if teacher account is pending or rejected
        if (userData.role === 'teacher' && userData.status !== 'active') {
          await signOut(auth);
          const message = userData.status === 'pending' 
            ? 'Your teacher account is pending approval.' 
            : 'Your teacher account has been rejected.';
          return { success: false, error: message };
        }

        // Update user data with latest Google info
        const updatedUserData = {
          ...userData,
          displayName: user.displayName,
          photoURL: user.photoURL,
          lastLoginAt: new Date().toISOString()
        };
        
        // Update Firestore
        await updateDoc(userRef, updatedUserData);

        // Update current user state
        const updatedUser = { ...user, ...updatedUserData };
        setCurrentUser(updatedUser);
        return { success: true, user: updatedUser };
      }
    } catch (error) {
      console.error('Google login error:', error);
      if (error.code === 'auth/popup-blocked') {
        return { 
          success: false, 
          error: 'Please allow popups for this website to sign in with Google' 
        };
      }
      return { success: false, error: error.message };
    }
  }

  async function logout() {
    await signOut(auth);
    setCurrentUser(null);
  }

  const value = {
    currentUser,
    loading,
    signup,
    login,
    logout,
    loginWithGoogle
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;
