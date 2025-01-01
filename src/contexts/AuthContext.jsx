import { createContext, useContext, useState, useEffect } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Get user data from Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setCurrentUser({ ...user, ...userData });
        } else {
          setCurrentUser(user);
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
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
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;

      // Check if user exists in Firestore
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        // Create new user profile
        const userData = {
          email: user.email,
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

        // Update current user state
        const updatedUser = { ...user, ...userData };
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
