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
      // Sync settings with Firestore when user is logged in
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
          if (data.theme) {
            setMode(data.theme);
          }
        }
      });

      return () => unsubscribe();
    }
  }, [currentUser, db]);

  const toggleMode = async () => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);

    // Save to Firestore if user is logged in
    if (currentUser?.uid) {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        theme: newMode
      });
    }
  };

  const updateSettings = async (newSettings) => {
    setSettings(prev => ({ ...prev, ...newSettings }));

    // Save to Firestore if user is logged in
    if (currentUser?.uid) {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        settings: { ...settings, ...newSettings }
      });
    }
  };

  const value = {
    mode,
    toggleMode,
    settings,
    updateSettings
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;
