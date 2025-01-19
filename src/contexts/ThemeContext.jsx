import { createContext, useContext, useState, useEffect } from 'react';
import { getFirestore, doc, updateDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { useAuth } from './AuthContext';

const ThemeContext = createContext();

export function useTheme() {
  return useContext(ThemeContext);
}

export const ThemeProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const db = getFirestore();
  const [mode, setMode] = useState(() => {
    const savedMode = localStorage.getItem('themeMode');
    return savedMode || 'light';
  });
  const [settings, setSettings] = useState(() => {
    const savedSettings = localStorage.getItem('themeSettings');
    return savedSettings ? JSON.parse(savedSettings) : {
      fontSize: 'medium',
      notifications: {
        email: true,
        push: true,
        reminders: true
      },
      language: 'en'
    };
  });

  useEffect(() => {
    localStorage.setItem('themeMode', mode);
  }, [mode]);

  useEffect(() => {
    localStorage.setItem('themeSettings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (currentUser?.uid) {
      const userRef = doc(db, 'users', currentUser.uid);
      const unsubscribe = onSnapshot(userRef, (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          if (data.settings) {
            setSettings(prevSettings => ({
              ...prevSettings,
              ...data.settings
            }));
          }
          if (data.themeMode) {
            setMode(data.themeMode);
          }
        }
      });

      return () => unsubscribe();
    }
  }, [currentUser, db]);

  const toggleTheme = () => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
    if (currentUser?.uid) {
      const userRef = doc(db, 'users', currentUser.uid);
      updateDoc(userRef, { themeMode: newMode }).catch(console.error);
    }
  };

  const updateSettings = (newSettings) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      if (currentUser?.uid) {
        const userRef = doc(db, 'users', currentUser.uid);
        updateDoc(userRef, { settings: updated }).catch(console.error);
      }
      return updated;
    });
  };

  const value = {
    mode,
    settings,
    toggleTheme,
    updateSettings
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;
