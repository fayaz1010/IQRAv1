const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

// Firebase configuration - using hardcoded values for script
const firebaseConfig = {
  apiKey: "AIzaSyBgyatDftzlqelwj9AzXCAvnd1dCsxD5w0",
  authDomain: "iqra-3fee3.firebaseapp.com",
  projectId: "iqra-3fee3",
  storageBucket: "iqra-3fee3.firebasestorage.app",
  messagingSenderId: "474325405168",
  appId: "1:474325405168:web:a68f89aa7aa0a712282135",
  measurementId: "G-2JGGRDJPG2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const email = 'admin@iqra.com';
const password = 'admin1234';

console.log('Creating admin user...');

createUserWithEmailAndPassword(auth, email, password)
  .then(async (userCredential) => {
    const user = userCredential.user;
    console.log('Admin user created in Authentication:', user.uid);

    // Add admin role to user in Firestore
    const userData = {
      email: email,
      role: 'admin',
      createdAt: new Date().toISOString(),
      isAdmin: true,
      displayName: 'Admin User',
      permissions: ['all'],
      status: 'active'
    };

    await setDoc(doc(db, 'users', user.uid), userData);
    console.log('Admin user created successfully!');
    console.log('Email:', email);
    console.log('Password:', password);
    
    setTimeout(() => process.exit(0), 2000);
  })
  .catch((error) => {
    if (error.code === 'auth/email-already-in-use') {
      console.log('Admin user already exists. You can use:');
      console.log('Email:', email);
      console.log('Password:', password);
      setTimeout(() => process.exit(0), 2000);
    } else {
      console.error('Error creating admin user:', error);
      setTimeout(() => process.exit(1), 2000);
    }
  });
