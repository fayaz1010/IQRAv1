import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, query, getDocs, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from './AuthContext';

const UserContext = createContext();

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export const UserProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);

  // Subscribe to users collection if admin
  useEffect(() => {
    if (currentUser?.role === 'admin') {
      const usersRef = collection(db, 'users');
      const unsubscribe = onSnapshot(usersRef, (snapshot) => {
        const usersData = {};
        snapshot.forEach((doc) => {
          usersData[doc.id] = { id: doc.id, ...doc.data() };
        });
        setUsers(usersData);
        setLoading(false);
      });

      return () => unsubscribe();
    } else if (currentUser) {
      // For non-admin users, just load their own data
      const userRef = doc(db, 'users', currentUser.uid);
      const unsubscribe = onSnapshot(userRef, (doc) => {
        if (doc.exists()) {
          setUsers({ [doc.id]: { id: doc.id, ...doc.data() } });
        }
        setLoading(false);
      });

      return () => unsubscribe();
    }
  }, [currentUser]);

  const value = {
    users,
    loading,
    getUser: (userId) => users[userId],
    getAllUsers: () => Object.values(users),
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

export default UserProvider;
